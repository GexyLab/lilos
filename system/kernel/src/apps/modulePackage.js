import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fail } from '../errors.js';
import { DATA_DIR, KERNEL_DIR, MODULES_DIR, loadConfig, editConfig } from '../config.js';
import { readJson as readJsonFile } from '../jsonFile.js';
import { KERNEL_API, REQUIRED_MODULES, resolveModules, scanModules, isSecretSetting } from '../modules.js';
import { checkDependencies, compareVersions, parseVersion } from './manifest.js';
import { cleanSource, isOfficial, openSource, walk } from './sources.js';
import { logger } from '../log.js';
import { checkFields } from '../net/drivers.js';

/**
 * Kernel modules as packages: installed from a repository into modules/<name>_<version>, turned
 * on in the configuration. They are code that runs inside the kernel with full access: only
 * admins install them, and one not from the official repository needs the warning accepted
 * (allowUnsigned). The kernel loads modules when it starts: every change asks for a restart.
 *
 * module.json, besides what modules.js reads:
 *   icon?: { glyph: 'user', color: '#5f6673' }   how the AppStore shows it, as for apps
 *   description, data?: ['users.json']  files the module keeps its data in: carried to the new
 *                                        version on update, and kept (with its folder) on removal
 *   defaultConfig?: {}                   its configuration when it is turned on
 *   required?: true                      one lilOS cannot do without (modules.js REQUIRED_MODULES):
 *                                        the AppStore offers no removal, the kernel refuses it
 *   replaces?: ['netfs-gdrive', …]       modules it takes the place of (two merged into one): when it
 *                                        is installed, or found turned on at start with them still
 *                                        there, it takes their configuration and data and they go
 *                                        (takeOver); a module it replaces cannot be installed again
 *   dependencies?: [{ module, version?, repo?, optional?, reason? }]   the modules it needs installed
 *                                        (manifest.js checkDependencies; `requires` says which services
 *                                        it uses, these where to get the modules that provide them)
 * Each module folder gets source.json: where it came from ({ type, url, ref, commit, path }), and
 * dependency: true when it was installed only because something needed it (dependencies.js).
 *
 * `guard` (dependencies.js, set by the kernel) refuses what would leave an installed package without
 * a module it needs: an install or update whose own needs are missing, a removal, a version outside
 * a range they ask for.
 */
const run = promisify(execFile);
const log = logger('modules');
const NAME = /^[a-z][a-z0-9-]{0,40}$/;
const SERVICE = /^[a-z][a-z0-9.-]{0,40}$/;
const DATA = /^[\w.-]{1,100}$/;
const validIcon = i => /^[a-z][a-zA-Z0-9]{1,30}$/.test(i?.glyph ?? '') && /^#[0-9a-fA-F]{6}$/.test(i?.color ?? '');

export function checkModule(raw) {
  const m = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : fail('invalid', 'module.json non valido');
  const bad = msg => fail('invalid', `module.json: ${msg}`);
  if (!NAME.test(m.name ?? '')) bad('nome non valido');
  if (!parseVersion(m.version)) bad('versione non valida');
  if (String(m.kernel) !== String(KERNEL_API)) bad(`richiede il kernel ${m.kernel}`);
  for (const k of ['provides', 'requires']) {
    if (m[k] !== undefined && (!Array.isArray(m[k]) || m[k].some(s => typeof s !== 'string' || !SERVICE.test(s)))) bad(`${k} non valido`);
  }
  if (m.data !== undefined && (!Array.isArray(m.data) || m.data.some(f => typeof f !== 'string' || !DATA.test(f)))) bad('data non valido');
  if (m.defaultConfig !== undefined && (typeof m.defaultConfig !== 'object' || Array.isArray(m.defaultConfig))) bad('defaultConfig non valido');
  if (m.description !== undefined && (typeof m.description !== 'string' || m.description.length > 300)) bad('descrizione non valida');
  if (m.icon !== undefined && !validIcon(m.icon)) bad('icona non valida');
  if (m.required !== undefined && typeof m.required !== 'boolean') bad('required non valido');
  if (m.replaces !== undefined && (!Array.isArray(m.replaces) || m.replaces.some(n => typeof n !== 'string' || !NAME.test(n) || n === m.name || Object.hasOwn(REQUIRED_MODULES, n)))) bad('replaces non valido');
  checkDependencies(m.dependencies, { self: `module:${m.name}`, apps: false, where: 'module.json' });
  return m;
}

