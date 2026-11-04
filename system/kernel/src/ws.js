import { createHash, randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';
import { connectTo } from './net/connect.js';
import { defineStrings } from './strings.js';

/**
 * A WebSocket (RFC 6455) on a request the HTTP server handed over with 'upgrade': the live
 * channels of the kernel (remote terminals) without a library. Only what browsers use: text and
 * binary messages (fragmented too), ping/pong, close; no extensions (no compression), no
 * subprotocols. Frames from the browser must be masked; a message is at most `maxMessage` bytes.
 *
 *   const ws = acceptSocket(req, socket, head, { maxMessage })    null if the request is not a WebSocket one
 *   ws.send(data)              a string goes as text, a Buffer / Uint8Array as binary
 *   ws.close(code?, reason?)   then 'close' { code, reason }
 *   ws.buffered                bytes waiting to be sent (to slow down who writes)
 *   events  'message' (data: Buffer, binary: boolean) · 'drain' · 'close' ({ code, reason })
 *
 * The other side is pinged every 30 s; with no answer for 75 s the socket is dropped (code 1006).
 *
 * The kernel is also a client (since lilOS 1.25.0: NetTest's WebSocket sessions), to a server a user
 * names, through connectTo() (the guard's lookup, the certificate checked or confirmed):
 *
 *   connectSocket(url, { headers, protocols, lookup, signal, timeoutMs, tls, maxMessage, timings })
 *     → { ws, response: { status, headers: [[name, value]], protocol }, tls }
 *   url: ws: or wss:. The frames it sends are masked; the server's must not be. ws.ping(data?) sends a
 *   ping, 'pong' (data) and 'ping' (data) tell what came. A refused handshake throws with
 *   `response` { status, headers } (what the server answered instead).
 */
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const { t } = defineStrings('lilos:kernel.ws', { en: { strings: {
  needWs: 'A ws:// or wss:// address is needed', noAnswer: 'The server did not answer the opening',
  cancelled: 'Cancelled', tooLong: 'Server response too long', notHttp: 'The server did not answer in HTTP',
  closed: 'The server closed the connection', status: 'The server answered {status} instead of opening the WebSocket',
  notOpened: 'The server did not open a WebSocket', badAccept: 'Server response not valid (Sec-WebSocket-Accept)',
  extensions: 'The server asked for extensions that were not offered', protocol: 'The server chose a subprotocol that was not offered',
} } });
/** An error whose message reaches the user: `text` is the Text (net/connect.js networkMessage), `message` the English one. */
const error = (text, extra) => Object.assign(new Error(String(text)), { text }, extra);
const OP = { cont: 0, text: 1, binary: 2, close: 8, ping: 9, pong: 10 };
const PING_EVERY = 30_000;
const DEAD_AFTER = 75_000;

export function acceptSocket(req, socket, head, { maxMessage = 1 << 20 } = {}) {
  const key = req.headers['sec-websocket-key'];
  if (req.method !== 'GET' || String(req.headers.upgrade ?? '').toLowerCase() !== 'websocket'
    || req.headers['sec-websocket-version'] !== '13' || typeof key !== 'string' || !/^[A-Za-z0-9+/]{22}==$/.test(key)) return null;
  const accept = createHash('sha1').update(key + GUID).digest('base64');
  socket.write([
    'HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${accept}`, '', '',
  ].join('\r\n'));
  return new Socket(socket, head, maxMessage);
}

/** Refuses an upgrade with an HTTP status (before the handshake). */
export function refuseUpgrade(socket, status, text) {
  if (!socket.writable) return socket.destroy();
  socket.end(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(text)}\r\n\r\n${text}`);
}

class Socket extends EventEmitter {
  #socket;
  #maxMessage;
  #input = Buffer.alloc(0);
  #parts = [];          // the fragments of the message being received
  #partsSize = 0;
  #partsBinary = false;
  #closing = false;
  #closed = false;
  #lastSeen = Date.now();
  #timer;
  #client;

  constructor(socket, head, maxMessage, { client = false } = {}) {
    super();
    this.#socket = socket;
    this.#maxMessage = maxMessage;
    this.#client = client;
    socket.setNoDelay(true);
    socket.setTimeout(0);
    socket.on('data', chunk => this.#receive(chunk));
    socket.on('drain', () => this.emit('drain'));
    socket.on('error', () => {});
    socket.on('close', () => this.#gone(1006, ''));
    this.#timer = setInterval(() => {
      if (Date.now() - this.#lastSeen > DEAD_AFTER) return socket.destroy();
      this.#frame(OP.ping, Buffer.alloc(0));
    }, PING_EVERY);
    this.#timer.unref?.();
    if (head?.length) queueMicrotask(() => this.#receive(head));
  }

  get buffered() { return this.#socket.writableLength; }
  get open() { return !this.#closing && !this.#closed; }

  send(data) {
    if (!this.open) return false;
    if (typeof data === 'string') return this.#frame(OP.text, Buffer.from(data, 'utf8'));
    return this.#frame(OP.binary, Buffer.isBuffer(data) ? data : Buffer.from(data.buffer, data.byteOffset, data.byteLength));
  }

  /** A ping with up to 125 bytes of data (the client's 'Ping' button). */
  ping(data = Buffer.alloc(0)) {
    return this.open ? this.#frame(OP.ping, Buffer.from(data).subarray(0, 125)) : false;
  }

  close(code = 1000, reason = '') {
    if (this.#closed) return;
    if (!this.#closing) {
      this.#closing = true;
      const text = Buffer.from(String(reason).slice(0, 120), 'utf8');
      const body = Buffer.alloc(2 + text.length);
      body.writeUInt16BE(code, 0);
      text.copy(body, 2);
      this.#frame(OP.close, body, true);
    }
    // The other side answers with its close frame; if it does not, the socket goes anyway
    setTimeout(() => this.#socket.destroy(), 2000).unref?.();
  }

  #frame(op, payload, force = false) {
    if (this.#closed || (this.#closing && !force) || !this.#socket.writable) return false;
    const len = payload.length;
    const head = len < 126 ? Buffer.alloc(2) : len < 65536 ? Buffer.alloc(4) : Buffer.alloc(10);
    head[0] = 0x80 | op;
    if (len < 126) head[1] = len;
    else if (len < 65536) { head[1] = 126; head.writeUInt16BE(len, 2); }
    else { head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
    if (this.#client) {
      // A client masks what it sends (RFC 6455 5.3)
      head[1] |= 0x80;
      const mask = randomBytes(4);
      const masked = Buffer.from(payload);
      for (let i = 0; i < masked.length; i++) masked[i] ^= mask[i & 3];
      this.#socket.write(head);
      this.#socket.write(mask);
      return this.#socket.write(masked);
    }
    this.#socket.write(head);
    return this.#socket.write(payload);
  }

  #fail(code, reason) {
    this.close(code, reason);
    this.#input = Buffer.alloc(0);
  }

  #receive(chunk) {
    this.#lastSeen = Date.now();
    this.#input = this.#input.length ? Buffer.concat([this.#input, chunk]) : chunk;
    while (!this.#closed) {
      const b = this.#input;
      if (b.length < 2) return;
      const fin = (b[0] & 0x80) !== 0, op = b[0] & 0x0f, masked = (b[1] & 0x80) !== 0;
      if (b[0] & 0x70) return this.#fail(1002, 'extensions not supported');
      if (masked === this.#client) return this.#fail(1002, this.#client ? 'frames must not be masked' : 'frames must be masked');
      const maskLen = masked ? 4 : 0;
      let len = b[1] & 0x7f, at = 2;
      if (len === 126) {
        if (b.length < 4) return;
        len = b.readUInt16BE(2); at = 4;
      } else if (len === 127) {
        if (b.length < 10) return;
        const big = b.readBigUInt64BE(2);
        if (big > BigInt(this.#maxMessage)) return this.#fail(1009, 'message too big');
        len = Number(big); at = 10;
      }
      if (op >= 8 && (len > 125 || !fin)) return this.#fail(1002, 'bad control frame');
      if (len > this.#maxMessage) return this.#fail(1009, 'message too big');
      if (b.length < at + maskLen + len) return;
      const payload = Buffer.from(b.subarray(at + maskLen, at + maskLen + len));
      if (masked) {
        const mask = b.subarray(at, at + 4);
        for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      }
      this.#input = b.subarray(at + maskLen + len);
      this.#onFrame(fin, op, payload);
    }
  }

  #onFrame(fin, op, payload) {
    if (op === OP.ping) {
      this.emit('ping', payload);
      return this.#frame(OP.pong, payload);
    }
    if (op === OP.pong) return this.emit('pong', payload);
    if (op === OP.close) {
      const code = payload.length >= 2 ? payload.readUInt16BE(0) : 1005;
      const reason = payload.length > 2 ? payload.subarray(2).toString('utf8') : '';
      if (!this.#closing) {
        this.#closing = true;
        this.#frame(OP.close, payload.subarray(0, 2), true);
      }
      this.#socket.end();
      return this.#gone(code, reason);
    }
    if (op === OP.text || op === OP.binary) {
      if (this.#parts.length) return this.#fail(1002, 'unfinished message');
      this.#partsBinary = op === OP.binary;
    } else if (op !== OP.cont || !this.#parts.length) {
      return this.#fail(1002, 'unexpected frame');
    }
    this.#partsSize += payload.length;
    if (this.#partsSize > this.#maxMessage) return this.#fail(1009, 'message too big');
    this.#parts.push(payload);
    if (!fin) return;
    const data = this.#parts.length === 1 ? this.#parts[0] : Buffer.concat(this.#parts);
    this.#parts = [];
    this.#partsSize = 0;
    if (this.#closing) return;
    this.emit('message', data, this.#partsBinary);
  }

  #gone(code, reason) {
    if (this.#closed) return;
    this.#closed = true;
    this.#closing = true;
    clearInterval(this.#timer);
    this.emit('close', { code, reason });
  }
}

const TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const MAX_HEAD = 64 << 10;
const ms = timings => Math.round((performance.now() - timings.start) * 10) / 10;

/** A WebSocket to a server (see above). */
export async function connectSocket(url, { headers = [], protocols = [], lookup, signal, timeoutMs = 30_000, tls = {}, maxMessage = 16 << 20, timings = {} } = {}) {
  if (url.protocol !== 'ws:' && url.protocol !== 'wss:') throw error(t('needWs'), { code: 'EINVAL' });
  const secure = url.protocol === 'wss:';
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const port = Number(url.port) || (secure ? 443 : 80);
  const { socket, tls: info } = await connectTo({ host, port, secure, lookup, signal, timeoutMs, alpn: secure ? ['http/1.1'] : undefined, tls, timings });
  const key = randomBytes(16).toString('base64');
  const wanted = protocols.filter(p => TOKEN.test(p));
  const lines = [`GET ${url.pathname || '/'}${url.search} HTTP/1.1`, `Host: ${url.host}`, 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Key: ${key}`, 'Sec-WebSocket-Version: 13'];
  if (wanted.length) lines.push(`Sec-WebSocket-Protocol: ${wanted.join(', ')}`);
  const reserved = /^(host|upgrade|connection|sec-websocket-(key|version|extensions|protocol))$/i;
  for (const [k, v] of headers) if (TOKEN.test(k) && !reserved.test(k) && !/[\r\n]/.test(v)) lines.push(`${k}: ${v}`);
  socket.write(`${lines.join('\r\n')}\r\n\r\n`);
  timings.sent = ms(timings);
  const { status, pairs, rest } = await new Promise((resolve, reject) => {
    let got = Buffer.alloc(0);
    const timer = setTimeout(() => stop(error(t('noAnswer'), { code: 'ETIMEDOUT' })), timeoutMs);
    const onAbort = () => stop(error(t('cancelled'), { code: 'ABORT_ERR' }));
    signal?.addEventListener('abort', onAbort, { once: true });
    const onData = chunk => {
      got = Buffer.concat([got, chunk]);
      const end = got.indexOf('\r\n\r\n');
      if (end < 0) return got.length > MAX_HEAD && stop(error(t('tooLong')));
      const [first, ...rows] = got.subarray(0, end).toString('latin1').split('\r\n');
      const m = /^HTTP\/1\.[01] (\d{3})/.exec(first);
      if (!m) return stop(error(t('notHttp')));
      const list = rows.map(r => [r.slice(0, r.indexOf(':')).trim(), r.slice(r.indexOf(':') + 1).trim()]).filter(([k]) => k);
      stop(null, { status: Number(m[1]), pairs: list, rest: got.subarray(end + 4) });
    };
    const closed = () => stop(error(t('closed')));
    function stop(err, value) {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      socket.off('data', onData);
      socket.off('error', stop);
      socket.off('close', closed);
      if (err) { socket.destroy(); reject(err); } else resolve(value);
    }
    socket.on('data', onData);
    socket.once('error', stop);
    socket.once('close', closed);
  });
  timings.firstByte = ms(timings);
  const get = name => pairs.find(([k]) => k.toLowerCase() === name)?.[1] ?? '';
  const response = { status, headers: pairs, protocol: get('sec-websocket-protocol') || null };
  const refuse = text => {
    socket.destroy();
    throw error(text, { code: 'EWSREFUSED', response });
  };
  if (status !== 101) refuse(t('status', { status }));
  if (get('upgrade').toLowerCase() !== 'websocket') refuse(t('notOpened'));
  if (get('sec-websocket-accept') !== createHash('sha1').update(key + GUID).digest('base64')) refuse(t('badAccept'));
  if (get('sec-websocket-extensions')) refuse(t('extensions'));
  if (response.protocol && !wanted.includes(response.protocol)) refuse(t('protocol'));
  const ws = new Socket(socket, rest, maxMessage, { client: true });
  return { ws, response, tls: info };
}
