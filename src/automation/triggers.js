import { automation, bus, fs, kernel, splitName, storage } from '@lilos/sdk';
import { getApp, isInstalled } from '../apps/registry.js';
import { start as startBackground } from '../apps/packages/background.js';
import { notify } from '../notifications/notify.js';
import { checkDocument } from './document.js';
import { runAutomation } from './runner.js';
import { library, AUTOMATA } from './library.js';
import { AUTOMATIONS } from './recorder.js';

/**
 * Automations that start by themselves: at login and when files arrive in a folder (`login`,
 * `folder`, see document.js), while lilOS is open, in one tab of the user only (a Web Lock: when
 * that tab closes, another one takes over). At a time or every few minutes they are
 * Pianificazione's operations (`what.type 'automation'`, the kernel's clock, also with lilOS
 * closed): the old `time`/`every` triggers are moved there by Automata (its `triggers` entry
 * point, started here at sign-in while some are left).
 *
 * runByItself() runs one without the user: an automation that asks something (a confirmation, a
 * value, what to do if a step fails) opens in Automata's window; the others run quietly. The
 * triggers say how it went with a notification; Pianificazione (src/schedule/runner.js) keeps it
 * in its history.
 */
const GATHER = 1500;            // files arriving together make one run
const LEGACY = ['time', 'every'];   // moved to Pianificazione by Automata ≥ 1.2.0

let active = false;
let loggedIn = false;
const startedAt = Date.now();
const FIRST_TAB = 15_000;       // the lock taken this soon after the page opened: this is the tab of the login
const running = new Set();
const arriving = new Map();     // file id of the automation → { ids, timer }

/**
 * Runs the automation in file `id` on these items, nobody having started it: quietly, or in
 * Automata's `run` window when a step asks (values given by name answer its questions), confirms
 * or is missing. → { state: 'ok' | 'error' | 'skipped', text, opened? }   opened: in the window
 */
export async function runByItself(id, items = [], { values = {} } = {}) {
  let name = library.get(id)?.name ?? fs.get(id)?.name ?? 'L’automazione';
  if (!isInstalled(AUTOMATA)) return { state: 'error', text: 'Automata non è installata' };
  if (running.has(id)) return { state: 'skipped', text: `${name} è già in esecuzione` };
  running.add(id);
  try {
    const doc = checkDocument(await fs.read(id));
    name = doc.name;
    const asks = doc.steps.some(s => s.enabled && (s.confirm || s.onError === 'ask'
      || Object.entries(s.fields ?? {}).some(([field, f]) => f.mode === 'ask' && !Object.hasOwn(values, field))));
    if (asks || doc.steps.some(s => s.enabled && s.missing)) {
      library.start(id, items, values);
      return { state: 'ok', text: `${doc.name}: aperta in Automata`, opened: true };
    }
    // Started by a login or by Pianificazione there is nothing chosen (a file may say otherwise)
    if (doc.input !== 'none' && !items.length) return { state: 'error', text: `${doc.name}: parte da sola solo se lavora su niente (Automata → Avvio)` };
    const result = await runAutomation(doc, { items, values });
    const failed = result.failed ? ` (${result.failed} ${result.failed === 1 ? 'passo non riuscito' : 'passi non riusciti'})` : '';
    return { state: 'ok', text: `${doc.name}: eseguita da sola${result.items > 1 ? ` su ${result.items} elementi` : ''}${failed}` };
  } catch (err) {
    return { state: 'error', text: `${name}: ${err.message}` };
  } finally {
    running.delete(id);
  }
}

/** Runs an automation that a trigger started, and says how it went. */
async function fire(entry, items) {
  if (!isInstalled(AUTOMATA)) return;
  const { state, text, opened } = await runByItself(entry.id, items);
  if (state !== 'skipped' && !opened) notify(text, { level: state === 'ok' ? 'success' : 'error' });
}

/** At login: the login triggers; old automations still holding a time trigger go to Automata. */
function atLogin() {
  for (const e of library.list()) {
    if (e.launch.triggers?.some(t => t.type === 'login')) fire(e, []);
  }
  // Automata moves their time and every-few-minutes triggers to Pianificazione
  if (isInstalled(AUTOMATA) && library.list().some(e => e.launch.triggers?.some(t => LEGACY.includes(t.type)))) {
    startBackground(getApp(AUTOMATA), 'triggers').catch(err => console.warn('[lilos] automazioni:', err.message));
  }
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
  // The last runs of the page's old clock (lilOS < 1.21.0)
  storage.remove('automation-runs');
  bus.on('user:login', () => { loggedIn = true; if (active) library.ready().then(atLogin); });
  fs.on('change', e => {
    if (e.type === 'create' || e.type === 'move') arrived(e.node, e.parent);
  });
  const take = () => {
    active = true;
    // The tab that takes over later does not run the login triggers again
    if (loggedIn && Date.now() - startedAt < FIRST_TAB) library.ready().then(atLogin);
  };
  if (!navigator.locks) return take();
  const user = kernel.data?.user?.id ?? 'local';
  navigator.locks.request(`lilos:automazioni:${user}`, () => {
    take();
    return new Promise(() => {});   // held while this tab is open
  }).catch(err => console.error('[lilos] automazioni:', err));
}
