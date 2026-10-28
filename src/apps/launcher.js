import { bus } from '@lilos/sdk';
import { getApp } from './registry.js';

/**
 * Turns 'app:launch' into windows: loads the app module on first use and opens one
 * window per app (launching it again brings the existing window back and emits 'launch' on it
 * with the new args). App modules export a default function ({ args }) → Window.
 */
export function connectLauncher(wm) {
  const loading = new Set();

  bus.on('app:launch', async ({ id, args }) => {
    const app = getApp(id);
    if (!app?.load) return console.info('[lilos] app non ancora disponibile:', id);
    const open = wm.get(id);
    if (open) {
      open.emit('launch', args);
      return wm.show(open);
    }
    if (loading.has(id)) return;

    loading.add(id);
    try {
      const { default: create } = await app.load();
      wm.open(create({ args }), { key: id });
    } catch (err) {
      console.error(`[lilos] impossibile avviare ${id}:`, err);
    } finally {
      loading.delete(id);
    }
  });
}
