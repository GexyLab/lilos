import { readdir, readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkService } from './services.js';
import { logger } from './log.js';
import { fail } from './errors.js';
import { JsonStore } from './jsonFile.js';
import { cleanPath, joinPath, parentOf, baseName, isSafeName, cleanName } from './net/drivers.js';

/** Field types a module's settings may have (the same descriptions as the fields of net/drivers.js). */
const SETTING_TYPES = new Set(['text', 'textarea', 'number', 'select', 'checkbox', 'password']);
const SETTING_KEY = /^[a-z][a-zA-Z0-9]{0,30}$/;

/**
 * A setting that is a secret (type 'password', such as a client secret): config.json keeps it
 * encrypted (net/secrets.js), the module gets it in clear, the page never gets it back.
 */
export const isSecretSetting = f => f.type === 'password';

/** The secret settings of a module, opened in its configuration (before it starts); ones that cannot be opened go. */
export async function openSecretSettings(mod, secrets, log) {
  for (const f of mod.settings.filter(isSecretSetting)) {
    const v = mod.config[f.key];
    if (typeof v !== 'string') { if (v !== undefined) delete mod.config[f.key]; continue; }
    if (!v.startsWith('v1:')) {
      // Written by hand in config.json: used as it is (saving it from the Control Panel encrypts it)
      log.warn(`${mod.name}: impostazione segreta «${f.key}» in chiaro in config.json`);
      continue;
    }
    try {
      const open = await secrets.open(v);
      if (typeof open === 'string') mod.config[f.key] = open; else delete mod.config[f.key];
    } catch {
      delete mod.config[f.key];
      log.warn(`${mod.name}: impostazione segreta «${f.key}» non leggibile (va inserita di nuovo)`);
    }
  }
}

/**
 * Kernel API version the modules declare in module.json ("kernel": "1"). It changes only when
 * something a module uses goes or changes meaning; what is added keeps it (the members of ctx
 * since lilOS 1.21.0: a module that needs one fails with a clear message on an older kernel).
 */
export const KERNEL_API = 1;

/**
 * Modules lilOS cannot do without (name → the service it provides). Each comes with lilOS itself:
 * in system/kernel/modules of the repository and of every release (scripts/release.mjs). When the
 * kernel starts it puts back the ones missing from modules/ or from the configuration, and a newer
 * one of the release replaces the one installed (modulePackage.js ensureRequiredModules); they are
 * updated, never removed. module.json says "required": true.
 */
export const REQUIRED_MODULES = Object.freeze({ scheduler: 'scheduler' });

const DIR = /^([a-z][a-z0-9-]{0,40})_(\d+\.\d+\.\d+)$/;
const NAME = /^[a-z][a-z0-9-]{0,40}$/;
const SERVICE = /^[a-z][a-z0-9.-]{0,40}$/;

const compare = (a, b) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
};

/**
 * Modules installed under modules/, one folder each named '<name>_<version>' with:
 *   module.json  { name, version, description, kernel: "1", provides: [service], requires: [service],
 *                  replaces?: [name],     modules it takes the place of (a merge of modules: their
 *                                         configuration comes to it and they go, modulePackage.js)
 *                  settings?: [field] }   what an admin may change of its configuration (Control
 *                  Panel), described as the fields of a network protocol (net/drivers.js: key, type
 *                  text | textarea | number | select | checkbox | password, label, hint, default,
 *                  options, when…); 'password': a secret, kept encrypted (isSecretSetting)
 *   index.js     export default { async init(ctx), async stop(), commands? }
 *
 * Returns Map name → [{ name, version, dir }], versions highest first.
 */
export async function scanModules(modulesDir) {
  const found = new Map();
  for (const entry of await readdir(modulesDir, { withFileTypes: true }).catch(() => [])) {
    const m = entry.isDirectory() && DIR.exec(entry.name);
    if (!m) continue;
    const list = found.get(m[1]) ?? [];
    list.push({ name: m[1], version: m[2], dir: join(modulesDir, entry.name) });
    found.set(m[1], list.sort((a, b) => compare(b.version, a.version)));
  }
  return found;
}

