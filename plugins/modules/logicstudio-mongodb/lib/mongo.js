import { randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import { MongoClient, BSON, ObjectId } from 'mongodb';
import { Connections, makeGuard, settingsOf, password, plain, checkSize, withTimeout, cleanError, text } from './shared/dbcore.js';
import { checkIp } from './shared/ipguard.js';

/**
 * The MongoDB blocks' work, in the kernel's main thread (the engine's broker): the driver, the
 * passwords and the sockets never reach the user's worker. Shared rules in shared/dbcore.js.
 *
 *  - Server: a URI (mongodb:// or mongodb+srv://, never with the password inside: that goes in the
 *    Password field, sealed) or host/port/database/user/authSource. Every host of a URI is checked
 *    before connecting (guard.target), and the driver resolves names through guard.lookup, so every
 *    address (the SRV answers and the members a replica set announces too) is checked. Host/port
 *    connects to that server only (directConnection): no other member is discovered. With a URI the
 *    members are discovered; one announced as a bare IP that may not be reached closes the
 *    connection at once (serverOpening). URI options that read files of the kernel (tlsCAFile…),
 *    use a proxy or other authentication mechanisms (cloud metadata) are refused.
 *  - Values: Extended JSON (relaxed) both ways, so an ObjectId is { "$oid": "…" } and a date
 *    { "$date": "…" } in the outputs and in the filters; filters may also be written as in the shell
 *    (keys without quotes, 'text', ObjectId("…"), ISODate("…")).
 *  - Limits: time of each operation (also maxTimeMS on the server), rows (maxRows, with
 *    «truncated»), size of a result (maxResultKb), connections per user, operations per minute.
 *  - Change streams (Osserva modifiche): opened here, kept in the connection, drained by the block
 *    with mongo.next (long poll); at most MAX_SUBS per connection, MAX_QUEUE changes waiting.
 */

const { EJSON } = BSON;
export const KINDS = { mongodb: 'allowMongodb' };
export const MAX_SUBS = 10;
export const MAX_QUEUE = 1000;
const MAX_BATCH = 100;
const MAX_TEXT = 1 << 20;          // a filter, pipeline or document written as text
const MAX_HOSTS = 10;
const MAX_POOL = 5;
/** The «Modifiche» choice of Osserva modifiche → operationType. */
const WATCH_OPS = { insert: ['insert'], update: ['update', 'replace'], delete: ['delete'] };

const oops = (message, code) => Object.assign(new Error(message), code && { code });
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);

// ---------- values ----------

/** A value of the driver as JSON for the blocks (Extended JSON, relaxed). */
export const toJson = v => (v === undefined || v === null ? null : plain(EJSON.serialize(v, { relaxed: true })));

/** { $bytes } of the other packages as Extended JSON binary. */
function bytesToBinary(v, depth = 0) {
  if (depth > 64) throw oops('Valore troppo annidato');
  if (Array.isArray(v)) return v.map(x => bytesToBinary(x, depth + 1));
  if (!isObj(v)) return v;
  const keys = Object.keys(v);
  if (keys.length === 1 && keys[0] === '$bytes' && typeof v.$bytes === 'string') return { $binary: { base64: v.$bytes, subType: '00' } };
  const out = {};
  for (const k of keys) out[k] = bytesToBinary(v[k], depth + 1);
  return out;
}

/**
 * Text written as in the mongo shell → JSON: keys without quotes, 'single quotes', ObjectId("…"),
 * ISODate("…") / new Date("…"), trailing commas. Only used when the text is not JSON already.
 */
