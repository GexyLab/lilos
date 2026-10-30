/**
 * Errors that the kernel and its modules throw on purpose: the code says what went wrong and
 * becomes the HTTP status; the message is safe to show to the user (Italian). Any other error
 * is a bug: it is logged and the client only sees 'internal'.
 */
export const STATUS = {
  invalid: 400,
  unauthorized: 401,
  invalid_credentials: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  too_large: 413,
  rate_limited: 429,
  unavailable: 503,
};

export class KernelError extends Error {
  constructor(code, message, { retryAfter } = {}) {
    super(message);
    this.code = STATUS[code] ? code : 'invalid';
    this.retryAfter = retryAfter;
  }

  get status() { return STATUS[this.code]; }
}

export const fail = (code, message, extra) => { throw new KernelError(code, message, extra); };
