import { bus, fs, host, kernel, locale, messageBox, net, notifications, pipes, serial, storage } from '@lilos/sdk';
import { launch } from '../apps/registry.js';
import { openFile } from '../apps/open.js';
import { runAction, senderOf } from '../notifications/card.js';
import { notify } from '../notifications/notify.js';

/**
 * lilOS inside the program lilOS (lilos-desktop): what the program asks of the page, and what the
 * page tells it. Nothing happens in a browser.
 *   - the number of unread notifications on the program's icon (taskbar, dock, tray)
 *   - notifications become the system's while the window is not in front (program setting)
 *   - devices (serial, USB, HID, Bluetooth) and what of the screen to share: picked here
 *   - lilos://open?path=… opens that file or folder; the program's menu opens the Computer tab
 *   - a file opened on the computer and saved there: said once it is back in lilOS
 *   - USB sticks and memory cards (a kernel on this computer, administrators): a connection of
 *     Rete › Questo computer (netfs-local) while they are in, removed when they go
 */
const { t } = locale.define('lilos:desktop', {
  en: { strings: {
    'choose.serial': 'Choose a serial port', 'choose.usb': 'Choose a USB device', 'choose.hid': 'Choose a device',
    'choose.bluetooth': 'Choose a Bluetooth device', 'choose.screen': 'Choose what to share',
    'choose.text.serial': 'An app wants to use a serial port of the computer.',
    'choose.text.usb': 'An app wants to use a USB device of the computer.',
    'choose.text.hid': 'An app wants to use a device of the computer (keypads, readers, controllers…).',
    'choose.text.bluetooth': 'An app wants to use a Bluetooth device near the computer.',
    'choose.text.screen': 'An app wants to see a screen or a window of the computer.',
    'choose.field': 'Device', 'choose.none': 'No device found: connect it and try again.',
    connect: 'Connect', share: 'Share',
    saved: '«{name}» saved from the computer\'s program', saveFailed: '«{name}» not saved back in lilOS: {error}',
    missing: '«{path}» is not in lilOS',
    driveIn: '«{name}» is in Network › This computer', driveFailed: '«{name}» not connected: {error}',
  } },
  it: { strings: {
    'choose.serial': 'Scegli una porta seriale', 'choose.usb': 'Scegli un dispositivo USB', 'choose.hid': 'Scegli un dispositivo',
    'choose.bluetooth': 'Scegli un dispositivo Bluetooth', 'choose.screen': 'Scegli cosa condividere',
    'choose.text.serial': 'Un\'app vuole usare una porta seriale del computer.',
    'choose.text.usb': 'Un\'app vuole usare un dispositivo USB del computer.',
    'choose.text.hid': 'Un\'app vuole usare un dispositivo del computer (tastierini, lettori, controller…).',
    'choose.text.bluetooth': 'Un\'app vuole usare un dispositivo Bluetooth vicino al computer.',
    'choose.text.screen': 'Un\'app vuole vedere uno schermo o una finestra del computer.',
    'choose.field': 'Dispositivo', 'choose.none': 'Nessun dispositivo trovato: collegalo e riprova.',
    connect: 'Collega', share: 'Condividi',
    saved: '«{name}» salvato dal programma del computer', saveFailed: '«{name}» non risalvato in lilOS: {error}',
    missing: '«{path}» non c\'è in lilOS',
    driveIn: '«{name}» è in Rete › Questo computer', driveFailed: '«{name}» non collegata: {error}',
  } },
});

const BLUETOOTH_SCAN_MS = 2500;
let rule = 'declared';

/**
 * Which apps use the computer's devices (the program's rule, Control Panel → Computer → Hardware):
 * 'ask' and 'declared' only those with the permission (serial…), 'all' every app. In a browser
 * 'declared'.
 */
export const hardwareRule = () => (host.native ? rule : 'declared');

export function connectDesktop({ wm }) {
  if (!host.native) return;
  document.documentElement.classList.add('in-program');

  // The number on the icon follows the unread notifications
  const badge = () => host.badge(notifications.unread);
  notifications.on('change', badge);
  notifications.on('new', badge);
  badge();

  // In the system's notification center while the window is not the one in front
  let systemNotifications = true;
  const take = s => { systemNotifications = s.notifications !== false; rule = s.hardware ?? 'declared'; };
  host.settings.get().then(take, () => {});
  host.on('settings', take);
  notifications.on('new', n => {
    if (!systemNotifications || document.hasFocus() || typeof Notification === 'undefined') return;
    const shown = new Notification(senderOf(n).name, { body: n.text, tag: n.id, silent: n.level === 'info' });
    shown.onclick = () => {
      host.focus();
      notifications.markRead([n.id]).catch(() => {});
      runAction(n);
    };
  });

  host.on('choose', request => choose(wm, request));
  host.on('open', ({ path } = {}) => openPath(path));
  host.on('open-settings', tab => launch('settings', { tab: typeof tab === 'string' ? tab : 'computer' }));
  host.on('saved', ({ name }) => notify(t('saved', { name }), { level: 'success' }));
  host.on('save-failed', ({ name, error }) => notify(t('saveFailed', { name, error }), { level: 'error' }));
  connectDrives().catch(err => console.warn('[lilos] unità rimovibili:', err.message));
  connectDeviceEvents();
}

