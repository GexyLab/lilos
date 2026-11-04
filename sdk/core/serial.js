import { Emitter } from './events.js';
import { locale } from './locale.js';

const { t } = locale.define('lilos:sdk.serial', {
  en: { strings: {
    notFound: 'Serial port not found (unplugged?)',
    unsupported: 'This browser cannot use serial ports (it takes Chrome, Edge or Firefox 151+, on https or localhost)',
    click: 'The browser wants a click before choosing a port',
    baud: 'Invalid speed (baud)',
    busy: 'The port is already open (by another window or another program)',
    failed: 'The port does not open: {message}',
  } },
});

/**
 * Serial ports of the computer the user is at (Arduino boards, USB adapters…), with the browser's
 * Web Serial API: Chrome, Edge and Firefox 151+, on https or localhost; not Safari. The page of
 * lilOS opens the ports and hands out channels, so an isolated app (whose sandbox has no Web
 * Serial) can use them too. The browser asks the user which port, once per port and site.
 *
 *   serial.supported                 the browser has Web Serial (and lilOS is in a secure context)
 *   serial.ports() → [port]          the ports the user already allowed, connected now
 *       port { id, usbVendorId, usbProductId } (vendor and product: numbers, or null if not USB)
 *       ids last as long as the page
 *   serial.request({ filters }) → port | null   asks the user to choose a port (null: they did not).
 *       filters: [{ usbVendorId, usbProductId? }]. Only right after a click or a key (the browser
 *       wants a gesture of the user)
 *   serial.forget(id)                the browser forgets the permission for that port
 *   serial.open(id, options) → MessagePort      opens the port; options: { baudRate (required),
 *       dataBits 7|8, stopBits 1|2, parity 'none'|'even'|'odd', bufferSize, flowControl 'none'|'hardware' }
 *       from the port   ArrayBuffer: bytes read · string: JSON { t: 'done', id, error? } (the end of a
 *                       control message with that id: everything sent before it has been written),
 *                       { t: 'error', message } (the device went or failed), { t: 'gone' } (closed)
 *       to the port     ArrayBuffer / typed array (up to 64 KiB, at most 1 MiB waiting): bytes to write · string: JSON
 *                       { t: 'signals', id?, dtr?, rts?, brk? } (Data Terminal Ready, Request To Send,
 *                       break: booleans) · { t: 'sync', id } (only the 'done') · { t: 'close' }
 *       port.detach() closes it (for lilOS: the window that held it closed)
 *
 * Event 'change': a port was connected or disconnected (only ports the user allowed are seen).
 */
const MAX_WRITE = 64 << 10;
const MAX_PENDING = 1 << 20;   // bytes waiting to be written: beyond, writes are dropped
const BAUD = { min: 50, max: 4_000_000 };

class Serial extends Emitter {
  #ids = new WeakMap();      // SerialPort → id
  #byId = new Map();         // id → SerialPort
  #next = 1;
  #listening = false;

  get supported() {
    return typeof navigator !== 'undefined' && 'serial' in navigator && globalThis.isSecureContext === true;
  }

  /** Listening to the browser starts with the first subscriber (or the first call). */
  on(type, fn) {
    this.#listen();
    return super.on(type, fn);
  }

  #listen() {
    if (this.#listening || !this.supported) return;
    this.#listening = true;
    navigator.serial.addEventListener('connect', () => this.emit('change'));
    navigator.serial.addEventListener('disconnect', e => {
      const id = e.target && this.#ids.get(e.target);
      if (id) this.#byId.delete(id);
      this.emit('change');
    });
  }

