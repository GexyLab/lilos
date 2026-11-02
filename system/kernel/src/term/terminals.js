import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { DATA_DIR } from '../config.js';
import { fail } from '../errors.js';
import { logger } from '../log.js';
import { Secrets } from '../net/secrets.js';
import { checkFields, fieldShown, netFail } from '../net/drivers.js';
import { findDrivers, termProtocolInfo, isSecure } from './drivers.js';
import { History, Charset, ENCODINGS } from './screen.js';

const log = logger('terminali');
const MAX_HOSTS = 200;
const MAX_SESSIONS = 10;              // open at once, per user
const DETACHED_FOR = 10 * 60_000;     // a session nobody looks at closes after this
const HIGH_WATER = 1 << 20;           // bytes waiting for the page: stop reading from the server
const ID = /^[a-f0-9]{16}$/;
const TERM = /^[A-Za-z0-9._+-]{1,40}$/;
const FOLDER_MAX = 60;

/**
 * Remote terminals (the Terminale remoto app): each user's saved hosts and their open sessions.
 * Hosts are saved in DATA_DIR/term/<user>.json (passwords encrypted, see net/secrets.js) with the
 * server keys the user confirmed (`known`, by protocol, host and port). The protocols are kernel
 * modules (drivers.js).
 *
 * A session lives in the kernel: the page attaches to it with a WebSocket (api/term.js) and gets
 * the screen again when it comes back (History). Without a page it closes after 10 minutes; a
 * session that ended goes as soon as no page shows it.
 *
 *   saved host:   { id, name, folder, protocol, values, secret: sealed | null, settings, created, used }
 *   settings:     { term, encoding, backspace: 'del' | 'bs' }
 *   host as the page sees it: { id, name, folder, protocol, address, values, settings, remembered, secure, used }
 *   session:      { id, host, name, protocol, address, secure, state, reason, title, created, attached, closesAt }
 *     state  'new' (no page attached yet) | 'connecting' | 'on' | 'closed'
 *
 * Messages on the socket. Binary: the bytes of the screen (to the page) and of the keys (from it).
 * Text, JSON, from the kernel: { t: 'state', session } · { t: 'trust', trust } a server key to
 * confirm · { t: 'taken' } another page took the session. From the page: { t: 'resize', cols, rows } ·
 * { t: 'trust', ok } · { t: 'signal', name }.
 * Events for the user's pages (kernel.events 'user'): 'term.sessions' {} a session started, changed
 * state or went; 'term.hosts' {} the saved hosts changed.
 */
export class Terminals {
  #kernel;
  #users = new Map();       // user id → { saved: Map, known: Map, queue, ready }
  #sessions = new Map();    // session id → Session

  constructor(kernel) {
    this.#kernel = kernel;
    this.dir = join(DATA_DIR, 'term');
    this.secrets = new Secrets(this.dir);
    this.drivers = findDrivers(kernel.services, log);
    this.guard = kernel.network.guard;
    if (this.drivers.size) log.info(`Protocolli di terminale: ${[...this.drivers.keys()].join(', ')}`);
  }

  // ---------- Saved hosts ----------

