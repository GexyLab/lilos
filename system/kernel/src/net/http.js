import http from 'node:http';
import http2 from 'node:http2';
import zlib from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { fail } from '../errors.js';
import { connectTo } from './connect.js';
import { defineStrings } from '../strings.js';

const { t } = defineStrings('lilos:kernel.net.http', { en: { strings: {
  needHttp: 'An http or https address is needed',
  noAnswer: { one: 'No answer in {n} second', other: 'No answer in {n} seconds' },
} } });

/**
 * The kernel's HTTP client, for the requests users make it do: the scheduler's web operations
 * (schedule/web.js) and NetTest's (calls/). One connection per request, made with connectTo() (the
 * guard's lookup, the certificate checked or confirmed by the user), HTTP/1.1 or HTTP/2 (by ALPN
 * on https, or asked), with the time of every step.
 *
 *   httpRequest(url, { method, headers, body, lookup, signal, timeoutMs, tls, version, timings })
 *     url       a URL (http: or https:)
 *     headers   [[name, value]] in order (duplicates kept), or { name: value }
 *     body      Buffer | string | undefined
 *     tls       as connectTo's (verify, pinned, ca, cert, key…)
 *     version   'auto' (HTTP/2 when the server offers it on https) | '1.1' | '2'
 *   → { status, statusText, httpVersion, headers: [[name, value]], body (Readable: the bytes as sent,
 *       compressed if the server compressed them; destroy() to drop them), tls, remote: { address, port },
 *       timings: { start, lookup?, connect?, secure?, sent, firstByte } }
 *
 *   readBody(res, { max, decode }) → { data: Buffer, size (bytes received), truncated }
 *     reads the body (decoded from gzip, deflate, br and zstd when `decode`), at most `max` bytes kept;
 *     sets res.timings.done
 *
 * No redirects are followed here (callers decide, checking each address with the guard), nothing
 * is added to the headers but Host and, when there is a body and no Content-Length, its length.
 */
const TIMEOUT = 30_000;
const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade', 'host', 'te']);

const now = () => performance.now();
const since = (timings, at = now()) => Math.round((at - timings.start) * 10) / 10;

/** Headers as [[name, value]], from an array of pairs or an object. */
export function headerList(headers) {
  if (Array.isArray(headers)) return headers.filter(h => Array.isArray(h) && h.length === 2).map(([k, v]) => [String(k), String(v)]);
  return Object.entries(headers ?? {}).flatMap(([k, v]) => [].concat(v).map(one => [k, String(one)]));
}

export const findHeader = (list, name) => list.find(([k]) => k.toLowerCase() === name)?.[1];

export async function httpRequest(url, { method = 'GET', headers = [], body, lookup, signal, timeoutMs = TIMEOUT, tls = {}, version = 'auto', timings = {} } = {}) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') fail('invalid', t('needHttp'));
  timings.start ??= now();
  const secure = url.protocol === 'https:';
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const port = Number(url.port) || (secure ? 443 : 80);
  const alpn = secure ? (version === '1.1' ? ['http/1.1'] : version === '2' ? ['h2'] : ['h2', 'http/1.1']) : undefined;
  const timeout = AbortSignal.timeout(timeoutMs);
  const both = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let conn;
  try {
    conn = await connectTo({ host, port, secure, lookup, signal: both, timeoutMs, alpn, tls, timings });
  } catch (err) {
    throw timedOut(err, timeout, timeoutMs);
  }
  const { socket } = conn;
  const remote = { address: socket.remoteAddress ?? null, port: socket.remotePort ?? null };
  const list = headerList(headers);
  const payload = body === undefined || body === null ? undefined : Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  if (payload !== undefined && !findHeader(list, 'content-length') && !findHeader(list, 'transfer-encoding')) list.push(['Content-Length', String(payload.length)]);
  const h2 = secure ? socket.alpnProtocol === 'h2' : version === '2';
  try {
    const res = await (h2 ? viaHttp2 : viaHttp1)({ url, method, list, payload, socket, signal: both, timings });
    return { ...res, tls: conn.tls, remote, timings };
  } catch (err) {
    socket.destroy();
    throw timedOut(err, timeout, timeoutMs);
  }
}

