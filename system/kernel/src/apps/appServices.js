import { EventEmitter } from 'node:events';
import { fail } from '../errors.js';
import { KERNEL } from '../services.js';
import { logger } from '../log.js';
import { readUserKey, writeUserKey } from '../api/home.js';
import { sha256 } from './manifest.js';
import { serviceApi } from './serviceApi.js';

/**
 * The services of installed apps: entry points of kind 'service' (manifest.js), run by the
 * 'runtime' service of a kernel module (services-isolate), each for an owner: a user, or the
 * system (nobody: one instance for everyone).
 *
 * When they start (Sistema → Avvio):
 *   system:ready   when the kernel starts: the ones an admin chose for everyone, as the system
 *                  (node /system/app/.startup, meta.startup: { services: [{ app, entry, params }] })
 *   user:login     the first time the kernel sees a user in this run (sign-in, or a session still
 *                  valid): the ones they chose, as them (key 'startup-services' of their .config:
 *                  { enabled, services: [{ app, entry, params }] }), unless they turned it off
 * and when someone starts one by hand or calls it (lilos.apps.call): it then stays on until stopped,
 * or until its owner signs out. A service chosen for everyone runs only as the system: calls and
 * commands go there, and only admins start or stop it.
 *
 * The service gets args: { reason: 'system:ready' | 'user:login' | 'manual' | 'call', ...params }.
 * One that stops by itself starts again after 1 s, 5 s, 30 s; after 3 times within 5 minutes it
 * stays off with its error. Each keeps its last 200 log lines. A new version of the app restarts
 * the ones running with the new code; a removed app stops them.
 *
 * Events: 'change' { owner, app, entry } (owner: a user id, or '*' for the system),
 *         'notify' { owner, app, text }
 */
const log = logger('services');
const SYSTEM = '*';
const STARTUP_NODE = 'app-startup';
const USER_KEY = 'startup-services';
const MAX_BINDINGS = 100;
const LOG_LINES = 200;
const BACKOFF = [1000, 5000, 30_000];
const CRASH_WINDOW = 5 * 60_000;
const LIMITS = { memoryMb: 128, cpuMs: 10_000 };
const ENTRY = /^[a-z][a-zA-Z0-9]{0,30}$/;
const APP = /^[a-z0-9][a-z0-9.-]{1,63}$/;
const HOME_PATH = /^~(\/[^/\0]{1,255}){0,16}$/;
const WHEN = ['none', 'login', 'system'];

const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const isAdmin = p => p?.kind === 'kernel' || (p?.kind === 'user' && p.role === 'admin');

/** Saved bindings, checked (they are untrusted). */
function bindings(list) {
  const out = [];
  for (const b of Array.isArray(list) ? list.slice(0, MAX_BINDINGS) : []) {
    if (!plain(b) || !APP.test(b.app ?? '') || !ENTRY.test(b.entry ?? '')) continue;
    if (out.some(x => x.app === b.app && x.entry === b.entry)) continue;
    out.push({ app: b.app, entry: b.entry, params: plain(b.params) ? b.params : {} });
  }
  return out;
}

/** Params of a service, checked against its declared ones (or any JSON object of 4 KB). A file or folder is a '~/…' path. */
export function checkServiceParams(schema, values) {
  const given = values ?? {};
  if (!plain(given)) fail('invalid', 'I parametri devono essere un oggetto JSON');
  if (!plain(schema)) {
    const text = JSON.stringify(given);
    if (text.length > 4096) fail('invalid', 'Parametri troppo lunghi (al massimo 4 KB)');
    return JSON.parse(text);
  }
  const out = {};
  for (const [name, p] of Object.entries(schema)) {
    const v = given[name];
    if (!Object.hasOwn(given, name) || v === '' || v == null) continue;
    const ok = {
      text: () => typeof v === 'string' && v.length <= (p.maxLength ?? 2000),
      number: () => typeof v === 'number' && Number.isFinite(v) && !(p.min > v) && !(p.max < v),
      boolean: () => typeof v === 'boolean',
      choice: () => (p.options ?? []).some(o => o.value === v),
      file: () => typeof v === 'string' && HOME_PATH.test(v) && !v.split('/').includes('..'),
      folder: () => typeof v === 'string' && HOME_PATH.test(v) && !v.split('/').includes('..'),
    }[p.type];
    if (!ok) continue;
    if (!ok()) fail('invalid', `${p.label}: valore non valido`);
    out[name] = v;
  }
  return out;
}

