import { execFile } from 'node:child_process';
import { cp, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fail } from '../errors.js';
import { KERNEL_DIR, MODULES_DIR, loadConfig } from '../config.js';
import { KERNEL_API, resolveModules, scanModules } from '../modules.js';
import { compareVersions, parseVersion } from './manifest.js';
import { cleanSource, isOfficial, openSource, walk } from './sources.js';
import { logger } from '../log.js';

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
 * Each module folder gets source.json: where it came from ({ type, url, ref, commit, path }).
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
  return m;
}

const requireAdmin = p => (p?.kind === 'kernel' || p?.role === 'admin' ? p : fail('forbidden', 'Solo un amministratore gestisce i moduli del kernel'));
const exists = path => stat(path).then(() => true, () => false);
const configFile = () => process.env.LILOS_KERNEL_CONFIG ?? join(KERNEL_DIR, 'config.json');

async function editConfig(fn) {
  const raw = JSON.parse(await readFile(configFile(), 'utf8'));
  raw.modules = fn(Array.isArray(raw.modules) ? raw.modules : []);
  await writeFile(`${configFile()}.tmp`, `${JSON.stringify(raw, null, 2)}\n`);
  await rename(`${configFile()}.tmp`, configFile());
}

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; }
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

async function installDependencies(dir) {
  if (!await exists(join(dir, 'package.json'))) return;
  const command = await exists(join(dir, 'package-lock.json')) ? 'ci' : 'install';
  try {
    await run(npm, [command, '--omit=dev', '--no-audit', '--no-fund', '--ignore-scripts'], { cwd: dir, timeout: 300_000, shell: process.platform === 'win32', windowsHide: true });
  } catch (err) {
    fail('unavailable', `Dipendenze del modulo non installate: ${String(err.stderr || err.message).split('\n')[0]}`.slice(0, 300));
  }
}

export class ModuleAdmin {
  #kernel; #allowLocal;

  constructor(kernel, { allowLocalSources }) {
    this.#kernel = kernel;
    this.#allowLocal = allowLocalSources;
  }

  /** [{ name, version, description, icon, provides, requires, enabled, running, versions, source }] */
  async list() {
    const config = await loadConfig();
    const out = [];
    for (const [name, versions] of await scanModules(MODULES_DIR)) {
      const want = config.modules.find(m => m.name === name);
      const enabled = want ? (want.version ?? versions[0].version) : null;
      const shown = versions.find(v => v.version === enabled) ?? versions[0];
      const manifest = await readJson(join(shown.dir, 'module.json')) ?? {};
      const running = this.#kernel.modules.find(m => m.name === name);
      out.push({
        name, version: shown.version, description: String(manifest.description ?? ''), icon: validIcon(manifest.icon) ? manifest.icon : null,
        provides: manifest.provides ?? [], requires: manifest.requires ?? [],
        enabled, running: running?.version ?? null, versions: versions.map(v => v.version),
        source: await readJson(join(shown.dir, 'source.json')),
      });
    }
    // Removed (folder gone) but still running until the restart
    for (const m of this.#kernel.modules) {
      if (out.some(o => o.name === m.name)) continue;
      out.push({ name: m.name, version: m.version, description: m.description, icon: null, provides: m.provides, requires: m.requires, enabled: null, running: m.version, versions: [], source: null });
    }
    return out;
  }

