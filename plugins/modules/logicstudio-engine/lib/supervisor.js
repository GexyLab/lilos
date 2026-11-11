import { Worker } from 'node:worker_threads';
import { randomBytes } from 'node:crypto';
import { buildSpec, ProjectError } from './project.js';
import { Consoles } from './consoles.js';
import { globalLimits, quotaOf, runtimeLimits } from './limits.js';

/**
 * Runs the programs: one worker per user with programs, started when the first one starts and
 * ended when the last one stops. A program is a test (from the IDE, at most testMinutes) or an
 * active program (it runs until stopped, also with lilOS closed, and starts again with the kernel),
 * an app's run (lilOS stops it when its windows close) or a run from the command line (kind 'cli':
 * `lilos logic run`; it counts as an active program, is never saved, and stops when the command
 * stops asking how it is, CLI_LEASE_MS).
 *
 * A program may get arguments (args: the command line's, as `lilos logic run` passes them): the
 * blocks read them (b.args). A block can close the program with a value (b.exit(value), the block
 * Exit): it ends as stopped, with `result: { value, at }`, which the command line turns into its
 * exit code.
 *
 * program: { id, owner, user, kind, name, source, documents, args, spec, status, error, started, consoles,
 *            watchers: Set<fn>, ui: Map('window:component.port' → value), result }
 * status: 'starting' | 'running' | 'stopped' | 'failed' | 'waiting' (a package it needs is missing)
 */

const STOP_WAIT_MS = 3000;
const MESSAGES_PER_SECOND = 100;   // from the IDE and the windows, per program
const UI_KEYS = 2000;              // values kept for the windows, per program
const MAX_ACTIVE_DOCUMENTS = 2 << 20;
const MAX_ARGS = 256, MAX_ARG = 4096, MAX_ARGS_TOTAL = 64 * 1024;   // the arguments of a program
const MAX_RESULT = 64 * 1024;      // the value a program closes with, as JSON
const CLI_LEASE_MS = 60_000;       // a run from the command line nobody asks about for this long stops
const own = (obj, key) => !!obj && Object.hasOwn(obj, key);
const OOM = 'ERR_WORKER_OUT_OF_MEMORY';

export class Supervisor {
  #ctx; #registry; #store; #logs; #workerFile;
  #users = new Map();      // userId → { worker, ready: Promise, programs: Set<id>, memoryMb, pending: Map, net: [] }
  #programs = new Map();
  #quotas;                 // jsonStore: { users: { id: overrides } }
  #leaseTimer = null;      // checks the runs from the command line (kind 'cli')

  constructor({ ctx, registry, store, quotas, logs, workerFile }) {
    this.#ctx = ctx;
    this.#workerFile = workerFile;   // worker.js, next to index.js (also once bundled)
    this.#registry = registry;
    this.#store = store;     // active programs, saved: { programs: [{ id, owner, user, name, source, documents, lang }] }
    this.#quotas = quotas;
    this.#logs = logs;
  }

