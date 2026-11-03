import { randomBytes } from 'node:crypto';
import { fail } from '../errors.js';
import { logger } from '../log.js';
import { serverOf } from '../net/knownHosts.js';
import { connectTo } from '../net/connect.js';
import { CallsOAuth } from './oauth.js';
import { Scripts } from './scripts.js';
import { CallSessions } from './sessions.js';
import { findCallDrivers } from './drivers.js';
import { secretFiller } from './request.js';
import { runRequest, runCollection, flatten, varsOf, MAX_RESULTS } from './runner.js';
import { resolveDeep } from './vars.js';
import { homeNode, frontNode, readHomeFile } from './home.js';

/**
 * NetTest's requests, made by the kernel for the signed-in user (the app NetTest, the scheduler's
 * «Collezione» operations, the Terminal's `nettest` command): no CORS, the network of the kernel,
 * where the guard lets it go (net/guard.js). See api/calls.js for the routes and runner.js for what
 * a collection is.
 *
 * Secret variables: the page sends them sealed (seal(): AES-GCM with this lilOS's key, tied to the
 * user); they are opened only here, put in the request at the very end and written •••• in what
 * comes back. A sealed value of another user or another lilOS is not opened: its `{{name}}` stays.
 *
 * The certificates a user confirmed (trust()) are the Rete folder's and the Terminal's store
 * (net/knownHosts.js, kind 'tls'): confirmed here, they count there too, and the other way round.
 */
