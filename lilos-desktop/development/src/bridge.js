import { BrowserWindow, app, ipcMain, screen, shell } from 'electron';
import { readFileSync } from 'node:fs';
import { release } from 'node:os';
import { setAutostart } from './autostart.js';
import { choose, pageListens } from './devices.js';
import { drives } from './drives.js';
import { exportToComputer, openOnComputer, openPath, pickFolder, reveal } from './files.js';
import { local } from './local/index.js';
import { runtimeVersions } from './runtime.js';
import { PUBLIC_KEYS, addProfile, checkSetting, publicSettings, settings, update } from './store.js';
import { setUnread } from './tray.js';
import { check as checkUpdates, install as installUpdate, schedule as scheduleUpdates } from './updates.js';
import { applyDisplay, lilosWindows, openProfile, originOf, profileOf, profileUrl } from './windows.js';

/**
 * Answers window.lilosHost (preload.cjs). Only the main frame of a lilOS window, at its server's
 * address, is answered. A server that is not this computer's and not trusted (profile.trusted)
 * gets only what cannot touch the computer without the user: no settings, no files opened on the
 * computer, no paths, no servers.
 */
const OPEN = new Set(['info', 'badge', 'focus', 'settings.get', 'window.displays', 'files.exportToComputer', 'devices.choose', 'updates.check']);
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * The kernel of this profile runs on this computer: the program's own lilOS, or a trusted one at
 * a loopback address (a lilOS installed by hand here). Only then paths of the computer make sense.
 */
export function onThisComputer(profile) {
  if (profile.kind === 'local') return true;
  try { return !!profile.trusted && LOOPBACK.has(new URL(profile.url).hostname); } catch { return false; }
}

/** What the program carries (credits.json), with the versions of this copy. */
const CREDITS = JSON.parse(readFileSync(new URL('./credits.json', import.meta.url), 'utf8'));
function credits() {
  const rt = runtimeVersions() ?? {};
  const pkg = id => { try { return JSON.parse(readFileSync(new URL(`../node_modules/${id}/package.json`, import.meta.url), 'utf8')).version; } catch { return null; } };
  const versions = {
    electron: process.versions.electron, chromium: process.versions.chrome, node: rt.node, git: rt.git,
    postgres: rt.postgres ? String(rt.postgres).split('-')[0] : null, 'embedded-postgres': rt.postgres ?? null, 'electron-updater': pkg('electron-updater'),
  };
  return CREDITS.map(c => ({ ...c, version: versions[c.id] ?? null }));
}

/** Sends an event to every lilOS window (to the pages that listen). */
export function broadcast(name, data) {
  for (const win of lilosWindows()) if (!win.webContents.isLoading()) win.webContents.send('lilos-host:event', name, data);
}

async function info(profile) {
  const gpu = await app.getGPUInfo('basic').catch(() => null);
  return {
    program: app.getVersion(),
    os: process.platform, osVersion: release(), arch: process.arch,
    electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node,
    runtime: runtimeVersions(),
    lilos: profile.kind === 'local' ? local.version : null,
    profile: { id: profile.id, name: profile.name, kind: profile.kind, trusted: profile.kind === 'local' || !!profile.trusted, thisComputer: onThisComputer(profile) },
    gpu: gpu?.gpuDevice?.map(d => ({ vendorId: d.vendorId, deviceId: d.deviceId, active: !!d.active, name: d.deviceString ?? null })) ?? [],
    credits: credits(),
  };
}

function displays() {
  const primary = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((d, i) => ({
    id: d.id, label: d.label || `${i + 1}`, primary: d.id === primary,
    width: d.size.width, height: d.size.height, scale: d.scaleFactor,
  }));
}

function setSetting(key, value) {
  const clean = checkSetting(key, value);
  // In the Linux session «lilOS» (--session) lilOS is the desktop: out of the kiosk is out of the session
  if (key === 'display' && clean !== 'kiosk' && process.argv.includes('--session')) {
    app.quit();
    return publicSettings();
  }
  update(d => { d[key] = clean; });
  if (key === 'display' || key === 'monitor' || key === 'kioskKeys') for (const w of lilosWindows()) applyDisplay(w);
  if (key === 'startAtLogin') setAutostart(clean);
  if (key === 'updates') scheduleUpdates();
  broadcast('settings', publicSettings());
  return publicSettings();
}

async function devicesList(contents) {
  const gpu = await app.getGPUInfo('complete').catch(() => null);
  const printers = await contents.getPrintersAsync().catch(() => []);
  drives.start();
  return {
    gpu: (gpu?.gpuDevice ?? []).map(d => ({ vendorId: d.vendorId, deviceId: d.deviceId, active: !!d.active, name: d.deviceString ?? gpu?.auxAttributes?.glRenderer ?? null, driver: d.driverVersion ?? null })),
    gpuFeatures: app.getGPUFeatureStatus(),
    printers: printers.map(p => ({ name: p.name, displayName: p.displayName || p.name, description: p.description || '', default: !!p.isDefault || p.options?.['printer-is-default'] === 'true' })),
    displays: displays(),
    drives: drives.list,
  };
}

