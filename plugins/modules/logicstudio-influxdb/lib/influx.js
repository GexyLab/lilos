import { checkSize, cleanError, password, plain, text, withTimeout } from './shared/dbcore.js';
import { HttpClient, baseUrl } from './shared/dbhttp.js';
import { PRECISIONS, fluxRows, pointLine, withFluxParams } from './lineprotocol.js';

/**
 * The actions of the InfluxDB blocks, in the kernel's main thread (the engine's broker): the
 * worker never holds the token nor a socket. InfluxDB speaks HTTP: lib/http.js, through the
 * module's guard of the addresses.
 *
 *  - 2.x (and Cloud): token (Authorization: Token …), org, bucket; Flux on /api/v2/query, writes
 *    on /api/v2/write, delete on /api/v2/delete, InfluxQL on /query (the v1 compatibility API, the
 *    bucket as database).
 *  - 3.x (Core, Enterprise, Cloud Serverless/Dedicated): the same writes (v2 API), SQL on
 *    /api/v3/query_sql, InfluxQL on /query; the database is the «bucket».
 *  - 1.8+: the v2 compatibility endpoints (write, Flux query, health) with «user:password» as the
 *    token, InfluxQL on /query with the same user (Basic); the bucket is «database/retention».
 *
 *   influx.connect  { url, org, bucket, auth: token|password|none, user, password, secret, tls } → { connection, connected, info }
 *   influx.close    { connection } → { closed }
 *   influx.write    { connection, points: [{ measurement, tags, fields, time }], bucket?, precision, integers } → { written }
 *   influx.query    { connection, language: flux|influxql|sql, query, bucket?, params } → { rows, count, truncated }
 *   influx.buckets  { connection } → { buckets: [{ name, id, type, retentionSeconds }], names, truncated }
 *   influx.delete   { connection, bucket?, start, stop, predicate, all } → { deleted }
 */
export const KINDS = { influxdb: 'allowInfluxdb' };
const LANGUAGES = ['flux', 'influxql', 'sql'];
const MAX_QUERY = 100_000;
const oops = (message, code) => Object.assign(new Error(message), code && { code });

/** A name given to the server (org, bucket): text, short, no control characters. */
function nameOf(v, what, required = false) {
  const s = text(v).trim();
  if (!s) { if (required) throw oops(`Manca ${what}`); return ''; }
  if (s.length > 255 || /[\0-\x1f\x7f]/.test(s)) throw oops(`${what[0].toUpperCase()}${what.slice(1)} non valido: ${s.slice(0, 60)}`);
  return s;
}

/** An answer of InfluxDB that is not a success, as an error (the message the server gives). */
function failed(r, what = 'InfluxDB') {
  let message = '';
  try {
    const j = JSON.parse(r.text());
    message = typeof j === 'string' ? j : j?.message ?? j?.error ?? j?.err ?? '';
  } catch { message = r.text(); }
  message = String(message ?? '').replace(/\s+/g, ' ').trim().slice(0, 400);
  const hint = { 400: 'richiesta non valida', 401: 'token o password non validi', 403: 'il token non ha il permesso', 404: 'non trovato', 413: 'richiesta troppo grande', 422: 'dati non validi', 429: 'troppe richieste', 503: 'server non pronto' }[r.status];
  return oops(`${what} ha risposto ${r.status}${hint ? ` (${hint})` : ''}${message ? `: ${message}` : ''}`, `http_${r.status}`);
}

const isJson = r => /[/+]json\b/i.test(String(r.headers['content-type'] ?? ''));

const isoOf = (v, what) => {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw oops(`${what} non valido: ${v}`);
    return new Date(v).toISOString();
  }
  const s = text(v).trim();
  if (/^-?\d+$/.test(s)) return new Date(Number(s)).toISOString();
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) throw oops(`${what} non valido: ${s.slice(0, 60)} (serve una data ISO, come 2026-11-11T10:00:00Z)`);
  // RFC 3339 as it is (it may have nanoseconds), any other date the server would refuse as ISO
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(s) ? s : new Date(ms).toISOString();
};

