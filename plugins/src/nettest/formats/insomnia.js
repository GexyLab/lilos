import {
  str, isObj, list, newCollection, newFolder, newRequest, newEnvironment, header, variable, secretVariable, addVariable,
  baseName, kindOfType, fixHeaders, formFields, addQuery, nameOf,
} from './common.js';

/**
 * Insomnia: the v4 export (JSON: resources linked by parentId) and the v5 one (YAML: a tree of
 * `collection` with `children`). The workspace's base environment becomes the collection's
 * variables, its sub-environments NetTest's environments. Insomnia's templates ({{ _.name }},
 * {% uuid %}…) become NetTest's variables where there is one; its scripts use `insomnia.` the way
 * Postman's use `pm.`, so they are read with `pm.`.
 */
export const isInsomnia4 = j => isObj(j) && j._type === 'export' && Array.isArray(j.resources);
export const isInsomnia5 = j => isObj(j) && /^collection\.insomnia\.rest\/5/.test(str(j.type));

// ---------- Templates ----------

const NOW = { unix: '{{$timestamp}}', 'iso-8601': '{{$isoTimestamp}}' };

function template(s, warn) {
  let out = str(s);
  if (!out.includes('{')) return out;
  out = out.replace(/\{\{\s*_\.([\w.-]+)\s*\}\}/g, '{{$1}}')
    .replace(/\{\{\s*_\[\s*['"]([^'"]+)['"]\s*\]\s*\}\}/g, '{{$1}}')
    .replace(/\{\{\s*([\w.-]+)\s*\}\}/g, '{{$1}}')
    .replace(/\{%\s*uuid\b[^%]*%\}/g, '{{$guid}}')
    .replace(/\{%\s*now\s+'([\w-]+)'[^%]*%\}/g, (all, kind) => NOW[kind] ?? all);
  if (/\{%/.test(out)) warn.add('Tag {% … %} di Insomnia (risposte, file, hash…) lasciati come sono: vanno sostituiti');
  if (/\{\{\s*vault\./.test(out)) warn.add('Il vault di Insomnia non si importa: le variabili {{vault.…}} vanno scritte');
  return out;
}

const deep = (v, fn) => (typeof v === 'string' ? fn(v) : Array.isArray(v) ? v.map(x => deep(x, fn)) : isObj(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x, fn)])) : v);

const script = s => str(s).replace(/\binsomnia\./g, 'pm.');

// ---------- One request, one folder ----------

function authFromInsomnia(a, where, warn) {
  if (!isObj(a) || !a.type) return { type: 'inherit' };
  if (a.disabled) return { type: 'none' };
  const s = k => str(a[k]);
  switch (a.type) {
    case 'none': return { type: 'none' };
    case 'basic': return { type: 'basic', user: s('username'), password: s('password') };
    case 'digest': return { type: 'digest', user: s('username'), password: s('password') };
    case 'bearer': return { type: 'bearer', token: s('token'), ...(s('prefix') && s('prefix') !== 'Bearer' && { prefix: s('prefix') }) };
    case 'apikey':
      if (s('addTo') === 'cookie') return { type: 'apikey', key: 'Cookie', value: `${s('key')}=${s('value')}`, in: 'header' };
      return { type: 'apikey', key: s('key'), value: s('value'), in: s('addTo') === 'queryParams' ? 'query' : 'header' };
    case 'iam': return { type: 'aws4', accessKey: s('accessKeyId'), secretKey: s('secretAccessKey'), region: s('region'), service: s('service'), ...(s('sessionToken') && { sessionToken: s('sessionToken') }) };
    case 'oauth2': {
      const prefix = s('tokenPrefix');
      const base = { type: 'oauth2', ...(prefix && prefix !== 'Bearer' && { prefix }) };
      const common = { tokenUrl: s('accessTokenUrl'), clientId: s('clientId'), clientSecret: s('clientSecret'), scope: s('scope'), send: a.credentialsInBody ? 'body' : 'basic', ...(s('audience') && { audience: s('audience') }) };
      if (a.grantType === 'client_credentials') return { ...base, grant: 'client_credentials', ...common };
      if (a.grantType === 'password') return { ...base, grant: 'password', ...common, username: s('username'), password: s('password') };
      if (a.grantType === 'authorization_code') {
        warn.group('OAuth 2.0: serve un nuovo accesso', where);
        return { ...base, grant: 'authorization_code', ...common, authorizeUrl: s('authorizationUrl'), tokens: null };
      }
      return { ...base, token: '' };
    }
    default:
      warn.group(`Autenticazione non supportata (${a.type}), importata come nessuna`, where);
      return { type: 'none' };
  }
}

