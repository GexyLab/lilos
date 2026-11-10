import { BrowserWindow, desktopCapturer, dialog, ipcMain, systemPreferences } from 'electron';
import { t } from './i18n.js';
import { originOf, profileOf, profileUrl } from './windows.js';
import { settings, update } from './store.js';

/**
 * Permissions of Chromium in the windows of lilOS, and the devices pages ask for.
 *
 * lilOS decides which app may use what (its permissions, its dialogs): the program grants the page
 * of a lilOS window what lilOS can ask for and denies the rest. Devices (serial, USB, HID,
 * Bluetooth) and what to share of the screen are picked by lilOS: the program passes the list to
 * the page ('choose' event) and gets the answer (devices.choose); a page that does not listen to
 * 'choose' (an older lilOS) gets the program's own simple dialog.
 *
 * settings.hardware: 'ask' (devices only after being picked), 'declared' / 'all' (every device
 * connected is already allowed: the page lists them all without asking; lilOS then lets only the
 * apps with the permission, or all, use them).
 */
const GRANTED = new Set([
  'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'pointerLock', 'keyboardLock',
  'media', 'midi', 'midiSysex', 'window-management', 'display-capture', 'speaker-selection', 'geolocation',
]);
/** What a server that is not trusted gets: no devices, camera, microphone, screen or position. */
const GRANTED_UNTRUSTED = new Set(['notifications', 'clipboard-sanitized-write', 'fullscreen', 'pointerLock']);
const trustedContents = contents => {
  const p = contents && profileOf(contents);
  return !!p && (p.kind === 'local' || !!p.trusted);
};
const allowed = (contents, permission) => (trustedContents(contents) ? GRANTED : GRANTED_UNTRUSTED).has(permission);
const DEVICE_KINDS = new Set(['serial', 'usb', 'hid', 'bluetooth']);

const listening = new Map();   // webContents id → Set of event names the page listens to
const pending = new Map();     // request id → { contents, callback, devices, kind }
let nextId = 1;

ipcMain.on('lilos-host:listen', (e, name, count) => {
  if (!listening.has(e.sender.id)) listening.set(e.sender.id, new Set());
  if (count > 0) listening.get(e.sender.id).add(name);
  else listening.get(e.sender.id).delete(name);
});

export const pageListens = (contents, name) => !!listening.get(contents.id)?.has(name);

/** The top webContents of a lilOS window (for an iframe's request: its window). */
function lilosContents(contents) {
  return contents && profileOf(contents) ? contents : null;
}

/** Devices allowed in 'ask' mode: those picked once, by kind and vendor/product/serial. */
const num = v => (typeof v === 'string' ? Number.parseInt(v, 16) : v) ?? '';
// Serial ports give vendor and product as hex strings, the others as numbers
const deviceKey = (kind, d) => `${kind}:${num(d.vendorId)}:${num(d.productId)}:${d.serialNumber ?? d.displayName ?? d.name ?? ''}`;

function remember(kind, device) {
  if (!device) return;
  const key = deviceKey(kind, device);
  update(s => {
    s.devices = Array.isArray(s.devices) ? s.devices : [];
    if (!s.devices.includes(key)) s.devices.push(key);
  });
}

/** The page answered which device (null: none). */
export function choose(contents, id, deviceId) {
  const req = pending.get(Number(id));
  if (!req || req.contents !== contents) throw new Error('Richiesta sconosciuta o già chiusa');
  pending.delete(Number(id));
  const device = req.devices.find(d => d.id === deviceId) ?? null;
  if (device) remember(req.kind, device.raw);
  req.callback(device ? device.value : null);
}

/** Asks the page (or the program's dialog) to pick one of `devices` ({ id, name, detail, value, raw }). */
function ask(contents, kind, devices, callback, { update: existing } = {}) {
  if (existing) {
    // Bluetooth finds devices little by little: the same request, a longer list
    existing.devices = devices;
    contents.send('lilos-host:event', 'choose', { id: existing.id, kind, devices: devices.map(({ id, name, detail, thumbnail }) => ({ id, name, detail, thumbnail })), update: true });
    return existing;
  }
  const id = nextId++;
  const req = { id, contents, kind, devices, callback };
  pending.set(id, req);
  if (pageListens(contents, 'choose')) {
    contents.send('lilos-host:event', 'choose', { id, kind, devices: devices.map(({ id: did, name, detail, thumbnail }) => ({ id: did, name, detail, thumbnail })) });
  } else {
    fallbackDialog(contents, req);
  }
  return req;
}

async function fallbackDialog(contents, req) {
  const win = BrowserWindow.fromWebContents(contents);
  const buttons = [...req.devices.map(d => (d.detail ? `${d.name} (${d.detail})` : d.name)), t('common.cancel')];
  const { response } = await dialog.showMessageBox(win, {
    type: 'question', buttons, cancelId: buttons.length - 1, noLink: true,
    message: t(`devices.choose.${req.kind}`), detail: req.devices.length ? '' : t('devices.none'),
  });
  if (!pending.has(req.id)) return;
  choose(contents, req.id, req.devices[response]?.id ?? null);
}

