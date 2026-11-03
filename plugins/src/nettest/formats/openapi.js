import {
  str, isObj, list, newCollection, newFolder, newRequest, newEnvironment, newId, header, variable, secretVariable, addVariable,
  kindOfType, DEFAULT_TYPES, queryPart,
} from './common.js';

/**
 * OpenAPI 3.x and Swagger 2.0 (already parsed: JSON or YAML) → a collection: a folder per tag
 * (the first of each operation), a request per operation at {{baseUrl}}, {path} parameters as
 * {{variables}}, a body made from the examples (or from the schema), the security schemes as the
 * auth (credentials in an environment, secret), and a check that the status is a documented 2xx.
 */
export const isOpenApi = j => isObj(j) && (typeof j.openapi === 'string' || typeof j.openapi === 'number') && isObj(j.paths ?? {});
export const isSwagger = j => isObj(j) && String(j.swagger ?? '').startsWith('2') && isObj(j.paths ?? {});

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const MAX_DEPTH = 8;

/** Local $refs (#/components/…, #/definitions/…); external ones are left out, with a warning. */
function resolver(doc, warn) {
  const pointer = ref => {
    let cur = doc;
    for (const raw of ref.slice(2).split('/')) {
      const k = decodeURIComponent(raw).replace(/~1/g, '/').replace(/~0/g, '~');
      if (!isObj(cur) && !Array.isArray(cur)) return undefined;
      cur = cur[k];
    }
    return cur;
  };
  return function deref(node, seen = new Set()) {
    let cur = node;
    for (let i = 0; i < 20 && isObj(cur) && typeof cur.$ref === 'string'; i++) {
      const ref = cur.$ref;
      if (!ref.startsWith('#/')) { warn.add(`Riferimenti esterni non seguiti (${ref.split('#')[0] || ref})`); return {}; }
      if (seen.has(ref)) return {};
      seen.add(ref);
      cur = pointer(ref);
    }
    return cur ?? {};
  };
}

/** An example value from a schema: its example / default / enum, or one made from its type. */
function sampler(deref) {
  const sample = (schema, { depth = 0, refs = [], forRequest = true } = {}) => {
    if (!isObj(schema)) return null;
    const ref = typeof schema.$ref === 'string' ? schema.$ref : null;
    if (ref && (refs.includes(ref) || refs.length > MAX_DEPTH)) return null;
    const s = deref(schema);
    const next = { depth: depth + 1, refs: ref ? [...refs, ref] : refs, forRequest };
    if (s.example !== undefined) return s.example;
    if (Array.isArray(s.examples) && s.examples.length) return s.examples[0];
    if (s.default !== undefined) return s.default;
    if (Array.isArray(s.enum) && s.enum.length) return s.enum[0];
    if (s.const !== undefined) return s.const;
    if (depth > MAX_DEPTH) return null;
    if (Array.isArray(s.allOf)) {
      const parts = s.allOf.map(x => sample(x, next));
      if (parts.every(p => isObj(p) || p === null)) return Object.assign({}, ...parts.filter(Boolean), isObj(s.properties) ? sample({ ...s, allOf: undefined }, next) : {});
      return parts.find(p => p !== null) ?? null;
    }
    for (const k of ['oneOf', 'anyOf']) if (Array.isArray(s[k]) && s[k].length) return sample(s[k][0], next);
    let type = Array.isArray(s.type) ? s.type.find(t => t !== 'null') : s.type;
    if (!type) type = isObj(s.properties) ? 'object' : s.items ? 'array' : null;
    switch (type) {
      case 'object': {
        const out = {};
        for (const [k, p] of Object.entries(s.properties ?? {})) {
          const pd = deref(p);
          if (forRequest && pd.readOnly) continue;
          if (!forRequest && pd.writeOnly) continue;
          out[k] = sample(p, next);
        }
        return out;
      }
      case 'array': return s.items ? [sample(s.items, next)] : [];
      case 'integer': return 0;
      case 'number': return 0;
      case 'boolean': return true;
      case 'null': return null;
      case 'string': return stringSample(s.format);
      default: return null;
    }
  };
  return sample;
}