function timedOut(err, timeout, ms) {
  if (!timeout.aborted) return err;
  const text = t('noAnswer', { n: Math.round(ms / 1000) });
  return Object.assign(new Error(String(text)), { code: 'ETIMEDOUT', text });
}

function viaHttp1({ url, method, list, payload, socket, signal, timings }) {
  return new Promise((resolve, reject) => {
    const raw = [];
    if (!findHeader(list, 'host')) raw.push('Host', url.host);
    for (const [k, v] of list) raw.push(k, v);
    const req = http.request({
      method, path: `${url.pathname || '/'}${url.search}`, headers: raw, signal, setHost: false,
      createConnection: () => socket,
    }, res => {
      timings.firstByte = since(timings);
      const pairs = [];
      for (let i = 0; i < res.rawHeaders.length; i += 2) pairs.push([res.rawHeaders[i], res.rawHeaders[i + 1]]);
      res.once('close', () => socket.destroy());
      resolve({ status: res.statusCode, statusText: res.statusMessage ?? '', httpVersion: res.httpVersion, headers: pairs, body: res });
    });
    req.once('error', reject);
    req.once('finish', () => { timings.sent = since(timings); });
    req.end(payload);
  });
}

function viaHttp2({ url, method, list, payload, socket, signal, timings }) {
  return new Promise((resolve, reject) => {
    const client = http2.connect(url.origin, { createConnection: () => socket });
    client.once('error', reject);
    const headers = { ':method': method, ':path': `${url.pathname || '/'}${url.search}`, ':scheme': url.protocol.slice(0, -1), ':authority': findHeader(list, 'host') ?? url.host };
    for (const [k, v] of list) {
      const name = k.toLowerCase();
      if (HOP_BY_HOP.has(name)) continue;
      headers[name] = name in headers ? [].concat(headers[name], v) : v;
    }
    const req = client.request(headers, { endStream: payload === undefined, signal });
    req.once('error', err => { client.destroy(); reject(err); });
    req.once('response', h => {
      timings.firstByte = since(timings);
      const pairs = [];
      for (const [k, v] of Object.entries(h)) if (!k.startsWith(':')) for (const one of [].concat(v)) pairs.push([k, String(one)]);
      req.once('close', () => client.close());
      resolve({ status: Number(h[':status']), statusText: http.STATUS_CODES[h[':status']] ?? '', httpVersion: '2', headers: pairs, body: req });
    });
    if (payload !== undefined) req.end(payload, () => { timings.sent = since(timings); });
    else timings.sent = since(timings);
  });
}

const DECODERS = {
  gzip: () => zlib.createGunzip(), 'x-gzip': () => zlib.createGunzip(), deflate: () => zlib.createInflate(),
  br: () => zlib.createBrotliDecompress(), ...(zlib.createZstdDecompress && { zstd: () => zlib.createZstdDecompress() }),
};

/** The body of a response: read, decoded when asked and possible, at most `max` bytes kept. */
export async function readBody(res, { max = 20 << 20, decode = true } = {}) {
  const coding = String(findHeader(res.headers, 'content-encoding') ?? '').trim().toLowerCase();
  let size = 0;
  res.body.on('data', chunk => { size += chunk.length; });
  const decoder = decode && DECODERS[coding]?.();
  const source = decoder ? res.body.pipe(decoder) : res.body;
  if (decoder) res.body.once('error', err => decoder.destroy(err));
  const chunks = [];
  let kept = 0, truncated = false;
  try {
    for await (const chunk of source) {
      if (kept + chunk.length > max) {
        chunks.push(chunk.subarray(0, max - kept));
        kept = max;
        truncated = true;
        res.body.destroy();
        break;
      }
      chunks.push(chunk);
      kept += chunk.length;
    }
  } catch (err) {
    if (!truncated) throw err;
  }
  res.timings.done = since(res.timings);
  return { data: Buffer.concat(chunks), size, truncated, decoded: !!decoder };
}
