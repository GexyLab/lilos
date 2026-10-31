import { bus, pipes, settings, apps as installed, kernel } from '@lilos/sdk';

/**
 * The events of the catalog (the SDK's pipeCatalog.js) that do not go through the file system:
 * windows, workspaces, settings, installed apps and the session. Each one only tells, after it
 * happened (pipes.notify): the handlers look, they do not change it.
 * Also the bus events 'files:locked' (an app locked files again: their windows close) and
 * 'files:shown' ({ ids, answer(id) }: which of these files a window shows).
 */
export function connectSystemEvents({ wm, workspaces }) {
  const about = win => ({ app: wm.appOf(win) ?? null, entry: win.entry ?? 'main', title: win.title ?? '' });
  wm.on('open', win => pipes.notify('window.open', about(win)));
  wm.on('close', win => pipes.notify('window.close', about(win)));

  let current = workspaces.currentId ?? null;
  workspaces.on('switch', id => {
    pipes.notify('workspace.switch', { from: current, to: id });
    current = id;
  });

  settings.on('change', ({ key, value }) => pipes.notify('settings.change', { key, value }));
  installed.on('security', security => pipes.notify('settings.system', { isolated: security?.isolated ?? true }));

  // Installed apps: what each one was, to tell installing, updating and new permissions apart
  const known = new Map(installed.list().map(a => [a.id, { version: a.version, granted: JSON.stringify(a.granted ?? []) }]));
  installed.on('change', ({ id, app }) => {
    const before = known.get(id);
    if (!app) {
      known.delete(id);
      return pipes.notify('apps.remove', { id });
    }
    const granted = JSON.stringify(app.granted ?? []);
    known.set(id, { version: app.version, granted });
    if (!before) pipes.notify('apps.install', { id, version: app.version });
    else if (before.version !== app.version) pipes.notify('apps.update', { id, version: app.version, from: before.version });
    if (before && before.granted !== granted) pipes.notify('permissions.change', { id, granted: app.granted ?? [] });
  });

  bus.on('system:ready', data => pipes.notify('system.ready', data));
  bus.on('user:login', data => pipes.notify('session.login', data));
  kernel.onLogout(() => pipes.notify('session.logout', {}));

  const fileOf = win => {
    try { return win.getState?.()?.file ?? null; } catch { return null; }   // a window without state
  };
  // Windows that show a file just locked again (an encrypted one) close: what they show is in
  // clear. Asked like the close button, so a window with unsaved changes says so first
  bus.on('files:locked', ids => {
    for (const win of [...wm.windows]) if (ids.includes(fileOf(win))) wm.requestClose(win);
  });
  bus.on('files:shown', ({ ids, answer }) => {
    for (const win of wm.windows) if (ids.includes(fileOf(win))) answer(fileOf(win));
  });
}
