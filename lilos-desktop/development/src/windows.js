import { BrowserWindow, app, dialog, screen, session, shell } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { language, t } from './i18n.js';
import { automaticSetup } from './installFile.js';
import { local } from './local/index.js';
import { profile as findProfile, noUi, settings, update } from './store.js';

/**
 * The windows of lilOS, one per server (profile), each with its own session (cookies, storage):
 * persist:p-<profile id>. The page comes from the server's own address, so lilOS works as in a
 * browser; the program adds the bridge (preload.cjs) and keeps the window to that server: other
 * sites open in the system's browser.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const PRELOAD = join(HERE, 'preload.cjs');
const STATUS_PAGE = join(HERE, 'pages', 'status.html');
const BACKGROUND = '#1f2227';

const windows = new Map();     // profile id → BrowserWindow
const owners = new Map();      // webContents id → profile id

/** The program is quitting: windows close for real. */
let quitting = false;
export const setQuitting = () => { quitting = true; };

export const lilosWindows = () => [...windows.values()].filter(w => !w.isDestroyed());

/** The profile whose lilOS window holds these webContents (null: not one of them). */
export function profileOf(contents) {
  const id = owners.get(contents.id);
  return id ? findProfile(id) : null;
}

/** The window of a profile, if open. */
export const windowOf = id => windows.get(id) ?? null;

/** The address lilOS is at for this profile (the local one: its kernel's port, which can change). */
export function profileUrl(profile) {
  return profile.kind === 'local' ? local.url : profile.url;
}

export const originOf = url => { try { return new URL(url).origin; } catch { return null; } };

function initialBounds() {
  const saved = settings().bounds;
  const area = screen.getPrimaryDisplay().workArea;
  if (saved && screen.getAllDisplays().some(d => {
    const a = d.workArea;
    return saved.x < a.x + a.width && saved.x + saved.width > a.x && saved.y < a.y + a.height && saved.y + saved.height > a.y;
  })) return saved;
  const width = Math.min(1440, Math.round(area.width * 0.9)), height = Math.min(900, Math.round(area.height * 0.9));
  return { x: area.x + Math.round((area.width - width) / 2), y: area.y + Math.round((area.height - height) / 2), width, height };
}

/** The display the window goes to in full screen (the chosen one, else the one it is on). */
function targetDisplay(win) {
  const id = settings().monitor;
  return screen.getAllDisplays().find(d => d.id === id) ?? screen.getDisplayMatching(win.getBounds());
}

/** Window, full screen or kiosk, as in the settings. */
export function applyDisplay(win, mode = settings().display) {
  if (win.isDestroyed()) return;
  if (mode !== 'window') {
    const { bounds } = targetDisplay(win);
    if (!win.isFullScreen()) win.setBounds(bounds);
  }
  win.setKiosk(mode === 'kiosk');
  win.setFullScreen(mode !== 'window');
  win.setMenuBarVisibility(false);
  if (mode !== 'window' && settings().kioskKeys) lockKeys(win);
  win.webContents.send('lilos-host:event', 'display', mode);
}

/**
 * The Windows key, Alt+Tab, Esc… to lilOS: the Keyboard Lock of Chromium, which works only while
 * the page itself is in full screen (requestFullscreen, allowed here as if after a click).
 */
function lockKeys(win) {
  const code = `(async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      await navigator.keyboard?.lock?.();
    } catch {}
  })()`;
  win.webContents.executeJavaScript(code, true).catch(() => {});
}

function showStatus(win, profile, state) {
  const query = { profile: profile.id, lang: language(), state };
  return win.loadFile(STATUS_PAGE, { query }).catch(() => {});
}

/**
 * Loads lilOS in the window (the local one is started first; installed first when the
 * installation settings let the program do it by itself, and the window signed in already).
 */
export async function load(win, profile) {
  if (profile.kind === 'local' && local.status !== 'running') {
    await showStatus(win, profile, 'starting');
    try {
      const auto = !local.installed && automaticSetup();
      if (auto?.kind === 'local' && !auto.noUi) {
        await local.setup(auto.admin ?? {});
        if (auto.admin) await signIn(profile, auto.admin);
      } else {
        await local.start();
      }
    } catch {
      return showStatus(win, profile, 'failed');
    }
  }
  const url = profileUrl(profile);
  if (!url) return showStatus(win, profile, 'failed');
  return win.loadURL(url).catch(() => {});
}