function bodyFromInsomnia(b, where, warn) {
  if (!isObj(b)) return { kind: 'none' };
  const mime = str(b.mimeType).split(';')[0].trim().toLowerCase();
  if (!mime && !str(b.text)) return { kind: 'none' };
  const fields = list(b.params).filter(p => p && p.name !== undefined);
  if (mime === 'application/x-www-form-urlencoded') {
    return { kind: 'form', fields: fields.length ? fields.map(p => ({ key: str(p.name), value: str(p.value), type: 'text', enabled: !p.disabled })) : formFields(b.text) };
  }
  if (mime === 'multipart/form-data') {
    return {
      kind: 'multipart',
      fields: fields.map(p => (p.type === 'file'
        ? { key: str(p.name), value: '', type: 'file', file: '', fileName: baseName(p.fileName), enabled: !p.disabled }
        : { key: str(p.name), value: str(p.value), type: 'text', enabled: !p.disabled })),
    };
  }
  if (mime === 'application/graphql') {
    let g = {};
    try { g = JSON.parse(str(b.text) || '{}'); } catch { g = { query: str(b.text) }; }
    const vars = g.variables === undefined || g.variables === null ? '' : typeof g.variables === 'string' ? g.variables : JSON.stringify(g.variables, null, 2);
    return { kind: 'graphql', query: str(g.query), variables: vars, ...(g.operationName && { operationName: str(g.operationName) }) };
  }
  if (mime === 'application/octet-stream' || (b.fileName && !str(b.text))) return { kind: 'file', file: '', fileName: baseName(b.fileName) };
  const kind = kindOfType(mime);
  if (kind === 'form' || kind === 'multipart') warn.group('Corpo letto come testo', where);
  return { kind: kind && kind !== 'form' && kind !== 'multipart' ? kind : 'text', text: str(b.text) };
}

function followOf(v) {
  if (v === 'on' || v === true) return { followRedirects: true };
  if (v === 'off' || v === false) return { followRedirects: false };
  return {};
}

