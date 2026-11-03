// Copy of modules/_shared/cloud.js (scripts/module-libs.mjs): edit it there, then npm run sync:modules
import { netError } from './errors.js';
import { sleep, retryDelay } from './time.js';

/**
 * HTTP for the drivers of a provider's web API (OneDrive, Google), with fetch: requests with a
 * time limit, and the loop of a call with an OAuth access token.
 */
const TIMEOUT = 60_000;      // a request that gives no answer for this long fails
const RETRIES = 3;
const MAX_WAIT = 30_000;     // longest Retry-After honored

/**
 * fetch with a time limit until the answer starts (the body may then take its time): (url, init,
 * signal) → Response. A failed connection is 'unreachable', «<who> non raggiungibile (code)»;
 * `signal` aborting rejects with its reason.
 */
export function fetcher(who, timeout = TIMEOUT) {
  return async (url, init = {}, signal = null) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('Tempo scaduto')), timeout);
    const stop = () => controller.abort(signal.reason);
    signal?.addEventListener('abort', stop, { once: true });
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      if (signal?.aborted) throw signal.reason ?? err;
      throw netError('unreachable', `${who} non raggiungibile (${err.cause?.code ?? err.message})`);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', stop);
    }
  };
}

const throttled = res => res.status === 429 || res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504;

/**
 * A call to a provider's API with an access token (Authorization: Bearer): renews the token once
 * on 401, waits and tries again when throttled (429, 5xx, or what `retryable` says) honoring
 * Retry-After. A body that is not bytes or a stream is sent as JSON; a stream is sent once (never
 * tried again).
 *   call   { method, body, headers, signal, raw, accept }   raw: the Response itself; accept: other
 *          statuses that are no error (308 of an upload in pieces)
 *   api    { tokens: { get(), renew() }, fetch: fetcher(), error(res) → Promise<Error>,
 *            retryable?(res) → boolean | Promise, retries? }
 * Returns the answer's JSON (null when it has no body).
 */
export async function bearerCall(url, { method = 'GET', body, headers = {}, signal = null, raw = false, accept = [] } = {}, api) {
  const { tokens, fetch: timedFetch, error, retryable = throttled, retries = RETRIES } = api;
  const stream = body instanceof ReadableStream;
  const json = body !== undefined && !(body instanceof Uint8Array) && !stream;
  for (let attempt = 0, renewed = false; ; attempt++) {
    const res = await timedFetch(url, {
      method,
      headers: { Authorization: `Bearer ${await tokens.get()}`, ...(json && { 'Content-Type': 'application/json; charset=utf-8' }), ...headers },
      body: body === undefined ? undefined : json ? JSON.stringify(body) : body,
      ...(stream && { duplex: 'half' }),
    }, signal);
    if (res.status === 401 && !renewed && !stream) {
      renewed = true;
      await res.body?.cancel().catch(() => {});
      await tokens.renew();
      continue;
    }
    if (attempt < retries && !stream && await retryable(res)) {
      await res.body?.cancel().catch(() => {});
      await sleep(retryDelay(res.headers.get('retry-after'), attempt, MAX_WAIT), signal);
      continue;
    }
    if (!res.ok && !accept.includes(res.status)) throw await error(res);
    if (raw) return res;
    const text = await res.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { throw netError('invalid', 'Risposta del server non valida'); }
  }
}
