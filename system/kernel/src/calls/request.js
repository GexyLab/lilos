import { randomBytes } from 'node:crypto';
import { fail, KernelError } from '../errors.js';
import { httpRequest, readBody, findHeader } from '../net/http.js';
import { networkMessage } from '../net/connect.js';
import { applyAuth, checkAuth, digestAnswer, digestChallenge } from './auth.js';
import { readHomeFile } from './home.js';
import { Text, defineStrings } from '../strings.js';

/**
 * One HTTP request of NetTest, its variables already put in (calls/vars.js) but for the secret
 * ones: `{{name}}` of a secret stays until here, where fill() puts the opened value (the URL, the
 * headers, the body, the auth). What comes back shows the request as it went, with every secret
 * value written as ••••.
 *
 *   spec: { method, url, headers: [{ key, value, enabled? }],
 *           body: { kind: 'none' | 'text' | 'json' | 'xml' | 'html' | 'javascript' | 'form' | 'multipart' | 'file' | 'graphql',
 *                   text?, fields?: [{ key, value, type: 'text' | 'file', file?, contentType?, enabled? }], file?, query?, variables?, operationName? },
 *           auth, settings: { timeoutMs, followRedirects, maxRedirects, verify, version, decode, maxBody, ca?, cert?, key?, passphrase? } }
 *   files are paths of the user's home ('~/Documenti/foto.png')
 *
 *   → { request: { method, url, headers: [[k, v]], body: { size, text? } },
 *       response: { status, statusText, httpVersion, headers, body (base64), size, received, truncated, decoded,
 *                   timings: { lookup?, connect?, secure?, sent, firstByte, done, total }, tls, remote } | null,
 *       redirects: [{ status, url }], error: { code, message, trust? } | null }
 */
export const BODY_KINDS = ['none', 'text', 'json', 'xml', 'html', 'javascript', 'form', 'multipart', 'file', 'graphql'];
const TYPES = { text: 'text/plain', json: 'application/json', xml: 'application/xml', html: 'text/html', javascript: 'application/javascript', graphql: 'application/json', form: 'application/x-www-form-urlencoded' };
const METHOD = /^[A-Z][A-Z0-9_-]{0,23}$/;
const HEADER = /^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,256}$/;
const MAX_BODY = 50 << 20;
const DEFAULT_MAX = 20 << 20;
const SHOWN_BODY = 64 << 10;
const SECRET_HEADERS = /^(authorization|cookie|proxy-authorization|x-api-key|x-amz-security-token)$/i;

const { t } = defineStrings('lilos:kernel.calls.request', { en: { strings: {
  graphqlVars: 'GraphQL: the variables are not valid JSON',
  method: 'Method not valid',
  url: 'Address not valid: {url}',
  needHttp: 'An http:// or https:// address is needed',
  headerName: 'Header name not valid: {name}',
  headerValue: 'Value not valid in the header {name}',
  bodyTooBig: 'Body too large (50 MB at most)',
  noAnswer: { one: 'No answer in {n} second', other: 'No answer in {n} seconds' },
  cancelled: 'Cancelled',
} } });

const on = row => row && row.enabled !== false;
const fillDeep = (v, fill) => (typeof v === 'string' ? fill(v) : Array.isArray(v) ? v.map(x => fillDeep(x, fill)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fillDeep(x, fill)])) : v);
const str = v => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v));

/**
 * Puts the secret values in a text; mask() writes them as •••• instead, and so the values learn()
 * adds (what a secret becomes on its way: the token of an Authorization header, Basic's base64).
 * values() lists what mask() hides, longest first.
 */
export function secretFiller(secrets) {
  const names = Object.keys(secrets);
  const known = new Set(names.map(n => secrets[n]).filter(v => typeof v === 'string' && v.length >= 3));
  const sorted = () => [...known].sort((a, b) => b.length - a.length);
  const learn = v => { if (typeof v === 'string' && v.length >= 3) known.add(v); };
  if (!names.length) return { fill: str, mask: text => sorted().reduce((out, v) => out.split(v).join('••••'), str(text)), has: () => false, learn, values: sorted };
  const re = new RegExp(`\\{\\{(${names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\}\\}`, 'g');
  return {
    fill: text => str(text).replace(re, (_, n) => secrets[n]),
    mask: text => {
      let out = str(text).replace(re, '••••');
      for (const v of sorted()) out = out.split(v).join('••••');
      return out;
    },
    has: text => { re.lastIndex = 0; return re.test(str(text)); },
    learn, values: sorted,
  };
}

