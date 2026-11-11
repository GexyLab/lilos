import { argsOf, bytesFrom, bytesTo, hex4, int, oneOf, oops, short, usbId, withTimeout } from './common.js';
import { lib } from './native.js';

/**
 * HID devices (node-hid): the list, a device opened by a program (exclusive), its input reports
 * (queued for the long poll), output and feature reports.
 *
 * Keyboards and keypads (usage page 1, usage 6 or 7) are never listed nor opened: a program must
 * not read what someone types.
 */

const MAX_REPORT = 4096;
const isKeyboard = d => d.usagePage === 1 && (d.usage === 6 || d.usage === 7);

export function describe(d) {
  return {
    path: String(d.path ?? ''), vendorId: hex4(d.vendorId), productId: hex4(d.productId), manufacturer: d.manufacturer ?? '',
    product: d.product ?? '', serialNumber: d.serialNumber ?? '', usagePage: d.usagePage ?? null, usage: d.usage ?? null,
    interface: d.interface ?? null, release: d.release ?? null,
  };
}

async function listHid() {
  const hid = await lib('hid');
  const all = await hid.devicesAsync();
  // On Linux one hidraw path carries every collection of a device: a keyboard's media keys too
  const keyboards = new Set(all.filter(isKeyboard).map(d => d.path));
  return all.filter(d => d.path && !keyboards.has(d.path));
}

export function hidActions({ handles, need }) {
  return {
    async 'hw.hidList'(user) {
      need(user, 'hid');
      return { devices: (await listHid()).map(describe) };
    },

    async 'hw.hidOpen'(user, args, tools) {
      need(user, 'hid');
      const a = argsOf(args);
      const encoding = oneOf(a.encoding ?? 'bytes', ['hex', 'bytes'], 'Codifica');
      const list = await listHid();
      const path = short(a.path, 1000);
      let dev;
      if (path) {
        dev = list.find(d => d.path === path);
        if (!dev) throw oops('Il dispositivo HID scelto non c\'è (o è una tastiera, che non si apre)');
      } else {
        const vid = usbId(a.vendorId, 'VID'), pid = usbId(a.productId, 'PID');
        if (vid === null || pid === null) throw oops('Servono VID e PID del dispositivo HID, oppure il suo percorso dall\'elenco');
        const usagePage = a.usagePage === undefined || a.usagePage === null || a.usagePage === '' ? null : int(a.usagePage, 0, 0xffff, 'Usage page');
        dev = list.find(d => d.vendorId === vid && d.productId === pid && (usagePage === null || d.usagePage === usagePage));
        if (!dev) throw oops(`Nessun dispositivo HID con VID ${hex4(vid)} e PID ${hex4(pid)} (le tastiere non si aprono)`);
      }
      const label = `HID ${hex4(dev.vendorId)}:${hex4(dev.productId)}${dev.product ? ` (${dev.product})` : ''}`;
      const h = handles.create(user, tools, { cls: 'hid', kind: 'hid', resource: `hid:${dev.path}`, label, maxItems: 1000 });
      const hid = await lib('hid');
      let device;
      try {
        device = await withTimeout(hid.HIDAsync.open(dev.path), 5000, `${label} non si apre`);
      } catch (err) {
        handles.drop(h);
        throw err?.lsUser ? err : oops(`${label} non si apre: ${err?.message ?? err} (su Linux servono i permessi di udev su hidraw)`);
      }
      h.data.device = device;
      device.on('data', buf => handles.push(h, { data: bytesTo(buf, encoding) }, buf.length * (encoding === 'hex' ? 2 : 4)));
      device.on('error', err => {
        handles.push(h, { error: `${label}: ${err?.message ?? err}` });
        handles.close(h.id, `${label} si è chiuso: scollegato?`).catch(() => {});
      });
      h.closeFn = () => device.close().catch(() => {});
      return { handle: h.id, device: describe(dev) };
    },

    async 'hw.hidWrite'(user, args, tools) {
      need(user, 'hid');
      const a = argsOf(args);
      const h = handles.get(user, tools, a.handle, ['hid']);
      if (h.closed) throw oops(`${h.label} è chiuso`);
      const data = [...bytesFrom(a.data, oneOf(a.encoding ?? 'bytes', ['hex', 'bytes'], 'Codifica'), MAX_REPORT)];
      if (!data.length) throw oops('Il report da mandare è vuoto (il primo byte è il numero del report, 0 se il dispositivo non li usa)');
      const n = a.feature === true ? await h.data.device.sendFeatureReport(data) : await h.data.device.write(data);
      return { written: n };
    },

    async 'hw.hidGetFeature'(user, args, tools) {
      need(user, 'hid');
      const a = argsOf(args);
      const h = handles.get(user, tools, a.handle, ['hid']);
      if (h.closed) throw oops(`${h.label} è chiuso`);
      const buf = await h.data.device.getFeatureReport(int(a.reportId, 0, 255, 'Numero del report', 0), int(a.length, 1, MAX_REPORT, 'Lunghezza', 64));
      return { data: bytesTo(Buffer.from(buf), oneOf(a.encoding ?? 'bytes', ['hex', 'bytes'], 'Codifica')) };
    },
  };
}
