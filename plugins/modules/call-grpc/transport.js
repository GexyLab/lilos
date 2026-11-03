import http2 from 'node:http2';
import zlib from 'node:zlib';
import { netError } from './lib/shared/errors.js';

/**
 * gRPC over HTTP/2 (the protocol of grpc.io's PROTOCOL-HTTP2.md), on node:http2 directly: the
 * socket is the kernel's (ctx.connectTo, through its guard), TLS with ALPN h2 or plain TCP with
 * HTTP/2 prior knowledge (h2c). One HTTP/2 session per connection, one stream per call.
 *
 *   openConnection(values, ctx) → conn { session, target, tls, remote, close() }
 *   startCall(conn, path, { metadata, timeoutMs }, { onHeaders, onMessage, onEnd }) → call
 *       call.write(bytes) · call.end() (half-close) · call.cancel()
 *       onEnd({ status, message, headers, trailers, error? }) once: `error` is a failure of the
 *       connection (the call never got a status), anything else is a gRPC status
 *
 * A message on the wire: 1 byte compressed flag, 4 bytes length (big endian), the bytes. Sent
 * uncompressed; received identity, gzip or deflate (grpc-encoding).
 */
const MAX_MESSAGE = 32 << 20;
const USER_AGENT = 'lilOS-NetTest/1.0 grpc';
const RESERVED = new Set(['content-type', 'te', 'grpc-timeout', 'grpc-encoding', 'grpc-accept-encoding', 'connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade', 'host']);

export const STATUS = [
  'OK', 'CANCELLED', 'UNKNOWN', 'INVALID_ARGUMENT', 'DEADLINE_EXCEEDED', 'NOT_FOUND', 'ALREADY_EXISTS', 'PERMISSION_DENIED',
  'RESOURCE_EXHAUSTED', 'FAILED_PRECONDITION', 'ABORTED', 'OUT_OF_RANGE', 'UNIMPLEMENTED', 'INTERNAL', 'UNAVAILABLE', 'DATA_LOSS', 'UNAUTHENTICATED',
];
export const OK = 0, CANCELLED = 1, UNKNOWN = 2, DEADLINE_EXCEEDED = 4, RESOURCE_EXHAUSTED = 8, PERMISSION_DENIED = 7, UNIMPLEMENTED = 12, INTERNAL = 13, UNAVAILABLE = 14, UNAUTHENTICATED = 16;
export const statusName = code => STATUS[code] ?? `STATUS_${code}`;

const str = v => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v));

/** The settings' deadline in ms (0: none). */
export const timeoutOf = settings => {
  const n = Number(settings?.timeoutMs);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), 24 * 3600_000) : 0;
};

/** 'grpcs://host:port', 'grpc://…', 'https://…' or 'host:port' (plain) → { host, port, secure, authority }. */
export function targetOf(url) {
  let text = str(url).trim();
  if (!text) throw netError('invalid', 'Manca l\'indirizzo del server');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `grpc://${text}`;
  let u;
  try { u = new URL(text); } catch { throw netError('invalid', 'Indirizzo non valido'); }
  const scheme = u.protocol.slice(0, -1).toLowerCase();
  if (!['grpc', 'grpcs', 'http', 'https'].includes(scheme)) throw netError('invalid', `Schema non supportato: ${scheme} (usa grpc:// o grpcs://)`);
  const secure = scheme === 'grpcs' || scheme === 'https';
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (!host) throw netError('invalid', 'Manca il server');
  const port = u.port ? Number(u.port) : secure ? 443 : 80;
  return { host, port, secure, authority: `${host.includes(':') ? `[${host}]` : host}:${port}` };
}

/** The request's metadata as HTTP/2 headers: keys in lower case, a key given twice sent twice. */
export function metadataOf(list) {
  const out = {};
  for (const h of Array.isArray(list) ? list : []) {
    if (!h || h.enabled === false || !str(h.key).trim()) continue;
    const key = str(h.key).trim().toLowerCase();
    if (!/^[0-9a-z_.-]+$/.test(key)) throw netError('invalid', `Nome di metadato non valido: ${key}`);
    if (RESERVED.has(key)) throw netError('invalid', `Metadato riservato a gRPC: ${key}`);
    const value = str(h.value);
    if (/[\r\n\0]/.test(value)) throw netError('invalid', `Valore non valido per il metadato ${key}`);
    out[key] = key in out ? [].concat(out[key], value) : value;
  }
  return out;
}

