/**
 * The Hardware blocks of Logic Studio, loaded by the engine in each user's worker (and read in the
 * kernel's main thread for the catalog: nothing here runs at import). They touch no device
 * themselves: each asks the kernel with b.call('hw.…', args), an action of this package
 * (lib/actions.js) made in the kernel for the program's owner, after checking that they may use
 * that class of devices. Block format: see logicstudio-core/blocks.js.
 *
 * A device that sends data by itself (a serial port, a camera, a microphone, MIDI, GPIO edges, the
 * USB bus) is kept open by the kernel as a handle; the block reads it with a long poll
 * (hw.read waits up to 15 s for something) in a loop of its own, out of run() (which must end
 * within the engine's block time). The loop ends when the block's memory changes (its group started
 * again), when the program stops, or when the device closes. stop() closes the handle.
 */

const L = (en, it) => ({ en, it });
const PULSE = true;
const WAIT_MS = 15_000;
const text = v => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const isOn = v => v === true || v === 1 || v === '1' || v === 'true';
const given = v => v !== undefined && v !== null && v !== '';

/** An Exception for the block's error output, as the engine makes them. */
const exception = (b, type, message) => ({ message: String(message), block: b.id, type, schema: b.schema, at: b.now() });

/** «{now}» in a path: the date and time, 2026-11-11_14-30-05 (local). */
function fillPath(path, b) {
  const d = new Date(b.now());
  const p = n => String(n).padStart(2, '0');
  const now = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
  return text(path).trim().replace(/\{now\}/g, now);
}
const pathOf = (inputs, b, key = 'path') => fillPath(given(inputs[key]) ? inputs[key] : b.config[key], b);

/**
 * Opens a device that sends data (open() → { handle, … }) and reads it in a loop: onItem(item) for
 * each thing it sends, onEnd(reason) when it closes (reason: why, null when the block closed it).
 * The handle of the block before (if any) is closed first.
 */
async function keep(b, type, open, { onItem, onEnd = null } = {}) {
  await release(b);
  const m = b.memory();
  const token = {};
  m.token = token;
  const r = await open();
  const alive = () => b.memory() === m && m.token === token && !b.signal.aborted;
  if (!alive()) { b.call('hw.close', { handle: r.handle }).catch(() => {}); return r; }
  m.handle = r.handle;
  (async () => {
    while (alive()) {
      let res;
      try {
        res = await b.call('hw.read', { handle: r.handle, waitMs: WAIT_MS });
      } catch (err) {
        if (alive()) { m.handle = null; b.send('error', exception(b, type, err?.message ?? err)); onEnd?.(null); }
        return;
      }
      if (!alive()) return;
      for (const item of res.items ?? []) {
        if (item && typeof item === 'object' && typeof item.error === 'string') b.send('error', exception(b, type, item.error));
        else {
          try { onItem(item); } catch (err) { b.send('error', exception(b, type, err?.message ?? err)); }
        }
      }
      if (res.closed) {
        if (m.handle === r.handle) m.handle = null;
        if (res.reason) b.send('error', exception(b, type, res.reason));
        onEnd?.(res.reason ?? null);
        return;
      }
    }
  })().catch(() => {});
  return r;
}

/** Closes the block's handle (and ends its loop). */
async function release(b) {
  const m = b.memory();
  m.token = null;
  const h = m.handle;
  m.handle = null;
  if (h) await b.call('hw.close', { handle: h }).catch(() => {});
  return !!h;
}

const stop = b => release(b);

/** An action that may last longer than a block may (a sound, a voice): out of run(), its end sent later. */
function later(b, type, promise, done) {
  const m = b.memory();
  promise.then(v => { if (b.memory() === m && !b.signal.aborted) done(v); },
    err => { if (b.memory() === m && !b.signal.aborted) b.send('error', exception(b, type, err?.message ?? err)); });
}

/** Asks again every `seconds` (0: only when asked): fn() → the outputs. */
function every(b, type, seconds, fn) {
  const m = b.memory();
  b.clearTimer(m.poll);
  m.poll = null;
  if (!(Number(seconds) > 0)) return;
  m.poll = b.setInterval(async () => {
    if (m.busy) return;
    m.busy = true;
    try {
      const out = await fn();
      for (const [port, v] of Object.entries(out ?? {})) if (v !== undefined) b.send(port, v);
    } catch (err) { b.send('error', exception(b, type, err?.message ?? err)); } finally { m.busy = false; }
  }, Math.max(1, Number(seconds)) * 1000);
}

const usbField = (key, en, it) => ({ key, type: 'text', default: '', label: L(`${en} (hex, e.g. 2341)`, `${it} (esadecimale, es. 2341)`) });
const pollField = (def = 0) => ({ key: 'seconds', type: 'number', default: def, min: 0, max: 86400, label: L('Read by itself every (seconds, 0 = never)', 'Leggi da solo ogni (secondi, 0 = mai)') });
const atStartField = (en, it, def = false) => ({ key: 'atStart', type: 'checkbox', default: def, label: L(en, it) });
const cameraField = { key: 'camera', type: 'text', default: '', label: L('Webcam (name; empty: the first one)', 'Webcam (nome; vuoto: la prima)') };
const micField = (en = 'Microphone (name; empty: the default one)', it = 'Microfono (nome; vuoto: quello predefinito)') => ({ key: 'mic', type: 'text', default: '', label: L(en, it) });
const pathInput = { name: 'path', type: 'text', label: L('path', 'percorso'), trigger: false };

/** The parts of the regex framing, in this worker: a costly expression slows only its user. */
function regexFrames(m, chunk, source) {
  let re;
  try { re = new RegExp(source); } catch (err) { throw new Error(`Espressione regolare non valida: ${err.message}`); }
  m.rx = (m.rx ?? '') + chunk;
  const out = [];
  for (let found = re.exec(m.rx); found; found = re.exec(m.rx)) {
    if (!found[0].length) throw new Error('L\'espressione regolare trova un separatore vuoto: scrivine una che trovi almeno un carattere');
    out.push(m.rx.slice(0, found.index));
    m.rx = m.rx.slice(found.index + found[0].length);
  }
  if (m.rx.length > 65536) { out.push(m.rx); m.rx = ''; }
  return out;
}

const T = {
  serialList: 'hw.serialList', serial: 'hw.serial', usbList: 'hw.usbList', usbHotplug: 'hw.usbHotplug', usbTransfer: 'hw.usbTransfer',
  hid: 'hw.hid', webcamList: 'hw.webcamList', photo: 'hw.photo', webcamStream: 'hw.webcamStream', videoRecord: 'hw.videoRecord',
  audioDevices: 'hw.audioDevices', play: 'hw.play', tone: 'hw.tone', speak: 'hw.speak', audioRecord: 'hw.audioRecord',
  micLevel: 'hw.micLevel', volume: 'hw.volume', midi: 'hw.midi', systemInfo: 'hw.systemInfo', battery: 'hw.battery',
  disks: 'hw.disks', network: 'hw.network', printers: 'hw.printers', gpio: 'hw.gpio', i2c: 'hw.i2c',
};

/** Recording (video or audio): start, stop, the file saved. */
function recorder(type, kind) {
  return {
    async run(inputs, b) {
      const m = b.memory();
      if (b.trigger === 'stop') {
        if (!m.handle) return undefined;
        // Not awaited: saving a long recording may take more than a block may; the loop sends what was saved
        b.call('hw.recordStop', { handle: m.handle }).catch(() => {});
        return undefined;
      }
      if (b.trigger !== 'start') return undefined;
      if (m.handle) throw new Error('Sta già registrando: prima fermalo');
      const args = {
        kind, path: pathOf(inputs, b), maxSeconds: b.config.maxSeconds,
        ...(kind === 'video' ? { camera: b.config.camera, mic: b.config.mic || null, width: b.config.width, height: b.config.height } : { mic: b.config.mic }),
      };
      await keep(b, type, () => b.call('hw.recordStart', args), {
        onItem: item => { if (item.saved) { b.send('saved', item.saved); b.send('size', item.size); b.send('seconds', item.seconds); } },
        onEnd: () => b.send('recording', false),
      });
      return { recording: true };
    },
    stop,
  };
}

