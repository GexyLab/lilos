/**
 * «Collezione»: a .nettest file of NetTest, run by the kernel as the operation's owner (calls/: the
 * same engine as NetTest's Esegui button), with the environment chosen when it was planned. Done
 * when every request passed its checks and tests; the history keeps a line per request and the
 * reason of each failure. The secret values are the file's, sealed by the owner: a file sealed by
 * someone else runs without them.
 */
const line = r => {
  const status = r.skipped ? 'saltata' : r.error ? r.error.message : r.response ? `${r.response.status} ${r.response.statusText ?? ''}`.trim() : '—';
  const failed = [...r.checks.filter(c => !c.ok).map(c => `verifica ${c.label || c.id || ''} (${c.actual})`), ...r.tests.filter(t => t.ok === false).map(t => `test «${t.name}»: ${t.error ?? ''}`)];
  return `${r.skipped ? '·' : r.ok ? '✓' : '✗'} ${r.name || r.id} — ${status} · ${r.ms} ms${failed.length ? `\n    ${failed.join('\n    ')}` : ''}`;
};

export async function runCollectionTask({ kernel, task, principal, signal }) {
  const w = task.what;
  const summary = await kernel.calls.runFile(principal, { id: w.file }, { environment: w.environment, only: w.only, signal });
  const log = summary.results.map(line).join('\n');
  const counts = `${summary.passed} riuscite, ${summary.failed} fallite${summary.skipped ? `, ${summary.skipped} saltate` : ''} in ${(summary.ms / 1000).toFixed(1)} s`;
  if (summary.cancelled) return { state: 'error', text: `Annullata: ${counts}`, log };
  if (summary.failed) {
    const first = summary.results.find(r => !r.ok && !r.skipped);
    return { state: 'error', text: `${summary.name}: ${counts}${first ? ` (prima: ${first.name || first.id})` : ''}`, log };
  }
  return { state: 'ok', text: `${summary.name}: ${counts}`, log };
}
