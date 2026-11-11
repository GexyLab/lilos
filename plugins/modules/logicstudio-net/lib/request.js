import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import { isIP } from 'node:net';
import { checkIp, guardedLookup } from './shared/ipguard.js';

/**
 * The web requests of the «Richiesta web» block, made in the kernel's main thread (the engine's
 * broker) for the program's owner. Modules do not get the kernel's NetGuard: the same protection is
 * here.
 *
 *  - Addresses: the name is resolved (dns.lookup) and every address checked, and the connection
 *    goes to the address checked (the `lookup` of http.request), so a name cannot be pointed
 *    elsewhere between the check and the connection (DNS rebinding). An IP written in the URL is
 *    checked as it is. Never: link-local (cloud metadata), multicast, «this network»; this computer
 *    (loopback), the local network and the other non-public ranges only with the module setting
 *    `allowPrivate`.
 *  - Redirects followed by hand, at most MAX_REDIRECTS, each checked again; Authorization, Cookie
 *    and Proxy-Authorization are dropped when one goes to another origin.
 *  - One time limit for all of it (timeoutSeconds), one size limit for the response (maxResponseKb,
 *    after decompression), every request (redirects too) counted against the user's network quota
 *    (tools.countNet()).
 *  - The headers are never logged nor put in an error: they may hold secrets.
 */
export const MAX_REDIRECTS = 5;
export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const MAX_URL = 8192;
const MAX_BODY = 5 << 20;
const MAX_HEADERS = 50;
const MAX_HEADER_VALUE = 8192;
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,64}$/;
/** Headers the request sets itself (or that would change how the connection works). */
const OWN_HEADERS = new Set(['host', 'content-length', 'transfer-encoding', 'connection', 'keep-alive', 'upgrade', 'te', 'trailer', 'expect', 'accept-encoding', 'proxy-connection']);
/** Headers that do not follow a redirect to another origin. */
const SECRET_HEADERS = ['authorization', 'cookie', 'proxy-authorization'];

const oops = (message, code) => Object.assign(new Error(message), code && { code });

/** The module settings, cleaned: { allowPrivate, timeoutMs, maxBytes }. */
export function settingsOf(config = {}) {
  const n = (v, min, max, fallback) => { const x = Number(v); return Number.isFinite(x) && x >= min && x <= max ? x : fallback; };
  return {
    allowPrivate: config.allowPrivate === true,
    timeoutMs: n(config.timeoutSeconds, 1, 120, 20) * 1000,
    maxBytes: Math.round(n(config.maxResponseKb, 1, 10240, 1024) * 1024),
  };
}

export { checkIp };

/** A URL of the request, checked: http or https only. */
export function urlOf(raw, base) {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) throw oops('Manca l\'indirizzo (URL) della richiesta');
  if (s.length > MAX_URL) throw oops('Indirizzo (URL) troppo lungo');
  let url;
  try { url = base ? new URL(s, base) : new URL(s); } catch { throw oops(`Indirizzo (URL) non valido: ${s.slice(0, 120)}`); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw oops(`Solo indirizzi http e https: ${url.protocol}`);
  return url;
}

/** The request headers, checked: { lower-case name: value }. */
export function headersOf(raw) {
  if (raw === undefined || raw === null || raw === '') return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) throw oops('Intestazioni non valide: serve un oggetto { "Nome": "valore" }');
  const entries = Object.entries(raw);
  if (entries.length > MAX_HEADERS) throw oops(`Troppe intestazioni (al massimo ${MAX_HEADERS})`);
  const out = {};
  for (const [name, value] of entries) {
    if (!HEADER_NAME.test(name)) throw oops(`Nome di intestazione non valido: ${name.slice(0, 64)}`);
    const v = typeof value === 'string' ? value : value === undefined || value === null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (v.length > MAX_HEADER_VALUE || /[\r\n\0]/.test(v)) throw oops(`Valore dell'intestazione ${name} non valido`);
    const key = name.toLowerCase();
    if (OWN_HEADERS.has(key)) continue;   // the request sets them itself
    out[key] = v;
  }
  return out;
}

