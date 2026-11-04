import { Emitter, Window, h, actionButton, host, kernel, kernelModules, systemReleases, locale } from '@lilos/sdk';
import { version as pageVersion } from '../../package.json';
import { messageScreen, progressScreen } from '../boot/screens.js';
import { getApp, registry } from './registry.js';
import { entrypointsOf } from './entrypoints.js';
import { buildOf, kernelEvents, matchesFrom, settled, wasLoaded } from './packages/packages.js';
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
 * lilOS itself (systemReleases) changes version when the kernel restarts: every page whose code is
 * of another version asks to load again (checkSystemVersion), and the admins hear how the change
 * went (systemNotices).
 *
 *   updates.pending() → [{ id, name, version, kind: 'reopen' | 'restart', reason }]
 * Events: 'change' — what is pending changed.
 */
export const updates = new Emitter();

const { t } = locale.define('lilos:apps.updates', {
  en: { strings: {
    asksRestart: '{app} {version} asks to restart lilOS after the update',
    updatedRestart: '{app} was updated to {version}: restart lilOS to use it (button in the notification area, bottom right)',
    updated: '{app} was updated to {version}',
    updatedReopen: '{app} was updated to {version}: save and restart the app (button in the notification area, bottom right)',
    updating: '{app} is being updated: one moment',
    waitsTitle: '{app} is waiting for the restart', waitsLead: '{app} was updated and opens again after lilOS restarts.',
    windows: { one: '{n} open window', other: '{n} open windows' },
    windowsIn: { one: '{n} open window in {spaces} workspaces', other: '{n} open windows in {spaces} workspaces' },
    background: 'the background services', both: '{windows} and {background}',
    leadUpdate: 'Updating {app} closes everything it has open: {closing}.',
    leadReinstall: 'Reinstalling {app} closes everything it has open: {closing}.',
    leadMany: 'Everything these apps have open will close:', item: '{app}: {closing}',
    save: 'Save your work before going on: apps with unsaved changes will ask you.',
    restartAfter: 'After the update lilOS will need to restart (requested by {apps}).',
    titleUpdate: 'Update {app}?', titleReinstall: 'Reinstall {app}?',
    titleUpdateMany: { one: 'Update {n} app?', other: 'Update {n} apps?' },
    titleReinstallMany: { one: 'Reinstall {n} app?', other: 'Reinstall {n} apps?' },
    cancel: 'Cancel', update: 'Update', reinstall: 'Reinstall', closeAndUpdate: 'Close and update', closeAndReinstall: 'Close and reinstall',
    notReady: 'lilOS is not ready yet', cancelled: 'Update cancelled: a window did not close',
    notLoaded: '{app}: the new version did not load without restarting lilOS',
    restarting: 'Restarting the system…',
    offTitle: 'lilOS is off',
    offText: 'The kernel stopped for every user. To turn it on again, start it again where it runs (npm run kernel, the service or the lilOS program), then reload this page.',
    reload: 'Reload',
    restartTitle: 'Restart lilOS?', restartLead: 'To complete the update, lilOS must restart.',
    restartHint: 'Every window will close and open again: save your work in the other apps.',
    later: 'Later', restartNow: 'Restart now',
    systemUpdated: 'lilOS was updated to version {version}',
    failedTitle: 'lilOS update failed', failedLead: 'lilOS {version} {reason}: lilOS went back by itself to version {current}.',
    failedHint: 'Nothing was lost. You can try again from the AppStore; the kernel log says what did not work.',
    ok: 'OK', updatedTitle: 'lilOS updated to {version}', updatedLead: 'The update succeeded: lilOS {version} is in use.',
    updatedAsk: 'The previous version ({from}) is still installed and is needed only to go back to it from the AppStore. Do you want to delete it?',
    keep: 'Keep', deleteVersion: 'Delete {from}', deleted: 'lilOS {from} deleted',
  } },
});

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
    markRestart(app, t('asksRestart', { app: app.name, version: now.version }));
    notify(t('updatedRestart', { app: app.name, version: now.version }), { level: 'warning' });
  } else if (wm?.windowsOfApp(id).length) {
    pending.set(id, { id, name: app.name, version: now.version, kind: 'reopen', reason: t('updated', { app: app.name, version: now.version }) });
    updates.emit('change');
    notify(t('updatedReopen', { app: app.name, version: now.version }), { level: 'warning' });
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
    notify(t('updating', { app: app?.name ?? id }));
    return true;
  }
  if (pending.get(id)?.kind === 'restart') {
    askRestart({ title: t('waitsTitle', { app: app?.name ?? id }), lead: t('waitsLead', { app: app?.name ?? id }) });
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

/** A small window with a text and buttons; resolves with the value of the button pressed (null: closed). The promise has close(). */
function dialog({ title, glyph, body, buttons }) {
  let close = null;
  const asked = new Promise(resolve => {
    // Short at first: its content overflows, so scrollHeight below is the content's own height
    const win = new Window({ title, icon: glyph, width: 460, height: 100, minHeight: 100, minimizable: false, maximizable: false, resizable: false });
    let answered = false;
    const answer = value => {
      if (answered) return;
      answered = true;
      resolve(value);
      win.emit('close');
    };
    close = () => answer(null);
    win.on('destroy', () => answer(null));
    const content = h('div', { class: 'upd-dialog' }, ...body,
      h('div', { class: 'upd-buttons' }, ...buttons.map(b => actionButton({ label: b.label, primary: b.primary, onClick: () => answer(b.value) }))));
    win.body.append(content);
    wm.open(win);
    // As tall as what it says
    requestAnimationFrame(() => win.resizeTo(460, Math.min(560, content.scrollHeight + win.titlebar.offsetHeight + 2)));
    content.querySelector('.upd-buttons .primary')?.focus();
  });
  asked.close = close;
  return asked;
}

/** "3 open windows in 2 workspaces and the background services" */
function closingText(plan) {
  let windows = '';
  if (plan.windows.length) {
    const spaces = new Set(plan.windows.map(w => wm.workspaceOf(w))).size;
    windows = spaces > 1 ? t('windowsIn', { n: plan.windows.length, spaces }) : t('windows', { n: plan.windows.length });
  }
  const background = plan.background ? t('background') : '';
  return windows && background ? t('both', { windows, background }) : windows || background;
}

function confirmUpdate(plans, { reinstall }) {
  const closing = plans.filter(p => p.windows.length || p.background);
  const restart = plans.filter(p => p.restart);
  const body = [];
  if (plans.length === 1 && closing.length) {
    body.push(h('p', { class: 'upd-lead' }, t(reinstall ? 'leadReinstall' : 'leadUpdate', { app: plans[0].name, closing: closingText(plans[0]) })));
  } else if (closing.length) {
    body.push(h('p', { class: 'upd-lead' }, t('leadMany')),
      h('ul', {}, ...closing.map(p => h('li', {}, t('item', { app: p.name, closing: closingText(p) })))));
  }
  if (closing.length) body.push(h('p', {}, t('save')));
  if (restart.length) {
    body.push(h('p', { class: 'upd-restart' }, t('restartAfter', { apps: restart.map(p => p.name).join(', ') })));
  }
  const title = plans.length === 1
    ? t(reinstall ? 'titleReinstall' : 'titleUpdate', { app: plans[0].name })
    : t(reinstall ? 'titleReinstallMany' : 'titleUpdateMany', { n: plans.length });
  return dialog({
    title, glyph: 'download', body,
    buttons: [{ label: t('cancel'), value: false }, { label: t(closing.length ? (reinstall ? 'closeAndReinstall' : 'closeAndUpdate') : reinstall ? 'reinstall' : 'update'), primary: true, value: true }],
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
  if (!wm) throw new Error(t('notReady'));
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
    notify(t('cancelled'), { level: 'warning' });
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
            markRestart(app ?? { id: p.id, name: p.name }, t('notLoaded', { app: p.name }));
          } else if (p.loaded && restartWanted(app.package.manifest.restartOnUpdate, p.version)) {
            markRestart(app, t('asksRestart', { app: p.name, version: app.package.version }));
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
  progressScreen(host, t('restarting'));
  host.firstChild.classList.add('overlay', 'opaque');
  await kernelRestarted();
  location.reload();
  return true;
}

/**
 * Stops lilOS (admins): the windows are asked first and what is pending is saved, as by
 * restartKernel(). In the program lilOS, with the lilOS it runs itself, the program quits and the
 * kernel and database stop with it; elsewhere the kernel stops for everyone and this page says
 * lilOS is off (it starts again only by hand, or by whatever started it). Resolves false if a
 * window said no; throws if the kernel does not stop.
 */
export async function shutdownSystem() {
  if (wm && !(await askWindows(wm.all()))) return false;
  await kernel.flush();
  if (host.native && (await host.info().catch(() => null))?.profile?.kind === 'local') {
    try {
      await host.quit();
      return true;
    } catch { /* a program without quit(): the kernel stops by itself */ }
  }
  await kernelModules.shutdown();
  const screen = document.body.appendChild(h('div'));
  messageScreen(screen, {
    title: t('offTitle'),
    text: t('offText'),
    buttons: [{ label: t('reload'), value: true, primary: true }],
  }).then(() => location.reload());
  screen.firstChild.classList.add('overlay', 'opaque');
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
let restartAsked = null;   // the question open now: one at a time, asked again when a reason comes

export async function askRestart({ title = t('restartTitle'), lead = null } = {}) {
  restartAsked?.close();
  const reasons = updates.restartReasons();
  const body = [
    h('p', { class: 'upd-lead' }, lead || t('restartLead')),
    reasons.length ? h('ul', {}, ...reasons.map(r => h('li', {}, r))) : null,
    h('p', {}, t('restartHint')),
  ].filter(Boolean);
  const asked = dialog({ title, glyph: 'power', body, buttons: [{ label: t('later'), value: false }, { label: t('restartNow'), primary: true, value: true }] });
  restartAsked = asked;
  const now = await asked;
  if (restartAsked === asked) restartAsked = null;
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

// ---------- lilOS itself ----------

/**
 * The kernel came back (it restarts to change version): if it runs another version of lilOS than
 * this page, load again; if it is the same, a new version may have failed (admins hear it now).
 */
kernelEvents.on('back', () => checkSystemVersion().catch(err => console.warn('[lilos] versione di lilOS:', err.message)));

export async function checkSystemVersion() {
  if (restartReasons.has('lilos-version')) return;
  const info = await systemReleases.info().catch(() => null);
  if (!info || info.mode !== 'installed') return;
  if (info.version === pageVersion) return info.failed ? systemNotices() : undefined;
  await requestRestart(t('systemUpdated', { version: info.version }), 'lilos-version');
}

/**
 * Once lilOS is up, to admins: the last version installed did not start (lilOS went back by
 * itself), or it did and the version before is still kept: delete it or keep it? Closing the
 * question without answering asks again next time.
 */
let noticing = false;

export async function systemNotices() {
  if (kernel.data?.user?.role !== 'admin' || !wm || noticing) return;
  noticing = true;
  try {
    await showNotices(await systemReleases.info().catch(() => null));
  } finally {
    noticing = false;
  }
}

async function showNotices(info) {
  if (info?.failed) {
    const { failed } = info;
    await dialog({
      title: t('failedTitle'), glyph: 'warning',
      body: [
        h('p', { class: 'upd-lead' }, t('failedLead', { version: failed.version, reason: failed.reason, current: info.version })),
        h('p', {}, t('failedHint')),
        failed.log?.length ? h('pre', { class: 'upd-log' }, failed.log.slice(-8).join('\n')) : null,
      ].filter(Boolean),
      buttons: [{ label: t('ok'), primary: true, value: true }],
    });
    await systemReleases.acknowledge('failed').catch(err => console.warn('[lilos] aggiornamento:', err.message));
  }
  if (info?.updated) {
    const { from } = info.updated;
    const answer = await dialog({
      title: t('updatedTitle', { version: info.version }), glyph: 'download',
      body: [
        h('p', { class: 'upd-lead' }, t('updatedLead', { version: info.version })),
        h('p', {}, t('updatedAsk', { from })),
      ],
      buttons: [{ label: t('keep'), value: 'keep' }, { label: t('deleteVersion', { from }), primary: true, value: 'delete' }],
    });
    try {
      if (answer === 'delete') {
        await systemReleases.remove(from);
        notify(t('deleted', { from }));
      } else if (answer === 'keep') {
        await systemReleases.acknowledge('updated');
      }
    } catch (err) {
      notify(err.message, { level: 'error' });
    }
  }
}