/** Response headers or trailers as { key: value } (pseudo-headers out, repeated ones joined). */
export function flatHeaders(h) {
  const out = {};
  for (const [k, v] of Object.entries(h ?? {})) if (!k.startsWith(':')) out[k] = Array.isArray(v) ? v.join(', ') : str(v);
  return out;
}

/** grpc-message is percent-encoded. */
const messageOf = v => {
  const text = str(Array.isArray(v) ? v[0] : v);
  try { return decodeURIComponent(text); } catch { return text; }
};

/** A deadline as grpc-timeout wants it: at most 8 digits and a unit. */
const grpcTimeout = ms => (ms < 1e8 ? `${ms}m` : `${Math.ceil(ms / 1000)}S`);

/** HTTP status of a response that is not gRPC → the status a client reports (PROTOCOL-HTTP2.md). */
const fromHttp = code => ({ 400: INTERNAL, 401: UNAUTHENTICATED, 403: PERMISSION_DENIED, 404: UNIMPLEMENTED, 429: UNAVAILABLE, 502: UNAVAILABLE, 503: UNAVAILABLE, 504: UNAVAILABLE })[code] ?? UNKNOWN;

/** RST_STREAM without a status → the status a client reports. */
const fromReset = code => {
  const c = http2.constants;
  if (code === c.NGHTTP2_REFUSED_STREAM) return UNAVAILABLE;
  if (code === c.NGHTTP2_CANCEL) return CANCELLED;
  if (code === c.NGHTTP2_ENHANCE_YOUR_CALM) return RESOURCE_EXHAUSTED;
  if (code === c.NGHTTP2_INADEQUATE_SECURITY) return PERMISSION_DENIED;
  return INTERNAL;
};

const WORDS = {
  ECONNREFUSED: 'Connessione rifiutata', ECONNRESET: 'Connessione interrotta dal server', ENOTFOUND: 'Nome del server sconosciuto',
  ETIMEDOUT: 'Tempo scaduto', EPIPE: 'Connessione chiusa', EHOSTUNREACH: 'Server irraggiungibile', ENETUNREACH: 'Rete irraggiungibile',
  ERR_HTTP2_ERROR: 'Errore del protocollo HTTP/2', ERR_HTTP2_SESSION_ERROR: 'Il server ha chiuso la connessione HTTP/2 per un errore',
  ERR_HTTP2_GOAWAY_SESSION: 'Il server ha chiuso la connessione HTTP/2', ERR_HTTP2_INVALID_SESSION: 'La connessione HTTP/2 è chiusa',
  ERR_HTTP2_STREAM_CANCEL: 'Chiamata annullata', ABORT_ERR: 'Annullato',
};

/** An error as a short line for the user: the kernel's and the drivers' as they are, Node's in words. */
export function reasonOf(err) {
  if (err?.net || err?.constructor?.name === 'KernelError') return str(err.message);
  const code = str(err?.code ?? err?.cause?.code);
  return WORDS[code] ? `${WORDS[code]} (${code})` : str(err?.message ?? err).slice(0, 200) || 'Errore di rete';
}

