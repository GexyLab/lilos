import { bus, menus, toast } from '@lilos/sdk';
import { apps, getApp, isInstalled } from './registry.js';

/**
 * Where launching acts: by default one window per app on the whole desk. Workareas narrow it:
 * launching an app looks for its window only among the windows of the current scope, and a new
 * window opens in the middle of it. See setLaunchScope().
 */
let scope = { includes: () => true, center: () => null, bounds: () => null };

/**
 * scope: { includes(win) → boolean, center(win) → world point | null, bounds() → world rect | null }.
 * includes() says which open windows count as "the app's window" here; center(win) where a new
 * window goes (null: the middle of the view), bounds() the space it should stay in.
 */
export function setLaunchScope(value) {
  scope = value;
}

/**
 * Turns 'app:launch' into windows: loads the app module on first use and opens one
 * window per app in the current scope (launching it again brings the existing window back and
 * emits 'launch' on it with the new args). App modules export a default function
 * ({ args, openWindow }) → Window; openWindow(win, key?) opens a secondary window (settings,
 * pickers): with a key, a window already open with that key is shown instead and returned.
 * An app that is not installed in the current workspace does not start (a message says so).
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

  const create = async (app, args) => {
    const { default: make } = await app.load();
    return make({ args, openWindow });
  };

  bus.on('app:launch', async ({ id, args }) => {
    const app = getApp(id);
    if (!app?.load) return console.info('[lilos] app non ancora disponibile:', id);
    if (!isInstalled(id)) return toast(`${app.name} non è installata in questo workspace. Si aggiunge da Impostazioni → Workspace.`, { timeout: 5000 });
    const open = wm.windows.find(w => wm.appOf(w) === id && scope.includes(w));
    if (open) {
      open.emit('launch', args);
      return wm.show(open);
    }
    const workspace = wm.workspace;
    const key = `${workspace}/${id}`;
    if (loading.has(key)) return;

    loading.add(key);
    try {
      const win = await create(app, args);
      if (wm.workspace !== workspace) wm.open(win, { app: id, workspace });   // changed meanwhile: it waits there
      else wm.open(win, { app: id, center: scope.center(win), bounds: scope.bounds() });
    } catch (err) {
      console.error(`[lilos] impossibile avviare ${id}:`, err);
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
        return wm.open(await create(app, state ?? undefined), { app: id, at: rect, workspace });
      } catch (err) {
        console.error(`[lilos] impossibile riaprire ${id}:`, err);
        return null;
      }
    },
  };
}
