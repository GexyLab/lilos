import { BrowserWindow, ipcMain, shell } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkServerUrl } from './bridge.js';
import { language, t, texts } from './i18n.js';
import { findInstalled } from './local/detect.js';
import { local } from './local/index.js';
import { LOG_DIR, bundledRelease, hasRuntime } from './runtime.js';
import { addProfile, localProfile, profile as findProfile, settings } from './store.js';
import { PRELOAD, load, openProfile, signIn, windowOf } from './windows.js';

/**
 * The program's own pages, local files with window.lilosShell (preload.cjs):
 *   pages/welcome.html   the first start (where lilOS runs: here, a server, one already installed),
 *                        also to add a server later
 *   pages/status.html    in a lilOS window while the local lilOS starts, or when it fails or the
 *                        server cannot be reached
 */
const PAGES = join(dirname(fileURLToPath(import.meta.url)), 'pages');
const PAGES_URL = pathToFileURL(PAGES).href;
const USERNAME = /^[a-z0-9._-]{2,32}$/;
const lines = [];
let welcome = null;

local.on('progress', line => {
  lines.push(line);
  lines.splice(0, Math.max(0, lines.length - 40));
  sendToPages('progress', line);
});
local.on('status', status => sendToPages('status', { status, error: local.error }));

function sendToPages(name, data) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && win.webContents.getURL().startsWith(PAGES_URL)) win.webContents.send('lilos-shell:event', name, data);
  }
}

export function openWelcome({ add = false } = {}) {
  if (welcome && !welcome.isDestroyed()) {
    welcome.focus();
    return welcome;
  }
  welcome = new BrowserWindow({
    width: 760, height: 600, minWidth: 600, minHeight: 520, resizable: true, show: false,
    title: 'lilOS', backgroundColor: '#ffffff', autoHideMenuBar: true,
    webPreferences: { preload: PRELOAD, sandbox: true, contextIsolation: true, nodeIntegration: false, spellcheck: false },
  });
  welcome.setMenuBarVisibility(false);
  welcome.once('ready-to-show', () => welcome.show());
  welcome.on('closed', () => { welcome = null; });
  welcome.webContents.on('will-navigate', e => e.preventDefault());
  welcome.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  welcome.loadFile(join(PAGES, 'welcome.html'), { query: { lang: language(), add: add ? '1' : '' } });
  return welcome;
}

const done = profile => {
  openProfile(profile);
  welcome?.destroy();
};

const HANDLERS = {
  texts: (_w, prefix) => ({ ...texts('common'), ...texts(String(prefix)) }),

  'welcome.detect': async () => ({
    runtime: hasRuntime(),
    release: bundledRelease(),
    localExists: !!localProfile(),
    dataDir: dirname(LOG_DIR),
    installed: await findInstalled().catch(() => []),
    profiles: settings().profiles.length,
  }),

  'welcome.local': async (_w, { username, password } = {}) => {
    if (!hasRuntime()) throw new Error(t('welcome.error.noRuntime'));
    if (!USERNAME.test(String(username ?? ''))) throw new Error(t('welcome.error.username'));
    if (typeof password !== 'string' || password.length < 8 || password.length > 256) throw new Error(t('welcome.error.password'));
    if (localProfile()) return done(localProfile());
    await local.setup({ username, password });
    const profile = addProfile({ name: t('profile.local'), kind: 'local', url: null, trusted: true });
    // Signed in already with the user just made
    await signIn(profile, { username, password });
    done(profile);
  },

  'welcome.remote': async (_w, { url, trusted } = {}) => {
    const origin = checkServerUrl(url);
    const res = await fetch(`${origin}/api/session`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    const body = res?.ok ? await res.json().catch(() => null) : null;
    if (!body || (body.mode !== 'multi' && body.mode !== 'single')) throw new Error(t('welcome.error.notLilos', { url: origin }));
    const existing = settings().profiles.find(p => p.kind === 'remote' && p.url === origin);
    done(existing ?? addProfile({ name: new URL(origin).host, kind: 'remote', url: origin, trusted: !!trusted }));
  },

  'welcome.existing': async (_w, { url } = {}) => {
    const origin = checkServerUrl(url);
    const existing = settings().profiles.find(p => p.kind === 'remote' && p.url === origin);
    done(existing ?? addProfile({ name: t('profile.installed', { port: new URL(origin).port || '80' }), kind: 'remote', url: origin, trusted: true }));
  },

  'status.info': (_w, id) => {
    const p = findProfile(id);
    return { profile: p && { id: p.id, name: p.name, kind: p.kind, url: p.url }, status: local.status, error: local.error, lines };
  },
  'status.retry': async (_w, id) => {
    const p = findProfile(id);
    const win = p && windowOf(p.id);
    if (!win) return;
    if (p.kind === 'local' && local.status === 'failed') await local.restart().catch(() => {});
    load(win, p);
  },
  'status.logs': () => shell.openPath(LOG_DIR),
  'status.servers': () => openWelcome({ add: true }),
};

export function setupPages() {
  ipcMain.handle('lilos-shell', async (e, name, ...args) => {
    if (!e.senderFrame?.url.startsWith(PAGES_URL)) throw new Error('Richiesta non permessa');
    const handler = Object.hasOwn(HANDLERS, name) ? HANDLERS[name] : null;
    if (!handler) throw new Error(`Funzione sconosciuta: ${name}`);
    return handler(BrowserWindow.fromWebContents(e.sender), ...args);
  });
}

