import { defineStrings } from '../strings.js';

/**
 * «Collezione»: a .nettest file of NetTest, run by the kernel as the operation's owner (calls/: the
 * same engine as NetTest's Esegui button), with the environment chosen when it was planned. Done
 * when every request passed its checks and tests; the history keeps a line per request and the
 * reason of each failure. The secret values are the file's, sealed by the owner: a file sealed by
 * someone else runs without them.
 */
const { t } = defineStrings('lilos:kernel.schedule.collection', { en: { strings: {
  skipped: 'skipped',
  check: 'check {name} ({actual})',
  test: 'test «{name}»: {error}',
  counts: '{passed} passed, {failed} failed in {seconds} s',
  countsSkipped: '{passed} passed, {failed} failed, {skipped} skipped in {seconds} s',
  cancelled: 'Cancelled: {counts}',
  failedFirst: '{name}: {counts} (first: {first})',
} } });

/** A line of the log for a request's result (say: a Text in the owner's language). */
const line = (r, say) => {
  const status = r.skipped ? say(t('skipped')) : r.error ? say(r.error.message) : r.response ? `${r.response.status} ${r.response.statusText ?? ''}`.trim() : '—';
  const failed = [
    ...r.checks.filter(c => !c.ok).map(c => say(t('check', { name: c.label || c.id || '', actual: c.actual }))),
    ...r.tests.filter(x => x.ok === false).map(x => say(t('test', { name: x.name, error: x.error ?? '' }))),
  ];
  return `${r.skipped ? '·' : r.ok ? '✓' : '✗'} ${r.name || r.id} — ${status} · ${r.ms} ms${failed.length ? `\n    ${failed.join('\n    ')}` : ''}`;
};

export async function runCollectionTask({ kernel, task, principal, signal, say }) {
  const w = task.what;
  const summary = await kernel.calls.runFile(principal, { id: w.file }, { environment: w.environment, only: w.only, signal });
  const log = summary.results.map(r => line(r, say)).join('\n');
  const name = say(summary.name);
  const numbers = { passed: summary.passed, failed: summary.failed, skipped: summary.skipped, seconds: (summary.ms / 1000).toFixed(1) };
  const counts = say(summary.skipped ? t('countsSkipped', numbers) : t('counts', numbers));
  if (summary.cancelled) return { state: 'error', text: say(t('cancelled', { counts })), log };
  if (summary.failed) {
    const first = summary.results.find(r => !r.ok && !r.skipped);
    return { state: 'error', text: first ? say(t('failedFirst', { name, counts, first: first.name || first.id })) : `${name}: ${counts}`, log };
  }
  return { state: 'ok', text: `${name}: ${counts}`, log };
}