const requireAdmin = p => (p?.kind === 'kernel' || p?.role === 'admin' ? p : fail('forbidden', 'Solo un amministratore gestisce i moduli del kernel'));
const exists = path => stat(path).then(() => true, () => false);

/** Changes the list `modules` of config.json: fn(list) → the new list. */
const editModules = fn => editConfig(raw => { raw.modules = fn(Array.isArray(raw.modules) ? raw.modules : []); });

/** A JSON file, or null when it is missing or not JSON. */
const readJson = path => readJsonFile(path).catch(() => null);

const empty = v => v === undefined || v === null || v === '';

/**
 * A module that replaces others (module.json `replaces`) takes their place: in its configuration,
 * the value each of them had for a key (the first that has one, in the order of `replaces`) where
 * it still has its default (an admin's own choice stays); secret settings come sealed as they are
 * (one key for all). Then its data files missing from its folder and its ctx.dataDir, from them;
 * then they leave config.json and the disk (a folder with data files that did not come along
 * stays). Services keep their names, so the saved connections keep working. `mod`: { name, dir,
 * manifest }, `names`: the ones to replace now. Returns them.
 */
async function takeOver(mod, names) {
  if (!names.length) return names;
  const defaults = mod.manifest.defaultConfig ?? {};
  await editModules(list => {
    const mine = list.find(m => m.name === mod.name);
    const config = { ...(mine?.config ?? defaults) };
    const took = new Set();   // keys a replaced module gave already: the first one wins
    for (const old of names) {
      const theirs = list.find(m => m.name === old)?.config ?? {};
      for (const [k, v] of Object.entries(theirs)) {
        if (empty(v) || took.has(k)) continue;
        if (empty(config[k]) || JSON.stringify(config[k]) === JSON.stringify(defaults[k])) config[k] = v;
        took.add(k);
      }
    }
    return list.filter(m => !names.includes(m.name)).map(m => (m.name === mod.name ? { ...m, config } : m));
  });
  const installed = await scanModules(MODULES_DIR);
  // Installed only because a package needed them (dependencies.js): so is the module that takes their place
  const brought = [];
  for (const old of names) {
    const folders = installed.get(old) ?? [];
    if (folders.length) brought.push((await readJson(join(folders[0].dir, 'source.json')))?.dependency === true);
    for (const file of mod.manifest.data ?? []) {
      if (await exists(join(mod.dir, file))) continue;
      const from = folders.find(v => existsSync(join(v.dir, file)));
      if (from) await cp(join(from.dir, file), join(mod.dir, file));
    }
    const data = join(DATA_DIR, 'modules-data', old), mine = join(DATA_DIR, 'modules-data', mod.name);
    if (await exists(data)) {
      if (!await exists(mine)) await rename(data, mine);
      else log.warn(`Dati di ${old} lasciati in ${data}: ${mod.name} ha già i suoi`);
    }
    for (const v of folders) {
      const left = await dataLeft(v, mod.manifest);
      if (left.length) log.warn(`${old}_${v.version} conservato per i suoi dati (${left.join(', ')})`);
      else await rm(v.dir, { recursive: true, force: true });
    }
    log.info(`${old} sostituito da ${mod.name}`);
  }
  const source = await readJson(join(mod.dir, 'source.json'));
  if (brought.length && brought.every(Boolean) && source && source.dependency !== true) {
    await writeFile(join(mod.dir, 'source.json'), JSON.stringify({ ...source, dependency: true }, null, 2));
  }
  return names;
}

/** The data files of a replaced module's folder `v` that the module replacing it does not take (its folder stays for them). */
async function dataLeft(v, manifest) {
  const left = [];
  for (const f of (await readJson(join(v.dir, 'module.json')))?.data ?? []) if (!(manifest.data ?? []).includes(f) && await exists(join(v.dir, f))) left.push(f);
  return left;
}

