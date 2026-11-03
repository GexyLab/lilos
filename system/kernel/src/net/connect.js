import net, { isIP } from 'node:net';
import tls from 'node:tls';
import { performance } from 'node:perf_hooks';
import { KernelError } from '../errors.js';

/**
 * A TCP connection, or TLS over it, made by the kernel for a user's request (net/http.js, the
 * WebSocket client of ws.js, the live sessions of calls/): to an address the guard allows
 * (`lookup`: net/guard.js), with the time of each step and what the server's certificate says.
 *
 *   connectTo({ host, port, secure, lookup, signal, timeoutMs, alpn, tls, timings }) → { socket, tls }
 *     tls       { ca, cert, key, pfx, passphrase, servername, verify, pinned, minVersion }
 *               verify false: any certificate goes (the user turned the check off);
 *               pinned: the fingerprint the user confirmed for this server (net/knownHosts.js), which
 *               lets a certificate that does not validate (self-signed, another name) through
 *     timings   an object the steps are written in, in ms from timings.start (set when missing):
 *               lookup (the name resolved), connect (TCP), secure (TLS handshake over)
 *     → tls: null on plain TCP, or tlsInfo(socket)
 *
 * A certificate that does not validate and is not the pinned one closes the connection with
 * KernelError 'untrusted', details.trust { kind: 'tls', fingerprint, text, host, port, reason,
 * changed?, previous? }: the page asks the user and tries again once it is confirmed.
 */
const TIMEOUT = 30_000;

const now = () => performance.now();
const since = (timings, at = now()) => Math.round((at - timings.start) * 10) / 10;
const printable = (s, max) => String(s ?? '').replace(/[^\x20-\x7e]/g, '').slice(0, max);
const first = v => (Array.isArray(v) ? v[0] : v);

export function connectTo({ host, port, secure = false, lookup, signal, timeoutMs = TIMEOUT, alpn, tls: t = {}, timings = {} }) {
  timings.start ??= now();
  const bare = String(host ?? '').replace(/^\[|\]$/g, '');
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const common = { host: bare, port, lookup, noDelay: true };
    const socket = secure
      ? tls.connect({
        ...common,
        ...(!isIP(bare) && { servername: t.servername || bare }),
        ...(alpn && { ALPNProtocols: alpn }),
        ...(t.ca && { ca: t.ca }), ...(t.cert && { cert: t.cert }), ...(t.key && { key: t.key }),
        ...(t.pfx && { pfx: t.pfx }), ...(t.passphrase && { passphrase: t.passphrase }),
        minVersion: t.minVersion ?? 'TLSv1.2',
        rejectUnauthorized: false,   // checked below: a certificate the user confirmed goes too
      })
      : net.connect(common);
    let done = false;
    const finish = (err, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (err) { socket.destroy(); reject(err); } else resolve(value);
    };
    const onAbort = () => finish(abortError());
    const timer = setTimeout(() => finish(Object.assign(new Error(`Nessuna connessione in ${Math.round(timeoutMs / 1000)} secondi`), { code: 'ETIMEDOUT' })), timeoutMs);
    signal?.addEventListener('abort', onAbort, { once: true });
    socket.once('lookup', () => { timings.lookup = since(timings); });
    socket.once('connect', () => { timings.connect = since(timings); });
    socket.once('error', err => finish(err));
    if (!secure) return socket.once('connect', () => finish(null, { socket, tls: null }));
    socket.once('secureConnect', () => {
      timings.secure = since(timings);
      const info = tlsInfo(socket);
      if (!socket.authorized && t.verify !== false && info.fingerprint !== t.pinned) {
        return finish(new KernelError('untrusted', `Certificato di ${bare} non confermato (${printable(socket.authorizationError?.code ?? socket.authorizationError, 60)})`, {
          details: {
            trust: {
              kind: 'tls', fingerprint: info.fingerprint, host: bare, port,
              text: `${printable(info.subject || bare, 80)} · ${info.fingerprint}`,
              reason: printable(socket.authorizationError?.code ?? socket.authorizationError, 60),
              ...(t.pinned && { changed: true, previous: t.pinned }),
            },
          },
        }));
      }
      finish(null, { socket, tls: info });
    });
  });
}

/** What the page shows of a TLS connection: protocol, cipher, ALPN and the certificates of the chain. */
export function tlsInfo(socket) {
  const chain = [];
  let cert = socket.getPeerCertificate?.(true) ?? null;
  const seen = new Set();
  while (cert && cert.fingerprint256 && !seen.has(cert.fingerprint256) && chain.length < 6) {
    seen.add(cert.fingerprint256);
    chain.push({
      subject: printable(first(cert.subject?.CN) ?? first(cert.subject?.O), 120),
      issuer: printable(first(cert.issuer?.CN) ?? first(cert.issuer?.O), 120),
      validFrom: cert.valid_from ?? null, validTo: cert.valid_to ?? null,
      fingerprint: cert.fingerprint256, names: printable(cert.subjectaltname, 400),
    });
    cert = cert.issuerCertificate;
  }
  const error = socket.authorizationError;
  return {
    protocol: socket.getProtocol?.() ?? null, cipher: socket.getCipher?.()?.name ?? null, alpn: socket.alpnProtocol || null,
    authorized: !!socket.authorized, error: error ? printable(error.code ?? error, 80) : null,
    subject: chain[0]?.subject ?? '', fingerprint: chain[0]?.fingerprint ?? '', chain,
  };
}

const abortError = () => Object.assign(new Error('Annullato'), { name: 'AbortError', code: 'ABORT_ERR' });

/** A network error as a short line for the user ('Connessione rifiutata (ECONNREFUSED)'), KernelErrors as they are. */
export function networkMessage(err) {
  if (err instanceof KernelError) return err.message;
  const code = err?.code ?? err?.cause?.code;
  const words = {
    ECONNREFUSED: 'Connessione rifiutata', ECONNRESET: 'Connessione interrotta dal server', ENOTFOUND: 'Nome del server sconosciuto',
    EAI_AGAIN: 'Nome del server non risolto (DNS)', ETIMEDOUT: 'Tempo scaduto', EHOSTUNREACH: 'Server irraggiungibile', ENETUNREACH: 'Rete irraggiungibile',
    EPIPE: 'Connessione chiusa', ABORT_ERR: 'Annullato', ERR_TLS_CERT_ALTNAME_INVALID: 'Certificato per un altro nome',
  };
  const text = words[code] ?? printable(err?.message ?? err, 200);
  return code && words[code] ? `${text} (${code})` : text || 'Errore di rete';
}
