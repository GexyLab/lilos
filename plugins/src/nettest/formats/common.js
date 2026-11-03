/**
 * What every importer and exporter of NetTest shares: the shape of a .nettest collection (the
 * kernel's calls/runner.js says what each field is), short ids, the warnings, the kinds of body
 * by content type. Plain functions, no Node APIs: the page runs them.
 */
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** A short random id (10 characters of [0-9a-z]). */
export function newId(size = 10) {
  const bytes = new Uint8Array(size);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < size; i++) bytes[i] = Math.floor(Math.random() * 256);
  let out = '';
  for (const b of bytes) out += ALPHABET[b % 36];
  return out;
}

export const str = v => (typeof v === 'string' ? v : v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
export const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
export const list = v => (Array.isArray(v) ? v.filter(x => x !== null && x !== undefined) : []);
export const on = row => row && row.enabled !== false;

export function newCollection(name) {
  return { format: 'nettest', version: 1, name: str(name) || 'Collezione importata', variables: [], auth: { type: 'none' }, scripts: { pre: '', test: '' }, environments: [], items: [] };
}

export function newFolder(name, extra = {}) {
  return { id: newId(), type: 'folder', name: str(name) || 'Cartella', items: [], auth: { type: 'inherit' }, scripts: { pre: '', test: '' }, ...extra };
}

export function newRequest(fields = {}) {
  return {
    id: newId(), type: 'request', name: 'Richiesta', protocol: 'http', method: 'GET', url: '',
    headers: [], body: { kind: 'none' }, auth: { type: 'inherit' }, settings: {}, checks: [], extract: [],
    scripts: { pre: '', test: '' }, ...fields,
  };
}

export const header = (key, value, enabled = true) => ({ key: str(key), value: str(value), enabled: enabled !== false });
export const variable = (key, value, enabled = true) => ({ key: str(key), value: str(value), enabled: enabled !== false });
/** A secret is never kept in clear: the app asks for its value (needsValue). */
export const secretVariable = (key, enabled = true) => ({ key: str(key), value: '', secret: true, needsValue: true, enabled: enabled !== false });
export const newEnvironment = (name, variables = []) => ({ id: newId(), name: str(name) || 'Ambiente', variables });

/** Adds a variable unless one with that name is there. */
export function addVariable(rows, row) {
  if (!row.key || rows.some(r => r.key === row.key)) return;
  rows.push(row);
}

/** The last part of a path ('C:\\a\\b.png', '/x/y.json', '~/z') — what is kept of a file the app asks for again. */
export const baseName = path => str(path).split(/[\\/]/).filter(Boolean).pop() ?? '';

export const headerValue = (headers, name) => {
  const h = list(headers).find(x => on(x) && str(x.key).toLowerCase() === name.toLowerCase());
  return h ? str(h.value) : undefined;
};

/** The body kind for a content type: 'json' | 'xml' | 'html' | 'javascript' | 'text' | 'form' | 'multipart' | null. */
export function kindOfType(type) {
  const t = str(type).split(';')[0].trim().toLowerCase();
  if (!t) return null;
  if (t === 'application/json' || t.endsWith('+json') || t === 'text/json') return 'json';
  if (t === 'application/xml' || t === 'text/xml' || t.endsWith('+xml')) return 'xml';
  if (t === 'text/html' || t === 'application/xhtml+xml') return 'html';
  if (/^(application|text)\/(x-)?(javascript|ecmascript)$/.test(t)) return 'javascript';
  if (t === 'application/x-www-form-urlencoded') return 'form';
  if (t === 'multipart/form-data') return 'multipart';
  if (t.startsWith('text/')) return 'text';
  return null;
}

/** The content type the kernel sends for a body kind (calls/request.js). */
export const DEFAULT_TYPES = { text: 'text/plain', json: 'application/json', xml: 'application/xml', html: 'text/html', javascript: 'application/javascript', graphql: 'application/json', form: 'application/x-www-form-urlencoded' };

/**
 * The headers once the body is known: a multipart Content-Type copied from elsewhere holds a
 * boundary that is not ours (the kernel writes its own), so it goes off.
 */
export function fixHeaders(headers, body) {
  if (body?.kind !== 'multipart') return headers;
  return headers.map(h => (str(h.key).toLowerCase() === 'content-type' && /^multipart\//i.test(str(h.value)) ? { ...h, enabled: false } : h));
}

/** 'a=1&b=x%20y' → [{ key, value, type: 'text', enabled }] (decoded: the kernel encodes them again). */
export function formFields(text) {
  const dec = s => { try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch { return s; } };
  return str(text).split('&').filter(Boolean).map(part => {
    const i = part.indexOf('=');
    return { key: dec(i < 0 ? part : part.slice(0, i)), value: i < 0 ? '' : dec(part.slice(i + 1)), type: 'text', enabled: true };
  });
}

/** Looks like 'a=1&b=2' (what curl -d and form bodies send)? */
export const isFormText = text => /^[^=&\s{}[\]"]+=[^&]*(&[^=&\s]+=[^&]*)*$/.test(str(text).trim());

/** A query part kept readable: {{variables}} as they are, only what would break the address encoded. */
export const queryPart = s => str(s).replace(/[%&#=+ ]/g, c => (c === ' ' ? '%20' : encodeURIComponent(c)));

export function addQuery(url, pairs) {
  const parts = pairs.map(([k, v]) => (v === undefined ? queryPart(k) : `${queryPart(k)}=${queryPart(v)}`));
  if (!parts.length) return url;
  const hash = url.indexOf('#');
  const base = hash < 0 ? url : url.slice(0, hash);
  return `${base}${base.includes('?') ? (/[?&]$/.test(base) ? '' : '&') : '?'}${parts.join('&')}${hash < 0 ? '' : url.slice(hash)}`;
}

/** A name for a request without one: 'GET /users/{{id}}'. */
export function nameOf(method, url) {
  const u = str(url).replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, '').replace(/^\{\{[^{}]+\}\}/, '').split(/[?#]/)[0];
  return `${str(method).toUpperCase() || 'GET'} ${u || '/'}`.slice(0, 120);
}

/** Warnings: each text once, a few examples for those that repeat ('… e altri 3'). */
export function warnings() {
  const out = [];
  const grouped = new Map();
  return {
    add(text) { if (text && !out.includes(text)) out.push(text); },
    /** group('Parametri disabilitati in', '«Login»') → one line with the names. */
    group(head, name) {
      const g = grouped.get(head) ?? [];
      if (!g.includes(name)) g.push(name);
      grouped.set(head, g);
    },
    list() {
      const more = [...grouped].map(([head, names]) => `${head}: ${names.slice(0, 4).join(', ')}${names.length > 4 ? ` e altri ${names.length - 4}` : ''}`);
      return [...out, ...more];
    },
  };
}

// What every import goes through at the end
const DYNAMIC = new Set(['$guid', '$randomUUID', '$timestamp', '$isoTimestamp', '$randomInt', '$randomBoolean', '$randomFirstName', '$randomLastName', '$randomFullName', '$randomEmail', '$randomAlphaNumeric', '$randomHexColor']);
const SECRET_FIELDS = { basic: ['password'], digest: ['password'], bearer: ['token'], apikey: ['value'], aws4: ['secretKey', 'sessionToken'], oauth2: ['clientSecret', 'password', 'token'] };
const onlyVar = v => /^\s*\{\{[^{}]+\}\}\s*$/.test(v);
const UNSUPPORTED_SCRIPT = /\b(pm|postman|insomnia)\.(sendRequest|cookies|vault|visualizer|execution|setNextRequest|require|iterationData\.set)\b|\bpostman\.\w+|\brequire\s*\(|\btv4\b|\bjsonSchema\b/;

/**
 * Checks what an importer made: the credentials written in clear, the {{$dynamic}} variables
 * NetTest does not know, the scripts that use what its sandbox does not have.
 */
export function finish(collection, environments, warn, format) {
  const clear = [];
  const scripts = [];
  let files = 0;
  const visit = (node, label) => {
    const b = node?.body;
    if (b?.kind === 'file' && !str(b.file)) files++;
    if (b?.kind === 'multipart') files += list(b.fields).filter(f => f.type === 'file' && !str(f.file)).length;
    const a = node?.auth;
    for (const f of SECRET_FIELDS[a?.type] ?? []) if (str(a[f]) && !onlyVar(str(a[f]))) { clear.push(label); break; }
    if (UNSUPPORTED_SCRIPT.test(`${str(node?.scripts?.pre)}\n${str(node?.scripts?.test)}`)) scripts.push(label);
    for (const it of list(node?.items)) visit(it, `«${str(it.name)}»`);
  };
  if (collection) {
    visit(collection, 'la collezione');
    if (clear.length) warn.add(`Credenziali scritte in chiaro in ${clear.slice(0, 4).join(', ')}${clear.length > 4 ? ` e altri ${clear.length - 4}` : ''}: meglio una variabile segreta`);
    if (scripts.length) warn.add(`Script con funzioni che NetTest non ha (sendRequest, cookies, require…) in ${scripts.slice(0, 4).join(', ')}${scripts.length > 4 ? ` e altri ${scripts.length - 4}` : ''}`);
    const unknown = new Set();
    for (const m of JSON.stringify(collection).matchAll(/\{\{\s*(\$[A-Za-z]\w*)\s*\}\}/g)) if (!DYNAMIC.has(m[1])) unknown.add(m[1]);
    if (files) warn.add(`${files === 1 ? 'Un file da scegliere' : `${files} file da scegliere`} nei corpi delle richieste`);
    if (unknown.size) warn.add(`Variabili dinamiche che NetTest non conosce: ${[...unknown].slice(0, 6).map(n => `{{${n}}}`).join(', ')}`);
    collection.environments = environments;
  }
  const asked = [...list(collection?.variables), ...environments.flatMap(e => list(e.variables))].filter(v => v.needsValue).length;
  if (asked) warn.add(`${asked === 1 ? 'Una variabile segreta da scrivere' : `${asked} variabili segrete da scrivere`} (i valori segreti non si importano)`);
  return { format, collection, environments, warnings: warn.list() };
}
