import { pipeline } from 'node:stream/promises';
import { KernelError, fail } from './errors.js';
import { defineStrings, localizedJson } from './strings.js';

const { t } = defineStrings('lilos:kernel.http', { en: { strings: {
  badPath: 'Address not valid', tooLarge: 'Request too large', notJson: 'The request body is not valid JSON',
  notAllowed: 'Request not allowed', noOrigin: 'Origin missing', badOrigin: 'Origin not allowed', badHost: 'Host not allowed',
} } });

const HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
};
const SAFE = new Set(['GET', 'HEAD']);
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Routes like '/api/fs/content/:id'; a final '*' takes the rest of the path (params.rest). */
export class Router {
  #routes = [];

  add(method, pattern, handler) {
    const keys = [];
    const source = pattern
      .replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)'))
      .replace(/\/\*$/, () => (keys.push('rest'), '/(.+)'));
    this.#routes.push({ method, re: new RegExp(`^${source}$`), keys, handler });
  }

  /** { handler, params } or { allowed: [methods] } when the path exists with other methods, or null. */
  match(method, path) {
    const allowed = [];
    for (const r of this.#routes) {
      const m = r.re.exec(path);
      if (!m) continue;
      if (r.method !== method) { allowed.push(r.method); continue; }
      const params = {};
      try {
        r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      } catch {
        fail('invalid', t('badPath'));
      }
      return { handler: r.handler, params };
    }
    return allowed.length ? { allowed } : null;
  }
}

export function send(res, status, body, headers = {}, locale = 'en') {
  const isBuffer = Buffer.isBuffer(body);
  const payload = body === undefined ? '' : isBuffer || typeof body === 'string' ? body : localizedJson(body, locale);
  const type = isBuffer || typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8';
  res.writeHead(status, { ...HEADERS, ...(body !== undefined && { 'Content-Type': type }), ...headers });
  res.end(payload);
}

/** Sends a stream of bytes (a file's content); resolves when sent. */
export async function sendStream(res, stream, headers = {}) {
  res.writeHead(200, { ...HEADERS, 'Content-Type': 'application/octet-stream', ...headers });
  await pipeline(stream, res);
}

/** The request body, at most `limit` bytes. */
export function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    if (Number(req.headers['content-length']) > limit) return reject(new KernelError('too_large', t('tooLarge')));
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(new KernelError('too_large', t('tooLarge')));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export async function readJson(req, limit) {
  const raw = await readBody(req, limit);
  try {
    const value = JSON.parse(raw.toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    return fail('invalid', t('notJson'));
  }
}

export function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

/**
 * Requests that change something must come from lilOS itself: they carry the 'X-Lilos: 1'
 * header (another site cannot add it without a CORS preflight, which the kernel never allows)
 * and, when the browser sends an Origin, it must be one of the allowed ones.
 */
export function checkOrigin(req, config) {
  if (SAFE.has(req.method)) return;
  if (req.headers['x-lilos'] !== '1') fail('forbidden', t('notAllowed'));
  if (req.headers.origin) allowedOrigin(req.headers.origin, config);
}

/**
 * A WebSocket cannot carry the X-Lilos header and the browser opens one to any site with the
 * user's cookies: it must come with an Origin, one of the allowed ones or the kernel's own
 * address (the page an installed lilOS serves).
 */
export function checkSocketOrigin(req, config) {
  const origin = req.headers.origin;
  if (!origin) fail('forbidden', t('noOrigin'));
  try {
    const url = new URL(origin);
    if (url.host === req.headers.host && (url.protocol === 'http:' || url.protocol === 'https:')) return;
  } catch { /* checked below */ }
  allowedOrigin(origin, config);
}

function allowedOrigin(origin, { origins, loopbackOrigins }) {
  let url;
  try { url = new URL(origin); } catch { fail('forbidden', t('badOrigin')); }
  if (origins.includes(url.origin)) return;
  if (loopbackOrigins && url.protocol === 'http:' && LOOPBACK.has(url.hostname)) return;
  fail('forbidden', t('badOrigin'));
}

/**
 * The Host the browser asked for must be this machine or one of the allowed origins: a site
 * that points its own name at 127.0.0.1 (DNS rebinding) would otherwise read the API as if it
 * were lilOS, which matters most with one user and no sign-in.
 */
export function checkHost(req, { origins, loopbackOrigins }) {
  let host;
  try { host = new URL(`http://${req.headers.host ?? ''}`).hostname; } catch { fail('forbidden', t('badHost')); }
  if (LOOPBACK.has(host) && (loopbackOrigins || !origins.length)) return;
  if (origins.some(o => { try { return new URL(o).hostname === host; } catch { return false; } })) return;
  fail('forbidden', t('badHost'));
}

export const clientIp = req => req.socket.remoteAddress ?? '';
