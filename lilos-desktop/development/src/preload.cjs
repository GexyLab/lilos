const { contextBridge, ipcRenderer } = require('electron');

/**
 * window.lilosHost: what the page of lilOS can ask of the program (lilOS's SDK wraps it: host.js).
 * Only in the main frame (preloads do not run in iframes, where isolated apps live), and the
 * program answers only the main frame of the server it opened (bridge.js checks again).
 * Every call returns a Promise. Events: on(name, fn) → off.
 *   'choose'        { id, kind, devices: [{ id, name, detail }] }: a device to pick (answer with devices.choose)
 *   'drives'        [{ id, name, path, size }]: removable drives changed
 *   'file-changed'  { token, name, data: ArrayBuffer }: a file opened on the computer was saved there
 *   'settings'      the program's settings changed
 *   'display'       'window' | 'fullscreen' | 'kiosk': the window changed mode
 */
const call = (name, ...args) => ipcRenderer.invoke('lilos-host', name, ...args);
const listeners = new Map();

ipcRenderer.on('lilos-host:event', (_e, name, data) => {
  for (const fn of listeners.get(name) ?? []) {
    try { fn(data); } catch (err) { console.error(err); }
  }
});

function on(name, fn) {
  if (typeof fn !== 'function') throw new TypeError('fn deve essere una funzione');
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name).add(fn);
  // The program knows the page takes care of this event (e.g. picking devices with lilOS's dialog)
  ipcRenderer.send('lilos-host:listen', name, listeners.get(name).size);
  return () => {
    listeners.get(name)?.delete(fn);
    ipcRenderer.send('lilos-host:listen', name, listeners.get(name)?.size ?? 0);
  };
}

/**
 * The number on the taskbar icon on Windows is a small image (an overlay): drawn here, where the
 * page's canvas is at hand. Elsewhere the system draws it from the number.
 */
function overlay(count) {
  if (process.platform !== 'win32' || !count) return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const g = canvas.getContext('2d');
  g.fillStyle = '#e5484d';
  g.beginPath();
  g.arc(16, 16, 16, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fff';
  g.font = `bold ${count > 9 ? 17 : 21}px "Segoe UI", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(count > 99 ? '99+' : String(count), 16, 17);
  return canvas.toDataURL('image/png');
}

/**
 * The program's own pages (first start, status while lilOS starts or when it cannot be reached)
 * are local files: they get window.lilosShell instead, never lilosHost.
 */
if (location.protocol === 'file:') {
  ipcRenderer.on('lilos-shell:event', (_e, name, data) => {
    for (const fn of listeners.get(name) ?? []) {
      try { fn(data); } catch (err) { console.error(err); }
    }
  });
  contextBridge.exposeInMainWorld('lilosShell', Object.freeze({
    call: (name, ...args) => ipcRenderer.invoke('lilos-shell', name, ...args),
    on: (name, fn) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
      return () => listeners.get(name)?.delete(fn);
    },
  }));
} else contextBridge.exposeInMainWorld('lilosHost', Object.freeze({
  version: 1,
  on,
  info: () => call('info'),
  badge: count => call('badge', count, overlay(Number(count) || 0)),
  focus: () => call('focus'),
  quit: () => call('quit'),
  settings: Object.freeze({
    get: () => call('settings.get'),
    set: (key, value) => call('settings.set', key, value),
  }),
  window: Object.freeze({
    setDisplay: mode => call('window.setDisplay', mode),
    displays: () => call('window.displays'),
  }),
  files: Object.freeze({
    openOnComputer: file => call('files.openOnComputer', file),
    exportToComputer: files => call('files.exportToComputer', files),
    openPath: path => call('files.openPath', path),
    reveal: path => call('files.reveal', path),
    pickFolder: () => call('files.pickFolder'),
  }),
  devices: Object.freeze({
    list: () => call('devices.list'),
    choose: (id, deviceId) => call('devices.choose', id, deviceId ?? null),
    eject: id => call('devices.eject', id),
  }),
  servers: Object.freeze({
    list: () => call('servers.list'),
    add: server => call('servers.add', server),
    remove: id => call('servers.remove', id),
    open: id => call('servers.open', id),
  }),
  local: Object.freeze({
    status: () => call('local.status'),
    restart: () => call('local.restart'),
    stop: () => call('local.stop'),
    openInBrowser: () => call('local.openInBrowser'),
  }),
  updates: Object.freeze({
    check: () => call('updates.check'),
    install: () => call('updates.install'),
  }),
}));
