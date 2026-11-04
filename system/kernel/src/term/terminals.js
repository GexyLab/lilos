import { randomBytes } from 'node:crypto';
import { readdir, rm } from 'node:fs/promises';
import { constants } from 'node:os';
import { join, posix } from 'node:path';
import { DATA_DIR } from '../config.js';
import { fail } from '../errors.js';
import { logger } from '../log.js';
import { readJson, userFile, writeJson } from '../jsonFile.js';
import { PATHS } from '../modules.js';
import { Secrets } from '../net/secrets.js';
import { serverOf } from '../net/knownHosts.js';
import { checkFields, fieldShown, netFail } from '../net/drivers.js';
import { findDrivers, termProtocolInfo, isSecure } from './drivers.js';
import { History, Charset, ENCODINGS } from './screen.js';
import { Text, defineStrings, localize, localizedJson } from '../strings.js';

const log = logger('terminali');
const MAX_HOSTS = 200;
const MAX_SESSIONS = 10;              // open at once, per user
const DETACHED_FOR = 10 * 60_000;     // a session nobody looks at closes after this
const HIGH_WATER = 1 << 20;           // bytes waiting for the page: stop reading from the server
const ID = /^[a-f0-9]{16}$/;
const TERM = /^[A-Za-z0-9._+-]{1,40}$/;
const FOLDER_MAX = 60;

const { t } = defineStrings('lilos:kernel.term.terminals', { en: { strings: {
  signIn: 'Sign-in required',
  noProtocol: 'Protocol not available: {protocol} (its kernel module is missing)',
  hostName: 'Host name not valid',
  hostTaken: 'There is already a host «{name}»',
  missing: 'Missing: {fields}',
  tooMany: 'At most {max} hosts',
  hostNotFound: 'Host not found',
  noPassword: 'No password to save',
  sealedOther: 'The password saved in the shortcut works only for whoever saved it, on this lilOS, for the same server and user',
  sessionNotFound: 'Session not found',
  sessionsTooMany: 'At most {max} sessions open',
  sftpOnly: 'The terminal opens only on SFTP connections',
  sshOnly: 'Scheduled commands go only to SSH hosts',
  untrusted: 'The key of the server of «{name}» is not confirmed: connect once from the Terminal',
  denied: 'Access denied by «{name}»: save the password or the key in the host',
  stopping: 'The kernel is stopping',
  detached: 'Closed after 10 minutes without a window',
  cancelled: 'Connection cancelled',
  failed: 'Connection failed',
  folder: 'Folder name not valid',
  cwd: 'Folder not valid',
} } });

