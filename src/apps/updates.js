import { Emitter, Window, h, actionButton, kernel, kernelModules } from '@lilos/sdk';
import { progressScreen } from '../boot/screens.js';
import { getApp, registry } from './registry.js';
import { entrypointsOf } from './entrypoints.js';
import { buildOf, matchesFrom, settled, wasLoaded } from './packages/packages.js';
import { stopApp } from './packages/background.js';
import { appCode } from './packages/code.js';
import { workspaceManager } from '../workspaces/info.js';
import { notify } from '../notifications/notify.js';

/**
 * Updating apps while lilOS runs, so that what runs afterwards is the new version.
 *
 * updateApps() says first what will close (every window of the app, in every workspace, its
 * secondary windows and what it runs in the background) and lets the windows ask to save. Then
 * the update runs and the app is put in place again (packages.js): the next launch is the new
 * code, at a new address (its build), never a module the browser kept.
 *
 * lilOS asks to restart (the page loads again: the windows come back as they were) only when
 * the app wants it (manifest `restartOnUpdate`: true, or a range of the versions it comes from;
 * only if this page ran its old code), when the new code does not load, or when the system asks
 * (requestRestart(): kernel modules).
 * Until then that app does not start: its old code is still in the page.
 *
 * An app updated elsewhere (another tab, another user) is in the registry right away; its windows
 * open here keep the old code: the taskbar offers to restart the app (or lilOS, if it asks).
 *
 *   updates.pending() → [{ id, name, version, kind: 'reopen' | 'restart', reason }]
 * Events: 'change' — what is pending changed.
 */
export const updates = new Emitter();

let wm = null;
let launcher = null;
const known = new Map();      // id → { version, build } of what the registry has
const updating = new Set();   // ids being updated by updateApps() here
const pending = new Map();    // id → { id, name, version, kind, reason }
const restartReasons = new Map();   // reasons not tied to an app (kernel modules)

const stamp = pkg => (pkg ? { version: pkg.version, build: buildOf(pkg) } : null);

/** Does going to a version with this `restartOnUpdate` from version `from` need a restart? */
export const restartWanted = (range, from) => range === true || (typeof range === 'string' && !!from && matchesFrom(range, from));

updates.pending = () => [...pending.values()].map(p => ({ ...p }));
updates.restartReasons = () => [...restartReasons.values(), ...[...pending.values()].filter(p => p.kind === 'restart').map(p => p.reason)];

/** Set by the system at start-up. */
export function connectUpdates(windowManager, appLauncher) {
  wm = windowManager;
  launcher = appLauncher;
}

// What the registry had before, to tell a new version from a change of state (security, granted…)
registry.on('change', ({ id, app }) => {
  const before = known.get(id);
  const now = stamp(app?.package);
  if (now) known.set(id, now);
  else known.delete(id);
  if (!now) {
    if (pending.delete(id)) updates.emit('change');
    return;
  }
  if (!before || updating.has(id) || (before.version === now.version && before.build === now.build)) return;
  // Updated elsewhere. A restart is needed only if this page ran the old code
  if (wasLoaded(id) && restartWanted(app.package.manifest.restartOnUpdate, before.version)) {
    markRestart(app, `${app.name} ${now.version} chiede di riavviare lilOS dopo l’aggiornamento`);
    notify(`${app.name} è stata aggiornata alla ${now.version}: riavvia lilOS per usarla (pulsante nell’area di notifica, in basso a destra)`, { level: 'warning' });
  } else if (wm?.windowsOfApp(id).length) {
    pending.set(id, { id, name: app.name, version: now.version, kind: 'reopen', reason: `${app.name} è stata aggiornata alla ${now.version}` });
    updates.emit('change');
    notify(`${app.name} è stata aggiornata alla ${now.version}: salva e riavvia l’app (pulsante nell’area di notifica, in basso a destra)`, { level: 'warning' });
  }
});

function markRestart(app, reason) {
  pending.set(app.id, { id: app.id, name: app.name, version: app.package?.version ?? '', kind: 'restart', reason });
  updates.emit('change');
}

