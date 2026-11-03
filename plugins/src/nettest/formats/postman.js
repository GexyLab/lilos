import {
  str, isObj, list, newCollection, newFolder, newRequest, newEnvironment, header, variable, secretVariable, addVariable,
  baseName, headerValue, kindOfType, fixHeaders, nameOf,
} from './common.js';

/**
 * Postman: collections v2.0 / v2.1 and environment (or globals) exports, read into NetTest's
 * format. The scripts stay as they are (the sandbox gives them `pm`); a token, a secret value or
 * a file of the user's computer never comes along: the app asks for them again.
 */
export const isPostman = j => isObj(j) && isObj(j.info) && Array.isArray(j.item);
export const isPostmanV1 = j => isObj(j) && Array.isArray(j.requests) && Array.isArray(j.order ?? j.folders);
export const isPostmanEnv = j => isObj(j) && Array.isArray(j.values) && !j.info && (typeof j._postman_variable_scope === 'string' || typeof j.name === 'string');

const text = d => (isObj(d) ? str(d.content) : str(d));

/** Postman's auth parameters: [{ key, value }] in v2.1, { key: value } in v2.0. */
function params(auth, type) {
  const p = auth[type];
  if (Array.isArray(p)) return Object.fromEntries(p.filter(x => x && x.key).map(x => [x.key, x.value]));
  return isObj(p) ? p : {};
}

/** Postman's auth → NetTest's. No auth on an item means «from the folder» (inherit). */
export function authFromPostman(auth, where, warn) {
  if (!isObj(auth) || !auth.type) return { type: 'inherit' };
  const p = params(auth, auth.type);
  const s = k => str(p[k]);
  switch (auth.type) {
    case 'inherit': return { type: 'inherit' };
    case 'noauth': return { type: 'none' };
    case 'basic': return { type: 'basic', user: s('username'), password: s('password') };
    case 'digest': return { type: 'digest', user: s('username'), password: s('password') };
    case 'bearer': return { type: 'bearer', token: s('token') };
    case 'apikey': return { type: 'apikey', key: s('key'), value: s('value'), in: s('in') === 'query' ? 'query' : 'header' };
    case 'awsv4': return { type: 'aws4', accessKey: s('accessKey'), secretKey: s('secretKey'), region: s('region'), service: s('service'), ...(s('sessionToken') && { sessionToken: s('sessionToken') }) };
    case 'oauth2': return oauth2FromPostman(p, where, warn);
    default:
      warn.group(`Autenticazione non supportata (${auth.type}), importata come nessuna`, where);
      return { type: 'none' };
  }
}

function oauth2FromPostman(p, where, warn) {
  const s = k => str(p[k]);
  const prefix = s('headerPrefix');
  const base = { type: 'oauth2', ...(prefix && prefix !== 'Bearer' && { prefix }) };
  if (s('addTokenTo') === 'queryParams') warn.group('OAuth 2.0: il token va nell’header, non nell’indirizzo', where);
  const grant = s('grant_type');
  const common = { tokenUrl: s('accessTokenUrl'), clientId: s('clientId'), clientSecret: s('clientSecret'), scope: s('scope'), send: s('client_authentication') === 'body' ? 'body' : 'basic' };
  const audience = list(p.tokenRequestParams).find(x => x?.key === 'audience');
  if (audience) common.audience = str(audience.value);
  if (grant === 'client_credentials') return { ...base, grant: 'client_credentials', ...common };
  if (grant === 'password_credentials') return { ...base, grant: 'password', ...common, username: s('username'), password: s('password') };
  if (grant === 'authorization_code' || grant === 'authorization_code_with_pkce') {
    warn.group('OAuth 2.0: serve un nuovo accesso', where);
    return { ...base, grant: 'authorization_code', ...common, authorizeUrl: s('authUrl'), tokens: null };
  }
  if (s('accessToken')) warn.group('OAuth 2.0: token non importato, va scritto di nuovo', where);
  return { ...base, token: '' };
}