export const blocks = [
  // ---------------------------------------------------------------- Seriale
  {
    type: T.serialList, version: 1, category: 'hardware', icon: 'list', label: L('SerialPort.list (serial ports)', 'SerialPort.list (porte seriali)'),
    description: L('The serial ports of the computer that runs lilOS', 'Le porte seriali del computer dove gira lilOS'),
    inputs: [{ name: 'list', type: 'pulse', label: L('list', 'elenca') }],
    outputs: [
      { name: 'ports', type: 'list', label: L('ports', 'porte') },
      { name: 'paths', type: 'list', label: L('paths', 'percorsi') },
      { name: 'count', type: 'number', label: L('count', 'quante') },
      { name: 'changed', type: 'pulse', label: L('changed', 'cambiate') },
    ],
    config: [
      { key: 'watch', type: 'checkbox', default: false, label: L('Watch: send when they change', 'Sorveglia: manda quando cambiano') },
      { key: 'seconds', type: 'number', default: 5, min: 1, max: 3600, label: L('Check every (seconds)', 'Controlla ogni (secondi)'), when: { watch: true } },
    ],
    start(b) {
      if (!b.config.watch) return;
      const m = b.memory();
      every(b, T.serialList, b.config.seconds, async () => {
        const { ports } = await b.call('hw.serialList', {});
        const key = JSON.stringify(ports);
        if (key === m.last) return {};
        const first = m.last === undefined;
        m.last = key;
        return { ports, paths: ports.map(p => p.path), count: ports.length, changed: first ? undefined : PULSE };
      });
    },
    async run(inputs, b) {
      const { ports } = await b.call('hw.serialList', {});
      b.memory().last = JSON.stringify(ports);
      return { ports, paths: ports.map(p => p.path), count: ports.length };
    },
  },
  {
    type: T.serial, version: 1, category: 'hardware', icon: 'transfer', label: L('SerialPort (COM port)', 'SerialPort (porta seriale COM)'),
    description: L('Opens a serial port: receives its messages, sends data, sets DTR and RTS', 'Apre una porta seriale: ne riceve i messaggi, manda dati, imposta DTR e RTS'),
    inputs: [
      { name: 'open', type: 'pulse', label: L('open', 'apri') },
      { name: 'close', type: 'pulse', label: L('close', 'chiudi') },
      { name: 'send', type: 'any', label: L('send', 'invia') },
      { name: 'dtr', type: 'bool', label: L('DTR', 'DTR'), hidden: true },
      { name: 'rts', type: 'bool', label: L('RTS', 'RTS'), hidden: true },
      { ...pathInput, hidden: true },
    ],
    outputs: [
      { name: 'data', type: 'any', label: L('data', 'dati') },
      { name: 'opened', type: 'pulse', label: L('opened', 'aperta') },
      { name: 'closed', type: 'pulse', label: L('closed', 'chiusa') },
    ],
    config: [
      { key: 'path', type: 'text', default: '', label: L('Port (COM3, /dev/ttyUSB0…)', 'Porta (COM3, /dev/ttyUSB0…)') },
      { key: 'baudRate', type: 'number', default: 9600, min: 50, max: 4000000, label: L('Speed (baud)', 'Velocità (baud)') },
      { key: 'dataBits', type: 'select', default: '8', options: ['8', '7', '6', '5'], label: L('Data bits', 'Bit di dati') },
      { key: 'parity', type: 'select', default: 'none', label: L('Parity', 'Parità'), options: [
        { value: 'none', label: L('None', 'Nessuna') }, { value: 'even', label: L('Even', 'Pari') }, { value: 'odd', label: L('Odd', 'Dispari') },
        { value: 'mark', label: L('Mark', 'Mark') }, { value: 'space', label: L('Space', 'Space') },
      ] },
      { key: 'stopBits', type: 'select', default: '1', options: ['1', '1.5', '2'], label: L('Stop bits', 'Bit di stop') },
      { key: 'flowControl', type: 'select', default: 'none', label: L('Flow control', 'Controllo di flusso'), options: [
        { value: 'none', label: L('None', 'Nessuno') }, { value: 'rtscts', label: L('Hardware (RTS/CTS)', 'Hardware (RTS/CTS)') }, { value: 'xonxoff', label: L('Software (XON/XOFF)', 'Software (XON/XOFF)') },
      ] },
      { key: 'framing', type: 'select', default: 'line', label: L('Messages', 'Messaggi'), options: [
        { value: 'line', label: L('One per line', 'Uno per riga') }, { value: 'delimiter', label: L('Up to a delimiter', 'Fino a un delimitatore') },
        { value: 'length', label: L('Fixed length', 'Lunghezza fissa') }, { value: 'regex', label: L('Split by a regular expression', 'Divisi da un\'espressione regolare') },
        { value: 'raw', label: L('As they come', 'Come arrivano') },
      ] },
      { key: 'delimiter', type: 'text', default: '\\r\\n', label: L('Delimiter (\\n \\r \\t \\xHH)', 'Delimitatore (\\n \\r \\t \\xHH)'), when: { framing: 'delimiter' } },
      { key: 'length', type: 'number', default: 8, min: 1, max: 65536, label: L('Length (bytes)', 'Lunghezza (byte)'), when: { framing: 'length' } },
      { key: 'regex', type: 'text', default: '\\r?\\n', label: L('Separator (regular expression)', 'Separatore (espressione regolare)'), when: { framing: 'regex' } },
      { key: 'encoding', type: 'select', default: 'text', label: L('Data as', 'Dati come'), options: [
        { value: 'text', label: L('Text (UTF-8)', 'Testo (UTF-8)') }, { value: 'hex', label: L('Hex text', 'Testo esadecimale') }, { value: 'bytes', label: L('List of bytes', 'Lista di byte') },
      ] },
      { key: 'newline', type: 'select', default: 'none', label: L('Added to what is sent', 'Aggiunto a quello che si invia'), when: { encoding: 'text' }, options: [
        { value: 'none', label: L('Nothing', 'Niente') }, { value: 'lf', label: L('\\n', '\\n') }, { value: 'crlf', label: L('\\r\\n', '\\r\\n') }, { value: 'cr', label: L('\\r', '\\r') },
      ] },
      atStartField('Open at start', 'Apri all\'avvio'),
    ],
    async start(b) {
      if (b.config.atStart) {
        try { await openSerial({}, b); b.send('opened', PULSE); } catch (err) { b.send('error', exception(b, T.serial, err?.message ?? err)); }
      }
    },
    async run(inputs, b) {
      const m = b.memory();
      switch (b.trigger) {
        case 'open': await openSerial(inputs, b); return { opened: PULSE };
        case 'close': return (await release(b)) ? { closed: PULSE } : undefined;
        case 'send': {
          if (!m.handle) throw new Error('La porta non è aperta: manda prima un impulso ad «apri»');
          const enc = b.config.framing === 'regex' ? 'text' : b.config.encoding;
          let data = inputs.send;
          if (enc === 'text') data = text(data) + ({ lf: '\n', crlf: '\r\n', cr: '\r' }[b.config.newline] ?? '');
          await b.call('hw.serialWrite', { handle: m.handle, data, encoding: enc });
          return undefined;
        }
        case 'dtr': case 'rts':
          if (!m.handle) return undefined;
          await b.call('hw.serialSignals', { handle: m.handle, [b.trigger]: isOn(inputs[b.trigger]) });
          return undefined;
        default: return undefined;
      }
    },
    stop,
  },

  // ---------------------------------------------------------------- USB
  {
    type: T.usbList, version: 1, category: 'hardware', icon: 'chip', label: L('usb.getDevices (USB devices)', 'usb.getDevices (dispositivi USB)'),
    inputs: [{ name: 'list', type: 'pulse', label: L('list', 'elenca') }],
    outputs: [{ name: 'devices', type: 'list', label: L('devices', 'dispositivi') }, { name: 'count', type: 'number', label: L('count', 'quanti') }],
    config: [usbField('vendorId', 'Only VID', 'Solo VID'), usbField('productId', 'Only PID', 'Solo PID')],
    async run(inputs, b) {
      const { devices } = await b.call('hw.usbList', {});
      const vid = text(b.config.vendorId).trim().toLowerCase().replace(/^0x/, '').padStart(4, '0');
      const pid = text(b.config.productId).trim().toLowerCase().replace(/^0x/, '').padStart(4, '0');
      const list = devices.filter(d => (!text(b.config.vendorId).trim() || d.vendorId === vid) && (!text(b.config.productId).trim() || d.productId === pid));
      return { devices: list, count: list.length };
    },
  },
  {
    type: T.usbHotplug, version: 1, category: 'hardware', icon: 'sync', label: L('usb.on attach · detach (USB plugged · unplugged)', 'usb.on attach · detach (USB collegato · scollegato)'),
    inputs: [{ name: 'on', type: 'bool', label: L('on', 'acceso') }],
    outputs: [
      { name: 'attached', type: 'object', label: L('plugged', 'collegato') },
      { name: 'detached', type: 'object', label: L('unplugged', 'scollegato') },
      { name: 'event', type: 'object', label: L('event', 'evento') },
    ],
    config: [usbField('vendorId', 'Only VID', 'Solo VID'), usbField('productId', 'Only PID', 'Solo PID'), atStartField('Starts on its own', 'Parte da solo', true)],
    async start(b) {
      if (b.config.atStart) await watchUsb(b).catch(err => b.send('error', exception(b, T.usbHotplug, err?.message ?? err)));
    },
    async run({ on }, b) {
      if (isOn(on)) await watchUsb(b);
      else await release(b);
      return undefined;
    },
    stop,
  },
  {
    type: T.usbTransfer, version: 1, category: 'hardware', icon: 'transfer', label: L('transferIn · transferOut (USB transfer)', 'transferIn · transferOut (trasferimento USB)'),
    description: L('Raw transfers with a USB device (advanced: on Windows it needs the WinUSB driver)', 'Trasferimenti diretti con un dispositivo USB (avanzato: su Windows serve il driver WinUSB)'),
    inputs: [
      { name: 'open', type: 'pulse', label: L('open', 'apri') },
      { name: 'close', type: 'pulse', label: L('close', 'chiudi') },
      { name: 'transfer', type: 'any', label: L('transfer (data to send)', 'trasferisci (dati da mandare)') },
    ],
    outputs: [
      { name: 'data', type: 'any', label: L('data received', 'dati ricevuti') },
      { name: 'result', type: 'object', label: L('result', 'risultato') },
      { name: 'opened', type: 'pulse', label: L('opened', 'aperto') },
      { name: 'closed', type: 'pulse', label: L('closed', 'chiuso') },
    ],
    config: [
      usbField('vendorId', 'VID', 'VID'), usbField('productId', 'PID', 'PID'),
      { key: 'serialNumber', type: 'text', default: '', label: L('Serial number (optional)', 'Numero di serie (facoltativo)') },
      { key: 'interface', type: 'number', default: 0, min: 0, max: 255, label: L('Interface', 'Interfaccia') },
      { key: 'detachDriver', type: 'checkbox', default: false, label: L('Detach the system driver (Linux)', 'Stacca il driver del sistema (Linux)') },
      { key: 'kind', type: 'select', default: 'control', label: L('Transfer', 'Trasferimento'), options: [
        { value: 'control', label: L('Control', 'Controllo') }, { value: 'bulk', label: L('Bulk', 'Bulk') }, { value: 'interrupt', label: L('Interrupt', 'Interrupt') },
      ] },
      { key: 'direction', type: 'select', default: 'in', label: L('Direction', 'Direzione'), options: [{ value: 'in', label: L('In (from the device)', 'In (dal dispositivo)') }, { value: 'out', label: L('Out (to the device)', 'Out (al dispositivo)') }] },
      { key: 'endpoint', type: 'number', default: 1, min: 1, max: 15, label: L('Endpoint', 'Endpoint'), when: { kind: ['bulk', 'interrupt'] } },
      { key: 'requestType', type: 'select', default: 'vendor', options: ['standard', 'class', 'vendor'], label: L('Request type', 'Tipo di richiesta'), when: { kind: 'control' } },
      { key: 'recipient', type: 'select', default: 'device', options: ['device', 'interface', 'endpoint', 'other'], label: L('Recipient', 'Destinatario'), when: { kind: 'control' } },
      { key: 'request', type: 'number', default: 0, min: 0, max: 255, label: L('bRequest', 'bRequest'), when: { kind: 'control' } },
      { key: 'value', type: 'number', default: 0, min: 0, max: 65535, label: L('wValue', 'wValue'), when: { kind: 'control' } },
      { key: 'index', type: 'number', default: 0, min: 0, max: 65535, label: L('wIndex', 'wIndex'), when: { kind: 'control' } },
      { key: 'length', type: 'number', default: 64, min: 0, max: 65536, label: L('Bytes to read', 'Byte da leggere'), when: { direction: 'in' } },
      { key: 'timeoutMs', type: 'number', default: 1000, min: 1, max: 30000, label: L('Wait at most (ms)', 'Attesa massima (ms)') },
      { key: 'encoding', type: 'select', default: 'bytes', label: L('Data as', 'Dati come'), options: [
        { value: 'bytes', label: L('List of bytes', 'Lista di byte') }, { value: 'hex', label: L('Hex text', 'Testo esadecimale') }, { value: 'text', label: L('Text (UTF-8)', 'Testo (UTF-8)') },
      ] },
    ],
    async run(inputs, b) {
      const m = b.memory();
      const c = b.config;
      if (b.trigger === 'close') return (await release(b)) ? { closed: PULSE } : undefined;
      if (b.trigger === 'open' || (b.trigger === 'transfer' && !m.handle)) {
        await release(b);
        const r = await b.call('hw.usbOpen', { vendorId: c.vendorId, productId: c.productId, serialNumber: c.serialNumber, interface: c.interface, detachDriver: c.detachDriver === true });
        m.handle = r.handle;
        if (b.trigger === 'open') return { opened: PULSE };
        b.send('opened', PULSE);
      }
      if (b.trigger !== 'transfer') return undefined;
      const res = await b.call('hw.usbTransfer', {
        handle: m.handle, kind: c.kind, direction: c.direction, endpoint: c.endpoint, length: c.length, timeoutMs: c.timeoutMs, encoding: c.encoding,
        requestType: c.requestType, recipient: c.recipient, request: c.request, value: c.value, index: c.index,
        data: c.direction === 'out' ? inputs.transfer : undefined,
      });
      return { result: res, ...(c.direction === 'in' ? { data: res.data } : {}) };
    },
    stop,
  },
  {
    type: T.hid, version: 1, category: 'hardware', icon: 'press', label: L('HID device (node-hid)', 'Dispositivo HID (node-hid)'),
    description: L('Lists and opens HID devices (not keyboards): input reports, output and feature reports', 'Elenca e apre dispositivi HID (non le tastiere): report in ingresso, in uscita e feature'),
    inputs: [
      { name: 'list', type: 'pulse', label: L('list', 'elenca') },
      { name: 'open', type: 'pulse', label: L('open', 'apri') },
      { name: 'close', type: 'pulse', label: L('close', 'chiudi') },
      { name: 'write', type: 'any', label: L('write report', 'scrivi report') },
      { name: 'sendFeature', type: 'any', label: L('send feature report', 'manda feature report'), hidden: true },
      { name: 'getFeature', type: 'pulse', label: L('read feature report', 'leggi feature report'), hidden: true },
    ],
    outputs: [
      { name: 'data', type: 'any', label: L('report received', 'report ricevuto') },
      { name: 'feature', type: 'any', label: L('feature report', 'feature report'), hidden: true },
      { name: 'devices', type: 'list', label: L('devices', 'dispositivi') },
      { name: 'opened', type: 'pulse', label: L('opened', 'aperto') },
      { name: 'closed', type: 'pulse', label: L('closed', 'chiuso') },
    ],
    config: [
      usbField('vendorId', 'VID', 'VID'), usbField('productId', 'PID', 'PID'),
      { key: 'usagePage', type: 'text', default: '', label: L('Usage page (optional, e.g. 0xff00)', 'Usage page (facoltativa, es. 0xff00)') },
      { key: 'path', type: 'text', default: '', label: L('Path (from the list; takes the place of VID and PID)', 'Percorso (dall\'elenco; prende il posto di VID e PID)') },
      { key: 'encoding', type: 'select', default: 'bytes', label: L('Reports as', 'Report come'), options: [{ value: 'bytes', label: L('List of bytes', 'Lista di byte') }, { value: 'hex', label: L('Hex text', 'Testo esadecimale') }] },
      { key: 'reportId', type: 'number', default: 0, min: 0, max: 255, label: L('Feature report: number', 'Feature report: numero') },
      { key: 'featureLength', type: 'number', default: 64, min: 1, max: 4096, label: L('Feature report: length (bytes)', 'Feature report: lunghezza (byte)') },
    ],
    async run(inputs, b) {
      const m = b.memory();
      const c = b.config;
      switch (b.trigger) {
        case 'list': return { devices: (await b.call('hw.hidList', {})).devices };
        case 'open':
          await keep(b, T.hid, () => b.call('hw.hidOpen', { path: c.path, vendorId: c.vendorId, productId: c.productId, usagePage: c.usagePage, encoding: c.encoding }), {
            onItem: item => b.send('data', item.data),
            onEnd: () => b.send('closed', PULSE),
          });
          return { opened: PULSE };
        case 'close': return (await release(b)) ? { closed: PULSE } : undefined;
        default: {
          if (!m.handle) throw new Error('Il dispositivo HID non è aperto: manda prima un impulso ad «apri»');
          if (b.trigger === 'getFeature') return { feature: (await b.call('hw.hidGetFeature', { handle: m.handle, reportId: c.reportId, length: c.featureLength, encoding: c.encoding })).data };
          const data = b.trigger === 'write' ? inputs.write : inputs.sendFeature;
          await b.call('hw.hidWrite', { handle: m.handle, data, encoding: Array.isArray(data) ? 'bytes' : 'hex', feature: b.trigger === 'sendFeature' });
          return undefined;
        }
      }
    },
    stop,
  },

  // ---------------------------------------------------------------- Webcam
  {
    type: T.webcamList, version: 1, category: 'hardware', icon: 'camera', label: L('enumerateDevices (webcams)', 'enumerateDevices (webcam)'),
    inputs: [{ name: 'list', type: 'pulse', label: L('list', 'elenca') }],
    outputs: [{ name: 'cameras', type: 'list', label: L('webcams', 'webcam') }, { name: 'names', type: 'list', label: L('names', 'nomi') }, { name: 'count', type: 'number', label: L('count', 'quante') }],
    async run(inputs, b) {
      const { cameras } = await b.call('hw.webcamList', {});
      return { cameras, names: cameras.map(c => c.name), count: cameras.length };
    },
  },
  {
    type: T.photo, version: 1, category: 'hardware', icon: 'camera', label: L('takePhoto (snapshot)', 'takePhoto (scatta foto)'),
    description: L('Takes a photo with a webcam: to a file of your home and/or as an image for the windows', 'Scatta una foto con una webcam: in un file della tua home e/o come immagine per le finestre'),
    inputs: [{ name: 'take', type: 'pulse', label: L('take', 'scatta') }, pathInput],
    outputs: [
      { name: 'image', type: 'text', label: L('image (data URL)', 'immagine (data URL)') },
      { name: 'path', type: 'text', label: L('file saved', 'file salvato') },
      { name: 'taken', type: 'pulse', label: L('taken', 'scattata') },
    ],
    config: [
      cameraField,
      { key: 'save', type: 'checkbox', default: false, label: L('Save it to a file', 'Salvala in un file') },
      { key: 'path', type: 'text', default: '~/foto-{now}.jpg', label: L('File (.jpg; {now} = date and time)', 'File (.jpg; {now} = data e ora)'), when: { save: true } },
      { key: 'sendImage', type: 'checkbox', default: true, label: L('Send the image to «image»', 'Manda l\'immagine su «immagine»') },
      { key: 'width', type: 'number', default: 640, min: 16, max: 1280, label: L('Width at most (px)', 'Larghezza massima (px)') },
      { key: 'height', type: 'number', default: 480, min: 16, max: 720, label: L('Height at most (px)', 'Altezza massima (px)') },
      { key: 'quality', type: 'number', default: 85, min: 1, max: 100, label: L('JPEG quality (1-100)', 'Qualità JPEG (1-100)') },
      { key: 'warmup', type: 'number', default: 1, min: 0, max: 5, label: L('Warm-up (seconds)', 'Riscaldamento (secondi)') },
    ],
    async run(inputs, b) {
      if (b.trigger === 'path') return undefined;
      const c = b.config;
      const save = c.save === true || given(inputs.path);
      const r = await b.call('hw.photo', { camera: c.camera, path: save ? pathOf(inputs, b) : '', image: c.sendImage !== false, width: c.width, height: c.height, quality: c.quality, warmup: c.warmup });
      return { image: r.image, path: r.path, taken: PULSE };
    },
  },
  {
    type: T.webcamStream, version: 1, category: 'hardware', icon: 'image', label: L('Webcam frames (stream)', 'Fotogrammi webcam (stream)'),
    description: L('Images from a webcam, a few a second, as data URLs for an Image of a window', 'Immagini da una webcam, poche al secondo, come data URL per un\'Immagine di una finestra'),
    inputs: [{ name: 'on', type: 'bool', label: L('on', 'acceso') }],
    outputs: [{ name: 'image', type: 'text', label: L('image (data URL)', 'immagine (data URL)') }, { name: 'running', type: 'bool', label: L('running', 'in corso') }],
    config: [
      cameraField,
      { key: 'fps', type: 'number', default: 2, min: 0.1, max: 10, label: L('Frames a second (at most 10)', 'Fotogrammi al secondo (al massimo 10)') },
      { key: 'width', type: 'number', default: 320, min: 16, max: 1280, label: L('Width at most (px)', 'Larghezza massima (px)') },
      { key: 'height', type: 'number', default: 240, min: 16, max: 720, label: L('Height at most (px)', 'Altezza massima (px)') },
      { key: 'quality', type: 'number', default: 70, min: 1, max: 100, label: L('JPEG quality (1-100)', 'Qualità JPEG (1-100)') },
      atStartField('Starts on its own', 'Parte da solo'),
    ],
    async start(b) {
      if (b.config.atStart) await streamOn(b).catch(err => b.send('error', exception(b, T.webcamStream, err?.message ?? err)));
    },
    async run({ on }, b) {
      if (isOn(on)) { await streamOn(b); return undefined; }
      return (await release(b)) ? { running: false } : undefined;
    },
    stop,
  },
  {
    type: T.videoRecord, version: 1, category: 'hardware', icon: 'record', label: L('MediaRecorder video (record video)', 'MediaRecorder video (registra video)'),
    inputs: [{ name: 'start', type: 'pulse', label: L('start', 'avvia') }, { name: 'stop', type: 'pulse', label: L('stop', 'ferma') }, pathInput],
    outputs: [
      { name: 'saved', type: 'text', label: L('file saved', 'file salvato') }, { name: 'size', type: 'number', label: L('size (bytes)', 'dimensione (byte)') },
      { name: 'seconds', type: 'number', label: L('seconds', 'secondi') }, { name: 'recording', type: 'bool', label: L('recording', 'registra') },
    ],
    config: [
      cameraField,
      micField('Sound from (microphone name; empty: no sound)', 'Audio da (nome del microfono; vuoto: senza audio)'),
      { key: 'path', type: 'text', default: '~/video-{now}.mp4', label: L('File (.mp4, .mkv, .avi; {now} = date and time)', 'File (.mp4, .mkv, .avi; {now} = data e ora)') },
      { key: 'maxSeconds', type: 'number', default: 60, min: 1, max: 1800, label: L('Length at most (seconds)', 'Durata massima (secondi)') },
      { key: 'width', type: 'number', default: 1280, min: 16, max: 1280, label: L('Width at most (px)', 'Larghezza massima (px)') },
      { key: 'height', type: 'number', default: 720, min: 16, max: 720, label: L('Height at most (px)', 'Altezza massima (px)') },
    ],
    ...recorder(T.videoRecord, 'video'),
  },

  // ---------------------------------------------------------------- Audio
  {
    type: T.audioDevices, version: 1, category: 'hardware', icon: 'music', label: L('enumerateDevices (audio devices)', 'enumerateDevices (dispositivi audio)'),
    inputs: [{ name: 'list', type: 'pulse', label: L('list', 'elenca') }],
    outputs: [
      { name: 'inputs', type: 'list', label: L('microphones', 'microfoni') }, { name: 'outputs', type: 'list', label: L('speakers', 'altoparlanti') },
      { name: 'voices', type: 'list', label: L('voices', 'voci') },
    ],
    async run(inputs, b) {
      const [dev, v] = await Promise.all([b.call('hw.audioDevices', {}), b.call('hw.voices', {}).catch(() => ({ voices: [] }))]);
      if (dev.warning) b.send('error', exception(b, T.audioDevices, dev.warning));
      return { inputs: dev.inputs, outputs: dev.outputs, voices: v.voices };
    },
  },
  {
    type: T.play, version: 1, category: 'hardware', icon: 'play', label: L('play() (play a sound)', 'play() (riproduci suono)'),
    inputs: [{ name: 'play', type: 'pulse', label: L('play', 'suona') }, pathInput],
    outputs: [{ name: 'ended', type: 'pulse', label: L('ended', 'finito') }],
    config: [
      { key: 'path', type: 'text', default: '~/suono.wav', label: L('File (.wav, .mp3…)', 'File (.wav, .mp3…)') },
      { key: 'maxSeconds', type: 'number', default: 120, min: 1, max: 600, label: L('Play at most (seconds)', 'Suona al massimo (secondi)') },
    ],
    run(inputs, b) {
      if (b.trigger === 'path') return undefined;
      later(b, T.play, b.call('hw.play', { path: pathOf(inputs, b), maxSeconds: b.config.maxSeconds }), () => b.send('ended', PULSE));
      return undefined;
    },
  },
  {
    type: T.tone, version: 1, category: 'hardware', icon: 'bell', label: L('Tone · Beep', 'Tono · Beep'),
    inputs: [
      { name: 'play', type: 'pulse', label: L('play', 'suona') },
      { name: 'hz', type: 'number', label: L('frequency (Hz)', 'frequenza (Hz)'), trigger: false, hidden: true },
      { name: 'seconds', type: 'number', label: L('seconds', 'secondi'), trigger: false, hidden: true },
    ],
    outputs: [{ name: 'ended', type: 'pulse', label: L('ended', 'finito') }],
    config: [
      { key: 'hz', type: 'number', default: 880, min: 20, max: 20000, label: L('Frequency (Hz)', 'Frequenza (Hz)') },
      { key: 'seconds', type: 'number', default: 0.2, min: 0.01, max: 10, label: L('Length (seconds)', 'Durata (secondi)') },
      { key: 'volume', type: 'number', default: 0.5, min: 0, max: 1, label: L('Volume (0-1)', 'Volume (0-1)') },
    ],
    run(inputs, b) {
      if (b.trigger !== 'play') return undefined;
      later(b, T.tone, b.call('hw.tone', { hz: given(inputs.hz) ? inputs.hz : b.config.hz, seconds: given(inputs.seconds) ? inputs.seconds : b.config.seconds, volume: b.config.volume }), () => b.send('ended', PULSE));
      return undefined;
    },
  },
  {
    type: T.speak, version: 1, category: 'hardware', icon: 'text', label: L('speechSynthesis.speak (text to speech)', 'speechSynthesis.speak (sintesi vocale)'),
    inputs: [{ name: 'text', type: 'text', label: L('text', 'testo') }, { name: 'speak', type: 'pulse', label: L('speak', 'parla'), hidden: true }],
    outputs: [{ name: 'ended', type: 'pulse', label: L('ended', 'finito') }],
    config: [
      { key: 'text', type: 'text', default: '', label: L('Text (when «text» has none)', 'Testo (quando «testo» non ne ha)') },
      { key: 'voice', type: 'text', default: '', label: L('Voice (name or language; empty: the default one)', 'Voce (nome o lingua; vuoto: quella predefinita)') },
      { key: 'rate', type: 'number', default: 0, min: -10, max: 10, label: L('Speed (-10 … 10)', 'Velocità (-10 … 10)') },
    ],
    run(inputs, b) {
      const said = text(given(inputs.text) ? inputs.text : b.config.text);
      if (!said.trim()) throw new Error('Non c\'è testo da leggere');
      later(b, T.speak, b.call('hw.speak', { text: said, voice: b.config.voice, rate: b.config.rate }), () => b.send('ended', PULSE));
      return undefined;
    },
  },
  {
    type: T.audioRecord, version: 1, category: 'hardware', icon: 'record', label: L('MediaRecorder audio (record audio)', 'MediaRecorder audio (registra audio)'),
    inputs: [{ name: 'start', type: 'pulse', label: L('start', 'avvia') }, { name: 'stop', type: 'pulse', label: L('stop', 'ferma') }, pathInput],
    outputs: [
      { name: 'saved', type: 'text', label: L('file saved', 'file salvato') }, { name: 'size', type: 'number', label: L('size (bytes)', 'dimensione (byte)') },
      { name: 'seconds', type: 'number', label: L('seconds', 'secondi') }, { name: 'recording', type: 'bool', label: L('recording', 'registra') },
    ],
    config: [
      micField(),
      { key: 'path', type: 'text', default: '~/audio-{now}.wav', label: L('File (.wav, .flac, .m4a, .mp3, .ogg; {now} = date and time)', 'File (.wav, .flac, .m4a, .mp3, .ogg; {now} = data e ora)') },
      { key: 'maxSeconds', type: 'number', default: 60, min: 1, max: 1800, label: L('Length at most (seconds)', 'Durata massima (secondi)') },
    ],
    ...recorder(T.audioRecord, 'audio'),
  },
  {
    type: T.micLevel, version: 1, category: 'hardware', icon: 'gauge', label: L('Microphone level (dB)', 'Livello microfono (dB)'),
    inputs: [{ name: 'on', type: 'bool', label: L('on', 'acceso') }],
    outputs: [
      { name: 'db', type: 'number', label: L('level (dB)', 'livello (dB)') }, { name: 'peak', type: 'number', label: L('peak (dB)', 'picco (dB)'), hidden: true },
      { name: 'over', type: 'bool', label: L('over the threshold', 'sopra la soglia') }, { name: 'loud', type: 'pulse', label: L('got loud', 'diventato forte') },
    ],
    config: [
      micField(),
      { key: 'hz', type: 'number', default: 5, min: 0.5, max: 20, label: L('Measures a second', 'Misure al secondo') },
      { key: 'threshold', type: 'number', default: -30, min: -120, max: 0, label: L('Threshold (dB)', 'Soglia (dB)') },
      atStartField('Starts on its own', 'Parte da solo'),
    ],
    async start(b) {
      if (b.config.atStart) await micOn(b).catch(err => b.send('error', exception(b, T.micLevel, err?.message ?? err)));
    },
    async run({ on }, b) {
      if (isOn(on)) await micOn(b);
      else await release(b);
      return undefined;
    },
    stop,
  },
  {
    type: T.volume, version: 1, category: 'hardware', icon: 'slider', label: L('System volume (get · set · mute)', 'Volume di sistema (get · set · mute)'),
    inputs: [
      { name: 'read', type: 'pulse', label: L('read', 'leggi') },
      { name: 'set', type: 'number', label: L('set (0-100)', 'imposta (0-100)') },
      { name: 'mute', type: 'bool', label: L('mute', 'muto') },
    ],
    outputs: [{ name: 'volume', type: 'number', label: L('volume (0-100)', 'volume (0-100)') }, { name: 'muted', type: 'bool', label: L('muted', 'muto') }],
    async run(inputs, b) {
      const args = b.trigger === 'set' ? { volume: Math.round(Number(inputs.set)) } : b.trigger === 'mute' ? { mute: isOn(inputs.mute) } : {};
      if (b.trigger === 'set' && !Number.isFinite(args.volume)) throw new Error('Il volume è un numero da 0 a 100');
      const r = await b.call('hw.volume', args);
      return { volume: r.volume, muted: r.muted };
    },
  },

  // ---------------------------------------------------------------- MIDI
  {
    type: T.midi, version: 1, category: 'hardware', icon: 'music', label: L('MIDI in · out', 'MIDI ingresso · uscita'),
    description: L('Receives notes, controls and program changes from a MIDI port and sends them to another', 'Riceve note, controlli e cambi di programma da una porta MIDI e li manda a un\'altra'),
    inputs: [
      { name: 'open', type: 'pulse', label: L('open', 'apri') },
      { name: 'close', type: 'pulse', label: L('close', 'chiudi') },
      { name: 'send', type: 'any', label: L('send', 'invia') },
      { name: 'list', type: 'pulse', label: L('list ports', 'elenca porte'), hidden: true },
    ],
    outputs: [
      { name: 'message', type: 'object', label: L('message', 'messaggio') },
      { name: 'note', type: 'object', label: L('note', 'nota') },
      { name: 'cc', type: 'object', label: L('control (CC)', 'controllo (CC)') },
      { name: 'program', type: 'object', label: L('program change', 'cambio programma'), hidden: true },
      { name: 'ports', type: 'object', label: L('ports', 'porte'), hidden: true },
      { name: 'opened', type: 'pulse', label: L('opened', 'aperto') },
      { name: 'closed', type: 'pulse', label: L('closed', 'chiuso') },
    ],
    config: [
      { key: 'input', type: 'text', default: '', label: L('Input port (name; empty: none)', 'Porta di ingresso (nome; vuoto: nessuna)') },
      { key: 'output', type: 'text', default: '', label: L('Output port (name; empty: none)', 'Porta di uscita (nome; vuoto: nessuna)') },
      { key: 'channel', type: 'number', default: 0, min: 0, max: 16, label: L('Only channel (0 = all)', 'Solo il canale (0 = tutti)') },
      atStartField('Open at start', 'Apri all\'avvio'),
    ],
    async start(b) {
      if (b.config.atStart) {
        try { await openMidi(b); b.send('opened', PULSE); } catch (err) { b.send('error', exception(b, T.midi, err?.message ?? err)); }
      }
    },
    async run(inputs, b) {
      const m = b.memory();
      switch (b.trigger) {
        case 'list': return { ports: await b.call('hw.midiList', {}) };
        case 'open': await openMidi(b); return { opened: PULSE };
        case 'close': {
          const out = m.out;
          m.out = null;
          const closed = await release(b);
          if (out) await b.call('hw.close', { handle: out }).catch(() => {});
          return closed || out ? { closed: PULSE } : undefined;
        }
        case 'send': {
          if (!m.out) throw new Error('La porta MIDI di uscita non è aperta: scrivila nelle Proprietà e manda un impulso ad «apri»');
          const v = inputs.send;
          const msgs = Array.isArray(v) && v.length && typeof v[0] === 'object' ? v : [v];
          const channel = Number(b.config.channel) || null;
          await b.call('hw.midiSend', { handle: m.out, messages: msgs.map(x => (x && typeof x === 'object' && !Array.isArray(x) && channel && x.channel === undefined ? { ...x, channel } : x)) });
          return undefined;
        }
        default: return undefined;
      }
    },
    async stop(b) {
      const m = b.memory();
      const out = m.out;
      m.out = null;
      await release(b);
      if (out) await b.call('hw.close', { handle: out }).catch(() => {});
    },
  },

  // ---------------------------------------------------------------- Sistema
  {
    type: T.systemInfo, version: 1, category: 'hardware', icon: 'monitor', label: L('os (system info)', 'os (info di sistema)'),
    inputs: [{ name: 'read', type: 'pulse', label: L('read', 'leggi') }],
    outputs: [
      { name: 'info', type: 'object', label: L('info', 'info') }, { name: 'cpu', type: 'number', label: L('CPU load (%)', 'carico CPU (%)') },
      { name: 'memory', type: 'number', label: L('memory used (%)', 'memoria usata (%)') }, { name: 'temperature', type: 'number', label: L('temperature (°C)', 'temperatura (°C)') },
      { name: 'uptime', type: 'number', label: L('on for (seconds)', 'acceso da (secondi)'), hidden: true },
    ],
    config: [pollField()],
    start(b) { every(b, T.systemInfo, b.config.seconds, () => readInfo(b)); },
    run(inputs, b) { return readInfo(b); },
  },
  {
    type: T.battery, version: 1, category: 'hardware', icon: 'power', label: L('getBattery (battery)', 'getBattery (batteria)'),
    inputs: [{ name: 'read', type: 'pulse', label: L('read', 'leggi') }],
    outputs: [
      { name: 'battery', type: 'object', label: L('battery', 'batteria') }, { name: 'percent', type: 'number', label: L('charge (%)', 'carica (%)') },
      { name: 'charging', type: 'bool', label: L('charging', 'in carica') }, { name: 'plugged', type: 'bool', label: L('plugged in', 'alimentato') },
      { name: 'low', type: 'pulse', label: L('got low', 'scarica') },
    ],
    config: [pollField(60), { key: 'threshold', type: 'number', default: 20, min: 1, max: 99, label: L('Low under (%)', 'Scarica sotto (%)') }],
    start(b) { every(b, T.battery, b.config.seconds, () => readBattery(b)); },
    run(inputs, b) { return readBattery(b); },
  },
  {
    type: T.disks, version: 1, category: 'hardware', icon: 'disk', label: L('fsSize (disks)', 'fsSize (dischi)'),
    inputs: [{ name: 'read', type: 'pulse', label: L('read', 'leggi') }],
    outputs: [{ name: 'disks', type: 'list', label: L('disks', 'dischi') }, { name: 'fullest', type: 'number', label: L('fullest (%)', 'il più pieno (%)') }],
    config: [pollField()],
    start(b) { every(b, T.disks, b.config.seconds, () => readDisks(b)); },
    run(inputs, b) { return readDisks(b); },
  },
  {
    type: T.network, version: 1, category: 'hardware', icon: 'globe', label: L('networkInterfaces (network)', 'networkInterfaces (interfacce di rete)'),
    inputs: [{ name: 'read', type: 'pulse', label: L('read', 'leggi') }],
    outputs: [
      { name: 'interfaces', type: 'list', label: L('interfaces', 'interfacce') }, { name: 'ip', type: 'text', label: L('IP (main interface)', 'IP (interfaccia principale)') },
      { name: 'changed', type: 'pulse', label: L('changed', 'cambiate') },
    ],
    config: [pollField(), { key: 'internal', type: 'checkbox', default: false, label: L('Internal ones too (loopback)', 'Anche quelle interne (loopback)') }],
    start(b) { every(b, T.network, b.config.seconds, () => readNetwork(b, true)); },
    run(inputs, b) { return readNetwork(b, false); },
  },
  {
    type: T.printers, version: 1, category: 'hardware', icon: 'file', label: L('Printers · Print (lp)', 'Stampanti · Stampa (lp)'),
    inputs: [{ name: 'list', type: 'pulse', label: L('list', 'elenca') }, { name: 'print', type: 'pulse', label: L('print', 'stampa') }, pathInput],
    outputs: [{ name: 'printers', type: 'list', label: L('printers', 'stampanti') }, { name: 'printed', type: 'pulse', label: L('sent to the printer', 'mandato in stampa') }],
    config: [
      { key: 'printer', type: 'text', default: '', label: L('Printer (name; empty: the default one)', 'Stampante (nome; vuoto: quella predefinita)') },
      { key: 'path', type: 'text', default: '~/stampa.txt', label: L('File (.txt, .pdf, .png, .jpg…)', 'File (.txt, .pdf, .png, .jpg…)') },
    ],
    async run(inputs, b) {
      if (b.trigger === 'list') return { printers: (await b.call('hw.printers', {})).printers };
      if (b.trigger !== 'print') return undefined;
      await b.call('hw.print', { path: pathOf(inputs, b), printer: b.config.printer });
      return { printed: PULSE };
    },
  },

  // ---------------------------------------------------------------- Linux, Raspberry Pi
  {
    type: T.gpio, version: 1, category: 'hardware', icon: 'lamp', label: L('GPIO (gpioget · gpioset)', 'GPIO (gpioget · gpioset)'),
    description: L('A GPIO line of a Linux board: read, write, edges, PWM', 'Una linea GPIO di una scheda Linux: leggere, scrivere, fronti, PWM'),
    inputs: [
      { name: 'read', type: 'pulse', label: L('read', 'leggi') },
      { name: 'write', type: 'bool', label: L('write', 'scrivi') },
      { name: 'duty', type: 'number', label: L('PWM duty (0-1)', 'PWM duty (0-1)'), hidden: true },
      { name: 'on', type: 'bool', label: L('watch edges', 'sorveglia i fronti'), hidden: true },
    ],
    outputs: [
      { name: 'value', type: 'bool', label: L('value', 'valore') },
      { name: 'rising', type: 'pulse', label: L('rising edge', 'fronte di salita') },
      { name: 'falling', type: 'pulse', label: L('falling edge', 'fronte di discesa') },
    ],
    config: [
      { key: 'mode', type: 'select', default: 'input', label: L('Use', 'Uso'), options: [
        { value: 'input', label: L('Input: read', 'Ingresso: leggi') }, { value: 'output', label: L('Output: write', 'Uscita: scrivi') },
        { value: 'edges', label: L('Input: edges', 'Ingresso: fronti') }, { value: 'pwm', label: L('PWM (sysfs)', 'PWM (sysfs)') },
      ] },
      { key: 'chip', type: 'text', default: 'gpiochip0', label: L('Chip', 'Chip'), when: { mode: ['input', 'output', 'edges'] } },
      { key: 'line', type: 'number', default: 17, min: 0, max: 1023, label: L('Line (offset; BCM number on a Raspberry Pi)', 'Linea (offset; numero BCM su un Raspberry Pi)'), when: { mode: ['input', 'output', 'edges'] } },
      { key: 'bias', type: 'select', default: 'as-is', label: L('Resistor', 'Resistenza'), when: { mode: ['input', 'edges'] }, options: [
        { value: 'as-is', label: L('As it is', 'Com\'è') }, { value: 'pull-up', label: L('Pull-up', 'Pull-up') }, { value: 'pull-down', label: L('Pull-down', 'Pull-down') }, { value: 'disable', label: L('None', 'Nessuna') },
      ] },
      { key: 'edge', type: 'select', default: 'both', label: L('Edges', 'Fronti'), when: { mode: 'edges' }, options: [
        { value: 'both', label: L('Both', 'Entrambi') }, { value: 'rising', label: L('Rising', 'Salita') }, { value: 'falling', label: L('Falling', 'Discesa') },
      ] },
      { key: 'pwmChip', type: 'number', default: 0, min: 0, max: 63, label: L('PWM chip', 'Chip PWM'), when: { mode: 'pwm' } },
      { key: 'channel', type: 'number', default: 0, min: 0, max: 63, label: L('PWM channel', 'Canale PWM'), when: { mode: 'pwm' } },
      { key: 'frequency', type: 'number', default: 1000, min: 1, max: 1000000, label: L('PWM frequency (Hz)', 'Frequenza PWM (Hz)'), when: { mode: 'pwm' } },
      atStartField('Starts on its own (edges)', 'Parte da solo (fronti)', true),
    ],
    async start(b) {
      if (b.config.mode === 'edges' && b.config.atStart) await gpioEdges(b).catch(err => b.send('error', exception(b, T.gpio, err?.message ?? err)));
    },
    async run(inputs, b) {
      const c = b.config;
      const m = b.memory();
      if (c.mode === 'input' && b.trigger === 'read') return { value: (await b.call('hw.gpioRead', { chip: c.chip, line: c.line, bias: c.bias })).value === 1 };
      if (c.mode === 'output' && b.trigger === 'write') {
        const value = isOn(inputs.write);
        if (m.handle) await b.call('hw.gpioWrite', { handle: m.handle, value });
        else m.handle = (await b.call('hw.gpioOutput', { chip: c.chip, line: c.line, value })).handle;
        return { value };
      }
      if (c.mode === 'edges' && b.trigger === 'on') { if (isOn(inputs.on)) await gpioEdges(b); else await release(b); return undefined; }
      if (c.mode === 'pwm' && b.trigger === 'duty') {
        const duty = Number(inputs.duty);
        await b.call('hw.pwm', { pwmChip: c.pwmChip, channel: c.channel, periodNs: Math.round(1e9 / Math.max(1, Number(c.frequency) || 1000)), duty, enabled: duty > 0 });
        m.pwm = duty > 0;
        return undefined;
      }
      throw new Error(`L'ingresso «${b.trigger}» non serve nell'uso scelto (${c.mode}): cambia l'uso nelle Proprietà`);
    },
    async stop(b) {
      const m = b.memory();
      if (m.pwm) await b.call('hw.pwm', { pwmChip: b.config.pwmChip, channel: b.config.channel, enabled: false }).catch(() => {});
      await release(b);
    },
  },
  {
    type: T.i2c, version: 1, category: 'hardware', icon: 'chip', label: L('I²C (i2cget · i2cset)', 'I²C (i2cget · i2cset)'),
    description: L('Reads and writes the registers of an I²C device of a Linux board', 'Legge e scrive i registri di un dispositivo I²C di una scheda Linux'),
    inputs: [{ name: 'read', type: 'pulse', label: L('read', 'leggi') }, { name: 'write', type: 'any', label: L('write', 'scrivi') }],
    outputs: [
      { name: 'value', type: 'number', label: L('value', 'valore') }, { name: 'data', type: 'list', label: L('bytes', 'byte') },
      { name: 'done', type: 'pulse', label: L('done', 'fatto') }, { name: 'addresses', type: 'list', label: L('addresses found', 'indirizzi trovati'), hidden: true },
    ],
    config: [
      { key: 'bus', type: 'number', default: 1, min: 0, max: 255, label: L('Bus (/dev/i2c-N)', 'Bus (/dev/i2c-N)') },
      { key: 'address', type: 'text', default: '0x48', label: L('Device address (0x03-0x77)', 'Indirizzo del dispositivo (0x03-0x77)') },
      { key: 'register', type: 'text', default: '0x00', label: L('Register', 'Registro') },
      { key: 'size', type: 'select', default: 'byte', label: L('Size', 'Dimensione'), options: [
        { value: 'byte', label: L('Byte', 'Byte') }, { value: 'word', label: L('Word (16 bit)', 'Word (16 bit)') }, { value: 'block', label: L('Block (bytes)', 'Blocco (byte)') },
      ] },
      { key: 'length', type: 'number', default: 2, min: 1, max: 32, label: L('Bytes to read', 'Byte da leggere'), when: { size: 'block' } },
      { key: 'scan', type: 'checkbox', default: false, label: L('«read» scans the bus (i2cdetect)', '«leggi» cerca sul bus (i2cdetect)') },
    ],
    async run(inputs, b) {
      const c = b.config;
      const base = { bus: c.bus, address: c.address, register: c.register };
      if (b.trigger === 'read') {
        if (c.scan) return { addresses: (await b.call('hw.i2c', { op: 'scan', bus: c.bus })).addresses, done: PULSE };
        if (c.size === 'block') { const r = await b.call('hw.i2c', { ...base, op: 'readBlock', length: c.length }); return { data: r.data, value: r.data[0], done: PULSE }; }
        const r = await b.call('hw.i2c', { ...base, op: c.size === 'word' ? 'readWord' : 'readByte' });
        return { value: r.value, data: c.size === 'word' ? [r.value & 0xff, r.value >> 8] : [r.value], done: PULSE };
      }
      if (b.trigger !== 'write') return undefined;
      const v = inputs.write;
      if (Array.isArray(v) || c.size === 'block') await b.call('hw.i2c', { ...base, op: 'writeBlock', data: Array.isArray(v) ? v : [Number(v)] });
      else await b.call('hw.i2c', { ...base, op: c.size === 'word' ? 'writeWord' : 'writeByte', value: Number(v) });
      return { done: PULSE };
    },
  },
];