/**
 * Called before an app starts: true if it must not (it is being updated, or waits for lilOS to
 * restart); the user is told why.
 */
export function blockedLaunch(id) {
  const app = getApp(id);
  if (updating.has(id)) {
    notify(`${app?.name ?? id} si sta aggiornando: un momento`);
    return true;
  }
  if (pending.get(id)?.kind === 'restart') {
    askRestart({ title: `${app?.name ?? id} aspetta il riavvio`, lead: `${app?.name ?? id} è stata aggiornata e si apre di nuovo dopo il riavvio di lilOS.` });
    return true;
  }
  return false;
}

// ---------- Windows ----------

/**
 * Asks the windows that may hold unsaved work (canClose) whether they may go, one at a time,
 * each shown in its workspace. Resolves false as soon as one says no (it stays in view).
 */
async function askWindows(windows) {
  const asking = windows.filter(w => w.canClose);
  if (!asking.length) return true;
  const manager = workspaceManager();
  const home = wm.workspace;
  for (const win of asking) {
    if (!wm.all().includes(win)) continue;
    const ws = wm.workspaceOf(win);
    if (ws !== wm.workspace && manager) await manager.switchTo(ws);
    wm.show(win);
    if (!(await win.canClose())) return false;
  }
  if (manager && wm.workspace !== home && manager.get(home)) await manager.switchTo(home);
  return true;
}

/** The app's main windows as they are now (to open them again after): [{ state, rect, workspace }]. */
const snapshot = id => wm.all().filter(w => wm.appOf(w) === id).map(w => ({
  state: w.getState ? w.getState() : null, rect: wm.geometry(w), workspace: wm.workspaceOf(w),
}));

const reopen = (id, saved) => Promise.all(saved.map(({ state, rect, workspace }) => launcher.restore({ app: id, state, rect }, { workspace })));

// ---------- Dialogs ----------

/** A small window with a text and buttons; resolves with the value of the button pressed (null: closed). */
function dialog({ title, glyph, body, buttons }) {
  return new Promise(resolve => {
    // Short at first: its content overflows, so scrollHeight below is the content's own height
    const win = new Window({ title, icon: glyph, width: 460, height: 100, minHeight: 100, minimizable: false, maximizable: false, resizable: false });
    let answered = false;
    const answer = value => {
      if (answered) return;
      answered = true;
      resolve(value);
      win.emit('close');
    };
    win.on('destroy', () => answer(null));
    const content = h('div', { class: 'upd-dialog' }, ...body,
      h('div', { class: 'upd-buttons' }, ...buttons.map(b => actionButton({ label: b.label, primary: b.primary, onClick: () => answer(b.value) }))));
    win.body.append(content);
    wm.open(win);
    // As tall as what it says
    requestAnimationFrame(() => win.resizeTo(460, Math.min(560, content.scrollHeight + win.titlebar.offsetHeight + 2)));
    content.querySelector('.upd-buttons .primary')?.focus();
  });
}

const count = (n, one, many) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

/** "3 finestre aperte in 2 workspace e i servizi in background" */
function closingText(plan) {
  const parts = [];
  if (plan.windows.length) {
    const spaces = new Set(plan.windows.map(w => wm.workspaceOf(w))).size;
    parts.push(`${count(plan.windows.length, 'finestra aperta', 'finestre aperte')}${spaces > 1 ? ` in ${spaces} workspace` : ''}`);
  }
  if (plan.background) parts.push('i servizi in background');
  return parts.join(' e ');
}

