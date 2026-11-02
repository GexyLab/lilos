import { Window, h, fs, kernel, schedule, session } from '@lilos/sdk';
import { onKernelEvent } from '../apps/services.js';
import { launch, isInstalled } from '../apps/registry.js';
import { openFile } from '../apps/open.js';
import { notify } from '../notifications/notify.js';
import { runByItself } from '../automation/triggers.js';
import { AUTOMATA } from '../automation/library.js';

/**
 * The scheduler's operations that run in the browser: opening an app or a file, running an
 * automation (quietly, like the ones that start by themselves, or in Automata's window when it
 * asks something: runByItself in automation/triggers.js). The kernel tells the user's pages when
 * one is due ('schedule.due'); the first page that claims it does it and says how it went (an
 * automation that fails: an error in the history). A run that found no lilOS open waits in the
 * kernel: when lilOS opens it is done at once, or, when its operation asks first (options.ask,
 * the default), the «Operazioni in attesa» window lets the user run it or skip it, in one page
 * only (Web Lock lilos:schedule-pending:<user>).
 * The SDK's schedule hears here what the kernel streams about the operations.
 */
const KEY = 'schedule-pending';

/** Does what a browser operation says. → { state, text } */
async function perform(task) {
  const w = task.what;
  if (w.type === 'automation') {
    if (!isInstalled(AUTOMATA)) return { state: 'error', text: 'Automata non è installata' };
    if (!fs.exists(w.file)) return { state: 'error', text: `${w.label || 'L’automazione'} non c’è più` };
    // Quietly, or in Automata's window when it asks something
    const { state, text } = await runByItself(w.file, [], { values: w.values ?? {} });
    return { state, text };
  }
  if (w.file !== undefined) {
    const node = fs.get(w.file);
    if (!node) return { state: 'error', text: `${w.label || 'Il file'} non c’è più` };
    await openFile(node);
    return { state: 'ok', text: `Aperto ${node.name}` };
  }
  if (!isInstalled(w.app)) return { state: 'error', text: `L’app ${w.label || w.app} non è installata` };
  launch(w.app, w.args ?? undefined, w.entry ?? 'main');
  return { state: 'ok', text: `Aperta ${w.label || w.app}` };
}

/** Claims a run and does it; another page that has it already is fine. */
async function take(runId) {
  let claimed;
  try {
    claimed = await schedule.claim(runId);
  } catch (err) {
    if (err.code !== 'conflict' && err.status !== 409) console.warn('[lilos] pianificazione:', err.message);
    return;
  }
  let outcome;
  try {
    outcome = await perform(claimed.task);
  } catch (err) {
    outcome = { state: 'error', text: String(err?.message ?? err).slice(0, 300) };
  }
  await schedule.report(runId, outcome).catch(err => console.warn('[lilos] pianificazione:', err.message));
}

const timeOf = ms => new Date(ms).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** The window that asks about the runs that waited for lilOS. */
function askWindow(wm, rows) {
  const open = wm.get(KEY);
  if (open) wm.close(open);
  const win = new Window({ title: 'Operazioni in attesa', icon: 'clock', width: 460, height: Math.min(520, 170 + rows.length * 74), minWidth: 360, minHeight: 200 });
  const list = h('div', { class: 'sched-pending-list' });
  const left = new Set(rows.map(r => r.run.id));
  const done = id => {
    left.delete(id);
    list.querySelector(`[data-run="${CSS.escape(id)}"]`)?.remove();
    if (!left.size) wm.close(win);
  };
  for (const { run, task } of rows) {
    const always = h('input', { type: 'checkbox' });
    const act = async state => {
      if (always.checked && state === 'run') {
        await schedule.update(task.id, { ...task, options: { ...task.options, ask: false } }).catch(err => notify(err.message, { level: 'error' }));
      }
      done(run.id);
      if (state === 'run') await take(run.id);
      else await schedule.report(run.id, { state: 'skipped', text: 'Saltata da chi usa lilOS' }).catch(err => notify(err.message, { level: 'error' }));
    };
    const label = task.what.label || (task.what.type === 'automation' ? 'Automazione' : task.what.app ?? '');
    list.append(h('div', { class: 'sched-pending-row', 'data-run': run.id },
      h('div', { class: 'sched-pending-text' },
        h('b', {}, task.name),
        h('small', {}, `${label ? `${label} · ` : ''}prevista ${timeOf(run.due)}`),
        h('label', { class: 'sched-pending-always' }, always, 'D’ora in poi esegui senza chiedere')),
      h('div', { class: 'sched-pending-acts' },
        h('button', { class: 'ctl-btn primary', type: 'button', onclick: () => act('run') }, 'Esegui ora'),
        h('button', { class: 'ctl-btn', type: 'button', onclick: () => act('skip') }, 'Salta'))));
  }
  win.body.append(h('div', { class: 'sched-pending' },
    h('p', {}, 'Mentre lilOS era chiuso è arrivata l’ora di:'),
    list,
    h('p', { class: 'sched-pending-hint' }, 'Quelle a cui non rispondi restano in attesa fino alla prossima apertura, poi scadono.')));
  return wm.open(win, { key: KEY });
}

/** The runs that waited: done at once, or asked about (in one page only). */
async function catchUp(wm) {
  let runs;
  try { runs = await schedule.pending(); } catch { return; }
  if (!runs.length) return;
  const ask = [];
  for (const run of runs) {
    const task = await schedule.get(run.task).catch(() => null);
    if (!task) continue;
    if (task.options?.ask === false) await take(run.id);
    else ask.push({ run, task });
  }
  if (!ask.length) return;
  const show = () => askWindow(wm, ask);
  const user = session.user?.id ?? kernel.data?.user?.id ?? 'local';
  if (navigator.locks?.request) navigator.locks.request(`lilos:schedule-pending:${user}`, { ifAvailable: true }, lock => { if (lock) show(); }).catch(() => show());
  else show();
}

/** Call before connectServices() (it adds its listeners to the kernel's stream). */
export function connectSchedule({ wm }) {
  if (!kernel.connected) return;
  for (const event of ['schedule.change', 'schedule.run', 'schedule.due']) onKernelEvent(event, d => schedule.received(event, d));
  onKernelEvent('', () => {
    schedule.emit('change', { ids: [] });
    catchUp(wm).catch(() => {});
  });
  schedule.on('due', ({ run }) => { if (typeof run === 'string') take(run).catch(() => {}); });
  // Once lilOS is up: what waited while it was closed
  setTimeout(() => catchUp(wm).catch(err => console.warn('[lilos] pianificazione:', err.message)), 3000);
}