export function shellToJson(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  const str = () => {
    const q = src[i++];
    let s = '';
    while (i < n && src[i] !== q) {
      if (src[i] === '\\' && i + 1 < n) { s += src[i] + src[i + 1]; i += 2; continue; }
      s += src[i++];
    }
    if (i >= n) throw oops('Testo non chiuso');
    i++;
    return q === '"' ? `"${s}"` : `"${s.replace(/\\'/g, '\'').replace(/(^|[^\\])"/g, '$1\\"')}"`;
  };
  while (i < n) {
    const c = src[i];
    if (c === '"' || c === '\'') { out += str(); continue; }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < n && /[\w$.]/.test(src[j])) j++;
      const word = src.slice(i, j);
      let k = j;
      while (k < n && /\s/.test(src[k])) k++;
      if (src[k] === ':') { out += JSON.stringify(word); i = j; continue; }
      if (word === 'new') { i = j; continue; }
      if (['ObjectId', 'ISODate', 'Date'].includes(word) && src[k] === '(') {
        i = k + 1;
        while (i < n && /\s/.test(src[i])) i++;
        const arg = src[i] === '"' || src[i] === '\'' ? str() : '';
        while (i < n && /\s/.test(src[i])) i++;
        if (src[i] !== ')') throw oops(`${word}(…) non valido`);
        i++;
        if (word === 'ObjectId') out += `{"$oid":${arg || JSON.stringify(new ObjectId().toHexString())}}`;
        else out += `{"$date":${arg || JSON.stringify(new Date().toISOString())}}`;
        continue;
      }
      out += word;
      i = j;
      continue;
    }
    if (c === ',') {   // a trailing comma
      let k = i + 1;
      while (k < n && /\s/.test(src[k])) k++;
      if (src[k] === '}' || src[k] === ']') { i++; continue; }
    }
    out += c;
    i++;
  }
  return out;
}

/** A value from a block (text to parse, or JSON already) for the driver. `what`: its name in errors. */
/** «non valido» or «non valida», as the word wants. */
const invalid = what => (['Pipeline', 'Modifica', 'Proiezione'].includes(what) ? 'non valida' : 'non valido');

export function fromJson(v, what) {
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.length > MAX_TEXT) throw oops(`${what}: testo troppo lungo (al massimo ${MAX_TEXT >> 10} KB)`);
    try { return EJSON.parse(s, { relaxed: true }); } catch { /* maybe written as in the shell */ }
    try { return EJSON.parse(shellToJson(s), { relaxed: true }); } catch (err) {
      throw oops(`${what} ${invalid(what)}: scrivi un JSON, per esempio {"nome": "Anna", "eta": {"$gt": 30}} (${String(err.message).slice(0, 120)})`);
    }
  }
  if (v === undefined || v === null) return null;
  try { return EJSON.deserialize(bytesToBinary(v), { relaxed: true }); } catch (err) {
    throw oops(`${what} ${invalid(what)}: ${String(err.message).slice(0, 160)}`);
  }
}

const blank = v => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/** An object (filter, projection, sort…): from the input, else from the setting; empty → {}. */
export function objectOf(input, setting, what) {
  const raw = !blank(input) ? input : setting;
  if (blank(raw)) return {};
  const v = fromJson(raw, what);
  if (v === null) return {};
  if (!isObj(v)) throw oops(`${what} ${invalid(what)}: serve un oggetto JSON { … }`);
  return v;
}

/** A value of an added input: text stays text, objects are Extended JSON ({ "$oid": … }, { "$date": … }). */
export function valueOf(v, what) {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'object') return v;
  try { return EJSON.deserialize(bytesToBinary(v), { relaxed: true }); } catch (err) {
    throw oops(`${what} ${invalid(what)}: ${String(err.message).slice(0, 160)}`);
  }
}

/** The filter: the object, plus each added input as «field = value» (an _id of 24 hex digits matches the ObjectId too). */
export function filterOf(input, setting, fields = []) {
  const filter = objectOf(input, setting, 'Filtro');
  for (const f of Array.isArray(fields) ? fields : []) {
    const name = String(f?.name ?? '');
    if (!name || name.startsWith('$') || name.length > 200) throw oops(`Campo del filtro non valido: ${name.slice(0, 60)}`);
    if (f.value === undefined) continue;
    let value = valueOf(f.value, `Campo ${name}`);
    if (name === '_id' && typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value)) value = { $in: [new ObjectId(value), value] };
    filter[name] = value;
  }
  return filter;
}

