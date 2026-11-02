import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_DIR } from '../config.js';
import { fail } from '../errors.js';
import { logger } from '../log.js';
import { Secrets } from './secrets.js';
import { NetGuard } from './guard.js';
import { findDrivers, protocolInfo, checkFields, missingFields, signInFields, cleanPath, joinPath, netFail, isConnectionError, isSafeName, isUsableName, cleanEntry } from './drivers.js';
import { SignIns } from './signin.js';
import { uniqueName } from './transfers.js';
import { openHome } from '../api/home.js';
import { Readable } from 'node:stream';

const log = logger('rete');
const MAX_MOUNTS = 50;
const MAX_WATCHED = 8;          // folders watched at once per connection (the last ones listed)
const MAX_LISTED = 50_000;      // entries of one folder
const IMPORT_WAIT = 25_000;     // longest wait of one status request of an import
const IMPORT_POLL = 3_000;      // how often the provider is asked meanwhile
const MAX_IMPORTS = 5;          // imports of a user open at once
const ID = /^[a-f0-9]{16}$/;

/**
 * The network connections of each user (the Rete folder) and their sessions. Every user has their
 * own; they are saved in DATA_DIR/net/<user>.json (passwords and keys encrypted, see secrets.js).
 * A connection opens when it is first used (or at the user's first request, with `auto`) and
 * opens again by itself when it drops; the protocols are kernel modules (drivers.js).
 *
 *   saved:           { id, name, protocol, values, secret: sealed | null, trust: fingerprint | null, auto, created }
 *   as the page sees it: { id, name, protocol, address, values, auto, remembered, trusted, state, error }
 *     state  'off' (not connected) | 'connecting' | 'on' | 'error' (the last attempt failed: `error` says why)
 *
 * A password not remembered stays in memory, for that user, until they disconnect or the kernel stops.
 * Events for the user's pages (kernel.events 'user'): 'net.mount' { id } a connection changed (or
 * went: read the list again), 'net.change' { mount, path } what is in a folder changed on the server.
 */
export class Network {
  #kernel;
  #users = new Map();     // user id → { saved: Map, live: Map, queue: Promise }
  #seen = new Set();      // users whose `auto` connections were opened in this run

  constructor(kernel) {
    this.#kernel = kernel;
    this.dir = join(DATA_DIR, 'net');
    this.secrets = new Secrets(this.dir);
    this.drivers = findDrivers(kernel.services, log);
    this.guard = new NetGuard(kernel);
    this.signins = new SignIns(this.drivers);
    if (this.drivers.size) log.info(`Protocolli di rete: ${[...this.drivers.keys()].join(', ')}`);
  }

  // ---------- Saved connections ----------

