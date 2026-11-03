import { str, isObj, list, on, newId } from './common.js';

/**
 * NetTest → Postman v2.1: what importPostman reads back the same. Postman has no checks without
 * code nor «save to variable»: they become lines of the test script (pm.test, pm.environment.set).
 * Requests of other protocols (WebSocket, TCP, gRPC…) are left out; secret values never go out.
 */
const SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';
const RAW_LANGUAGE = { json: 'json', xml: 'xml', html: 'html', javascript: 'javascript', text: 'text' };

const kv = obj => Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([key, value]) => ({ key, value: typeof value === 'boolean' ? value : str(value), type: typeof value === 'boolean' ? 'boolean' : 'string' }));

export function authToPostman(a) {
  if (!isObj(a) || !a.type || a.type === 'inherit') return undefined;
  switch (a.type) {
    case 'none': return { type: 'noauth' };
    case 'basic': return { type: 'basic', basic: kv({ username: a.user, password: a.password }) };
    case 'digest': return { type: 'digest', digest: kv({ username: a.user, password: a.password }) };
    case 'bearer': return { type: 'bearer', bearer: kv({ token: a.token }) };
    case 'apikey': return { type: 'apikey', apikey: kv({ key: a.key, value: a.value, in: a.in === 'query' ? 'query' : 'header' }) };
    case 'aws4': return { type: 'awsv4', awsv4: kv({ accessKey: a.accessKey, secretKey: a.secretKey, region: a.region, service: a.service, sessionToken: a.sessionToken }) };
    case 'oauth2': {
      const grant = { client_credentials: 'client_credentials', password: 'password_credentials', authorization_code: 'authorization_code' }[a.grant];
      const fields = {
        // a sign-in's tokens are sealed by the kernel: they never leave lilOS
        ...(!a.grant && { accessToken: a.token }),
        ...(grant && { grant_type: grant, accessTokenUrl: a.tokenUrl, clientId: a.clientId, clientSecret: a.clientSecret, scope: a.scope, client_authentication: a.send === 'body' ? 'body' : 'header' }),
        ...(a.grant === 'password' && { username: a.username, password: a.password }),
        ...(a.grant === 'authorization_code' && { authUrl: a.authorizeUrl }),
        headerPrefix: a.prefix, addTokenTo: 'header',
      };
      const out = { type: 'oauth2', oauth2: kv(fields) };
      if (a.audience) out.oauth2.push({ key: 'tokenRequestParams', value: [{ key: 'audience', value: str(a.audience), enabled: true, send_as: 'request_body' }], type: 'any' });
      return out;
    }
    default: return undefined;
  }
}

/** An address as Postman's url object (it reads `raw`; the parts help its editor). */
export function urlToPostman(raw) {
  const u = str(raw);
  const out = { raw: u };
  const hashAt = u.indexOf('#');
  const noHash = hashAt < 0 ? u : u.slice(0, hashAt);
  if (hashAt >= 0) out.hash = u.slice(hashAt + 1);
  const qAt = noHash.indexOf('?');
  let rest = qAt < 0 ? noHash : noHash.slice(0, qAt);
  const scheme = /^([a-z][a-z0-9+.-]*):\/\//i.exec(rest);
  if (scheme) { out.protocol = scheme[1]; rest = rest.slice(scheme[0].length); }
  const slash = rest.indexOf('/');
  let host = slash < 0 ? rest : rest.slice(0, slash);
  const port = /:(\d+|\{\{[^{}]+\}\})$/.exec(host);
  if (port) { out.port = port[1]; host = host.slice(0, port.index); }
  out.host = host.startsWith('{{') ? [host] : host.split('.').filter(Boolean);
  if (slash >= 0) out.path = rest.slice(slash + 1).split('/');
  if (qAt >= 0) {
    out.query = noHash.slice(qAt + 1).split('&').filter(Boolean).map(p => {
      const i = p.indexOf('=');
      return { key: i < 0 ? p : p.slice(0, i), value: i < 0 ? null : p.slice(i + 1) };
    });
  }
  return out;
}