/** The modules turned on and what they replace: Map name of a replaced module → the one that replaces it. */
async function replacements(config) {
  const installed = await scanModules(MODULES_DIR);
  const by = new Map();
  for (const want of config.modules) {
    const versions = installed.get(want.name) ?? [];
    const v = want.version ? versions.find(x => x.version === want.version) : versions[0];
    const manifest = v && await readJson(join(v.dir, 'module.json'));
    for (const n of Array.isArray(manifest?.replaces) ? manifest.replaces : []) {
      if (typeof n === 'string' && NAME.test(n) && n !== want.name && !Object.hasOwn(REQUIRED_MODULES, n)) by.set(n, { name: want.name, dir: v.dir, manifest });
    }
  }
  return by;
}

/**
 * Before the modules start: a module turned on that replaces others still in the configuration or
 * in modules/ (installed by hand, or by a kernel before lilOS 1.22.0) takes their place now
 * (takeOver). Returns the names of the modules replaced.
 */
export async function applyReplacements() {
  const config = await loadConfig();
  const by = await replacements(config);
  const installed = await scanModules(MODULES_DIR);
  const plan = new Map();   // replacing module → its module and the names it replaces now
  for (const [old, mod] of by) {
    // Turned on, or a folder to remove (not one kept for its data: that stays as it is)
    let todo = config.modules.some(m => m.name === old);
    for (const v of installed.get(old) ?? []) if (!todo && !(await dataLeft(v, mod.manifest)).length) todo = true;
    if (!todo) continue;
    if (!plan.has(mod.name)) plan.set(mod.name, { mod, names: [] });
    plan.get(mod.name).names.push(old);
  }
  const gone = [];
  for (const { mod, names } of plan.values()) gone.push(...await takeOver(mod, mod.manifest.replaces.filter(n => names.includes(n))));
  return gone;
}

/**
 * Before the modules start: the required ones (modules.js REQUIRED_MODULES) installed and in the
 * configuration. The copy of lilOS (KERNEL_DIR/modules: the repository, or the running release)
 * is put into modules/ when modules/ has none or an older one (its data files carried over, the
 * old folder kept as after an update); then the configuration gets it, turned on with its
 * defaultConfig, or at the version installed. Returns the names it changed.
 */
export async function ensureRequiredModules() {
  const bundledDir = join(KERNEL_DIR, 'modules');
  const changed = [];
  for (const name of Object.keys(REQUIRED_MODULES)) {
    const bundled = (await scanModules(bundledDir)).get(name)?.[0] ?? null;
    let installed = (await scanModules(MODULES_DIR)).get(name) ?? [];
    const same = bundled && installed.some(v => v.dir === bundled.dir);
    if (bundled && !same && (!installed.length || compareVersions(bundled.version, installed[0].version) > 0)) {
      const dest = join(MODULES_DIR, `${name}_${bundled.version}`);
      const manifest = await readJson(join(bundled.dir, 'module.json')) ?? {};
      const data = new Set(manifest.data ?? []);
      const from = installed[0]?.dir ?? null;
      await cp(bundled.dir, dest, { recursive: true, filter: path => !/[\/]node_modules([\/]|$)/.test(path) && !data.has(path.split(/[\/]/).pop()) });
      for (const file of from ? data : []) {
        if (await exists(join(from, file))) await cp(join(from, file), join(dest, file));
      }
      await installDependencies(dest);
      log.info(`Modulo obbligatorio ${name} ${bundled.version} messo da lilOS${from ? ` (prima ${installed[0].version})` : ''}`);
      installed = (await scanModules(MODULES_DIR)).get(name) ?? [];
      changed.push(name);
    }
    if (!installed.length) throw new Error(`Il modulo obbligatorio ${name} non c'è: lilOS non parte senza`);
    const config = await loadConfig();
    const want = config.modules.find(m => m.name === name);
    const top = installed[0];
    if (!want) {
      const manifest = await readJson(join(top.dir, 'module.json')) ?? {};
      await editModules(list => [...list, { name, version: top.version, config: manifest.defaultConfig ?? {} }]);
      log.info(`Modulo obbligatorio ${name} ${top.version} acceso`);
      if (!changed.includes(name)) changed.push(name);
    } else if (want.version && (!installed.some(v => v.version === want.version) || changed.includes(name))) {
      await editModules(list => list.map(m => (m.name === name ? { ...m, version: top.version } : m)));
      if (!changed.includes(name)) changed.push(name);
    }
  }
  return changed;
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

export async function installDependencies(dir) {
  if (!await exists(join(dir, 'package.json'))) return;
  const command = await exists(join(dir, 'package-lock.json')) ? 'ci' : 'install';
  try {
    await run(npm, [command, '--omit=dev', '--no-audit', '--no-fund', '--ignore-scripts'], { cwd: dir, timeout: 300_000, shell: process.platform === 'win32', windowsHide: true });
  } catch (err) {
    fail('unavailable', `Dipendenze del modulo non installate: ${String(err.stderr || err.message).split('\n')[0]}`.slice(0, 300));
  }
}

/**
 * Writes a module opened from its source (openSource) into `dest`: its files, the data files of the
 * version it replaces (`from`), source.json, then its dependencies.
 */
export async function writeModule(opened, manifest, dest, { from = null, dependency = false } = {}) {
  for (const path of await walk(opened.base)) {
    if (path === 'source.json') continue;
    const target = join(dest, ...path.split('/'));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await opened.read(path));
  }
  for (const file of from ? manifest.data ?? [] : []) {
    if (await exists(join(from, file))) await cp(join(from, file), join(dest, file));
  }
  await writeFile(join(dest, 'source.json'), JSON.stringify({ ...opened.source, installed: Date.now(), ...(dependency && { dependency: true }) }, null, 2));
  await installDependencies(dest);
}