/** The name of a collection. */
export function collectionName(raw) {
  const name = text(raw).trim();
  if (!name) throw oops('Manca il nome della raccolta (collection)');
  if (name.length > 200 || /[\0$]/.test(name)) throw oops(`Nome della raccolta non valido: ${name.slice(0, 60)}`);
  return name;
}

/** A whole number setting, or the default. */
const int = (v, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  if (blank(v)) return fallback;
  const x = Number(v);
  if (!Number.isInteger(x) || x < min || x > max) throw oops(`Numero non valido: ${String(v).slice(0, 30)}`);
  return x;
};

/** The driver's error as one line, in Italian when it is a well-known one. */
function told(err, secrets) {
  const msg = String(err?.message ?? '');
  if (err?.code === 'forbidden' || err?.code === 'quota' || err?.code === 'too_large' || err?.code === 'timeout') return cleanError(err, secrets);
  if (err?.code === 40573 || /only supported on replica sets/i.test(msg)) return oops('Osserva modifiche funziona solo con un replica set o un cluster di MongoDB (non con un server singolo)');
  if (err?.code === 18 || /Authentication failed/i.test(msg)) return oops('Accesso negato: utente o password non validi');
  if (err?.code === 13 || /not authorized|requires authentication/i.test(msg)) return oops(`Permesso negato dal database: ${cleanError(err, secrets).message}`);
  if (err?.code === 50 || /exceeded time limit/i.test(msg)) return oops('Il database ha impiegato troppo tempo (limite del modulo)', 'timeout');
  if (err?.name === 'MongoServerSelectionError') return oops(`Server MongoDB non raggiungibile: ${cleanError(err, secrets).message}`);
  return cleanError(err, secrets);
}

// ---------- the server ----------

/** Options a URI may carry (lower case); the others are refused. */
const URI_OPTIONS = new Set([
  'replicaset', 'authsource', 'authmechanism', 'retrywrites', 'retryreads', 'w', 'wtimeoutms', 'journal',
  'readpreference', 'readpreferencetags', 'readconcernlevel', 'maxstalenessseconds', 'connecttimeoutms', 'sockettimeoutms',
  'serverselectiontimeoutms', 'heartbeatfrequencyms', 'localthresholdms', 'appname', 'directconnection', 'loadbalanced',
  'compressors', 'zlibcompressionlevel', 'srvmaxhosts', 'srvservicename', 'maxidletimems', 'waitqueuetimeoutms', 'timeoutms',
  'maxpoolsize', 'minpoolsize', 'maxconnecting',
]);
const AUTH_MECHANISMS = new Set(['DEFAULT', 'SCRAM-SHA-1', 'SCRAM-SHA-256', 'PLAIN']);

/** A host «name:port» or «[v6]:port» → { host, port }. */
function hostPort(raw, fallbackPort) {
  const m = /^(?:\[([^\]]+)\]|([^:[\]]+))(?::(\d{1,5}))?$/.exec(raw);
  if (!m) throw oops(`Server non valido nell'indirizzo: ${raw.slice(0, 80)}`);
  return { host: decodeURIComponent(m[1] ?? m[2]), port: m[3] ? Number(m[3]) : fallbackPort };
}

/**
 * The URI of the settings, checked: { srv, hosts: [{ host, port }], user, database, options }.
 * A password inside is refused (it goes in the Password field, sealed).
 */
