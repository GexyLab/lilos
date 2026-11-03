import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { Transform } from 'node:stream';
import { netError, socketError } from './errors.js';
import { certificateOf } from './trust.js';
import { sleep, retryDelay } from './time.js';

/**
 * HTTP for the drivers that speak to a server of the user's (S3, Azure Blob Storage, WebDAV), with
 * node:http: agents that check TLS before anything is sent, one request with its failures mapped,
 * a loop that tries again what can be sent again, bodies read with a limit, downloads that resume.
 */
export const REQUEST_TIMEOUT = 60_000;    // a request with no data either way for this long fails
const IDLE_SOCKET = 4_000;                // a kept-alive socket goes after this (before servers close theirs)
const RETRIES = 3;
const MAX_WAIT = 20_000;                  // longest Retry-After honored
const RETRY = new Set([429, 500, 502, 503, 504]);

// ---------- TLS (a server with its own certificate, confirmed by the user) ----------

/**
 * Sockets for HTTPS that reach a request only once the server is known: its certificate is valid
 * for the name (socket.authorized), or its SHA-256 fingerprint is `trust`, the one the user
 * confirmed. Otherwise the socket is destroyed right after the handshake, before anything is
 * written to it (no request, so no password), and the request fails with 'untrusted' and the
 * certificate to show (`trust` of the error).
 */
export class TrustAgent extends https.Agent {
  #trust;

  constructor(trust, options) {
    super({ ...options, rejectUnauthorized: false, maxCachedSessions: 0 });   // no resumed sessions: every socket is checked
    this.#trust = trust;
  }

  createConnection(options, callback) {
    const socket = tls.connect({ ...options, rejectUnauthorized: false });
    let done = false;
    const finish = (err, s) => {
      if (done) return;
      done = true;
      socket.off('error', finish);
      callback(err, s);
    };
    socket.once('error', finish);
    socket.once('secureConnect', () => {
      const cert = certificateOf(socket, options.servername || options.host);
      if (socket.authorized || (this.#trust && cert.fingerprint && cert.fingerprint === this.#trust && !socket.isSessionReused())) return finish(null, socket);
      socket.destroy();
      const reason = socket.authorizationError ? ` (${socket.authorizationError})` : '';
      finish(netError('untrusted', `Certificato del server da confermare${reason}`, { trust: cert }));
    });
    return undefined;   // the socket goes to the request through the callback, after the check
  }
}

/**
 * The agents of a session, by protocol ('http:', 'https:'): kept-alive sockets, at most
 * `maxSockets` per server, names resolved through `lookup` (ctx.lookup: only addresses the
 * kernel allows). close() of the session destroys them.
 */
export function sessionAgents(trust, { lookup, maxSockets = 8 } = {}) {
  const options = { keepAlive: true, maxSockets, timeout: IDLE_SOCKET, lookup };
  return { 'http:': new http.Agent(options), 'https:': new TrustAgent(trust, options) };
}

// ---------- Requests ----------

/**
 * One request: resolves with the answer (its body not read yet). body: a Buffer, a stream (piped:
 * once it started, a failure is 'lost') or null. A failed connection rejects with a driver error
 * (socketError), `reused` when it was a kept-alive socket the server had closed (worth sending
 * again once).
 */
export function send(url, { method = 'GET', headers = {}, body = null, agent, signal, timeout = REQUEST_TIMEOUT } = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(url, { method, headers, agent, signal, timeout });
    let started = false;
    req.on('timeout', () => req.destroy(Object.assign(new Error('Il server non risponde'), { code: 'ETIMEDOUT' })));
    req.on('response', resolve);
    req.on('error', err => reject(Object.assign(socketError(err, { started }), { reused: req.reusedSocket })));
    if (body && typeof body.pipe === 'function') {
      started = true;
      body.on('error', err => req.destroy(err));
      body.pipe(req);
    } else req.end(body ?? undefined);
  });
}

