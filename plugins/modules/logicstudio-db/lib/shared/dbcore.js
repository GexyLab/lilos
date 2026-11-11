// Copy of modules/_shared/dbcore.js (scripts/module-libs.mjs): edit it there, then npm run sync:modules
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';
import dns from 'node:dns';
import { isIP } from 'node:net';
import { checkIp, guardedLookup, isLoopback, resolveChecked } from './ipguard.js';

/**
 * What the database packages of Logic Studio share (logicstudio-db, -mongodb, -redis, -influxdb,
 * -elasticsearch). Their blocks run in the user's worker; the drivers run here, in the kernel's main
 * thread, as actions of the package (the engine's broker, supervisor.js #action), so the worker
 * never holds a password nor a socket.
 *
 *  - Connections: a «Connessione» block asks for one and gets a handle { $db, kind, name } that its
 *    output carries to the other blocks; the handle means something only to the program that made
 *    it (Connections). They all close when the program stops (tools.signal), or with close().
 *  - Addresses (target): the server's name is resolved and every address checked (ipguard.js, the
 *    module setting allowPrivate); the driver gets the address checked, TLS keeps the name. The
 *    databases lilOS itself uses (the URLs in the kernel's config.json, such as fs-postgres) are
 *    never reachable, not even with allowPrivate.
 *  - Limits (settingsOf): time of an operation, rows and size of a result, connections per user,
 *    operations per minute per user, the kinds of database allowed.
 *  - Values (plain): what a driver gives becomes JSON (dates as ISO text, big numbers as text when
 *    they are not exact, bytes as { $bytes: base64 }).
 *  - Passwords (password): a secret setting of the block (sealed by the engine, opened with
 *    tools.secret for the program's owner) or a value from an input.
 */

const oops = (message, code) => Object.assign(new Error(message), code && { code });
const num = (v, min, max, fallback) => { const x = Number(v); return Number.isFinite(x) && x >= min && x <= max ? x : fallback; };

/** The module settings, cleaned. `kinds`: the kinds of database of the module ({ postgres: 'allowPostgres', … }). */
export function settingsOf(config = {}, kinds = {}) {
  const allowed = new Set(Object.entries(kinds).filter(([, key]) => config[key] !== false).map(([kind]) => kind));
  return {
    allowPrivate: config.allowPrivate === true,
    timeoutMs: num(config.timeoutSeconds, 1, 600, 30) * 1000,
    maxRows: Math.round(num(config.maxRows, 1, 1_000_000, 10_000)),
    maxBytes: Math.round(num(config.maxResultKb, 16, 65_536, 4096) * 1024),
    maxConnections: Math.round(num(config.maxConnections, 1, 100, 10)),
    perMinute: Math.round(num(config.perMinute, 1, 100_000, 600)),
    allowed,
  };
}

// ---------- the databases of lilOS itself ----------

const DEFAULT_PORTS = { postgres: 5432, postgresql: 5432, mysql: 3306, mariadb: 3306, mongodb: 27017, redis: 6379, rediss: 6379, sqlserver: 1433, mssql: 1433, http: 80, https: 443 };
const DB_URL = /^(postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|rediss?|mssql|sqlserver):\/\//i;

/** The servers named by URLs in the kernel's config.json (the modules' settings): [{ host, port }]. */
export function kernelDatabases(dataDir) {
  const file = process.env.LILOS_KERNEL_CONFIG ?? join(dataDir, '..', '..', 'config.json');
  const out = [];
  const walk = (v, depth = 0) => {
    if (depth > 6 || v === null || v === undefined) return;
    if (typeof v === 'string') {
      if (!DB_URL.test(v)) return;
      try {
        const u = new URL(v);
        const scheme = u.protocol.slice(0, -1).toLowerCase().replace('+srv', '');
        for (const host of u.host.split(',')) {   // mongodb://a:1,b:2
          const m = /^\[?([^\]]*?)\]?(?::(\d+))?$/.exec(host);
          if (m?.[1]) out.push({ host: m[1].toLowerCase(), port: Number(m[2] || DEFAULT_PORTS[scheme] || 0) });
        }
      } catch { /* not a URL */ }
      return;
    }
    if (Array.isArray(v)) { for (const x of v) walk(x, depth + 1); return; }
    if (typeof v === 'object') for (const x of Object.values(v)) walk(x, depth + 1);
  };
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    for (const m of raw.modules ?? []) walk(m?.config);
  } catch { /* no config to read: nothing more to keep out */ }
  return out;
}

/** The addresses of this computer (loopback and every interface), to recognise «this computer» under any name. */
function localAddresses() {
  const out = new Set(['127.0.0.1', '::1']);
  for (const list of Object.values(networkInterfaces())) for (const a of list ?? []) out.add(a.address.toLowerCase());
  return out;
}

/**
 * A guard of the addresses for a module: `target(host, port)` → the address to connect to;
 * `lookup(port)` → a `lookup` for libraries that resolve by themselves (mongodb, http).
 */