const STRING_SAMPLES = {
  date: '2024-01-01', 'date-time': '2024-01-01T12:00:00Z', time: '12:00:00', email: 'user@example.com',
  uuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6', uri: 'https://example.com', url: 'https://example.com',
  hostname: 'example.com', ipv4: '192.0.2.1', ipv6: '2001:db8::1', password: '', byte: '', binary: '',
};
const stringSample = format => (Object.hasOwn(STRING_SAMPLES, format) ? STRING_SAMPLES[format] : 'string');

/** A sample as XML (the root named after the schema). */
function toXml(value, name, pad = '') {
  const tag = String(name || 'root').replace(/[^\w.-]/g, '_');
  if (Array.isArray(value)) return value.map(v => toXml(v, tag, pad)).join('\n');
  if (isObj(value)) return `${pad}<${tag}>\n${Object.entries(value).map(([k, v]) => toXml(v, k, `${pad}  `)).join('\n')}\n${pad}</${tag}>`;
  const text = value === null || value === undefined ? '' : String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `${pad}<${tag}>${text}</${tag}>`;
}

const asText = v => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const varName = s => str(s).replace(/[^\w.-]/g, '_') || 'value';

// ---------- Security ----------

/** The security schemes as NetTest auths, with the variables they need. */
function securityOf(doc, v3, deref, warn) {
  const raw = v3 ? doc.components?.securitySchemes : doc.securityDefinitions;
  const out = new Map();
  const apiKeys = Object.values(raw ?? {}).filter(s => deref(s).type === 'apiKey').length;
  for (const [name, schemeRaw] of Object.entries(isObj(raw) ? raw : {})) {
    const s = deref(schemeRaw);
    const vars = [];
    const plainVar = k => { vars.push(variable(k, '')); return `{{${k}}}`; };
    const secretVar = k => { vars.push(secretVariable(k)); return `{{${k}}}`; };
    let auth = null;
    const type = str(s.type);
    const scheme = str(s.scheme).toLowerCase();
    if (type === 'basic' || (type === 'http' && scheme === 'basic')) auth = { type: 'basic', user: plainVar('username'), password: secretVar('password') };
    else if (type === 'http' && scheme === 'bearer') auth = { type: 'bearer', token: secretVar('token') };
    else if (type === 'http' && scheme === 'digest') auth = { type: 'digest', user: plainVar('username'), password: secretVar('password') };
    else if (type === 'apiKey') {
      const v = apiKeys > 1 ? varName(name) : 'apiKey';
      if (s.in === 'cookie') auth = { type: 'apikey', key: 'Cookie', value: `${str(s.name)}=${secretVar(v)}`, in: 'header' };
      else auth = { type: 'apikey', key: str(s.name), value: secretVar(v), in: s.in === 'query' ? 'query' : 'header' };
    } else if (type === 'oauth2') {
      auth = oauthOf(s, v3, plainVar, secretVar, warn);
    } else if (type === 'openIdConnect') {
      warn.add('OpenID Connect: il token va scritto (o configura OAuth 2.0)');
      auth = { type: 'oauth2', token: '' };
    } else {
      warn.add(`Schema di sicurezza non supportato: ${name} (${type}${scheme ? ` ${scheme}` : ''})`);
    }
    if (auth) out.set(name, { auth, vars });
  }
  return out;
}

function oauthOf(s, v3, plainVar, secretVar, warn) {
  // Swagger 2: one flow per scheme; OpenAPI 3: several, the one that needs no browser first
  const flows = v3 ? (isObj(s.flows) ? s.flows : {}) : { [{ application: 'clientCredentials', password: 'password', accessCode: 'authorizationCode', implicit: 'implicit' }[s.flow] ?? 'implicit']: s };
  const client = () => ({ clientId: plainVar('clientId'), clientSecret: secretVar('clientSecret') });
  if (flows.clientCredentials) return { type: 'oauth2', grant: 'client_credentials', tokenUrl: str(flows.clientCredentials.tokenUrl), ...client(), scope: '', send: 'basic' };
  if (flows.password) return { type: 'oauth2', grant: 'password', tokenUrl: str(flows.password.tokenUrl), ...client(), username: plainVar('username'), password: secretVar('password'), scope: '', send: 'basic' };
  if (flows.authorizationCode) {
    warn.add('OAuth 2.0 con accesso dal browser: serve un accesso dalla richiesta');
    return { type: 'oauth2', grant: 'authorization_code', authorizeUrl: str(flows.authorizationCode.authorizationUrl), tokenUrl: str(flows.authorizationCode.tokenUrl), ...client(), scope: '', send: 'basic', tokens: null };
  }
  warn.add('OAuth 2.0 implicito: il token va scritto');
  return { type: 'oauth2', token: '' };
}