/**
 * A request tried again while it can be sent again (no body, or a Buffer): when the connection
 * drops, and when the server is throttling (429) or failing (5xx), honoring Retry-After.
 *   prepare(attempt) → { url, headers }   the request as it goes this time (signed now: a signature
 *                                          has a time in it); may be async (a token to renew)
 *   body                                   null, a Buffer or a stream (sent once)
 *   agents                                 sessionAgents()
 *   fail(res) → Promise<Error>             the error of an answer that is no success
 *   success(status)                        what counts as one (2xx)
 */
export async function request({ method = 'GET', prepare, body = null, signal, agents, fail, success = s => s >= 200 && s < 300, retries = RETRIES }) {
  const buffered = body === null || Buffer.isBuffer(body);
  for (let attempt = 0; ; attempt++) {
    const { url, headers } = await prepare(attempt);
    let res;
    try {
      res = await send(url, { method, headers, body, agent: agents[url.protocol], signal });
    } catch (err) {
      if (buffered && attempt < retries && err.net === 'lost') { await sleep(1000 * 2 ** attempt, signal); continue; }
      throw err;
    }
    if (success(res.statusCode)) return res;
    if (buffered && attempt < retries && RETRY.has(res.statusCode)) {
      drain(res);
      await sleep(retryDelay(res.headers['retry-after'], attempt, MAX_WAIT), signal);
      continue;
    }
    throw await fail(res);
  }
}

/** The body of an answer as text, at most `max` bytes ('invalid' over it, 'lost' if it breaks). */
export async function readText(res, max = 16 << 20) {
  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of res) {
      size += chunk.length;
      if (size > max) { res.destroy(); throw netError('invalid', 'Risposta del server troppo grande'); }
      chunks.push(chunk);
    }
  } catch (err) {
    throw socketError(err, { started: true });
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** An answer whose body is not wanted: read to its end (the socket goes back to the agent). */
export const drain = res => { res.on('error', () => {}); res.resume(); };

/**
 * The body of a GET asked from `start` (Range: bytes=start-), as the stream the kernel reads: a
 * 206 must start there; a 200 (the server ignored Range) has what comes before `start` dropped. It
 * fails with 'lost' when the body ends before its Content-Length or breaks, with the signal's
 * reason when it was stopped on purpose; the reader stopping ends the request too.
 */
export function resumable(res, { start = 0, signal } = {}) {
  let skip = 0;
  if (start > 0) {
    if (res.statusCode === 206) {
      const from = /^bytes\s+(\d+)-/i.exec(res.headers['content-range'] ?? '')?.[1];
      if (Number(from) !== start) { res.destroy(); throw netError('invalid', 'Il server ha mandato un’altra parte del file'); }
    } else skip = start;
  }
  const expected = res.headers['content-length'] !== undefined && !res.headers['content-encoding'] ? Number(res.headers['content-length']) : null;
  let seen = 0;
  const out = new Transform({
    transform(chunk, _enc, done) {
      seen += chunk.length;
      if (skip > 0) {
        if (chunk.length <= skip) { skip -= chunk.length; return done(); }
        chunk = chunk.subarray(skip);
        skip = 0;
      }
      done(null, chunk);
    },
    flush(done) {
      done(expected !== null && seen < expected ? netError('lost', 'File ricevuto a metà: connessione interrotta') : null);
    },
  });
  const broken = err => (signal?.aborted ? signal.reason : err);   // stopped on purpose: the AbortError, not 'lost'
  res.on('error', err => out.destroy(broken(socketError(err, { started: true }))));
  res.on('close', () => { if (!res.complete) out.destroy(broken(netError('lost', 'File ricevuto a metà: connessione interrotta'))); });
  out.on('close', () => { if (!res.complete) res.destroy(); });   // the reader stopped: the request goes too
  res.pipe(out);
  return out;
}