export function makeActions({ settings, guard, conns }) {
  /** One operation on a connection: rate, the program's own connection, time limit, the result as JSON and its size. */
  async function op(user, tools, args, fn) {
    const s = settings();
    conns.count(user);
    const entry = conns.get(tools, args?.connection, ['influxdb']);
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (tools.signal) { if (tools.signal.aborted) abort(); else tools.signal.addEventListener('abort', abort, { once: true }); }
    const req = (opts) => entry.client.request({ ...opts, headers: { ...(opts.v1 ? entry.headersV1 : entry.headersV2), ...opts.headers }, timeoutMs: s.timeoutMs, maxBytes: s.maxBytes, signal: controller.signal });
    try {
      const value = await withTimeout(fn(entry, s, req), s.timeoutMs + 1000, undefined, abort);
      return checkSize(plain(value), s.maxBytes);
    } catch (err) {
      throw cleanError(err, entry.secrets);
    } finally {
      tools.signal?.removeEventListener('abort', abort);
    }
  }

  const bucketOf = (entry, v) => nameOf(v, 'il bucket') || entry.bucket || (() => { throw oops('Manca il bucket (nelle impostazioni del blocco o della connessione)'); })();

  /** InfluxQL on /query (v1 API): → [{ _measurement, …tags, …columns }] */
  async function influxql(req, entry, s, { query, db, params }) {
    const form = new URLSearchParams({ q: query });
    if (params && Object.keys(params).length) form.set('params', JSON.stringify(params));
    const r = await req({ v1: true, method: 'POST', path: '/query', query: { db }, headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: form.toString() });
    if (r.status !== 200) throw failed(r);
    const j = r.json() ?? {};
    if (j.error) throw oops(`Errore della query InfluxQL: ${String(j.error).slice(0, 400)}`);
    const rows = [];
    for (const result of j.results ?? []) {
      if (result.error) throw oops(`Errore della query InfluxQL: ${String(result.error).slice(0, 400)}`);
      for (const series of result.series ?? []) {
        for (const values of series.values ?? []) {
          if (rows.length >= s.maxRows) return { rows, truncated: true };
          const row = {};
          if (series.name) row._measurement = series.name;
          // defineProperty: a tag named «__proto__» stays a field
          for (const [k, v] of Object.entries(series.tags ?? {})) Object.defineProperty(row, k, { value: v, enumerable: true, writable: true, configurable: true });
          (series.columns ?? []).forEach((c, i) => { row[c] = values[i] ?? null; });
          rows.push(row);
        }
      }
    }
    return { rows, truncated: false };
  }

  return {
    'influx.connect': async (user, args, tools) => {
      const s = settings();
      if (!s.allowed.has('influxdb')) throw oops('L\'amministratore non permette i database InfluxDB');
      conns.count(user);
      const a = args && typeof args === 'object' ? args : {};
      const base = baseUrl(text(a.url));
      const auth = ['password', 'none'].includes(a.auth) ? a.auth : 'token';
      const org = nameOf(a.org, 'l\'organizzazione');
      const bucket = nameOf(a.bucket, 'il bucket');
      const userName = text(a.user).trim();
      const secret = await password(tools, a.password, a.secret);
      if (auth === 'password' && !userName) throw oops('Manca l\'utente (InfluxDB 1.x)');
      if (auth === 'token' && !secret) throw oops('Manca il token: scrivilo nelle impostazioni del blocco (o scegli «Nessuna» come accesso)');
      if (/[\r\n\0]/.test(secret) || /[\r\n\0:]/.test(userName)) throw oops('Utente o token non validi');
      const token = auth === 'password' ? `${userName}:${secret}` : secret;
      const basic = Buffer.from(token, 'utf8').toString('base64');
      const headersV2 = auth === 'none' ? {} : { authorization: `Token ${token}` };
      const headersV1 = auth === 'password' ? { authorization: `Basic ${basic}` } : headersV2;
      const secrets = [secret, token, basic].filter(x => x && x.length >= 3);

      const release = conns.reserve(user);
      const client = new HttpClient({ base, guard, tls: a.tls });
      const controller = new AbortController();
      const abort = () => controller.abort();
      tools.signal?.addEventListener('abort', abort, { once: true });
      try {
        const req = opts => client.request({ ...opts, headers: { ...headersV2, ...opts.headers }, timeoutMs: s.timeoutMs, maxBytes: Math.min(s.maxBytes, 1 << 20), signal: controller.signal });
        const info = await withTimeout((async () => {
          let r = await req({ path: '/ping' });
          if (r.status === 401 || r.status === 403) throw failed(r);
          let version = r.headers['x-influxdb-version'] ?? '';
          let build = r.headers['x-influxdb-build'] ?? '';
          if (r.status === 200 && !version) { try { const j = r.json(); version = j?.version ?? ''; build = build || j?.product || ''; } catch { /* not JSON */ } }
          if (r.status >= 300 && !version) {
            r = await req({ path: '/health', headers: { accept: 'application/json' } });
            if (r.status >= 300) throw failed(r);
            const j = r.json() ?? {};
            version = j.version ?? '';
          }
          version = String(version).replace(/^v/, '');
          const major = Number(/^(\d+)/.exec(version)?.[1] ?? 0) || null;
          // 2.x: the token checked now (/ping does not need it); 3.x already needed it for /ping
          if (major === 2 && auth !== 'none') {
            const check = await req({ path: '/api/v2/buckets', query: { limit: 1 } });
            if (check.status === 401) throw failed(check);
          }
          return { version, major, build: String(build), url: base.origin, org, bucket };
        })(), s.timeoutMs + 1000, undefined, abort);
        const connection = conns.add(user, tools, {
          kind: 'influxdb', name: `${base.host}/${bucket}`, client, org, bucket, headersV1, headersV2, secrets, info,
          close: () => client.close(),
        }, release);
        return plain({ connection, connected: true, info });
      } catch (err) {
        release();
        client.close();
        throw cleanError(err, secrets);
      } finally {
        tools.signal?.removeEventListener('abort', abort);
      }
    },

    'influx.close': async (user, args, tools) => ({ closed: await conns.close(tools, args?.connection) }),

    'influx.write': (user, args, tools) => op(user, tools, args ?? {}, async (entry, s, req) => {
      const precision = Object.hasOwn(PRECISIONS, args.precision) ? args.precision : 'ms';
      const points = Array.isArray(args.points) ? args.points : [args.points];
      if (!points.length) return { written: 0 };
      if (points.length > s.maxRows) throw oops(`Troppi punti in una volta: ${points.length} (al massimo ${s.maxRows})`);
      const lines = points.map(p => pointLine(p, { precision, integers: args.integers === true }));
      const r = await req({
        method: 'POST', path: '/api/v2/write',
        query: { org: entry.org || undefined, bucket: bucketOf(entry, args.bucket), precision },
        headers: { 'content-type': 'text/plain; charset=utf-8', accept: 'application/json' },
        body: lines.join('\n'),
      });
      if (r.status !== 204 && r.status !== 200) throw failed(r);
      return { written: lines.length };
    }),

    'influx.query': (user, args, tools) => op(user, tools, args ?? {}, async (entry, s, req) => {
      const language = LANGUAGES.includes(args.language) ? args.language : 'flux';
      const query = text(args.query).trim();
      if (!query) throw oops('Manca la query');
      if (query.length > MAX_QUERY) throw oops(`Query troppo lunga (al massimo ${MAX_QUERY} caratteri)`);
      const params = args.params && typeof args.params === 'object' && !Array.isArray(args.params)
        ? Object.fromEntries(Object.entries(args.params).filter(([, v]) => v !== undefined && v !== null)) : {};
      let out;
      if (language === 'flux') {
        const r = await req({
          method: 'POST', path: '/api/v2/query', query: { org: entry.org || undefined },
          headers: { accept: 'application/csv', 'content-type': 'application/json' },
          body: { query: withFluxParams(query, params), type: 'flux', dialect: { header: true, annotations: ['datatype', 'group', 'default'], delimiter: ',', dateTimeFormat: 'RFC3339' } },
        });
        if (r.status === 404 && entry.info.major === 3) throw oops('InfluxDB 3 non usa Flux: scegli SQL o InfluxQL');
        if (r.status !== 200) throw failed(r);
        out = fluxRows(r.text(), s.maxRows);
      } else if (language === 'influxql') {
        out = await influxql(req, entry, s, { query, db: bucketOf(entry, args.bucket), params });
      } else {
        const r = await req({
          method: 'POST', path: '/api/v3/query_sql',
          headers: { accept: 'application/json', 'content-type': 'application/json' },
          body: { db: bucketOf(entry, args.bucket), q: query, format: 'json', ...(Object.keys(params).length && { params }) },
        });
        // InfluxDB 2 answers an unknown path with its web page (200, text/html)
        if (r.status === 404 || r.status === 405 || (r.status === 200 && !isJson(r))) throw oops('Questo server non risponde a SQL: serve InfluxDB 3 (con InfluxDB 2 usa Flux o InfluxQL)');
        if (r.status !== 200) throw failed(r);
        const all = r.json() ?? [];
        if (!Array.isArray(all)) throw oops('Risposta SQL non valida');
        out = { rows: all.slice(0, s.maxRows), truncated: all.length > s.maxRows };
      }
      return { rows: out.rows, count: out.rows.length, truncated: out.truncated };
    }),

    'influx.buckets': (user, args, tools) => op(user, tools, args ?? {}, async (entry, s, req) => {
      // 2.x: /api/v2/buckets, a page at a time
      const buckets = [];
      let truncated = false;
      for (let offset = 0; ; offset += 100) {
        const r = await req({ path: '/api/v2/buckets', query: { org: entry.org || undefined, limit: 100, offset }, headers: { accept: 'application/json' } });
        if (r.status === 404 && offset === 0) break;
        if (r.status !== 200) throw failed(r);
        const page = r.json()?.buckets ?? [];
        for (const b of page) {
          if (buckets.length >= s.maxRows) { truncated = true; break; }
          buckets.push({ name: b.name, id: b.id ?? null, type: b.type ?? null, retentionSeconds: b.retentionRules?.[0]?.everySeconds ?? 0 });
        }
        if (truncated || page.length < 100) return { buckets, names: buckets.map(b => b.name), truncated };
      }
      // 3.x: the databases
      const r3 = await req({ path: '/api/v3/configure/database', query: { format: 'json' }, headers: { accept: 'application/json' } });
      if (r3.status === 200 && isJson(r3)) {
        const list = (r3.json() ?? []).map(x => ({ name: x['iox::database'] ?? x.name ?? Object.values(x)[0], id: null, type: null, retentionSeconds: null }));
        return { buckets: list.slice(0, s.maxRows), names: list.slice(0, s.maxRows).map(b => b.name), truncated: list.length > s.maxRows };
      }
      // 1.x: SHOW DATABASES
      const { rows } = await influxql(req, entry, s, { query: 'SHOW DATABASES', db: undefined });
      const list = rows.map(row => ({ name: row.name, id: null, type: null, retentionSeconds: null }));
      return { buckets: list, names: list.map(b => b.name), truncated: rows.length >= s.maxRows };
    }),

    'influx.delete': (user, args, tools) => op(user, tools, args ?? {}, async (entry, s, req) => {
      const predicate = text(args.predicate).trim();
      if (!predicate && args.all !== true) {
        throw oops('Manca il filtro (predicate): senza filtro si cancellano tutti i dati dell\'intervallo; spunta «Tutti i dati dell\'intervallo» per farlo davvero');
      }
      if (predicate.length > 10_000) throw oops('Filtro troppo lungo');
      const start = args.start === undefined || args.start === null || args.start === '' ? '1970-01-01T00:00:00Z' : isoOf(args.start, 'Inizio');
      const stop = args.stop === undefined || args.stop === null || args.stop === '' ? new Date().toISOString() : isoOf(args.stop, 'Fine');
      const r = await req({
        method: 'POST', path: '/api/v2/delete', query: { org: entry.org || undefined, bucket: bucketOf(entry, args.bucket) },
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: { start, stop, ...(predicate && { predicate }) },
      });
      if (r.status === 404 && entry.info.major !== 2) throw oops('Questo server non sa cancellare con un filtro (/api/v2/delete): serve InfluxDB 2');
      if (r.status !== 204 && r.status !== 200) throw failed(r);
      return { deleted: true };
    }),
  };
}