export function makeGuard({ module, dataDir, settings }) {
  let blocked = null;   // [{ port, ips: Set, local }]
  const blockedList = async () => {
    if (blocked) return blocked;
    const list = [];
    for (const { host, port } of kernelDatabases(dataDir)) {
      const ips = new Set();
      let local = host === 'localhost' || isLoopback(host);
      try {
        for (const a of isIP(host) ? [{ address: host }] : await dns.promises.lookup(host, { all: true })) {
          ips.add(a.address.toLowerCase());
          if (isLoopback(a.address)) local = true;
        }
      } catch { /* a name that does not resolve now: compared by name below */ }
      list.push({ host, port, ips, local });
    }
    blocked = list;
    setTimeout(() => { blocked = null; }, 60_000).unref?.();   // read again now and then (an admin may change it)
    return blocked;
  };
  const local = () => localAddresses();
  const isKernelDb = (ip, port, list) => {
    const a = String(ip).toLowerCase().replace(/^::ffff:/, '');
    return list.some(b => b.port === port && (b.ips.has(a) || (b.local && (isLoopback(a) || local().has(a)))));
  };
  const refuse = () => oops('Questo è il database di lilOS: i blocchi non possono usarlo', 'forbidden');

  return {
    /** The address to connect to for host:port, checked: { address, family, host }. */
    async target(host, port) {
      const s = settings();
      const p = Number(port);
      if (!Number.isInteger(p) || p < 1 || p > 65535) throw oops(`Porta non valida: ${port}`);
      const list = await blockedList();
      const name = String(host ?? '').trim().toLowerCase();
      if (list.some(b => b.port === p && b.host === name)) throw refuse();
      const all = await resolveChecked(host, { allowPrivate: s.allowPrivate, module });
      if (all.some(a => isKernelDb(a.address, p, list))) throw refuse();
      return { ...all[0], host: String(host).trim().replace(/^\[(.*)\]$/, '$1') };
    },
    /** A `lookup` that checks every address (and keeps out lilOS's database on `port`). */
    async lookup(port) {
      const s = settings();
      const list = await blockedList();
      return guardedLookup({ allowPrivate: s.allowPrivate, module, extra: ip => { if (isKernelDb(ip, Number(port), list)) throw refuse(); } });
    },
    /** Checks an IP given as it is (an address a library got from a server, such as a redirect). */
    async check(ip, port) {
      checkIp(ip, { allowPrivate: settings().allowPrivate, module });
      if (isKernelDb(ip, Number(port), await blockedList())) throw refuse();
    },
  };
}

// ---------- connections of the programs ----------

const HANDLE = /^[a-f0-9]{24}$/;

/**
 * The connections open for the programs, in the kernel: a program reaches only its own, and they
 * all close when it stops. Each entry: { kind, name, close() } plus what the driver needs.
 */
export class Connections {
  #programs = new Map();   // program id → { owner, entries: Map(id → entry) }
  #perUser = new Map();    // user id → open connections
  #rate = new Map();       // user id → { minute, n }
  #settings;

