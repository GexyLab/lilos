import { bus, Emitter } from '@lilos/sdk';

/**
 * The apps lilOS has: the ones installed in /system/app (packages, registered at start-up and
 * when installed: see packages/packages.js). File Manager, Editor, Sistema (settings) and AppStore are packages
 * of the official repository too, installed by the kernel when missing.
 *
 *   { id, name, glyph, color, system?, trusted?, load: () => module, opens?: [ext], commands?: [cmd], package }
 *
 * `glyph` is a name accepted by icon(). `load` imports the app module on first launch (see
 * launcher.js). `opens`: file extensions the app opens (see open.js). `commands`: keyboard
 * shortcuts of the app, registered with the app so they can be changed in Settings even before
 * it runs (see commands.js). `package`: the installed package (state and manifest).
 * Every workspace has every app; a workspace may hide some (see isInstalled); `system` apps
 * (required by lilOS) are never hidden. `trusted` apps (system apps of the official repository)
 * run inside lilOS, the others in a sandbox.
 *
 * `apps` is live: it changes when apps are installed or removed ('change' on `registry`).
 */
export const apps = [];

/** Events: 'change' { id, app | null } — an app was added, replaced or removed (null). */
export const registry = new Emitter();

/** Adds an app, or replaces the one with the same id (a new version). */
export function registerApp(app) {
  const i = apps.findIndex(a => a.id === app.id);
  if (i >= 0) apps[i] = app;
  else apps.push(app);
  registry.emit('change', { id: app.id, app });
}

export function unregisterApp(id) {
  const i = apps.findIndex(a => a.id === id);
  if (i < 0) return;
  apps.splice(i, 1);
  registry.emit('change', { id, app: null });
}

export const getApp = id => apps.find(app => app.id === id);

let installed = () => true;

/** Set by the system (workspaces): (appId) → whether the current workspace shows the app. */
export function setInstalledFilter(fn) {
  installed = fn;
}

/** True if the app can be used in the current workspace (system apps always). */
export const isInstalled = id => !!getApp(id) && (getApp(id).system === true || installed(id));

/** Apps shown in the current workspace, in registry order. */
export const installedApps = () => apps.filter(app => isInstalled(app.id));

/**
 * Opens the app; `entry`: one of its window entry points other than main (see entrypoints.js).
 * `files`: ids of files the user hands it (an installed app may then read and write them).
 */
export function launch(id, args, entry = 'main', { files = [] } = {}) {
  bus.emit('app:launch', { id, args, entry, files });
}