const log = logger('nettest');
const SEALED = 'nettest-var';
const MAX_RUNS = 5;               // runs of a user going at once
const RUN_KEPT = 10 * 60_000;     // a finished run's results stay this long
const WAIT = 25_000;
const MAX_SENDS = 8;              // requests of a user going at once (each may hold 50 MB and 10 minutes)
const str = v => (typeof v === 'string' ? v : '');
const plain = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const strings = v => Object.fromEntries(Object.entries(plain(v)).filter(([k, x]) => typeof k === 'string' && k.length <= 200 && (typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean')).map(([k, x]) => [k, String(x)]));

export class Calls {
  #kernel;
  #runs = new Map();
  #sending = new Map();     // user id → requests going

  constructor(kernel) {
    this.#kernel = kernel;
    this.guard = kernel.network.guard;
    this.knownHosts = kernel.network.knownHosts;
    this.secrets = kernel.settingSecrets;
    this.connectTo = connectTo;
    this.drivers = findCallDrivers(kernel.services, log);
    this.oauth = new CallsOAuth(this);
    this.scripts = new Scripts(kernel);
    this.sessions = new CallSessions(this);
    const extra = [...this.drivers.keys()].filter(id => !['ws', 'sse', 'tcp', 'tls', 'udp'].includes(id));
    if (extra.length) log.info(`Protocolli di NetTest dai moduli: ${extra.join(', ')}`);
  }

  emit(owner, event, data = {}) {
    this.#kernel.events.emit('user', { owner, event, data });
  }

  /** The fingerprint the user confirmed for the server of `url` (a URL), or null. */
  pinned(principal, url) {
    return this.knownHosts.get(principal.id, 'tls', serverOf({ url: url.href }));
  }

  /** { protocols, scripts, sessions } for the page. */
  info(principal) {
    return {
      protocols: [...this.drivers].map(([id, d]) => ({ id, label: d.label ?? id, live: typeof d.open === 'function', invoke: typeof d.invoke === 'function', describe: typeof d.describe === 'function' })),
      scripts: this.scripts.available,
      sessions: this.sessions.list(principal),
      multiUser: !!this.#kernel.multiUser,
    };
  }

  /** A secret value for a .nettest file: only this user, on this lilOS, opens it again. */
  async seal(principal, value) {
    if (typeof value !== 'string' || value.length > 64 << 10) fail('invalid', 'Valore segreto non valido');
    return { sealed: await this.secrets.seal({ kind: SEALED, user: principal.id, value }) };
  }

  /** The user confirmed the certificate of a server: { host, port, fingerprint }. */
  async trust(principal, { host, port, fingerprint }) {
    if (typeof fingerprint !== 'string' || !/^[0-9A-F:]{32,200}$/i.test(fingerprint)) fail('invalid', 'Impronta non valida');
    const server = serverOf({ host: str(host), port: Number(port) || 443 });
    if (!server) fail('invalid', 'Server non valido');
    await this.knownHosts.set(principal.id, 'tls', server, fingerprint);
  }

  /** { name: sealed } → { values: { name: value }, unopened: [name] } */
  async #open(principal, sealed) {
    const values = {}, unopened = [];
    for (const [name, s] of Object.entries(plain(sealed)).slice(0, 500)) {
      let data = null;
      try { data = await this.secrets.open(s); } catch { /* another lilOS, or damaged */ }
      if (data?.kind === SEALED && data.user === principal.id && typeof data.value === 'string') values[name] = data.value;
      else unopened.push(name);
    }
    return { values, unopened };
  }

  /** The variables of a request or a run, and the secrets opened. */
  async #scopes(principal, body) {
    const env = plain(body.environment);
    const { values: secrets, unopened } = await this.#open(principal, env.secrets);
    const scopes = {
      local: {}, data: strings(body.data), environment: strings(env.values), collection: strings(plain(body.collection).values), globals: strings(plain(body.globals).values),
      secret: new Set(Object.keys(plain(env.secrets))),
    };
    for (const n of scopes.secret) delete scopes.environment[n];
    return { scopes, secrets, unopened };
  }

  #context(principal, secrets, signal) {
    const { fill, mask } = secretFiller(secrets);
    const renewed = {};
    const ctx = {
      kernel: this.#kernel, calls: this, principal, signal, secrets, drivers: this.drivers, renewed: (old, fresh) => { renewed[old] = fresh; },
      fill: v => (typeof v === 'string' ? fill(v) : Array.isArray(v) ? v.map(ctx.fill) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ctx.fill(x)])) : v),
      mask,
      driverContext: values => ({ lookup: this.guard.lookup, check: v => this.guard.check(v), signal, connectTo, tls: (host, port) => this.#tls(principal, values.settings ?? {}, host, port), output: () => {}, closed: () => {} }),
    };
    return { ctx, renewed };
  }

  async #tls(principal, settings, host, port) {
    const out = { verify: settings.verify !== false, pinned: await this.knownHosts.get(principal.id, 'tls', serverOf({ host, port })) };
    const ctx = { kernel: this.#kernel, principal };
    for (const k of ['ca', 'cert', 'key']) if (str(settings[k])) out[k] = (await readHomeFile(ctx, settings[k])).data;
    return out;
  }

  /** What changed in the variables, for the page to keep. */
  static #after(scopes, renewed, unopened) {
    return {
      vars: { environment: scopes.environment, collection: scopes.collection, globals: scopes.globals },
      secret: [...scopes.secret], renewed, ...(unopened.length && { unopened }),
    };
  }

  /**
   * One request (Invia): { request: item, chain: [{ auth?, scripts? }] (the collection, then its folders),
   * environment: { values, secrets }, collection: { values }, globals: { values } } → result + the variables after.
   */
  async send(principal, body, { signal } = {}) {
    const n = this.#sending.get(principal.id) ?? 0;
    if (n >= MAX_SENDS) fail('rate_limited', `Al massimo ${MAX_SENDS} richieste alla volta`);
    this.#sending.set(principal.id, n + 1);
    try {
      return await this.#send(principal, body, { signal });
    } finally {
      const left = (this.#sending.get(principal.id) ?? 1) - 1;
      if (left > 0) this.#sending.set(principal.id, left); else this.#sending.delete(principal.id);
    }
  }

  async #send(principal, body, { signal }) {
    const item = plain(body.request);
    const chain = (Array.isArray(body.chain) ? body.chain : []).slice(0, 20).map(plain);
    const { scopes, secrets, unopened } = await this.#scopes(principal, body);
    const { ctx, renewed } = this.#context(principal, secrets, signal);
    const result = await runRequest(ctx, { item, chain }, scopes);
    if (unopened.length) result.logs.unshift({ level: 'warn', text: `Valori segreti non aperti (salvati da un altro utente o su un altro lilOS): ${unopened.join(', ')}`, phase: 'pre' });
    return { result, ...Calls.#after(scopes, renewed, unopened) };
  }

  /**
   * A run of a collection, going on in the kernel: { collection, only?, environment, globals, data?,
   * iterations?, delayMs?, stopOnError? } → { id }. Its results: progress(id, after).
   */
  async run(principal, body) {
    const mine = [...this.#runs.values()].filter(r => r.owner === principal.id && !r.done);
    if (mine.length >= MAX_RUNS) fail('rate_limited', `Al massimo ${MAX_RUNS} esecuzioni alla volta`);
    const collection = plain(body.collection);
    if (!Array.isArray(collection.items)) fail('invalid', 'Collezione non valida');
    const { scopes, secrets, unopened } = await this.#scopes(principal, { ...body, collection: { values: { ...varsOf(collection.variables), ...strings(plain(body.collection).values) } } });
    const abort = new AbortController();
    const { ctx, renewed } = this.#context(principal, secrets, abort.signal);
    const run = { id: randomBytes(8).toString('hex'), owner: principal.id, results: [], count: 0, done: false, summary: null, abort, waiters: new Set(), total: 0, started: Date.now() };
    const wake = () => { for (const w of run.waiters) w(); run.waiters.clear(); };
    this.#runs.set(run.id, run);
    this.#prune();
    run.total = flatten(collection, body.only).length * (Array.isArray(body.data) && body.data.length ? body.data.length : Math.max(1, Number(body.iterations) || 1));
    runCollection(ctx, collection, scopes, {
      only: Array.isArray(body.only) ? body.only : null, data: Array.isArray(body.data) ? body.data.slice(0, 10_000).map(strings) : null,
      iterations: body.iterations, delayMs: Number(body.delayMs) || 0, stopOnError: body.stopOnError === true,
      onResult: r => { run.count++; if (run.results.length < MAX_RESULTS) run.results.push(r); wake(); },
    }).then(summary => {
      run.summary = { passed: summary.passed, failed: summary.failed, skipped: summary.skipped, ms: summary.ms, cancelled: summary.cancelled, ...Calls.#after(scopes, renewed, unopened) };
    }, err => {
      run.summary = { passed: 0, failed: 1, skipped: 0, ms: 0, cancelled: false, error: err.message, ...Calls.#after(scopes, renewed, unopened) };
    }).finally(() => {
      run.done = true;
      run.ended = Date.now();
      wake();
      this.emit(principal.id, 'calls.runs', { id: run.id });
    });
    return { id: run.id, total: run.total };
  }

  #prune() {
    const now = Date.now();
    for (const [id, r] of this.#runs) if (r.done && now - r.ended > RUN_KEPT) this.#runs.delete(id);
  }

  #run(principal, id) {
    const r = this.#runs.get(id);
    if (!r || r.owner !== principal.id) fail('not_found', 'Esecuzione inesistente');
    return r;
  }

  /** The results from the `after`-th on: { results, done, summary, total }; with wait, answers when there is something new (25 s at most). */
  async progress(principal, id, { after = 0, wait = false } = {}) {
    const r = this.#run(principal, id);
    if (wait && !r.done && r.results.length <= after) {
      await new Promise(done => {
        const timer = setTimeout(go, WAIT);
        function go() { clearTimeout(timer); r.waiters.delete(go); done(); }
        r.waiters.add(go);
      });
    }
    return { results: r.results.slice(after), next: r.results.length, done: r.done, summary: r.summary, total: r.total };
  }

  cancelRun(principal, id) {
    this.#run(principal, id).abort.abort();
  }

  /**
   * A .nettest file of the home ('~/…', or { id } as lilOS's page knows it), run with nobody watching (Pianificazione, the Terminal): the
   * environment by name or id, its secret values as the file keeps them (sealed by this user).
   * → { name, results, passed, failed, skipped, ms, cancelled }
   */
  async runFile(principal, source, { environment = null, only = null, signal, onResult, data = null, iterations = 1 } = {}) {
    const { view, node } = typeof source === 'string' ? await homeNode({ kernel: this.#kernel, principal }, source) : await frontNode(this.#kernel, principal, source.id);
    if (node.type !== 'file') fail('invalid', 'Serve un file .nettest');
    let collection;
    try {
      collection = JSON.parse((await view.fs.read(principal, node.id)).toString('utf8'));
    } catch {
      fail('invalid', 'Il file non è una collezione di NetTest');
    }
    if (collection?.format !== 'nettest' || !Array.isArray(collection.items)) fail('invalid', 'Il file non è una collezione di NetTest');
    const envs = Array.isArray(collection.environments) ? collection.environments : [];
    const env = environment ? envs.find(e => e.id === environment || String(e.name).toLowerCase() === String(environment).toLowerCase()) : null;
    if (environment && !env) fail('not_found', `Ambiente inesistente: ${environment}`);
    const rows = Array.isArray(env?.variables) ? env.variables.filter(v => v && v.enabled !== false && typeof v.key === 'string') : [];
    const body = {
      environment: { values: varsOf(rows), secrets: Object.fromEntries(rows.filter(v => v.secret && typeof v.sealed === 'string').map(v => [v.key, v.sealed])) },
      collection: { values: varsOf(collection.variables) }, globals: { values: {} },
    };
    const { scopes, secrets } = await this.#scopes(principal, body);
    const { ctx } = this.#context(principal, secrets, signal);
    const summary = await runCollection(ctx, collection, scopes, { only, onResult, data, iterations });
    return { name: str(collection.name) || 'Collezione', ...summary };
  }

  /** The values a live session or a module's call gets: the request's fields, variables and secrets in. */
  async #liveValues(principal, body) {
    const item = plain(body.request);
    const { scopes, secrets } = await this.#scopes(principal, body);
    const { ctx } = this.#context(principal, secrets);
    const raw = resolveDeep({ ...plain(item.values), url: str(item.url), headers: Array.isArray(item.headers) ? item.headers : [], settings: plain(item.settings) }, scopes);
    return { item, values: ctx.fill(raw), mask: ctx.mask, ctx, scopes };
  }

  /** A live session (WebSocket, SSE, TCP, TLS, UDP, MQTT, gRPC streams): { request, environment, collection, globals } → session. */
  async openSession(principal, body) {
    const { item, values, mask } = await this.#liveValues(principal, body);
    const protocol = str(item.protocol);
    const driver = this.drivers.get(protocol);
    if (typeof driver?.open !== 'function') fail('unavailable', `Protocollo non disponibile: ${protocol} (manca il suo modulo del kernel)`);
    const address = mask(values.url || (values.host ? `${values.host}:${values.port ?? ''}` : protocol));
    return this.sessions.open(principal, {
      protocol, driver, values, mask, name: str(item.name).slice(0, 80) || address, address, request: str(item.id) || null,
      tls: (host, port) => this.#tls(principal, values.settings ?? {}, host, port),
    });
  }

  /** What a server offers (gRPC reflection): { request, environment… } → the module's description. */
  async describe(principal, body) {
    const { item, values, ctx } = await this.#liveValues(principal, body);
    const driver = this.drivers.get(str(item.protocol));
    if (typeof driver?.describe !== 'function') fail('unavailable', 'Questo protocollo non descrive il server');
    return driver.describe(values, ctx.driverContext(values));
  }

  async stop() {
    for (const r of this.#runs.values()) r.abort.abort();
    await this.sessions.stop();
    await this.scripts.stop();
  }
}

