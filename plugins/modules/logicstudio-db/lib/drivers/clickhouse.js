import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import { StringDecoder } from 'node:string_decoder';

/**
 * ClickHouse through its HTTP interface (no library): every statement is a POST to the address
 * the guard checked, with the server's name for TLS (SNI and, for «verify», the certificate's
 * name) and in the Host header; user and password in the X-ClickHouse-User/Key headers (never in
 * the address). Parameters are the server's own: {p1:Type} in the SQL, param_p1 in the address,
 * the type from the JS value.
 *
 * The rows come as JSONCompactEachRowWithNamesAndTypes (one JSON line per row) and are read as a
 * stream: a query stops reading after maxRows + 1 rows, a cursor reads a batch at a time (the
 * response is paused in between). 64-bit and bigger integers become numbers when exact, text
 * otherwise. No transactions: begin() fails with a clear message.
 */
export const kind = 'clickhouse';
export const label = 'ClickHouse';
export const defaultPort = 8123;
export const defaultTlsPort = 8443;

const MAX_BODY = 64 * 1024 * 1024;   // the most a query reads from a response
const MAX_ERROR = 64 * 1024;
const BUFFERED_LINES = 1000;          // a cursor's response pauses with this many lines read ahead
const NO_TX = 'ClickHouse non annulla le modifiche: le transazioni non sono supportate';

const isBytes = v => Buffer.isBuffer(v) || v instanceof Uint8Array
  || (!!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && typeof v.$bytes === 'string');

/** The ClickHouse type of a parameter, from its JS value. */
function typeOf(v) {
  if (v === null || v === undefined) return 'Nullable(String)';
  if (typeof v === 'boolean') return 'Bool';
  if (typeof v === 'bigint') return v > 9223372036854775807n ? 'UInt64' : 'Int64';
  if (typeof v === 'number') return Number.isSafeInteger(v) ? 'Int64' : 'Float64';
  if (v instanceof Date) return 'DateTime64(3, \'UTC\')';
  return 'String';
}

/** Text in ClickHouse's escaped form (as in TabSeparated): what param_… values are. */
const escape = s => s.replace(/[\\\t\n\r\0\b\f]/g, c => ({ '\\': '\\\\', '\t': '\\t', '\n': '\\n', '\r': '\\r', '\0': '\\0', '\b': '\\b', '\f': '\\f' })[c]);

/** A parameter's value for the address (param_pN). */
function encode(v) {
  if (v === null || v === undefined) return '\\N';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return Number.isNaN(v) ? 'nan' : v === Infinity ? 'inf' : v === -Infinity ? '-inf' : String(v);
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '\\N' : v.toISOString().replace('T', ' ').replace('Z', '');
  if (isBytes(v)) return (typeof v.$bytes === 'string' ? Buffer.from(v.$bytes, 'base64') : Buffer.from(v.buffer, v.byteOffset, v.byteLength)).toString('hex');
  if (typeof v === 'object') return escape(JSON.stringify(v));
  return escape(String(v));
}

export const dialect = {
  // bytes travel as hex text and become bytes again on the server
  placeholder: (i, name, value) => (isBytes(value) ? `unhex({p${i}:String})` : `{p${i}:${typeOf(value)}}`),
  quote: name => `\`${name.replace(/\\/g, '\\\\').replace(/`/g, '\\`')}\``,
  paginate: (limit, offset) => ({ suffix: `${limit ? ` LIMIT ${Math.floor(limit)}` : offset ? ' LIMIT 18446744073709551615' : ''}${offset ? ` OFFSET ${Math.floor(offset)}` : ''}` }),
  returning: null,
  multiRow: true,
  maxParams: 1000,
  reuseParams: true,
  backticks: true,
  backslashEscapes: true,
  transactions: false,
};

/** A value for the requests: undefined as null (the rest is encoded per type). */
export const param = v => (v === undefined ? null : v);

