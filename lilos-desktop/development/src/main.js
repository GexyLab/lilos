import { Menu, app, session } from 'electron';
import { setAutostart } from './autostart.js';
import { broadcast, setupBridge } from './bridge.js';
import { forget, setupBluetooth, setupSession } from './devices.js';
import { cleanOpened } from './files.js';
import { t } from './i18n.js';
import { automaticSetup, forgetInstalled, justInstalled } from './installFile.js';
import { local } from './local/index.js';
import { openCliTerminal, settle } from './noui.js';
import { openWelcome, setupPages } from './pages.js';
import { addProfile, noUi, override, settings } from './store.js';
import { createTray } from './tray.js';
import { setupUpdates } from './updates.js';
import { lilosWindows, openLast, openProfile, profileOf, setQuitting } from './windows.js';
import { hasRuntime } from './runtime.js';

/**
 * lilOS, the program: lilOS in its own window instead of a browser, on Windows, macOS and Linux.
 * At the first start it asks where lilOS runs (pages/welcome.html), unless the installation
 * settings say it (lilos-install.json, installFile.js); then it opens the last server used.
 * Installed again over an earlier installation, it first asks whether to use it or start from
 * zero. The lilOS of this computer (if chosen) starts with the program and stops when the
 * program quits; closing the window leaves the program in the tray. lilOS without UI (noui.js) has
 * no window at all: the program is its tray icon, and starting it again opens the lilos terminal.
 *   --hidden   start without showing the window (start with the computer)
 *   --session  lilOS is the whole desktop (the Linux session «lilOS»): kiosk, no tray, quitting ends it
 *   lilos://open?path=/Documenti/x.txt   opens a file of lilOS (event 'open' to the page)
 */
const PROTOCOL = 'lilos';
const SESSION = process.argv.includes('--session');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  start();
}

function start() {
  app.setAppUserModelId('it.gexylab.lilos');
  // Only the installed program takes lilos:// (a copy in development would take it from it)
  if (app.isPackaged) app.setAsDefaultProtocolClient(PROTOCOL);

  // Another start of the program (a click on its icon, a lilos:// link): this one answers
  app.on('second-instance', (_e, argv) => {
    const link = argv.find(a => a.startsWith(`${PROTOCOL}://`));
    showMain();
    if (link) deepLink(link);
  });
  app.on('open-url', (e, url) => {
    e.preventDefault();
    app.whenReady().then(() => { showMain(); deepLink(url); });
  });

  app.on('web-contents-created', (_e, contents) => {
    contents.on('destroyed', () => forget(contents));
    if (contents.getType() === 'window') setupBluetooth(contents);
  });
  // Every session of a lilOS window gets the permission rules, once
  app.on('session-created', ses => setupSession(ses));

  app.whenReady().then(ready);
  app.on('window-all-closed', () => {
    // The tray keeps the program (and the local kernel) alive; without it, it quits. Without UI
    // the tray is all there is: it stays
    if (!settings().stayInTray && !noUi()) quit();
  });
  app.on('activate', () => showMain());
  let stopped = false;
  app.on('before-quit', e => {
    setQuitting();
    if (stopped) return;
    e.preventDefault();
    stopped = true;
    // The local kernel and its database stop before the program goes
    local.stop().catch(() => {}).finally(() => {
      cleanOpened();
      app.quit();
    });
  });
}

function quit() {
  app.quit();
}

function showMain() {
  if (!settings().profiles.length) return firstStart();
  if (justInstalled()) return openWelcome({ previous: true });
  // Without UI: started again by hand, the program opens what there is to open, the lilos terminal
  if (noUi()) return openCliTerminal();
  return openLast();
}

/**
 * The servers already chosen: the local lilOS starts (even hidden, started with the computer), the
 * last one opens. Without UI nothing opens; started by hand (not hidden), the lilos terminal.
 */
function resume({ hidden = false } = {}) {
  const s = settings();
  if (s.profiles.some(p => p.kind === 'local') && local.installed) local.start().catch(() => {});
  if (noUi()) {
    settle();
    if (!hidden) openCliTerminal();
    return;
  }
  if (!hidden || s.display === 'kiosk') openLast();
}

/**
 * No profile yet: what the installation settings say (a server, or lilOS here installed by itself),
 * or the welcome page. lilOS without UI installed by itself still shows the welcome page, at its
 * step «Pronto» (auto): that page is where it says how to use it.
 */
function firstStart() {
  const auto = automaticSetup();
  if (auto?.kind === 'remote') return openProfile(addProfile({ name: auto.server.name, kind: 'remote', url: auto.server.url, trusted: auto.server.trusted }));
  if (auto?.kind === 'local' && auto.noUi && hasRuntime()) return openWelcome({ auto: true });
  if (auto?.kind === 'local' && hasRuntime()) return openProfile(addProfile({ name: t('profile.local'), kind: 'local', url: null, trusted: true }));
  return openWelcome();
}

function deepLink(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== 'open') return;
    const path = u.searchParams.get('path');
    if (path) broadcast('open', { path });
  } catch { /* not a link */ }
}

function appMenu() {
  if (process.platform !== 'darwin') return Menu.setApplicationMenu(null);
  // macOS wants a menu: the app's (about, settings, hide, quit), Edit (copy and paste need it), Window
  const settingsItem = { label: t('menu.settings'), accelerator: 'Cmd+,', click: () => broadcast('open-settings', 'computer') };
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'lilOS', submenu: [{ role: 'about', label: t('menu.about') }, { type: 'separator' }, settingsItem, { type: 'separator' }, { role: 'hide', label: t('menu.hide') }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit', label: t('menu.quit') }] },
    { role: 'editMenu' },
    { role: 'windowMenu' },
  ]));
}

async function ready() {
  appMenu();
  cleanOpened();
  setupBridge();
  setupPages({ firstStart, resume });
  setupSession(session.defaultSession);
  if (SESSION) {
    // For this run only: the saved settings stay as they are for the normal desktop
    override({ display: 'kiosk', stayInTray: false });
  } else {
    createTray(quit);
  }
  setupUpdates();
  // The login item follows the setting (the program may have moved since)
  if (settings().startAtLogin) setAutostart(true);

  const link = process.argv.find(a => a.startsWith(`${PROTOCOL}://`));
  if (!settings().profiles.length) {
    // Nothing earlier to keep: the mark of a new installation is not needed
    forgetInstalled();
    firstStart();
    return;
  }
  // Installed again: the earlier installation is used or put aside first (pages/welcome.html)
  if (justInstalled()) {
    openWelcome({ previous: true });
    return;
  }
  resume({ hidden: process.argv.includes('--hidden') });
  if (link) deepLink(link);
}

export { lilosWindows, profileOf };
