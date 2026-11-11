import { argsOf, int, oneOf, oops, plain, short } from './common.js';
import { lib } from './native.js';

/**
 * MIDI (@julusian/midi, RtMidi): the ports, an input opened by a program (exclusive: on Windows
 * an input has one reader) whose messages become objects, an output to send notes, controls and
 * program changes. System exclusive, clock and active sensing are left out.
 */

const TYPES = ['noteon', 'noteoff', 'cc', 'program', 'pitchbend', 'aftertouch', 'polyaftertouch'];

/** A MIDI message (bytes) as an object for the program. */
export function parseMidi(bytes) {
  const [status = 0, d1 = 0, d2 = 0] = bytes;
  const kind = status & 0xf0, channel = (status & 0x0f) + 1;
  switch (kind) {
    case 0x90: return d2 === 0 ? { type: 'noteoff', channel, note: d1, velocity: 0 } : { type: 'noteon', channel, note: d1, velocity: d2 };
    case 0x80: return { type: 'noteoff', channel, note: d1, velocity: d2 };
    case 0xb0: return { type: 'cc', channel, controller: d1, value: d2 };
    case 0xc0: return { type: 'program', channel, program: d1 };
    case 0xe0: return { type: 'pitchbend', channel, value: (d2 << 7 | d1) - 8192 };
    case 0xd0: return { type: 'aftertouch', channel, value: d1 };
    case 0xa0: return { type: 'polyaftertouch', channel, note: d1, value: d2 };
    default: return { type: 'other', bytes: [...bytes].slice(0, 3) };
  }
}

/** The bytes of a message from the program: an object { type, channel, … } or a list of 1…3 bytes. */
export function midiBytes(msg) {
  if (Array.isArray(msg)) {
    if (msg.length < 1 || msg.length > 3 || msg.some(b => !Number.isInteger(b) || b < 0 || b > 255)) throw oops('Messaggio MIDI non valido: da 1 a 3 byte (numeri da 0 a 255)');
    if (msg[0] < 0x80 || msg[0] === 0xf0 || msg[0] === 0xf7) throw oops('Messaggio MIDI non valido: il primo byte è lo stato (da 128), niente System Exclusive');
    return msg;
  }
  if (!plain(msg)) throw oops('Messaggio MIDI non valido: serve un oggetto { type, channel, … } o una lista di byte');
  const type = oneOf(msg.type, TYPES, 'Tipo del messaggio MIDI');
  const ch = int(msg.channel, 1, 16, 'Canale MIDI', 1) - 1;
  const b7 = (v, what, d) => int(v, 0, 127, what, d);
  switch (type) {
    case 'noteon': return [0x90 | ch, b7(msg.note, 'Nota'), b7(msg.velocity, 'Velocity', 100)];
    case 'noteoff': return [0x80 | ch, b7(msg.note, 'Nota'), b7(msg.velocity, 'Velocity', 0)];
    case 'cc': return [0xb0 | ch, b7(msg.controller, 'Controller'), b7(msg.value, 'Valore')];
    case 'program': return [0xc0 | ch, b7(msg.program, 'Programma')];
    case 'aftertouch': return [0xd0 | ch, b7(msg.value, 'Valore')];
    case 'polyaftertouch': return [0xa0 | ch, b7(msg.note, 'Nota'), b7(msg.value, 'Valore')];
    default: {
      const v = int(msg.value, -8192, 8191, 'Pitch bend', 0) + 8192;
      return [0xe0 | ch, v & 0x7f, v >> 7];
    }
  }
}

function names(port) {
  const n = port.getPortCount();
  return Array.from({ length: n }, (_, i) => port.getPortName(i));
}

export function midiActions({ handles, need }) {
  async function ports() {
    const midi = await lib('midi');
    const i = new midi.Input(), o = new midi.Output();
    try { return { inputs: names(i), outputs: names(o) }; } finally { try { i.destroy(); } catch { /* */ } try { o.destroy(); } catch { /* */ } }
  }

  const pick = (list, name, what) => {
    const n = short(name, 200);
    const idx = list.indexOf(n);
    if (idx === -1) throw oops(`La porta MIDI ${what} «${n}» non c'è (porte: ${list.join(', ') || 'nessuna'})`);
    return idx;
  };

  return {
    async 'hw.midiList'(user) {
      need(user, 'midi');
      return await ports();
    },

    async 'hw.midiOpen'(user, args, tools) {
      need(user, 'midi');
      const a = argsOf(args);
      const dir = oneOf(a.direction ?? 'in', ['in', 'out'], 'Direzione');
      const midi = await lib('midi');
      const { inputs, outputs } = await ports();
      const index = pick(dir === 'in' ? inputs : outputs, a.name, dir === 'in' ? 'di ingresso' : 'di uscita');
      const name = (dir === 'in' ? inputs : outputs)[index];
      const h = handles.create(user, tools, { cls: 'midi', kind: dir === 'in' ? 'midiIn' : 'midiOut', resource: dir === 'in' ? `midi-in:${name}` : null, label: `MIDI ${name}`, maxItems: 2000 });
      const port = dir === 'in' ? new midi.Input() : new midi.Output();
      try {
        port.openPort(index);
      } catch (err) {
        handles.drop(h);
        try { port.destroy(); } catch { /* */ }
        throw oops(`La porta MIDI «${name}» non si apre: ${err?.message ?? err}`);
      }
      if (dir === 'in') {
        port.ignoreTypes(true, true, true);
        port.on('message', (dt, bytes) => handles.push(h, parseMidi(bytes), 96));
      }
      h.data.port = port;
      h.closeFn = () => { try { port.closePort(); } catch { /* */ } try { port.destroy(); } catch { /* */ } };
      return { handle: h.id, name };
    },

    async 'hw.midiSend'(user, args, tools) {
      need(user, 'midi');
      const a = argsOf(args);
      const h = handles.get(user, tools, a.handle, ['midiOut']);
      if (h.closed) throw oops(`${h.label} è chiusa`);
      const list = Array.isArray(a.messages) ? a.messages : [a.message];
      if (list.length > 64) throw oops('Troppi messaggi MIDI in una volta (al massimo 64)');
      const all = list.map(midiBytes);
      for (const bytes of all) h.data.port.sendMessage(bytes);
      return { sent: all.length };
    },
  };
}