function confirmUpdate(plans, { reinstall }) {
  const [verb, act, acting] = reinstall ? ['Reinstallare', 'Reinstalla', 'Reinstallando'] : ['Aggiornare', 'Aggiorna', 'Aggiornando'];
  const closing = plans.filter(p => p.windows.length || p.background);
  const restart = plans.filter(p => p.restart);
  const body = [];
  if (plans.length === 1 && closing.length) {
    body.push(h('p', { class: 'upd-lead' }, `${acting} ${plans[0].name} si chiude tutto quello che ha aperto: ${closingText(plans[0])}.`));
  } else if (closing.length) {
    body.push(h('p', { class: 'upd-lead' }, 'Si chiude tutto quello che hanno aperto queste app:'),
      h('ul', {}, ...closing.map(p => h('li', {}, `${p.name}: ${closingText(p)}`))));
  }
  if (closing.length) body.push(h('p', {}, 'Salva il lavoro prima di continuare: le app con modifiche non salvate te lo chiederanno.'));
  if (restart.length) {
    body.push(h('p', { class: 'upd-restart' }, `Dopo l’aggiornamento sarà necessario riavviare lilOS (lo chiede ${restart.map(p => p.name).join(', ')}).`));
  }
  const title = plans.length === 1 ? `${verb} ${plans[0].name}?` : `${verb} ${plans.length} app?`;
  return dialog({
    title, glyph: 'download', body,
    buttons: [{ label: 'Annulla', value: false }, { label: closing.length ? `Chiudi e ${act.toLowerCase()}` : act, primary: true, value: true }],
  });
}

// ---------- Updating ----------

const hasBackground = app => Object.values(entrypointsOf(app)).some(ep => ep.kind === 'service' || ep.kind === 'background');

/** The new code loads (system apps: their module; the others: their entry, checked against the manifest). */
async function loads(id, version) {
  const app = getApp(id);
  if (!app?.package || app.package.version !== version) return false;
  try {
    if (app.package.kind !== 'local') return true;
    if (app.trusted) await app.load();
    else await appCode(app.package, app.package.manifest.entry);
    return true;
  } catch (err) {
    console.error(`[lilos] ${id}: la nuova versione non si carica`, err);
    return false;
  }
}

/**
 * Updates apps (or writes them again) so that lilOS is coherent afterwards.
 *   items: [{ id, run: () => Promise<state>, restartOnUpdate? }]
 *          run: the update itself (apps.update); restartOnUpdate: of the version coming, when known
 *          beforehand (the catalog), to say before starting that lilOS will need to restart
 *   from: the app asking; if it is among them it closes too, and opens again when done
 *   reinstall: the same version written again (only the words change)
 * Resolves with [{ id, result } | { id, error }], or null when the user did not go on (nothing changed).
 */
export async function updateApps(items, { from = null, reinstall = false } = {}) {
  if (!wm) throw new Error('lilOS non è ancora pronto');
  const plans = items.map(item => {
    const app = getApp(item.id);
    return {
      ...item, name: app?.name ?? item.id, version: app?.package?.version ?? null,
      windows: app ? wm.windowsOfApp(item.id) : [], background: app ? hasBackground(app) : false,
      loaded: wasLoaded(item.id),
      restart: wasLoaded(item.id) && restartWanted(item.restartOnUpdate, app?.package?.version),
    };
  });
  if (plans.some(p => p.windows.length || p.background || p.restart) && !(await confirmUpdate(plans, { reinstall }))) return null;

  const windows = plans.flatMap(p => wm.windowsOfApp(p.id));   // again: some may have opened meanwhile
  if (!(await askWindows(windows))) {
    notify('Aggiornamento annullato: una finestra non si è chiusa', { level: 'warning' });
    return null;
  }
  const caller = plans.some(p => p.id === from) ? snapshot(from) : [];
  plans.forEach(p => updating.add(p.id));
  windows.forEach(w => wm.close(w));
  plans.forEach(p => stopApp(p.id));

  const results = [];
  try {
    for (const p of plans) {
      try {
        const result = await p.run();
        await settled(p.id);
        if (!result?.unchanged) {
          const app = getApp(p.id);
          if (!(await loads(p.id, result?.version ?? app?.package?.version))) {
            markRestart(app ?? { id: p.id, name: p.name }, `${p.name}: la nuova versione non si è caricata senza riavviare lilOS`);
          } else if (p.loaded && restartWanted(app.package.manifest.restartOnUpdate, p.version)) {
            markRestart(app, `${p.name} ${app.package.version} chiede di riavviare lilOS dopo l’aggiornamento`);
          } else if (pending.delete(p.id)) {
            updates.emit('change');
          }
        }
        results.push({ id: p.id, result });
      } catch (err) {
        results.push({ id: p.id, error: err });
      }
    }
  } finally {
    plans.forEach(p => updating.delete(p.id));
  }

  // The app that asked comes back where it was (new code, unless it waits for the restart)
  if (from && caller.length && pending.get(from)?.kind !== 'restart') await reopen(from, caller).catch(err => console.error('[lilos] riapertura:', err));
  if (plans.some(p => pending.get(p.id)?.kind === 'restart')) askRestart();
  return results;
}