/** Declared params with their defaults filled in. */
function withDefaults(schema, params) {
  const out = { ...params };
  for (const [name, p] of Object.entries(plain(schema) ? schema : {})) {
    if (!Object.hasOwn(out, name) && p.default !== undefined) out[name] = p.default;
  }
  return out;
}

export class AppServices extends EventEmitter {
  #kernel; #instances = new Map(); #seen = new Map();

  constructor(kernel) {
    super();
    this.#kernel = kernel;
    kernel.installer.onChange(id => this.#appChanged(id).catch(err => log.error(`Servizi di ${id}`, err)));
  }

  /** True when a module runs services (the 'runtime' service). */
  get available() {
    return this.#kernel.services.has('runtime');
  }

  // ---------- What there is ----------

  /** Every service of the installed apps: [{ app, entry, label, params, name, glyph, color, pkg }]. */
  async catalog() {
    const out = [];
    for (const pkg of await this.#kernel.installer.list()) {
      for (const [entry, ep] of Object.entries(pkg.manifest.entrypoints ?? {})) {
        if (ep?.kind !== 'service') continue;
        out.push({
          app: pkg.id, entry, label: ep.label ?? entry, params: plain(ep.params) ? ep.params : null,
          name: pkg.manifest.name, glyph: pkg.manifest.icon?.glyph ?? 'help', color: pkg.manifest.icon?.color ?? '#5f6673', pkg,
        });
      }
    }
    return out;
  }

  async #service(app, entry) {
    return (await this.catalog()).find(s => s.app === app && s.entry === entry) ?? fail('not_found', 'Servizio inesistente');
  }