/** Whether a statement gives rows (no wait for its end, no count of written rows). */
const givesRows = sql => /^\s*(?:(?:--[^\n]*\n|\/\*[\s\S]*?\*\/)\s*)*\(?\s*(select|with|show|desc|describe|exists|explain|values)\b/i.test(sql);
/** A statement that names its own output format: its text comes back as it is. */
const ownFormat = sql => /\bformat\s+[A-Za-z]+\s*;?\s*$/i.test(sql);

const BIG_INT = /^(?:Nullable\(|LowCardinality\()*U?Int(?:64|128|256)\b/;
/** A cell: big integers (text in JSON) as numbers when exact. */
const cellOf = (v, type) => {
  if (typeof v === 'string' && BIG_INT.test(type) && /^-?\d+$/.test(v)) { const n = Number(v); return Number.isSafeInteger(n) ? n : v; }
  return v;
};

/** The message of an error text of ClickHouse (one line, without the version note). */
const serverMessage = text => String(text).trim().split('\n')[0].replace(/\s*\(version [^)]*\)\s*$/, '').slice(0, 500) || 'Errore di ClickHouse';

/**
 * The lines of a response, read as they come. next() → a line, or null at the end. The response
 * pauses with BUFFERED_LINES lines waiting; past `cap` bytes (or a line longer than that) it stops.
 */
function lineReader(res, cap, onTooBig) {
  const decoder = new StringDecoder('utf8');
  const lines = [];
  let partial = '';
  let bytes = 0;
  let ended = false;
  let failure = null;
  let wake = null;
  const notify = () => { const w = wake; wake = null; w?.(); };
  res.on('data', chunk => {
    bytes += chunk.length;
    if ((cap && bytes > cap) || partial.length > MAX_BODY) { failure = onTooBig(); notify(); return; }
    const text = partial + decoder.write(chunk);
    const parts = text.split('\n');
    partial = parts.pop();
    for (const p of parts) if (p) lines.push(p);
    if (lines.length >= BUFFERED_LINES) res.pause();
    notify();
  });
  res.on('end', () => { partial += decoder.end(); if (partial) lines.push(partial); partial = ''; ended = true; notify(); });
  res.on('error', err => { failure ??= err; notify(); });
  res.on('close', () => { if (!ended) failure ??= new Error('La risposta di ClickHouse si è interrotta'); notify(); });
  return {
    async next() {
      for (;;) {
        if (lines.length) {
          const line = lines.shift().replace(/\r$/, '');
          if (lines.length < BUFFERED_LINES / 2 && res.isPaused()) res.resume();
          if (!line) continue;
          // an error after the first rows (the status was already 200): __exception__, a tag, the message
          if (line === '__exception__') {
            let message = null;
            for (let i = 0; i < 4 && message === null; i++) {
              const next = await this.next().catch(() => null);
              if (next === null || next === '__exception__') break;
              if (/^Code: \d+/.test(next)) message = next;
            }
            throw new Error(serverMessage(message ?? 'Errore di ClickHouse durante la lettura delle righe'));
          }
          return line;
        }
        if (failure) throw failure;
        if (ended) return null;
        res.resume();
        await new Promise(r => { wake = r; });
      }
    },
    async all() {
      const out = [];
      for (let l = await this.next(); l !== null; l = await this.next()) out.push(l);
      return out.join('\n');
    },
  };
}

/** A line of JSON from the server; a line that is not JSON is an error of the server. */
function parseLine(line) {
  try { return JSON.parse(line); } catch { throw new Error(serverMessage(line)); }
}

const timeoutError = ms => Object.assign(new Error(`ClickHouse non ha risposto in ${Math.max(1, Math.round(ms / 1000))} s: la query è stata annullata`), { code: 'timeout' });
const tooBig = () => new Error(`Risposta di ClickHouse troppo grande (oltre ${MAX_BODY / 1024 / 1024} MB): chiedi meno righe o colonne`);

export async function open(o) {
  const secure = o.tls !== 'off';
  const verify = o.tls === 'verify';
  const mod = secure ? https : http;
  const agent = new mod.Agent({ keepAlive: true, maxSockets: o.poolSize, maxFreeSockets: o.poolSize, timeout: 30_000 });
  const live = new Set();   // requests going on: closed with the connection
  const name = net.isIP(o.host) ? null : o.host;
  const hostHeader = `${net.isIPv6(o.host) ? `[${o.host}]` : o.host}:${o.port}`;
  const base = {
    host: o.address, port: o.port, agent, method: 'POST',
    ...(secure ? {
      servername: name ?? undefined, rejectUnauthorized: verify,
      checkServerIdentity: (_, cert) => (verify ? tls.checkServerIdentity(o.host, cert) : undefined),
    } : {}),
  };
  let closed = false;

  /**
   * A POST of a statement: → { req, res } once the server answers 200 (another status is an error,
   * with the server's message). `settings`: more settings for the address.
   */
  function post(sql, params, settings, signal) {
    if (closed) return Promise.reject(new Error('Connessione chiusa'));
    const qs = new URLSearchParams();
    if (o.database) qs.set('database', o.database);
    qs.set('default_format', 'JSONCompactEachRowWithNamesAndTypes');
    qs.set('output_format_json_quote_64bit_integers', '1');
    qs.set('cancel_http_readonly_queries_on_client_close', '1');
    for (const [k, v] of Object.entries(settings)) qs.set(k, String(v));
    params.forEach((v, i) => qs.set(`param_p${i + 1}`, encode(v)));
    const body = Buffer.from(sql, 'utf8');
    return new Promise((resolve, reject) => {
      const req = mod.request({
        ...base, path: `/?${qs}`, signal,
        headers: {
          Host: hostHeader, 'Content-Type': 'text/plain; charset=UTF-8', 'Content-Length': body.length,
          'X-ClickHouse-User': o.user || 'default', 'X-ClickHouse-Key': o.password ?? '',
        },
      }, res => {
        if (res.statusCode === 200) { resolve({ req, res }); return; }
        const chunks = [];
        let size = 0;
        res.on('data', c => { if (size < MAX_ERROR) { chunks.push(c); size += c.length; } });
        res.on('end', () => reject(Object.assign(new Error(serverMessage(Buffer.concat(chunks).toString('utf8'))), { code: res.headers['x-clickhouse-exception-code'] ?? `HTTP ${res.statusCode}` })));
        res.on('error', reject);
      });
      live.add(req);
      req.on('close', () => live.delete(req));
      req.on('error', reject);
      req.end(body);
    });
  }

  /** The names and the types (first two lines), then rows from the lines. */
  const rowOf = (values, line, names, types) => {
    if (!Array.isArray(values)) throw new Error(serverMessage(line));
    const row = {};
    names.forEach((n, i) => { row[n] = cellOf(values[i] ?? null, types[i] ?? ''); });
    return row;
  };

  /** A statement: the rows (up to maxRows + 1 read, then the response is dropped), the written rows. */
  async function run(sql, params, maxRows) {
    const settings = { max_execution_time: Math.max(1, Math.ceil(o.timeoutMs / 1000)) };
    if (!givesRows(sql)) settings.wait_end_of_query = 1;   // the summary of written rows is then complete
    const ac = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ac.abort(); }, o.timeoutMs);
    try {
      const { res } = await post(sql, params, settings, ac.signal);
      let written = 0;
      try { written = Number(JSON.parse(res.headers['x-clickhouse-summary'] ?? '{}').written_rows) || 0; } catch { /* no summary */ }
      const lines = lineReader(res, MAX_BODY, () => { ac.abort(); return tooBig(); });
      if (ownFormat(sql)) return { rows: [{ result: await lines.all() }], fields: ['result'], affected: written, lastId: null, truncated: false };
      const head = await lines.next();
      if (head === null) return { rows: [], fields: [], affected: written, lastId: null, truncated: false };
      const names = parseLine(head);
      const types = parseLine((await lines.next()) ?? '[]');
      const rows = [];
      let truncated = false;
      for (let line = await lines.next(); line !== null; line = await lines.next()) {
        if (rows.length >= maxRows) { truncated = true; ac.abort(); break; }   // enough: the rest is not read
        rows.push(rowOf(parseLine(line), line, names, types));
      }
      return { rows, fields: names, affected: written || rows.length, lastId: null, truncated };
    } catch (err) {
      ac.abort();
      throw timedOut ? timeoutError(o.timeoutMs) : err;
    } finally {
      clearTimeout(timer);
    }
  }

  let version;
  try {
    version = (await run('SELECT version() AS v', [], 1)).rows[0]?.v;
  } catch (err) { agent.destroy(); throw err; }

  return {
    info: { server: `ClickHouse ${version ?? ''}`.trim() },
    dialect,
    param,
    query: (sql, params, { maxRows }) => run(sql, params, maxRows),

    async begin() { throw new Error(NO_TX); },

    /** A cursor: the response read as a stream, a batch at a time, paused in between. */
    async cursor(sql, params) {
      const ac = new AbortController();
      let timedOut = false;
      let names = [];
      let types = [];
      let lines;
      // the first answer within the time limit; then each batch has its own (no limit on the server:
      // a cursor read slowly is not a query that hangs)
      const timer = setTimeout(() => { timedOut = true; ac.abort(); }, o.timeoutMs);
      try {
        const { res } = await post(sql, params, {}, ac.signal);
        lines = lineReader(res, 0, () => { ac.abort(); return tooBig(); });
        const head = await lines.next();
        if (head !== null) {
          names = parseLine(head);
          types = parseLine((await lines.next()) ?? '[]');
        }
      } catch (err) { ac.abort(); throw timedOut ? timeoutError(o.timeoutMs) : err; } finally { clearTimeout(timer); }
      let open = true;
      const finish = () => { if (!open) return; open = false; ac.abort(); };
      return {
        async next(n) {
          n = Math.max(1, Math.floor(n));
          const rows = [];
          if (!open) return { rows, fields: names, done: true };
          let t;
          try {
            await Promise.race([
              (async () => {
                while (rows.length < n) {
                  const line = await lines.next();
                  if (line === null) { open = false; return; }
                  rows.push(rowOf(parseLine(line), line, names, types));
                }
              })(),
              new Promise((_, reject) => { t = setTimeout(() => reject(timeoutError(o.timeoutMs)), o.timeoutMs); }),
            ]);
          } catch (err) { finish(); throw err; } finally { clearTimeout(t); }
          return { rows, fields: names, done: !open };
        },
        async close() { finish(); },
      };
    },

    async tables() {
      const res = await run(`SELECT database AS \`schema\`, name, if(engine IN ('View', 'MaterializedView', 'LiveView', 'WindowView'), 'view', 'table') AS type
        FROM system.tables WHERE database = currentDatabase() ORDER BY name`, [], 100_000);
      return res.rows;
    },

    async columns(table, schema) {
      const res = await run(`SELECT name, type, startsWith(type, 'Nullable(') AS nullable, default_expression AS \`default\`, is_in_primary_key AS \`key\`
        FROM system.columns WHERE table = {p1:String} AND database = coalesce({p2:Nullable(String)}, currentDatabase()) ORDER BY position`, [table, schema || null], 10_000);
      return res.rows.map(r => ({ ...r, nullable: !!r.nullable, key: !!r.key, default: r.default === '' ? null : r.default }));
    },

    async close() {
      closed = true;
      for (const r of live) r.destroy();
      live.clear();
      agent.destroy();
    },
  };
}
