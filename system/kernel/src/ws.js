import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';

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
 */
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
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

  constructor(socket, head, maxMessage) {
    super();
    this.#socket = socket;
    this.#maxMessage = maxMessage;
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
      if (!masked) return this.#fail(1002, 'frames must be masked');
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
      if (b.length < at + 4 + len) return;
      const mask = b.subarray(at, at + 4);
      const payload = Buffer.from(b.subarray(at + 4, at + 4 + len));
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      this.#input = b.subarray(at + 4 + len);
      this.#onFrame(fin, op, payload);
    }
  }

  #onFrame(fin, op, payload) {
    if (op === OP.ping) return this.#frame(OP.pong, payload);
    if (op === OP.pong) return;
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