/**
 * device.attach / device.detach in the pipes (Automata, Pianificazione): drives from the program,
 * serial ports from the page (the ports it may see: all of them unless the rule is 'ask').
 */
function connectDeviceEvents() {
  // The drives already there are the start (the program says only what changes)
  let drives = new Map();
  let changed = false;
  host.devices.list().then(d => { if (!changed) drives = new Map((d.drives ?? []).map(x => [x.id, x])); }, () => {});
  host.on('drives', list => {
    changed = true;
    const now = new Map((Array.isArray(list) ? list : []).map(d => [d.id, d]));
    for (const [id, d] of now) if (!drives.has(id)) pipes.notify('device.attach', { kind: 'drive', id, name: d.name, path: d.path });
    for (const [id, d] of drives) if (!now.has(id)) pipes.notify('device.detach', { kind: 'drive', id, name: d.name });
    drives = now;
  });
  if (!serial.supported) return;
  let ports = null;
  const name = p => (p.usbVendorId != null ? `USB ${p.usbVendorId.toString(16).padStart(4, '0')}:${(p.usbProductId ?? 0).toString(16).padStart(4, '0')}` : 'Porta seriale');
  const check = async () => {
    const now = new Map((await serial.ports().catch(() => [])).map(p => [p.id, p]));
    if (ports) {
      for (const [id, p] of now) if (!ports.has(id)) pipes.notify('device.attach', { kind: 'serial', id, name: name(p) });
      for (const [id, p] of ports) if (!now.has(id)) pipes.notify('device.detach', { kind: 'serial', id, name: name(p) });
    }
    ports = now;
  };
  serial.on('change', check);
  check();
}

const DRIVES_KEY = 'desktop-drives';   // drive id → id of the connection made for it

/**
 * Removable drives as connections of netfs-local: only with a kernel on this computer (it sees
 * the same drives), for whoever may connect any folder (administrators, one user).
 */
async function connectDrives() {
  const info = await host.info();
  if (!info.profile?.thisComputer || (kernel.user && kernel.user.role !== 'admin')) return;
  await net.load();
  if (!net.protocols.some(p => p.id === 'local')) return;
  let busy = Promise.resolve();
  const sync = drives => { busy = busy.then(() => syncDrives(Array.isArray(drives) ? drives : [])).catch(() => {}); };
  host.on('drives', sync);
  sync((await host.devices.list()).drives);
}

async function syncDrives(drives) {
  const made = { ...(storage.get(DRIVES_KEY, {}) ?? {}) };
  const mounts = new Set(net.mounts().map(m => m.id));
  for (const drive of drives) {
    if (made[drive.id] && mounts.has(made[drive.id])) continue;
    try {
      const mount = await net.create({ name: drive.name, protocol: 'local', values: { folder: drive.path, readOnly: false }, auto: true, remember: true });
      made[drive.id] = mount.id;
      await net.connect(mount.id);
      notify(t('driveIn', { name: drive.name }), { level: 'success' });
    } catch (err) {
      notify(t('driveFailed', { name: drive.name, error: err.message }), { level: 'warning' });
    }
  }
  const present = new Set(drives.map(d => d.id));
  for (const [driveId, mountId] of Object.entries(made)) {
    if (present.has(driveId)) continue;
    delete made[driveId];
    if (mounts.has(mountId)) await net.remove(mountId).catch(() => {});
  }
  storage.set(DRIVES_KEY, made);
}

function openPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) return;
  const id = fs.resolve(path);
  const node = id && fs.get(id);
  if (!node) return notify(t('missing', { path }), { level: 'warning' });
  host.focus();
  if (node.type === 'file') openFile(node);
  else bus.emit('item:open', node);
}

/** Bluetooth requests grow while devices are found: the latest list of each, and its box. */
const open = new Map();

function choose(wm, request) {
  const { id, kind, devices } = request;
  if (request.update) {
    const box = open.get(id);
    if (box) box.devices = devices;
    return;
  }
  const state = { devices };
  open.set(id, state);
  // Bluetooth: a moment to find what is around before asking
  const wait = kind === 'bluetooth' && !devices.length ? new Promise(r => setTimeout(r, BLUETOOTH_SCAN_MS)) : Promise.resolve();
  wait.then(async () => {
    const list = state.devices;
    const fields = list.length ? [{
      name: 'device', type: 'select', label: t('choose.field'), value: list[0].id,
      options: list.map(d => ({ value: d.id, label: d.detail ? `${d.name} — ${d.detail}` : d.name })),
    }] : null;
    const answer = await messageBox(wm?.active ?? null, {
      icon: 'info', title: t(`choose.${kind}`) || t('choose.hid'),
      text: `${t(`choose.text.${kind}`)}${list.length ? '' : `\n\n${t('choose.none')}`}`,
      fields,
      buttons: list.length ? ['cancel', { value: 'ok', label: kind === 'screen' ? t('share') : t('connect'), primary: true }] : ['cancel'],
    });
    open.delete(id);
    const picked = answer && typeof answer === 'object' && answer.button === 'ok' ? answer.values.device : null;
    host.devices.choose(id, picked).catch(() => {});
  });
}
