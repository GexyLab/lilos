import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_DIR } from '../config.js';
import { fail } from '../errors.js';
import { logger } from '../log.js';
import { Secrets } from './secrets.js';
import { findDrivers, protocolInfo, checkFields, missingFields, cleanPath, joinPath, netFail, isConnectionError } from './drivers.js';

const log = logger('rete');
const MAX_MOUNTS = 50;
const MAX_WATCHED = 8;          // folders watched at once per connection (the last ones listed)
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
    if (this.drivers.size) log.info(`Protocolli di rete: ${[...this.drivers.keys()].join(', ')}`);
  }

  // ---------- Saved connections ----------

  #file(userId) {
    return join(this.dir, `${createHash('sha256').update(String(userId)).digest('hex').slice(0, 32)}.json`);
  }

  async #user(principal) {
    if (principal?.kind !== 'user') fail('unauthorized', 'Accesso richiesto');
    let user = this.#users.get(principal.id);
    if (user) return user.ready;
    user = { saved: new Map(), live: new Map(), queue: Promise.resolve() };
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
   * A new connection: { name, protocol, values, auto, remember } and the secret fields apart.
   * Not remembered, the secret stays in memory. Returns it as the page sees it.
   */
  async create(principal, body, rawSecret) {
    const user = await this.#user(principal);
    if (user.saved.size >= MAX_MOUNTS) fail('invalid', `Al massimo ${MAX_MOUNTS} connessioni`);
    const driver = this.#driver(body?.protocol);
    const { values, secret } = checkFields(driver, body.values, rawSecret);
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
    if (body.values !== undefined) {
      const { values, secret } = checkFields(driver, body.values, rawSecret);
      // Another server: what was confirmed of the old one does not count
      if (['host', 'port', 'url'].some(k => values[k] !== r.values[k])) r.trust = null;
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
   * fingerprint the user confirmed). Returns the connection as the page sees it.
   */
  async connect(principal, id, { secret: rawSecret = null, remember, trust } = {}) {
    const user = await this.#user(principal);
    const r = this.#saved(user, id);
    const live = this.#live(user, id);
    let changed = false;
    if (typeof trust === 'string' && trust && trust.length <= 200) { r.trust = trust; changed = true; }
    if (rawSecret && typeof rawSecret === 'object') {
      const { secret } = checkFields(this.#driver(r.protocol), r.values, rawSecret);
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
      const secret = r.secret ? await this.#openSecret(r) : live.secret ?? {};
      const missing = missingFields(driver, r.values, secret);
      if (missing.length) {
        live.state = live.state === 'on' ? 'on' : 'off';
        fail('secret_required', `Serve la password di «${r.name}»`, { details: { reason: 'missing', fields: missing } });
      }
      live.state = 'connecting';
      live.error = null;
      this.#emit(userId, 'net.mount', { id: r.id });
      try {
        const session = await driver.connect(r.values, { secret, trust: r.trust });
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
        live.state = asked ? 'off' : 'error';
        live.error = asked ? null : String(err?.message ?? err).slice(0, 300);
        return netFail(err, r.name);
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
        if (isConnectionError(err) && live.session === session) await this.#close(live);
        if (attempt === 0 && retry && isConnectionError(err)) continue;
        return netFail(err);
      }
    }
  }

  /** The name of a connection (for messages). */
  async nameOf(principal, id) {
    const user = await this.#user(principal);
    return user.saved.get(id)?.name ?? id;
  }

  // ---------- Operations ----------

  /** What is in a folder; with a protocol that can, watches it for changes (net.change) while it is among the last listed. */
  async listFolder(principal, id, path) {
    path = cleanPath(path);
    const entries = await this.use(principal, id, s => s.list(path));
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
    return entries
      .filter(e => e && typeof e.name === 'string' && e.name && !/[/\0]/.test(e.name) && e.name !== '.' && e.name !== '..')
      .map(e => ({ name: e.name, type: e.type === 'folder' ? 'folder' : 'file', size: Number(e.size) || 0, modified: Number(e.modified) || 0 }));
  }

  async stat(principal, id, path) {
    path = cleanPath(path);
    return this.use(principal, id, s => s.stat(path));
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
    await this.use(principal, id, s => removeTree(s, path), { retry: false });
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

  /** The content of a file as a stream (from `start`). */
  async read(principal, id, path, { start = 0, signal } = {}) {
    path = cleanPath(path);
    return this.use(principal, id, s => s.read(path, { start, signal }));
  }

  /** Writes a file from a stream (a new or empty file can be written with an empty one). */
  async write(principal, id, path, source, { start = 0, signal, size } = {}) {
    path = cleanPath(path);
    if (path === '/') fail('invalid', 'Percorso non valido');
    await this.use(principal, id, s => s.write(path, source, { start, signal, ...(Number.isSafeInteger(size) && size >= 0 && { size }) }), { retry: false });
  }

  /** What the connection can do midway (resume) and its session, for the transfers. */
  async session(principal, id) {
    return this.use(principal, id, s => s);
  }

  /** Tries a connection that is not saved yet: { values, protocol } and the secret fields. */
  async test(principal, body, rawSecret) {
    await this.#user(principal);
    const driver = this.#driver(body?.protocol);
    const { values, secret } = checkFields(driver, body.values, rawSecret);
    const missing = missingFields(driver, values, secret);
    if (missing.length) fail('invalid', `Mancano: ${missing.join(', ')}`);
    let session;
    try {
      session = await driver.connect(values, { secret, trust: typeof body.trust === 'string' ? body.trust : null });
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
    try {
      const list = await driver.shares(values, { secret, trust: typeof body.trust === 'string' ? body.trust : null });
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
    await rm(this.#file(userId), { force: true });
  }

  async stop() {
    for (const user of this.#users.values()) {
      for (const live of (await user.ready).live.values()) await this.#close(live);
    }
  }
}

/** Removes a file, or a folder after what is inside it. */
export async function removeTree(session, path) {
  const entry = await session.stat(path);
  if (!entry) return;
  if (entry.type === 'folder') {
    for (const child of await session.list(path)) await removeTree(session, joinPath(path, child.name));
    await session.remove(path, { folder: true });
  } else {
    await session.remove(path, { folder: false });
  }
}
