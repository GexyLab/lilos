import net, { isIP } from 'node:net';
import tls from 'node:tls';
import { performance } from 'node:perf_hooks';
import { KernelError } from '../errors.js';
import { Text, defineStrings } from '../strings.js';

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

const { t } = defineStrings('lilos:kernel.net.connect', { en: { strings: {
  noConnection: { one: 'No connection in {n} second', other: 'No connection in {n} seconds' },
  untrusted: 'Certificate of {host} not confirmed ({reason})',
  cancelled: 'Cancelled',
  refused: 'Connection refused ({code})',
  reset: 'Connection broken off by the server ({code})',
  notFound: 'Unknown server name ({code})',
  dns: 'Server name not resolved (DNS) ({code})',
  timeout: 'Timed out ({code})',
  hostUnreachable: 'Server unreachable ({code})',
  netUnreachable: 'Network unreachable ({code})',
  closed: 'Connection closed ({code})',
  aborted: 'Cancelled ({code})',
  otherName: 'Certificate for another name ({code})',
  network: 'Network error',
} } });
/** An error whose message reaches the user: `text` is the Text, `message` the English one. */
const textError = (text, extra) => Object.assign(new Error(String(text)), { text }, extra);

const now = () => performance.now();
const since = (timings, at = now()) => Math.round((at - timings.start) * 10) / 10;
const printable = (s, max) => String(s ?? '').replace(/[^\x20-\x7e]/g, '').slice(0, max);
const first = v => (Array.isArray(v) ? v[0] : v);

export function connectTo({ host, port, secure = false, lookup, signal, timeoutMs = TIMEOUT, alpn, tls: opts = {}, timings = {} }) {
  timings.start ??= now();
  const bare = String(host ?? '').replace(/^\[|\]$/g, '');
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const common = { host: bare, port, lookup, noDelay: true };
    const socket = secure
      ? tls.connect({
        ...common,
        ...(!isIP(bare) && { servername: opts.servername || bare }),
        ...(alpn && { ALPNProtocols: alpn }),
        ...(opts.ca && { ca: opts.ca }), ...(opts.cert && { cert: opts.cert }), ...(opts.key && { key: opts.key }),
        ...(opts.pfx && { pfx: opts.pfx }), ...(opts.passphrase && { passphrase: opts.passphrase }),
        minVersion: opts.minVersion ?? 'TLSv1.2',
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
    const timer = setTimeout(() => finish(textError(t('noConnection', { n: Math.round(timeoutMs / 1000) }), { code: 'ETIMEDOUT' })), timeoutMs);
    signal?.addEventListener('abort', onAbort, { once: true });
    socket.once('lookup', () => { timings.lookup = since(timings); });
    socket.once('connect', () => { timings.connect = since(timings); });
    socket.once('error', err => finish(err));
    if (!secure) return socket.once('connect', () => finish(null, { socket, tls: null }));
    socket.once('secureConnect', () => {
      timings.secure = since(timings);
      const info = tlsInfo(socket);
      if (!socket.authorized && opts.verify !== false && info.fingerprint !== opts.pinned) {
        return finish(new KernelError('untrusted', t('untrusted', { host: bare, reason: printable(socket.authorizationError?.code ?? socket.authorizationError, 60) }), {
          details: {
            trust: {
              kind: 'tls', fingerprint: info.fingerprint, host: bare, port,
              text: `${printable(info.subject || bare, 80)} · ${info.fingerprint}`,
              reason: printable(socket.authorizationError?.code ?? socket.authorizationError, 60),
              ...(opts.pinned && { changed: true, previous: opts.pinned }),
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

const abortError = () => textError(t('cancelled'), { name: 'AbortError', code: 'ABORT_ERR' });

const WORDS = {
  ECONNREFUSED: 'refused', ECONNRESET: 'reset', ENOTFOUND: 'notFound', EAI_AGAIN: 'dns', ETIMEDOUT: 'timeout',
  EHOSTUNREACH: 'hostUnreachable', ENETUNREACH: 'netUnreachable', EPIPE: 'closed', ABORT_ERR: 'aborted', ERR_TLS_CERT_ALTNAME_INVALID: 'otherName',
};

/**
 * A network error as a short line for the user ('Connection refused (ECONNREFUSED)'): a Text, or
 * the error's own message; KernelErrors as they are (their Text when they have one).
 */
export function networkMessage(err) {
  if (err?.text instanceof Text) return err.text;
  if (err instanceof KernelError) return err.message;
  const code = err?.code ?? err?.cause?.code;
  if (code && Object.hasOwn(WORDS, code)) return t(WORDS[code], { code });
  return printable(err?.message ?? err, 200) || t('network');
}