/** Connects to the server of values.url: the guard checks the name, the socket goes through ctx.lookup. */
export async function openConnection(values, ctx) {
  if (typeof ctx?.connectTo !== 'function' || typeof ctx.lookup !== 'function') throw netError('unsupported', 'Questo modulo richiede una versione di lilOS con NetTest: aggiorna lilOS');
  const target = targetOf(values.url);
  await ctx.check({ host: target.host });
  const timeoutMs = timeoutOf(values.settings);
  const { socket, tls } = await ctx.connectTo({
    host: target.host, port: target.port, secure: target.secure, lookup: ctx.lookup, signal: ctx.signal,
    ...(timeoutMs && { timeoutMs: Math.min(timeoutMs, 30_000) }),
    tls: target.secure ? await ctx.tls(target.host, target.port) : {},
    alpn: target.secure ? ['h2'] : undefined,
  }).catch(err => {
    // The handshake of a server that does not speak TLS there: said in words ('untrusted' and the rest as they are)
    const code = str(err?.code);
    if (code === 'ERR_SSL_WRONG_VERSION_NUMBER' || code === 'ERR_SSL_PACKET_LENGTH_TOO_LONG') throw netError('unreachable', 'Il server non risponde in TLS su questa porta (forse va usato grpc://)', { code });
    if (code.startsWith('ERR_SSL_')) throw netError('unreachable', `TLS non riuscito (${code})`, { code });
    throw err;
  });
  if (target.secure && typeof socket.alpnProtocol === 'string' && socket.alpnProtocol !== 'h2') {
    socket.destroy();
    throw netError('unsupported', `Il server non parla HTTP/2 (ALPN ${socket.alpnProtocol}): non è un server gRPC`);
  }
  const session = http2.connect(`${target.secure ? 'https' : 'http'}://${target.authority}`, { createConnection: () => socket, settings: { enablePush: false } });
  const conn = {
    session, target, tls, remote: `${socket.remoteAddress}:${socket.remotePort}`, error: null, calls: new Set(), answered: false,
    close() { if (!session.destroyed) session.destroy(); },
    // A server that never answered: maybe not HTTP/2 there, or TLS wanted
    closedError: () => netError('lost', conn.answered ? 'Il server ha chiuso la connessione' : `Il server ha chiuso la connessione senza rispondere in HTTP/2${target.secure ? '' : ' (non è gRPC, o vuole grpcs://)'}`),
  };
  const lost = err => {
    conn.error ??= err;
    for (const c of [...conn.calls]) c.fail(conn.error);
  };
  session.on('error', err => lost(err));
  session.on('goaway', code => { if (code !== http2.constants.NGHTTP2_NO_ERROR) conn.error ??= netError('lost', `Il server ha chiuso la connessione HTTP/2 (GOAWAY ${code})`); });
  session.on('close', () => lost(conn.closedError()));
  const onAbort = () => { lost(Object.assign(new Error('Annullato'), { name: 'AbortError', code: 'ABORT_ERR' })); conn.close(); };
  ctx.signal?.addEventListener('abort', onAbort, { once: true });
  session.once('close', () => ctx.signal?.removeEventListener('abort', onAbort));
  return conn;
}

