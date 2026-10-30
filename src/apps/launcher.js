import { bus, menus, toast } from '@lilos/sdk';
import { apps, getApp, isInstalled } from './registry.js';

/**
 * Where launching acts: by default one window per app on the whole desk. Workareas narrow it:
 * launching an app looks for its window only among the windows of the current scope, and a new
 * window opens in the middle of it. See setLaunchScope().
 */
let scope = { includes: () => true, center: () => null, bounds: () => null };

/** Key of the saved state of a window that is not the app's main one. */
const ENTRY = '__entry';

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
 * existing window back and emits 'launch' on it with the new args). App modules export a default
 * function ({ args, openWindow, entry }) → Window (system apps: their other window entry points
 * as exports with that name); openWindow(win, key?) opens a secondary window (settings,
 * pickers): with a key, a window already open with that key is shown instead and returned.
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
  menus.defineAction('app.launch', {
    label: 'Apri un’app', icon: 'open',
    params: raw => (raw && apps.some(a => a.id === raw.app && a.load) ? { app: raw.app } : null),
    run: (ctx, p) => bus.emit('app:launch', { id: p.app }),
  });

  const loading = new Set();
  const openWindow = (win, key = null) => {
    const open = key && wm.get(key);
    if (open) { wm.show(open); return open; }
    return wm.open(win, { key, center: scope.center(win), bounds: scope.bounds() });
  };

  // A window entry point other than main: system apps export it by name, installed apps get it as `entry`.
  // Its window saves { [ENTRY]: name, args: its state } to come back as the same entry point
  const create = async (app, args, entry = 'main', files = []) => {
    const mod = await app.load();
    const make = entry !== 'main' && app.trusted && typeof mod[entry] === 'function' ? mod[entry] : mod.default;
    const win = await make({ args, openWindow, entry, files });
    win.entry = entry;
    if (entry !== 'main') {
      const state = win.getState;
      win.getState = () => ({ [ENTRY]: entry, args: state ? state() : args ?? null });
    }
    return win;
  };

  // files: ids the user handed the app with this launch (installed apps may then read and write them)
  bus.on('app:launch', async ({ id, args, entry = 'main', files = [] }) => {
    const app = getApp(id);
    if (!app?.load) return console.info('[lilos] app non ancora disponibile:', id);
    if (!isInstalled(id)) return toast(`${app.name} è nascosta in questo workspace. Si mostra da Sistema → Workspace.`, { timeout: 5000 });
    const open = wm.windows.find(w => wm.appOf(w) === id && (w.entry ?? 'main') === entry && scope.includes(w));
    if (open) {
      if (files.length) open.emit('grant', files);
      open.emit('launch', args);
      return wm.show(open);
    }
    const workspace = wm.workspace;
    const key = `${workspace}/${id}#${entry}`;
    if (loading.has(key)) return;

    loading.add(key);
    try {
      const win = await create(app, args, entry, files);
      if (wm.workspace !== workspace) wm.open(win, { app: id, workspace });   // changed meanwhile: it waits there
      else wm.open(win, { app: id, center: scope.center(win), bounds: scope.bounds() });
    } catch (err) {
      console.error(`[lilos] impossibile avviare ${id}:`, err);
      toast(`${app.name} non è partita: ${err.message}`, { timeout: 6000 });
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