async function buildBody(ctx, body, fill) {
  const kind = BODY_KINDS.includes(body?.kind) ? body.kind : 'none';
  if (kind === 'none') return { payload: undefined, type: null, shown: '' };
  if (kind === 'graphql') {
    let variables = {};
    const raw = fill(body.variables ?? '').trim();
    if (raw) {
      try { variables = JSON.parse(raw); } catch { fail('invalid', t('graphqlVars')); }
    }
    const text = JSON.stringify({ query: fill(body.query ?? ''), variables, ...(str(body.operationName) && { operationName: str(body.operationName) }) });
    return { payload: Buffer.from(text, 'utf8'), type: TYPES.graphql, shown: text };
  }
  if (kind === 'form') {
    const form = new URLSearchParams();
    for (const f of (Array.isArray(body.fields) ? body.fields : []).filter(on)) form.append(fill(f.key), fill(f.value));
    const text = form.toString();
    return { payload: Buffer.from(text, 'utf8'), type: TYPES.form, shown: text };
  }
  if (kind === 'multipart') {
    const boundary = `----lilOSNetTest${randomBytes(12).toString('hex')}`;
    const parts = [];
    const shown = [];
    for (const f of (Array.isArray(body.fields) ? body.fields : []).filter(on)) {
      const name = fill(f.key).replace(/["\r\n]/g, '_');
      if (f.type === 'file') {
        const file = await readHomeFile(ctx, str(f.file));
        const type = str(f.contentType) || file.type;
        parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${file.name.replace(/["\r\n]/g, '_')}"\r\nContent-Type: ${type}\r\n\r\n`), file.data, Buffer.from('\r\n'));
        shown.push(`${name}: <${file.name}, ${file.data.length} byte>`);
      } else {
        const type = str(f.contentType);
        parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n${type ? `Content-Type: ${type}\r\n` : ''}\r\n${fill(f.value)}\r\n`));
        shown.push(`${name}: ${f.value}`);
      }
    }
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    return { payload: Buffer.concat(parts), type: `multipart/form-data; boundary=${boundary}`, shown: shown.join('\n') };
  }
  if (kind === 'file') {
    const file = await readHomeFile(ctx, str(body.file));
    return { payload: file.data, type: file.type, shown: `<${file.name}, ${file.data.length} byte>` };
  }
  const text = str(body.text);
  return { payload: Buffer.from(fill(text), 'utf8'), type: TYPES[kind], shown: text };
}

/** The TLS files of the settings (certificate, key, CA), from the home. */
async function tlsFiles(ctx, s, fill) {
  const out = {};
  for (const k of ['ca', 'cert', 'key']) if (str(s?.[k])) out[k] = (await readHomeFile(ctx, str(s[k]))).data;
  if (str(s?.pfx)) out.pfx = (await readHomeFile(ctx, str(s.pfx))).data;
  if (str(s?.passphrase)) out.passphrase = fill(s.passphrase);
  return out;
}

/**
 * Does the request. ctx: { kernel, calls, principal, signal, secrets: { name: value }, renewed(sealed, fresh) }.
 * Never throws for what the server or the network did: that is `error` in the result.
 */
export async function performRequest(ctx, spec) {
  const { calls, principal } = ctx;
  const filler = secretFiller(ctx.secrets ?? {});
  const { fill, mask } = filler;
  const s = spec.settings ?? {};
  const method = str(spec.method).toUpperCase() || 'GET';
  const out = { request: { method, url: mask(spec.url), headers: [], body: { size: 0 } }, response: null, redirects: [], error: null };
  try {
    if (!METHOD.test(method)) fail('invalid', t('method'));
    let url;
    try { url = new URL(fill(spec.url).trim()); } catch { fail('invalid', t('url', { url: mask(spec.url).slice(0, 200) })); }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') fail('invalid', t('needHttp'));
    let headers = [];
    for (const h of (Array.isArray(spec.headers) ? spec.headers : []).filter(on)) {
      const k = fill(h.key).trim();
      if (!k) continue;
      if (!HEADER.test(k)) fail('invalid', t('headerName', { name: mask(h.key).slice(0, 60) }));
      const v = fill(h.value);
      if (/[\r\n\0]/.test(v)) fail('invalid', t('headerValue', { name: k }));
      headers.push([k, v]);
    }
    const body = await buildBody(ctx, spec.body, fill);
    if (body.payload && body.payload.length > MAX_BODY) fail('too_large', t('bodyTooBig'));
    if (body.type && !findHeader(headers, 'content-type')) headers.push(['Content-Type', body.type]);
    if (!findHeader(headers, 'user-agent')) headers.push(['User-Agent', 'lilOS NetTest']);
    if (!findHeader(headers, 'accept')) headers.push(['Accept', '*/*']);
    if (s.decode !== false && !findHeader(headers, 'accept-encoding')) headers.push(['Accept-Encoding', 'gzip, deflate, br']);
    const auth = checkAuth(fillDeep(spec.auth, fill));
    const tlsBase = { ...(await tlsFiles(ctx, s, fill)), verify: s.verify !== false };
    const req = { url, method, headers, body: method === 'GET' || method === 'HEAD' ? (body.payload?.length ? body.payload : undefined) : body.payload };
    await applyAuth(auth, req, { tokens: a => calls.oauth.token(principal, a, ctx.renewed) });
    // What proves who the user is: never shown back (a server that echoes it), never sent to another origin
    const authHeaders = new Set(['authorization', 'proxy-authorization', ...(auth.type === 'apikey' && auth.in !== 'query' ? [str(auth.key).trim().toLowerCase()] : [])]);
    for (const [k, v] of req.headers) {
      if (!authHeaders.has(k.toLowerCase()) && !/^(x-api-key|x-amz-security-token)$/i.test(k)) continue;
      filler.learn(v.replace(/^\w+\s+/, ''));
      if (/^basic\s+/i.test(v)) { try { const plain = Buffer.from(v.replace(/^basic\s+/i, ''), 'base64').toString('utf8'); filler.learn(plain); filler.learn(plain.slice(plain.indexOf(':') + 1)); } catch { /* not base64 */ } }
    }
    const follow = s.followRedirects !== false;
    const maxHops = Math.min(20, Math.max(0, Number.isInteger(s.maxRedirects) ? s.maxRedirects : 10));
    const origin = req.url.origin;
    const timeoutMs = Math.min(600_000, Math.max(1000, Number(s.timeoutMs) || 30_000));
    const started = Date.now();
    let digested = false;
    let res;
    for (let hop = 0; ; hop++) {
      await calls.guard.check({ url: req.url.href });
      const left = timeoutMs - (Date.now() - started);
      if (left <= 0) fail('unavailable', t('noAnswer', { n: Math.round(timeoutMs / 1000) }));
      out.request = { method: req.method, url: mask(req.url.href), headers: req.headers.map(([k, v]) => [k, SECRET_HEADERS.test(k) ? maskAuth(v, mask) : mask(v)]), body: { size: req.body?.length ?? 0, ...(req.body && { text: mask(body.shown).slice(0, SHOWN_BODY) }) } };
      res = await httpRequest(req.url, {
        method: req.method, headers: req.headers, body: req.body, lookup: calls.guard.lookup, signal: ctx.signal, timeoutMs: left,
        tls: { ...tlsBase, pinned: await calls.pinned(principal, req.url) }, version: ['1.1', '2'].includes(s.version) ? s.version : 'auto',
      });
      // Digest: the server's challenge, answered once
      if (res.status === 401 && auth.type === 'digest' && !digested && req.url.origin === origin) {
        const challenge = digestChallenge(res.headers);
        if (challenge) {
          res.body.destroy();
          digested = true;
          req.headers = req.headers.filter(([k]) => k.toLowerCase() !== 'authorization');
          req.headers.push(['Authorization', digestAnswer(auth, challenge, req)]);
          hop--;
          continue;
        }
      }
      const to = findHeader(res.headers, 'location');
      if (!follow || ![301, 302, 303, 307, 308].includes(res.status) || !to) break;
      if (hop >= maxHops) break;
      const next = new URL(to, req.url);
      if (next.protocol !== 'http:' && next.protocol !== 'https:') break;
      // A body that must go again (307, 308) does not go to another origin: the redirect is the answer
      if (next.origin !== origin && req.body !== undefined && (res.status === 307 || res.status === 308)) break;
      res.body.destroy();
      out.redirects.push({ status: res.status, url: mask(req.url.href) });
      if (res.status === 303 || ((res.status === 301 || res.status === 302) && req.method === 'POST')) {
        req.method = 'GET';
        req.body = undefined;
        req.headers = req.headers.filter(([k]) => !/^content-(type|length)$/i.test(k));
      }
      // Another origin: what proves who the user is stays behind
      if (next.origin !== origin) req.headers = req.headers.filter(([k, v]) => !SECRET_HEADERS.test(k) && !authHeaders.has(k.toLowerCase()) && mask(v) === v);
      req.url = next;
    }
    const read = await readBody(res, { max: Math.min(MAX_BODY, Number(s.maxBody) || DEFAULT_MAX), decode: s.decode !== false });
    const tm = res.timings;
    out.response = {
      status: res.status, statusText: res.statusText, httpVersion: res.httpVersion, headers: res.headers.map(([k, v]) => [k, mask(v)]),
      body: maskBody(read.data, filler.values()).toString('base64'), size: read.data.length, received: read.size, truncated: read.truncated, decoded: read.decoded,
      timings: { lookup: tm.lookup ?? null, connect: tm.connect ?? null, secure: tm.secure ?? null, sent: tm.sent ?? null, firstByte: tm.firstByte ?? null, done: tm.done ?? null, total: Date.now() - started },
      tls: res.tls, remote: res.remote, url: mask(req.url.href),
    };
  } catch (err) {
    out.error = errorOf(err, mask);
  }
  return out;
}

/** A body that holds a secret value (a server that sends it back): written •••• there too, byte by byte (any body). */
const BULLETS = Buffer.from('••••', 'utf8').toString('latin1');
function maskBody(data, values) {
  if (!values.length) return data;
  let text = data.toString('latin1'), changed = false;
  for (const v of values) {
    const needle = Buffer.from(v, 'utf8').toString('latin1');
    if (!text.includes(needle)) continue;
    text = text.split(needle).join(BULLETS);
    changed = true;
  }
  return changed ? Buffer.from(text, 'latin1') : data;
}

/** 'Bearer abc…' → 'Bearer ••••' (the scheme stays). */
function maskAuth(value, mask) {
  const m = /^(\w+)\s+/.exec(value);
  return m ? `${m[1]} ••••` : mask(value).length ? '••••' : '';
}

/**
 * A message with its secret values written ••••: a string, or a Text whose params are (it stays a
 * Text, to reach the user in their language).
 */
export function maskMessage(message, mask = str) {
  if (!(message instanceof Text)) return mask(message);
  const params = message.params && Object.fromEntries(Object.entries(message.params).map(([k, v]) => [k, typeof v === 'string' || v instanceof Text ? maskMessage(v, mask) : v]));
  return new Text(message.part, message.key, params);
}

/** An error as the page shows it: { code, message, trust? } (message: a string or a Text). */
export function errorOf(err, mask = str) {
  if (err instanceof KernelError) return { code: err.code, message: maskMessage(err.text ?? err.message, mask), ...(err.details?.trust && { trust: err.details.trust }) };
  if (err?.code === 'ABORT_ERR' || err?.name === 'AbortError') return { code: 'cancelled', message: t('cancelled') };
  return { code: 'network', message: maskMessage(networkMessage(err), mask), detail: str(err?.code) };
}