  async systemStartup() {
    return bindings((await this.#kernel.service('fs').stat(KERNEL, STARTUP_NODE))?.meta?.startup?.services);
  }

  async #saveSystemStartup(list) {
    const fs = this.#kernel.service('fs');
    const node = await fs.stat(KERNEL, STARTUP_NODE);
    const now = Date.now();
    await fs.apply(KERNEL, { put: [{
      ...(node ?? { id: STARTUP_NODE, parent: 'fs:app', name: '.startup', type: 'folder', created: now }),
      modified: now, meta: { ...node?.meta, startup: { services: list } },
    }] });
  }

  async userStartup(principal) {
    const raw = await readUserKey(this.#kernel, principal, USER_KEY, {});
    return { enabled: raw?.enabled !== false, services: bindings(raw?.services) };
  }

  /** What Sistema shows: every service, with when it starts and how it is now, for this user. */
  async list(principal) {
    const [catalog, system, mine] = await Promise.all([this.catalog(), this.systemStartup(), this.userStartup(principal)]);
    const services = catalog.map(s => {
      const sys = system.find(b => b.app === s.app && b.entry === s.entry);
      const own = mine.services.find(b => b.app === s.app && b.entry === s.entry);
      const owner = sys ? SYSTEM : principal.id;
      const inst = this.#instances.get(this.#key(owner, s.app, s.entry));
      return {
        app: s.app, entry: s.entry, label: s.label, name: s.name, glyph: s.glyph, color: s.color, params: s.params,
        startup: sys ? 'system' : own ? 'login' : 'none',
        values: (sys ?? own)?.params ?? {},
        system: !!sys,
        canControl: !sys || isAdmin(principal),
        status: inst?.status ?? 'off', since: inst?.since ?? null, error: inst?.error ?? null,
      };
    });
    return { available: this.available, enabled: mine.enabled, admin: isAdmin(principal), services };
  }

  // ---------- Choices ----------

  /** When a service starts by itself: 'none', 'login' (for this user) or 'system' (for everyone: admins). */
  async setStartup(principal, app, entry, { when, params } = {}) {
    if (!WHEN.includes(when)) fail('invalid', 'when deve essere none, login o system');
    const service = await this.#service(app, entry);
    const system = await this.systemStartup();
    const user = await this.userStartup(principal);
    const isSystem = system.some(b => b.app === app && b.entry === entry);
    const values = params === undefined
      ? (system.find(b => b.app === app && b.entry === entry) ?? user.services.find(b => b.app === app && b.entry === entry))?.params ?? {}
      : checkServiceParams(service.params, params);
    if ((when === 'system' || isSystem) && !isAdmin(principal)) fail('forbidden', 'Solo un amministratore sceglie i servizi di tutti');
    const without = list => list.filter(b => !(b.app === app && b.entry === entry));
    const binding = { app, entry, params: values };

    if (when === 'system' || isSystem) await this.#saveSystemStartup(when === 'system' ? [...without(system), binding] : without(system));
    const services = when === 'login' ? [...without(user.services), binding] : without(user.services);
    await writeUserKey(this.#kernel, principal, USER_KEY, { enabled: user.enabled, services });

    // Moving between the system and a user changes which instance is the service's
    if (when === 'system' && !isSystem) await this.#stop(this.#instances.get(this.#key(principal.id, app, entry)));
    if (when !== 'system' && isSystem) await this.#stop(this.#instances.get(this.#key(SYSTEM, app, entry)));
    this.emit('change', { owner: when === 'system' || isSystem ? SYSTEM : principal.id, app, entry });
    return this.list(principal);
  }

  async setOptions(principal, { enabled }) {
    if (typeof enabled !== 'boolean') fail('invalid', 'enabled deve essere true o false');
    const user = await this.userStartup(principal);
    await writeUserKey(this.#kernel, principal, USER_KEY, { ...user, enabled });
    return { enabled };
  }

  // ---------- Running ----------

  #key(owner, app, entry) {
    return `${owner}|${app}#${entry}`;
  }

  /** The instance a user's commands and calls go to: the system's when it was chosen for everyone. */
  async #target(principal, app, entry) {
    const service = await this.#service(app, entry);
    const system = (await this.systemStartup()).find(b => b.app === app && b.entry === entry);
    if (system) return { service, owner: SYSTEM, principal: null, binding: system };
    const own = (await this.userStartup(principal)).services.find(b => b.app === app && b.entry === entry);
    return { service, owner: principal.id, principal, binding: own ?? null };
  }

  async control(principal, app, entry, action) {
    if (!['start', 'stop', 'restart'].includes(action)) fail('invalid', 'Azione sconosciuta');
    const t = await this.#target(principal, app, entry);
    if (t.owner === SYSTEM && !isAdmin(principal)) fail('forbidden', 'Solo un amministratore accende o spegne i servizi di tutti');
    const inst = this.#instances.get(this.#key(t.owner, app, entry));
    if (action !== 'start' || inst?.status === 'error') await this.#stop(inst);
    if (action !== 'stop') await this.#start(t, 'manual');
    const now = this.#instances.get(this.#key(t.owner, app, entry));
    return { status: now?.status ?? 'off', error: now?.error ?? null };
  }

  /** A call from lilOS (lilos.apps.call, or the system): what the service's lilos.handle() returns. */
  async call(principal, app, entry, data, from) {
    const t = await this.#target(principal, app, entry);
    let inst = this.#instances.get(this.#key(t.owner, app, entry));
    if (!inst || inst.status === 'off' || inst.status === 'error') inst = await this.#start(t, 'call');
    await inst.ready;
    if (inst.status !== 'on') fail('unavailable', `${t.service.name} non è partito: ${inst.error ?? 'errore'}`);
    try {
      return await inst.handle.request(data ?? null, from ?? null);
    } catch (err) {
      fail('invalid', `${t.service.label}: ${err.message}`);
    }
  }

  async log(principal, app, entry) {
    const t = await this.#target(principal, app, entry);
    if (t.owner === SYSTEM && !isAdmin(principal)) fail('forbidden', 'Solo un amministratore legge il registro dei servizi di tutti');
    return { lines: this.#instances.get(this.#key(t.owner, app, entry))?.logs ?? [] };
  }

  /** Starts an instance (when not already on); resolves with it, once it is on or has failed. */
  async #start({ service, owner, principal, binding }, reason) {
    const key = this.#key(owner, service.app, service.entry);
    const current = this.#instances.get(key);
    if (current && (current.status === 'on' || current.status === 'starting')) return current;
    if (!this.available) fail('unavailable', 'Nessun modulo del kernel fa girare i servizi (services-isolate)');
    const inst = current ?? { owner, app: service.app, entry: service.entry, logs: [], crashes: [] };
    clearTimeout(inst.timer);
    Object.assign(inst, { principal, status: 'starting', since: Date.now(), error: null, handle: null, stopping: false, binding, reason });
    this.#instances.set(key, inst);
    this.#changed(inst);
    inst.ready = this.#run(inst, service).catch(err => {
      if (inst.stopping) return;
      inst.status = 'error';
      inst.error = err.message;
      this.#line(inst, 'error', `Non è partito: ${err.message}`);
      log.warn(`${key} non è partito: ${err.message}`);
      this.#changed(inst);
    });
    await inst.ready;
    return inst;
  }

