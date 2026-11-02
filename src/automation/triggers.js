import { automation, bus, fs, kernel, splitName, storage } from '@lilos/sdk';
import { isInstalled } from '../apps/registry.js';
import { notify } from '../notifications/notify.js';
import { checkDocument } from './document.js';
import { runAutomation } from './runner.js';
import { library, AUTOMATA } from './library.js';
import { AUTOMATIONS } from './recorder.js';

/**
 * Automations that start by themselves (launch.triggers, see document.js): at a time, every few
 * minutes, at login, when files arrive in a folder. They live in the page, so they start only
 * while lilOS is open, and in one tab of the user only (a Web Lock: when that tab closes, another
 * one takes over). An automation that asks something (a confirmation, a value, what to do if a
 * step fails) opens in Automata's window; the others run quietly and say how it went with a
 * notification (an error always; a success, except for the ones that repeat every few minutes).
 *
 * When each one last ran is kept per user ('automation-runs', { '<file id>#<trigger>': ms }): a
 * time missed while lilOS was closed runs at the next login if the trigger says catchUp. A trigger
 * seen for the first time only starts counting.
 */
const KEY = 'automation-runs';
const TICK = 20_000;
const LATE = 2 * 60_000;        // a time without catchUp still runs this long after it
const GATHER = 1500;            // files arriving together make one run
const DAY = 24 * 60 * 60_000;

let active = false;
let loggedIn = false;
const startedAt = Date.now();
const FIRST_TAB = 15_000;       // the lock taken this soon after the page opened: this is the tab of the login
const running = new Set();
const arriving = new Map();     // file id of the automation → { ids, timer }

const runs = () => {
  const saved = storage.get(KEY, {});
  return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
};
const setRun = (key, at) => storage.set(KEY, { ...runs(), [key]: at });

/** The latest moment of a time trigger at or before `now` (null if none in the last week). */
export function lastOccurrence(t, now = Date.now()) {
  const [hh, mm] = t.at.split(':').map(Number);
  for (let back = 0; back <= 7; back++) {
    const d = new Date(now - back * DAY);
    d.setHours(hh, mm, 0, 0);
    const iso = ((d.getDay() + 6) % 7) + 1;   // 1 Monday … 7 Sunday
    if (d.getTime() <= now && (!t.days.length || t.days.includes(iso))) return d.getTime();
  }
  return null;
}

/** Whether a time or every trigger is due now. */
export function isDue(t, last, now = Date.now()) {
  if (t.type === 'every') return now - last >= t.minutes * 60_000;
  if (t.type !== 'time') return false;
  const at = lastOccurrence(t, now);
  return at !== null && last < at && (t.catchUp || now - at <= LATE);
}

/** Runs an automation that started by itself. */
async function fire(entry, items, { quietSuccess = false } = {}) {
  if (running.has(entry.id) || !isInstalled(AUTOMATA)) return;
  running.add(entry.id);
  try {
    const doc = checkDocument(await fs.read(entry.id));
    const asks = doc.steps.some(s => s.enabled && (s.confirm || s.onError === 'ask' || Object.values(s.fields ?? {}).some(f => f.mode === 'ask')));
    if (asks || doc.steps.some(s => s.enabled && s.missing)) return library.start(entry.id, items);
    // Started by a time, a login or every few minutes there is nothing chosen (a file may say otherwise)
    if (doc.input !== 'none' && !items.length) return notify(`${doc.name}: parte da sola solo se lavora su niente (Automata → Avvio)`, { level: 'warning' });
    const result = await runAutomation(doc, { items });
    if (!quietSuccess) notify(`${doc.name}: eseguita da sola${result.items > 1 ? ` su ${result.items} elementi` : ''}`, { level: 'success' });
  } catch (err) {
    notify(`${entry.name}: ${err.message}`, { level: 'error' });
  } finally {
    running.delete(entry.id);
  }
}

/** The time and every triggers: due ones run, first-seen ones start counting. */
function tick() {
  if (!active) return;
  const now = Date.now();
  const known = runs();
  for (const e of library.list()) {
    e.launch.triggers?.forEach((t, i) => {
      if (t.type !== 'time' && t.type !== 'every') return;
      const key = `${e.id}#${i}`;
      if (!(key in known)) return setRun(key, now);
      if (!isDue(t, known[key], now)) return;
      setRun(key, now);
      fire(e, [], { quietSuccess: t.type === 'every' });
    });
  }
}

/** At login: the login triggers, and the times missed while lilOS was closed (catchUp). */
function atLogin() {
  for (const e of library.list()) {
    if (e.launch.triggers?.some(t => t.type === 'login')) fire(e, []);
  }
  tick();
}

const folderOf = ref => (ref?.id && fs.exists(ref.id) ? ref.id : ref?.path ? fs.resolve(ref.path)?.id ?? null : null);

/** A file arrived somewhere: the automations watching that folder gather it. */
function arrived(node, parent) {
  if (!active || node?.type !== 'file' || automation.quietNow) return;
  const auto = fs.resolve(AUTOMATIONS);
  if (auto && fs.isInside(node.id, auto.id)) return;
  for (const e of library.list()) {
    const watching = e.launch.triggers?.some(t => t.type === 'folder' && folderOf(t.folder) === parent);
    if (!watching) continue;
    const ext = splitName(node.name)[1].toLowerCase();
    if (e.launch.ext.length && !e.launch.ext.includes(ext)) continue;
    const pending = arriving.get(e.id) ?? { ids: [], timer: null };
    if (!pending.ids.includes(node.id)) pending.ids.push(node.id);
    clearTimeout(pending.timer);
    pending.timer = setTimeout(() => {
      arriving.delete(e.id);
      const ids = pending.ids.filter(id => fs.exists(id));
      if (!ids.length) return;
      fire(e, e.input === 'files' ? ids : e.input === 'folder' ? [parent] : []);
    }, GATHER);
    arriving.set(e.id, pending);
  }
}

export function connectTriggers() {
  bus.on('user:login', () => { loggedIn = true; if (active) library.ready().then(atLogin); });
  fs.on('change', e => {
    if (e.type === 'create' || e.type === 'move') arrived(e.node, e.parent);
  });
  setInterval(tick, TICK);
  const take = () => {
    active = true;
    // The tab that takes over later does not run the login triggers again
    if (loggedIn) library.ready().then(Date.now() - startedAt < FIRST_TAB ? atLogin : tick);
  };
  if (!navigator.locks) return take();
  const user = kernel.data?.user?.id ?? 'local';
  navigator.locks.request(`lilos:automazioni:${user}`, () => {
    take();
    return new Promise(() => {});   // held while this tab is open
  }).catch(err => console.error('[lilos] automazioni:', err));
}
