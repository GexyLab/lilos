import { randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import Redis from 'ioredis';
import { Connections, makeGuard, settingsOf, password, plain, fromBlock, checkSize, withTimeout, cleanError, text } from './shared/dbcore.js';

/**
 * The Redis blocks' work, in the kernel's main thread (the engine's broker): the client, the
 * password and the sockets never reach the user's worker. Shared rules in shared/dbcore.js.
 *
 *  - Server: host/port/database number/user (ACL)/password/TLS. The name is resolved and every
 *    address checked (guard.target); the client connects to the address checked, TLS keeps the name
 *    (servername). No Sentinel nor Cluster (they would send the client to other addresses).
 *  - Values: Redis keeps text; strings stay strings, other values are written as JSON; with the
 *    block's «JSON» option values are written with JSON.stringify and read with JSON.parse.
 *  - Limits: time of each command (commandTimeout and a time limit around it), rows (maxRows, with
 *    «truncated»: HGETALL, LRANGE, SCAN, LPOP with a count), size of a result (maxResultKb),
 *    connections per user (a subscription and a blocking pop use a connection of their own),
 *    operations per minute. Never KEYS (SCAN, capped). Blocking pops at most MAX_BLOCK_S seconds.
 *  - Comando: any command as a list, except the ones in DENIED (administration, the server's state,
 *    commands that would block or change the shared connection, scripts, which could run the others,
 *    the SUBSCRIBE family: there is a block for that); the module setting allowCommand switches the
 *    block off. What a user may really do is up to the Redis user (ACL) the connection uses.
 *  - Subscriptions (Iscriviti): a connection of their own, kept in the connection's entry, drained
 *    by the block with redis.next (long poll); at most MAX_SUBS per connection, MAX_QUEUE messages.
 */

export const KINDS = { redis: 'allowRedis' };
export const MAX_SUBS = 10;
export const MAX_QUEUE = 1000;
export const MAX_BLOCK_S = 25;
const MAX_BATCH = 100;
const MAX_KEY = 10_000;
const MAX_CHANNELS = 32;
const MAX_ARGS = 10_000;

/** Commands the «Comando» block refuses, with why (the reason is said to the user). */
const ADMIN = 'è un comando di amministrazione del server';
const STATE = 'cambia lo stato della connessione, che è condivisa con gli altri blocchi';
const BLOCKING = 'blocca la connessione (usa il blocco Lista: Togli, con l\'attesa)';
export const DENIED = new Map([
  ...['FLUSHALL', 'FLUSHDB', 'CONFIG', 'SHUTDOWN', 'DEBUG', 'MONITOR', 'SLAVEOF', 'REPLICAOF', 'MODULE', 'ACL', 'SAVE', 'BGSAVE',
    'BGREWRITEAOF', 'FAILOVER', 'SWAPDB', 'SYNC', 'PSYNC', 'REPLCONF', 'CLUSTER', 'SENTINEL', 'PFDEBUG', 'PFSELFTEST'].map(c => [c, ADMIN]),
  ['MIGRATE', 'si collega a un altro server'],
  ...['EVAL', 'EVALSHA', 'EVAL_RO', 'EVALSHA_RO', 'FCALL', 'FCALL_RO', 'SCRIPT', 'FUNCTION'].map(c => [c, 'esegue codice sul server, che potrebbe usare i comandi non permessi']),
  ...['RG.PYEXECUTE', 'RG.PYSTATS', 'TFUNCTION', 'TFCALL', 'TFCALLASYNC'].map(c => [c, 'esegue codice sul server, che potrebbe usare i comandi non permessi']),
  ['KEYS', 'blocca il server su un database grande (usa il blocco Cerca chiavi, che usa SCAN)'],
  ...['SUBSCRIBE', 'PSUBSCRIBE', 'SSUBSCRIBE', 'UNSUBSCRIBE', 'PUNSUBSCRIBE', 'SUNSUBSCRIBE'].map(c => [c, 'ha il suo blocco: Iscriviti']),
  ...['SELECT', 'AUTH', 'HELLO', 'RESET', 'QUIT', 'CLIENT', 'MULTI', 'EXEC', 'DISCARD', 'WATCH', 'UNWATCH', 'READONLY', 'READWRITE'].map(c => [c, STATE]),
  ...['BLPOP', 'BRPOP', 'BRPOPLPUSH', 'BLMOVE', 'BLMPOP', 'BZPOPMIN', 'BZPOPMAX', 'BZMPOP', 'WAIT', 'WAITAOF'].map(c => [c, BLOCKING]),
]);
/** Sub-commands refused (the others of the same command are allowed). */
const DENIED_SUB = new Map([
  ['MEMORY', new Set(['PURGE'])],
  ['LATENCY', new Set(['RESET', 'HISTORY', 'LATEST', 'GRAPH', 'DOCTOR'])],   // they show the commands of the other clients
  ['SLOWLOG', new Set(['RESET', 'GET'])],
  ['OBJECT', new Set(['FREQ'])],
]);

const oops = (message, code) => Object.assign(new Error(message), code && { code });
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const blank = v => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/** Why a command may not run, or null. `allowCommand`: the module setting. */
export function deniedCommand(args, allowCommand = true) {
  if (!allowCommand) return 'L\'amministratore ha disattivato il blocco Comando (impostazioni del modulo)';
  const name = String(args[0] ?? '').toUpperCase();
  if (!/^[A-Z][A-Z0-9_.|-]{0,40}$/.test(name)) return `Comando non valido: ${String(args[0] ?? '').slice(0, 40)}`;
  if (DENIED.has(name)) return `Comando non permesso: ${name} ${DENIED.get(name)}`;
  const sub = String(args[1] ?? '').toUpperCase();
  if (DENIED_SUB.get(name)?.has(sub)) return `Comando non permesso: ${name} ${sub} ${ADMIN}`;
  if ((name === 'XREAD' || name === 'XREADGROUP') && args.slice(1).some(a => String(a).toUpperCase() === 'BLOCK')) return `Comando non permesso: ${name} con BLOCK ${BLOCKING}`;
  return null;
}

/** The command of «Comando»: a list ["ZADD", "k", 1, "a"], or a text «ZADD k 1 a» (words, "quoted" ones too). */
export function commandOf(raw) {
  let list = raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (s.startsWith('[')) {
      try { list = JSON.parse(s); } catch { throw oops('Comando non valido: scrivi una lista JSON, per esempio ["ZADD", "classifica", 10, "anna"]'); }
    } else {
      list = [...s.matchAll(/"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/g)].map(m => (m[1] !== undefined ? m[1].replace(/\\(.)/g, '$1') : m[2] ?? m[3]));
    }
  }
  if (!Array.isArray(list) || !list.length) throw oops('Manca il comando: per esempio ["ZADD", "classifica", 10, "anna"]');
  if (list.length > MAX_ARGS) throw oops(`Troppi argomenti (al massimo ${MAX_ARGS})`);
  return list.map((a, i) => {
    if (i === 0) return text(a).trim();
    const v = fromBlock(a);
    if (Buffer.isBuffer(v)) return v;
    if (v === null) return '';
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  });
}

/** A key (or a channel), checked. */
export function keyOf(raw, what = 'chiave') {
  const key = Buffer.isBuffer(raw) ? raw.toString('utf8') : text(raw);
  const fem = what === 'chiave';
  if (key === '') throw oops(`Manca ${fem ? 'la' : 'il'} ${what}`);
  if (key.length > MAX_KEY) throw oops(`${what[0].toUpperCase()}${what.slice(1)} troppo ${fem ? 'lunga' : 'lungo'}`);
  return key;
}

/** Several keys: a list, or one key. */
export function keysOf(raw, what = 'chiave') {
  const list = Array.isArray(raw) ? raw : [raw];
  if (!list.length || list.length > MAX_ARGS) throw oops(`Servono da 1 a ${MAX_ARGS} chiavi`);
  return list.map(k => keyOf(k, what));
}

/** A value to write: with json, JSON.stringify; else text as it is, numbers and bools as text, objects as JSON. */
export function encode(value, json) {
  if (json) return JSON.stringify(value === undefined ? null : value);
  const v = fromBlock(value);
  if (Buffer.isBuffer(v)) return v;
  if (v === null) return '';
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

/** A value read: as it is, or parsed with json. */
export function decode(value, json, where) {
  if (value === null || value === undefined) return null;
  if (!json) return value;
  try { return JSON.parse(value); } catch { throw oops(`Il valore ${where ? `di ${String(where).slice(0, 80)} ` : ''}non è JSON: togli l'opzione JSON per leggerlo come testo`); }
}

const int = (v, fallback, min, max, what) => {
  if (blank(v)) return fallback;
  const x = Number(v);
  if (!Number.isInteger(x) || x < min || x > max) throw oops(`${what} ${['Porta', 'Scadenza', 'Fine'].includes(what) ? 'non valida' : 'non valido'}: ${String(v).slice(0, 30)}`);
  return x;
};

/** The client's error as one line, in Italian when it is a well-known one. */
function told(err, secrets = []) {
  const msg = String(err?.message ?? '');
  if (['forbidden', 'quota', 'too_large', 'timeout'].includes(err?.code)) return cleanError(err, secrets);
  if (/^WRONGTYPE/.test(msg)) return oops('La chiave contiene un altro tipo di valore (testo, hash, lista…): usa il blocco giusto per quel tipo');
  if (/^(WRONGPASS|NOAUTH)/.test(msg) || /invalid username-password|invalid password/i.test(msg)) return oops('Accesso negato: utente o password non validi');
  if (/^NOPERM/.test(msg)) return oops(`Permesso negato dal database: ${cleanError(err, secrets).message}`);
  if (/Command timed out/i.test(msg)) return oops('Redis non ha risposto in tempo (limite del modulo)', 'timeout');
  if (err?.code === 'ECONNREFUSED') return oops('Connessione rifiutata dal server Redis');
  if (/Stream isn't writeable|Connection is closed/i.test(msg)) return oops('Connessione a Redis chiusa: riaprila con il blocco di connessione');
  return cleanError(err, secrets);
}

/** connect() only says «Connection is closed»: the reason (WRONGPASS, a TLS error…) came as an 'error' event. */
const whyClosed = (err, failure) => (failure && /Connection is closed/i.test(String(err?.message)) ? failure : err);

const tlsMode = v => (v === 'off' || v === 'on' ? v : 'verify');

/** ioredis options for the block's settings and the address checked. */
export function optionsOf(c, target, port, secret, s) {
  const db = int(c.db, 0, 0, 10_000, 'Numero del database');
  const tls = tlsMode(c.tls);
  const user = text(c.user).trim();
  if (user.length > 200) throw oops('Nome utente troppo lungo');
  return {
    host: target.address, port, family: target.family, db,
    ...(user && { username: user }),
    ...(secret && { password: secret }),
    ...(tls !== 'off' && { tls: { ...(!isIP(target.host) && { servername: target.host }), rejectUnauthorized: tls === 'verify' } }),
    lazyConnect: true,
    connectTimeout: Math.min(s.timeoutMs, 15_000),
    commandTimeout: s.timeoutMs,
    maxRetriesPerRequest: 1,
    retryStrategy: times => (times > 3 ? null : Math.min(times * 500, 2000)),
    reconnectOnError: () => false,
    autoResendUnfulfilledCommands: false,
    enableAutoPipelining: false,
    showFriendlyErrorStack: false,
  };
}

// ---------- the actions ----------

/**
 * The actions of the package. `config()`: the module settings, read at each call; `module`: the
 * module's name (for the messages); `dataDir`: its data folder (to find the kernel's config.json).
 */
export function makeActions({ config, module = 'logicstudio-redis', dataDir = '.' }) {
  const settings = () => settingsOf(config(), KINDS);
  const conns = new Connections(settings);
  const guard = makeGuard({ module, dataDir, settings });

  const timed = (s, promise, onTimeout) => withTimeout(promise, s.timeoutMs, `Redis non ha risposto in ${Math.round(s.timeoutMs / 1000)} s`, onTimeout);
  const failing = fn => async (user, args, tools) => {
    try { return await fn(user, args ?? {}, tools); } catch (err) { throw told(err); }
  };
  /** An operation: counted, its connection, its settings. */
  const op = fn => failing(async (user, args, tools) => {
    const s = settings();
    conns.count(user);
    const e = conns.get(tools, args.connection, ['redis']);
    return fn(e.client, args, s, e, user);
  });

  /** A new client like the entry's own (a subscription, a blocking pop): counted as a connection. */
  async function another(e, user, s, extra = {}) {
    const release = conns.reserve(user);
    const client = e.client.duplicate({ lazyConnect: true, ...extra });
    let failure = null;
    client.on('error', err => { failure = err; });
    try {
      await timed(s, client.connect(), () => client.disconnect());
    } catch (err) {
      release();
      client.disconnect();
      throw whyClosed(err, failure);
    }
    return { client, release: () => { release(); client.disconnect(); } };
  }

  async function connect(user, args, tools) {
    const s = settings();
    if (!s.allowed.has('redis')) throw oops('L\'amministratore non permette i database Redis', 'forbidden');
    conns.count(user);
    const c = isObj(args.config) ? args.config : {};
    const secret = await password(tools, args.password, c.password);
    const secrets = [secret];
    const host = text(c.host).trim();
    const port = int(c.port, 6379, 1, 65535, 'Porta');
    let target;
    let options;
    try {
      target = await guard.target(host, port);
      options = optionsOf(c, target, port, secret, s);
    } catch (err) { throw told(err, secrets); }
    const release = conns.reserve(user);
    const client = new Redis(options);
    let failure = null;
    client.on('error', err => { failure = err; });   // said by the commands that fail (and by connect, below)
    try {
      await timed(s, client.connect(), () => client.disconnect());
      const raw = await timed(s, client.info('server')).catch(() => '');
      const field = name => new RegExp(`^${name}:(.*)$`, 'm').exec(raw)?.[1]?.trim() ?? null;
      const name = `${target.host}:${port}/${options.db}`;
      const info = { server: name, version: field('redis_version'), mode: field('redis_mode'), database: options.db };
      const subs = new Map();
      const entry = {
        kind: 'redis', name, client, subs,
        close: async () => {
          for (const sub of subs.values()) finish(sub, null);
          subs.clear();
          await withTimeout(client.quit(), 2000).catch(() => {});
          client.disconnect();
        },
      };
      const connection = conns.add(user, tools, entry, release);
      return { connection, info };
    } catch (err) {
      release();
      client.disconnect();
      throw told(whyClosed(err, failure), secrets);
    }
  }

  // ---- subscriptions

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
    sub.release();
    wake(sub);
  }

  /** Channels: a list, or a text with commas or spaces between them. */
  function channelsOf(raw) {
    const list = (Array.isArray(raw) ? raw.map(text) : text(raw).split(/[\s,]+/)).map(c => c.trim()).filter(Boolean);
    if (!list.length) throw oops('Manca il canale: scrivi uno o più canali (per i modelli, per esempio notizie.*)');
    if (list.length > MAX_CHANNELS) throw oops(`Troppi canali (al massimo ${MAX_CHANNELS})`);
    return list.map(c => keyOf(c, 'canale'));
  }

  async function subscribe(user, args, tools) {
    const s = settings();
    conns.count(user);
    const e = conns.get(tools, args.connection, ['redis']);
    if (e.subs.size >= MAX_SUBS) throw oops(`Troppe iscrizioni su questa connessione (al massimo ${MAX_SUBS})`, 'quota');
    const channels = channelsOf(args.channels);
    const pattern = args.pattern === true;
    const json = args.json === true;
    const { client, release } = await another(e, user, s, { commandTimeout: undefined, retryStrategy: () => null });
    const id = randomBytes(12).toString('hex');
    const sub = { id, queue: [], bytes: 0, maxBytes: s.maxBytes, dropped: 0, closed: false, error: null, waiter: null, release };
    const value = m => { if (!json) return m; try { return JSON.parse(m); } catch { return m; } };
    client.on('message', (channel, message) => push(sub, { channel, pattern: null, message: value(message) }));
    client.on('pmessage', (pat, channel, message) => push(sub, { channel, pattern: pat, message: value(message) }));
    client.on('end', () => finish(sub, oops('La connessione dell\'iscrizione si è chiusa')));
    try {
      await timed(s, pattern ? client.psubscribe(...channels) : client.subscribe(...channels));
    } catch (err) {
      sub.closed = true;
      release();
      throw err;
    }
    e.subs.set(id, sub);
    return { sub: id, channels };
  }

  async function next(user, args, tools) {
    let e;
    try { e = conns.get(tools, args.connection, ['redis']); } catch { return { messages: [], closed: true, dropped: 0, error: null }; }   // the connection closed: the listening ends
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
      'redis.connect': failing(connect),

      'redis.close': async (user, args, tools) => ({ closed: await conns.close(tools, args?.connection) }),

      'redis.get': op(async (client, args, s) => {
        const key = keyOf(args.key);
        const raw = await timed(s, client.get(key));
        return checkSize({ value: decode(raw, args.json === true, key), exists: raw !== null }, s.maxBytes);
      }),

      'redis.set': op(async (client, args, s) => {
        const key = keyOf(args.key);
        const value = encode(args.value, args.json === true);
        const seconds = int(args.seconds, 0, 0, 100 * 365 * 86400, 'Scadenza');
        const extra = [];
        if (seconds > 0) extra.push('EX', seconds);
        if (args.mode === 'nx') extra.push('NX');
        else if (args.mode === 'xx') extra.push('XX');
        const res = await timed(s, client.set(key, value, ...extra));
        return { ok: res === 'OK' };
      }),

      'redis.del': op(async (client, args, s) => ({ deleted: await timed(s, client.del(...keysOf(args.keys))) })),

      'redis.exists': op(async (client, args, s) => {
        const keys = keysOf(args.keys);
        const n = await timed(s, client.exists(...keys));
        return { count: n, exists: n === keys.length };
      }),

      'redis.incr': op(async (client, args, s) => {
        const key = keyOf(args.key);
        const step = blank(args.step) ? 1 : Number(args.step);
        if (!Number.isFinite(step)) throw oops(`Passo non valido: ${String(args.step).slice(0, 30)}`);
        const float = () => timed(s, client.incrbyfloat(key, step));
        // a whole step on a value with decimals: INCRBY refuses it, INCRBYFLOAT does it
        const value = Number.isSafeInteger(step)
          ? await timed(s, client.incrby(key, step)).catch(err => { if (/not an integer/i.test(err?.message)) return float(); throw err; })
          : await float();
        return { value: Number(value) };
      }),

      'redis.expire': op(async (client, args, s) => {
        const key = keyOf(args.key);
        let ok = true;
        if (args.op === 'expire') {
          const seconds = int(args.seconds, null, 1, 100 * 365 * 86400, 'Scadenza');
          if (seconds === null) throw oops('Mancano i secondi della scadenza');
          ok = (await timed(s, client.expire(key, seconds))) === 1;
        } else if (args.op === 'persist') {
          ok = (await timed(s, client.persist(key))) === 1;
        }
        const ttl = await timed(s, client.ttl(key));
        return { ttl, ok, exists: ttl !== -2 };
      }),

      'redis.hget': op(async (client, args, s) => {
        const key = keyOf(args.key);
        const json = args.json === true;
        if (!blank(args.field)) {
          const field = keyOf(args.field, 'campo');
          const raw = await timed(s, client.hget(key, field));
          return checkSize({ value: decode(raw, json, `${key}.${field}`), exists: raw !== null, truncated: false }, s.maxBytes);
        }
        const size = await timed(s, client.hlen(key));
        let all;
        let truncated = false;
        if (size <= s.maxRows) all = new Map(Object.entries(await timed(s, client.hgetall(key))));
        else {
          all = new Map();
          let cursor = '0';
          let stop = false;
          await timed(s, (async () => {
            do {
              const [nextCursor, flat] = await client.hscan(key, cursor, 'COUNT', 500);
              cursor = nextCursor;
              for (let i = 0; i < flat.length && all.size < s.maxRows; i += 2) all.set(flat[i], flat[i + 1]);
            } while (cursor !== '0' && all.size < s.maxRows && !stop);
          })(), () => { stop = true; });
          truncated = true;
        }
        const value = Object.fromEntries([...all].map(([f, v]) => [f, decode(v, json, `${key}.${f}`)]));
        return checkSize({ value, exists: size > 0, truncated }, s.maxBytes);
      }),

      'redis.hset': op(async (client, args, s) => {
        const key = keyOf(args.key);
        if (!isObj(args.fields) || !Object.keys(args.fields).length) throw oops('Mancano i campi da scrivere: un oggetto { "campo": valore } o gli ingressi aggiunti');
        const flat = [];
        for (const [f, v] of Object.entries(args.fields)) flat.push(keyOf(f, 'campo'), encode(v, args.json === true));
        if (flat.length > MAX_ARGS) throw oops(`Troppi campi (al massimo ${MAX_ARGS / 2})`);
        return { added: await timed(s, client.hset(key, ...flat)) };
      }),

      'redis.push': op(async (client, args, s) => {
        const key = keyOf(args.key);
        const values = args.each === true && Array.isArray(args.value) ? args.value : [args.value];
        if (!values.length) throw oops('La lista dei valori è vuota');
        if (values.length > s.maxRows) throw oops(`Troppi valori in una volta (al massimo ${s.maxRows})`, 'too_large');
        const encoded = values.map(v => encode(v, args.json === true));
        const length = await timed(s, args.side === 'left' ? client.lpush(key, ...encoded) : client.rpush(key, ...encoded));
        return { length };
      }),

      'redis.pop': failing(async (user, args, tools) => {
        const s = settings();
        conns.count(user);
        const e = conns.get(tools, args.connection, ['redis']);
        const key = keyOf(args.key);
        const json = args.json === true;
        const left = args.side !== 'right';
        if (args.block === true) {
          const wait = Math.min(MAX_BLOCK_S, Math.max(0.1, blank(args.timeout) ? 5 : Number(args.timeout)));
          if (!Number.isFinite(wait)) throw oops('Attesa non valida');
          // a connection of its own: a blocking pop would hold the shared one
          const { client, release } = await another(e, user, s, { commandTimeout: (wait + 5) * 1000, retryStrategy: () => null });
          try {
            const res = await withTimeout(left ? client.blpop(key, wait) : client.brpop(key, wait), (wait + 5) * 1000);
            const value = res ? decode(res[1], json, key) : null;
            return checkSize({ value, values: res ? [value] : [], empty: !res }, s.maxBytes);
          } finally { release(); }
        }
        if (!blank(args.count)) {
          const count = int(args.count, 1, 1, s.maxRows, 'Quanti');
          const raw = await timed(s, left ? e.client.lpop(key, count) : e.client.rpop(key, count));
          const values = (raw ?? []).map(v => decode(v, json, key));
          return checkSize({ value: values[0] ?? null, values, empty: !values.length }, s.maxBytes);
        }
        const raw = await timed(s, left ? e.client.lpop(key) : e.client.rpop(key));
        const value = decode(raw, json, key);
        return checkSize({ value, values: raw === null ? [] : [value], empty: raw === null }, s.maxBytes);
      }),

      'redis.range': op(async (client, args, s) => {
        const key = keyOf(args.key);
        let start = int(args.start, 0, -1e12, 1e12, 'Inizio');
        let stop = int(args.stop, -1, -1e12, 1e12, 'Fine');
        const length = await timed(s, client.llen(key));
        if (start < 0) start = Math.max(0, length + start);
        if (stop < 0) stop = length + stop;
        stop = Math.min(stop, length - 1);
        let truncated = false;
        if (stop - start + 1 > s.maxRows) { stop = start + s.maxRows - 1; truncated = true; }
        const raw = stop >= start ? await timed(s, client.lrange(key, start, stop)) : [];
        return checkSize({ values: raw.map(v => decode(v, args.json === true, key)), length, truncated }, s.maxBytes);
      }),

      'redis.publish': op(async (client, args, s) => {
        const channel = keyOf(args.channel, 'canale');
        return { receivers: await timed(s, client.publish(channel, encode(args.message, args.json === true))) };
      }),

      'redis.scan': op(async (client, args, s) => {
        const match = blank(args.match) ? '*' : keyOf(args.match, 'modello');
        const max = Math.min(s.maxRows, int(args.max, s.maxRows, 1, 1_000_000, 'Massimo'));
        const TYPES = ['string', 'hash', 'list', 'set', 'zset', 'stream'];
        const type = TYPES.includes(args.type) ? args.type : null;
        const keys = new Set();
        let cursor = '0';
        let stop = false;
        let cut = false;
        await timed(s, (async () => {
          do {
            const [nextCursor, found] = await client.scan(cursor, 'MATCH', match, 'COUNT', 1000, ...(type ? ['TYPE', type] : []));
            cursor = nextCursor;
            for (const k of found) { if (keys.size >= max && !keys.has(k)) { cut = true; break; } keys.add(k); }
          } while (cursor !== '0' && keys.size < max && !stop);
        })(), () => { stop = true; });
        return checkSize({ keys: [...keys], truncated: cut || cursor !== '0' }, s.maxBytes);
      }),

      'redis.command': op(async (client, args, s) => {
        const list = commandOf(args.command);
        const why = deniedCommand(list, config().allowCommand !== false);
        if (why) throw oops(why, 'forbidden');
        const result = await timed(s, client.call(list[0], ...list.slice(1)));
        return checkSize({ result: plain(result) }, s.maxBytes);
      }),

      'redis.subscribe': failing(subscribe),
      'redis.next': failing(next),
      'redis.unsubscribe': async (user, args, tools) => {
        let e;
        try { e = conns.get(tools, args?.connection, ['redis']); } catch { return { closed: false }; }
        const sub = e.subs.get(String(args?.sub ?? ''));
        if (!sub) return { closed: false };
        e.subs.delete(sub.id);
        finish(sub, null);
        return { closed: true };
      },
    },
  };
}