// ---------------------------------------------------------------- what the blocks above share

async function openSerial(inputs, b) {
  const c = b.config;
  const regex = c.framing === 'regex';
  const m = b.memory();
  m.rx = '';
  await keep(b, T.serial, () => b.call('hw.serialOpen', {
    path: given(inputs.path) ? text(inputs.path).trim() : c.path, baudRate: c.baudRate, dataBits: Number(c.dataBits), parity: c.parity,
    stopBits: Number(c.stopBits), flowControl: c.flowControl, framing: regex ? 'raw' : c.framing, delimiter: c.delimiter, length: c.length,
    encoding: regex ? 'text' : c.encoding,
  }), {
    onItem: item => {
      if (!regex) { b.send('data', item.data); return; }
      for (const frame of regexFrames(b.memory(), item.data, c.regex)) b.send('data', frame);
    },
    onEnd: () => b.send('closed', PULSE),
  });
}

function watchUsb(b) {
  return keep(b, T.usbHotplug, () => b.call('hw.usbWatch', { vendorId: b.config.vendorId, productId: b.config.productId }), {
    onItem: item => {
      b.send(item.event === 'attached' ? 'attached' : 'detached', item.device ?? {});
      b.send('event', { event: item.event, device: item.device ?? null });
    },
  });
}

