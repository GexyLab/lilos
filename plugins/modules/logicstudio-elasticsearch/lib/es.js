import { checkSize, cleanError, password, plain, text, withTimeout } from './shared/dbcore.js';
import { HttpClient, baseUrl } from './shared/dbhttp.js';

/**
 * The actions of the Elasticsearch blocks (Elasticsearch 7 and 8, OpenSearch 1 and 2), in the
 * kernel's main thread (the engine's broker): the worker never holds the password nor a socket.
 * Elasticsearch speaks HTTP: lib/http.js, through the module's guard of the addresses.
 *
 *  - Connection: one or more URLs of the cluster's nodes; the first that answers is used, the next
 *    ones when a node cannot be reached (only when the request did not get to it). Access: none,
 *    user and password (Basic) or an API key (Authorization: ApiKey <the encoded key>).
 *  - Index names checked (lower case, none of \ / * ? " < > | , # : space, not starting with - _ +)
 *    and written encoded in the path, ids encoded: a name cannot reach another API.
 *  - Delete by query refuses a query that takes everything (none, match_all) unless asked («tutti»).
 *
 *   es.connect        { urls, auth: none|basic|apikey, user, password, secret, tls } → { connection, connected, info }
 *   es.close          { connection } → { closed }
 *   es.index          { connection, index, id?, document, refresh, create } → { id, result, version }
 *   es.get            { connection, index, id } → { document, found, id, version }
 *   es.search         { connection, index, query, match: { field: value }, size, from, sort } → { hits, total, aggregations, truncated }
 *   es.update         { connection, index, id, document, upsert, refresh } → { id, result, version }
 *   es.delete         { connection, index, id, refresh } → { result, found }
 *   es.deleteByQuery  { connection, index, query, match, all, refresh } → { deleted, conflicts }
 *   es.count          { connection, index, query, match } → { count }
 *   es.indices        { connection } → { indices: [{ index, health, status, docs, bytes }], names, truncated }
 *   es.bulk           { connection, index, documents: [], idField, refresh } → { indexed, errors, failed, ids }
 */