/** A security requirement ([{ scheme: [scopes] }]) as an auth, and the variables it uses. */
function authFor(requirements, schemes, warn) {
  if (!Array.isArray(requirements)) return null;
  if (!requirements.length || requirements.every(r => !isObj(r) || !Object.keys(r).length)) return { auth: { type: 'none' }, vars: [] };
  for (const req of requirements) {
    const names = Object.keys(isObj(req) ? req : {});
    const found = names.find(n => schemes.has(n));
    if (!found) continue;
    if (names.length > 1) warn.add('Requisiti di sicurezza con più schemi insieme: si usa il primo');
    const { auth, vars } = schemes.get(found);
    const scopes = list(req[found]).map(str).filter(Boolean);
    return { auth: auth.type === 'oauth2' && auth.grant && scopes.length ? { ...auth, scope: scopes.join(' ') } : auth, vars };
  }
  return null;
}

// ---------- Body ----------

const MEDIA_ORDER = [
  t => t === 'application/json', t => t.endsWith('+json'), t => t === 'application/x-www-form-urlencoded',
  t => t === 'multipart/form-data', t => t === 'application/xml' || t === 'text/xml', t => t.startsWith('text/'), () => true,
];

function pickMedia(content) {
  const types = Object.keys(isObj(content) ? content : {});
  for (const test of MEDIA_ORDER) {
    const t = types.find(x => test(x.toLowerCase()));
    if (t) return t;
  }
  return null;
}

function bodyOf(type, media, sample, deref, refName) {
  const t = type.toLowerCase();
  const schema = media.schema;
  let example = media.example;
  if (example === undefined && isObj(media.examples)) {
    const first = deref(Object.values(media.examples)[0]);
    example = first.value;
  }
  const value = example !== undefined ? example : sample(schema);
  const kind = kindOfType(t);
  const headers = [];
  if (kind === 'form' || kind === 'multipart') {
    const s = deref(schema);
    const props = isObj(s.properties) ? s.properties : {};
    const fields = Object.entries(props).map(([k, p]) => {
      const pd = deref(p);
      const binary = pd.format === 'binary' || pd.format === 'base64' || (pd.type === 'array' && ['binary', 'base64'].includes(deref(pd.items).format)) || pd.type === 'file';
      if (kind === 'multipart' && binary) return { key: k, value: '', type: 'file', file: '', fileName: '', enabled: true };
      const v = isObj(value) && value[k] !== undefined ? value[k] : sample(p);
      return { key: k, value: asText(v), type: 'text', enabled: true };
    });
    return { body: { kind, fields }, headers };
  }
  if (kind === 'json') {
    if (t !== 'application/json') headers.push(header('Content-Type', type));
    return { body: { kind: 'json', text: typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2) }, headers };
  }
  if (kind === 'xml') {
    if (t !== 'application/xml') headers.push(header('Content-Type', type));
    const root = deref(schema).xml?.name ?? refName ?? 'root';
    return { body: { kind: 'xml', text: typeof value === 'string' ? value : value === null || value === undefined ? '' : `<?xml version="1.0" encoding="UTF-8"?>\n${toXml(value, root)}` }, headers };
  }
  if (kind) {
    if (DEFAULT_TYPES[kind] !== t) headers.push(header('Content-Type', type));
    return { body: { kind, text: asText(value) }, headers };
  }
  // Binary types (octet-stream, images, PDF…): a file the user picks
  headers.push(header('Content-Type', type));
  return { body: { kind: 'file', file: '', fileName: '' }, headers };
}

// ---------- The document ----------