/**
 * A module put in `dir` by hand (no source.json) that is the one opened from its source: same
 * module.json (but for icon and description) and the same code, with only its data files besides.
 * Then it is written again from the source, with source.json, so that it updates from the AppStore;
 * its data stay. Returns whether it did.
 */
export async function adoptModule(opened, manifest, dir) {
  if (await exists(join(dir, 'source.json'))) return false;
  const local = await readJson(join(dir, 'module.json'));
  const bare = ({ icon, description, ...rest } = {}) => JSON.stringify(rest);
  if (!local || bare(local) !== bare(manifest)) return false;
  const text = data => data.toString('latin1').replace(/\r\n/g, '\n');
  const offered = new Set(await walk(opened.base));
  const present = await walk(dir);
  if ([...offered].some(path => path !== 'README.md' && !present.includes(path))) return false;
  for (const path of present) {
    if (path === 'module.json' || manifest.data?.includes(path)) continue;
    if (!offered.has(path) || text(await readFile(join(dir, ...path.split('/')))) !== text(await opened.read(path))) return false;
  }
  await writeModule(opened, manifest, dir);
  return true;
}

/** The values of a module's settings in its configuration (secret ones never: see settingsView). */
const settingValues = mod => Object.fromEntries(mod.settings.filter(f => !isSecretSetting(f) && mod.config[f.key] !== undefined).map(f => [f.key, mod.config[f.key]]));

/** A module's settings as the page sees them: { fields, values, secrets: [keys of the secret ones set], live }. */
const settingsView = mod => ({
  fields: mod.settings, values: settingValues(mod), live: mod.live,
  secrets: mod.settings.filter(f => isSecretSetting(f) && typeof mod.config[f.key] === 'string' && mod.config[f.key]).map(f => f.key),
});

export class ModuleAdmin {
  #kernel; #allowLocal;
  /** dependencies.js: checks that keep the packages that need a module working (null: none) */
  guard = null;

  constructor(kernel, { allowLocalSources }) {
    this.#kernel = kernel;
    this.#allowLocal = allowLocalSources;
  }

