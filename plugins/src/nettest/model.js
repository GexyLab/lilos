/**
 * NetTest's collections as the app holds them: the content of a .nettest file (the kernel's
 * calls/runner.js says what each field is; the kernel only reads them) and the helpers to make,
 * find, copy and check their items. Plain data: what is saved is JSON.stringify of it.
 *
 *   collection { format: 'nettest', version: 1, name, variables, auth, scripts, environments, items }
 *   folder     { id, type: 'folder', name, items, auth, scripts }
 *   request    { id, type: 'request', name, protocol, method, url, params?, headers, body, auth,
 *                settings, checks, extract, scripts, values, messages? }
 *   messages: saved messages of a live session ([{ id, name, type, data, meta? }]) to send again
 */
export const FORMAT = 'nettest';
export const EXT = 'nettest';
export const MAX_TEXT = 32 << 20;

/** The protocols of a request; `live` ones open a session instead of sending once. */
export const PROTOCOLS = [
  { id: 'http', label: 'HTTP', live: false },
  { id: 'graphql', label: 'GraphQL', live: false },
  { id: 'ws', label: 'WebSocket', live: true },
  { id: 'sse', label: 'SSE', live: true },
  { id: 'grpc', label: 'gRPC', live: false, module: 'call-grpc' },
  { id: 'mqtt', label: 'MQTT', live: true, module: 'call-mqtt' },
  { id: 'tcp', label: 'TCP', live: true },
  { id: 'tls', label: 'TLS', live: true },
  { id: 'udp', label: 'UDP', live: true },
];
export const protocolOf = id => PROTOCOLS.find(p => p.id === id) ?? PROTOCOLS[0];
export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export const newId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map(b => (b % 36).toString(36)).join('');
};

const DEFAULT_URL = { http: 'https://', graphql: 'https://', ws: 'wss://', sse: 'https://', grpc: 'grpc://', mqtt: 'mqtt://' };

export function newRequest(protocol = 'http', name = '') {
  const p = protocolOf(protocol).id;
  const base = {
    id: newId(), type: 'request', name, protocol: p, method: p === 'graphql' ? 'POST' : 'GET', url: DEFAULT_URL[p] ?? '',
    headers: [], body: { kind: p === 'graphql' ? 'graphql' : 'none', text: '', fields: [], query: '', variables: '' },
    auth: { type: 'inherit' }, settings: {}, checks: [], extract: [], scripts: { pre: '', test: '' }, values: {},
  };
  if (p === 'tcp' || p === 'tls' || p === 'udp') base.values = { host: '', port: '' };
  if (p === 'mqtt') base.values = { version: '5', clean: true, keepalive: 60, clientId: '', username: '', password: '', subscriptions: [] };
  if (p === 'grpc') base.values = { service: '', method: '', message: '{\n  \n}', proto: '', metadata: [] };
  if (p === 'ws') base.values = { protocols: '' };
  if (protocolOf(p).live || p === 'grpc') base.messages = [];
  return base;
}

export const newFolder = (name = '') => ({ id: newId(), type: 'folder', name, items: [], auth: { type: 'inherit' }, scripts: { pre: '', test: '' } });

export function newCollection(name) {
  return { format: FORMAT, version: 1, name, variables: [], auth: { type: 'none' }, scripts: { pre: '', test: '' }, environments: [], items: [] };
}

/** Every item with its parent list: walk(items, fn(item, list, parents)). */
export function walk(items, fn, parents = []) {
  for (const item of items ?? []) {
    if (fn(item, items, parents) === false) return false;
    if (item.type === 'folder' && walk(item.items, fn, [...parents, item]) === false) return false;
  }
  return true;
}

/** { item, list, parents } of an id, or null. */
export function find(collection, id) {
  let found = null;
  walk(collection.items, (item, list, parents) => {
    if (item.id !== id) return true;
    found = { item, list, parents };
    return false;
  });
  return found;
}

/** A copy with new ids (Duplica). */
export function cloneItem(item) {
  const copy = structuredClone(item);
  copy.id = newId();
  if (copy.type === 'folder') copy.items = copy.items.map(cloneItem);
  return copy;
}

/** The folders of a request, as the kernel wants them in `chain`: the collection, then each folder. */
export function chainOf(collection, id) {
  const at = find(collection, id);
  const strip = n => ({ auth: n.auth ?? { type: 'inherit' }, scripts: n.scripts ?? {} });
  return [strip(collection), ...(at?.parents ?? []).map(strip)];
}

/** The auth a request ends up with ('inherit' resolved), and where it comes from (null: its own). */
export function effectiveAuth(collection, id) {
  const at = find(collection, id);
  if (!at) return { auth: { type: 'none' }, from: null };
  if (at.item.auth?.type && at.item.auth.type !== 'inherit') return { auth: at.item.auth, from: null };
  for (const node of [...at.parents].reverse()) if (node.auth?.type && node.auth.type !== 'inherit') return { auth: node.auth, from: node };
  return { auth: collection.auth ?? { type: 'none' }, from: collection };
}

const plainList = v => (Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : []);
const str = v => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v));

