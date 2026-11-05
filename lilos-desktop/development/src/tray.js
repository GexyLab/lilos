import { Menu, Tray, app, nativeImage, shell } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setAutostart } from './autostart.js';
import { t } from './i18n.js';
import { local } from './local/index.js';
import { copyCommand, openCliTerminal, openKernelLog, switchToUi } from './noui.js';
import { noUi, settings, update } from './store.js';
import { openLast, openProfile } from './windows.js';

/**
 * The icon in the tray (menu bar on macOS): open lilOS, the servers, open in the browser, start
 * with the computer, quit (which stops the local kernel). In kiosk mode only "Open". Without UI
 * (noui.js) the program is only this icon: its own menu (noUiMenu).
 */
const ASSETS = join(dirname(fileURLToPath(import.meta.url)), 'assets');
let tray = null;
let unread = 0;
let onQuit = null;

function icon() {
  if (process.platform === 'darwin') {
    const img = nativeImage.createFromPath(join(ASSETS, 'trayTemplate.png'));
    img.setTemplateImage(true);
    return img;
  }
  return nativeImage.createFromPath(join(ASSETS, process.platform === 'win32' ? 'tray.ico' : 'tray.png'));
}

const autostartClick = item => { update(d => { d.startAtLogin = item.checked; }); setAutostart(item.checked); refreshTray(); };

/** lilOS without UI: its state, the terminal, the command, the log, restart, start with the computer, to the UI, quit. */
function noUiMenu() {
  const s = settings();
  const state = ['running', 'starting', 'failed'].includes(local.status) ? local.status : 'stopped';
  const running = local.status === 'running';
  const items = [{ label: t('tray.noui.header', { state: t(`tray.noui.${state}`) }), enabled: false }];
  if (running) items.push({ label: t('tray.noui.kernel', { version: local.version ?? '?', port: s.local.port }), enabled: false });
  if (state === 'failed' && local.error) items.push({ label: local.error.length > 90 ? `${local.error.slice(0, 89)}…` : local.error, enabled: false });
  items.push(
    { label: t('tray.noui.terminal'), enabled: local.status !== 'starting', click: () => openCliTerminal() },
    { label: t('tray.noui.copy'), click: () => copyCommand() },
    { label: t('tray.noui.log'), click: () => openKernelLog() },
    { type: 'separator' },
    { label: t('tray.noui.restart'), enabled: local.status !== 'starting', click: () => local.restart().catch(() => {}) },
    { label: t('tray.noui.autostart'), type: 'checkbox', checked: s.startAtLogin, click: autostartClick },
    { label: t('tray.noui.switch'), enabled: local.status !== 'starting', click: () => switchToUi().then(refreshTray, refreshTray) },
    { type: 'separator' },
    { label: t('tray.noui.quit'), click: () => onQuit?.() },
  );
  return Menu.buildFromTemplate(items);
}

function menu() {
  if (noUi()) return noUiMenu();
  const s = settings();
  const kiosk = s.display === 'kiosk';
  const status = local.status === 'running' ? t('tray.kernel.running') : local.status === 'starting' ? t('tray.kernel.starting') : t('tray.kernel.stopped');
  const items = [
    { label: t('tray.open'), click: () => openLast() },
  ];
  if (!kiosk) {
    if (unread) items.push({ label: t('tray.unread', { count: unread }), click: () => openLast() });
    if (s.profiles.length > 1) {
      items.push({ label: t('tray.servers'), submenu: s.profiles.map(p => ({ label: p.name, click: () => openProfile(p) })) });
    }
    items.push({ type: 'separator' });
    if (s.profiles.some(p => p.kind === 'local')) {
      items.push({ label: status, enabled: false });
      items.push({ label: t('tray.browser'), enabled: !!local.url && local.status === 'running', click: () => shell.openExternal(local.url) });
    }
    items.push({ label: t('tray.autostart'), type: 'checkbox', checked: s.startAtLogin, click: autostartClick });
    items.push({ type: 'separator' });
    items.push({ label: t('tray.quit'), click: () => onQuit?.() });
  }
  return Menu.buildFromTemplate(items);
}

export function createTray(quit) {
  onQuit = quit;
  tray = new Tray(icon());
  tray.setToolTip('lilOS');
  // Without UI there is no window to open: a click shows the menu
  tray.on('click', () => (noUi() ? tray.popUpContextMenu() : openLast()));
  refreshTray();
  local.on('status', refreshTray);
}

export function refreshTray() {
  if (!tray || tray.isDestroyed()) return;
  tray.setContextMenu(menu());
  tray.setToolTip(noUi() ? t('tray.noui.tooltip') : unread ? t('tray.tooltipUnread', { count: unread }) : 'lilOS');
}

/** Unread notifications of lilOS: on the icon of the taskbar or dock, and in the tray's menu. */
export function setUnread(count, win, overlayPng) {
  unread = Math.max(0, Math.min(9999, Number(count) || 0));
  if (process.platform === 'win32') {
    win?.setOverlayIcon(unread && overlayPng ? nativeImage.createFromDataURL(overlayPng) : null, unread ? t('tray.unread', { count: unread }) : '');
  } else {
    app.setBadgeCount(unread);
  }
  refreshTray();
}
