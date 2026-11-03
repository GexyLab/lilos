import { str, isObj, list, on, DEFAULT_TYPES, addQuery } from './common.js';
import { graphqlText, formEncode } from './code-util.js';
import { curl, httpie, powershell, raw } from './code-shell.js';
import { fetchJs, nodeJs, python, go, java, csharp, php } from './code-langs.js';

/**
 * «Copia come codice»: a request as code for another tool or language. The request comes with
 * its variables already put in by the app, but for the secret ones, which stay `{{name}}`: they
 * are written as they are, never guessed. The auth is written as what it sends (headers, the
 * query) where it is that simple; digest, AWS and OAuth 2.0 grants the way each tool does them,
 * or as a comment when it has no way.
 *
 *   toCode(language, request, { auth? }) → string   (auth: the effective one when the request's is 'inherit')
 *   toCurl(request, { windows?, auth? }) → string
 */
export const LANGUAGES = [
  { id: 'curl', label: 'cURL', syntax: 'shell' },
  { id: 'curl-windows', label: 'cURL (cmd di Windows)', syntax: 'bat' },
  { id: 'httpie', label: 'HTTPie', syntax: 'shell' },
  { id: 'powershell', label: 'PowerShell (Invoke-RestMethod)', syntax: 'powershell' },
  { id: 'fetch', label: 'JavaScript (fetch)', syntax: 'javascript' },
  { id: 'node', label: 'Node.js (fetch)', syntax: 'javascript' },
  { id: 'python', label: 'Python (requests)', syntax: 'python' },
  { id: 'go', label: 'Go (net/http)', syntax: 'go' },
  { id: 'java', label: 'Java (java.net.http)', syntax: 'java' },
  { id: 'csharp', label: 'C# (HttpClient)', syntax: 'csharp' },
  { id: 'php', label: 'PHP (cURL)', syntax: 'php' },
  { id: 'raw', label: 'HTTP grezzo', syntax: 'http' },
];

const WRITERS = {
  curl: p => curl(p, false), 'curl-windows': p => curl(p, true), httpie, powershell, raw,
  fetch: fetchJs, node: nodeJs, python, go, java, csharp, php,
};

/**
 * What every writer starts from:
 *   { method, url, headers: [{ key, value }], body: null | { type: 'text', text } | { type: 'form', fields: [[k, v]], text }
 *     | { type: 'multipart', fields: [{ key, value, file?, contentType? }] } | { type: 'file', path },
 *     basic, digest: { user, password } | null, aws4: { accessKey, secretKey, region, service } | null,
 *     notes: [string], insecure, follow, timeoutMs }
 */
