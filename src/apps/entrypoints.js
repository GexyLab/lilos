import { getApp, isInstalled, launch } from './registry.js';
import { entrypoints } from './packages/code.js';
import * as background from './packages/background.js';
import { services } from './services.js';
import { locale } from '@lilos/sdk';

const { t } = locale.define('lilos:apps.entrypoints', {
  en: { strings: {
    notInstalled: 'App not installed: {id}',
    hidden: '{app} is hidden in this workspace',
    noEntry: '{app} has no entry point {entry}',
    backgroundOnly: 'You can connect only to a background entry point',
  } },
});

/**
 * Entry points: the parts of an app that can start on their own. When the user opens an app its
 * `main` window starts; the system and other apps may start the others (lilos.apps.call, with the
 * permission apps.call:<app>; an app its own ones with lilos.app.call).
 *
 *   window       opens that window of the app (or brings it back), with `data` as its args
 *   background   no window: runs in the background (background.js) and answers with what its
 *                lilos.handle() function returns
 *   service      no window, in the kernel (services.js): the same, through the kernel
 */
export const entrypointsOf = app => (app?.package ? entrypoints(app.text ?? app.package.manifest) : { main: { kind: 'window' } });

function find(appId, entry) {
  const app = getApp(appId);
  if (!app?.load) throw new Error(t('notInstalled', { id: appId }));
  if (!isInstalled(appId)) throw new Error(t('hidden', { app: app.name }));
  const ep = typeof entry === 'string' && Object.hasOwn(entrypointsOf(app), entry) ? entrypointsOf(app)[entry] : null;
  if (!ep) throw new Error(t('noEntry', { app: app.name, entry: String(entry).slice(0, 40) }));
  return { app, ep };
}

/** Starts an entry point; resolves with its answer (background) or null (window). */
export async function callEntrypoint(appId, entry = 'main', data = null, { from = null } = {}) {
  const { app, ep } = find(appId, entry);
  if (ep.kind === 'window') {
    launch(appId, data ?? undefined, entry);
    return null;
  }
  if (ep.kind === 'service') return services.call(appId, entry, data, from);
  return background.call(app, entry, data, from);
}

/** A MessagePort to one of the app's background entry points. */
export function connectEntrypoint(appId, entry) {
  const { app, ep } = find(appId, entry);
  if (ep.kind !== 'background') throw new Error(t('backgroundOnly'));
  return background.connect(app, entry);
}
