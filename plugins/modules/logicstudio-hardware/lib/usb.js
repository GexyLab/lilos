import { argsOf, bytesFrom, bytesTo, hex4, int, oneOf, oops, usbId, withTimeout } from './common.js';
import { lib } from './native.js';
import { IS_LINUX } from './tools.js';

/**
 * USB (the usb library, WebUSB-like): the list, attached · detached events (one listener on the
 * bus for all the programs that watch it), and raw transfers on a device opened by a program
 * (control, bulk, interrupt). On Windows raw transfers need the WinUSB driver on the device
 * (Zadig); on Linux the udev rights.
 *
 * Never opened for raw transfers: mass storage (it would read disks around the file permissions),
 * hubs, HID devices (the HID block is for them: keyboards are refused there).
 */

const CLASSES = {
  0x00: 'per interfaccia', 0x01: 'audio', 0x02: 'comunicazione (CDC)', 0x03: 'HID', 0x05: 'fisico', 0x06: 'immagini',
  0x07: 'stampante', 0x08: 'memoria di massa', 0x09: 'hub', 0x0a: 'dati CDC', 0x0b: 'smart card', 0x0d: 'sicurezza dei contenuti',
  0x0e: 'video', 0x0f: 'salute', 0x10: 'audio/video', 0x11: 'billboard', 0x12: 'USB-C bridge', 0xdc: 'diagnostica',
  0xe0: 'wireless', 0xef: 'varie', 0xfe: 'specifica di un\'applicazione', 0xff: 'del produttore',
};
const REFUSED = new Map([[0x08, 'memoria di massa'], [0x09, 'hub'], [0x03, 'HID (usa il blocco Dispositivo HID)']]);
const REQUEST_TYPES = ['standard', 'class', 'vendor'];
const RECIPIENTS = ['device', 'interface', 'endpoint', 'other'];
const KINDS = ['control', 'bulk', 'interrupt'];
const MAX_CONTROL = 4096;
const MAX_BULK = 65536;

const safe = fn => { try { return fn() ?? ''; } catch { return ''; } };

function interfaceClasses(d) {
  try { return (d.configuration?.interfaces ?? []).map(i => i.alternate?.interfaceClass).filter(Number.isInteger); } catch { return []; }
}

export function describe(d) {
  const ifaces = interfaceClasses(d);
  const cls = d.deviceClass === 0 && ifaces.length ? ifaces[0] : d.deviceClass;
  return {
    vendorId: hex4(d.vendorId), productId: hex4(d.productId), name: safe(() => d.productName), manufacturer: safe(() => d.manufacturerName),
    serialNumber: safe(() => d.serialNumber), class: cls, className: CLASSES[cls] ?? `classe ${cls}`, interfaces: [...new Set(ifaces)],
    bus: String(d.bus ?? ''), address: d.address ?? null, speed: d.speed ?? '',
  };
}

const keyOf = d => `${d.bus ?? ''}/${d.address ?? ''}/${hex4(d.vendorId)}:${hex4(d.productId)}`;

