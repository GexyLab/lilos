/**
 * What every part of the package uses: the error for the program (Italian, safe to show), the
 * checks of the arguments that come from the blocks (never trusted: a block's settings and inputs
 * are the user's data), the bytes a block sends.
 */

export const oops = message => Object.assign(new Error(message), { lsUser: true });

export const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
export const argsOf = args => (plain(args) ? args : {});

/** An integer in [min, max], or the fallback when missing; anything else is refused. */
export function int(v, min, max, what, fallback) {
  if ((v === undefined || v === null || v === '') && fallback !== undefined) return fallback;
  const n = typeof v === 'string' && /^\s*0x[0-9a-f]+\s*$/i.test(v) ? Number.parseInt(v, 16) : Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw oops(`${what} non valido: ${String(v).slice(0, 40)} (da ${min} a ${max})`);
  return n;
}

/** A number in [min, max] (not only integers). */
export function num(v, min, max, what, fallback) {
  if ((v === undefined || v === null || v === '') && fallback !== undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw oops(`${what} non valido: ${String(v).slice(0, 40)} (da ${min} a ${max})`);
  return n;
}

export function oneOf(v, list, what, fallback) {
  if ((v === undefined || v === null || v === '') && fallback !== undefined) return fallback;
  if (!list.includes(v)) throw oops(`${what} non valido: ${String(v).slice(0, 40)} (${list.join(', ')})`);
  return v;
}

/** A short text from a block (a name, a device), cut and without control characters. */
export const short = (v, max = 200) => (v === undefined || v === null ? '' : String(v)).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);

/** A USB vendor or product id: 0x2341, 2341 (hex, as the lists show them) or a number. */
export function usbId(v, what) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number') return int(v, 0, 0xffff, what);
  const s = String(v).trim().toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{1,4}$/.test(s)) throw oops(`${what} non valido: ${String(v).slice(0, 20)} (scrivi 4 cifre esadecimali, come 2341)`);
  return Number.parseInt(s, 16);
}

export const hex4 = n => (Number.isInteger(n) ? n.toString(16).padStart(4, '0') : '');

/**
 * The bytes of a value a block sends: text (UTF-8), hex («0a 1b ff», «0A1BFF») or bytes (a list
 * of numbers 0…255). At most `max` bytes.
 */
export function bytesFrom(value, encoding = 'text', max = 65536) {
  let buf;
  if (encoding === 'hex') {
    const s = String(value ?? '').replace(/[\s:,-]/g, '').replace(/^0x/i, '');
    if (!/^(?:[0-9a-fA-F]{2})*$/.test(s)) throw oops('Dati esadecimali non validi: servono coppie di cifre 0-9 a-f (per esempio «0a 1b ff»)');
    buf = Buffer.from(s, 'hex');
  } else if (encoding === 'bytes') {
    const list = Array.isArray(value) ? value : typeof value === 'number' ? [value] : null;
    if (!list) throw oops('Servono dei byte: una lista di numeri da 0 a 255');
    if (list.length > max) throw oops(`Troppi dati da mandare in una volta: ${list.length} byte (al massimo ${max})`);
    if (list.some(b => !Number.isInteger(b) || b < 0 || b > 255)) throw oops('Byte non valido: ogni numero va da 0 a 255');
    buf = Buffer.from(list);
  } else {
    buf = Buffer.from(value === undefined || value === null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value), 'utf8');
  }
  if (buf.length > max) throw oops(`Troppi dati da mandare in una volta: ${buf.length} byte (al massimo ${max})`);
  return buf;
}

/** Bytes for the program: text, hex («0a1bff») or a list of numbers. */
export function bytesTo(buf, encoding = 'text') {
  if (encoding === 'hex') return Buffer.from(buf).toString('hex');
  if (encoding === 'bytes') return [...buf];
  return Buffer.from(buf).toString('utf8');
}

export const sleep = (ms, signal) => new Promise(resolve => {
  const t = setTimeout(done, ms);
  function done() { clearTimeout(t); signal?.removeEventListener?.('abort', done); resolve(); }
  signal?.addEventListener?.('abort', done, { once: true });
});

export function withTimeout(promise, ms, message) {
  let t;
  return Promise.race([promise, new Promise((_, rej) => { t = setTimeout(() => rej(oops(message)), ms); })]).finally(() => clearTimeout(t));
}

/** A promise from a function with a node-style callback (serialport). */
export const cb = fn => new Promise((resolve, reject) => fn((err, v) => (err ? reject(err) : resolve(v))));
