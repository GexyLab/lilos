import { bus, menus, messageBox, pipes, PipeStopped, locale, textDirection } from '@lilos/sdk';
import { apps, getApp, isInstalled } from './registry.js';
import { blockedLaunch } from './updates.js';
import { notify } from '../notifications/notify.js';

/**
 * Where launching acts: by default one window per app on the whole desk. Workareas narrow it:
 * launching an app looks for its window only among the windows of the current scope, and a new
 * window opens in the middle of it. See setLaunchScope().
 */
let scope = { includes: () => true, center: () => null, bounds: () => null };

const { t } = locale.define('lilos:apps.launcher', {
  en: { strings: {
    name: '“{id}”', nameVersion: '“{id}” ({version})',
    restart: {
      one: 'It needs the kernel module {modules}, already installed: it starts working at the next restart of the kernel, which an administrator does from the AppStore.',
      other: 'It needs the kernel modules {modules}, already installed: they start working at the next restart of the kernel, which an administrator does from the AppStore.',
    },
    missing: 'Not found: {list}. An administrator installs it from the AppStore.',
    missingModule: 'the kernel module {name}', missingApp: 'the app {name}',
    openApp: 'Open an app',
    hidden: '{app} is hidden in this workspace. You can show it from Control Panel → Workspace.',
    cannotStart: '{app} cannot start yet', notStarted: '{app} did not start: {message}',
  } },
});

/** Key of the saved state of a window that is not the app's main one. */
const ENTRY = '__entry';

/**
 * Why an app cannot start yet: its required dependencies that are not there (kernel `unmet`), or
 * null. A module installed with it runs only after the kernel's restart.
 */
function unmetText(app) {
  const unmet = app.package?.unmet;
  if (!unmet?.length) return null;
  const name = u => (u.version ? t('nameVersion', { id: u.id, version: u.version }) : t('name', { id: u.id }));
  const restart = unmet.filter(u => u.why === 'restart'), missing = unmet.filter(u => u.why !== 'restart');
  // Only modules wait for the restart: an app is there or not
  return [
    restart.length ? t('restart', { n: restart.length, modules: restart.map(name).join(', ') }) : '',
    missing.length ? t('missing', { list: missing.map(u => t(u.kind === 'module' ? 'missingModule' : 'missingApp', { name: name(u) })).join(', ') }) : '',
  ].filter(Boolean).join('\n\n');
}

/**
 * scope: { includes(win) → boolean, center(win) → world point | null, bounds() → world rect | null }.
 * includes() says which open windows count as "the app's window" here; center(win) where a new
 * window goes (null: the middle of the view), bounds() the space it should stay in.
 */
export function setLaunchScope(value) {
  scope = value;
}

/**
 * Turns 'app:launch' ({ id, args, entry, files }) into windows: loads the app module on first use and
 * opens one window per app and entry point in the current scope (launching it again brings the
 * existing window back and emits 'launch' on it with the new args; with `newWindow` it opens
 * another one anyway). App modules export a default
 * function ({ args, openWindow, entry }) → Window (system apps: their other window entry points
 * as exports with that name); openWindow(win, key?, { main?, at? }) opens a secondary window
 * (settings, pickers): with a key, a window already open with that key is shown instead and
 * returned. `main: true` opens another window of the app itself instead (Terminale's detached
 * tabs): saved and restored like the one launching opens, from its getState() given back as `args`.
 * `at: { x, y }` (a point of the screen, clientX/clientY) puts its top-left corner there.
 * The user always opens `main`; the others are started by the system and by apps (entrypoints.js).
 * An app hidden in the current workspace does not start (a message says so).
 * The window belongs to the workspace that was current when the app was asked for, even if the
 * user changes workspace while it loads.
 *
 * Returns { restore({ app, state, rect }, { workspace }) }: recreates an app window as it was
 * (workareas, workspaces).
 */