const hex = n => (typeof n === 'number' ? n.toString(16).padStart(4, '0') : null);
const ids = (v, p) => (hex(v) && hex(p) ? `${hex(v)}:${hex(p)}` : '');

const ready = new WeakSet();

export function setupSession(ses) {
  if (ready.has(ses)) return;
  ready.add(ses);
  ses.setPermissionRequestHandler((contents, permission, callback, details) => {
    if (!lilosContents(contents)) return callback(false);
    if (!allowed(contents, permission)) return callback(false);
    if (permission === 'media' && process.platform === 'darwin') {
      // macOS asks once for the whole program; then Chromium's own request goes on
      const kinds = details.mediaTypes ?? [];
      Promise.all(kinds.map(k => systemPreferences.askForMediaAccess(k === 'video' ? 'camera' : 'microphone')))
        .then(ok => callback(ok.every(Boolean)), () => callback(false));
      return;
    }
    callback(allowed(contents, permission));
  });
  ses.setPermissionCheckHandler((contents, permission) => {
    if (!contents || !lilosContents(contents)) return false;
    return allowed(contents, permission) || (DEVICE_KINDS.has(permission) && trustedContents(contents));
  });
  ses.setDevicePermissionHandler(details => {
    if (!DEVICE_KINDS.has(details.deviceType)) return false;
    const contents = details.origin && [...BrowserWindow.getAllWindows()].map(w => w.webContents)
      .find(c => profileOf(c) && originOf(profileUrl(profileOf(c))) === details.origin);
    if (!contents || !trustedContents(contents)) return false;
    if (settings().hardware !== 'ask') return true;
    return (settings().devices ?? []).includes(deviceKey(details.deviceType, details.device));
  });

  ses.on('select-serial-port', (e, ports, contents, callback) => {
    e.preventDefault();
    if (!lilosContents(contents) || !trustedContents(contents)) return callback('');
    const devices = ports.map(p => ({
      id: p.portId, value: p.portId, raw: p,
      name: p.displayName || p.portName || p.portId, detail: [p.portName, ids(Number.parseInt(p.vendorId, 16), Number.parseInt(p.productId, 16))].filter(Boolean).join(' · '),
    }));
    ask(contents, 'serial', devices, value => callback(value ?? ''));
  });
  ses.on('select-hid-device', (e, details, callback) => {
    e.preventDefault();
    const contents = details.frame && lilosContents(webContentsOfFrame(details.frame));
    if (!contents || !trustedContents(contents)) return callback();
    const devices = details.deviceList.map(d => ({ id: d.deviceId, value: d.deviceId, raw: d, name: d.name || t('devices.unnamed'), detail: ids(d.vendorId, d.productId) }));
    ask(contents, 'hid', devices, value => callback(value ?? undefined));
  });
  ses.on('select-usb-device', (e, details, callback) => {
    e.preventDefault();
    const contents = details.frame && lilosContents(webContentsOfFrame(details.frame));
    if (!contents || !trustedContents(contents)) return callback();
    const devices = details.deviceList.map(d => ({ id: d.deviceId, value: d.deviceId, raw: d, name: d.productName || d.manufacturerName || t('devices.unnamed'), detail: [d.manufacturerName, ids(d.vendorId, d.productId)].filter(Boolean).join(' · ') }));
    ask(contents, 'usb', devices, value => callback(value ?? undefined));
  });

  ses.setDisplayMediaRequestHandler(async (request, callback) => {
    const contents = request.frame && lilosContents(webContentsOfFrame(request.frame));
    if (!contents || !trustedContents(contents)) return callback({});
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 } });
      const devices = sources.map(s => ({ id: s.id, value: s, raw: null, name: s.name, detail: s.id.startsWith('screen') ? t('devices.screen') : t('devices.window'), thumbnail: s.thumbnail.toDataURL() }));
      ask(contents, 'screen', devices, source => callback(source ? { video: source, ...(request.audioRequested && process.platform === 'win32' && { audio: 'loopback' }) } : {}));
    } catch {
      callback({});
    }
  });
}

/** Bluetooth: per window, the list grows while devices are found (the same request each time). */
export function setupBluetooth(contents) {
  let current = null;
  contents.on('select-bluetooth-device', (e, list, callback) => {
    e.preventDefault();
    // Only the pages of lilOS pick devices (a web page of NetWave gets a no at once: web.js)
    if (!lilosContents(contents)) return;
    const devices = list.map(d => ({ id: d.deviceId, value: d.deviceId, raw: { deviceId: d.deviceId }, name: d.deviceName || t('devices.unnamed'), detail: d.deviceId }));
    if (current && pending.has(current.id)) {
      current.callback = value => callback(value ?? '');
      ask(contents, 'bluetooth', devices, null, { update: current });
    } else {
      current = ask(contents, 'bluetooth', devices, value => callback(value ?? ''));
    }
  });
}

function webContentsOfFrame(frame) {
  let top = frame;
  while (top.parent) top = top.parent;
  return [...BrowserWindow.getAllWindows()].map(w => w.webContents).find(c => c.mainFrame === top) ?? null;
}

/** Requests of a window that closed are answered "none". */
export function forget(contents) {
  for (const [id, req] of pending) if (req.contents === contents) { pending.delete(id); req.callback(null); }
  listening.delete(contents.id);
}
