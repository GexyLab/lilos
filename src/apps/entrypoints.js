import { getApp, isInstalled, launch } from './registry.js';
import { entrypoints } from './packages/code.js';
import * as background from './packages/background.js';

/**
 * Entry points: the parts of an app that can start on their own. When the user opens an app its
 * `main` window starts; the system and other apps may start the others (lilos.apps.call, with the
 * permission apps.call:<app>; an app its own ones with lilos.app.call).
 *
 *   window       opens that window of the app (or brings it back), with `data` as its args
 *   background   no window: runs in the background (background.js) and answers with what its
 *                lilos.handle() function returns
 */
export const entrypointsOf = app => (app?.package ? entrypoints(app.package.manifest) : { main: { kind: 'window' } });

function find(appId, entry) {
  const app = getApp(appId);
  if (!app?.load) throw new Error(`App non installata: ${appId}`);
  if (!isInstalled(appId)) throw new Error(`${app.name} è nascosta in questo workspace`);
  const ep = typeof entry === 'string' && Object.hasOwn(entrypointsOf(app), entry) ? entrypointsOf(app)[entry] : null;
  if (!ep) throw new Error(`${app.name} non ha il punto d’ingresso ${String(entry).slice(0, 40)}`);
  return { app, ep };
}

/** Starts an entry point; resolves with its answer (background) or null (window). */
export async function callEntrypoint(appId, entry = 'main', data = null, { from = null } = {}) {
  const { app, ep } = find(appId, entry);
  if (ep.kind === 'window') {
    launch(appId, data ?? undefined, entry);
    return null;
  }
  return background.call(app, entry, data, from);
}

/** A MessagePort to one of the app's background entry points. */
export function connectEntrypoint(appId, entry) {
  const { app, ep } = find(appId, entry);
  if (ep.kind !== 'background') throw new Error('Ci si collega solo a un punto d’ingresso in background');
  return background.connect(app, entry);
}