  constructor(settings) { this.#settings = settings; }

  /** Counts an operation against the user's quota of this minute. */
  count(user) {
    const minute = Math.floor(Date.now() / 60_000);
    let r = this.#rate.get(user.id);
    if (!r || r.minute !== minute) { r = { minute, n: 0 }; this.#rate.set(user.id, r); }
    if (++r.n > this.#settings().perMinute) throw oops(`Troppe operazioni sul database: al massimo ${this.#settings().perMinute} al minuto`, 'quota');
    if (this.#rate.size > 1000) for (const [k, v] of this.#rate) if (v.minute !== minute) this.#rate.delete(k);
  }

  /** Whether the user may open one more (before connecting). */
  reserve(user) {
    const n = this.#perUser.get(user.id) ?? 0;
    if (n >= this.#settings().maxConnections) throw oops(`Troppe connessioni aperte: al massimo ${this.#settings().maxConnections} per utente`, 'quota');
    this.#perUser.set(user.id, n + 1);
    let released = false;
    return () => { if (!released) { released = true; this.#perUser.set(user.id, Math.max(0, (this.#perUser.get(user.id) ?? 1) - 1)); } };
  }

  /** Keeps a connection open for the program: the handle its blocks pass on. `release` from reserve(). */
  add(user, tools, entry, release) {
    const programId = tools.program?.id;
    if (!programId || tools.signal?.aborted) { release?.(); Promise.resolve(entry.close?.()).catch(() => {}); throw oops('Il programma non è in esecuzione'); }
    let p = this.#programs.get(programId);
    if (!p) {
      p = { owner: user.id, entries: new Map() };
      this.#programs.set(programId, p);
      tools.signal?.addEventListener('abort', () => this.closeProgram(programId), { once: true });
    }
    const id = randomBytes(12).toString('hex');
    p.entries.set(id, { ...entry, release });
    return { $db: id, kind: entry.kind, name: String(entry.name ?? '').slice(0, 200) };
  }

  /** The connection a block named with its handle (only the program's own). */
  get(tools, handle, kinds = null) {
    if (!handle || typeof handle !== 'object' || !HANDLE.test(String(handle.$db ?? ''))) {
      throw oops('Manca la connessione: collega l\'uscita «connessione» del blocco di connessione all\'ingresso «connessione»');
    }
    const entry = this.#programs.get(tools.program?.id)?.entries.get(handle.$db);
    if (!entry) throw oops('Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione');
    if (kinds && !kinds.includes(entry.kind)) throw oops(`Questa connessione è a ${entry.kind}: questo blocco non la può usare`);
    return entry;
  }

  /** Closes one connection of the program. */
  async close(tools, handle) {
    if (!handle || typeof handle !== 'object') return false;
    const p = this.#programs.get(tools.program?.id);
    const entry = p?.entries.get(String(handle.$db ?? ''));
    if (!entry) return false;
    p.entries.delete(String(handle.$db));
    entry.release?.();
    await Promise.resolve(entry.close?.()).catch(() => {});
    return true;
  }

  /** Closes all the connections of a program (it stopped). */
  async closeProgram(programId) {
    const p = this.#programs.get(programId);
    if (!p) return;
    this.#programs.delete(programId);
    await Promise.all([...p.entries.values()].map(async e => { e.release?.(); await Promise.resolve(e.close?.()).catch(() => {}); }));
  }

  /** Closes everything (the module stops). */
  async closeAll() { await Promise.all([...this.#programs.keys()].map(id => this.closeProgram(id))); }

  get size() { let n = 0; for (const p of this.#programs.values()) n += p.entries.size; return n; }
}

// ---------- values ----------

/** The password: what came to the input, else the block's secret setting (sealed: opened for the owner). */
export async function password(tools, fromInput, fromConfig) {
  if (typeof fromInput === 'string' && fromInput !== '') return fromInput;
  if (typeof fromConfig !== 'string' || fromConfig === '') return '';
  if (fromConfig.startsWith('ls1:')) {
    if (typeof tools.secret !== 'function') throw oops('Questo motore di Logic Studio non sa aprire le password salvate: aggiornalo');
    return await tools.secret(fromConfig);
  }
  return fromConfig;   // written in the schema by hand
}

/** A value from a driver as JSON. */
export function plain(v, depth = 0) {
  if (v === null || v === undefined) return null;
  if (depth > 32) return null;
  switch (typeof v) {
    case 'number': return Number.isFinite(v) ? v : String(v);
    case 'bigint': return Number.isSafeInteger(Number(v)) ? Number(v) : v.toString();
    case 'string': case 'boolean': return v;
    case 'function': case 'symbol': return null;
    default: break;
  }
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  if (Buffer.isBuffer(v) || v instanceof Uint8Array) return { $bytes: Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString('base64') };
  if (v instanceof ArrayBuffer) return { $bytes: Buffer.from(v).toString('base64') };
  if (Array.isArray(v)) return v.map(x => plain(x, depth + 1));
  if (v instanceof Map) return Object.fromEntries([...v].map(([k, x]) => [String(k), plain(x, depth + 1)]));
  if (v instanceof Set) return [...v].map(x => plain(x, depth + 1));
  if (typeof v.toJSON === 'function' && Object.getPrototypeOf(v) !== Object.prototype) {
    try { return plain(v.toJSON(), depth + 1); } catch { return String(v); }
  }
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null && typeof v.toString === 'function' && v.toString !== Object.prototype.toString) return String(v);
  const out = {};
  for (const [k, x] of Object.entries(v)) out[k] = plain(x, depth + 1);
  return out;
}

/** A value from a block for a driver: { $bytes } back to bytes, the rest as it is. */
export function fromBlock(v) {
  if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && typeof v.$bytes === 'string') return Buffer.from(v.$bytes, 'base64');
  return v === undefined ? null : v;
}

/** Throws when a result is bigger than the limit (in its JSON). */
export function checkSize(value, maxBytes) {
  const size = Buffer.byteLength(JSON.stringify(value ?? null));
  if (size > maxBytes) throw oops(`Risultato troppo grande (${Math.ceil(size / 1024)} KB, al massimo ${Math.round(maxBytes / 1024)} KB): chiedi meno righe o colonne`, 'too_large');
  return value;
}

/** promise, or a failure after ms (onTimeout runs then: cancel what is going on). */
export function withTimeout(promise, ms, message, onTimeout) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => { try { onTimeout?.(); } catch { /* cancelling anyway */ } reject(oops(message ?? `Il database non ha risposto in ${Math.round(ms / 1000)} s`, 'timeout')); }, ms); }),
  ]).finally(() => clearTimeout(timer));
}

/** Text of a value of the blocks. */
export const text = v => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** A driver's error as one line, without what could hold a password. */
export function cleanError(err, secrets = []) {
  let message = String(err?.message ?? err ?? 'Errore del database').split('\n')[0].slice(0, 500);
  for (const s of secrets) if (typeof s === 'string' && s.length >= 3) message = message.split(s).join('•••');
  const out = new Error(message);
  if (err?.code) out.code = err.code;
  return out;
}