/** Postman's url (a string or { raw, protocol, host, path, query, variable }) → the address, :params as {{params}}. */
function urlFromPostman(u, where, warn) {
  if (!u) return { url: '', params: null };
  const o = typeof u === 'string' ? { raw: u } : isObj(u) ? u : {};
  let url = str(o.raw);
  const query = list(o.query).filter(q => q && q.key !== undefined);
  if (!url) {
    const host = Array.isArray(o.host) ? o.host.join('.') : str(o.host);
    const path = Array.isArray(o.path) ? o.path.map(x => (isObj(x) ? str(x.value) : str(x))).join('/') : str(o.path);
    url = `${o.protocol ? `${o.protocol}://` : ''}${host}${o.port ? `:${o.port}` : ''}${path ? `/${path.replace(/^\//, '')}` : ''}`;
    const on = query.filter(q => !q.disabled).map(q => (q.value === null || q.value === undefined ? str(q.key) : `${str(q.key)}=${str(q.value)}`));
    if (on.length) url += `?${on.join('&')}`;
    if (o.hash) url += `#${o.hash}`;
  }
  // Path variables (:id): their value when Postman has one, a {{variable}} otherwise
  const values = Object.fromEntries(list(o.variable).filter(v => v && v.key).map(v => [str(v.key), str(v.value)]));
  const q = url.search(/[?#]/);
  const head = q < 0 ? url : url.slice(0, q);
  const replaced = head.replace(/\/:([A-Za-z_][\w.-]*)(?=\/|$)/g, (_, name) => {
    if (values[name]) return `/${values[name]}`;
    warn.group('Parametri di percorso diventati {{variabili}}', `:${name}`);
    return `/{{${name}}}`;
  });
  url = replaced + (q < 0 ? '' : url.slice(q));
  // Disabled query parameters are not in the address: the app shows them from `params`
  const params = query.some(x => x.disabled)
    ? query.map(x => ({ key: str(x.key), value: str(x.value), enabled: !x.disabled }))
    : null;
  return { url, params };
}

function headersFromPostman(h) {
  if (typeof h === 'string') {
    return h.split(/\r?\n/).map(l => /^\s*([^:]+):\s*(.*)$/.exec(l)).filter(Boolean).map(m => header(m[1].trim(), m[2]));
  }
  return list(h).filter(x => x && x.key).map(x => header(x.key, x.value, !x.disabled));
}

const RAW_KINDS = { json: 'json', xml: 'xml', html: 'html', javascript: 'javascript', text: 'text' };

function bodyFromPostman(b, headers, where, warn) {
  if (!isObj(b) || !b.mode) return { kind: 'none' };
  if (b.disabled) return { kind: 'none' };
  switch (b.mode) {
    case 'raw': {
      const kind = RAW_KINDS[b.options?.raw?.language] ?? kindOfType(headerValue(headers, 'content-type'));
      return { kind: ['form', 'multipart', null].includes(kind) || !kind ? 'text' : kind, text: str(b.raw) };
    }
    case 'urlencoded':
      return { kind: 'form', fields: list(b.urlencoded).filter(f => f && f.key !== undefined).map(f => ({ key: str(f.key), value: str(f.value), type: 'text', enabled: !f.disabled })) };
    case 'formdata':
      return {
        kind: 'multipart',
        fields: list(b.formdata).filter(f => f && f.key !== undefined).map(f => {
          if (f.type === 'file') {
            const src = Array.isArray(f.src) ? f.src : [f.src];
            if (src.length > 1) warn.group('Più file in un campo: si tiene il primo', where);
            return { key: str(f.key), value: '', type: 'file', file: '', fileName: baseName(src[0]), contentType: str(f.contentType), enabled: !f.disabled };
          }
          return { key: str(f.key), value: str(f.value), type: 'text', contentType: str(f.contentType), enabled: !f.disabled };
        }),
      };
    case 'file':
      return { kind: 'file', file: '', fileName: baseName(isObj(b.file) ? b.file.src : b.file) };
    case 'graphql': {
      const g = isObj(b.graphql) ? b.graphql : {};
      const vars = typeof g.variables === 'string' ? g.variables : g.variables ? JSON.stringify(g.variables, null, 2) : '';
      return { kind: 'graphql', query: str(g.query), variables: vars, ...(g.operationName && { operationName: str(g.operationName) }) };
    }
    default:
      warn.group(`Corpo non supportato (${b.mode})`, where);
      return { kind: 'none' };
  }
}

function scriptsFromPostman(events, where, warn) {
  const out = { pre: '', test: '' };
  for (const e of list(events)) {
    const exec = e?.script?.exec;
    const code = Array.isArray(exec) ? exec.join('\n') : str(exec);
    if (!code.trim()) continue;
    if (e.disabled) { warn.group('Script disattivati, non importati', where); continue; }
    const phase = e.listen === 'prerequest' ? 'pre' : e.listen === 'test' ? 'test' : null;
    if (phase) out[phase] = out[phase] ? `${out[phase]}\n${code}` : code;
  }
  return out;
}

function settingsFromPostman(b) {
  const out = {};
  if (!isObj(b)) return out;
  if (typeof b.followRedirects === 'boolean') out.followRedirects = b.followRedirects;
  if (Number.isInteger(b.maxRedirects)) out.maxRedirects = b.maxRedirects;
  if (b.strictSSL === false) out.verify = false;
  return out;
}

function varsFromPostman(rows, where, warn) {
  const out = [];
  for (const v of list(rows)) {
    if (!v || v.key === undefined || v.key === null || v.key === '') continue;
    if (v.type === 'secret') {
      addVariable(out, secretVariable(v.key, v.disabled !== true && v.enabled !== false));
      warn.group('Variabili segrete della collezione (meglio in un ambiente)', `«${str(v.key)}»`);
    } else {
      addVariable(out, variable(v.key, v.value, v.disabled !== true && v.enabled !== false));
    }
  }
  return out;
}

function requestFromPostman(item, warn) {
  const r = typeof item.request === 'string' ? { url: item.request, method: 'GET' } : isObj(item.request) ? item.request : {};
  const where = `«${str(item.name) || 'senza nome'}»`;
  const method = (str(r.method) || 'GET').toUpperCase();
  const { url, params } = urlFromPostman(r.url, where, warn);
  const headers = headersFromPostman(r.header);
  const body = bodyFromPostman(r.body, headers, where, warn);
  const out = newRequest({
    name: str(item.name) || nameOf(method, url),
    protocol: body.kind === 'graphql' ? 'graphql' : 'http',
    method, url, headers: fixHeaders(headers, body), body,
    auth: authFromPostman(r.auth, where, warn),
    settings: settingsFromPostman(item.protocolProfileBehavior),
    scripts: scriptsFromPostman(item.event, where, warn),
  });
  if (params) out.params = params;
  const description = text(r.description) || text(item.description);
  if (description) out.description = description;
  if (list(item.response).length) warn.add('Gli esempi di risposta di Postman non si importano');
  return out;
}

function itemsFromPostman(items, collection, warn) {
  const out = [];
  for (const it of list(items)) {
    if (!isObj(it)) continue;
    if (Array.isArray(it.item)) {
      const where = `«${str(it.name) || 'cartella'}»`;
      const folder = newFolder(it.name, { auth: authFromPostman(it.auth, where, warn), scripts: scriptsFromPostman(it.event, where, warn) });
      if (text(it.description)) folder.description = text(it.description);
      // Folders have no variables in NetTest: theirs go to the collection
      const vars = varsFromPostman(it.variable, where, warn);
      if (vars.length) {
        for (const v of vars) addVariable(collection.variables, v);
        warn.group('Variabili di cartella spostate nella collezione', where);
      }
      folder.items = itemsFromPostman(it.item, collection, warn);
      out.push(folder);
    } else if (it.request !== undefined) {
      out.push(requestFromPostman(it, warn));
    }
  }
  return out;
}

export function importPostman(json, { name } = {}, warn) {
  const c = newCollection(name || str(json.info?.name));
  if (text(json.info?.description)) c.description = text(json.info.description);
  const auth = authFromPostman(json.auth, 'la collezione', warn);
  c.auth = auth.type === 'inherit' ? { type: 'none' } : auth;
  c.scripts = scriptsFromPostman(json.event, 'la collezione', warn);
  c.variables = varsFromPostman(json.variable, 'la collezione', warn);
  c.items = itemsFromPostman(json.item, c, warn);
  if (!/v2\.[01]/.test(str(json.info?.schema))) warn.add('Versione di Postman non indicata: letta come v2.1');
  return { collection: c, environments: [] };
}

/** An environment (or globals) export: a secret value is never kept, the app asks for it. */
export function importPostmanEnv(json, { name } = {}) {
  const vars = [];
  for (const v of list(json.values)) {
    if (!v || !str(v.key)) continue;
    addVariable(vars, v.type === 'secret' ? secretVariable(v.key, v.enabled !== false) : variable(v.key, v.value, v.enabled !== false));
  }
  const label = name || str(json.name) || (json._postman_variable_scope === 'globals' ? 'Globali' : 'Ambiente');
  return { collection: null, environments: [newEnvironment(label, vars)] };
}
