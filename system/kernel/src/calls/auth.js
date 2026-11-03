import { createHash, createHmac, randomBytes } from 'node:crypto';
import { fail } from '../errors.js';
import { findHeader } from '../net/http.js';

/**
 * How a NetTest request proves who it is. The kernel does it, after the secrets are filled in
 * (calls/request.js): the page never sees a password, a key or a token it sealed.
 *
 *   { type: 'none' }
 *   { type: 'basic', user, password }
 *   { type: 'bearer', token, prefix? ('Bearer') }
 *   { type: 'apikey', key, value, in: 'header' | 'query' }
 *   { type: 'digest', user, password }                 answered when the server asks (401 + WWW-Authenticate: Digest)
 *   { type: 'aws4', accessKey, secretKey, sessionToken?, region, service }
 *   { type: 'oauth2', grant?: 'token', token, prefix? }   a token the user has (or a variable with it)
 *   { type: 'oauth2', grant: 'client_credentials' | 'password', tokenUrl, clientId, clientSecret?,
 *     scope?, audience?, username?, password?, prefix?, send: 'body' | 'basic' }
 *                                                      the kernel asks the token and keeps it until it ends
 *   { type: 'oauth2', grant: 'authorization_code', tokens: sealed }   the tokens of a sign-in (calls/oauth.js),
 *                                                      renewed with their refresh token when they end
 *
 * apply() changes the request before it goes (url, headers); digest() the request again after a 401.
 */
const sha = (alg, text) => createHash(alg).update(text).digest('hex');
const hmac = (key, text, enc) => createHmac('sha256', key).update(text).digest(enc);
const str = v => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v));
const TYPES = ['none', 'basic', 'bearer', 'apikey', 'digest', 'aws4', 'oauth2'];

export function checkAuth(raw) {
  const a = raw && typeof raw === 'object' ? raw : { type: 'none' };
  if (!TYPES.includes(a.type)) fail('invalid', 'Autenticazione non valida');
  return a;
}

/** Sets the headers (and the query) of the request: req { url: URL, method, headers: [[k, v]], body: Buffer | undefined }. */
export async function applyAuth(auth, req, { tokens }) {
  const set = (name, value) => {
    req.headers = req.headers.filter(([k]) => k.toLowerCase() !== name.toLowerCase());
    req.headers.push([name, value]);
  };
  switch (auth.type) {
    case 'basic':
      return set('Authorization', `Basic ${Buffer.from(`${str(auth.user)}:${str(auth.password)}`, 'utf8').toString('base64')}`);
    case 'bearer':
      return set('Authorization', `${str(auth.prefix) || 'Bearer'} ${str(auth.token)}`);
    case 'apikey': {
      const key = str(auth.key).trim();
      if (!key) return;
      if (auth.in === 'query') return req.url.searchParams.append(key, str(auth.value));
      return set(key, str(auth.value));
    }
    case 'aws4':
      return signAws4(auth, req, set);
    case 'oauth2': {
      const token = auth.grant && auth.grant !== 'token' ? await tokens(auth) : str(auth.token);
      if (!token) fail('invalid', 'OAuth 2.0: nessun token: fai l’accesso o scrivi il token');
      return set('Authorization', `${str(auth.prefix) || 'Bearer'} ${token}`);
    }
    default:
  }
}

// ---------- Digest (RFC 7616) ----------

/** The parameters of a 'WWW-Authenticate: Digest …' header, or null. */
export function digestChallenge(headers) {
  for (const [k, v] of headers) {
    if (k.toLowerCase() !== 'www-authenticate' || !/^\s*digest\s/i.test(v)) continue;
    const params = {};
    for (const m of v.replace(/^\s*digest\s+/i, '').matchAll(/([a-z0-9_-]+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^\s,]+))/gi)) {
      params[m[1].toLowerCase()] = (m[2] ?? m[3]).replace(/\\(.)/g, '$1');
    }
    if (params.nonce) return params;
  }
  return null;
}