/** The body to send: text as it is, anything else as JSON. → { bytes, type } | null */
function bodyOf(value) {
  if (value === undefined || value === null) return null;
  const isText = typeof value === 'string';
  const bytes = Buffer.from(isText ? value : JSON.stringify(value), 'utf8');
  if (bytes.length > MAX_BODY) throw oops(`Corpo della richiesta troppo grande (al massimo ${MAX_BODY >> 20} MB)`);
  return { bytes, type: isText ? 'text/plain; charset=utf-8' : 'application/json' };
}

/** Why a request failed, said for the program (never the headers). */
function told(err, url, settings) {
  if (err?.code === 'forbidden' || err?.code === 'too_large' || err?.code === 'redirects') return err;
  if (err?.name === 'AbortError' || err?.code === 'ABORT_ERR' || err?.code === 'timeout') return oops(`Nessuna risposta da ${url.host} in ${settings.timeoutMs / 1000} secondi`);
  switch (err?.code) {
    case 'ENOTFOUND': case 'EAI_AGAIN': return oops(`Indirizzo non trovato: ${url.hostname}`);
    case 'ECONNREFUSED': return oops(`Connessione rifiutata da ${url.host}`);
    case 'ECONNRESET': return oops(`Connessione chiusa da ${url.host}`);
    case 'EHOSTUNREACH': case 'ENETUNREACH': return oops(`${url.host} non è raggiungibile`);
    case 'CERT_HAS_EXPIRED': return oops(`Il certificato di ${url.hostname} è scaduto`);
    case 'DEPTH_ZERO_SELF_SIGNED_CERT': case 'SELF_SIGNED_CERT_IN_CHAIN': case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE': case 'ERR_TLS_CERT_ALTNAME_INVALID':
      return oops(`Il certificato di ${url.hostname} non è valido`);
    default: return oops(`Richiesta a ${url.host} non riuscita: ${err?.message ?? err}`);
  }
}

/** One request, no redirects followed: → { status, headers, res } */
function once(url, { method, headers, body, signal, settings }) {
  return new Promise((resolve, reject) => {
    const host = url.hostname.replace(/^\[|\]$/g, '');
    if (isIP(host)) {
      try { checkIp(host, settings); } catch (err) { reject(err); return; }
    }
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request({
      protocol: url.protocol, hostname: host, port: url.port || undefined, path: `${url.pathname}${url.search}`,
      method, headers: { ...headers, ...(body && { 'content-length': String(body.bytes.length) }) },
      auth: url.username || url.password ? `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}` : undefined,
      lookup: guardedLookup(settings), agent: false, signal,
      ...(url.protocol === 'https:' && !isIP(host) && { servername: host }),
    }, res => resolve(res));
    req.on('error', reject);
    req.end(body ? body.bytes : undefined);
  });
}

/** The response's bytes, decompressed, at most maxBytes. */
async function bytesOf(res, maxBytes) {
  const tooLarge = () => oops(`Risposta troppo grande (più di ${Math.round(maxBytes / 1024)} KB)`, 'too_large');
  const declared = Number(res.headers['content-length']);
  const encoding = String(res.headers['content-encoding'] ?? '').trim().toLowerCase();
  if (!encoding && Number.isFinite(declared) && declared > maxBytes) { res.destroy(); throw tooLarge(); }
  let stream = res;
  if (encoding === 'gzip' || encoding === 'x-gzip') stream = res.pipe(zlib.createGunzip());
  else if (encoding === 'deflate') stream = res.pipe(zlib.createInflate());
  else if (encoding === 'br') stream = res.pipe(zlib.createBrotliDecompress());
  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of stream) {
      size += chunk.length;
      if (size > maxBytes) throw tooLarge();
      chunks.push(chunk);
    }
  } finally {
    if (stream !== res) stream.destroy();
    res.destroy();
  }
  return Buffer.concat(chunks);
}