async function readManifest(mod) {
  const raw = JSON.parse(await readFile(join(mod.dir, 'module.json'), 'utf8'));
  const list = v => (Array.isArray(v) ? v : []);
  if (raw.name !== mod.name || raw.version !== mod.version) throw new Error(`module.json non corrisponde alla cartella ${mod.name}_${mod.version}`);
  if (String(raw.kernel) !== String(KERNEL_API)) throw new Error(`${mod.name} richiede il kernel ${raw.kernel}, questo è il ${KERNEL_API}`);
  const services = [...list(raw.provides), ...list(raw.requires)];
  if (services.some(s => typeof s !== 'string' || !SERVICE.test(s))) throw new Error(`${mod.name}: nomi di servizi non validi`);
  const settings = list(raw.settings);
  if (settings.some(f => !f || typeof f !== 'object' || !SETTING_KEY.test(f.key ?? '') || !SETTING_TYPES.has(f.type))) throw new Error(`${mod.name}: impostazioni non valide`);
  const replaces = list(raw.replaces);
  if (replaces.some(n => typeof n !== 'string' || !NAME.test(n) || n === mod.name)) throw new Error(`${mod.name}: replaces non valido`);
  return { ...mod, description: String(raw.description ?? ''), provides: list(raw.provides), requires: list(raw.requires), replaces, settings };
}

/**
 * Loads the modules listed in the configuration ({ name, version?, config }; without a version
 * the highest installed), in the order their services need: a module that requires a service
 * starts after the module that provides it. Returns the loaded modules, in start order.
 */
export async function resolveModules(modulesDir, wanted) {
  const installed = await scanModules(modulesDir);
  const chosen = [];
  for (const want of wanted) {
    const versions = installed.get(want.name);
    if (!versions) throw new Error(`Modulo non installato: ${want.name}`);
    const mod = want.version ? versions.find(v => v.version === want.version) : versions[0];
    if (!mod) throw new Error(`Modulo non installato: ${want.name}_${want.version}`);
    if (chosen.some(c => c.name === mod.name)) throw new Error(`Modulo indicato due volte: ${mod.name}`);
    chosen.push({ ...(await readManifest(mod)), config: want.config ?? {} });
  }
  // A module another one replaces does not start with it (modulePackage.js takes it away for good)
  const replaced = new Set(chosen.flatMap(m => m.replaces));
  for (const mod of chosen.filter(m => replaced.has(m.name))) {
    logger('modules').warn(`${mod.name} non parte: lo sostituisce ${chosen.find(m => m.replaces.includes(mod.name)).name}`);
  }
  chosen.splice(0, chosen.length, ...chosen.filter(m => !replaced.has(m.name)));

  const providers = new Map();
  for (const mod of chosen) {
    for (const s of mod.provides) {
      if (providers.has(s)) throw new Error(`Il servizio "${s}" è fornito sia da ${providers.get(s).name} sia da ${mod.name}`);
      providers.set(s, mod);
    }
  }
  const ordered = [], state = new Map();
  const visit = mod => {
    if (state.get(mod) === 'done') return;
    if (state.get(mod) === 'visiting') throw new Error(`Dipendenze circolari tra i moduli (${mod.name})`);
    state.set(mod, 'visiting');
    for (const s of mod.requires) {
      const provider = providers.get(s);
      if (!provider) throw new Error(`${mod.name} richiede il servizio "${s}", che nessun modulo attivo fornisce`);
      if (provider !== mod) visit(provider);
    }
    state.set(mod, 'done');
    ordered.push(mod);
  };
  chosen.forEach(visit);
  return ordered;
}

