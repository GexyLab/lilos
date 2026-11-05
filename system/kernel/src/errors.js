import { Text } from './strings.js';

/**
 * Errors that the kernel and its modules throw on purpose: the code says what went wrong and
 * becomes the HTTP status; the message is safe to show to the user. The kernel's own messages are
 * Texts (strings.js): the client gets them in its language, `message` is the English one. Any other error
 * is a bug: it is logged and the client only sees 'internal'. `details` (JSON) goes to the client
 * too: what it needs to go on, such as the fingerprint of a server to confirm ('untrusted').
 */
export const STATUS = {
  invalid: 400,
  unauthorized: 401,
  invalid_credentials: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  untrusted: 409,            // a server whose key or certificate the user has not confirmed yet
  secret_required: 428,      // a network connection needs its password (again)
  too_large: 413,
  rate_limited: 429,
  quota: 507,                // the user's space is full (files.quota, files.js)
  unavailable: 503,
};

export class KernelError extends Error {
  constructor(code, message, { retryAfter, details } = {}) {
    super(String(message ?? ''));
    this.text = message instanceof Text ? message : null;
    this.code = STATUS[code] ? code : 'invalid';
    this.retryAfter = retryAfter;
    this.details = details;
  }

  get status() { return STATUS[this.code]; }
}

export const fail = (code, message, extra) => { throw new KernelError(code, message, extra); };