function serversOf(doc, v3, warn) {
  if (v3) {
    const servers = list(doc.servers).filter(s => isObj(s) && str(s.url));
    if (!servers.length) {
      warn.add('Nessun server nella specifica: completa la variabile baseUrl');
      return [{ url: '', name: '' }];
    }
    return servers.map(s => {
      let url = str(s.url);
      for (const [k, v] of Object.entries(isObj(s.variables) ? s.variables : {})) url = url.split(`{${k}}`).join(str(v?.default ?? v?.enum?.[0]));
      if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) warn.add(`Indirizzo del server relativo (${url}): completa la variabile baseUrl`);
      return { url: url.replace(/\/+$/, ''), name: str(s.description) || url };
    });
  }
  if (!doc.host) warn.add('Nessun host nella specifica: completa la variabile baseUrl');
  const schemes = list(doc.schemes).length ? doc.schemes : ['https'];
  return schemes.map(sch => {
    const url = `${doc.host ? `${sch}://${doc.host}` : ''}${str(doc.basePath)}`.replace(/\/+$/, '');
    return { url, name: url };
  });
}

/** Parameters of the path and of the operation (the operation's win), each resolved. */
function paramsOf(pathItem, op, deref) {
  const out = new Map();
  for (const p of [...list(pathItem.parameters), ...list(op.parameters)]) {
    const d = deref(p);
    if (str(d.name) && str(d.in)) out.set(`${d.in}:${d.name}`, d);
  }
  return [...out.values()];
}

/** A parameter's value as written in the request: its example, default or first enum value. */
function paramValue(p, v3, deref) {
  const s = v3 ? deref(p.schema) : p;
  const v = p.example ?? (isObj(p.examples) ? deref(Object.values(p.examples)[0]).value : undefined) ?? s.example ?? s.default ?? s.enum?.[0];
  return v === undefined ? undefined : asText(v);
}

function checkOf(responses) {
  const codes = Object.keys(isObj(responses) ? responses : {});
  const exact = codes.filter(c => /^2\d\d$/.test(c));
  if (exact.length) return { id: newId(), label: `Stato ${exact.join(', ')}`, source: 'status', path: '', op: 'in', value: exact.join(','), enabled: true };
  if (codes.some(c => /^2xx$/i.test(c))) return { id: newId(), label: 'Stato 2xx', source: 'status', path: '', op: 'matches', value: '^2\\d\\d$', enabled: true };
  return null;
}