  /**
   * [{ name, version, description, icon, provides, requires, replaces, replacedBy, dependencies, dependency, enabled, running, versions, source }]
   * replacedBy: the module turned on that replaces it (it runs until the restart, then it goes), or null;
   * dependency: installed only because a package needed it
   */
  async list() {
    const config = await loadConfig();
    const by = await replacements(config);
    const out = [];
    for (const [name, versions] of await scanModules(MODULES_DIR)) {
      const want = config.modules.find(m => m.name === name);
      const enabled = want ? (want.version ?? versions[0].version) : null;
      const shown = versions.find(v => v.version === enabled) ?? versions[0];
      const manifest = await readJson(join(shown.dir, 'module.json')) ?? {};
      const source = await readJson(join(shown.dir, 'source.json'));
      const running = this.#kernel.modules.find(m => m.name === name);
      out.push({
        name, version: shown.version, description: String(manifest.description ?? ''), icon: validIcon(manifest.icon) ? manifest.icon : null,
        provides: manifest.provides ?? [], requires: manifest.requires ?? [], required: Object.hasOwn(REQUIRED_MODULES, name),
        replaces: Array.isArray(manifest.replaces) ? manifest.replaces : [], replacedBy: by.get(name)?.name ?? null,
        dependencies: Array.isArray(manifest.dependencies) ? manifest.dependencies : [],
        enabled, running: running?.version ?? null, versions: versions.map(v => v.version),
        source, dependency: source?.dependency === true,
      });
    }
    // Removed (folder gone) but still running until the restart
    for (const m of this.#kernel.modules) {
      if (out.some(o => o.name === m.name)) continue;
      out.push({ name: m.name, version: m.version, description: m.description, icon: null, provides: m.provides, requires: m.requires, replaces: m.replaces ?? [], replacedBy: by.get(m.name)?.name ?? null, dependencies: [], dependency: false, enabled: null, running: m.version, versions: [], source: null });
    }
    return out;
  }

  /** Map name of a module → the module turned on that replaces it (for the catalogs: api/store.js). */
  async replaced() {
    return new Map([...await replacements(await loadConfig())].map(([old, mod]) => [old, mod.name]));
  }