/**
 * Remote terminals (the Terminale remoto app): each user's saved hosts and their open sessions.
 * Hosts are saved in DATA_DIR/term/<user>.json (passwords encrypted, see net/secrets.js); the
 * server keys the user confirmed are the Rete folder's (net/knownHosts.js: by kind, host and
 * port), so a server confirmed there is known here too. The protocols are kernel modules (drivers.js).
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
  #users = new Map();       // user id → { saved: Map, ready }
  #sessions = new Map();    // session id → Session

  constructor(kernel) {
    this.#kernel = kernel;
    this.dir = join(DATA_DIR, 'term');
    this.secrets = new Secrets(this.dir);
    this.drivers = findDrivers(kernel.services, log);
    this.guard = kernel.network.guard;
    this.knownHosts = kernel.network.knownHosts;
    if (this.drivers.size) log.info(`Protocolli di terminale: ${[...this.drivers.keys()].join(', ')}`);
  }

  // ---------- Saved hosts ----------

  #file(userId) {
    return userFile(this.dir, userId);
  }

  async #user(principal) {
    if (principal?.kind !== 'user') fail('unauthorized', t('signIn'));
    let user = this.#users.get(principal.id);
    if (user) return user.ready;
    user = { saved: new Map() };
    user.ready = (async () => {
      try {
        const data = await readJson(this.#file(principal.id), {});
        for (const r of Array.isArray(data?.hosts) ? data.hosts : []) if (ID.test(r?.id ?? '') && typeof r.name === 'string') user.saved.set(r.id, r);
      } catch (err) {
        log.error(`Host dei terminali di ${principal.id} non letti`, err);
      }
      return user;
    })();
    this.#users.set(principal.id, user);
    return user.ready;
  }

  /** Saves a user's hosts (writes to one file go one at a time: jsonFile.js). */
  #save(userId, user) {
    return writeJson(this.#file(userId), { hosts: [...user.saved.values()] }, { pretty: true });
  }

  /** With users that sign in: the files of users that do not exist any more go. */
  async prune() {
    if (!this.#kernel.multiUser) return;
    const users = await this.#kernel.services.get('users')?.list?.().catch(() => null);
    if (!Array.isArray(users)) return;
    const keep = new Set(users.map(u => userFile('', u.id).slice(0, 32)));
    for (const name of await readdir(this.dir).catch(() => [])) {
      const m = /^([a-f0-9]{32})\.json$/.exec(name);
      if (m && !keep.has(m[1])) await rm(join(this.dir, name), { force: true });
    }
  }

  #driver(protocol) {
    return this.drivers.get(protocol) ?? fail('unavailable', t('noProtocol', { protocol }));
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
    if (!clean || clean.length > 60 || /[\0-\x1f]/.test(clean)) fail('invalid', t('hostName'));
    if ([...user.saved.values()].some(r => r.id !== exceptId && r.name.toLowerCase() === clean.toLowerCase())) fail('conflict', t('hostTaken', { name: clean }));
    return clean;
  }

  /** The values of a connection: the required ones there (the secret ones may be asked in the terminal), then checked by its protocol and by where the kernel may connect. */
  async #accept(driver, values) {
    const missing = driver.fields.filter(f => f.required && !f.secret && fieldShown(f, values) && (values[f.key] === undefined || values[f.key] === ''));
    if (missing.length) fail('invalid', t('missing', { fields: missing.map(f => f.key).join(', ') }));
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
    if (user.saved.size >= MAX_HOSTS) fail('invalid', t('tooMany', { max: MAX_HOSTS }));
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
    return (typeof id === 'string' && user.saved.get(id)) || fail('not_found', t('hostNotFound'));
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
    if (!Object.keys(secret).length) fail('invalid', t('noPassword'));
    const driver = this.#driver(protocol);
    return { sealed: await this.secrets.seal({ kind: SEALED, user: principal.id, protocol, bound: boundOf(driver, values), secret }) };
  }

  /** The secret fields of a sealed password (seal), if it is this user's and for this server and account. */
  async #unseal(principal, driver, protocol, values, sealed) {
    let data = null;
    try { data = await this.secrets.open(sealed); } catch { /* another lilOS, or damaged */ }
    if (data?.kind !== SEALED || data.user !== principal.id || data.protocol !== protocol || data.bound !== boundOf(driver, values)
      || !data.secret || typeof data.secret !== 'object') {
      fail('forbidden', t('sealedOther'));
    }
    return data.secret;
  }

  // ---------- Sessions ----------

  #mine(principal) {
    return [...this.#sessions.values()].filter(s => s.owner === principal.id);
  }

  #session(principal, id) {
    const s = typeof id === 'string' && this.#sessions.get(id);
    if (!s || s.owner !== principal?.id) fail('not_found', t('sessionNotFound'));
    return s;
  }

  sessions(principal) {
    if (principal?.kind !== 'user') fail('unauthorized', t('signIn'));
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
      fail('rate_limited', t('sessionsTooMany', { max: MAX_SESSIONS }));
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
      const { values, secret, name, protocol } = await this.#kernel.network.credentials(principal, body.mount);
      if (protocol !== 'sftp') fail('invalid', t('sftpOnly'));
      const driver = this.#driver('ssh');
      // The server key confirmed for the SFTP connection counts here too: the same store (knownHosts.js)
      const ssh = checkFields(driver, { host: values.host, port: values.port, user: values.user, auth: values.auth }, secret);
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
    const locale = await this.#kernel.userLocale(principal.id).catch(() => 'en');
    const s = new Session(this, principal.id, { ...spec, name: spec.name || address.replace(/^[a-z]+:\/\//, ''), address, secure: isSecure(driver, spec.values), driver, locale });
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

  /** A page attaches with its WebSocket (api/term.js); locale: the page's language (strings.js localeOf), if known. */
  attach(principal, id, ws, size, locale = null) {
    this.#session(principal, id).attach(ws, size, locale);
  }

  /**
   * A command on a saved SSH host with nobody at the keyboard (the scheduler's «Comando del
   * Terminale»): no terminal, no questions. The host's password or key must be saved, and its
   * server key confirmed before (connecting once from the Terminal). → { output, code }
   * (output: what it wrote, stdout and stderr together, the last `maxOutput` characters; code: the
   * exit status, 128 + the signal's number when a signal ended it as a shell says, 255 when the
   * server told nothing). term-ssh 1.0.2 tells code and signal; with an older one a command ended
   * by a signal looked like a success.
   */
  async exec(principal, hostId, command, { signal, maxOutput = 64 << 10 } = {}) {
    const user = await this.#user(principal);
    const r = this.#saved(user, hostId);
    if (r.protocol !== 'ssh') fail('invalid', t('sshOnly'));
    const driver = this.#driver('ssh');
    const values = { ...r.values, command };
    await this.#accept(driver, values);
    const secret = r.secret ? await this.#openSecret(r) : {};
    const nobody = () => Promise.reject(Object.assign(new Error('Nessuno risponde: la password o la chiave vanno salvate nell’host'), { net: 'auth' }));
    let output = '', ended;
    const over = new Promise(resolve => { ended = resolve; });
    const received = chunk => { output = (output + chunk.toString('utf8')).slice(-maxOutput); };
    let session;
    try {
      session = await driver.open(values, {
        secret, cols: 200, rows: 50, term: 'dumb', cwd: null, signal, print: () => {}, ask: nobody,
        confirm: async trust => (await this.knownTrust(principal.id, driver, trust, r.values)) === String(trust?.fingerprint ?? ''),
        lookup: this.guard.lookup, paths: PATHS, output: received, closed: info => ended(info ?? {}),
      });
    } catch (err) {
      if (err?.net === 'untrusted') fail('untrusted', t('untrusted', { name: r.name }));
      // 'cancelled': the server asked again (a password that is wrong or not saved) and nobody is there to answer
      if (err?.net === 'auth' || (err?.net === 'cancelled' && !signal?.aborted)) fail('forbidden', t('denied', { name: r.name }));
      netFail(err, r.name);
    }
    // Drivers before lilOS 1.22.0 hand the output and the end through the session
    session.onData?.(received);
    session.onClose?.(info => ended(info ?? {}));
    signal?.addEventListener('abort', () => session.close(), { once: true });
    const { reason, ...last } = await over;
    let code;
    if (!('code' in last)) code = Number(/codice (\d+)/.exec(reason ?? '')?.[1] ?? (reason ? 255 : 0));
    else if (Number.isInteger(last.code)) code = last.code;
    else if (last.signal) code = 128 + (constants.signals[`SIG${last.signal}`] ?? 0);
    else code = 255;
    return { output, code, signal: last.signal ?? null, reason: reason ?? '' };
  }

  /** The fingerprint the user confirmed for this server, of the kind of the one shown (trust: { kind }), or null. */
  knownTrust(userId, driver, trust, values) {
    return this.knownHosts.get(userId, trust?.kind === 'tls' ? 'tls' : 'ssh', serverOf(values, driver.port));
  }

  /** The user confirmed the server key shown. */
  rememberTrust(userId, driver, trust, values) {
    return this.knownHosts.set(userId, trust?.kind === 'tls' ? 'tls' : 'ssh', serverOf(values, driver.port), trust.fingerprint);
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
    await Promise.all([...this.#sessions.values()].map(s => s.end(t('stopping')).catch(() => {})));
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
  #locale;                    // the language of what the kernel writes (the user's, or the page's)

  constructor(terms, owner, spec) {
    this.#terms = terms;
    this.#spec = spec;
    this.#driver = spec.driver;
    this.#charset = new Charset(spec.settings.encoding);
    this.#locale = spec.locale ?? 'en';
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
    this.#socket?.send(localizedJson(msg, this.#locale));
  }

  /** Without a page: closes after DETACHED_FOR (at once if it is over). */
  armDetached() {
    clearTimeout(this.#timer);
    if (this.state === 'closed') return this.#terms.forgetSession(this);
    this.closesAt = Date.now() + DETACHED_FOR;
    this.#timer = setTimeout(() => {
      this.end(t('detached')).catch(() => {});
      this.#terms.forgetSession(this);
    }, DETACHED_FOR);
    this.#timer.unref?.();
  }

  attach(ws, size, locale = null) {
    if (locale) this.#locale = locale;
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
    ws.send(localizedJson({ t: 'state', session: this.view() }, this.#locale));
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

  /** What the server sent, in the session's encoding. */
  #received(data) {
    this.#output(this.#charset.decode(data));
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
    const line = text instanceof Text ? localize(text, this.#locale) : String(text);
    this.#output(Buffer.from(`${line.replace(/\r?\n/g, '\r\n')}\r\n`, 'utf8'));
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
    const known = await this.#terms.knownTrust(this.owner, this.#driver, trust, s.values);
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
    if (ok) await this.#terms.rememberTrust(this.owner, this.#driver, shown, s.values);
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
        lookup: this.#terms.guard.lookup,
        paths: PATHS,
        output: data => this.#received(data),
        closed: info => this.#ended(info?.reason ?? ''),
      });
      // Closed meanwhile: by the user, or the connection ended (closed) before open() was over
      if (this.#abort.signal.aborted || this.state === 'closed') { try { conn.close(); } catch { /* gone */ } return; }
      this.#conn = conn;
      s.secret = null;   // not needed any more: it does not stay in memory with the session
      // Drivers before lilOS 1.22.0 hand the output and the end through the session
      conn.onData?.(data => this.#received(data));
      conn.onClose?.(info => this.#ended(info?.reason ?? ''));
      this.#setState('on', '');
    } catch (err) {
      if (this.state === 'closed') return;
      const reason = err?.net === 'cancelled' ? t('cancelled') : messageOf(err);
      this.#print(`\x1b[31m${localize(reason, this.#locale)}\x1b[0m`);
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
    return e?.text instanceof Text ? e.text : String(e?.message ?? e).slice(0, 300);
  }
  return t('failed');
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
  if (clean.length > FOLDER_MAX || /[\0-\x1f]/.test(clean)) fail('invalid', t('folder'));
  return clean;
}

/** A folder on the server to start in: absolute, no control characters. */
function cleanCwd(path) {
  if (path === undefined || path === null || path === '' || path === '/') return null;
  if (typeof path !== 'string' || path.length > 4096 || /[\0-\x1f]/.test(path) || !path.startsWith('/')) fail('invalid', t('cwd'));
  return path;
}

const clamp = (v, min, max, fallback) => (Number.isInteger(v) ? Math.min(max, Math.max(min, v)) : fallback);
const newId = () => randomBytes(8).toString('hex');

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