function streamOn(b) {
  const c = b.config;
  b.send('running', true);
  return keep(b, T.webcamStream, () => b.call('hw.webcamStart', { camera: c.camera, fps: c.fps, width: c.width, height: c.height, quality: c.quality }), {
    onItem: item => b.send('image', item.image),
    onEnd: () => b.send('running', false),
  }).catch(err => { b.send('running', false); throw err; });
}

function micOn(b) {
  const c = b.config;
  const m = b.memory();
  m.over = false;
  return keep(b, T.micLevel, () => b.call('hw.micStart', { mic: c.mic, hz: c.hz }), {
    onItem: item => {
      const over = item.db >= Number(c.threshold);
      b.send('db', item.db);
      if (item.peak !== null && item.peak !== undefined) b.send('peak', item.peak);
      if (over !== m.over) { b.send('over', over); if (over) b.send('loud', PULSE); m.over = over; }
    },
  });
}

async function openMidi(b) {
  const c = b.config;
  const m = b.memory();
  const channel = Number(c.channel) || 0;
  if (!text(c.input).trim() && !text(c.output).trim()) throw new Error('Scegli una porta MIDI di ingresso o di uscita nelle Proprietà');
  if (m.out) { await b.call('hw.close', { handle: m.out }).catch(() => {}); m.out = null; }
  await release(b);
  if (text(c.output).trim()) m.out = (await b.call('hw.midiOpen', { direction: 'out', name: c.output })).handle;
  if (text(c.input).trim()) {
    await keep(b, T.midi, () => b.call('hw.midiOpen', { direction: 'in', name: c.input }), {
      onItem: msg => {
        if (channel && msg.channel !== channel) return;
        b.send('message', msg);
        if (msg.type === 'noteon' || msg.type === 'noteoff') b.send('note', msg);
        else if (msg.type === 'cc') b.send('cc', msg);
        else if (msg.type === 'program') b.send('program', msg);
      },
      onEnd: () => b.send('closed', PULSE),
    });
  }
}