  #info(port) {
    let id = this.#ids.get(port);
    if (!id) {
      id = `p${this.#next++}`;
      this.#ids.set(port, id);
    }
    this.#byId.set(id, port);
    const { usbVendorId = null, usbProductId = null } = port.getInfo?.() ?? {};
    return { id, usbVendorId: usbVendorId ?? null, usbProductId: usbProductId ?? null };
  }

  #port(id) {
    const port = this.#byId.get(String(id));
    if (!port) throw new Error(t('notFound'));
    return port;
  }

  #check() {
    if (!this.supported) throw new Error(t('unsupported'));
    this.#listen();
  }

  async ports() {
    if (!this.supported) return [];
    this.#listen();
    return (await navigator.serial.getPorts()).filter(p => p.connected !== false).map(p => this.#info(p));
  }

  async request({ filters } = {}) {
    this.#check();
    const list = (Array.isArray(filters) ? filters : []).slice(0, 50).map(f => ({
      ...(Number.isInteger(f?.usbVendorId) && { usbVendorId: f.usbVendorId }),
      ...(Number.isInteger(f?.usbVendorId) && Number.isInteger(f?.usbProductId) && { usbProductId: f.usbProductId }),
    })).filter(f => f.usbVendorId !== undefined);
    try {
      return this.#info(await navigator.serial.requestPort(list.length ? { filters: list } : {}));
    } catch (err) {
      if (err?.name === 'NotFoundError') return null;   // the user closed the chooser
      if (err?.name === 'SecurityError') throw new Error(t('click'));
      throw err;
    }
  }

  async forget(id) {
    this.#check();
    const port = this.#port(id);
    this.#byId.delete(String(id));
    await port.forget?.();
  }

  async open(id, options = {}) {
    this.#check();
    const port = this.#port(id);
    const baudRate = Number(options.baudRate);
    if (!Number.isInteger(baudRate) || baudRate < BAUD.min || baudRate > BAUD.max) throw new Error(t('baud'));
    const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
    try {
      await port.open({
        baudRate,
        dataBits: pick(options.dataBits, [7, 8], 8),
        stopBits: pick(options.stopBits, [1, 2], 1),
        parity: pick(options.parity, ['none', 'even', 'odd'], 'none'),
        flowControl: pick(options.flowControl, ['none', 'hardware'], 'none'),
        bufferSize: Number.isInteger(options.bufferSize) && options.bufferSize >= 64 && options.bufferSize <= 1 << 20 ? options.bufferSize : 4096,
      });
    } catch (err) {
      if (err?.name === 'InvalidStateError') throw new Error(t('busy'));
      throw new Error(t('failed', { message: err?.message ?? err }));
    }
    return channel(port);
  }
}

/** The MessagePort of an open port (see open() above). */
function channel(port) {
  const { port1, port2 } = new MessageChannel();
  const say = msg => port1.postMessage(JSON.stringify(msg));
  let reader = null, writer = port.writable.getWriter();
  let queue = Promise.resolve();      // writes and signals, in the order they came
  let closed = false;

  let pending = 0;                    // bytes waiting to be written
  const close = async () => {
    if (closed) return;
    closed = true;
    try { await reader?.cancel(); } catch { /* already gone */ }
    try { reader?.releaseLock(); } catch { /* idem */ }
    // A write that never ends (hardware flow control, nobody reading) must not keep the port open
    const drained = await Promise.race([queue.then(() => true, () => true), new Promise(r => setTimeout(() => r(false), 2000))]);
    if (!drained) try { await writer.abort(); } catch { /* idem */ }
    try { writer.releaseLock(); } catch { /* idem */ }
    try { await port.close(); } catch { /* idem */ }
    say({ t: 'gone' });
    port1.close();
  };

  (async () => {
    while (!closed && port.readable) {
      reader = port.readable.getReader();
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value?.byteLength) {
            const copy = value.buffer.byteLength === value.byteLength ? value.buffer : value.slice().buffer;
            port1.postMessage(copy, [copy]);
          }
        }
      } catch (err) {
        // A framing or parity error leaves the port usable; a lost device does not
        if (closed) break;
        if (err?.name === 'NetworkError' || err?.name === 'NotFoundError' || !port.readable) {
          say({ t: 'error', message: err?.message ?? String(err) });
          break;
        }
      } finally {
        try { reader.releaseLock(); } catch { /* cancelled */ }
      }
    }
    close();
  })();

  const later = (fn, id) => {
    queue = queue.then(fn).then(
      () => { if (id !== undefined) say({ t: 'done', id }); },
      err => { if (id !== undefined) say({ t: 'done', id, error: err?.message ?? String(err) }); },
    );
  };

  port1.onmessage = e => {
    if (closed) return;
    const data = e.data;
    if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
      if (data.byteLength > MAX_WRITE || pending + data.byteLength > MAX_PENDING) return;
      const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      const copy = bytes.slice();
      pending += copy.length;
      later(() => writer.write(copy).finally(() => { pending -= copy.length; }));
      return;
    }
    if (typeof data !== 'string' || data.length > 1024) return;
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    const id = Number.isInteger(msg?.id) ? msg.id : undefined;
    if (msg?.t === 'close') return void close();
    if (msg?.t === 'sync') return later(() => {}, id);
    if (msg?.t === 'signals') {
      const signals = {
        ...(typeof msg.dtr === 'boolean' && { dataTerminalReady: msg.dtr }),
        ...(typeof msg.rts === 'boolean' && { requestToSend: msg.rts }),
        ...(typeof msg.brk === 'boolean' && { break: msg.brk }),
      };
      later(() => port.setSignals(signals), id);
    }
  };
  port2.detach = () => { close(); };
  return port2;
}

export const serial = new Serial();