  #file(userId) {
    return join(this.dir, `${userKey(userId)}.json`);
  }

  async #user(principal) {
    if (principal?.kind !== 'user') fail('unauthorized', 'Accesso richiesto');
    let user = this.#users.get(principal.id);
    if (user) return user.ready;
    user = { saved: new Map(), known: new Map(), queue: Promise.resolve() };
    user.ready = (async () => {
      try {
        const data = JSON.parse(await readFile(this.#file(principal.id), 'utf8'));
        for (const r of Array.isArray(data?.hosts) ? data.hosts : []) if (ID.test(r?.id ?? '') && typeof r.name === 'string') user.saved.set(r.id, r);
        for (const [k, v] of Object.entries(data?.known ?? {})) if (typeof v === 'string') user.known.set(k, v);
      } catch (err) {
        if (err.code !== 'ENOENT') log.error(`Host dei terminali di ${principal.id} non letti`, err);
      }
      return user;
    })();
    this.#users.set(principal.id, user);
    return user.ready;
  }

  async #save(userId, user) {
    const run = user.queue.then(async () => {
      await mkdir(this.dir, { recursive: true });
      const file = this.#file(userId);
      const data = { hosts: [...user.saved.values()], known: Object.fromEntries(user.known) };
      await writeFile(`${file}.tmp`, JSON.stringify(data, null, 2), { mode: 0o600 });
      await rename(`${file}.tmp`, file);
    });
    user.queue = run.catch(() => {});
    return run;
  }

  /** With users that sign in: the files of users that do not exist any more go. */
  async prune() {
    if (!this.#kernel.multiUser) return;
    const users = await this.#kernel.services.get('users')?.list?.().catch(() => null);
    if (!Array.isArray(users)) return;
    const keep = new Set(users.map(u => userKey(u.id)));
    for (const name of await readdir(this.dir).catch(() => [])) {
      const m = /^([a-f0-9]{32})\.json$/.exec(name);
      if (m && !keep.has(m[1])) await rm(join(this.dir, name), { force: true });
    }
  }

  #driver(protocol) {
    return this.drivers.get(protocol) ?? fail('unavailable', `Protocollo non disponibile: ${protocol} (manca il suo modulo del kernel)`);
  }

  #emit(userId, event) {
    this.#kernel.events.emit('user', { owner: userId, event, data: {} });
  }

  #hostView(r) {
    const driver = this.drivers.get(r.protocol);
    let address = r.protocol;
    try { if (driver) address = driver.address(r.values); } catch { /* the protocol's name, then */ }
    return {
      id: r.id, name: r.name, folder: r.folder ?? '', protocol: r.protocol, address, values: r.values,
      settings: r.settings, remembered: !!r.secret, secure: driver ? isSecure(driver, r.values) : false,
      available: !!driver, used: r.used ?? null,
    };
  }

  #checkName(user, name, exceptId = null) {
    const clean = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim() : '';
    if (!clean || clean.length > 60 || /[\0-\x1f]/.test(clean)) fail('invalid', 'Nome dell’host non valido');
    if ([...user.saved.values()].some(r => r.id !== exceptId && r.name.toLowerCase() === clean.toLowerCase())) fail('conflict', `C’è già un host «${clean}»`);
    return clean;
  }

  /** The values of a connection: the required ones there (the secret ones may be asked in the terminal), then checked by its protocol and by where the kernel may connect. */
  async #accept(driver, values) {
    const missing = driver.fields.filter(f => f.required && !f.secret && fieldShown(f, values) && (values[f.key] === undefined || values[f.key] === ''));
    if (missing.length) fail('invalid', `Mancano: ${missing.map(f => f.key).join(', ')}`);
    try { driver.check?.(values); } catch (err) { netFail(err); }
    await this.guard.check(values);
  }

  /** { protocols, hosts, sessions } for the page. */
  async list(principal) {
    const user = await this.#user(principal);
    return {
      protocols: [...this.drivers].map(([id, d]) => termProtocolInfo(id, d)).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
      encodings: ENCODINGS,
      hosts: [...user.saved.values()].map(r => this.#hostView(r)),
      sessions: this.#mine(principal).map(s => s.view()),
    };
  }

  /** A new host: { name, folder, protocol, values, settings, remember } and the secret fields apart. */
  async create(principal, body, rawSecret) {
    const user = await this.#user(principal);
    if (user.saved.size >= MAX_HOSTS) fail('invalid', `Al massimo ${MAX_HOSTS} host`);
    const driver = this.#driver(body?.protocol);
    const { values, secret } = checkFields(driver, body.values, rawSecret);
    await this.#accept(driver, values);
    const r = {
      id: newId(), name: this.#checkName(user, body.name), folder: cleanFolder(body.folder), protocol: body.protocol,
      values, secret: null, settings: cleanSettings(body.settings), created: Date.now(), used: null,
    };
    if (Object.keys(secret).length && body.remember !== false) r.secret = await this.secrets.seal(secret);
    user.saved.set(r.id, r);
    await this.#save(principal.id, user);
    this.#emit(principal.id, 'term.hosts');
    return this.#hostView(r);
  }

  /** Changes a host. Secret fields left empty keep their value; `forget: true` drops them all. */
  async update(principal, id, body, rawSecret) {
    const user = await this.#user(principal);
    const r = this.#saved(user, id);
    const driver = this.#driver(r.protocol);
    if (body.name !== undefined) r.name = this.#checkName(user, body.name, id);
    if (body.folder !== undefined) r.folder = cleanFolder(body.folder);
    if (body.settings !== undefined) r.settings = cleanSettings(body.settings);
    if (body.values !== undefined) {
      const { values, secret } = checkFields(driver, body.values, rawSecret);
      await this.#accept(driver, values);
      // The password goes only where it was given for: another server or account, it is typed again
      if (BOUND.some(k => values[k] !== r.values[k]) && !Object.keys(secret).length) r.secret = null;
      r.values = values;
      if (Object.keys(secret).length) {
        const old = r.secret ? await this.#openSecret(r) : {};
        r.secret = await this.secrets.seal({ ...old, ...secret });
      }
    }
    if (body.forget === true || body.remember === false) r.secret = null;
    await this.#save(principal.id, user);
    this.#emit(principal.id, 'term.hosts');
    return this.#hostView(r);
  }

  async remove(principal, id) {
    const user = await this.#user(principal);
    this.#saved(user, id);
    user.saved.delete(id);
    await this.#save(principal.id, user);
    this.#emit(principal.id, 'term.hosts');
  }

  #saved(user, id) {
    return (typeof id === 'string' && user.saved.get(id)) || fail('not_found', 'Host inesistente');
  }

  async #openSecret(r) {
    try {
      return await this.secrets.open(r.secret);
    } catch {
      return {};   // made with another key (secret.key lost): the user types it again
    }
  }

  /** The password of a saved host for the same server and account (BOUND), or {}: the one used last. */
  async #savedSecret(user, driver, protocol, values) {
    const want = boundOf(driver, values);
    const r = [...user.saved.values()]
      .filter(x => x.protocol === protocol && x.secret && boundOf(driver, x.values) === want)
      .sort((a, b) => (b.used ?? 0) - (a.used ?? 0))[0];
    return r ? this.#openSecret(r) : {};
  }

  /**
   * A password to keep in a .term file (Terminale): the secret fields of a saved host ({ host }) or
   * the given ones ({ protocol, values, secret }), encrypted with this lilOS's key and tied to this
   * user and to the server and account (BOUND). Only this user, on this lilOS, opens it again.
   */
  async seal(principal, body) {
    const user = await this.#user(principal);
    let protocol, values, secret;
    if (typeof body?.host === 'string') {
      const r = this.#saved(user, body.host);
      ({ protocol, values } = r);
      secret = r.secret ? await this.#openSecret(r) : {};
    } else {
      protocol = body?.protocol;
      ({ values, secret } = checkFields(this.#driver(protocol), body?.values, body?.secret && typeof body.secret === 'object' ? body.secret : {}));
    }
    if (!Object.keys(secret).length) fail('invalid', 'Nessuna password da salvare');
    const driver = this.#driver(protocol);
    return { sealed: await this.secrets.seal({ kind: SEALED, user: principal.id, protocol, bound: boundOf(driver, values), secret }) };
  }

  /** The secret fields of a sealed password (seal), if it is this user's and for this server and account. */
  async #unseal(principal, driver, protocol, values, sealed) {
    let data = null;
    try { data = await this.secrets.open(sealed); } catch { /* another lilOS, or damaged */ }
    if (data?.kind !== SEALED || data.user !== principal.id || data.protocol !== protocol || data.bound !== boundOf(driver, values)
      || !data.secret || typeof data.secret !== 'object') {
      fail('forbidden', 'La password salvata nel collegamento vale solo per chi l’ha salvata, su questo lilOS, per lo stesso server e utente');
    }
    return data.secret;
  }

  // ---------- Sessions ----------

  #mine(principal) {
    return [...this.#sessions.values()].filter(s => s.owner === principal.id);
  }

  #session(principal, id) {
    const s = typeof id === 'string' && this.#sessions.get(id);
    if (!s || s.owner !== principal?.id) fail('not_found', 'Sessione inesistente');
    return s;
  }

  sessions(principal) {
    if (principal?.kind !== 'user') fail('unauthorized', 'Accesso richiesto');
    return this.#mine(principal).map(s => s.view());
  }

  /**
   * A new session, not connected yet (it connects when a page attaches):
   *   { host: id, cwd? }                              a saved host
   *   { protocol, values, secret?, sealed?, settings?, name?, cwd? }
   *                                                   a quick connection (nothing saved): without secret
   *                                                   nor sealed (seal()), the password of a saved host
   *                                                   for the same server and account, if there is one
   *   { mount: id, path? }                            SSH to the server of an SFTP connection of the
   *                                                   Rete folder, in that folder (same credentials and key)
   * cwd: a folder of the server to start in (an absolute path; protocols that cannot, ignore it).
   */
  async open(principal, body) {
    const user = await this.#user(principal);
    if (this.#mine(principal).filter(s => s.state !== 'closed').length >= MAX_SESSIONS) {
      fail('rate_limited', `Al massimo ${MAX_SESSIONS} sessioni aperte`);
    }
    let spec;
    if (typeof body?.host === 'string') {
      const r = this.#saved(user, body.host);
      spec = {
        host: r.id, name: r.name, protocol: r.protocol, values: r.values,
        secret: r.secret ? await this.#openSecret(r) : {}, settings: r.settings ?? cleanSettings(), cwd: cleanCwd(body.cwd),
      };
      r.used = Date.now();
      this.#save(principal.id, user).catch(err => log.error('Host dei terminali non salvati', err));
    } else if (typeof body?.mount === 'string') {
      const { values, secret, trust, name, protocol } = await this.#kernel.network.credentials(principal, body.mount);
      if (protocol !== 'sftp') fail('invalid', 'Il terminale si apre solo sulle connessioni SFTP');
      const driver = this.#driver('ssh');
      const ssh = checkFields(driver, { host: values.host, port: values.port, user: values.user, auth: values.auth }, secret);
      if (trust) {
        const key = knownKey('ssh', ssh.values.host, ssh.values.port);
        if (!user.known.has(key)) { user.known.set(key, trust); await this.#save(principal.id, user); }
      }
      // path is inside the connection, whose root is a folder of the server (values.path)
      const inside = cleanCwd(typeof body.path === 'string' && body.path ? body.path : '/') ?? '/';
      spec = { host: null, name, protocol: 'ssh', values: ssh.values, secret: ssh.secret, settings: cleanSettings(), cwd: cleanCwd(posix.join(values.path || '/', inside)) };
    } else {
      const driver = this.#driver(body?.protocol);
      const { values, secret } = checkFields(driver, body.values, body.secret && typeof body.secret === 'object' ? body.secret : {});
      const given = Object.keys(secret).length > 0;
      const kept = typeof body.sealed === 'string' ? await this.#unseal(principal, driver, body.protocol, values, body.sealed)
        : given ? {} : await this.#savedSecret(user, driver, body.protocol, values);
      spec = {
        host: null, name: cleanName(body.name), protocol: body.protocol, values, secret: { ...kept, ...secret },
        settings: cleanSettings(body.settings), cwd: cleanCwd(body.cwd),
      };
    }
    const driver = this.#driver(spec.protocol);
    await this.#accept(driver, spec.values);
    let address = spec.protocol;
    try { address = driver.address(spec.values); } catch { /* the protocol's name, then */ }
    // A quick connection is named by its address without the scheme ('ann@host:2222')
    const s = new Session(this, principal.id, { ...spec, name: spec.name || address.replace(/^[a-z]+:\/\//, ''), address, secure: isSecure(driver, spec.values), driver });
    this.#sessions.set(s.id, s);
    s.armDetached();
    this.#emit(principal.id, 'term.sessions');
    return s.view();
  }

  /** Closes a session (if still open) and forgets it. */
  async close(principal, id) {
    const s = this.#session(principal, id);
    await s.end('');
    this.forgetSession(s);
  }

  /** A page attaches with its WebSocket (api/term.js). */
  attach(principal, id, ws, size) {
    this.#session(principal, id).attach(ws, size);
  }

  /**
   * A command on a saved SSH host with nobody at the keyboard (the scheduler's «Comando del
   * Terminale»): no terminal, no questions. The host's password or key must be saved, and its
   * server key confirmed before (connecting once from the Terminal). → { output, code }
   * (output: what it wrote, stdout and stderr together, the last `maxOutput` characters).
   */
  async exec(principal, hostId, command, { signal, maxOutput = 64 << 10 } = {}) {
    const user = await this.#user(principal);
    const r = this.#saved(user, hostId);
    if (r.protocol !== 'ssh') fail('invalid', 'I comandi pianificati vanno solo su host SSH');
    const driver = this.#driver('ssh');
    const values = { ...r.values, command };
    await this.#accept(driver, values);
    const secret = r.secret ? await this.#openSecret(r) : {};
    const nobody = () => Promise.reject(Object.assign(new Error('Nessuno risponde: la password o la chiave vanno salvate nell’host'), { net: 'auth' }));
    let session;
    try {
      session = await driver.open(values, {
        secret, cols: 200, rows: 50, term: 'dumb', cwd: null, signal, print: () => {}, ask: nobody,
        confirm: async trust => (await this.knownTrust(principal.id, 'ssh', r.values)) === String(trust?.fingerprint ?? ''),
      });
    } catch (err) {
      if (err?.net === 'untrusted') fail('untrusted', `La chiave del server di «${r.name}» non è confermata: collegati una volta dal Terminale`);
      // 'cancelled': the server asked again (a password that is wrong or not saved) and nobody is there to answer
      if (err?.net === 'auth' || (err?.net === 'cancelled' && !signal?.aborted)) fail('forbidden', `Accesso negato da «${r.name}»: salva la password o la chiave nell’host`);
      netFail(err, r.name);
    }
    return new Promise(resolve => {
      let output = '';
      session.onData(chunk => { output = (output + chunk.toString('utf8')).slice(-maxOutput); });
      session.onClose(({ reason }) => {
        const m = /codice (\d+)/.exec(reason ?? '');
        resolve({ output, code: m ? Number(m[1]) : reason ? 255 : 0, reason: reason ?? '' });
      });
      signal?.addEventListener('abort', () => session.close(), { once: true });
    });
  }

  /** Was the server key shown already confirmed? (by protocol, host and port) */
  async knownTrust(userId, protocol, values) {
    const user = this.#users.get(userId);
    return user ? (await user.ready).known.get(knownKey(protocol, values.host, values.port)) ?? null : null;
  }

  async rememberTrust(userId, protocol, values, fingerprint) {
    const user = await this.#users.get(userId)?.ready;
    if (!user) return;
    user.known.set(knownKey(protocol, values.host, values.port), fingerprint);
    await this.#save(userId, user);
  }

  forgetSession(s) {
    if (this.#sessions.get(s.id) !== s) return;
    this.#sessions.delete(s.id);
    this.#emit(s.owner, 'term.sessions');
  }

  changed(s) {
    this.#emit(s.owner, 'term.sessions');
  }

  async stop() {
    await Promise.all([...this.#sessions.values()].map(s => s.end('Il kernel si sta fermando').catch(() => {})));
    this.#sessions.clear();
  }
}

/** One open terminal: its connection, what its screen showed, the page that shows it. */
class Session {
  #terms;
  #spec;
  #driver;
  #conn = null;               // the driver's session, once connected
  #socket = null;
  #history = new History();
  #charset;
  #timer = null;
  #abort = new AbortController();
  #asking = null;             // { prompt, echo, text, resolve, reject }: a line asked in the terminal
  #trusting = null;           // { trust, resolve }: a server key waiting for the page
  #paused = false;
  #size = { cols: 80, rows: 24 };

  constructor(terms, owner, spec) {
    this.#terms = terms;
    this.#spec = spec;
    this.#driver = spec.driver;
    this.#charset = new Charset(spec.settings.encoding);
    this.id = newId();
    this.owner = owner;
    this.state = 'new';
    this.reason = '';
    this.created = Date.now();
    this.closesAt = null;
  }

  view() {
    const s = this.#spec;
    return {
      id: this.id, host: s.host, name: s.name, protocol: s.protocol, address: s.address, secure: s.secure,
      state: this.state, reason: this.reason, title: this.#history.modes.title, created: this.created,
      attached: !!this.#socket, closesAt: this.closesAt, info: this.#conn?.info ?? null,
      signals: Array.isArray(this.#conn?.signals) ? this.#conn.signals : [],
    };
  }

  #setState(state, reason = this.reason) {
    this.state = state;
    this.reason = reason;
    this.#control({ t: 'state', session: this.view() });
    this.#terms.changed(this);
  }

  #control(msg) {
    this.#socket?.send(JSON.stringify(msg));
  }

  /** Without a page: closes after DETACHED_FOR (at once if it is over). */
  armDetached() {
    clearTimeout(this.#timer);
    if (this.state === 'closed') return this.#terms.forgetSession(this);
    this.closesAt = Date.now() + DETACHED_FOR;
    this.#timer = setTimeout(() => {
      this.end('Chiusa dopo 10 minuti senza finestra').catch(() => {});
      this.#terms.forgetSession(this);
    }, DETACHED_FOR);
    this.#timer.unref?.();
  }

  attach(ws, size) {
    const old = this.#socket;
    if (old) {
      old.send(JSON.stringify({ t: 'taken' }));
      old.close(4000, 'taken');
    }
    clearTimeout(this.#timer);
    this.closesAt = null;
    this.#socket = ws;
    this.#resize(size);
    ws.send(this.#history.replay());
    ws.send(JSON.stringify({ t: 'state', session: this.view() }));
    if (this.#trusting) ws.send(JSON.stringify({ t: 'trust', trust: this.#trusting.trust }));
    ws.on('message', (data, binary) => (binary ? this.#input(data) : this.#command(data)));
    ws.on('drain', () => this.#drained());
    ws.on('close', () => {
      if (this.#socket !== ws) return;
      this.#socket = null;
      this.#drained();
      this.armDetached();
      this.#terms.changed(this);
    });
    this.#terms.changed(this);
    if (this.state === 'new') this.#connect();
  }

  #resize(size) {
    const cols = clamp(size?.cols, 2, 1000, this.#size.cols), rows = clamp(size?.rows, 1, 500, this.#size.rows);
    if (cols === this.#size.cols && rows === this.#size.rows) return;
    this.#size = { cols, rows };
    try { this.#conn?.resize(cols, rows); } catch { /* gone */ }
  }

  #command(data) {
    let msg;
    try { msg = JSON.parse(data.toString('utf8')); } catch { return; }
    if (msg?.t === 'resize') this.#resize(msg);
    else if (msg?.t === 'trust' && this.#trusting) {
      const { resolve } = this.#trusting;
      this.#trusting = null;
      resolve(msg.ok === true);
    } else if (msg?.t === 'signal' && typeof msg.name === 'string' && this.#conn?.signals?.includes(msg.name)) {
      try { this.#conn.signal(msg.name); } catch { /* gone */ }
    }
  }

  /** What went to the screen: kept, and sent to the page if there is one. */
  #output(data) {
    if (!data.length) return;
    this.#history.add(data);
    if (!this.#socket) return;
    this.#socket.send(data);
    if (!this.#paused && this.#socket.buffered > HIGH_WATER && this.#conn?.pause) {
      this.#paused = true;
      this.#conn.pause();
    }
  }

  #drained() {
    if (!this.#paused) return;
    this.#paused = false;
    try { this.#conn?.resume?.(); } catch { /* gone */ }
  }

  #print(text) {
    this.#output(Buffer.from(`${String(text).replace(/\r?\n/g, '\r\n')}\r\n`, 'utf8'));
  }

  /** What the user typed: to a line asked by the kernel, or to the server. */
  #input(data) {
    if (this.#asking) return this.#typed(data.toString('utf8'));
    if (this.state !== 'on' || !this.#conn) return;
    let bytes = this.#charset.encode(data);
    if (this.#spec.settings.backspace === 'bs') bytes = Buffer.from(bytes.map(b => (b === 0x7f ? 0x08 : b)));
    try { this.#conn.write(bytes); } catch { /* the close says why */ }
  }

  /** A line typed for #ask (a password the server wants): Enter gives it, Ctrl+C gives up. */
  #typed(text) {
    const a = this.#asking;
    for (const ch of text) {
      if (ch === '\r' || ch === '\n') {
        this.#asking = null;
        this.#output(Buffer.from('\r\n'));
        return a.resolve(a.text);
      }
      if (ch === '\x03' || ch === '\x04') {
        this.#asking = null;
        this.#output(Buffer.from('^C\r\n'));
        return a.reject(Object.assign(new Error('Annullato'), { net: 'cancelled' }));
      }
      if (ch === '\x7f' || ch === '\b') {
        if (!a.text) continue;
        const last = [...a.text].pop();
        a.text = a.text.slice(0, -last.length);
        if (a.echo) this.#output(Buffer.from('\b \b'));
        continue;
      }
      if (ch === '\x15') {   // Ctrl+U: the whole line
        if (a.echo) this.#output(Buffer.from('\b \b'.repeat([...a.text].length)));
        a.text = '';
        continue;
      }
      if (ch < ' ' || a.text.length >= 1024) continue;
      a.text += ch;
      if (a.echo) this.#output(Buffer.from(ch, 'utf8'));
    }
  }

  #ask(prompt, { echo = false } = {}) {
    if (this.#asking) return Promise.reject(new Error('Una domanda alla volta'));
    if (this.#abort.signal.aborted) return Promise.reject(new Error('Sessione chiusa'));
    this.#output(Buffer.from(String(prompt).replace(/\r?\n/g, '\r\n'), 'utf8'));
    return new Promise((resolve, reject) => { this.#asking = { echo, text: '', resolve, reject }; });
  }

  /** A server key: true if it is the one confirmed before, or the user confirms it now (on the page). */
  async #confirm(trust) {
    const fingerprint = String(trust?.fingerprint ?? '');
    if (!fingerprint) return false;
    const s = this.#spec;
    const known = await this.#terms.knownTrust(this.owner, s.protocol, s.values);
    if (known === fingerprint) return true;
    const shown = {
      kind: trust.kind === 'tls' ? 'tls' : 'ssh', fingerprint: fingerprint.slice(0, 200),
      text: String(trust.text ?? '').replace(/[^\x20-\x7e]/g, '').slice(0, 200), host: String(s.values.host ?? ''),
      ...(known && { changed: true, previous: known }),
    };
    const ok = await new Promise(resolve => {
      this.#trusting = { trust: shown, resolve };
      this.#control({ t: 'trust', trust: shown });
      this.#abort.signal.addEventListener('abort', () => resolve(false), { once: true });
    });
    this.#trusting = null;
    if (ok) await this.#terms.rememberTrust(this.owner, s.protocol, s.values, shown.fingerprint);
    return ok;
  }

  async #connect() {
    const s = this.#spec;
    this.#setState('connecting', '');
    try {
      await this.#terms.guard.check(s.values);
      const conn = await this.#driver.open(s.values, {
        secret: s.secret, cols: this.#size.cols, rows: this.#size.rows, term: s.settings.term, cwd: s.cwd ?? null,
        ask: (prompt, opts) => this.#ask(prompt, opts),
        confirm: trust => this.#confirm(trust),
        print: text => this.#print(text),
        signal: this.#abort.signal,
      });
      if (this.#abort.signal.aborted) { try { conn.close(); } catch { /* gone */ } return; }
      this.#conn = conn;
      s.secret = null;   // not needed any more: it does not stay in memory with the session
      conn.onData(data => this.#output(this.#charset.decode(data)));
      conn.onClose(info => this.#ended(info?.reason ?? ''));
      this.#setState('on', '');
    } catch (err) {
      if (this.state === 'closed') return;
      const reason = err?.net === 'cancelled' ? 'Connessione annullata' : messageOf(err);
      this.#print(`\x1b[31m${reason}\x1b[0m`);
      this.#ended(reason);
    }
  }

  #ended(reason) {
    if (this.state === 'closed') return;
    this.#conn = null;
    this.#asking?.reject(new Error('Sessione chiusa'));
    this.#asking = null;
    this.#setState('closed', reason);
    if (!this.#socket) this.#terms.forgetSession(this);
  }

  /** Closes the connection (and stops one being made). */
  async end(reason) {
    this.#abort.abort();
    clearTimeout(this.#timer);
    const conn = this.#conn;
    this.#ended(reason);
    if (conn) await Promise.resolve().then(() => conn.close()).catch(() => {});
    this.#socket?.close(1000, 'closed');
  }
}

/** A driver's error as a line for the user. */
function messageOf(err) {
  try {
    netFail(err);
  } catch (e) {
    return String(e?.message ?? e).slice(0, 300);
  }
  return 'Connessione non riuscita';
}

function cleanSettings(raw = {}) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    term: typeof s.term === 'string' && TERM.test(s.term) ? s.term : 'xterm-256color',
    encoding: ENCODINGS.includes(s.encoding) ? s.encoding : 'utf-8',
    backspace: s.backspace === 'bs' ? 'bs' : 'del',
  };
}

function cleanFolder(folder) {
  if (folder === undefined || folder === null || folder === '') return '';
  const clean = typeof folder === 'string' ? folder.replace(/\s+/g, ' ').trim() : '';
  if (clean.length > FOLDER_MAX || /[\0-\x1f]/.test(clean)) fail('invalid', 'Nome della cartella non valido');
  return clean;
}

/** A folder on the server to start in: absolute, no control characters. */
function cleanCwd(path) {
  if (path === undefined || path === null || path === '' || path === '/') return null;
  if (typeof path !== 'string' || path.length > 4096 || /[\0-\x1f]/.test(path) || !path.startsWith('/')) fail('invalid', 'Cartella non valida');
  return path;
}

const clamp = (v, min, max, fallback) => (Number.isInteger(v) ? Math.min(max, Math.max(min, v)) : fallback);
const knownKey = (protocol, host, port) => `${protocol}:${String(host ?? '').toLowerCase()}:${port ?? ''}`;
const newId = () => randomBytes(8).toString('hex');
const userKey = userId => createHash('sha256').update(String(userId)).digest('hex').slice(0, 32);

/** What a remembered password is tied to: change one of these, and it must be typed again. */
const BOUND = ['host', 'port', 'user', 'auth', 'tls'];
/** The BOUND values of a connection as one string (the usual port when none, the server in lower case). */
const boundOf = (driver, values) => JSON.stringify(BOUND.map(k => {
  const v = k === 'port' ? values.port ?? driver.port : values[k];
  return k === 'host' ? String(v ?? '').toLowerCase() : v ?? null;
}));
/** What a sealed password of a .term file says it is (seal()). */
const SEALED = 'term-file';

/** The name a quick connection asks for (a .term file's), or '' for its address. */
function cleanName(name) {
  const clean = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim() : '';
  return clean && clean.length <= 60 && !/[\0-\x1f]/.test(clean) ? clean : '';
}