  /** Checks that the kernel would start with these modules; throws why not. */
  async #checkStarts(modules) {
    const config = await loadConfig();
    const ordered = await resolveModules(MODULES_DIR, modules.map(m => ({ name: m.name, version: m.version ?? null, config: m.config ?? {} })))
      .catch(err => fail('conflict', err.message));
    const providers = new Set(ordered.flatMap(m => m.provides));
    if (!providers.has('fs')) fail('conflict', 'Senza un modulo che fornisce "fs" lilOS non avrebbe un file system');
    if (!providers.has('auth') && !['127.0.0.1', '::1', 'localhost'].includes(config.host)) fail('conflict', 'Senza un modulo "auth" il kernel deve ascoltare solo su questo computer (host 127.0.0.1)');
  }

  /** Copies a module from its source into modules/<name>_<version>; `from`: the folder of the version it replaces. */
  async #place(source, { allowUnsigned, newer = null, from = null, enabled = new Set() }) {
    const opened = await openSource(source);
    const manifest = checkModule(JSON.parse((await opened.read('module.json')).toString('utf8')));
    if (!isOfficial(opened.source) && !allowUnsigned) fail('forbidden', 'Modulo non ufficiale: il suo codice girerà nel kernel con accesso completo. Si installa solo confermando l’avviso (allowUnsigned)');
    if (newer && compareVersions(manifest.version, newer) <= 0 && !source.ref) return { manifest, unchanged: true };
    if (!newer && enabled.has(manifest.name)) fail('conflict', `${manifest.name} è già installato: per una nuova versione usa l'aggiornamento`);
    const dest = join(MODULES_DIR, `${manifest.name}_${manifest.version}`);
    // A folder left with its data by a removal is written over; an installed version is not
    const reused = await exists(dest);
    if (reused && (enabled.has(manifest.name) || !(await exists(join(dest, 'source.json'))))) fail('conflict', `${manifest.name} ${manifest.version} è già installato`);
    try {
      for (const path of await walk(opened.base)) {
        if (path === 'source.json') continue;
        const target = join(dest, ...path.split('/'));
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, await opened.read(path));
      }
      for (const file of from ? manifest.data ?? [] : []) {
        if (await exists(join(from, file))) await cp(join(from, file), join(dest, file));
      }
      await writeFile(join(dest, 'source.json'), JSON.stringify({ ...opened.source, installed: Date.now() }, null, 2));
      await installDependencies(dest);
    } catch (err) {
      if (!reused) await rm(dest, { recursive: true, force: true }).catch(() => {});
      throw err;
    }
    return { manifest, dest, reused };
  }

  async install(principal, { source: raw, allowUnsigned = false } = {}) {
    requireAdmin(principal);
    const source = cleanSource(raw, { allowLocal: this.#allowLocal });
    const config = await loadConfig();
    const { manifest, dest, reused } = await this.#place(source, { allowUnsigned, enabled: new Set(config.modules.map(m => m.name)) });
    const next = [...config.modules, { name: manifest.name, version: manifest.version, config: manifest.defaultConfig ?? {} }];
    try {
      await this.#checkStarts(next);
    } catch (err) {
      if (!reused) await rm(dest, { recursive: true, force: true });
      throw err;
    }
    await editConfig(list => [...list, { name: manifest.name, version: manifest.version, config: manifest.defaultConfig ?? {} }]);
    log.info(`Installato ${manifest.name} ${manifest.version} (attivo dal prossimo avvio)`);
    return { name: manifest.name, version: manifest.version, restartRequired: true };
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
    const placed = await this.#place(source, { allowUnsigned, newer: current.version, from: current.dir, enabled: new Set(config.modules.map(m => m.name)) });
    if (placed.unchanged) return { name, version: current.version, unchanged: true };
    const next = config.modules.map(m => (m.name === name ? { ...m, version: placed.manifest.version } : m));
    try {
      await this.#checkStarts(next);
    } catch (err) {
      await rm(placed.dest, { recursive: true, force: true });
      throw err;
    }
    await editConfig(list => list.map(m => (m.name === name ? { ...m, version: placed.manifest.version } : m)));
    // Kept: the new version and the one it replaces
    for (const v of (await scanModules(MODULES_DIR)).get(name) ?? []) {
      if (v.version !== placed.manifest.version && v.version !== current.version) await rm(v.dir, { recursive: true, force: true });
    }
    log.info(`Aggiornato ${name} ${current.version} → ${placed.manifest.version} (attivo dal prossimo avvio)`);
    return { name, version: placed.manifest.version, previous: current.version, restartRequired: true };
  }

  /** Turns the module off and deletes its folders, except those that hold its data. */
  async remove(principal, name) {
    requireAdmin(principal);
    const config = await loadConfig();
    if (!NAME.test(name)) fail('invalid', 'Nome non valido');
    const next = config.modules.filter(m => m.name !== name);
    if (next.length !== config.modules.length) await this.#checkStarts(next.map(m => ({ ...m, version: m.version ?? null })));
    await editConfig(list => list.filter(m => m.name !== name));
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
