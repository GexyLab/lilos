import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkService } from './services.js';
import { logger } from './log.js';
import { fail } from './errors.js';

/** Kernel API version the modules declare in module.json ("kernel": "1"). */
export const KERNEL_API = 1;

const DIR = /^([a-z][a-z0-9-]{0,40})_(\d+\.\d+\.\d+)$/;
const SERVICE = /^[a-z][a-z0-9.-]{0,40}$/;

const compare = (a, b) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
};

/**
 * Modules installed under modules/, one folder each named '<name>_<version>' with:
 *   module.json  { name, version, description, kernel: "1", provides: [service], requires: [service] }
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
  return { ...mod, description: String(raw.description ?? ''), provides: list(raw.provides), requires: list(raw.requires) };
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
 *   ctx.config                        its part of the kernel configuration
 *   ctx.log                           logger
 *   ctx.fail(code, message)           throws a KernelError (codes in errors.js: 'invalid', 'forbidden'…)
 *   ctx.provide(service, impl)        only services listed in "provides"
 *   ctx.service(name)                 only services listed in "requires"
 *   ctx.route(method, path, handler)  an HTTP endpoint at /api/modules/<name><path>, for signed-in
 *                                     users only: handler({ principal, params, query, json() }) → JSON
 */
export async function startModule(mod, services, { route }) {
  const { default: impl } = await import(pathToFileURL(join(mod.dir, 'index.js')).href);
  if (!impl || typeof impl.init !== 'function') throw new Error(`${mod.name}: index.js non esporta { init }`);
  const ctx = {
    name: mod.name,
    version: mod.version,
    dir: mod.dir,
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
      if (!/^(\/[\w:-]+)+$/.test(path)) throw new Error(`${mod.name}: percorso non valido ${path}`);
      if (path === '/update') throw new Error(`${mod.name}: /update è del kernel (aggiornamento dei moduli)`);
      route(method, `/api/modules/${mod.name}${path}`, handler);
    },
  };
  await impl.init(ctx);
  const missing = mod.provides.filter(s => !services.has(s));
  if (missing.length) throw new Error(`${mod.name} non ha fornito: ${missing.join(', ')}`);
  return { ...mod, impl, ctx };
}