/** One call on the connection: see the comment at the top. */
export function startCall(conn, path, { metadata = {}, timeoutMs = 0 } = {}, { onHeaders, onMessage, onEnd }) {
  let stream = null, headers = null, trailers = null, local = null, done = false, timer = null;
  let encoding = 'identity';
  const finish = end => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    conn.calls.delete(call);
    onEnd({ headers: headers ? flatHeaders(headers) : {}, trailers: trailers ? flatHeaders(trailers) : {}, ...end });
  };
  const stop = (status, message) => {
    local ??= { status, message };
    if (stream && !stream.destroyed) stream.close(http2.constants.NGHTTP2_CANCEL);
    else finish(local);
  };

  // The messages: frames over the DATA chunks, a frame read only when all of it is here
  let chunks = [], size = 0, need = 5;
  const frame = (flag, bytes) => {
    if (flag & 1) {
      try {
        const max = { maxOutputLength: MAX_MESSAGE };
        if (encoding === 'gzip') bytes = zlib.gunzipSync(bytes, max);
        else if (encoding === 'deflate') bytes = zlib.inflateSync(bytes, max);
        else return stop(INTERNAL, `Messaggio compresso con ${encoding}: non supportato`);
      } catch {
        return stop(INTERNAL, 'Messaggio compresso non leggibile');
      }
    }
    onMessage(bytes);
  };
  const data = chunk => {
    chunks.push(chunk);
    size += chunk.length;
    if (size < need) return;
    let buf = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, size);
    while (buf.length >= 5 && !local) {
      const length = buf.readUInt32BE(1);
      if (length > MAX_MESSAGE) return stop(RESOURCE_EXHAUSTED, `Messaggio troppo grande (${length} byte, al massimo ${MAX_MESSAGE})`);
      if (buf.length < 5 + length) break;
      frame(buf[0], buf.subarray(5, 5 + length));
      buf = buf.subarray(5 + length);
    }
    chunks = buf.length ? [buf] : [];
    size = buf.length;
    need = buf.length >= 5 ? 5 + buf.readUInt32BE(1) : 5;
  };

  const call = {
    write(bytes) {
      if (done || !stream || stream.destroyed) throw netError('invalid', 'La chiamata è finita');
      if (bytes.length > MAX_MESSAGE) throw netError('invalid', 'Messaggio troppo grande');
      const prefix = Buffer.alloc(5);
      prefix.writeUInt32BE(bytes.length, 1);
      stream.write(Buffer.concat([prefix, bytes]));
    },
    end() { if (stream && !stream.destroyed && stream.writable) stream.end(); },
    cancel() { stop(CANCELLED, 'Annullata'); },
    fail(err) { if (!headers && !trailers) finish({ status: UNAVAILABLE, message: reasonOf(err), error: err }); else if (stream && !stream.destroyed) stream.destroy(); },
  };
  conn.calls.add(call);
  if (conn.error) { finish({ status: UNAVAILABLE, message: reasonOf(conn.error), error: conn.error }); return call; }

  try {
    stream = conn.session.request({
      ':method': 'POST', ':path': path, ':scheme': conn.target.secure ? 'https' : 'http', ':authority': conn.target.authority,
      ...metadata,
      'content-type': 'application/grpc', te: 'trailers', 'grpc-accept-encoding': 'identity,deflate,gzip',
      ...(!metadata['user-agent'] && { 'user-agent': USER_AGENT }),
      ...(timeoutMs && { 'grpc-timeout': grpcTimeout(timeoutMs) }),
    }, { endStream: false });
  } catch (err) {
    finish({ status: UNAVAILABLE, message: reasonOf(err), error: err });
    return call;
  }
  if (timeoutMs) timer = setTimeout(() => stop(DEADLINE_EXCEEDED, `Tempo scaduto (${timeoutMs} ms)`), timeoutMs);
  stream.on('response', h => {
    headers = h;
    conn.answered = true;
    encoding = str(h['grpc-encoding']).toLowerCase() || 'identity';
    onHeaders?.(flatHeaders(h));
  });
  stream.on('data', chunk => { if (!local) data(chunk); });
  stream.on('trailers', t => { trailers = t; });
  stream.on('error', () => { /* the status comes from close: rstCode, trailers or the connection */ });
  stream.on('close', () => {
    if (local) return finish(local);
    // Closed with the whole connection: its error comes a moment later, after the streams'
    if (!headers && !trailers && !conn.error && (conn.session.destroyed || conn.session.closed)) return setImmediate(closedWith);
    closedWith();
  });
  const closedWith = () => {
    if (local) return finish(local);
    if (!headers && !trailers && !conn.error && (conn.session.destroyed || conn.session.closed)) {
      const error = conn.closedError();
      return finish({ status: UNAVAILABLE, message: error.message, error });
    }
    const end = trailers ?? (headers && headers['grpc-status'] !== undefined ? headers : null);
    if (end && end['grpc-status'] !== undefined) {
      const status = Number(str(end['grpc-status']));
      return finish({ status: Number.isInteger(status) && status >= 0 ? status : UNKNOWN, message: messageOf(end['grpc-message']) });
    }
    if (headers) {
      const http = Number(headers[':status']);
      if (http !== 200) return finish({ status: fromHttp(http), message: `Il server ha risposto HTTP ${http}` });
      const type = str(headers['content-type']);
      if (!/^application\/grpc/i.test(type)) return finish({ status: UNKNOWN, message: `Il server non ha risposto con gRPC (${type || 'senza content-type'})` });
    }
    if (conn.error) return finish({ status: UNAVAILABLE, message: reasonOf(conn.error), error: conn.error });
    if (stream.rstCode) return finish({ status: fromReset(stream.rstCode), message: `Il server ha chiuso la chiamata (RST_STREAM ${stream.rstCode})` });
    finish({ status: INTERNAL, message: 'La risposta è finita senza stato gRPC' });
  };
  return call;
}