async function readInfo(b) {
  const i = await b.call('hw.systemInfo', {});
  return { info: i, cpu: i.load, memory: i.memory.percent, temperature: i.temperature.main ?? i.temperature.max ?? null, uptime: i.uptime };
}

async function readBattery(b) {
  const r = await b.call('hw.battery', {});
  const m = b.memory();
  const low = r.present && r.percent !== null && r.percent < Number(b.config.threshold) && !r.charging;
  const out = { battery: r, percent: r.percent, charging: r.charging, plugged: r.plugged };
  if (low && !m.low) out.low = PULSE;
  m.low = low;
  return out;
}

async function readDisks(b) {
  const { disks } = await b.call('hw.disks', {});
  return { disks, fullest: disks.reduce((mx, d) => Math.max(mx, Number(d.percent) || 0), 0) };
}

async function readNetwork(b, polling) {
  const r = await b.call('hw.network', {});
  const list = r.interfaces.filter(n => b.config.internal || !n.internal);
  const main = list.find(n => n.default) ?? list.find(n => n.ip4 && !n.internal);
  const m = b.memory();
  const key = JSON.stringify(list.map(n => [n.name, n.ip4, n.ip6, n.up]));
  const changed = m.last !== undefined && m.last !== key;
  m.last = key;
  if (polling && !changed && m.sent) return {};
  m.sent = true;
  return { interfaces: list, ip: main?.ip4 ?? '', ...(changed ? { changed: PULSE } : {}) };
}

function gpioEdges(b) {
  const c = b.config;
  return keep(b, T.gpio, () => b.call('hw.gpioWatch', { chip: c.chip, line: c.line, edge: c.edge, bias: c.bias }), {
    onItem: ev => {
      b.send('value', ev.edge === 'rising');
      b.send(ev.edge === 'rising' ? 'rising' : 'falling', PULSE);
    },
  });
}