function bodyToPostman(b) {
  if (!isObj(b) || !b.kind || b.kind === 'none') return undefined;
  if (RAW_LANGUAGE[b.kind]) return { mode: 'raw', raw: str(b.text), options: { raw: { language: RAW_LANGUAGE[b.kind] } } };
  if (b.kind === 'form') return { mode: 'urlencoded', urlencoded: list(b.fields).map(f => ({ key: str(f.key), value: str(f.value), type: 'text', ...(!on(f) && { disabled: true }) })) };
  if (b.kind === 'multipart') {
    return {
      mode: 'formdata',
      formdata: list(b.fields).map(f => ({
        key: str(f.key),
        ...(f.type === 'file' ? { type: 'file', src: str(f.file) || str(f.fileName) } : { type: 'text', value: str(f.value) }),
        ...(f.contentType && { contentType: str(f.contentType) }),
        ...(!on(f) && { disabled: true }),
      })),
    };
  }
  if (b.kind === 'file') return { mode: 'file', file: { src: str(b.file) || str(b.fileName) } };
  if (b.kind === 'graphql') return { mode: 'graphql', graphql: { query: str(b.query), variables: str(b.variables) } };
  return undefined;
}

// ---------- Checks and «save to variable» as pm code ----------

/** 'data.items[0].id' → '.data.items[0].id' (bracketed when a key is not a name). */
function access(path) {
  let out = '';
  const p = str(path).trim().replace(/^\$\.?/, '');
  for (const m of p.matchAll(/([^.[\]]+)|\[(-?\d+)\]|\[['"]([^'"]+)['"]\]/g)) {
    if (m[2] !== undefined) out += Number(m[2]) < 0 ? `.at(${m[2]})` : `[${m[2]}]`;
    else {
      const k = m[1] ?? m[3];
      out += /^[A-Za-z_$][\w$]*$/.test(k) ? `.${k}` : `[${JSON.stringify(k)}]`;
    }
  }
  return out;
}

function source(s, path) {
  switch (s) {
    case 'status': return 'pm.response.code';
    case 'time': return 'pm.response.responseTime';
    case 'size': return 'pm.response.responseSize';
    case 'header': return `pm.response.headers.get(${JSON.stringify(str(path))})`;
    case 'body': return 'pm.response.text()';
    case 'json': return `pm.response.json()${access(path)}`;
    default: return null;
  }
}

function checkLine(c) {
  const a = source(c.source, c.path);
  if (!a) return null;
  const v = JSON.stringify(str(c.value));
  const n = `Number(${v})`;
  const expect = {
    eq: `pm.expect(String(${a})).to.equal(${v})`,
    ne: `pm.expect(String(${a})).to.not.equal(${v})`,
    lt: `pm.expect(Number(${a})).to.be.below(${n})`,
    le: `pm.expect(Number(${a})).to.be.at.most(${n})`,
    gt: `pm.expect(Number(${a})).to.be.above(${n})`,
    ge: `pm.expect(Number(${a})).to.be.at.least(${n})`,
    contains: `pm.expect(String(${a})).to.include(${v})`,
    notContains: `pm.expect(String(${a})).to.not.include(${v})`,
    exists: `pm.expect(${a}).to.exist`,
    notExists: `pm.expect(${a}).to.not.exist`,
    matches: `pm.expect(String(${a})).to.match(new RegExp(${v}))`,
    in: `pm.expect(${JSON.stringify(str(c.value).split(',').map(x => x.trim()))}).to.include(String(${a}))`,
    type: `pm.expect(${a}).to.be.a(${v})`,
    empty: `pm.expect(${a}).to.be.empty`,
    notEmpty: `pm.expect(${a}).to.not.be.empty`,
  }[c.op];
  if (!expect) return null;
  const label = str(c.label) || `${c.source}${c.path ? ` ${c.path}` : ''} ${c.op}${c.value !== undefined && c.value !== '' ? ` ${c.value}` : ''}`;
  return `pm.test(${JSON.stringify(label)}, () => { ${expect}; });`;
}

function extractLine(r) {
  let a = source(r.source, r.path);
  if (!a || !str(r.var)) return null;
  if (r.regex) a = `(String(${a}).match(new RegExp(${JSON.stringify(str(r.regex))})) || [])[1]`;
  const scope = r.scope === 'collection' ? 'pm.collectionVariables' : r.scope === 'globals' ? 'pm.globals' : 'pm.environment';
  return `${scope}.set(${JSON.stringify(str(r.var))}, ${a});`;
}