  #file(userId) {
    return join(this.dir, `${userKey(userId)}.json`);
  }

  /** The values of a connection, checked by its protocol and by where the kernel may connect. */
  async #accept(driver, values) {
    try { driver.check?.(values); } catch (err) { netFail(err); }
    await this.guard.check(values);
  }

  /** With users that sign in: the connection and transfer files of users that do not exist any more go. */
  async prune() {
    if (!this.#kernel.multiUser) return;
    const users = await this.#kernel.services.get('users')?.list?.().catch(() => null);
    if (!Array.isArray(users)) return;
    const keep = new Set(users.map(u => userKey(u.id)));
    for (const name of await readdir(this.dir).catch(() => [])) {
      const m = /^(?:transfers-)?([a-f0-9]{32})\.json$/.exec(name);
      if (m && !keep.has(m[1])) await rm(join(this.dir, name), { force: true });
    }
  }

  async #user(principal) {
    if (principal?.kind !== 'user') fail('unauthorized', 'Accesso richiesto');
    let user = this.#users.get(principal.id);
    if (user) {
      user.who = this.#who(principal);
      return user.ready;
    }
    user = { saved: new Map(), live: new Map(), queue: Promise.resolve(), imports: new Map(), who: this.#who(principal) };
    user.ready = (async () => {
      try {
        const list = JSON.parse(await readFile(this.#file(principal.id), 'utf8'));
        for (const r of Array.isArray(list) ? list : []) if (ID.test(r?.id ?? '') && typeof r.name === 'string') user.saved.set(r.id, r);
      } catch (err) {
        if (err.code !== 'ENOENT') log.error(`Connessioni di rete di ${principal.id} non lette`, err);
      }
      return user;
    })();
    this.#users.set(principal.id, user);
    return user.ready;
  }

  /** Who connects, as the drivers get it (connect's `user`). */
  #who(principal) {
    return { id: principal.id, username: principal.username ?? null, role: principal.role ?? null, multiUser: !!this.#kernel.multiUser };
  }

  /** Saves a user's connections (one write at a time). */
  async #save(userId, user) {
    const run = user.queue.then(async () => {
      await mkdir(this.dir, { recursive: true });
      const file = this.#file(userId);
      await writeFile(`${file}.tmp`, JSON.stringify([...user.saved.values()], null, 2), { mode: 0o600 });
      await rename(`${file}.tmp`, file);
    });
    user.queue = run.catch(() => {});
    return run;
  }

  #driver(protocol) {
    return this.drivers.get(protocol) ?? fail('unavailable', `Protocollo non disponibile: ${protocol} (manca il suo modulo del kernel)`);
  }

  #view(r, live) {
    const driver = this.drivers.get(r.protocol);
    let address = r.protocol;
    try { if (driver) address = driver.address(r.values); } catch { /* the protocol's name, then */ }
    return {
      id: r.id, name: r.name, protocol: r.protocol, address, values: r.values, auto: !!r.auto,
      remembered: !!r.secret, trusted: !!r.trust,
      state: !driver ? 'error' : live?.state ?? 'off',
      error: !driver ? 'Il modulo di questo protocollo non è attivo' : live?.error ?? null,
    };
  }

  #emit(userId, event, data) {
    this.#kernel.events.emit('user', { owner: userId, event, data });
  }

  #live(user, id) {
    let live = user.live.get(id);
    if (!live) user.live.set(id, live = { state: 'off', error: null, session: null, opening: null, secret: null, watched: new Map() });
    return live;
  }

  #saved(user, id) {
    return (typeof id === 'string' && user.saved.get(id)) || fail('not_found', 'Connessione inesistente');
  }

  #checkName(user, name, exceptId = null) {
    const clean = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim() : '';
    if (!clean || clean.length > 60 || /[/\\\0-\x1f]/.test(clean)) fail('invalid', 'Nome della connessione non valido');
    if ([...user.saved.values()].some(r => r.id !== exceptId && r.name.toLowerCase() === clean.toLowerCase())) fail('conflict', `C’è già una connessione «${clean}»`);
    return clean;
  }

  /** { protocols, mounts } for the page. */
  async list(principal) {
    const user = await this.#user(principal);
    return {
      protocols: [...this.drivers].map(([id, d]) => protocolInfo(id, d)).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
      mounts: [...user.saved.values()].map(r => this.#view(r, user.live.get(r.id))),
    };
  }

  async get(principal, id) {
    const user = await this.#user(principal);
    return this.#view(this.#saved(user, id), user.live.get(id));
  }

  /**
   * What a finished sign-in (body.signin: its id, signin.js) puts in a connection: the account in
   * its 'signin' field, what it gave in the secret. Nothing without one.
   */
  #signedIn(principal, driver, protocol, body, values, secret, { keep = false } = {}) {
    if (typeof body?.signin !== 'string') return null;
    if (!signInFields(driver).length) fail('invalid', 'Questo protocollo non ha un accesso con account');
    const got = this.signins.take(principal, body.signin, protocol, { keep });
    values[got.field] = got.account;
    secret[got.field] = got.secret;
    return got;
  }

  /**
   * A new connection: { name, protocol, values, auto, remember, signin? } and the secret fields apart.
   * Not remembered, the secret stays in memory. Returns it as the page sees it.
   */
  async create(principal, body, rawSecret) {
    const user = await this.#user(principal);
    if (user.saved.size >= MAX_MOUNTS) fail('invalid', `Al massimo ${MAX_MOUNTS} connessioni`);
    const driver = this.#driver(body?.protocol);
    const { values, secret } = checkFields(driver, body.values, rawSecret);
    await this.#accept(driver, values);
    this.#signedIn(principal, driver, body.protocol, body, values, secret);
    const r = {
      id: randomUUID().replaceAll('-', '').slice(0, 16), name: this.#checkName(user, body.name), protocol: body.protocol,
      values, secret: null, trust: typeof body.trust === 'string' ? body.trust.slice(0, 200) : null, auto: body.auto === true, created: Date.now(),
    };
    if (Object.keys(secret).length) {
      if (body.remember === true) r.secret = await this.secrets.seal(secret);
      else this.#live(user, r.id).secret = secret;
    }
    user.saved.set(r.id, r);
    await this.#save(principal.id, user);
    this.#emit(principal.id, 'net.mount', { id: r.id });
    return this.#view(r, user.live.get(r.id));
  }

  /**
   * Changes a connection. Secret fields left empty keep their value; `forget: true` drops the
   * remembered ones. New values close the open session (the next use connects with them).
   */
  async update(principal, id, body, rawSecret) {
    const user = await this.#user(principal);
    const r = this.#saved(user, id);
    const driver = this.#driver(r.protocol);
    const live = this.#live(user, id);
    if (body.name !== undefined) r.name = this.#checkName(user, body.name, id);
    if (body.auto !== undefined) r.auto = body.auto === true;
    let reconnect = false;
    if (body.values !== undefined || typeof body.signin === 'string') {
      const { values, secret } = checkFields(driver, body.values ?? r.values, rawSecret);
      await this.#accept(driver, values);
      // The account stays the one signed in to, unless a new sign-in comes with the change
      for (const f of signInFields(driver)) if (r.values[f.key] !== undefined) values[f.key] = r.values[f.key];
      this.#signedIn(principal, driver, r.protocol, body, values, secret);
      // Another server: what was confirmed of the old one does not count
      if (['host', 'port', 'url'].some(k => values[k] !== r.values[k])) r.trust = null;
      // The password goes only where it was given for: another server or account, it is typed again
      if (BOUND.some(k => values[k] !== r.values[k]) && !Object.keys(secret).length) {
        r.secret = null;
        live.secret = null;
      }
      reconnect = JSON.stringify(values) !== JSON.stringify(r.values);
      r.values = values;
      if (Object.keys(secret).length) {
        const old = r.secret ? await this.#openSecret(r) : live.secret ?? {};
        const merged = { ...old, ...secret };
        reconnect = true;
        if (body.remember === false) { r.secret = null; live.secret = merged; }
        else if (body.remember === true || r.secret) { r.secret = await this.secrets.seal(merged); live.secret = null; }
        else live.secret = merged;
      }
    }
    if (body.remember === false && r.secret) {
      live.secret = await this.#openSecret(r);
      r.secret = null;
    } else if (body.remember === true && !r.secret && live.secret) {
      r.secret = await this.secrets.seal(live.secret);
      live.secret = null;
    }
    if (body.forget === true) { r.secret = null; live.secret = null; reconnect = true; }
    await this.#save(principal.id, user);
    if (reconnect) await this.#close(live);
    this.#emit(principal.id, 'net.mount', { id });
    return this.#view(r, live);
  }

  async remove(principal, id) {
    const user = await this.#user(principal);
    this.#saved(user, id);
    const live = user.live.get(id);
    if (live) await this.#close(live);
    user.live.delete(id);
    user.saved.delete(id);
    await this.#save(principal.id, user);
    this.#emit(principal.id, 'net.mount', { id });
  }

  async #openSecret(r) {
    try {
      return await this.secrets.open(r.secret);
    } catch {
      return {};   // made with another key (secret.key lost): the user types it again
    }
  }

  // ---------- Sessions ----------

  /**
   * Connects now: with `secret` (the secret fields, remembered if `remember`) and `trust` (the
   * fingerprint the user confirmed), or with `signin` (a finished sign-in to the same account: the
   * connection signs in again). Returns the connection as the page sees it.
   */
  async connect(principal, id, { secret: rawSecret = null, remember, trust, signin } = {}) {
    const user = await this.#user(principal);
    const r = this.#saved(user, id);
    const live = this.#live(user, id);
    let changed = false;
    if (typeof trust === 'string' && trust && trust.length <= 200) { r.trust = trust; changed = true; }
    if ((rawSecret && typeof rawSecret === 'object') || typeof signin === 'string') {
      const driver = this.#driver(r.protocol);
      const { secret } = checkFields(driver, r.values, rawSecret ?? {});
      const values = { ...r.values };
      const got = this.#signedIn(principal, driver, r.protocol, { signin }, values, secret);
      if (got && r.values[got.field] && r.values[got.field].toLowerCase() !== got.account.toLowerCase()) {
        fail('conflict', `Hai fatto l’accesso come ${got.account}, ma «${r.name}» è di ${r.values[got.field]}`);
      }
      if (got) {
        // Signed in again: the other secret fields stay, and it is remembered as it was unless said
        Object.assign(secret, { ...(r.secret ? await this.#openSecret(r) : live.secret ?? {}), ...secret });
        remember ??= !!r.secret;
        if (!r.values[got.field]) { r.values = values; changed = true; }
      }
      if (Object.keys(secret).length) {
        await this.#close(live);
        if (remember === true) { r.secret = await this.secrets.seal(secret); live.secret = null; changed = true; }
        else { live.secret = secret; if (r.secret && remember === false) { r.secret = null; changed = true; } }
      }
    }
    if (changed) await this.#save(principal.id, user);
    await this.#open(principal.id, user, r, live);
    return this.#view(r, live);
  }

  /** Closes the session and forgets a password not remembered. */
  async disconnect(principal, id) {
    const user = await this.#user(principal);
    const r = this.#saved(user, id);
    const live = this.#live(user, id);
    await this.#close(live);
    live.secret = null;
    live.state = 'off';
    live.error = null;
    this.#emit(principal.id, 'net.mount', { id });
    return this.#view(r, live);
  }

  async #close(live) {
    const session = live.session;
    live.session = null;
    for (const stop of live.watched.values()) { try { stop(); } catch { /* gone already */ } }
    live.watched.clear();
    if (session) await Promise.resolve().then(() => session.close()).catch(() => {});
  }

  /** The open session of a connection, connecting when needed. */
  async #open(userId, user, r, live) {
    if (live.session) return live.session;
    if (live.opening) return live.opening;
    const driver = this.#driver(r.protocol);
    live.opening = (async () => {
      await this.guard.check(r.values);
      const secret = r.secret ? await this.#openSecret(r) : live.secret ?? {};
      const missing = missingFields(driver, r.values, secret);
      if (missing.length) {
        live.state = live.state === 'on' ? 'on' : 'off';
        if (signInFields(driver).some(f => missing.includes(f.key))) {
          fail('secret_required', `Serve un nuovo accesso per «${r.name}»`, { details: { reason: 'signin', fields: missing } });
        }
        fail('secret_required', `Serve la password di «${r.name}»`, { details: { reason: 'missing', fields: missing } });
      }
      live.state = 'connecting';
      live.error = null;
      this.#emit(userId, 'net.mount', { id: r.id });
      try {
        const saveSecret = fresh => this.#renewSecret(userId, user, r, live, fresh).catch(err => log.error(`Segreto rinnovato di «${r.name}» non salvato`, err));
        const session = await driver.connect(r.values, { secret, trust: r.trust, saveSecret, user: user.who });
        live.session = session;
        live.state = 'on';
        session.onLost?.(() => {
          if (live.session !== session) return;
          live.session = null;     // the next use connects again
          live.watched.clear();
        });
        return session;
      } catch (err) {
        // To confirm or a password to type: not a failure of the connection, the user is asked
        const asked = err?.net === 'untrusted' || err?.net === 'auth';
        // A key or certificate other than the one confirmed: the page warns, it is not a first time
        if (err?.net === 'untrusted' && err.trust && r.trust && r.trust !== err.trust.fingerprint) {
          err.trust = { ...err.trust, changed: true, previous: r.trust };
        }
        live.state = asked ? 'off' : 'error';
        live.error = asked ? null : String(err?.message ?? err).slice(0, 300);
        return this.#fail(driver, err, r.name);
      } finally {
        this.#emit(userId, 'net.mount', { id: r.id });
      }
    })();
    try {
      return await live.opening;
    } finally {
      live.opening = null;
    }
  }

  /**
   * Runs fn(session) on a connection of the user. When the connection itself failed, connects
   * again and runs it once more (only with `retry`: what is safe to do twice).
   */
  async use(principal, id, fn, { retry = true } = {}) {
    const user = await this.#user(principal);
    const r = this.#saved(user, id);
    const live = this.#live(user, id);
    for (let attempt = 0; ; attempt++) {
      const session = await this.#open(principal.id, user, r, live);
      try {
        return await fn(session);
      } catch (err) {
        // Credentials not taken any more (a token revoked): the session is no use, the next use asks
        if ((isConnectionError(err) || err?.net === 'auth') && live.session === session) {
          await this.#close(live);
          if (err?.net === 'auth') { live.state = 'off'; this.#emit(principal.id, 'net.mount', { id }); }
        }
        if (attempt === 0 && retry && isConnectionError(err)) continue;
        return this.#fail(this.drivers.get(r.protocol), err, r.name, '');
      }
    }
  }

  /** A driver's error as the kernel reports it; wrong credentials of an account ask to sign in again. */
  #fail(driver, err, name, prefix = name) {
    if (err?.net === 'auth' && driver && signInFields(driver).length) {
      fail('secret_required', `Serve un nuovo accesso per «${name}»`, { details: { reason: 'signin' } });
    }
    return netFail(err, prefix);
  }

  /**
   * A secret the driver renewed while connected (a token the provider replaced): kept like the old
   * one, remembered (sealed) if that was.
   */
  async #renewSecret(userId, user, r, live, fresh) {
    if (!fresh || typeof fresh !== 'object' || !user.saved.has(r.id)) return;
    if (r.secret) {
      r.secret = await this.secrets.seal({ ...await this.#openSecret(r), ...fresh });
      await this.#save(userId, user);
    } else live.secret = { ...live.secret ?? {}, ...fresh };
  }

  /** The name of a connection (for messages). */
  async nameOf(principal, id) {
    const user = await this.#user(principal);
    return user.saved.get(id)?.name ?? id;
  }

  /**
   * What the kernel needs to open another kind of session on the same server (a remote terminal
   * on the server of an SFTP connection): { name, protocol, values, secret, trust }. Never for the page.
   */
  async credentials(principal, id) {
    const user = await this.#user(principal);
    const r = this.#saved(user, id);
    const live = this.#live(user, id);
    const secret = r.secret ? await this.#openSecret(r) : live.secret ?? {};
    return { name: r.name, protocol: r.protocol, values: { ...r.values }, secret: { ...secret }, trust: r.trust ?? null };
  }

  // ---------- Operations ----------

  /** What is in a folder; with a protocol that can, watches it for changes (net.change) while it is among the last listed. */
  async listFolder(principal, id, path) {
    path = cleanPath(path);
    const entries = await this.use(principal, id, s => s.list(path));
    if (entries.length > MAX_LISTED) fail('too_large', `Cartella troppo grande (più di ${MAX_LISTED} elementi)`);
    const user = await this.#user(principal);
    const live = this.#live(user, id);
    if (live.session?.watch && !live.watched.has(path)) {
      try {
        const stop = live.session.watch(path, () => this.#emit(principal.id, 'net.change', { mount: id, path }));
        live.watched.set(path, stop);
        if (live.watched.size > MAX_WATCHED) {
          const [oldest, stopOld] = live.watched.entries().next().value;
          live.watched.delete(oldest);
          try { stopOld(); } catch { /* gone already */ }
        }
      } catch (err) {
        log.warn(`Cartella non osservata (${path}): ${err.message}`);
      }
    } else if (live.watched.has(path)) {
      const stop = live.watched.get(path);
      live.watched.delete(path);
      live.watched.set(path, stop);   // the last listed again
    }
    return entries.filter(e => e && isSafeName(e.name)).map(cleanEntry);
  }

  async stat(principal, id, path) {
    path = cleanPath(path);
    const entry = await this.use(principal, id, s => s.stat(path));
    return entry ? cleanEntry(entry) : null;
  }

  async mkdir(principal, id, path) {
    path = cleanPath(path);
    if (path === '/') fail('invalid', 'Percorso non valido');
    await this.use(principal, id, s => s.mkdir(path), { retry: false });
  }

  async rename(principal, id, from, to) {
    from = cleanPath(from);
    to = cleanPath(to);
    if (from === '/' || to === '/') fail('invalid', 'Percorso non valido');
    await this.#unwatch(principal, id, from);
    await this.use(principal, id, s => s.rename(from, to), { retry: false });
  }

  /** Removes a file, or a folder with everything inside it. */
  async removePath(principal, id, path) {
    path = cleanPath(path);
    if (path === '/') fail('invalid', 'La cartella principale della connessione non si elimina');
    await this.#unwatch(principal, id, path);
    await this.use(principal, id, s => (s.removeTree ? s.removeTree(path) : removeTree(s, path)), { retry: false });
  }

  /** The page of a file or folder on the provider's site (protocols with links): 'https://…'. */
  async link(principal, id, path) {
    path = cleanPath(path);
    const url = await this.use(principal, id, s => (typeof s.link === 'function' ? s.link(path) : fail('invalid', 'Questo protocollo non ha indirizzi web')));
    if (typeof url !== 'string' || url.length > 8192 || !/^https:\/\/[^\s]+$/.test(url)) fail('invalid', 'Indirizzo web non valido');
    return url;
  }

  /**
   * Stops watching a folder and what is inside it, before it is removed or renamed: a folder
   * watched is open on the server, and some protocols (SMB) remove it only once it is closed.
   */
  async #unwatch(principal, id, path) {
    const user = await this.#user(principal);
    const live = user.live.get(id);
    if (!live?.watched.size) return;
    const inside = p => p === path || p.startsWith(path === '/' ? '/' : `${path}/`);
    const stops = [...live.watched].filter(([p]) => inside(p));
    for (const [p] of stops) live.watched.delete(p);
    await Promise.all(stops.map(([, stop]) => Promise.resolve().then(stop).catch(() => {})));
  }

  /** The content of a file as a stream (from `start`); format: the `export` of an entry with no bytes of its own. */
  async read(principal, id, path, { start = 0, signal, format } = {}) {
    path = cleanPath(path);
    const fmt = typeof format === 'string' && /^[a-z0-9]{1,10}$/.test(format) ? format : undefined;
    return this.use(principal, id, s => s.read(path, { start, signal, ...(fmt && { format: fmt }) }));
  }

  /** How much space the account has: { used, total } (bytes; total 0: no limit), or null when the protocol does not say. */
  async space(principal, id) {
    const got = await this.use(principal, id, s => (typeof s.space === 'function' ? s.space() : null));
    const n = v => (Number.isSafeInteger(Number(v)) && Number(v) >= 0 ? Number(v) : 0);
    return got && typeof got === 'object' ? { used: n(got.used), total: n(got.total) } : null;
  }

  // ---------- Imports (the user picks on the provider's page what to copy) ----------

  /** Starts one on a connection: → { id, url } (the provider's page, for a new tab). */
  async importStart(principal, id) {
    const user = await this.#user(principal);
    this.#saved(user, id);
    for (const [k, v] of user.imports) if (Date.now() - v.created > 2 * 3600_000) user.imports.delete(k);
    if (user.imports.size >= MAX_IMPORTS) fail('rate_limited', 'Troppe importazioni aperte: finiscine una');
    const got = await this.use(principal, id, s => (s.importer ? s.importer.start() : fail('invalid', 'Questo protocollo non importa')), { retry: false });
    if (typeof got?.id !== 'string' || !/^[\w.-]{1,200}$/.test(got.id) || typeof got.url !== 'string' || got.url.length > 8192 || !/^https:\/\/\S+$/.test(got.url)) {
      fail('invalid', 'Il fornitore non ha aperto la pagina per scegliere');
    }
    user.imports.set(got.id, { mount: id, created: Date.now() });
    return { id: got.id, url: got.url };
  }

  /**
   * How an import is going: { status: 'pending' | 'done' | 'error', count, size, path, error? };
   * with `wait`, asks the provider again for a while (25 s at most) until the user has picked.
   * path: the folder of the connection with what was picked (to copy with the transfers).
   */
  async importStatus(principal, id, importId, { wait = false } = {}) {
    const user = await this.#user(principal);
    const known = user.imports.get(importId);
    if (!known || known.mount !== id) fail('not_found', 'Importazione scaduta o inesistente');
    const until = Date.now() + (wait ? IMPORT_WAIT : 0);
    for (;;) {
      const got = await this.use(principal, id, s => s.importer.poll(importId));
      const status = ['pending', 'done', 'error'].includes(got?.status) ? got.status : 'error';
      if (status !== 'pending' || Date.now() + IMPORT_POLL > until) {
        if (status !== 'pending') user.imports.delete(importId);
        return {
          status, count: Number(got?.count) || 0, size: Number(got?.size) || 0,
          path: status === 'done' ? cleanPath(String(got.path ?? '')) : null,
          ...(status === 'error' && { error: String(got?.error ?? 'Importazione non riuscita').slice(0, 300) }),
        };
      }
      await new Promise(resolve => setTimeout(resolve, IMPORT_POLL));
    }
  }

  /** Writes a file from a stream (a new or empty file can be written with an empty one). */
  async write(principal, id, path, source, { start = 0, signal, size } = {}) {
    path = cleanPath(path);
    if (path === '/') fail('invalid', 'Percorso non valido');
    await this.use(principal, id, s => s.write(path, source, { start, signal, ...(Number.isSafeInteger(size) && size >= 0 && { size }) }), { retry: false });
  }

  /**
   * Copies a file of the user's home into a folder of a connection, making the folders on the way
   * (Carica su OneDrive e apri): { home: id of the file in lilOS, folder: '/lilOS', ifExists }.
   * A file with that name there: 'replace', 'keep' (another name: 'Offerta 2.docx'), or 'ask' (the
   * default: fails with 'conflict', details { name, exists: true }). → { path, name }
   */
  async putHome(principal, id, { home, folder = '/', ifExists = 'ask' } = {}) {
    folder = cleanPath(folder);
    const view = await openHome(this.#kernel, principal);
    const back = view.toBack(home);
    const node = await view.fs.stat(principal, back) ?? fail('not_found', 'File inesistente');
    if (node.type !== 'file') fail('invalid', 'Si carica solo un file');
    if (!isSafeName(node.name)) fail('invalid', 'Nome del file non valido');
    await this.use(principal, id, async s => {
      let at = '/';
      for (const part of folder.split('/').filter(Boolean)) {
        at = joinPath(at, part);
        const e = await s.stat(at);
        if (!e) await s.mkdir(at);
        else if (e.type !== 'folder') throw Object.assign(new Error(`«${part}» non è una cartella`), { net: 'exists' });
      }
    }, { retry: false });
    let name = node.name;
    const same = await this.stat(principal, id, joinPath(folder, name));
    if (same) {
      if (same.type === 'folder' || ifExists === 'keep') name = uniqueName(name, (await this.use(principal, id, s => s.list(folder))).map(e => e.name));
      else if (ifExists !== 'replace') fail('conflict', `C’è già «${name}» in ${folder}`, { details: { name, exists: true } });
    }
    const path = joinPath(folder, name);
    const source = view.fs.readStream ? await view.fs.readStream(principal, back) : Readable.from([await view.fs.read(principal, back)]);
    await this.write(principal, id, path, source, { ...(Number.isSafeInteger(node.size) && { size: node.size }) });
    return { path, name };
  }

  /** What the connection can do midway (resume) and its session, for the transfers. */
  async session(principal, id) {
    return this.use(principal, id, s => s);
  }

  /** Tries a connection that is not saved yet: { values, protocol, signin? } and the secret fields. */
  async test(principal, body, rawSecret) {
    await this.#user(principal);
    const driver = this.#driver(body?.protocol);
    const { values, secret } = checkFields(driver, body.values, rawSecret);
    // A sign-in stays usable after a test: the connection is made with it afterwards
    const got = this.#signedIn(principal, driver, body.protocol, body, values, secret, { keep: true });
    const missing = missingFields(driver, values, secret);
    if (missing.length) fail('invalid', `Mancano: ${missing.join(', ')}`);
    await this.#accept(driver, values);
    let session;
    try {
      const saveSecret = fresh => { if (got && fresh?.[got.field] !== undefined) this.signins.renew(got.flow, fresh[got.field]); };
      session = await driver.connect(values, { secret, trust: typeof body.trust === 'string' ? body.trust : null, saveSecret, user: this.#who(principal) });
      await session.list('/');   // its root folder can be read
    } catch (err) {
      return netFail(err);
    } finally {
      await Promise.resolve().then(() => session?.close()).catch(() => {});
    }
  }

  /** The shares of a server (protocols with shares(): SMB). */
  async shares(principal, body, rawSecret) {
    await this.#user(principal);
    const driver = this.#driver(body?.protocol);
    if (typeof driver.shares !== 'function') fail('invalid', 'Questo protocollo non ha condivisioni');
    const { values, secret } = checkFields(driver, body.values, rawSecret);
    // An account signed in to in the dialog (the drives of a Google account): the sign-in stays usable
    const got = this.#signedIn(principal, driver, body.protocol, body, values, secret, { keep: true });
    await this.#accept(driver, values);
    try {
      const saveSecret = fresh => { if (got && fresh?.[got.field] !== undefined) this.signins.renew(got.flow, fresh[got.field]); };
      const list = await driver.shares(values, { secret, trust: typeof body.trust === 'string' ? body.trust : null, user: this.#who(principal), saveSecret });
      return list.filter(s => typeof s === 'string').slice(0, 500);
    } catch (err) {
      return netFail(err);
    }
  }

  // ---------- Life ----------

  /** A user's first request in this run: their `auto` connections open (in the background). */
  userSeen(principal) {
    if (principal?.kind !== 'user' || this.#seen.has(principal.id)) return;
    this.#seen.add(principal.id);
    (async () => {
      const user = await this.#user(principal);
      for (const r of user.saved.values()) {
        if (!r.auto || !this.drivers.has(r.protocol)) continue;
        this.#open(principal.id, user, r, this.#live(user, r.id)).catch(() => { /* the state says why */ });
      }
    })().catch(err => log.error('Connessioni all’accesso', err));
  }

  /** The user's connection data goes (the user was deleted). */
  async forget(userId) {
    const user = this.#users.get(userId);
    if (user) for (const live of (await user.ready).live.values()) await this.#close(live);
    this.#users.delete(userId);
    this.signins.forget(userId);
    await rm(this.#file(userId), { force: true });
  }

  /**
   * Closes the open sessions of these protocols, for every user (a module's settings changed): the
   * next use connects again with the new ones.
   */
  async reset(protocols) {
    const set = new Set(protocols);
    for (const [userId, entry] of this.#users) {
      const user = await entry.ready;
      for (const [id, live] of user.live) {
        if (!set.has(user.saved.get(id)?.protocol) || (!live.session && !live.opening)) continue;
        await this.#close(live);
        live.state = 'off';
        live.error = null;
        this.#emit(userId, 'net.mount', { id });
      }
    }
  }

  async stop() {
    this.signins.forget();
    for (const user of this.#users.values()) {
      for (const live of (await user.ready).live.values()) await this.#close(live);
    }
  }
}

/**
 * Removes a file, a link (the link only, never what it points to), or a folder after what is inside
 * it. A name the server gives that is not safe stops it before anything goes.
 */
export async function removeTree(session, path, entry = undefined, depth = 0) {
  if (depth > 64) fail('invalid', 'Cartelle troppo annidate');
  entry ??= await session.stat(path);
  if (!entry) return;
  if (entry.type === 'folder' && !entry.link) {
    const children = await session.list(path);
    if (children.some(c => !isUsableName(c?.name))) fail('invalid', 'La cartella contiene un nome non sicuro: non viene eliminata');
    for (const child of children) await removeTree(session, joinPath(path, child.name), child, depth + 1);
    await session.remove(path, { folder: true });
  } else {
    await session.remove(path, { folder: false });
  }
}

/** What a remembered password is tied to: change one of these, and it must be typed again. */
const BOUND = ['host', 'port', 'url', 'user', 'tls', 'domain', 'share', 'auth'];

const userKey = userId => createHash('sha256').update(String(userId)).digest('hex').slice(0, 32);