  get limits() { return globalLimits(this.#ctx.config); }
  quota(userId) { return quotaOf(this.#ctx.config, this.#quotas.current?.users?.[userId]); }

  list({ owner = null } = {}) {
    return [...this.#programs.values()].filter(p => !owner || p.owner === owner).map(publicProgram);
  }

  get(id) { return this.#programs.get(id) ?? null; }

  usage(userId) {
    const mine = [...this.#programs.values()].filter(p => p.owner === userId && ['running', 'starting', 'waiting'].includes(p.status));
    return {
      quota: this.quota(userId),
      active: mine.filter(p => p.kind !== 'test').length,
      tests: mine.filter(p => p.kind === 'test').length,
      net: this.#users.get(userId)?.net.filter(t => Date.now() - t < 60_000).length ?? 0,
      log: this.#logs.size(userId),
    };
  }

  /**
   * Starts a program. documents: { project, schemas, windows }; source: { path } (where it was
   * read: the IDE says it, shown in the lists) or null.
   */
  async start(user, { kind, name, documents, source = null, lang = 'en', watch = false, id = null, restart = false, args = [] }) {
    // 'app': an app made from a project, run without installing it: it lasts while its windows are open (lilOS stops it)
    // 'cli': run from the command line (lilos logic run): it lasts while the command asks about it
    if (!['test', 'active', 'app', 'cli'].includes(kind)) this.#ctx.fail('invalid', 'Tipo di programma non valido: test, active, app o cli');
    const argv = this.#cleanArgs(args);
    const limits = this.limits;
    const quota = this.quota(user.id);
    const usage = this.usage(user.id);
    if (!restart) {
      if (kind !== 'test' && usage.active >= quota.maxActive) this.#ctx.fail('quota', `Hai già ${usage.active} programmi attivi: al massimo ${quota.maxActive}`);
      if (kind === 'test' && usage.tests >= quota.maxTests) this.#ctx.fail('quota', `Hai già ${usage.tests} prove in corso: al massimo ${quota.maxTests}`);
      const all = [...this.#programs.values()].filter(p => p.kind !== 'test' && p.status !== 'stopped' && p.status !== 'failed').length;
      if (kind !== 'test' && all >= limits.totalActive) this.#ctx.fail('quota', `lilOS ha già ${all} programmi attivi: al massimo ${limits.totalActive}`);
    }
    let spec;
    try {
      spec = buildSpec(documents, this.#registry, limits);
    } catch (err) {
      if (err instanceof ProjectError) this.#ctx.fail('invalid', err.message, { details: { where: err.where } });
      throw err;
    }
    if (kind === 'active' && JSON.stringify(documents ?? {}).length > MAX_ACTIVE_DOCUMENTS) this.#ctx.fail('too_large', 'Progetto troppo grande per un programma attivo (al massimo 2 MB)');
    if (kind === 'active' && !restart) {
      const kept = [...this.#programs.values()].filter(p => p.kind === 'active' && p.owner === user.id).length;
      if (kept >= quota.maxActive * 3) this.#ctx.fail('quota', 'Troppi programmi attivi, anche fermi: togline qualcuno');
    }
    const program = {
      id: id ?? randomBytes(9).toString('base64url'), owner: user.id, user, kind, name: String(name ?? 'Programma').slice(0, 120),
      source, documents, args: argv, spec, lang, status: 'starting', error: null, started: Date.now(), stopped: null,
      watchers: new Set(), ui: new Map(), endTimer: null, abort: new AbortController(), result: null, lease: Date.now(),
    };
    program.consoles = new Consoles(spec.consoles, {
      perSecond: limits.consoleLinesPerSecond,
      hidden: kind !== 'test' && kind !== 'cli' && spec.consoles.outside === 'hidden',
      log: (line, c) => this.#logLine(program, line, c),
    });
    program.consoles.on((event, data) => this.#tell(program, { t: `console.${event}`, ...data }));
    this.#programs.set(program.id, program);
    if (kind === 'active') await this.#save();
    try {
      const u = await this.#userWorker(user.id);
      u.programs.add(program.id);
      // Packages registered after the worker started (a module that came later): loaded first
      if (u.registryVersion !== this.#registry.version) {
        await u.call({ t: 'load', files: this.#registry.blockFiles() }, 'loaded', 15_000);
        u.registryVersion = this.#registry.version;
      }
      u.worker.postMessage({ t: 'start', id: program.id, spec: { ...spec, args: argv, limits: runtimeLimits(limits, quota) }, lang, watch });
    } catch (err) {
      this.#fail(program, err.message);
      return publicProgram(program);
    }
    if (kind === 'test') program.endTimer = setTimeout(() => this.stop(program.id, 'Fine della prova: è durata il tempo massimo'), limits.testMinutes * 60_000);
    if (kind === 'cli') this.#watchLeases();
    return publicProgram(program);
  }

  /** The arguments of a program: a list of texts (at most MAX_ARGS, MAX_ARG characters each). */
  #cleanArgs(args) {
    if (args === undefined || args === null) return [];
    if (!Array.isArray(args)) this.#ctx.fail('invalid', 'Gli argomenti devono essere una lista di testi');
    if (args.length > MAX_ARGS) this.#ctx.fail('invalid', `Troppi argomenti: al massimo ${MAX_ARGS}`);
    const out = args.map(a => (typeof a === 'string' || typeof a === 'number' || typeof a === 'boolean' ? String(a) : this.#ctx.fail('invalid', 'Gli argomenti devono essere testi')));
    if (out.some(a => a.length > MAX_ARG) || out.join('').length > MAX_ARGS_TOTAL) this.#ctx.fail('invalid', 'Argomenti troppo lunghi');
    return out;
  }

  /** A run from the command line asked about (GET /programs/:id): it goes on. */
  touch(id) {
    const p = this.#programs.get(id);
    if (p) p.lease = Date.now();
  }

  /** The runs from the command line whose command is gone (nobody asked for CLI_LEASE_MS) stop. */
  #watchLeases() {
    if (this.#leaseTimer) return;
    this.#leaseTimer = setInterval(() => {
      const runs = [...this.#programs.values()].filter(p => p.kind === 'cli' && (p.status === 'running' || p.status === 'starting'));
      for (const p of runs) if (Date.now() - p.lease > CLI_LEASE_MS) this.stop(p.id, 'La riga di comando che l\'ha avviato non c\'è più').catch(() => {});
      if (!runs.length) { clearInterval(this.#leaseTimer); this.#leaseTimer = null; }
    }, 10_000);
    this.#leaseTimer.unref?.();
  }

  async stop(id, reason = null) {
    const program = this.#programs.get(id);
    if (!program) return false;
    clearTimeout(program.endTimer);
    const u = this.#users.get(program.owner);
    if (u && program.status !== 'failed' && program.status !== 'stopped') {
      await u.call({ t: 'stop', id, reason }, `stopped:${id}`, STOP_WAIT_MS).catch(() => {});
    }
    this.#ended(program, 'stopped', reason);
    if (program.kind === 'active') await this.#save();
    return true;
  }

  /** Forgets a stopped program (and an active one's saved copy). */
  async remove(id) {
    const program = this.#programs.get(id);
    if (!program) return false;
    if (program.status === 'running' || program.status === 'starting') await this.stop(id);
    this.#programs.delete(id);
    if (program.kind === 'active') await this.#save();
    return true;
  }

  /** A value from the IDE's test panel (an input of a block). */
  input(id, { schema, block, port, value }) {
    const p = this.#running(id);
    this.#throttle(p);
    const b = own(p.spec.schemas, schema) ? p.spec.schemas[schema].blocks.find(x => x.id === block) : null;
    if (!b) this.#ctx.fail('not_found', 'Blocco sconosciuto');
    const def = this.#registry.blockDef(b.type);
    const ports = def?.role === 'component' ? null : new Set([...(def?.inputs ?? []).map(x => x.name), ...b.added.inputs.map(x => x.id), ...(def?.role === 'schemaIn' ? ['value'] : [])]);
    if (ports && !ports.has(port)) this.#ctx.fail('invalid', 'Porta sconosciuta');
    this.#users.get(p.owner)?.worker.postMessage({ t: 'input', id, schema, block, port, value: clone(value) });
  }

  /** At most MESSAGES_PER_SECOND messages a second to a program (a page gone wild, or someone else's script). */
  #throttle(p) {
    const second = Math.floor(Date.now() / 1000);
    if (p.second !== second) { p.second = second; p.messages = 0; }
    if (++p.messages > MESSAGES_PER_SECOND) this.#ctx.fail('rate_limited', 'Troppi messaggi al programma');
  }

  /** The user acted on a component of an open window. */
  component(id, { window, component, port, value }) {
    const p = this.#running(id);
    this.#throttle(p);
    const comp = own(p.spec.windows, window) && own(p.spec.windows[window].components, component) ? p.spec.windows[window].components[component] : null;
    if (!comp) this.#ctx.fail('not_found', 'Componente sconosciuta');
    // Only what the component sends (its outputs, its added outputs)
    const def = this.#registry.componentDef(comp.type);
    const outs = new Set([...(def?.outputs ?? []).map(x => x.name), ...comp.added.outputs.map(x => x.id)]);
    if (!outs.has(port)) this.#ctx.fail('invalid', 'Porta sconosciuta');
    if (p.spec.options.syncCopies) this.#remember(p, window, component, port, value);
    this.#users.get(p.owner)?.worker.postMessage({ t: 'component', id, window, component, port, value: clone(value) });
  }

  /** The last values the windows got (decision 8: an option of the project). */
  uiState(id) {
    const p = this.#programs.get(id);
    if (!p || !p.spec.options.keepValues) return {};
    return Object.fromEntries(p.ui);
  }

  async snapshot(id) {
    const p = this.#running(id);
    const u = this.#users.get(p.owner);
    return u ? u.call({ t: 'snapshot', id }, `snapshot:${id}`, 3000) : {};
  }

  watch(id, fn) {
    const p = this.#programs.get(id);
    if (!p) return () => {};
    p.watchers.add(fn);
    if (p.watchers.size === 1) this.#users.get(p.owner)?.worker.postMessage({ t: 'watch', id, on: true });
    return () => {
      p.watchers.delete(fn);
      if (!p.watchers.size) this.#users.get(p.owner)?.worker.postMessage({ t: 'watch', id, on: false });
    };
  }

  /** Counts a network request of a user: false when over their quota for this minute. */
  countNet(userId) {
    const u = this.#users.get(userId);
    if (!u) return true;
    const now = Date.now();
    u.net = u.net.filter(t => now - t < 60_000);
    if (u.net.length >= this.quota(userId).netPerMinute) return false;
    u.net.push(now);
    return true;
  }

  /** The active programs saved, started again (at the kernel's start, a package that arrived…). */
  async restore() {
    const saved = (await this.#store.read()).programs ?? [];
    for (const s of saved) {
      const existing = this.#programs.get(s.id);
      // Stopped by its user (or by an error): listed, not started again
      if (s.stopped) {
        if (!existing) this.#programs.set(s.id, { ...s, owner: s.user.id, kind: 'active', status: 'stopped', error: null, started: null, stopped: null, watchers: new Set(), ui: new Map(), consoles: null, spec: null });
        continue;
      }
      if (existing && existing.status !== 'waiting' && existing.status !== 'failed') continue;
      if (existing) this.#programs.delete(s.id);
      try {
        await this.start(s.user, { ...s, kind: 'active', restart: true });
      } catch (err) {
        // A package it needs is not there (yet): it waits for it
        this.#programs.set(s.id, { ...s, owner: s.user.id, kind: 'active', status: 'waiting', error: err.message ?? String(err), started: null, watchers: new Set(), ui: new Map(), consoles: null, spec: null });
      }
    }
  }

  /** The kernel stops: the workers end, the active programs stay saved (they start again with it). */
  async shutdown() {
    const users = [...this.#users.values()];
    this.#users.clear();
    for (const p of this.#programs.values()) { clearTimeout(p.endTimer); p.consoles?.close(); }
    await Promise.all(users.map(u => u.worker.terminate().catch(() => {})));
  }

  // ---- internals

  #running(id) {
    const p = this.#programs.get(id);
    if (!p || (p.status !== 'running' && p.status !== 'starting')) this.#ctx.fail('not_found', 'Il programma non è in esecuzione');
    return p;
  }

  #tell(program, msg) {
    for (const fn of program.watchers) { try { fn(msg); } catch { /* a watcher gone */ } }
  }

  #remember(program, window, component, port, value) {
    if (!program.spec.options.keepValues && !program.spec.options.syncCopies) return;
    const key = `${window}:${component}.${port}`;
    if (!program.ui.has(key) && program.ui.size >= UI_KEYS) return;
    program.ui.set(key, value);
  }

  #logLine(program, line, c) {
    const mode = program.spec?.consoles.copyToLog ?? 'warnings';
    if (program.kind === 'test' || mode === 'none') return;
    if (mode === 'warnings' && line.level !== 'warning' && line.level !== 'error') return;
    this.#logs.append(program.owner, { program: program.id, name: program.name, console: c.name, ...line }, this.quota(program.owner).logMb);
  }

  async #save() {
    const programs = [...this.#programs.values()].filter(p => p.kind === 'active')
      .map(p => ({ id: p.id, user: p.user, name: p.name, source: p.source, documents: p.documents, lang: p.lang, args: p.args ?? [], stopped: p.status === 'stopped' || p.status === 'failed' }));
    await this.#store.change(data => { data.programs = programs; });
  }

  #fail(program, message) {
    this.#ended(program, 'failed', message);
  }

  #ended(program, status, reason) {
    if (program.status === 'stopped' || program.status === 'failed') return;
    program.status = status;
    program.error = status === 'failed' ? reason : null;
    program.stopped = Date.now();
    clearTimeout(program.endTimer);
    program.abort?.abort();   // the actions still running for it (a long web request) stop too
    program.consoles?.close();
    this.#tell(program, { t: 'status', status, error: program.error, reason });
    const u = this.#users.get(program.owner);
    if (u) {
      u.programs.delete(program.id);
      if (!u.programs.size) this.#endWorker(program.owner);
    }
    if (program.kind === 'active' && status === 'failed') this.#ctx.emit(program.owner, 'logicstudio.failed', { id: program.id, name: program.name, error: reason });
    if (program.kind === 'active') this.#save().catch(() => {});
    // A test or an app's run is forgotten after a while: whoever ran it has read how it ended
    if (program.kind !== 'active') setTimeout(() => { if (this.#programs.get(program.id) === program) this.#programs.delete(program.id); }, 60_000).unref?.();
  }

  #endWorker(userId) {
    const u = this.#users.get(userId);
    if (!u) return;
    this.#users.delete(userId);
    u.worker.terminate().catch(() => {});
  }

  async #userWorker(userId) {
    const have = this.#users.get(userId);
    if (have) { await have.ready; return have; }
    const quota = this.quota(userId);
    const used = [...this.#users.values()].reduce((s, u) => s + u.memoryMb, 0);
    if (used + quota.memoryMb > this.limits.totalMemoryMb) this.#ctx.fail('quota', `Logic Studio usa già ${used} MB: al massimo ${this.limits.totalMemoryMb} MB per tutti`);
    const worker = new Worker(this.#workerFile, {
      workerData: { user: userId },
      resourceLimits: { maxOldGenerationSizeMb: quota.memoryMb, maxYoungGenerationSizeMb: Math.max(4, Math.round(quota.memoryMb / 8)), stackSizeMb: 4 },
      env: {}, stdout: false, stderr: false,
    });
    const waiters = new Map();   // key → [resolve]
    const u = {
      worker, memoryMb: quota.memoryMb, programs: new Set(), net: [],
      ready: null,
      call: (msg, key, ms) => new Promise((resolve, reject) => {
        const timer = setTimeout(() => { waiters.delete(key); reject(new Error('Il motore non risponde')); }, ms);
        waiters.set(key, v => { clearTimeout(timer); resolve(v); });
        worker.postMessage(msg);
      }),
    };
    const wake = (key, value) => { const fn = waiters.get(key); if (fn) { waiters.delete(key); fn(value); } };
    const files = () => this.#registry.blockFiles();
    u.ready = new Promise((resolve, reject) => {
      worker.once('error', reject);
      const boot = msg => {
        if (msg.t === 'ready') worker.postMessage({ t: 'load', files: files() });
        if (msg.t === 'loaded') { worker.off('message', boot); resolve(); }
      };
      worker.on('message', boot);
    });
    worker.on('message', msg => this.#message(u, userId, msg, wake));
    u.registryVersion = this.#registry.version;
    worker.on('error', err => this.#crashed(userId, u, err));
    worker.on('exit', code => { if (this.#users.get(userId) === u && code !== 0) this.#crashed(userId, u, new Error(`uscito con codice ${code}`)); });
    this.#users.set(userId, u);
    await u.ready;
    return u;
  }

  #crashed(userId, u, err) {
    if (this.#users.get(userId) !== u) return;
    this.#users.delete(userId);
    const message = err?.code === OOM ? 'Memoria finita: i programmi hanno usato più della tua quota di memoria' : `Il motore si è fermato: ${err?.message ?? err}`;
    this.#ctx.log.warn(`Logic Studio, utente ${userId}: ${message}`);
    for (const id of u.programs) { const p = this.#programs.get(id); if (p) this.#fail(p, message); }
    u.worker.terminate().catch(() => {});
  }

  async #message(u, userId, msg, wake) {
    const found = msg.id ? this.#programs.get(msg.id) : null;
    const program = found && found.owner === userId ? found : null;
    switch (msg.t) {
      case 'started':
        if (program && program.status === 'starting') { program.status = 'running'; this.#tell(program, { t: 'status', status: 'running' }); }
        break;
      case 'failed':
        if (program) this.#fail(program, msg.message);
        if (program) u.worker.postMessage({ t: 'stop', id: msg.id });
        break;
      case 'loaded':
        wake('loaded', true);
        break;
      case 'stopped':
        wake(`stopped:${msg.id}`, true);
        break;
      case 'snapshot':
        wake(`snapshot:${msg.id}`, msg.values);
        break;
      case 'values':
        if (program) this.#tell(program, { t: 'values', values: msg.values });
        break;
      case 'states':
        if (program) this.#tell(program, { t: 'states', states: msg.states });
        break;
      case 'ui':
        if (!program) break;
        this.#remember(program, msg.window, msg.component, msg.port, msg.value);
        this.#tell(program, { t: 'ui', window: msg.window, component: msg.component, port: msg.port, value: msg.value });
        break;
      case 'console': {
        if (!program?.consoles) { if (msg.rid) u.worker.postMessage({ t: 'reply', rid: msg.rid, ok: true, value: { cancelled: true } }); break; }
        const { op, data } = msg;
        if (op === 'write') program.consoles.write(data.console, data.text, data.level);
        else if (op === 'clear') program.consoles.clear(data.console);
        else if (op === 'read') {
          const asked = (program.asked ??= new Map());
          if (program.kind !== 'test' && program.kind !== 'cli' && program.watchers.size === 0 && program.spec.consoles.outside !== 'hidden' && Date.now() - (asked.get(data.console) ?? 0) > 30_000) {
            asked.set(data.console, Date.now());
            this.#ctx.emit(program.owner, 'logicstudio.ask', { id: program.id, name: program.name, console: data.console });
          }
          const answer = await program.consoles.read(data.console, data);
          u.worker.postMessage({ t: 'reply', rid: msg.rid, ok: true, value: answer });
        }
        break;
      }
      case 'call': {
        let reply;
        try {
          reply = { ok: true, value: await this.#action(program, msg.action, msg.args) };
        } catch (err) {
          reply = { ok: false, error: String(err?.text ?? err?.message ?? err) };
        }
        u.worker.postMessage({ t: 'reply', rid: msg.rid, ...reply });
        break;
      }
      case 'log':
        this.#ctx.log[msg.level === 'error' ? 'error' : 'warn'](`Logic Studio (${userId}): ${msg.text}`);
        break;
      case 'finished': {
        // A block closed the program (Exit): it ends with that value; the first one counts
        if (!program || program.result || (program.status !== 'running' && program.status !== 'starting')) break;
        let value = msg.value === undefined ? null : msg.value;
        let json = JSON.stringify(value) ?? 'null';
        if (json.length > MAX_RESULT) { value = json.slice(0, MAX_RESULT); json = JSON.stringify(value); }
        program.result = { value, at: Date.now() };
        this.#tell(program, { t: 'finished', value });
        this.stop(program.id, `Chiuso dal programma con il valore ${json.length > 80 ? `${json.slice(0, 79)}…` : json}`).catch(() => {});
        break;
      }
      default:
        break;
    }
  }

  /** An action of a package, made here as the program's user (broker). */
  async #action(program, key, args) {
    if (!program || (program.status !== 'running' && program.status !== 'starting')) throw new Error('Il programma non è in esecuzione');
    const fn = this.#registry.action(String(key));
    if (!fn) throw new Error(`Azione sconosciuta: ${key}`);
    const tools = {
      program: { id: program.id, name: program.name, kind: program.kind },
      signal: program.abort?.signal ?? null,
      countNet: () => { if (!this.countNet(program.owner)) throw new Error('Troppe richieste di rete: hai finito la quota di questo minuto'); },
      emit: (event, data) => this.#ctx.emit(program.owner, event, data),
    };
    return clone(await fn({ kind: 'user', ...program.user }, clone(args), tools));
  }
}

const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

export function publicProgram(p) {
  return {
    id: p.id, owner: p.owner, user: p.user ? { id: p.user.id, username: p.user.username, name: p.user.name } : null,
    kind: p.kind, name: p.name, source: p.source ?? null, status: p.status, error: p.error ?? null,
    started: p.started ?? null, stopped: p.stopped ?? null, args: p.args ?? [], result: p.result ?? null,
    consoles: p.spec?.consoles ?? null, windows: p.spec ? Object.keys(p.spec.windows) : [], options: p.spec?.options ?? null,
  };
}