export function importOpenApi(doc, { name } = {}, warn) {
  const v3 = isOpenApi(doc);
  const deref = resolver(doc, warn);
  const sample = sampler(deref);
  const c = newCollection(name || str(doc.info?.title) || 'API');
  if (str(doc.info?.description)) c.description = str(doc.info.description);
  const servers = serversOf(doc, v3, warn);
  c.variables.push(variable('baseUrl', servers[0].url));
  const schemes = securityOf(doc, v3, deref, warn);
  const credentials = [];
  const useVars = vars => { for (const v of vars) addVariable(credentials, { ...v }); };
  const rootAuth = authFor(doc.security, schemes, warn);
  if (rootAuth) { c.auth = rootAuth.auth; useVars(rootAuth.vars); }

  const folders = new Map();
  for (const t of list(doc.tags)) if (str(t?.name) && !folders.has(t.name)) folders.set(t.name, newFolder(t.name, str(t.description) ? { description: str(t.description) } : {}));
  const loose = [];
  const used = new Set();

  for (const [path, pathRaw] of Object.entries(isObj(doc.paths) ? doc.paths : {})) {
    const pathItem = deref(pathRaw);
    for (const method of METHODS) {
      const op = pathItem[method];
      if (!isObj(op)) continue;
      const params = paramsOf(pathItem, op, deref);
      let url = `{{baseUrl}}${path.replace(/\{([^{}]+)\}/g, '{{$1}}')}`;
      const query = [];
      const optional = [];
      const headers = [];
      const cookies = [];
      for (const p of params) {
        const value = paramValue(p, v3, deref);
        if (p.in === 'path') addVariable(c.variables, variable(p.name, value ?? ''));
        else if (p.in === 'query') {
          if (p.required) {
            if (value === undefined) addVariable(c.variables, variable(p.name, ''));
            query.push(`${queryPart(p.name)}=${value === undefined ? `{{${p.name}}}` : queryPart(value)}`);
          } else optional.push(p.name);
        } else if (p.in === 'header') {
          if (!/^(accept|content-type|authorization)$/i.test(p.name)) headers.push(header(p.name, value ?? '', !!p.required));
        } else if (p.in === 'cookie') cookies.push(`${p.name}=${value ?? ''}`);
      }
      for (const m of path.matchAll(/\{([^{}]+)\}/g)) addVariable(c.variables, variable(m[1], ''));
      if (query.length) url += `?${query.join('&')}`;
      if (cookies.length) headers.push(header('Cookie', cookies.join('; '), params.some(p => p.in === 'cookie' && p.required)));

      // The body
      let body = { kind: 'none' };
      if (v3) {
        const rb = deref(op.requestBody);
        const type = pickMedia(rb.content);
        if (type) {
          const mediaSchema = rb.content[type]?.schema;
          const refName = typeof mediaSchema?.$ref === 'string' ? mediaSchema.$ref.split('/').pop() : null;
          const made = bodyOf(type, rb.content[type] ?? {}, sample, deref, refName);
          body = made.body;
          headers.push(...made.headers);
        }
      } else {
        const consumes = list(op.consumes ?? doc.consumes).map(str);
        const bodyParam = params.find(p => p.in === 'body');
        const formParams = params.filter(p => p.in === 'formData');
        if (bodyParam) {
          const type = consumes.find(t => kindOfType(t) === 'json') ?? consumes.find(t => !/form/.test(t)) ?? 'application/json';
          const refName = typeof bodyParam.schema?.$ref === 'string' ? bodyParam.schema.$ref.split('/').pop() : null;
          const made = bodyOf(type, { schema: bodyParam.schema, example: bodyParam['x-example'] }, sample, deref, refName);
          body = made.body;
          headers.push(...made.headers);
        } else if (formParams.length) {
          const multipart = formParams.some(p => p.type === 'file') || consumes.includes('multipart/form-data');
          body = {
            kind: multipart ? 'multipart' : 'form',
            fields: formParams.map(p => (p.type === 'file'
              ? { key: p.name, value: '', type: 'file', file: '', fileName: '', enabled: true }
              : { key: p.name, value: paramValue(p, false, deref) ?? '', type: 'text', enabled: p.required === true })),
          };
        }
      }

      // The auth: the document's (inherit) unless the operation says otherwise
      let auth = { type: 'inherit' };
      if (op.security !== undefined && JSON.stringify(op.security) !== JSON.stringify(doc.security)) {
        const own = authFor(op.security, schemes, warn);
        if (own) { auth = own.auth; useVars(own.vars); }
      }

      const label = str(op.summary).trim() || str(op.operationId) || `${method.toUpperCase()} ${path}`;
      const req = newRequest({ name: `${label}${op.deprecated ? ' (deprecata)' : ''}`.slice(0, 200), method: method.toUpperCase(), url, headers, body, auth });
      const check = checkOf(op.responses);
      if (check) req.checks.push(check);
      const notes = [str(op.description).trim(), optional.length ? `Parametri facoltativi: ${optional.join(', ')}` : ''].filter(Boolean);
      if (notes.length) req.description = notes.join('\n\n');

      const tag = list(op.tags).map(str).find(Boolean);
      if (tag) {
        if (!folders.has(tag)) folders.set(tag, newFolder(tag));
        folders.get(tag).items.push(req);
        used.add(tag);
      } else {
        loose.push(req);
      }
    }
  }
  c.items = [...[...folders.values()].filter(f => used.has(f.name)), ...loose];
  if (!c.items.length) warn.add('Nessuna operazione nella specifica');

  // Environments: one per server (when there are several), with the credentials
  const environments = [];
  if (servers.length > 1) {
    for (const s of servers) environments.push(newEnvironment(s.name, [variable('baseUrl', s.url), ...credentials.map(v => ({ ...v }))]));
  } else if (credentials.length) {
    environments.push(newEnvironment(c.name, credentials));
  }
  return { collection: c, environments };
}