/** Restarts an app updated elsewhere: its windows close (asking first) and open again with the new code. */
export async function reopenApp(id) {
  const windows = wm.windowsOfApp(id);
  if (!(await askWindows(windows))) return false;
  const saved = snapshot(id);
  windows.forEach(w => wm.close(w));
  stopApp(id);
  pending.delete(id);
  updates.emit('change');
  await reopen(id, saved);
  return true;
}

// ---------- Restarting ----------

/**
 * Loads lilOS again: first every window that may hold unsaved work is asked (as when closing it);
 * the windows are saved by the workspaces and come back after. Resolves false if one said no.
 */
export async function restartSystem() {
  if (wm && !(await askWindows(wm.all()))) return false;
  location.reload();
  return true;
}

/** Asks every window that may hold unsaved work whether it may close, as restartSystem() does. */
export const windowsMayClose = () => (wm ? askWindows(wm.all()) : Promise.resolve(true));

/**
 * Restarts the whole system (admins): the windows are asked first, as by restartSystem(), what is
 * pending is saved, the kernel stops and starts again (only when started by "npm run kernel": the
 * kernel says so otherwise), then lilOS loads again. Everyone signed in loses the kernel for a few
 * seconds. Resolves false if a window said no; throws if the kernel does not restart.
 */
export async function restartKernel() {
  if (wm && !(await askWindows(wm.all()))) return false;
  await kernel.flush();
  await kernelModules.restart();
  const host = document.body.appendChild(h('div'));
  progressScreen(host, 'Riavvio del sistema…');
  host.firstChild.classList.add('overlay', 'opaque');
  await kernelRestarted();
  location.reload();
  return true;
}

/** Waits for the kernel to go away and to answer again (each at most a minute): then lilOS can load. */
async function kernelRestarted() {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const answers = () => kernel.session().then(() => true, () => false);
  for (const end = Date.now() + 60_000; Date.now() < end && (await answers()); ) await wait(300);
  for (const end = Date.now() + 60_000; Date.now() < end && !(await answers()); ) await wait(1000);
}

/** Asks to restart now or later (later: the taskbar keeps a button for it). */
export async function askRestart({ title = 'Riavviare lilOS?', lead = null } = {}) {
  const reasons = updates.restartReasons();
  const body = [
    lead ? h('p', { class: 'upd-lead' }, lead) : h('p', { class: 'upd-lead' }, 'Per completare l’aggiornamento bisogna riavviare lilOS.'),
    reasons.length ? h('ul', {}, ...reasons.map(r => h('li', {}, r))) : null,
    h('p', {}, 'Tutte le finestre verranno chiuse e riaperte: salva il lavoro nelle altre app.'),
  ].filter(Boolean);
  const now = await dialog({ title, glyph: 'power', body, buttons: [{ label: 'Più tardi', value: false }, { label: 'Riavvia ora', primary: true, value: true }] });
  if (now) await restartSystem();
}

/**
 * The system (or a system app) needs lilOS to restart: e.g. the kernel started again with other
 * modules. `key` tells reasons apart (the same key replaces its reason). Asks the user right away.
 */
export function requestRestart(reason, key = reason) {
  restartReasons.set(key, reason);
  updates.emit('change');
  return askRestart();
}
