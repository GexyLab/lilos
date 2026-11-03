/** Waits `ms`; rejects with the signal's reason when it aborts first. */
export const sleep = (ms, signal = null) => new Promise((resolve, reject) => {
  if (signal?.aborted) return reject(signal.reason);
  const stop = () => { clearTimeout(timer); reject(signal.reason); };
  const timer = setTimeout(() => { signal?.removeEventListener('abort', stop); resolve(); }, ms);
  signal?.addEventListener('abort', stop, { once: true });
});

/**
 * How long to wait before trying a throttled request again: the server's Retry-After (seconds, or
 * an HTTP date), else 1, 2, 4… seconds by attempt; at most `max` ms.
 */
export function retryDelay(retryAfter, attempt, max = 30_000) {
  const raw = String(retryAfter ?? '').trim();
  let ms = /^\d+$/.test(raw) ? Number(raw) * 1000 : raw ? Date.parse(raw) - Date.now() : NaN;
  if (!Number.isFinite(ms) || ms <= 0) ms = 2 ** attempt * 1000;
  return Math.min(max, ms);
}
