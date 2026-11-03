import { Menu, Tray, app, nativeImage, shell } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setAutostart } from './autostart.js';
import { t } from './i18n.js';
import { local } from './local/index.js';
import { settings, update } from './store.js';
import { openLast, openProfile } from './windows.js';

/**
 * The icon in the tray (menu bar on macOS): open lilOS, the servers, open in the browser, start
 * with the computer, quit (which stops the local kernel). In kiosk mode only "Open".
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

function menu() {
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
    items.push({
      label: t('tray.autostart'), type: 'checkbox', checked: s.startAtLogin,
      click: item => { update(d => { d.startAtLogin = item.checked; }); setAutostart(item.checked); refreshTray(); },
    });
    items.push({ type: 'separator' });
    items.push({ label: t('tray.quit'), click: () => onQuit?.() });
  }
  return Menu.buildFromTemplate(items);
}

export function createTray(quit) {
  onQuit = quit;
  tray = new Tray(icon());
  tray.setToolTip('lilOS');
  tray.on('click', () => openLast());
  refreshTray();
  local.on('status', refreshTray);
}

export function refreshTray() {
  if (!tray || tray.isDestroyed()) return;
  tray.setContextMenu(menu());
  tray.setToolTip(unread ? t('tray.tooltipUnread', { count: unread }) : 'lilOS');
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
