// Copy of modules/_shared/errors.js (scripts/module-libs.mjs): edit it there, then npm run sync:modules
/**
 * Errors of the network drivers (the kernel's net/drivers.js and term/drivers.js): `net` says what
 * went wrong ('auth', 'untrusted', 'not_found', 'exists', 'denied', 'unreachable', 'lost',
 * 'unsupported', 'invalid'; 'cancelled' for the terminals). The protocol's own answers (an FTP
 * reply, an NTSTATUS, an HTTP status) are mapped by each module; this is for the connection itself.
 */
export const netError = (net, message, extra = {}) => Object.assign(new Error(message), { net, ...extra });

/** The connection could not be made (before any answer). */
const UNREACHABLE = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'ENETUNREACH', 'EAI_AGAIN', 'ETIMEDOUT', 'EADDRNOTAVAIL', 'ECONNABORTED']);
/** The peer dropped a connection that was there. */
const DROPPED = new Set(['ECONNRESET', 'EPIPE', 'ERR_STREAM_PREMATURE_CLOSE', 'ECONNABORTED']);

/**
 * An error that is already what the kernel wants, passed on as it is: a driver error (`net`), an
 * abort (AbortError), or one the kernel threw on purpose (KernelError: its NetGuard refusing an
 * address, through ctx.lookup). The modules' own mappers start with it.
 */
export const isDriverError = err => !!err?.net || err?.name === 'AbortError' || err?.constructor?.name === 'KernelError';

/**
 * A failure of a connection (a socket's error, Node's or the TLS layer's) as a driver error:
 * 'unreachable' when it could not be made, 'lost' once the exchange had `started` or when the
 * peer dropped it. Errors that already say it (`net`), aborts (AbortError) and the kernel's own go
 * as they are. The system's code stays in `code` (ECONNREFUSED…).
 */
export function socketError(err, { started = false } = {}) {
  if (isDriverError(err)) return err;
  const code = String(err?.code ?? '');
  const text = String(err?.message ?? err);
  const extra = code ? { code } : {};
  if (!started && UNREACHABLE.has(code)) return netError('unreachable', code === 'ETIMEDOUT' ? 'Il server non risponde' : text, extra);
  if (started || DROPPED.has(code) || /socket hang up|aborted/i.test(text)) return netError('lost', text, extra);
  if (/SSL|TLS|EPROTO|CERT/i.test(code)) return netError('unreachable', `TLS: ${text}`, extra);
  return netError('unreachable', text, extra);
}

/** The error of an aborted signal: its reason when it is an Error, else an AbortError. */
export const abortError = signal => (signal?.reason instanceof Error ? signal.reason : Object.assign(new Error('Annullato'), { name: 'AbortError' }));