export const KINDS = { elasticsearch: 'allowElasticsearch', opensearch: 'allowOpensearch' };
const PRODUCT = { elasticsearch: 'Elasticsearch', opensearch: 'OpenSearch' };
const MAX_NODES = 8;
const MAX_ID = 512;
/** Network failures where the request did not reach the node: the next node may be tried. */
const FAILOVER = new Set(['ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'ENOTFOUND', 'EAI_AGAIN']);
/** The keys of a whole search body (anything else is the query itself). */
const BODY_KEYS = new Set(['query', 'aggs', 'aggregations', '_source', 'sort', 'size', 'from', 'highlight', 'post_filter', 'collapse', 'track_total_hits',
  'fields', 'script_fields', 'search_after', 'min_score', 'suggest', 'knn', 'runtime_mappings', 'docvalue_fields', 'stored_fields', 'explain',
  'timeout', 'version', 'seq_no_primary_term', 'pit', 'rescore', 'indices_boost', 'track_scores', 'terminate_after']);
const oops = (message, code) => Object.assign(new Error(message), code && { code });

// ---------- names, ids, queries ----------

/** An index name, checked, encoded for the path. */
export function indexName(v) {
  const s = text(v).trim();
  if (!s) throw oops('Manca l\'indice');
  if (s !== s.toLowerCase()) throw oops(`Nome dell'indice non valido: ${s.slice(0, 80)} (solo lettere minuscole)`);
  if (/[\\/*?"<>|,#: \0-\x1f\x7f]/.test(s)) throw oops(`Nome dell'indice non valido: ${s.slice(0, 80)} (niente \\ / * ? " < > | , # : né spazi)`);
  if (/^[-_+]/.test(s)) throw oops(`Nome dell'indice non valido: ${s.slice(0, 80)} (non può cominciare con - _ +)`);
  if (s === '.' || s === '..') throw oops(`Nome dell'indice non valido: ${s}`);
  if (Buffer.byteLength(s) > 255) throw oops('Nome dell\'indice troppo lungo (al massimo 255 byte)');
  return encodeURIComponent(s);
}

/** One or more index names (a list, or names separated by commas), for search and count. */
export function indexList(v) {
  const names = (Array.isArray(v) ? v.map(text) : text(v).split(',')).map(x => x.trim()).filter(Boolean);
  if (!names.length) throw oops('Manca l\'indice');
  if (names.length > 64) throw oops('Troppi indici (al massimo 64)');
  return names.map(indexName).join(',');
}

/** A document id, encoded for the path. */
export function idOf(v, required = true) {
  const s = v === undefined || v === null ? '' : typeof v === 'number' ? String(v) : text(v);
  if (!s) { if (required) throw oops('Manca l\'id del documento'); return ''; }
  // «.» and «..» would be path segments: DELETE /indice/_doc/.. is DELETE /indice/ (the whole index)
  if (s === '.' || s === '..') throw oops(`Id del documento non valido: «${s}»`);
  if (Buffer.byteLength(s) > MAX_ID) throw oops(`Id del documento troppo lungo (al massimo ${MAX_ID} byte)`);
  return encodeURIComponent(s);
}

/** An object from a block: an object as it is, JSON text parsed, nothing → null. */
function objectOf(v, what) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'object' && !Array.isArray(v)) return v;
  const s = text(v).trim();
  if (!s) return null;
  let value;
  try { value = JSON.parse(s); } catch { throw oops(`${what} non valido: serve un oggetto JSON`); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw oops(`${what} non valido: serve un oggetto JSON { … }`);
  return value;
}

/** Whether a query takes every document (none, {}, match_all, a bool with nothing that filters). */
export function takesAll(q) {
  if (q === null || q === undefined) return true;
  if (typeof q !== 'object' || Array.isArray(q)) return false;
  const keys = Object.keys(q);
  if (!keys.length) return true;
  if (keys.length === 1 && keys[0] === 'match_all') return true;
  if (keys.length === 1 && keys[0] === 'bool') {
    const b = q.bool ?? {};
    const list = x => (x === undefined ? [] : Array.isArray(x) ? x : [x]);
    if (list(b.must_not).length) return false;
    const must = [...list(b.must), ...list(b.filter)];
    const should = list(b.should);
    const msm = b.minimum_should_match;
    // should counts only with minimum_should_match, or when there is no must/filter
    const shouldCounts = should.length > 0 && (msm === undefined || msm === null ? must.length === 0 : !['0', '0%'].includes(String(msm)));
    if (shouldCounts && !should.some(takesAll)) return false;
    return must.every(takesAll);
  }
  if (keys.length === 1 && keys[0] === 'constant_score') return takesAll(q.constant_score?.filter);
  return false;
}

/** The query with the terms of the added inputs (field = value) put in AND. */
function withMatches(query, match) {
  const terms = Object.entries(match ?? {}).filter(([k, v]) => k && v !== undefined && v !== null && v !== '')
    .map(([k, v]) => (Array.isArray(v) ? { terms: { [k]: v } } : { match: { [k]: typeof v === 'object' ? JSON.stringify(v) : v } }));
  if (!terms.length) return query ?? { match_all: {} };
  return { bool: { must: [...(query && !takesAll(query) ? [query] : []), ...terms] } };
}

/** A search body from what the block gives: a whole body ({ query, aggs… }) or only the query. */
function bodyOf(raw, match) {
  const q = objectOf(raw, 'Query');
  const isBody = q && Object.keys(q).some(k => BODY_KEYS.has(k));
  const body = isBody ? { ...q } : { query: q ?? { match_all: {} } };
  body.query = withMatches(body.query ?? null, match);
  return body;
}

/** A sort from text («field:desc, other») or JSON (a list or an object), or undefined. */
function sortOf(v) {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'object') return v;
  const s = text(v).trim();
  if (!s) return undefined;
  if (s.startsWith('[') || s.startsWith('{')) {
    try { return JSON.parse(s); } catch { throw oops('Ordine non valido: JSON sbagliato'); }
  }
  return s.split(',').map(x => x.trim()).filter(Boolean).map(x => {
    const [field, order] = x.split(':').map(y => y.trim());
    if (order && !['asc', 'desc'].includes(order.toLowerCase())) throw oops(`Ordine non valido: ${x.slice(0, 60)} (asc o desc)`);
    return order ? { [field]: { order: order.toLowerCase() } } : field;
  });
}

const refreshOf = v => (v === 'true' || v === true ? 'true' : v === 'wait_for' ? 'wait_for' : undefined);
const intOf = (v, what, min, max) => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw oops(`${what} non valido: ${text(v).slice(0, 20)} (un intero da ${min} a ${max})`);
  return n;
};

/** An answer that is not a success, as an error (the reason the server gives). */
function failed(r, product) {
  let reason = '';
  try {
    const j = JSON.parse(r.text());
    const e = j?.error;
    if (typeof e === 'string') reason = e;
    else if (e) {
      const root = e.root_cause?.[0];
      reason = `${e.type ?? ''}${e.reason ? `: ${e.reason}` : ''}`;
      if (root?.reason && root.reason !== e.reason) reason += ` (${root.type ? `${root.type}: ` : ''}${root.reason})`;
    } else reason = j?.message ?? j?.result ?? '';
  } catch { reason = r.text(); }
  reason = String(reason ?? '').replace(/\s+/g, ' ').trim().slice(0, 400);
  const hint = { 400: 'richiesta non valida', 401: 'utente, password o chiave API non validi', 403: 'permesso negato', 404: 'non trovato', 409: 'conflitto: il documento c\'è già o è cambiato', 413: 'richiesta troppo grande', 429: 'troppe richieste', 503: 'cluster non pronto' }[r.status];
  return oops(`${product} ha risposto ${r.status}${hint ? ` (${hint})` : ''}${reason ? `: ${reason}` : ''}`, `http_${r.status}`);
}

// ---------- actions ----------

export function makeActions({ settings, guard, conns }) {
  /** A request to the cluster: the current node, the next ones when it cannot be reached. */
  async function send(entry, opts) {
    const n = entry.clients.length;
    let last;
    for (let k = 0; k < n; k++) {
      const i = (entry.current + k) % n;
      try {
        const r = await entry.clients[i].request({ ...opts, headers: { accept: 'application/json', ...entry.headers, ...opts.headers } });
        entry.current = i;
        return r;
      } catch (err) {
        if (!FAILOVER.has(err?.code) || opts.signal?.aborted) throw err;
        last = err;
      }
    }
    throw last;
  }

  /** One operation on a connection: rate, the program's own connection, time limit, the result as JSON and its size. */
  async function op(user, tools, args, fn) {
    const s = settings();
    conns.count(user);
    const entry = conns.get(tools, args?.connection, Object.keys(KINDS));
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (tools.signal) { if (tools.signal.aborted) abort(); else tools.signal.addEventListener('abort', abort, { once: true }); }
    const req = opts => send(entry, { ...opts, timeoutMs: s.timeoutMs, maxBytes: s.maxBytes, signal: controller.signal });
    const ok = async (opts, okStatus = [200, 201]) => {
      const r = await req(opts);
      if (!okStatus.includes(r.status)) throw failed(r, entry.product);
      return r.json() ?? {};
    };
    try {
      const value = await withTimeout(fn({ entry, s, req, ok, a: args }), s.timeoutMs + 1000, undefined, abort);
      return checkSize(plain(value), s.maxBytes);
    } catch (err) {
      throw cleanError(err, entry.secrets);
    } finally {
      tools.signal?.removeEventListener('abort', abort);
    }
  }
  const action = fn => (user, args, tools) => op(user, tools, args && typeof args === 'object' ? args : {}, fn);
  const matchOf = a => (a.match && typeof a.match === 'object' && !Array.isArray(a.match) ? a.match : {});

  return {
    'es.connect': async (user, args, tools) => {
      const s = settings();
      if (!s.allowed.size) throw oops('L\'amministratore non permette i database Elasticsearch e OpenSearch');
      conns.count(user);
      const a = args && typeof args === 'object' ? args : {};
      const raw = (Array.isArray(a.urls) ? a.urls.map(text) : text(a.urls).split(/[\s,]+/)).map(x => x.trim()).filter(Boolean);
      if (!raw.length) throw oops('Manca l\'indirizzo del server (URL)');
      if (raw.length > MAX_NODES) throw oops(`Troppi indirizzi (al massimo ${MAX_NODES})`);
      const bases = raw.map(baseUrl);
      const auth = ['none', 'apikey'].includes(a.auth) ? a.auth : 'basic';
      const userName = text(a.user).trim();
      const secret = await password(tools, a.password, a.secret);
      if (/[\r\n\0]/.test(secret) || /[\r\n\0:]/.test(userName)) throw oops('Utente, password o chiave API non validi');
      let headers = {};
      let secrets = [secret];
      if (auth === 'basic') {
        if (!userName) throw oops('Manca l\'utente');
        const basic = Buffer.from(`${userName}:${secret}`, 'utf8').toString('base64');
        headers = { authorization: `Basic ${basic}` };
        secrets.push(basic);
      } else if (auth === 'apikey') {
        if (!secret) throw oops('Manca la chiave API: scrivila nelle impostazioni del blocco');
        headers = { authorization: `ApiKey ${secret}` };
      }
      secrets = secrets.filter(x => x && x.length >= 3);

      const release = conns.reserve(user);
      const clients = bases.map(base => new HttpClient({ base, guard, tls: a.tls }));
      const closeAll = () => clients.forEach(c => c.close());
      const controller = new AbortController();
      const abort = () => controller.abort();
      tools.signal?.addEventListener('abort', abort, { once: true });
      try {
        const entry = { clients, current: 0, headers, secrets, product: 'Elasticsearch' };
        const root = await withTimeout((async () => {
          const r = await send(entry, { path: '/', timeoutMs: s.timeoutMs, maxBytes: 1 << 20, signal: controller.signal });
          if (r.status !== 200) throw failed(r, 'Il server');
          return r.json() ?? {};
        })(), s.timeoutMs + 1000, undefined, abort);
        if (!root.version?.number) throw oops('Il server non sembra Elasticsearch né OpenSearch');
        const kind = root.version.distribution === 'opensearch' ? 'opensearch' : 'elasticsearch';
        if (!s.allowed.has(kind)) throw oops(`L'amministratore non permette i database ${PRODUCT[kind]}`);
        const info = {
          product: PRODUCT[kind], version: String(root.version.number), cluster: root.cluster_name ?? null, node: root.name ?? null,
          uuid: root.cluster_uuid ?? null, url: bases[entry.current].origin,
        };
        const connection = conns.add(user, tools, {
          ...entry, kind, product: PRODUCT[kind], name: `${bases[entry.current].host}${info.cluster ? `/${info.cluster}` : ''}`, info, close: closeAll,
        }, release);
        return plain({ connection, connected: true, info });
      } catch (err) {
        release();
        closeAll();
        throw cleanError(err, secrets);
      } finally {
        tools.signal?.removeEventListener('abort', abort);
      }
    },

    'es.close': async (user, args, tools) => ({ closed: await conns.close(tools, args?.connection) }),

    'es.index': action(async ({ ok, a }) => {
      const index = indexName(a.index);
      const id = idOf(a.id, false);
      const document = objectOf(a.document, 'Documento');
      if (!document) throw oops('Manca il documento (un oggetto)');
      const query = { refresh: refreshOf(a.refresh), op_type: a.create === true && id ? 'create' : undefined };
      const r = await ok(id ? { method: 'PUT', path: `/${index}/_doc/${id}`, query, body: document } : { method: 'POST', path: `/${index}/_doc`, query, body: document });
      return { id: r._id, result: r.result, version: r._version ?? null };
    }),

    'es.get': action(async ({ entry, req, a }) => {
      const index = indexName(a.index);
      const id = idOf(a.id);
      const r = await req({ path: `/${index}/_doc/${id}` });
      const j = r.status === 200 || r.status === 404 ? r.json() ?? {} : null;
      if (r.status === 404 && j && j.found === false) return { document: null, found: false, id: decodeURIComponent(id), version: null };
      if (r.status !== 200) throw failed(r, entry.product);
      return { document: j._source ?? null, found: j.found === true, id: j._id, version: j._version ?? null };
    }),

    'es.search': action(async ({ s, ok, a }) => {
      const index = indexList(a.index);
      const body = bodyOf(a.query, matchOf(a));
      const wanted = intOf(a.size, 'Quanti (size)', 0, 1_000_000) ?? (Number.isInteger(body.size) ? body.size : 10);
      body.size = Math.min(wanted, s.maxRows);
      const from = intOf(a.from, 'Da (from)', 0, 1_000_000);
      if (from !== undefined) body.from = from;
      const sort = sortOf(a.sort);
      if (sort !== undefined) body.sort = sort;
      const r = await ok({ method: 'POST', path: `/${index}/_search`, body });
      const hits = (r.hits?.hits ?? []).map(h => ({ _id: h._id, ...(h._source ?? {}) }));
      const total = typeof r.hits?.total === 'number' ? r.hits.total : r.hits?.total?.value ?? hits.length;
      return { hits, total, aggregations: r.aggregations ?? null, truncated: wanted > s.maxRows };
    }),

    'es.update': action(async ({ ok, a }) => {
      const index = indexName(a.index);
      const id = idOf(a.id);
      const document = objectOf(a.document, 'Documento');
      if (!document) throw oops('Manca il documento (i campi da cambiare)');
      const r = await ok({
        method: 'POST', path: `/${index}/_update/${id}`, query: { refresh: refreshOf(a.refresh), retry_on_conflict: 3 },
        body: { doc: document, ...(a.upsert === true && { doc_as_upsert: true }) },
      });
      return { id: r._id, result: r.result, version: r._version ?? null };
    }),

    'es.delete': action(async ({ entry, req, a }) => {
      const index = indexName(a.index);
      const id = idOf(a.id);
      const r = await req({ method: 'DELETE', path: `/${index}/_doc/${id}`, query: { refresh: refreshOf(a.refresh) } });
      const j = r.status === 200 || r.status === 404 ? r.json() ?? {} : null;
      if (r.status === 404 && j?.result === 'not_found') return { result: 'not_found', found: false };
      if (r.status !== 200) throw failed(r, entry.product);
      return { result: j.result, found: j.result === 'deleted' };
    }),

    'es.deleteByQuery': action(async ({ ok, a }) => {
      const index = indexName(a.index);
      const body = bodyOf(a.query, matchOf(a));
      if (takesAll(body.query) && a.all !== true) {
        throw oops('La query prende tutti i documenti dell\'indice: per cancellarli davvero tutti spunta «Tutti i documenti»');
      }
      const r = await ok({ method: 'POST', path: `/${index}/_delete_by_query`, query: { refresh: a.refresh === true || a.refresh === 'true' ? 'true' : undefined, conflicts: 'proceed' }, body: { query: body.query } });
      return { deleted: r.deleted ?? 0, conflicts: r.version_conflicts ?? 0 };
    }),

    'es.count': action(async ({ ok, a }) => {
      const index = indexList(a.index);
      const body = bodyOf(a.query, matchOf(a));
      const r = await ok({ method: 'POST', path: `/${index}/_count`, body: { query: body.query } });
      return { count: r.count ?? 0 };
    }),

    'es.indices': action(async ({ s, ok }) => {
      const list = await ok({ path: '/_cat/indices', query: { format: 'json', h: 'index,health,status,docs.count,store.size', bytes: 'b', s: 'index' } });
      const all = (Array.isArray(list) ? list : []).map(x => ({
        index: x.index, health: x.health ?? null, status: x.status ?? null,
        docs: x['docs.count'] === undefined || x['docs.count'] === null ? null : Number(x['docs.count']),
        bytes: x['store.size'] === undefined || x['store.size'] === null ? null : Number(x['store.size']),
      }));
      const indices = all.slice(0, s.maxRows);
      return { indices, names: indices.map(x => x.index), truncated: all.length > s.maxRows };
    }),

    'es.bulk': action(async ({ s, ok, a }) => {
      const index = indexName(a.index);
      const documents = Array.isArray(a.documents) ? a.documents : [];
      if (!documents.length) return { indexed: 0, errors: 0, failed: [], ids: [] };
      if (documents.length > s.maxRows) throw oops(`Troppi documenti in una volta: ${documents.length} (al massimo ${s.maxRows})`);
      const idField = text(a.idField).trim();
      const lines = [];
      documents.forEach((d, i) => {
        const doc = objectOf(d, `Documento ${i + 1}`);
        if (!doc) throw oops(`Il documento ${i + 1} è vuoto`);
        const rawId = idField ? doc[idField] : undefined;
        const id = rawId === undefined || rawId === null || rawId === '' ? undefined : typeof rawId === 'object' ? JSON.stringify(rawId) : String(rawId);
        if (id !== undefined && Buffer.byteLength(id) > MAX_ID) throw oops(`Id del documento ${i + 1} troppo lungo`);
        lines.push(JSON.stringify({ index: id === undefined ? {} : { _id: id } }), JSON.stringify(doc));
      });
      const r = await ok({
        method: 'POST', path: `/${index}/_bulk`, query: { refresh: refreshOf(a.refresh) },
        headers: { 'content-type': 'application/x-ndjson' }, body: `${lines.join('\n')}\n`,
      });
      const failedList = [];
      const ids = [];
      let indexed = 0;
      (r.items ?? []).forEach((item, i) => {
        const x = item.index ?? item.create ?? {};
        ids.push(x._id ?? null);
        if (x.error) {
          if (failedList.length < 100) failedList.push({ position: i, id: x._id ?? null, status: x.status ?? null, error: `${x.error.type ?? ''}${x.error.reason ? `: ${x.error.reason}` : ''}`.slice(0, 300) });
        } else indexed++;
      });
      return { indexed, errors: (r.items ?? []).length - indexed, failed: failedList, ids };
    }),
  };
}