export function prepare(request, opts = {}) {
  const r = isObj(request) ? request : {};
  const b = isObj(r.body) ? r.body : { kind: 'none' };
  const graphql = r.protocol === 'graphql' || b.kind === 'graphql';
  const s = isObj(r.settings) ? r.settings : {};
  const p = {
    method: (str(r.method) || (graphql ? 'POST' : 'GET')).toUpperCase(),
    url: str(r.url).trim(),
    headers: list(r.headers).filter(h => on(h) && str(h.key).trim()).map(h => ({ key: str(h.key).trim(), value: str(h.value) })),
    body: null, basic: null, digest: null, aws4: null, notes: [],
    insecure: s.verify === false, follow: s.followRedirects !== false, timeoutMs: Number(s.timeoutMs) > 0 ? Number(s.timeoutMs) : 0,
  };
  const has = name => p.headers.some(h => h.key.toLowerCase() === name.toLowerCase());
  const drop = name => { p.headers = p.headers.filter(h => h.key.toLowerCase() !== name.toLowerCase()); };
  const set = (key, value) => { drop(key); p.headers.push({ key, value }); };

  const a = isObj(opts.auth) ? opts.auth : isObj(r.auth) ? r.auth : { type: 'none' };
  const prefix = str(a.prefix) || 'Bearer';
  switch (a.type) {
    case 'basic': p.basic = { user: str(a.user), password: str(a.password) }; break;
    case 'digest': p.digest = { user: str(a.user), password: str(a.password) }; break;
    case 'bearer': set('Authorization', `${prefix} ${str(a.token)}`); break;
    case 'apikey':
      if (!str(a.key).trim()) break;
      if (a.in === 'query') p.url = addQuery(p.url, [[str(a.key).trim(), str(a.value)]]);
      else set(str(a.key).trim(), str(a.value));
      break;
    case 'aws4':
      p.aws4 = { accessKey: str(a.accessKey), secretKey: str(a.secretKey), region: str(a.region) || 'us-east-1', service: str(a.service) || 'execute-api' };
      if (str(a.sessionToken)) set('X-Amz-Security-Token', str(a.sessionToken));
      break;
    case 'oauth2':
      if (a.grant) {
        p.notes.push(`OAuth 2.0 (${a.grant}): get an access token${str(a.tokenUrl) ? ` from ${str(a.tokenUrl)}` : ''} and put it in place of <token>`);
        set('Authorization', `${prefix} <token>`);
      } else if (str(a.token)) {
        set('Authorization', `${prefix} ${str(a.token)}`);
      } else {
        p.notes.push('OAuth 2.0: put the access token in place of <token>');
        set('Authorization', `${prefix} <token>`);
      }
      break;
    default:
  }

  const kind = graphql ? 'graphql' : str(b.kind);
  if (kind === 'graphql') {
    p.body = { type: 'text', text: graphqlText(b) };
    if (!has('content-type')) p.headers.push({ key: 'Content-Type', value: DEFAULT_TYPES.graphql });
  } else if (['text', 'json', 'xml', 'html', 'javascript'].includes(kind)) {
    p.body = { type: 'text', text: str(b.text) };
    if (!has('content-type')) p.headers.push({ key: 'Content-Type', value: DEFAULT_TYPES[kind] });
  } else if (kind === 'form') {
    const fields = list(b.fields).filter(on).map(f => [str(f.key), str(f.value)]);
    p.body = { type: 'form', fields, text: fields.map(([k, v]) => `${formEncode(k)}=${formEncode(v)}`).join('&') };
    if (!has('content-type')) p.headers.push({ key: 'Content-Type', value: DEFAULT_TYPES.form });
  } else if (kind === 'multipart') {
    // each tool writes its own boundary: a Content-Type with another one would break the body
    p.headers = p.headers.filter(h => !(h.key.toLowerCase() === 'content-type' && /^multipart\//i.test(h.value)));
    p.body = {
      type: 'multipart',
      fields: list(b.fields).filter(on).map(f => (f.type === 'file'
        ? { key: str(f.key), file: str(f.file) || str(f.fileName) || 'file', contentType: str(f.contentType) }
        : { key: str(f.key), value: str(f.value), contentType: str(f.contentType) })),
    };
  } else if (kind === 'file') {
    p.body = { type: 'file', path: str(b.file) || str(b.fileName) || 'file' };
  }
  // What goes into a shell or a comment line: a method is a word, a note or a path one line
  if (!/^[A-Z][A-Z0-9_-]{0,23}$/.test(p.method)) {
    p.notes.push(`Method «${p.method.slice(0, 40)}» is not valid: GET instead`);
    p.method = 'GET';
  }
  const flat = v => (typeof v === 'string' ? v.replace(/[\r\n\u2028\u2029]+/g, ' ') : v);
  p.notes = p.notes.map(flat);
  if (p.body?.path) p.body.path = flat(p.body.path);
  if (Array.isArray(p.body?.fields)) for (const f of p.body.fields) if (f.file !== undefined) f.file = flat(f.file);
  return p;
}

export function toCode(language, request, opts = {}) {
  const write = WRITERS[language];
  if (!write) throw new Error(`Linguaggio non supportato: ${language}`);
  return write(prepare(request, opts));
}

export function toCurl(request, opts = {}) {
  return toCode(opts.windows ? 'curl-windows' : 'curl', request, opts);
}