/**
 * Starts one module. Its context:
 *   ctx.name, ctx.version, ctx.dir    the module and its folder (it may keep its own files there)
 *   ctx.config                        its part of the kernel configuration (the same object for
 *                                     good: an admin's change of its settings is made in it)
 *   ctx.onConfig(fn)                  fn(config) after an admin changed its settings (module.json
 *                                     `settings`); without it, they count from the next start
 *   ctx.log                           logger
 *   ctx.fail(code, message)           throws a KernelError (codes in errors.js: 'invalid', 'forbidden'…)
 *   ctx.provide(service, impl)        only services listed in "provides"
 *   ctx.service(name)                 only services listed in "requires"
 *   ctx.route(method, path, handler)  an HTTP endpoint at /api/modules/<name><path>, for signed-in
 *                                     users only: handler({ principal, params, query, json() }) → JSON
 *   ctx.socket(path, handler)         a WebSocket at /api/modules/<name><path> (GET), for signed-in
 *                                     users only: handler({ principal, params, query, accept }) where
 *                                     accept({ maxMessage }) → ws (ws.js) takes the connection; a
 *                                     handler that throws or does not accept refuses it
 *   ctx.dataDir                       a folder for the module's data that outlives its versions
 *                                     (<data>/modules-data/<name>): made by the module when it needs it
 *   ctx.emit(userId, event, data)     tells that user's open lilOS pages (the kernel's event stream,
 *                                     /api/services-events): event '<word>.<word>', data JSON
 *   ctx.jsonStore(file, options)      (since lilOS 1.21.0) a JSON file kept in memory and saved whole
 *                                     and safely (jsonFile.js JsonStore); a relative `file` is in ctx.dir
 *   ctx.paths                         (since lilOS 1.21.0) the paths of the network protocols
 *                                     (net/drivers.js): cleanPath, joinPath, parentOf, baseName,
 *                                     isSafeName, cleanName
 */
export const PATHS = Object.freeze({ cleanPath, joinPath, parentOf, baseName, isSafeName, cleanName });
const EVENT = /^[a-z][a-z0-9-]{0,30}\.[a-z][a-zA-Z0-9.-]{0,40}$/;
const PATH = /^(\/[\w:-]+)+$/;

export async function startModule(mod, services, { route, emit, socket, dataDir }) {
  const { default: impl } = await import(pathToFileURL(join(mod.dir, 'index.js')).href);
  const listeners = [];
  if (!impl || typeof impl.init !== 'function') throw new Error(`${mod.name}: index.js non esporta { init }`);
  const ctx = {
    name: mod.name,
    version: mod.version,
    dir: mod.dir,
    dataDir: join(dataDir, mod.name),
    config: mod.config,
    log: logger(mod.name),
    fail,
    provide(service, value) {
      if (!mod.provides.includes(service)) throw new Error(`${mod.name} non dichiara di fornire "${service}"`);
      checkService(service, value);
      services.set(service, value);
    },
    service(name) {
      if (!mod.requires.includes(name)) throw new Error(`${mod.name} non dichiara di richiedere "${name}"`);
      return services.get(name);
    },
    route(method, path, handler) {
      if (!PATH.test(path)) throw new Error(`${mod.name}: percorso non valido ${path}`);
      if (path === '/update' || path === '/settings') throw new Error(`${mod.name}: ${path} è del kernel (gestione dei moduli)`);
      route(method, `/api/modules/${mod.name}${path}`, handler);
    },
    socket(path, handler) {
      if (!PATH.test(path)) throw new Error(`${mod.name}: percorso non valido ${path}`);
      socket(`/api/modules/${mod.name}${path}`, handler);
    },
    onConfig(fn) {
      if (typeof fn === 'function') listeners.push(fn);
    },
    emit(userId, event, data = {}) {
      if (typeof userId !== 'string' || !EVENT.test(event)) throw new Error(`${mod.name}: evento non valido ${event}`);
      emit(userId, event, JSON.parse(JSON.stringify(data ?? {})));
    },
    jsonStore(file, options) {
      if (typeof file !== 'string' || !file) throw new Error(`${mod.name}: jsonStore senza file`);
      return new JsonStore(isAbsolute(file) ? file : join(mod.dir, file), options);
    },
    paths: PATHS,
  };
  await impl.init(ctx);
  const missing = mod.provides.filter(s => !services.has(s));
  if (missing.length) throw new Error(`${mod.name} non ha fornito: ${missing.join(', ')}`);
  return { ...mod, impl, ctx, live: listeners.length > 0, configured: () => listeners.forEach(fn => fn(ctx.config)) };
}