/** A file's text as a collection; throws (Error with a key of the locales) if it is not one. */
export function parseCollection(text) {
  if (String(text).length > MAX_TEXT) throw new Error('file.tooBig');
  let raw;
  try { raw = JSON.parse(String(text)); } catch { throw new Error('file.invalid'); }
  if (!raw || typeof raw !== 'object' || raw.format !== FORMAT || !Array.isArray(raw.items)) throw new Error('file.invalid');
  const c = newCollection(str(raw.name));
  c.variables = plainList(raw.variables).map(v => ({ key: str(v.key), value: str(v.value), enabled: v.enabled !== false }));
  c.auth = raw.auth && typeof raw.auth === 'object' ? raw.auth : { type: 'none' };
  c.scripts = { pre: str(raw.scripts?.pre), test: str(raw.scripts?.test) };
  c.environments = plainList(raw.environments).map(e => ({
    id: str(e.id) || newId(), name: str(e.name) || '—',
    variables: plainList(e.variables).map(v => ({ key: str(v.key), value: v.secret ? '' : str(v.value), secret: v.secret === true, ...(v.secret && typeof v.sealed === 'string' && { sealed: v.sealed }), enabled: v.enabled !== false })),
  }));
  const clean = items => plainList(items).map(it => {
    if (it.type === 'folder') return { ...newFolder(str(it.name)), ...it, id: str(it.id) || newId(), items: clean(it.items) };
    const base = newRequest(protocolOf(it.protocol).id, str(it.name));
    return {
      ...base, ...it, id: str(it.id) || newId(), type: 'request',
      headers: plainList(it.headers), checks: plainList(it.checks), extract: plainList(it.extract),
      body: { ...base.body, ...(it.body && typeof it.body === 'object' ? it.body : {}) },
      scripts: { pre: str(it.scripts?.pre), test: str(it.scripts?.test) },
      values: { ...base.values, ...(it.values && typeof it.values === 'object' ? it.values : {}) },
    };
  });
  c.items = clean(raw.items);
  return c;
}

/** What is written in the file: secret values never in clear (only `sealed`). */
export function collectionText(c) {
  const out = {
    ...c,
    environments: (c.environments ?? []).map(e => ({
      ...e, variables: e.variables.map(v => (v.secret ? { key: v.key, value: '', secret: true, ...(v.sealed && { sealed: v.sealed }), enabled: v.enabled !== false } : { key: v.key, value: v.value, enabled: v.enabled !== false })),
    })),
  };
  return `${JSON.stringify(out, null, 2)}\n`;
}

/** The variables of rows as { key: value } (enabled, not secret). */
export const varsOf = rows => Object.fromEntries(plainList(rows).filter(r => r.enabled !== false && r.key && !r.secret).map(r => [r.key, str(r.value)]));

/** An environment as the kernel wants it: { values, secrets: { name: sealed } }. */
export function environmentBody(env) {
  if (!env) return { values: {}, secrets: {} };
  const rows = plainList(env.variables).filter(v => v.enabled !== false && v.key);
  return { values: varsOf(rows), secrets: Object.fromEntries(rows.filter(v => v.secret && v.sealed).map(v => [v.key, v.sealed])) };
}

/** The variables a request can see, for completion and the warning on unknown ones: [{ key, value, scope, secret }]. */
export function knownVars(collection, env, globals) {
  const out = new Map();
  for (const [scope, rows] of [['globals', globals], ['collection', collection?.variables], ['environment', env?.variables]]) {
    for (const r of plainList(rows)) if (r.key && r.enabled !== false) out.set(r.key, { key: r.key, value: r.secret ? '' : str(r.value), scope, secret: !!r.secret });
  }
  return [...out.values()];
}

/** Request-level checks: a new empty one. */
export const newCheck = () => ({ id: newId(), enabled: true, source: 'status', path: '', op: 'eq', value: '200' });
export const newExtract = () => ({ id: newId(), enabled: true, var: '', source: 'json', path: '', scope: 'environment' });

/** URL ⇄ query rows: the address keeps the query, the table shows it. */
export function paramsOf(url) {
  const q = str(url).indexOf('?');
  if (q < 0) return [];
  const hash = str(url).indexOf('#', q);
  const query = str(url).slice(q + 1, hash < 0 ? undefined : hash);
  if (!query) return [];
  return query.split('&').map(part => {
    const i = part.indexOf('=');
    const dec = s => { try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch { return s; } };
    return { key: dec(i < 0 ? part : part.slice(0, i)), value: i < 0 ? '' : dec(part.slice(i + 1)), enabled: true };
  });
}

export function withParams(url, rows) {
  const u = str(url);
  const q = u.indexOf('?');
  const hash = u.indexOf('#', q < 0 ? 0 : q);
  const base = q < 0 ? (hash < 0 ? u : u.slice(0, hash)) : u.slice(0, q);
  // {{variables}} stay readable: only what would break the address is encoded
  const enc = s => str(s).replace(/[%&#=+ ]/g, c => (c === ' ' ? '%20' : encodeURIComponent(c)));
  const query = rows.filter(r => r.enabled !== false && (r.key || r.value)).map(r => (r.value === '' ? enc(r.key) : `${enc(r.key)}=${enc(r.value)}`)).join('&');
  return `${base}${query ? `?${query}` : ''}${hash < 0 ? '' : u.slice(hash)}`;
}

/** The names of {{variables}} in a text. */
export const varNames = text => [...str(text).matchAll(/\{\{\s*([^{}\s][^{}]*?)\s*\}\}/g)].map(m => m[1]);

/** Puts the known variables in a text (for «Copia come codice» and the preview of the address): secrets stay {{name}}. */
export function resolveText(text, vars) {
  const map = new Map(vars.filter(v => !v.secret).map(v => [v.key, v.value]));
  let out = str(text);
  for (let i = 0; i < 5; i++) {
    const next = out.replace(/\{\{\s*([^{}\s][^{}]*?)\s*\}\}/g, (all, n) => (map.has(n) ? map.get(n) : all));
    if (next === out) break;
    out = next;
  }
  return out;
}