export function connectLauncher(wm) {
  // Any menu can offer to open an app: { action: 'app.launch', params: { app } }
  // Defined again in a new language (the menus keep the label they were given)
  const defineLaunch = () => menus.defineAction('app.launch', {
    label: t('openApp'), icon: 'open',
    params: raw => (raw && apps.some(a => a.id === raw.app && a.load) ? { app: raw.app } : null),
    run: (ctx, p) => bus.emit('app:launch', { id: p.app }),
  });
  defineLaunch();
  locale.on('change', defineLaunch);

  const loading = new Set();
  // Secondary windows belong to the app that opens them (an update closes them with it)
  const windowOpener = owner => (win, key = null, { main = false, at = null } = {}) => {
    const open = key && wm.get(key);
    if (open) { wm.show(open); return open; }
    const where = at && Number.isFinite(at.x) && Number.isFinite(at.y) ? { at: wm.canvas.toWorld(at.x, at.y) } : { center: scope.center(win), bounds: scope.bounds() };
    return wm.open(win, { key, owner, ...(main && { app: owner }), ...where });
  };

  // A window entry point other than main: system apps export it by name, installed apps get it as `entry`.
  // Its window saves { [ENTRY]: name, args: its state } to come back as the same entry point
  const create = async (app, args, entry = 'main', files = []) => {
    const mod = await app.load();
    const make = entry !== 'main' && app.trusted && typeof mod[entry] === 'function' ? mod[entry] : mod.default;
    const win = await make({ args, openWindow: windowOpener(app.id), entry, files });
    win.entry = entry;
    // Its content in the app's own language and direction: an app without Arabic stays left to right in an Arabic lilOS
    const own = () => {
      const lang = locale.strings(app.id).lang;
      win.body.lang = lang;
      win.body.dir = textDirection(lang);
    };
    own();
    win.on('destroy', locale.on('change', own));
    if (entry !== 'main') {
      const state = win.getState;
      win.getState = () => ({ [ENTRY]: entry, args: state ? state() : args ?? null });
    }
    return win;
  };

  // files: ids the user handed the app with this launch (installed apps may then read and write them)
  let extra = 0;
  bus.on('app:launch', async ({ id, args, entry = 'main', files = [], newWindow = false }) => {
    const app = getApp(id);
    if (!app?.load) return console.info('[lilos] app non ancora disponibile:', id);
    if (!isInstalled(id)) return notify(t('hidden', { app: app.name }), { level: 'warning' });
    // Being updated, or updated and waiting for lilOS to restart: its old code must not start again
    if (blockedLaunch(id)) return;
    const unmet = unmetText(app);
    if (unmet) return messageBox(null, { icon: 'warning', title: t('cannotStart', { app: app.name }), text: unmet });
    // The app.launch pipe: a handler may change the args, or stop it
    if (pipes.wants('app.launch', { id, entry, args }, { system: true })) {
      try {
        const given = args;
        ({ args } = await pipes.around('app.launch', { id, entry, args: args ?? null }, d => d, { caller: { system: true } }));
        // Handlers change the options of a launch, never which files the app gets
        if (args && typeof args === 'object') {
          const { file, files: list, ...rest } = args;
          args = { ...rest, ...(given?.file !== undefined && { file: given.file }), ...(given?.files !== undefined && { files: given.files }) };
        } else if (given?.file !== undefined || given?.files !== undefined) {
          args = given;
        }
        args ??= undefined;
      } catch (err) {
        if (!(err instanceof PipeStopped && err.silent)) notify(err.message, { level: 'error' });
        return;
      }
    }
    const open = !newWindow && wm.windows.find(w => wm.appOf(w) === id && (w.entry ?? 'main') === entry && scope.includes(w));
    if (open) {
      if (files.length) open.emit('grant', files);
      open.emit('launch', args);
      return wm.show(open);
    }
    const workspace = wm.workspace;
    // A window asked apart neither waits for nor blocks the one being opened already
    const key = `${workspace}/${id}#${entry}${newWindow ? `+${++extra}` : ''}`;
    if (loading.has(key)) return;

    loading.add(key);
    try {
      const win = await create(app, args, entry, files);
      if (wm.workspace !== workspace) wm.open(win, { app: id, workspace });   // changed meanwhile: it waits there
      else wm.open(win, { app: id, center: scope.center(win), bounds: scope.bounds() });
    } catch (err) {
      console.error(`[lilos] impossibile avviare ${id}:`, err);
      notify(t('notStarted', { app: app.name, message: err.message }), { level: 'error' });
    } finally {
      loading.delete(key);
    }
  });

  return {
    /**
     * Recreates a saved app window where it was, in `workspace` (the current one by default);
     * resolves with it, or null if the app cannot start or is not installed.
     */
    async restore({ app: id, state, rect }, { workspace = wm.workspace } = {}) {
      const app = getApp(id);
      if (!app?.load || !isInstalled(id)) return null;
      try {
        const entry = typeof state?.[ENTRY] === 'string' ? state[ENTRY] : 'main';
        const args = entry === 'main' ? state ?? undefined : state.args ?? undefined;
        return wm.open(await create(app, args, entry), { app: id, at: rect, workspace });
      } catch (err) {
        console.error(`[lilos] impossibile riaprire ${id}:`, err);
        return null;
      }
    },
  };
}