function serversList(current) {
  return settings().profiles.map(p => ({
    id: p.id, name: p.name, kind: p.kind, url: p.kind === 'local' ? local.url : p.url,
    trusted: p.kind === 'local' || !!p.trusted, current: p.id === current.id,
    ...(p.kind === 'local' && { status: local.status, version: local.version }),
  }));
}

export function checkServerUrl(url) {
  let u;
  try { u = new URL(String(url).trim()); } catch { throw new Error('Indirizzo non valido'); }
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname))) {
    throw new Error('Serve un indirizzo https:// (http:// solo per questo computer)');
  }
  return u.origin;
}

const HANDLERS = {
  info: (_c, profile) => info(profile),
  badge: (c, _p, count, overlay) => setUnread(count, BrowserWindow.fromWebContents(c), typeof overlay === 'string' && overlay.startsWith('data:image/png;base64,') ? overlay : null),
  focus: c => {
    const win = BrowserWindow.fromWebContents(c);
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  },
  // The answer leaves first; quitting stops the local kernel and its database (main.js)
  quit: () => { setTimeout(() => app.quit(), 100); },
  'settings.get': () => publicSettings(),
  'settings.set': (_c, _p, key, value) => setSetting(String(key), value),
  'window.setDisplay': (_c, _p, mode) => setSetting('display', mode),
  'window.displays': () => displays(),
  'files.openOnComputer': (c, _p, file) => openOnComputer(c, file ?? {}),
  'files.exportToComputer': (c, _p, files) => exportToComputer(c, files),
  'files.openPath': (_c, p, path) => (onThisComputer(p) ? openPath(path) : Promise.reject(new Error('Solo con lilOS su questo computer'))),
  'files.reveal': (_c, p, path) => (onThisComputer(p) ? reveal(path) : Promise.reject(new Error('Solo con lilOS su questo computer'))),
  'files.pickFolder': (c, p) => (onThisComputer(p) ? pickFolder(c) : null),
  'devices.list': c => devicesList(c),
  'devices.choose': (c, _p, id, deviceId) => choose(c, id, deviceId),
  'devices.eject': (_c, _p, id) => drives.eject(String(id)),
  'servers.list': (_c, p) => serversList(p),
  'servers.add': (_c, _p, server) => {
    const url = checkServerUrl(server?.url);
    const name = String(server?.name || new URL(url).host).slice(0, 80);
    const added = addProfile({ name, kind: 'remote', url, trusted: !!server?.trusted });
    return { id: added.id, name: added.name, url: added.url, trusted: added.trusted };
  },
  'servers.remove': (_c, p, id) => {
    const target = settings().profiles.find(x => x.id === id);
    if (!target || target.kind === 'local' || target.id === p.id) throw new Error('Questo server non si può togliere da qui');
    lilosWindows().find(w => profileOf(w.webContents)?.id === id)?.destroy();
    update(d => { d.profiles = d.profiles.filter(x => x.id !== id); });
  },
  'servers.open': (_c, _p, id) => {
    const target = settings().profiles.find(x => x.id === id);
    if (!target) throw new Error('Server sconosciuto');
    openProfile(target);
  },
  'local.status': () => ({ status: local.status, error: local.error, version: local.version, url: local.url, installed: local.installed }),
  'local.restart': () => local.restart(),
  'local.stop': () => local.stop(),
  'local.openInBrowser': () => (local.url ? shell.openExternal(local.url) : null),
  'updates.check': () => checkUpdates(),
  'updates.install': () => installUpdate(),
};

export function setupBridge() {
  ipcMain.handle('lilos-host', async (e, name, ...args) => {
    const contents = e.sender;
    const profile = profileOf(contents);
    if (!profile || e.senderFrame !== contents.mainFrame || originOf(e.senderFrame.url) !== originOf(profileUrl(profile))) {
      throw new Error('Richiesta non permessa');
    }
    const handler = Object.hasOwn(HANDLERS, name) ? HANDLERS[name] : null;
    if (!handler) throw new Error(`Funzione sconosciuta: ${name}`);
    const trusted = profile.kind === 'local' || !!profile.trusted;
    if (!trusted && !OPEN.has(name)) throw new Error('Non permesso per questo server: aggiungilo come server di fiducia');
    return handler(contents, profile, ...args);
  });

  // Removable drives are watched only while a page wants them
  ipcMain.on('lilos-host:listen', () => {
    const wanted = lilosWindows().some(w => pageListens(w.webContents, 'drives'));
    if (wanted) drives.start();
    else drives.stop();
  });
  drives.on('change', list => broadcast('drives', list));
}

export { PUBLIC_KEYS };
