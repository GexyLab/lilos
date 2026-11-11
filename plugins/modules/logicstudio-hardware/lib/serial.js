import { argsOf, bytesFrom, cb, int, oneOf, oops, short, usbId, withTimeout } from './common.js';
import { ENCODINGS, Framer, sizeOf } from './framing.js';
import { lib } from './native.js';

/**
 * Serial ports (serialport): the list, a port open for a program (exclusive), what it receives
 * split into messages (framing.js), what the program sends, the DTR and RTS lines.
 * A port is opened only by a path of the list the library gives now (never a path a program made up).
 */

const PARITIES = ['none', 'even', 'odd', 'mark', 'space'];
const FLOWS = ['none', 'rtscts', 'xonxoff'];
const MAX_WRITE = 65536;
const vidOf = v => (v ? String(v).toLowerCase().padStart(4, '0') : '');

export async function listPorts() {
  const { SerialPort } = await lib('serialport');
  const list = await SerialPort.list();
  return list.map(p => ({
    path: String(p.path), manufacturer: p.manufacturer ?? '', vendorId: vidOf(p.vendorId), productId: vidOf(p.productId),
    serialNumber: p.serialNumber ?? '', name: p.friendlyName ?? p.pnpId ?? '',
  })).sort((a, b) => a.path.localeCompare(b.path, 'en', { numeric: true }));
}

/** The port asked for, from the list: by path, or by VID/PID (the first one that matches). */
async function pickPort(a) {
  const ports = await listPorts();
  const path = short(a.path, 300);
  if (path) {
    const p = ports.find(x => x.path === path) ?? ports.find(x => x.path.toLowerCase() === path.toLowerCase());
    if (!p) throw oops(`La porta «${path}» non c'è (porte presenti: ${ports.map(x => x.path).join(', ') || 'nessuna'})`);
    return p;
  }
  const vid = usbId(a.vendorId, 'VID'), pid = usbId(a.productId, 'PID');
  if (vid === null) throw oops('Manca la porta: scrivi il percorso (COM3, /dev/ttyUSB0…) oppure VID e PID');
  const p = ports.find(x => Number.parseInt(x.vendorId || '-1', 16) === vid && (pid === null || Number.parseInt(x.productId || '-1', 16) === pid));
  if (!p) throw oops(`Nessuna porta seriale con VID ${vid.toString(16)}${pid !== null ? ` e PID ${pid.toString(16)}` : ''}`);
  return p;
}

export function serialActions({ handles, need }) {
  return {
    async 'hw.serialList'(user) {
      need(user, 'serial');
      return { ports: await listPorts() };
    },

    async 'hw.serialOpen'(user, args, tools) {
      need(user, 'serial');
      const a = argsOf(args);
      const baudRate = int(a.baudRate, 50, 4_000_000, 'Velocità (baud)', 9600);
      const dataBits = oneOf(Number(a.dataBits ?? 8), [5, 6, 7, 8], 'Bit di dati');
      const parity = oneOf(a.parity ?? 'none', PARITIES, 'Parità');
      const stopBits = oneOf(Number(a.stopBits ?? 1), [1, 1.5, 2], 'Bit di stop');
      const flow = oneOf(a.flowControl ?? 'none', FLOWS, 'Controllo di flusso');
      const encoding = oneOf(a.encoding ?? 'text', ENCODINGS, 'Codifica');
      const framer = new Framer({ mode: a.framing ?? 'line', delimiter: a.delimiter, length: a.length, maxLength: a.maxLength, encoding });
      const port = await pickPort(a);
      const { SerialPort } = await lib('serialport');
      const h = handles.create(user, tools, { cls: 'serial', kind: 'serial', resource: `serial:${port.path.toLowerCase()}`, label: port.path, maxItems: 2000, maxBytes: 2 << 20 });
      let sp;
      try {
        sp = new SerialPort({ path: port.path, baudRate, dataBits, parity, stopBits, rtscts: flow === 'rtscts', xon: flow === 'xonxoff', xoff: flow === 'xonxoff', autoOpen: false });
        await withTimeout(cb(done => sp.open(done)), 10_000, `La porta ${port.path} non si apre`);
      } catch (err) {
        handles.drop(h);
        throw err?.lsUser ? err : oops(`La porta ${port.path} non si apre: ${err?.message ?? err}`);
      }
      h.data.port = sp;
      sp.on('data', chunk => { for (const frame of framer.push(chunk)) handles.push(h, { data: frame }, sizeOf(frame)); });
      sp.on('error', err => handles.push(h, { error: `Porta ${port.path}: ${err?.message ?? err}` }));
      sp.on('close', err => {
        for (const frame of framer.flush()) handles.push(h, { data: frame }, sizeOf(frame));
        handles.close(h.id, err?.disconnected ? `La porta ${port.path} si è chiusa: dispositivo scollegato` : `La porta ${port.path} si è chiusa`).catch(() => {});
      });
      h.closeFn = () => (sp.isOpen ? cb(done => sp.close(done)).catch(() => {}) : null);
      return { handle: h.id, path: port.path };
    },

    async 'hw.serialWrite'(user, args, tools) {
      need(user, 'serial');
      const a = argsOf(args);
      const h = handles.get(user, tools, a.handle, ['serial']);
      if (h.closed) throw oops(`La porta ${h.label} è chiusa`);
      const data = bytesFrom(a.data, oneOf(a.encoding ?? 'text', ENCODINGS, 'Codifica'), MAX_WRITE);
      const sp = h.data.port;
      await withTimeout(new Promise((resolve, reject) => {
        sp.write(data, err => (err ? reject(err) : sp.drain(e => (e ? reject(e) : resolve()))));
      }), 10_000, `La porta ${h.label} non riceve i dati (controllo di flusso?)`);
      return { written: data.length };
    },

    async 'hw.serialSignals'(user, args, tools) {
      need(user, 'serial');
      const a = argsOf(args);
      const h = handles.get(user, tools, a.handle, ['serial']);
      if (h.closed) throw oops(`La porta ${h.label} è chiusa`);
      const set = {};
      if (a.dtr !== undefined && a.dtr !== null) set.dtr = a.dtr === true;
      if (a.rts !== undefined && a.rts !== null) set.rts = a.rts === true;
      if (!Object.keys(set).length) return { set: {} };
      await withTimeout(cb(done => h.data.port.set(set, done)), 5000, `La porta ${h.label} non risponde`);
      return { set };
    },
  };
}
