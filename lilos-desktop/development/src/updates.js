import { Notification, app, shell } from 'electron';
import updater from 'electron-updater';
import { t } from './i18n.js';
import { settings } from './store.js';

/**
 * Updates of the program (not of lilOS: lilOS updates itself from the AppStore). From the latest
 * release of GitHub of the official repository (GexyLab/lilos-plugins-official, public: the
 * installers built at «pubblica release»; GexyLab/lilos is private), where latest.yml says the
 * version.
 *   auto    downloaded in the background, installed when the program quits (Windows, Linux)
 *   notify  a notification with the new version: the page of the release opens in the browser
 *   off     nothing
 * On macOS the program is not signed: the system does not let it replace itself, so always notify.
 */
const FEED = 'https://github.com/GexyLab/lilos-plugins-official/releases/latest/download';
const RELEASES = 'https://github.com/GexyLab/lilos-plugins-official/releases/latest';
const EVERY_MS = 6 * 3600_000;
const { autoUpdater } = updater;

let state = { status: 'idle', version: null, error: null };
let timer = null;

const mode = () => (process.platform === 'darwin' && settings().updates === 'auto' ? 'notify' : settings().updates);

function notify(title, body, onClick) {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body });
  if (onClick) n.on('click', onClick);
  n.show();
}

export function setupUpdates() {
  if (!app.isPackaged) return;
  autoUpdater.setFeedURL({ provider: 'generic', url: FEED });
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = null;
  autoUpdater.on('update-available', info => {
    state = { status: 'available', version: info.version, error: null };
    if (mode() === 'notify') notify(t('updates.available.title', { version: info.version }), t('updates.available.body'), () => shell.openExternal(RELEASES));
  });
  autoUpdater.on('update-not-available', () => { state = { status: 'current', version: app.getVersion(), error: null }; });
  autoUpdater.on('update-downloaded', info => {
    state = { status: 'downloaded', version: info.version, error: null };
    notify(t('updates.ready.title', { version: info.version }), t('updates.ready.body'));
  });
  autoUpdater.on('error', err => { state = { status: 'error', version: null, error: err.message }; });
  schedule();
}

export function schedule() {
  clearInterval(timer);
  if (!app.isPackaged || mode() === 'off') return;
  const check = () => check0().catch(() => {});
  setTimeout(check, 30_000);
  timer = setInterval(check, EVERY_MS);
}

async function check0() {
  autoUpdater.autoDownload = mode() === 'auto';
  state = { ...state, status: 'checking' };
  await autoUpdater.checkForUpdates();
}

/** Checks now: { status: 'current' | 'available' | 'downloaded' | 'error' | 'dev', version, error }. */
export async function check() {
  if (!app.isPackaged) return { status: 'dev', version: app.getVersion(), error: null };
  try {
    await check0();
  } catch (err) {
    state = { status: 'error', version: null, error: err.message };
  }
  return state;
}

/** Installs what was downloaded (the program restarts), or opens the release page. */
export function install() {
  if (state.status === 'downloaded') autoUpdater.quitAndInstall();
  else shell.openExternal(RELEASES);
}