  async #run(inst, service) {
    const { pkg } = service;
    const ep = pkg.manifest.entrypoints[inst.entry];
    const file = ep.file ?? pkg.manifest.entry;
    const code = await this.#kernel.installer.file(KERNEL, pkg.id, file);
    if (sha256(code) !== pkg.manifest.files?.[file]) throw new Error('il codice non corrisponde al manifesto');
    const params = withDefaults(service.params, inst.binding?.params ?? {});
    const api = serviceApi({
      kernel: this.#kernel, app: pkg, owner: inst.principal,
      notify: text => this.emit('notify', { owner: inst.owner, app: pkg.id, text }),
      readUserKey: (p, k, fallback) => readUserKey(this.#kernel, p, k, fallback),
      writeUserKey: (p, k, v) => writeUserKey(this.#kernel, p, k, v),
    });
    const handle = await this.#kernel.service('runtime').start({
      key: this.#key(inst.owner, inst.app, inst.entry),
      code: code.toString('utf8'),
      info: {
        id: pkg.id, version: pkg.version, entry: inst.entry, args: { reason: inst.reason, ...params },
        user: inst.principal ? { id: inst.principal.id, username: inst.principal.username, name: inst.principal.name } : null,
      },
      limits: LIMITS,
    }, {
      call: (method, args) => api.invoke(method, args),
      log: (level, text) => this.#line(inst, level, text),
      exit: reason => this.#exited(inst, handle, reason),
    });
    if (inst.stopping) { await handle.stop(); return; }
    inst.handle = handle;
    inst.status = 'on';
    inst.since = Date.now();
    this.#line(inst, 'info', `Acceso (${inst.reason})`);
    this.#changed(inst);
  }

  /** It stopped by itself: start it again, unless it keeps failing. */
  #exited(inst, handle, reason) {
    if (inst.stopping || (inst.handle && inst.handle !== handle)) return;
    inst.handle = null;
    const now = Date.now();
    inst.crashes = [...inst.crashes.filter(t => now - t < CRASH_WINDOW), now];
    this.#line(inst, 'error', `Si è fermato: ${reason}`);
    log.warn(`${this.#key(inst.owner, inst.app, inst.entry)} si è fermato: ${reason}`);
    if (inst.crashes.length > BACKOFF.length) {
      inst.status = 'error';
      inst.error = `${reason} (si è fermato ${inst.crashes.length} volte in 5 minuti: resta spento)`;
      this.#changed(inst);
      return;
    }
    inst.status = 'starting';
    inst.error = reason;
    this.#changed(inst);
    inst.timer = setTimeout(async () => {
      try {
        const service = await this.#service(inst.app, inst.entry);
        inst.status = 'off';
        await this.#start({ service, owner: inst.owner, principal: inst.principal, binding: inst.binding }, inst.reason);
      } catch (err) {
        inst.status = 'error';
        inst.error = err.message;
        this.#changed(inst);
      }
    }, BACKOFF[inst.crashes.length - 1]);
  }

  async #stop(inst) {
    if (!inst) return;
    clearTimeout(inst.timer);
    inst.stopping = true;
    const handle = inst.handle;
    inst.handle = null;
    if (inst.status !== 'off') this.#line(inst, 'info', 'Spento');
    inst.status = 'off';
    inst.error = null;
    inst.crashes = [];
    this.#changed(inst);
    await handle?.stop().catch(err => log.warn(`Arresto di ${inst.app}#${inst.entry}: ${err.message}`));
  }

  #line(inst, level, text) {
    inst.logs.push({ at: Date.now(), level, text: String(text).slice(0, 2000) });
    if (inst.logs.length > LOG_LINES) inst.logs.splice(0, inst.logs.length - LOG_LINES);
  }

  #changed(inst) {
    this.emit('change', { owner: inst.owner, app: inst.app, entry: inst.entry });
  }

  // ---------- Moments ----------

  /** system:ready — the kernel is up: the services chosen for everyone. */
  async systemReady() {
    const list = await this.systemStartup();
    if (!list.length) return;
    if (!this.available) return log.warn(`${list.length} servizi all’avvio, ma nessun modulo li fa girare (services-isolate)`);
    const catalog = await this.catalog();
    for (const b of list) {
      const service = catalog.find(s => s.app === b.app && s.entry === b.entry);
      if (!service) continue;
      await this.#start({ service, owner: SYSTEM, principal: null, binding: b }, 'system:ready').catch(err => log.warn(err.message));
    }
  }

  /** user:login — the first request of a user in this run of the kernel: the services they chose. */
  userSeen(principal) {
    if (principal?.kind !== 'user' || this.#seen.has(principal.id)) return;
    this.#seen.set(principal.id, principal);
    this.#userLogin(principal).catch(err => log.warn(`Servizi di ${principal.username}: ${err.message}`));
  }

  async #userLogin(principal) {
    const { enabled, services } = await this.userStartup(principal);
    if (!enabled || !services.length || !this.available) return;
    const [catalog, system] = await Promise.all([this.catalog(), this.systemStartup()]);
    for (const b of services) {
      if (system.some(s => s.app === b.app && s.entry === b.entry)) continue;
      const service = catalog.find(s => s.app === b.app && s.entry === b.entry);
      if (service) await this.#start({ service, owner: principal.id, principal, binding: b }, 'user:login').catch(err => log.warn(err.message));
    }
  }

  /** The user signed out: their services stop (they start again at the next sign-in). */
  async userLeft(userId) {
    this.#seen.delete(userId);
    for (const inst of [...this.#instances.values()]) if (inst.owner === userId) await this.#stop(inst);
  }

  /** A new version of an app, or the app removed: what runs is old code. A removed app leaves the system's start-up list. */
  async #appChanged(id) {
    if (id && !(await this.#kernel.installer.state(id))) {
      const system = await this.systemStartup();
      if (system.some(b => b.app === id)) await this.#saveSystemStartup(system.filter(b => b.app !== id));
    }
    const running = [...this.#instances.values()].filter(i => i.app === id && i.status !== 'off');
    if (!running.length) return;
    const catalog = await this.catalog();
    for (const inst of running) {
      const was = inst.status;
      await this.#stop(inst);
      const service = catalog.find(s => s.app === inst.app && s.entry === inst.entry);
      if (service && was !== 'error') await this.#start({ service, owner: inst.owner, principal: inst.principal, binding: inst.binding }, inst.reason).catch(() => {});
    }
  }

  async stopAll() {
    for (const inst of [...this.#instances.values()]) await this.#stop(inst);
  }
}
