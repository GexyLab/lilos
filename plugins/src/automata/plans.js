import { fs, schedule } from '@lilos/sdk';
import * as system from '@lilos/system';
import { t } from './i18n.js';
import { library, save, tell } from './store.js';

/**
 * Automations at a time or every few minutes are operations of Pianificazione (the scheduler):
 * `what: { type: 'automation', file }`. The kernel keeps the time, also with lilOS closed, and
 * catches up; lilOS hands the run to Automata's `run` window. Automata only shows them and opens
 * Pianificazione's editor:
 *
 *   plansOf(id) → [task]          the operations that run an automation (none without the kernel)
 *   planNew(id, name)             Pianificazione's editor on a new operation for it
 *   planEdit(taskId)              Pianificazione's editor on one of them
 *   moveTriggers(entries?)        the 'time' and 'every' triggers older Automata kept in the file
 *                                 (lilOS ran them while open) become operations, once: when the
 *                                 main window opens, when an automation opens, and at sign-in
 *                                 (the `triggers` entry point, started by lilOS)
 */
const SCHEDULER = 'scheduler';
export const LEGACY = ['time', 'every'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);

export const canPlan = () => !!schedule?.available && system.isInstalled?.(SCHEDULER) !== false;

export async function plansOf(id) {
  if (!id || !canPlan()) return [];
  return (await schedule.list()).filter(task => task.what?.type === 'automation' && task.what.file === id);
}

export function planNew(id, name) {
  system.launch(SCHEDULER, { what: { type: 'automation', file: id, label: fs.tildePath(id) ?? '' }, name }, 'create');
}

export function planEdit(taskId) {
  system.launch(SCHEDULER, { id: taskId }, 'edit');
}

/** The rule of an old trigger, as Pianificazione keeps it; null if the trigger is not valid. */
export function ruleOfTrigger(tr, now = Date.now()) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const start = schedule.rules.localText(now, tz);
  if (tr?.type === 'every') {
    return Number.isInteger(tr.minutes) && tr.minutes >= 5 && tr.minutes <= 1440 ? { every: { n: tr.minutes, unit: 'minute' }, start, tz } : null;
  }
  if (tr?.type !== 'time' || typeof tr.at !== 'string' || !TIME.test(tr.at)) return null;
  const days = [...new Set((Array.isArray(tr.days) ? tr.days : []).filter(d => Number.isInteger(d) && d >= 1 && d <= 7))].sort();
  // Some days: every week on them; none (or all seven): every day
  return days.length && days.length < 7
    ? { every: { n: 1, unit: 'week' }, days, times: [tr.at], start, tz }
    : { every: { n: 1, unit: 'day' }, times: [tr.at], start, tz };
}

/** Same times (whatever the start): an operation already made for that trigger. */
const sameRule = (a, b) => a?.every?.n === b?.every?.n && a?.every?.unit === b?.every?.unit
  && String(a.days ?? '') === String(b.days ?? '') && String(a.times ?? '') === String(b.times ?? '');

const failed = new Set();   // automations whose triggers could not move: told once per session

/**
 * Moves the old triggers of the automations (default: all of them) to Pianificazione. In one tab
 * at a time; each file is read again first, and a trigger that already has its operation is only
 * taken out of the file, so running it twice makes nothing twice. Resolves with how many moved.
 */
export async function moveTriggers(entries = library()?.list() ?? []) {
  if (!canPlan()) return 0;
  const todo = entries.filter(e => e.launch?.triggers?.some(tr => LEGACY.includes(tr.type)) && !failed.has(e.id));
  if (!todo.length) return 0;
  const work = async () => {
    let n = 0;
    for (const e of todo) n += await moveOne(e.id).catch(() => 0);
    return n;
  };
  return navigator.locks?.request ? navigator.locks.request('lilos:automata-triggers', work) : work();
}

/** The `triggers` background entry point: lilOS starts it at sign-in while old triggers are left. */
export async function triggers({ lilos } = {}) {
  lilos?.handle?.(() => moveTriggers());
  await library()?.ready();
  await moveTriggers().catch(err => console.warn('[automata] triggers:', err.message));
}

async function moveOne(id) {
  // The file as it is (lilOS's own check may leave old triggers out)
  const raw = JSON.parse(await fs.read(id));
  const triggers = Array.isArray(raw?.launch?.triggers) ? raw.launch.triggers : [];
  const legacy = triggers.filter(tr => LEGACY.includes(tr?.type));
  if (!plain(raw.launch) || !legacy.length) return 0;
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 120) : fs.get(id)?.name ?? '';
  const existing = await plansOf(id);
  const kept = triggers.filter(tr => !LEGACY.includes(tr?.type));
  let moved = 0;
  for (const tr of legacy) {
    const when = ruleOfTrigger(tr);
    if (!when) continue;   // not valid: lilOS never ran it
    if (existing.some(task => sameRule(task.when, when))) continue;
    try {
      await schedule.create({
        name, enabled: true, when,
        what: { type: 'automation', file: id, label: fs.tildePath(id) ?? '' },
        // As before: no question when lilOS opens, a missed time again at the next sign-in only
        // with catchUp (every few minutes: the one missed), errors told by Automata's run
        options: { missed: tr.type === 'every' || tr.catchUp === true ? 'once' : 'skip', overlap: 'skip', ask: false, notify: 'error' },
      });
      existing.push({ when });
      moved++;
    } catch (err) {
      kept.push(tr);
      if (!failed.has(id)) tell(t('plan.moveFailed', { name, error: err.message }), 'error');
      failed.add(id);
    }
  }
  raw.launch.triggers = kept;
  await save(id, raw);
  if (moved) tell(t('plan.moved', { name, n: moved }), 'success');
  return moved;
}