export function parseUri(raw) {
  const uri = String(raw ?? '').trim();
  const m = /^(mongodb(?:\+srv)?):\/\/(?:([^@/?#]*)@)?([^/?#]+)(?:\/([^?#]*))?(?:\?([^#]*))?$/i.exec(uri);
  if (!m) throw oops('Indirizzo (URI) non valido: scrivi mongodb://server:27017/database oppure mongodb+srv://cluster.esempio.net/database');
  const srv = m[1].toLowerCase() === 'mongodb+srv';
  const userinfo = m[2];
  if (userinfo !== undefined && userinfo.includes(':')) {
    throw oops('L\'indirizzo (URI) contiene una password: toglila e scrivila nel campo Password (viene conservata cifrata)');
  }
  const hosts = m[3].split(',').map(h => hostPort(h.trim(), 27017));
  if (!hosts.length || hosts.length > MAX_HOSTS) throw oops(`Troppi server nell'indirizzo (al massimo ${MAX_HOSTS})`);
  if (srv && (hosts.length !== 1 || /:\d+$/.test(m[3]))) throw oops('Un indirizzo mongodb+srv:// ha un solo nome, senza porta');
  const options = {};
  for (const [key, value] of new URLSearchParams(m[5] ?? '')) {
    const k = key.toLowerCase();
    if (/^(tls|ssl)/.test(k)) throw oops(`Opzione ${key} non permessa nell'indirizzo: usa il campo TLS`);
    if (k.startsWith('proxy')) throw oops(`Opzione ${key} non permessa: i blocchi non passano da un proxy`);
    if (k === 'authmechanismproperties') throw oops('Opzione authMechanismProperties non permessa');
    if (!URI_OPTIONS.has(k)) throw oops(`Opzione dell'indirizzo non permessa: ${key.slice(0, 40)}`);
    if (k === 'authmechanism' && !AUTH_MECHANISMS.has(value.toUpperCase())) throw oops(`Meccanismo di accesso non permesso: ${value.slice(0, 30)} (solo SCRAM-SHA-1, SCRAM-SHA-256 e PLAIN)`);
    if (k === 'compressors' && value.split(',').some(c => !['zlib', 'none'].includes(c.trim().toLowerCase()))) throw oops('Compressione non permessa: solo zlib');
    options[k] = value;
  }
  let user = '';
  try { user = userinfo ? decodeURIComponent(userinfo) : ''; } catch { throw oops('Nome utente non valido nell\'indirizzo'); }
  let database = '';
  try { database = m[4] ? decodeURIComponent(m[4]) : ''; } catch { throw oops('Nome del database non valido nell\'indirizzo'); }
  return { uri, srv, hosts, user, database, options };
}

const tlsMode = v => (v === 'off' || v === 'on' ? v : 'verify');

/**
 * What to connect to, from the block's settings: { url, options, hosts, srv, database, name }.
 * `secret`: the password (never in the URL).
 */
export function planOf(c = {}, secret = '') {
  const tls = tlsMode(c.tls);
  const options = {
    appName: 'lilOS Logic Studio',
    tls: tls !== 'off',
    ...(tls === 'on' && { tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: true }),
    maxPoolSize: MAX_POOL,
    minPoolSize: 0,
    connectTimeoutMS: 10_000,
  };
  const user = text(c.user).trim();
  const authSource = text(c.authSource).trim();
  let plan;
  if (!blank(c.uri)) {
    const u = parseUri(c.uri);
    if (u.options.maxpoolsize !== undefined || u.options.minpoolsize !== undefined || u.options.maxconnecting !== undefined) {
      throw oops(`Opzioni maxPoolSize, minPoolSize e maxConnecting non permesse: i blocchi usano al massimo ${MAX_POOL} connessioni per server`);
    }
    const database = text(c.database).trim() || u.database || 'test';
    const name = u.srv ? u.hosts[0].host : u.hosts.map(h => `${h.host}:${h.port}`).join(',');
    plan = { url: u.uri, hosts: u.hosts, srv: u.srv, database, name: `${name}/${database}`, user: user || u.user };
  } else {
    const host = text(c.host).trim().replace(/^\[(.*)\]$/, '$1');
    if (!host) throw oops('Manca il server: scrivi un indirizzo (URI) oppure il server');
    if (host.length > 253 || /[\s/@?#,]/.test(host)) throw oops(`Server non valido: ${host.slice(0, 80)}`);
    const port = int(c.port, 27017, 1, 65535);
    const database = text(c.database).trim() || 'test';
    const shown = isIP(host) === 6 ? `[${host}]` : host;
    plan = { url: `mongodb://${shown}:${port}/`, hosts: [{ host, port }], srv: false, database, name: `${host}/${database}`, user };
    options.directConnection = true;   // that server only: no other member discovered
  }
  if (!/^[^\0/\\. "$*<>:|?]{1,64}$/.test(plan.database)) throw oops(`Nome del database non valido: ${plan.database.slice(0, 64)}`);
  if (plan.user) options.auth = { username: plan.user, password: secret };
  else if (secret) throw oops('C\'è la password ma manca l\'utente');
  if (authSource) options.authSource = authSource;
  delete plan.user;
  return { ...plan, options };
}

// ---------- the actions ----------

/**
 * The actions of the package. `config()`: the module settings, read at each call; `module`: the
 * module's name (for the messages); `dataDir`: its data folder (to find the kernel's config.json).
 */
export function makeActions({ config, module = 'logicstudio-mongodb', dataDir = '.' }) {
  const settings = () => settingsOf(config(), KINDS);
  const conns = new Connections(settings);
  const guard = makeGuard({ module, dataDir, settings });

  const entryOf = (tools, handle) => {
    const e = conns.get(tools, handle, ['mongodb']);
    if (e.state.refused) throw e.state.refused;
    return e;
  };
  const coll = (e, name) => e.client.db(e.database).collection(collectionName(name));
  const timed = (s, promise, onTimeout) => withTimeout(promise, s.timeoutMs, `MongoDB non ha risposto in ${Math.round(s.timeoutMs / 1000)} s`, onTimeout);
  const failing = fn => async (user, args, tools) => {
    try { return await fn(user, args ?? {}, tools); } catch (err) { throw told(err, []); }
  };

  /** The documents of a cursor, at most `take` (one more read to tell «truncated»), within the size limit. */
  async function drain(s, cursor, take) {
    const docs = [];
    let size = 0;
    let truncated = false;
    const work = (async () => {
      for await (const d of cursor) {
        if (docs.length >= take) { truncated = true; break; }
        const j = toJson(d);
        docs.push(j);
        size += Buffer.byteLength(JSON.stringify(j));
        if (size > s.maxBytes) checkSize(docs, s.maxBytes);
      }
    })();
    try {
      await timed(s, work, () => { cursor.close().catch(() => {}); });
    } finally {
      await cursor.close().catch(() => {});
    }
    return { documents: checkSize(docs, s.maxBytes), truncated };
  }

  async function connect(user, args, tools) {
    const s = settings();
    if (!s.allowed.has('mongodb')) throw oops('L\'amministratore non permette i database MongoDB', 'forbidden');
    conns.count(user);
    const c = isObj(args.config) ? args.config : {};
    const secret = await password(tools, args.password, c.password);
    const secrets = [secret];
    let plan;
    try {
      plan = planOf(c, secret);
      if (!plan.srv) for (const h of plan.hosts) await guard.target(h.host, h.port);   // the kernel's own databases, private addresses
      else if (!/^[a-z0-9.-]{1,253}$/i.test(plan.hosts[0].host) || !plan.hosts[0].host.includes('.')) throw oops(`Nome non valido per mongodb+srv: ${plan.hosts[0].host.slice(0, 80)}`);
    } catch (err) { throw told(err, secrets); }
    const port = plan.hosts[0].port;
    const release = conns.reserve(user);
    const state = { refused: null };
    let client = null;
    try {
      client = new MongoClient(plan.url, {
        ...plan.options,
        lookup: await guard.lookup(port),
        serverSelectionTimeoutMS: Math.min(s.timeoutMs, 30_000),
        monitorCommands: false,
      });
      // a member announced as a bare IP (not resolved, so not seen by lookup): checked here
      client.on('serverOpening', ev => {
        let at;
        try { at = hostPort(String(ev.address), 27017); } catch { return; }
        if (!isIP(at.host)) return;
        const refuse = err => {
          if (state.refused) return;
          state.refused = oops(`Il server indica un membro a un indirizzo non permesso (${at.host}): connessione chiusa. ${err.message}`, 'forbidden');
          client.close().catch(() => {});
        };
        try { checkIp(at.host, { allowPrivate: settings().allowPrivate, module }); } catch (err) { refuse(err); return; }
        guard.check(at.host, at.port).catch(refuse);
      });
      await timed(s, client.connect(), () => { client.close().catch(() => {}); });
      const admin = client.db('admin');
      const [hello, build] = await timed(s, Promise.all([
        admin.command({ hello: 1 }),
        admin.command({ buildInfo: 1 }).catch(() => ({})),
      ]));
      if (state.refused) throw state.refused;
      const info = {
        server: plan.name, database: plan.database, version: build.version ?? null,
        replicaSet: hello.setName ?? null, primary: hello.isWritablePrimary === true || hello.ismaster === true,
        changeStreams: !!(hello.setName || hello.msg === 'isdbgrid'),
      };
      const subs = new Map();
      const entry = {
        kind: 'mongodb', name: plan.name, client, database: plan.database, state, subs,
        close: async () => {
          for (const sub of subs.values()) finish(sub, null);
          subs.clear();
          await client.close().catch(() => {});
        },
      };
      const connection = conns.add(user, tools, entry, release);
      return { connection, info: plain(info) };
    } catch (err) {
      release();
      if (client) await client.close().catch(() => {});
      throw told(state.refused ?? err, secrets);
    }
  }

  // ---- change streams

  function push(sub, message) {
    const bytes = Buffer.byteLength(JSON.stringify(message));
    sub.queue.push({ message, bytes });
    sub.bytes += bytes;
    while (sub.queue.length > MAX_QUEUE || (sub.bytes > sub.maxBytes && sub.queue.length > 1)) {
      sub.bytes -= sub.queue.shift().bytes;
      sub.dropped++;
    }
    wake(sub);
  }
  function wake(sub) { const w = sub.waiter; sub.waiter = null; w?.(); }
  function finish(sub, error) {
    if (sub.closed) return;
    sub.closed = true;
    sub.error = error ? error.message : null;
    sub.stream.close().catch(() => {});
    wake(sub);
  }

  async function watch(user, args, tools) {
    const s = settings();
    conns.count(user);
    const e = entryOf(tools, args.connection);
    if (e.subs.size >= MAX_SUBS) throw oops(`Troppe osservazioni su questa connessione (al massimo ${MAX_SUBS})`, 'quota');
    let pipeline = blank(args.pipeline) ? [] : fromJson(args.pipeline, 'Pipeline');
    if (!Array.isArray(pipeline) || pipeline.some(st => !isObj(st))) throw oops('Pipeline non valida: serve una lista di passi [{ "$match": … }]');
    const ops = WATCH_OPS[args.operation];
    if (ops) pipeline = [{ $match: { operationType: { $in: ops } } }, ...pipeline];
    const options = { maxAwaitTimeMS: 1000, ...(args.fullDocument !== false && { fullDocument: 'updateLookup' }) };
    const target = blank(args.collection) ? e.client.db(e.database) : coll(e, args.collection);
    const stream = target.watch(pipeline, options);
    const id = randomBytes(12).toString('hex');
    const sub = { id, stream, queue: [], bytes: 0, maxBytes: s.maxBytes, dropped: 0, closed: false, error: null, waiter: null };
    let ready;
    const started = new Promise((resolve, reject) => { ready = { resolve, reject }; });
    // the first answer of the server (the stream is open), from the cursor: the stream does not relay it
    stream.cursor?.once?.('init', () => ready.resolve());
    stream.on('change', ch => {
      ready.resolve();
      push(sub, {
        operation: ch.operationType ?? null,
        document: toJson(ch.fullDocument ?? null),
        key: toJson(ch.documentKey ?? null),
        collection: ch.ns?.coll ?? null,
        change: toJson(ch),
      });
    });
    stream.on('error', err => { ready.reject(err); finish(sub, told(err, [])); });
    stream.on('close', () => finish(sub, null));
    try {
      await timed(s, started, () => { stream.close().catch(() => {}); });
    } catch (err) {
      sub.closed = true;
      await stream.close().catch(() => {});
      throw err;
    }
    e.subs.set(id, sub);
    return { sub: id };
  }

  async function next(user, args, tools) {
    let e;
    try { e = entryOf(tools, args.connection); } catch { return { messages: [], closed: true, dropped: 0, error: null }; }   // the connection closed: the listening ends
    const sub = e.subs.get(String(args.sub ?? ''));
    if (!sub) return { messages: [], closed: true, dropped: 0, error: null };
    const wait = Math.max(0, Math.min(25_000, Number(args.waitMs) || 0));
    if (!sub.queue.length && !sub.closed && wait > 0) {
      await new Promise(resolve => {
        const done = () => { clearTimeout(timer); tools.signal?.removeEventListener?.('abort', done); sub.waiter = null; resolve(); };
        const timer = setTimeout(done, wait);
        sub.waiter = done;
        tools.signal?.addEventListener?.('abort', done, { once: true });
      });
      if (sub.queue.length) await new Promise(r => setTimeout(r, 30));   // a few more together
    }
    const messages = [];
    let bytes = 0;
    while (sub.queue.length && messages.length < MAX_BATCH && (messages.length === 0 || bytes + sub.queue[0].bytes <= sub.maxBytes)) {
      const item = sub.queue.shift();
      sub.bytes -= item.bytes;
      bytes += item.bytes;
      messages.push(item.message);
    }
    const dropped = sub.dropped;
    sub.dropped = 0;
    const closed = sub.closed && !sub.queue.length;
    if (closed) e.subs.delete(sub.id);
    return { messages, closed, dropped, error: closed ? sub.error : null };
  }

  return {
    conns,
    actions: {
      'mongo.connect': failing(connect),

      'mongo.close': async (user, args, tools) => ({ closed: await conns.close(tools, args?.connection) }),

      'mongo.find': failing(async (user, args, tools) => {
        const s = settings();
        conns.count(user);
        const e = entryOf(tools, args.connection);
        const filter = filterOf(args.filter, args.filterSetting, args.fields);
        const projection = objectOf(args.projection, null, 'Proiezione');
        const sort = objectOf(args.sort, null, 'Ordine');
        const limit = int(args.limit, 0, 0);
        const skip = int(args.skip, 0, 0);
        const take = limit > 0 ? Math.min(limit, s.maxRows) : s.maxRows;
        const cursor = coll(e, args.collection).find(filter, {
          ...(Object.keys(projection).length && { projection }),
          ...(Object.keys(sort).length && { sort }),
          ...(skip && { skip }),
          limit: limit > 0 && limit <= s.maxRows ? limit : take + 1,
          maxTimeMS: s.timeoutMs,
        });
        const { documents, truncated } = await drain(s, cursor, take);
        return { documents, count: documents.length, truncated };
      }),

      'mongo.count': failing(async (user, args, tools) => {
        const s = settings();
        conns.count(user);
        const e = entryOf(tools, args.connection);
        const filter = filterOf(args.filter, args.filterSetting, args.fields);
        const n = await timed(s, coll(e, args.collection).countDocuments(filter, { maxTimeMS: s.timeoutMs }));
        return { count: n };
      }),

      'mongo.insert': failing(async (user, args, tools) => {
        const s = settings();
        conns.count(user);
        const e = entryOf(tools, args.connection);
        const value = fromJson(args.documents ?? null, 'Documento');
        if (value === null) throw oops('Manca il documento da inserire');
        const many = Array.isArray(value);
        const docs = many ? value : [value];
        if (!docs.length) return { ids: [], count: 0 };
        if (docs.length > s.maxRows) throw oops(`Troppi documenti in una volta (al massimo ${s.maxRows})`, 'too_large');
        if (docs.some(d => !isObj(d))) throw oops('Ogni documento deve essere un oggetto { … }');
        const c = coll(e, args.collection);
        const res = many
          ? await timed(s, c.insertMany(docs, { ordered: true }))
          : await timed(s, c.insertOne(docs[0]));
        const ids = many ? Object.keys(res.insertedIds).sort((a, b) => a - b).map(k => toJson(res.insertedIds[k])) : [toJson(res.insertedId)];
        return { ids, count: many ? res.insertedCount : 1 };
      }),

      'mongo.update': failing(async (user, args, tools) => {
        const s = settings();
        conns.count(user);
        const e = entryOf(tools, args.connection);
        const filter = filterOf(args.filter, args.filterSetting, args.fields);
        const raw = !blank(args.update) ? args.update : args.updateSetting;
        if (blank(raw)) throw oops('Manca la modifica: per esempio {"$set": {"stato": "fatto"}}');
        let update = fromJson(raw, 'Modifica');
        if (Array.isArray(update)) {
          if (!update.length || update.some(st => !isObj(st))) throw oops('Modifica non valida: una pipeline è una lista di passi [{ "$set": … }]');
        } else if (isObj(update)) {
          const keys = Object.keys(update);
          if (!keys.length) throw oops('Modifica vuota');
          const ops = keys.filter(k => k.startsWith('$'));
          if (ops.length && ops.length !== keys.length) throw oops('Modifica non valida: usa solo operatori ($set, $inc…) oppure solo campi (diventano $set)');
          if (!ops.length) update = { $set: update };
        } else throw oops('Modifica non valida: serve un oggetto { "$set": … }');
        const c = coll(e, args.collection);
        const options = { upsert: args.upsert === true };
        const res = await timed(s, args.many === true ? c.updateMany(filter, update, options) : c.updateOne(filter, update, options));
        return { matched: res.matchedCount ?? 0, modified: res.modifiedCount ?? 0, upsertedId: toJson(res.upsertedId ?? null) };
      }),

      'mongo.delete': failing(async (user, args, tools) => {
        const s = settings();
        conns.count(user);
        const e = entryOf(tools, args.connection);
        const filter = filterOf(args.filter, args.filterSetting, args.fields);
        if (!Object.keys(filter).length && args.all !== true) {
          throw oops('Filtro vuoto: eliminerebbe tutti i documenti. Scrivi un filtro, oppure spunta «Tutti i documenti» se è proprio quello che vuoi');
        }
        const c = coll(e, args.collection);
        const res = await timed(s, args.many === true ? c.deleteMany(filter) : c.deleteOne(filter));
        return { deleted: res.deletedCount ?? 0 };
      }),

      'mongo.aggregate': failing(async (user, args, tools) => {
        const s = settings();
        conns.count(user);
        const e = entryOf(tools, args.connection);
        const raw = !blank(args.pipeline) ? args.pipeline : args.pipelineSetting;
        const pipeline = blank(raw) ? [] : fromJson(raw, 'Pipeline');
        if (!Array.isArray(pipeline) || pipeline.some(st => !isObj(st))) throw oops('Pipeline non valida: serve una lista di passi [{ "$match": … }, { "$group": … }]');
        const cursor = coll(e, args.collection).aggregate(pipeline, { maxTimeMS: s.timeoutMs, allowDiskUse: false });
        const { documents, truncated } = await drain(s, cursor, s.maxRows);
        return { documents, count: documents.length, truncated };
      }),

      'mongo.collections': failing(async (user, args, tools) => {
        const s = settings();
        conns.count(user);
        const e = entryOf(tools, args.connection);
        const list = await timed(s, e.client.db(e.database).listCollections({}, { nameOnly: true, authorizedCollections: true }).toArray());
        const all = list.map(c => ({ name: String(c.name), type: String(c.type ?? 'collection') })).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
        const collections = all.slice(0, s.maxRows);
        return checkSize({ names: collections.map(c => c.name), collections, truncated: all.length > collections.length }, s.maxBytes);
      }),

      'mongo.watch': failing(watch),
      'mongo.next': failing(next),
      'mongo.unwatch': async (user, args, tools) => {
        let e;
        try { e = conns.get(tools, args?.connection, ['mongodb']); } catch { return { closed: false }; }
        const sub = e.subs.get(String(args?.sub ?? ''));
        if (!sub) return { closed: false };
        e.subs.delete(sub.id);
        finish(sub, null);
        return { closed: true };
      },
    },
  };
}