/** The window of the profile signed in as `username` (its session cookie in the profile's session). */
export async function signIn(profile, { username, password }) {
  await session.fromPartition(`persist:p-${profile.id}`).fetch(`${local.url}/api/session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lilos': '1' },
    body: JSON.stringify({ username, password }), credentials: 'include',
  }).catch(() => null);
}

/** Opens (or brings forward) the window of a profile; none for the local one without UI (noui.js). */
export function openProfile(profile) {
  if (profile.kind === 'local' && noUi()) return null;
  let win = windows.get(profile.id);
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    return win;
  }
  const s = settings();
  win = new BrowserWindow({
    ...initialBounds(),
    minWidth: 640, minHeight: 420,
    show: false,
    title: t('window.title', { name: profile.name }),
    backgroundColor: BACKGROUND,
    autoHideMenuBar: true,
    icon: process.platform === 'linux' ? join(HERE, 'assets', 'icon.png') : undefined,
    webPreferences: {
      preload: PRELOAD,
      partition: `persist:p-${profile.id}`,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
      spellcheck: false,
      devTools: !app.isPackaged || process.env.LILOS_DEVTOOLS === '1',
      backgroundThrottling: false,
    },
  });
  // Kept here: once the window is closed, reading win.webContents throws (Object has been destroyed)
  const contentsId = win.webContents.id;
  windows.set(profile.id, win);
  owners.set(contentsId, profile.id);
  update(d => { d.last = profile.id; });

  win.on('page-title-updated', e => e.preventDefault());
  win.once('ready-to-show', () => {
    win.show();
    applyDisplay(win, s.display);
  });
  // Full screen again after the page left it (Esc held long), when that is the chosen mode
  win.webContents.on('leave-html-full-screen', () => {
    const mode = settings().display;
    if (mode !== 'window') setTimeout(() => applyDisplay(win, mode), 200);
  });
  let saveTimer = null;
  const saveBounds = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!win.isDestroyed() && !win.isFullScreen() && !win.isMaximized() && !win.isMinimized()) update(d => { d.bounds = win.getBounds(); });
    }, 600);
  };
  win.on('resize', saveBounds);
  win.on('move', saveBounds);
  win.on('close', e => {
    if (quitting) return;
    if (settings().display === 'kiosk') return e.preventDefault();
    // The last window closed: the program stays in the tray (with the kernel), or quits
    if (settings().stayInTray && lilosWindows().length === 1) {
      e.preventDefault();
      win.hide();
    }
  });
  win.on('closed', () => {
    windows.delete(profile.id);
    owners.delete(contentsId);
    if (!quitting && !settings().stayInTray && lilosWindows().length === 0) app.quit();
  });

  guard(win, profile);
  shortcuts(win);
  load(win, profile);
  return win;
}

/** Keys of the program: F11 (full screen in and out, not in kiosk); the developer tools in development. */
function shortcuts(win) {
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' && !input.control && !input.alt && !input.meta && settings().display !== 'kiosk') {
      e.preventDefault();
      const mode = win.isFullScreen() ? 'window' : 'fullscreen';
      update(d => { d.display = mode; });
      applyDisplay(win, mode);
    }
    if (!app.isPackaged && input.key === 'I' && input.control && input.shift) win.webContents.toggleDevTools();
  });
}

const EXTERNAL = new Set(['http:', 'https:', 'mailto:']);

function openExternal(url) {
  try {
    if (EXTERNAL.has(new URL(url).protocol)) shell.openExternal(url);
  } catch { /* not an address */ }
}

/**
 * The window stays on its server: other addresses go to the system's browser. Two kinds of new
 * windows stay inside the program, with the same session and no bridge: the sign-in windows of
 * lilOS (name lilos-signin-…: the provider's page, back to the kernel), and blank tabs that lilOS
 * fills right after with an address (those go to the browser as soon as they get it).
 */
function guard(win, profile) {
  const contents = win.webContents;
  const sameServer = url => originOf(url) === originOf(profileUrl(profile));
  const isStatusPage = url => url.startsWith('file:') && url.includes('/pages/status.html');

  contents.on('will-navigate', (e, url) => {
    if (sameServer(url) || isStatusPage(url)) return;
    e.preventDefault();
    openExternal(url);
  });
  contents.on('will-redirect', (e, url) => {
    if (!sameServer(url) && !isStatusPage(url)) e.preventDefault();
  });
  contents.on('did-fail-load', (_e, code, _desc, url, isMainFrame) => {
    // -3: stopped by a new navigation
    if (isMainFrame && code !== -3 && sameServer(url)) showStatus(win, profile, 'unreachable');
  });
  // lilOS asks to stay when changes are still on their way to the kernel: the program asks the user
  contents.on('will-prevent-unload', e => {
    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning', buttons: [t('unload.leave'), t('unload.stay')], defaultId: 1, cancelId: 1, noLink: true,
      message: t('unload.title'), detail: t('unload.text'),
    });
    if (choice === 0) e.preventDefault();
  });
  contents.on('render-process-gone', (_e, details) => {
    if (details.reason !== 'clean-exit') showStatus(win, profile, 'crashed');
  });

  contents.setWindowOpenHandler(({ url, frameName }) => {
    if (frameName.startsWith('lilos-signin-')) {
      return { action: 'allow', overrideBrowserWindowOptions: { width: 520, height: 700, autoHideMenuBar: true, parent: win, webPreferences: { preload: undefined, sandbox: true, contextIsolation: true, nodeIntegration: false, partition: `persist:p-${profile.id}` } } };
    }
    if (url === 'about:blank' || url === '') {
      return { action: 'allow', overrideBrowserWindowOptions: { show: false, webPreferences: { preload: undefined, sandbox: true, partition: `persist:p-${profile.id}` } } };
    }
    openExternal(url);
    return { action: 'deny' };
  });
  contents.on('did-create-window', (child, { frameName }) => {
    child.setMenuBarVisibility(false);
    if (frameName.startsWith('lilos-signin-')) return;
    // A blank tab: as soon as lilOS gives it an address, that goes to the browser and the tab closes
    child.webContents.on('will-navigate', (e, url) => { e.preventDefault(); openExternal(url); child.destroy(); });
    child.webContents.on('did-start-navigation', (e, url) => {
      if (url && url !== 'about:blank') { openExternal(url); setImmediate(() => !child.isDestroyed() && child.destroy()); }
    });
    setTimeout(() => !child.isDestroyed() && child.destroy(), 120_000);
  });
}

/** Shows the window of the last profile opened (or the first), creating it. */
export function openLast() {
  const s = settings();
  const p = findProfile(s.last) ?? s.profiles[0];
  return p ? openProfile(p) : null;
}

export { PRELOAD };