function testScript(item) {
  const lines = [
    ...list(item.checks).filter(on).map(checkLine),
    ...list(item.extract).filter(on).map(extractLine),
  ].filter(Boolean);
  const own = str(item.scripts?.test);
  if (!lines.length) return own;
  return `${own ? `${own}\n\n` : ''}// NetTest: checks and «save to variable»\n${lines.join('\n')}`;
}

function events(pre, test) {
  const out = [];
  if (str(pre).trim()) out.push({ listen: 'prerequest', script: { type: 'text/javascript', exec: str(pre).split('\n') } });
  if (str(test).trim()) out.push({ listen: 'test', script: { type: 'text/javascript', exec: str(test).split('\n') } });
  return out.length ? out : undefined;
}

function requestToPostman(item) {
  const settings = isObj(item.settings) ? item.settings : {};
  const behavior = {
    ...(typeof settings.followRedirects === 'boolean' && { followRedirects: settings.followRedirects }),
    ...(Number.isInteger(settings.maxRedirects) && { maxRedirects: settings.maxRedirects }),
    ...(settings.verify === false && { strictSSL: false }),
  };
  const body = item.protocol === 'graphql' && item.body?.kind !== 'graphql' ? bodyToPostman({ ...item.body, kind: 'graphql' }) : bodyToPostman(item.body);
  const url = urlToPostman(item.url);
  // Disabled query rows live in `params`: Postman keeps them in the url object
  if (list(item.params).some(p => p.enabled === false)) url.query = list(item.params).map(p => ({ key: str(p.key), value: str(p.value), ...(p.enabled === false && { disabled: true }) }));
  const request = {
    method: str(item.method).toUpperCase() || (item.protocol === 'graphql' ? 'POST' : 'GET'),
    header: list(item.headers).filter(h => str(h.key)).map(h => ({ key: str(h.key), value: str(h.value), type: 'text', ...(!on(h) && { disabled: true }) })),
    ...(body && { body }),
    url,
    ...(authToPostman(item.auth) && { auth: authToPostman(item.auth) }),
    ...(item.description && { description: str(item.description) }),
  };
  return {
    name: str(item.name) || 'Richiesta',
    ...(events(item.scripts?.pre, testScript(item)) && { event: events(item.scripts?.pre, testScript(item)) }),
    ...(Object.keys(behavior).length && { protocolProfileBehavior: behavior }),
    request,
    response: [],
  };
}

function itemsToPostman(items) {
  const out = [];
  for (const it of list(items)) {
    if (it.type === 'folder') {
      const auth = authToPostman(it.auth);
      out.push({
        name: str(it.name) || 'Cartella',
        ...(it.description && { description: str(it.description) }),
        item: itemsToPostman(it.items),
        ...(auth && { auth }),
        ...(events(it.scripts?.pre, it.scripts?.test) && { event: events(it.scripts?.pre, it.scripts?.test) }),
      });
    } else if (it.type === 'request' && (!it.protocol || it.protocol === 'http' || it.protocol === 'graphql')) {
      out.push(requestToPostman(it));
    }
  }
  return out;
}

/** A collection as a Postman v2.1 collection (an object: JSON.stringify it to save). */
export function toPostman(collection) {
  const c = isObj(collection) ? collection : {};
  const auth = authToPostman(c.auth);
  return {
    info: { _postman_id: newId(), name: str(c.name) || 'NetTest', ...(c.description && { description: str(c.description) }), schema: SCHEMA },
    item: itemsToPostman(c.items),
    ...(auth && auth.type !== 'noauth' && { auth }),
    ...(events(c.scripts?.pre, c.scripts?.test) && { event: events(c.scripts?.pre, c.scripts?.test) }),
    variable: list(c.variables).filter(v => str(v.key)).map(v => ({ key: str(v.key), value: v.secret ? '' : str(v.value), type: v.secret ? 'secret' : 'string', ...(!on(v) && { disabled: true }) })),
  };
}

/** An environment as a Postman environment export: secret values are left empty. */
export function toPostmanEnvironment(env) {
  const e = isObj(env) ? env : {};
  return {
    id: newId(), name: str(e.name) || 'Ambiente',
    values: list(e.variables).filter(v => str(v.key)).map(v => ({ key: str(v.key), value: v.secret ? '' : str(v.value), type: v.secret ? 'secret' : 'default', enabled: on(v) })),
    _postman_variable_scope: 'environment',
    _postman_exported_using: 'lilOS NetTest',
  };
}