/** Path parameters (:id), Insomnia 9+: their value, or a {{variable}}. */
function pathParams(url, rows) {
  const values = Object.fromEntries(list(rows).filter(r => r && r.name).map(r => [str(r.name), str(r.value)]));
  const q = url.search(/[?#]/);
  const head = q < 0 ? url : url.slice(0, q);
  if (!Object.keys(values).length) return url;
  return head.replace(/\/:([A-Za-z_][\w.-]*)(?=\/|$)/g, (all, n) => (Object.hasOwn(values, n) ? `/${values[n] || `{{${n}}}`}` : all)) + (q < 0 ? '' : url.slice(q));
}

function requestFromInsomnia(r, warn, { v5 = false } = {}) {
  const where = `«${str(r.name) || 'senza nome'}»`;
  const method = (str(r.method) || 'GET').toUpperCase();
  let url = pathParams(str(r.url), r.pathParameters);
  const query = list(r.parameters).filter(p => p && str(p.name));
  url = addQuery(url, query.filter(p => !p.disabled).map(p => [str(p.name), str(p.value)]));
  const headers = list(r.headers).filter(h => h && str(h.name)).map(h => header(h.name, h.value, !h.disabled));
  const body = bodyFromInsomnia(r.body, where, warn);
  const settings = v5 ? { ...followOf(r.settings?.followRedirects), ...(r.settings?.rejectUnauthorized === false && { verify: false }) } : followOf(r.settingFollowRedirects);
  const scripts = v5 ? { pre: script(r.scripts?.preRequest), test: script(r.scripts?.afterResponse) } : { pre: script(r.preRequestScript), test: script(r.afterResponseScript) };
  const out = newRequest({
    name: str(r.name) || nameOf(method, url),
    protocol: body.kind === 'graphql' ? 'graphql' : 'http',
    method, url, headers: fixHeaders(headers, body), body,
    auth: authFromInsomnia(r.authentication, where, warn),
    settings,
  });
  Object.assign(out, deep({ url: out.url, headers: out.headers, body: out.body, auth: out.auth }, s => template(s, warn)));
  out.scripts = scripts;
  if (query.some(p => p.disabled)) out.params = query.map(p => ({ key: str(p.name), value: template(p.value, warn), enabled: !p.disabled }));
  if (str(r.description)) out.description = str(r.description);
  return out;
}

function folderFromInsomnia(g, collection, warn, v5) {
  const where = `«${str(g.name) || 'cartella'}»`;
  const folder = newFolder(g.name, {
    auth: deep(authFromInsomnia(g.authentication, where, warn), s => template(s, warn)),
    scripts: v5 ? { pre: script(g.scripts?.preRequest), test: script(g.scripts?.afterResponse) } : { pre: script(g.preRequestScript), test: script(g.afterResponseScript) },
  });
  if (str(g.description)) folder.description = str(g.description);
  const vars = flatten(g.environment);
  if (vars.length) {
    for (const v of vars) addVariable(collection.variables, variable(v.key, template(v.value, warn)));
    warn.group('Variabili di cartella spostate nella collezione', where);
  }
  if (list(g.headers).length) warn.group('Header di cartella non importati', where);
  return folder;
}

/** { a: { b: 1 } } → [{ key: 'a.b', value: '1' }] ({{ _.a.b }} in Insomnia, {{a.b}} here). */
function flatten(data, prefix = '') {
  const out = [];
  if (!isObj(data)) return out;
  for (const [k, v] of Object.entries(data)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (isObj(v)) out.push(...flatten(v, key));
    else out.push({ key, value: Array.isArray(v) ? JSON.stringify(v) : str(v) });
  }
  return out;
}

/** An environment's rows: the kv form (Insomnia 9+, with secrets) or the JSON one. */
function envRows(env, warn) {
  if (Array.isArray(env?.kvPairData) && env.environmentType === 'kv') {
    return env.kvPairData.filter(p => p && str(p.name)).map(p => (p.type === 'secret' ? secretVariable(p.name, p.enabled !== false) : variable(p.name, template(p.value, warn), p.enabled !== false)));
  }
  return flatten(env?.data).map(v => variable(v.key, template(v.value, warn)));
}

// ---------- v4 ----------

export function importInsomnia4(json, { name } = {}, warn) {
  const res = json.resources.filter(isObj);
  const byParent = new Map();
  for (const r of res) {
    const k = str(r.parentId);
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k).push(r);
  }
  for (const rows of byParent.values()) rows.sort((a, b) => (Number(a.metaSortKey) || 0) - (Number(b.metaSortKey) || 0));
  const workspaces = res.filter(r => r._type === 'workspace');
  const c = newCollection(name || str(workspaces[0]?.name) || 'Insomnia');
  const environments = [];
  const skipped = new Set();

  const walk = parentId => {
    const out = [];
    for (const r of byParent.get(parentId) ?? []) {
      if (r._type === 'request_group') {
        const f = folderFromInsomnia(r, c, warn, false);
        f.items = walk(r._id);
        out.push(f);
      } else if (r._type === 'request') {
        out.push(requestFromInsomnia(r, warn));
      } else if (['grpc_request', 'websocket_request', 'socketio_request'].includes(r._type)) {
        skipped.add(r._type.replace('_request', ''));
      }
    }
    return out;
  };
  const roots = workspaces.length ? workspaces : [{ _id: '__root', name: c.name }];
  // The base environments first: their variables come before the folders'
  for (const ws of roots) {
    for (const base of (byParent.get(ws._id) ?? []).filter(r => r._type === 'environment')) {
      for (const v of envRows(base, warn)) addVariable(c.variables, v);
      for (const sub of (byParent.get(base._id) ?? []).filter(r => r._type === 'environment')) environments.push(newEnvironment(sub.name, envRows(sub, warn)));
    }
  }
  for (const ws of roots) {
    const items = walk(ws._id);
    // Several workspaces in one file: a folder each
    if (roots.length > 1) {
      const f = newFolder(ws.name);
      f.items = items;
      c.items.push(f);
    } else {
      c.items.push(...items);
    }
  }
  if (skipped.size) warn.add(`Richieste ${[...skipped].join(', ')} di Insomnia non importate`);
  if (res.some(r => r._type === 'api_spec' && str(r.contents))) warn.add('La specifica API del progetto non si importa da qui: importala come file OpenAPI');
  return { collection: c, environments };
}

// ---------- v5 (YAML) ----------

export function importInsomnia5(doc, { name } = {}, warn) {
  const c = newCollection(name || str(doc.name) || 'Insomnia');
  const walk = items => {
    const out = [];
    for (const it of list(items)) {
      if (!isObj(it)) continue;
      if (Array.isArray(it.children)) {
        const f = folderFromInsomnia(it, c, warn, true);
        f.items = walk(it.children);
        out.push(f);
      } else if (it.url !== undefined || it.method !== undefined) {
        out.push(requestFromInsomnia(it, warn, { v5: true }));
      }
    }
    return out;
  };
  c.items = walk(doc.collection);
  const environments = [];
  const base = doc.environments;
  if (isObj(base)) {
    for (const v of envRows(base, warn)) addVariable(c.variables, v);
    for (const sub of list(base.subEnvironments)) environments.push(newEnvironment(sub.name, envRows(sub, warn)));
  }
  return { collection: c, environments };
}