/** The Authorization header that answers a Digest challenge. */
export function digestAnswer(auth, challenge, { method, url, body }) {
  const algorithm = String(challenge.algorithm ?? 'MD5').toUpperCase();
  const hash = algorithm.startsWith('SHA-256') ? 'sha256' : algorithm.startsWith('SHA-512-256') ? 'sha512-256' : 'md5';
  const H = text => sha(hash, text);
  const qops = String(challenge.qop ?? '').split(',').map(q => q.trim());
  const qop = qops.includes('auth') ? 'auth' : qops.includes('auth-int') ? 'auth-int' : null;
  const uri = `${url.pathname || '/'}${url.search}`;
  const nc = '00000001', cnonce = randomBytes(8).toString('hex');
  let ha1 = H(`${str(auth.user)}:${challenge.realm ?? ''}:${str(auth.password)}`);
  if (algorithm.endsWith('-SESS')) ha1 = H(`${ha1}:${challenge.nonce}:${cnonce}`);
  const ha2 = qop === 'auth-int' ? H(`${method}:${uri}:${H(body ?? Buffer.alloc(0))}`) : H(`${method}:${uri}`);
  const response = qop ? H(`${ha1}:${challenge.nonce}:${nc}:${cnonce}:${qop}:${ha2}`) : H(`${ha1}:${challenge.nonce}:${ha2}`);
  const q = s => `"${String(s).replace(/["\\]/g, '\\$&')}"`;
  const parts = [`username=${q(str(auth.user))}`, `realm=${q(challenge.realm ?? '')}`, `nonce=${q(challenge.nonce)}`, `uri=${q(uri)}`, `algorithm=${algorithm}`, `response=${q(response)}`];
  if (qop) parts.push(`qop=${qop}`, `nc=${nc}`, `cnonce=${q(cnonce)}`);
  if (challenge.opaque !== undefined) parts.push(`opaque=${q(challenge.opaque)}`);
  return `Digest ${parts.join(', ')}`;
}

// ---------- AWS Signature Version 4 ----------

const rfc3986 = s => encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

function signAws4(auth, req, set) {
  const region = str(auth.region).trim() || 'us-east-1';
  const service = str(auth.service).trim() || 'execute-api';
  if (!str(auth.accessKey) || !str(auth.secretKey)) fail('invalid', 'Firma AWS: mancano la chiave di accesso o quella segreta');
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = amzDate.slice(0, 8);
  const payloadHash = sha('sha256', req.body ?? Buffer.alloc(0));
  set('X-Amz-Date', amzDate);
  if (service === 's3') set('X-Amz-Content-Sha256', payloadHash);
  if (str(auth.sessionToken)) set('X-Amz-Security-Token', str(auth.sessionToken));
  const headers = new Map([['host', req.url.host]]);
  for (const [k, v] of req.headers) {
    const name = k.toLowerCase();
    if (name === 'authorization' || name === 'user-agent' || name === 'content-length') continue;
    headers.set(name, headers.has(name) ? `${headers.get(name)},${String(v).trim().replace(/\s+/g, ' ')}` : String(v).trim().replace(/\s+/g, ' '));
  }
  const names = [...headers.keys()].sort();
  const path = req.url.pathname.split('/').map(seg => {
    let plain = seg;
    try { plain = decodeURIComponent(seg); } catch { /* as it is */ }
    const once = rfc3986(plain);
    return service === 's3' ? once : rfc3986(once);
  }).join('/') || '/';
  const query = [...req.url.searchParams].map(([k, v]) => [rfc3986(k), rfc3986(v)]).sort(([a, x], [b, y]) => (a < b ? -1 : a > b ? 1 : x < y ? -1 : x > y ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join('&');
  const canonical = [req.method, path, query, ...names.map(n => `${n}:${headers.get(n)}`), '', names.join(';'), payloadHash].join('\n');
  const scope = `${day}/${region}/${service}/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha('sha256', canonical)].join('\n');
  const key = hmac(hmac(hmac(hmac(`AWS4${str(auth.secretKey)}`, day), region), service), 'aws4_request');
  set('Authorization', `AWS4-HMAC-SHA256 Credential=${str(auth.accessKey)}/${scope}, SignedHeaders=${names.join(';')}, Signature=${hmac(key, toSign, 'hex')}`);
}

export const hasHeader = (headers, name) => findHeader(headers, name.toLowerCase()) !== undefined;