/** The body as the program gets it: kind 'auto' (JSON when the server says so), 'json' or 'text'. */
function parsed(bytes, contentType, kind) {
  const text = bytes.toString('utf8');
  const looksJson = /[/+]json\b/i.test(contentType ?? '');
  if (kind === 'text') return text;
  if (kind === 'json') {
    if (!text.trim()) return null;
    try { return JSON.parse(text); } catch { throw oops('La risposta non è JSON valido'); }
  }
  if (looksJson && text.trim()) {
    try { return JSON.parse(text); } catch { return text; }
  }
  return text;
}

/**
 * A web request: args { method, url, query: [[name, value]], headers: {}, body, kind }.
 * → { status, headers, body, url } (the final URL, after the redirects)
 */
export async function request(args, config, tools) {
  const settings = settingsOf(config);
  const a = args && typeof args === 'object' ? args : {};
  let method = METHODS.includes(String(a.method ?? 'GET').toUpperCase()) ? String(a.method ?? 'GET').toUpperCase() : null;
  if (!method) throw oops(`Metodo non valido: ${String(a.method).slice(0, 20)} (${METHODS.join(', ')})`);
  let url = urlOf(a.url);
  for (const [name, value] of Array.isArray(a.query) ? a.query : []) {
    if (typeof name !== 'string' || !name || value === undefined || value === null) continue;
    url.searchParams.delete(name);
    for (const v of Array.isArray(value) ? value : [value]) url.searchParams.append(name, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  if (url.href.length > MAX_URL) throw oops('Indirizzo (URL) troppo lungo con i parametri');
  let headers = { 'user-agent': 'lilOS Logic Studio', accept: '*/*', ...headersOf(a.headers) };
  let body = method === 'GET' ? null : bodyOf(a.body);
  if (body && !headers['content-type']) headers['content-type'] = body.type;
  const kind = ['json', 'text'].includes(a.kind) ? a.kind : 'auto';

  const controller = new AbortController();
  // The program stopped (engine ≥ the version with tools.signal): the request stops too
  if (tools?.signal) { if (tools.signal.aborted) controller.abort(); else tools.signal.addEventListener('abort', () => controller.abort(), { once: true }); }
  const timer = setTimeout(() => controller.abort(), settings.timeoutMs);
  try {
    for (let hop = 0; ; hop++) {
      tools.countNet();
      let res;
      try {
        res = await once(url, { method, headers, body, signal: controller.signal, settings });
      } catch (err) {
        throw told(err, url, settings);
      }
      const status = res.statusCode;
      const location = res.headers.location;
      if ([301, 302, 303, 307, 308].includes(status) && location) {
        res.destroy();
        if (hop >= MAX_REDIRECTS) throw oops(`Troppi reindirizzamenti (più di ${MAX_REDIRECTS})`, 'redirects');
        const next = urlOf(String(location), url);
        if (status === 303 || ((status === 301 || status === 302) && method === 'POST')) {
          if (method !== 'GET') { method = 'GET'; body = null; }
          headers = Object.fromEntries(Object.entries(headers).filter(([k]) => k !== 'content-type'));
        }
        if (next.origin !== url.origin) headers = Object.fromEntries(Object.entries(headers).filter(([k]) => !SECRET_HEADERS.includes(k)));
        url = next;
        continue;
      }
      let bytes;
      try {
        bytes = await bytesOf(res, settings.maxBytes);
      } catch (err) {
        throw told(err, url, settings);
      }
      return { status, headers: { ...res.headers }, body: parsed(bytes, res.headers['content-type'], kind), url: url.href };
    }
  } finally {
    clearTimeout(timer);
  }
}

/** The actions of the package: fn(user, args, tools), see the engine's broker. */
export function makeActions(config) {
  return {
    'net.request': (user, args, tools) => request(args, config(), tools),
  };
}