  /** Checks that the kernel would start with these modules; throws why not. */
  async #checkStarts(modules) {
    const config = await loadConfig();
    const ordered = await resolveModules(MODULES_DIR, modules.map(m => ({ name: m.name, version: m.version ?? null, config: m.config ?? {} })))
      .catch(err => fail('conflict', err.message));
    const providers = new Set(ordered.flatMap(m => m.provides));
    if (!providers.has('fs')) fail('conflict', 'Senza un modulo che fornisce "fs" lilOS non avrebbe un file system');
    for (const [name, service] of Object.entries(REQUIRED_MODULES)) {
      if (!providers.has(service)) fail('conflict', `${name} è un modulo obbligatorio: lilOS non parte senza`);
    }
    if (!providers.has('auth') && !['127.0.0.1', '::1', 'localhost'].includes(config.host)) fail('conflict', 'Senza un modulo "auth" il kernel deve ascoltare solo su questo computer (host 127.0.0.1)');
  }

  /** Copies a module from its source into modules/<name>_<version>; `from`: the folder of the version it replaces. */
  async #place(source, { allowUnsigned, newer = null, from = null, enabled = new Set(), dependency = false }) {
    const opened = await openSource(source);
    const manifest = checkModule(JSON.parse((await opened.read('module.json')).toString('utf8')));
    if (!isOfficial(opened.source) && !allowUnsigned) fail('forbidden', 'Modulo non ufficiale: il suo codice girerà nel kernel con accesso completo. Si installa solo confermando l’avviso (allowUnsigned)');
    if (newer && compareVersions(manifest.version, newer) <= 0 && !source.ref) return { manifest, unchanged: true };
    if (!newer && enabled.has(manifest.name)) fail('conflict', `${manifest.name} è già installato: per una nuova versione usa l'aggiornamento`);
    const by = (await this.replaced()).get(manifest.name);
    if (by) fail('conflict', `${manifest.name} è stato sostituito da ${by}: non si installa più`);
    await this.guard?.checkMet('module', manifest);
    if (newer) await this.guard?.checkVersion('module', manifest.name, manifest.version);
    const dest = join(MODULES_DIR, `${manifest.name}_${manifest.version}`);
    // A folder left with its data by a removal is written over; an installed version is not
    const reused = await exists(dest);
    if (reused && (enabled.has(manifest.name) || !(await exists(join(dest, 'source.json'))))) fail('conflict', `${manifest.name} ${manifest.version} è già installato`);
    try {
      await writeModule(opened, manifest, dest, { from, dependency });
    } catch (err) {
      if (!reused) await rm(dest, { recursive: true, force: true }).catch(() => {});
      throw err;
    }
    return { manifest, dest, reused };
  }

  /** dependency: installed only because a package needs it (dependencies.js) */
  async install(principal, { source: raw, allowUnsigned = false, dependency = false } = {}) {
    requireAdmin(principal);
    const source = cleanSource(raw, { allowLocal: this.#allowLocal });
    const config = await loadConfig();
    const { manifest, dest, reused } = await this.#place(source, { allowUnsigned, dependency, enabled: new Set(config.modules.map(m => m.name)) });
    // The modules it replaces leave the configuration with it: they do not provide the same services twice
    const replaces = manifest.replaces ?? [];
    const next = [...config.modules.filter(m => !replaces.includes(m.name)), { name: manifest.name, version: manifest.version, config: manifest.defaultConfig ?? {} }];
    try {
      await this.#checkStarts(next);
    } catch (err) {
      if (!reused) await rm(dest, { recursive: true, force: true });
      throw err;
    }
    await editModules(list => [...list, { name: manifest.name, version: manifest.version, config: manifest.defaultConfig ?? {} }]);
    const replaced = await this.#takeOver(manifest, dest);
    log.info(`Installato ${manifest.name} ${manifest.version} (attivo dal prossimo avvio)`);
    return { name: manifest.name, version: manifest.version, restartRequired: true, ...(replaced.length && { replaced }) };
  }

  async update(principal, name, { ref, allowUnsigned = false } = {}) {
    requireAdmin(principal);
    const config = await loadConfig();
    const want = config.modules.find(m => m.name === name) ?? fail('not_found', 'Modulo non attivo');
    const current = (await scanModules(MODULES_DIR)).get(name)?.find(v => !want.version || v.version === want.version) ?? fail('not_found', 'Modulo non installato');
    const recorded = await readJson(join(current.dir, 'source.json'));
    if (!recorded) fail('invalid', `${name} non viene da un repository: si aggiorna a mano`);
    const { commit, installed, ...rest } = recorded;
    delete rest.ref;
    const source = cleanSource({ ...rest, ...(ref && { ref }) }, { allowLocal: this.#allowLocal });
    const placed = await this.#place(source, { allowUnsigned, newer: current.version, from: current.dir, dependency: recorded.dependency === true, enabled: new Set(config.modules.map(m => m.name)) });
    if (placed.unchanged) return { name, version: current.version, unchanged: true };
    const replaces = placed.manifest.replaces ?? [];
    const next = config.modules.filter(m => !replaces.includes(m.name)).map(m => (m.name === name ? { ...m, version: placed.manifest.version } : m));
    try {
      await this.#checkStarts(next);
    } catch (err) {
      await rm(placed.dest, { recursive: true, force: true });
      throw err;
    }
    await editModules(list => list.map(m => (m.name === name ? { ...m, version: placed.manifest.version } : m)));
    // Kept: the new version and the one it replaces
    for (const v of (await scanModules(MODULES_DIR)).get(name) ?? []) {
      if (v.version !== placed.manifest.version && v.version !== current.version) await rm(v.dir, { recursive: true, force: true });
    }
    const replaced = await this.#takeOver(placed.manifest, placed.dest);
    log.info(`Aggiornato ${name} ${current.version} → ${placed.manifest.version} (attivo dal prossimo avvio)`);
    return { name, version: placed.manifest.version, previous: current.version, restartRequired: true, ...(replaced.length && { replaced }) };
  }

  /** The modules a module just placed replaces, in the configuration or installed: it takes their place (takeOver). */
  async #takeOver(manifest, dir) {
    const config = await loadConfig();
    const installed = await scanModules(MODULES_DIR);
    const names = (manifest.replaces ?? []).filter(n => config.modules.some(m => m.name === n) || installed.has(n));
    return takeOver({ name: manifest.name, dir, manifest }, names);
  }

  /**
   * The settings of a running module (module.json `settings`): { fields, values, live }. live:
   * a change counts at once (the module listens), otherwise from the next start.
   */
  settings(principal, name) {
    requireAdmin(principal);
    return settingsView(this.#running(name));
  }

  /**
   * Changes them: { key: value } of its settings (others in its configuration stay as they are).
   * A secret setting (type 'password') left out or empty keeps its value; null removes it.
   */
  async saveSettings(principal, name, raw) {
    requireAdmin(principal);
    const mod = this.#running(name);
    if (!mod.settings.length) fail('invalid', 'Questo modulo non ha impostazioni');
    const plainFields = mod.settings.filter(f => !isSecretSetting(f));
    const { values } = checkFields({ fields: plainFields }, raw);
    // Secret ones: sealed for config.json, in clear for the module
    const secretNew = {}, secretGone = new Set();
    for (const f of mod.settings.filter(isSecretSetting)) {
      const v = raw?.[f.key];
      if (v === null) secretGone.add(f.key);
      else if (typeof v === 'string' && v !== '') {
        if (v.length > 4096) fail('invalid', `Valore non valido: ${f.key}`);
        secretNew[f.key] = { clear: v, sealed: await this.#kernel.settingSecrets.seal(v) };
      }
    }
    const apply = config => {
      const next = { ...config };
      for (const f of plainFields) if (values[f.key] === undefined) delete next[f.key]; else next[f.key] = values[f.key];
      for (const k of secretGone) delete next[k];
      for (const [k, v] of Object.entries(secretNew)) next[k] = v.sealed;
      return next;
    };
    await editModules(list => list.map(m => (m.name === name ? { ...m, config: apply(m.config && typeof m.config === 'object' ? m.config : {}) } : m)));
    for (const f of plainFields) if (values[f.key] === undefined) delete mod.config[f.key]; else mod.config[f.key] = values[f.key];
    for (const k of secretGone) delete mod.config[k];
    for (const [k, v] of Object.entries(secretNew)) mod.config[k] = v.clear;
    try {
      mod.configured();
    } catch (err) {
      log.error(`Impostazioni di ${name} non applicate`, err);
    }
    // Its network protocols: the open connections start again with the new settings
    const protocols = mod.provides.filter(s => s.startsWith('netfs.')).map(s => s.slice(6));
    if (protocols.length) await this.#kernel.network?.reset(protocols).catch(err => log.error('Connessioni non chiuse', err));
    log.info(`Impostazioni di ${name} cambiate${mod.live ? '' : ' (valgono dal prossimo avvio)'}`);
    return settingsView(mod);
  }

  #running(name) {
    if (!NAME.test(name ?? '')) fail('invalid', 'Nome non valido');
    return this.#kernel.modules.find(m => m.name === name) ?? fail('not_found', 'Modulo non attivo');
  }

  /** Turns the module off and deletes its folders, except those that hold its data. */
  async remove(principal, name) {
    requireAdmin(principal);
    const config = await loadConfig();
    if (!NAME.test(name)) fail('invalid', 'Nome non valido');
    if (Object.hasOwn(REQUIRED_MODULES, name)) fail('forbidden', `${name} è un modulo obbligatorio di lilOS: non si rimuove`);
    await this.guard?.checkRemovable('module', name);
    const next = config.modules.filter(m => m.name !== name);
    if (next.length !== config.modules.length) await this.#checkStarts(next.map(m => ({ ...m, version: m.version ?? null })));
    await editModules(list => list.filter(m => m.name !== name));
    const kept = [];
    for (const v of (await scanModules(MODULES_DIR)).get(name) ?? []) {
      const manifest = await readJson(join(v.dir, 'module.json'));
      const data = [];
      for (const f of manifest?.data ?? []) if (await exists(join(v.dir, f))) data.push(f);
      if (data.length) kept.push(`${name}_${v.version}`);
      else await rm(v.dir, { recursive: true, force: true });
    }
    log.info(`Rimosso ${name}${kept.length ? ` (dati conservati in ${kept.join(', ')})` : ''}`);
    return { name, kept, restartRequired: true };
  }
}