export function usbActions({ handles, need }) {
  // The watchers of the bus: one listener for all of them, on while someone watches
  const watchers = new Set();
  let listening = null;

  async function listen() {
    if (listening) return listening;
    listening = (async () => {
      const { usb } = await lib('usb');
      await usb.getDevices();   // the devices known now: a detach names them
      const on = kind => ev => {
        const info = ev?.device ? describe(ev.device) : null;
        for (const h of watchers) {
          if (h.closed) { watchers.delete(h); continue; }
          const f = h.data.filter;
          if (info && f.vid !== null && Number.parseInt(info.vendorId, 16) !== f.vid) continue;
          if (info && f.pid !== null && Number.parseInt(info.productId, 16) !== f.pid) continue;
          handles.push(h, { event: kind, device: info }, 512);
        }
      };
      const attach = on('attached'), detach = on('detached');
      usb.addEventListener('connect', attach);
      usb.addEventListener('disconnect', detach);
      return () => { usb.removeEventListener('connect', attach); usb.removeEventListener('disconnect', detach); };
    })();
    try { return await listening; } catch (err) { listening = null; throw err; }
  }

  async function unlisten() {
    if (watchers.size || !listening) return;
    const p = listening;
    listening = null;
    try { (await p)(); } catch { /* never listened */ }
  }

  return {
    async 'hw.usbList'(user) {
      need(user, 'usb');
      const { usb } = await lib('usb');
      const list = await usb.getDevices();
      return { devices: list.map(describe) };
    },

    async 'hw.usbWatch'(user, args, tools) {
      need(user, 'usb');
      const a = argsOf(args);
      const filter = { vid: usbId(a.vendorId, 'VID'), pid: usbId(a.productId, 'PID') };
      const h = handles.create(user, tools, { cls: 'usb', kind: 'usbWatch', label: 'USB', maxItems: 200 });
      h.data.filter = filter;
      watchers.add(h);
      h.closeFn = () => { watchers.delete(h); return unlisten(); };
      try { await listen(); } catch (err) { watchers.delete(h); handles.drop(h); throw err; }
      return { handle: h.id };
    },

    async 'hw.usbOpen'(user, args, tools) {
      need(user, 'usb');
      const a = argsOf(args);
      const vid = usbId(a.vendorId, 'VID'), pid = usbId(a.productId, 'PID');
      if (vid === null || pid === null) throw oops('Servono VID e PID del dispositivo USB (4 cifre esadecimali, come nell\'elenco)');
      const iface = int(a.interface, 0, 255, 'Interfaccia', 0);
      const serial = typeof a.serialNumber === 'string' ? a.serialNumber.trim().slice(0, 128) : '';
      const { usb } = await lib('usb');
      const list = (await usb.getDevices()).filter(d => d.vendorId === vid && d.productId === pid && (!serial || safe(() => d.serialNumber) === serial));
      const device = list[0];
      if (!device) throw oops(`Nessun dispositivo USB con VID ${hex4(vid)} e PID ${hex4(pid)}${serial ? ` e numero di serie ${serial}` : ''}`);
      const classes = [device.deviceClass, ...interfaceClasses(device)];
      const refused = classes.find(c => REFUSED.has(c));
      if (refused !== undefined) throw oops(`Questo dispositivo USB è di tipo ${REFUSED.get(refused)}: non si usa con trasferimenti diretti`);
      const label = `USB ${hex4(vid)}:${hex4(pid)}`;
      const h = handles.create(user, tools, { cls: 'usb', kind: 'usb', resource: `usb:${keyOf(device)}`, label });
      try {
        await withTimeout(device.open(), 5000, `${label} non si apre`);
        if (!device.configuration) await device.selectConfiguration(1);
        if (a.detachDriver === true && IS_LINUX) { try { await device.detachKernelDriver(iface); } catch { /* none attached */ } }
        await device.claimInterface(iface);
      } catch (err) {
        handles.drop(h);
        try { await device.close(); } catch { /* not open */ }
        const msg = String(err?.message ?? err);
        throw err?.lsUser ? err : oops(/not.?supported|access|denied|permission/i.test(msg)
          ? `${label} non si apre: ${msg} (su Windows serve il driver WinUSB, con Zadig; su Linux i permessi di udev)`
          : `${label} non si apre: ${msg}`);
      }
      h.data.device = device;
      h.data.iface = iface;
      h.closeFn = async () => {
        try { await device.releaseInterface(iface); } catch { /* gone */ }
        if (a.detachDriver === true && IS_LINUX) { try { await device.attachKernelDriver(iface); } catch { /* none */ } }
        try { await device.close(); } catch { /* gone */ }
      };
      return { handle: h.id, device: describe(device) };
    },

    async 'hw.usbTransfer'(user, args, tools) {
      need(user, 'usb');
      const a = argsOf(args);
      const h = handles.get(user, tools, a.handle, ['usb']);
      if (h.closed) throw oops(`${h.label} è chiuso`);
      const kind = oneOf(a.kind ?? 'control', KINDS, 'Tipo di trasferimento');
      const dirIn = oneOf(a.direction ?? 'in', ['in', 'out'], 'Direzione') === 'in';
      const timeout = int(a.timeoutMs, 1, 30_000, 'Attesa (ms)', 1000);
      const encoding = oneOf(a.encoding ?? 'bytes', ['text', 'hex', 'bytes'], 'Codifica');
      const d = h.data.device;
      let res;
      try {
        if (kind === 'control') {
          const setup = {
            requestType: oneOf(a.requestType ?? 'vendor', REQUEST_TYPES, 'Tipo di richiesta'),
            recipient: oneOf(a.recipient ?? 'device', RECIPIENTS, 'Destinatario'),
            request: int(a.request, 0, 255, 'Richiesta (bRequest)', 0),
            value: int(a.value, 0, 0xffff, 'Valore (wValue)', 0),
            index: int(a.index, 0, 0xffff, 'Indice (wIndex)', h.data.iface),
          };
          res = dirIn
            ? await d.controlTransferIn(setup, int(a.length, 0, MAX_CONTROL, 'Lunghezza', 64), timeout)
            : await d.controlTransferOut(setup, bytesFrom(a.data ?? [], encoding, MAX_CONTROL), timeout);
        } else {
          const endpoint = int(a.endpoint, 1, 15, 'Endpoint', 1);
          res = dirIn
            ? await d.transferIn(endpoint, int(a.length, 1, MAX_BULK, 'Lunghezza', 64), timeout)
            : await d.transferOut(endpoint, bytesFrom(a.data ?? [], encoding, MAX_BULK), timeout);
        }
      } catch (err) {
        throw oops(`${h.label}: trasferimento non riuscito: ${String(err?.message ?? err).slice(0, 200)}`);
      }
      if (dirIn) {
        const view = res?.data;
        const bytes = view ? Buffer.from(view.buffer, view.byteOffset, view.byteLength) : Buffer.alloc(0);
        return { status: res?.status ?? 'ok', data: bytesTo(bytes, encoding), length: bytes.length };
      }
      return { status: res?.status ?? 'ok', written: res?.bytesWritten ?? 0 };
    },
  };
}
