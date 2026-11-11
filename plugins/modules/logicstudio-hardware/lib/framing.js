import { StringDecoder } from 'node:string_decoder';
import { oops } from './common.js';

/**
 * How the bytes of a serial port become messages for the program (in the kernel's main thread:
 * only linear work here; the «regex» framing is done by the block, in the user's worker, so a
 * costly expression slows only that user):
 *
 *   line        up to \n (a \r before it goes too): «riga»
 *   delimiter   up to the delimiter chosen (escapes \n \r \t \0 \\ \xHH, 1…16 bytes)
 *   length      every `length` bytes
 *   raw         as they come (text: never a character cut in two)
 *
 * A message never grows past maxLength: then what is there goes out as it is.
 */

export const FRAMINGS = ['line', 'delimiter', 'length', 'raw'];
export const ENCODINGS = ['text', 'hex', 'bytes'];
export const MAX_FRAME = 65536;

/** The bytes of a delimiter written with escapes: '\\r\\n' → <0d 0a>. */
export function parseDelimiter(text) {
  const s = String(text ?? '');
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c !== '\\') { out.push(...Buffer.from(c, 'utf8')); continue; }
    const n = s[++i];
    if (n === 'n') out.push(10);
    else if (n === 'r') out.push(13);
    else if (n === 't') out.push(9);
    else if (n === '0') out.push(0);
    else if (n === '\\') out.push(92);
    else if (n === 'x' && /^[0-9a-fA-F]{2}$/.test(s.slice(i + 1, i + 3))) { out.push(Number.parseInt(s.slice(i + 1, i + 3), 16)); i += 2; }
    else throw oops(`Delimitatore non valido: «\\${n ?? ''}» (usa \\n, \\r, \\t, \\0, \\\\ o \\xHH)`);
  }
  if (!out.length || out.length > 16) throw oops('Il delimitatore deve avere da 1 a 16 byte');
  return Buffer.from(out);
}

export class Framer {
  #mode; #delimiter; #length; #max; #encoding;
  #buf = Buffer.alloc(0);
  #decoder;

  constructor({ mode = 'line', delimiter = '\\n', length = 8, maxLength = 4096, encoding = 'text' } = {}) {
    if (!FRAMINGS.includes(mode)) throw oops(`Divisione dei messaggi non valida: ${mode}`);
    if (!ENCODINGS.includes(encoding)) throw oops(`Codifica non valida: ${encoding}`);
    this.#mode = mode;
    this.#encoding = encoding;
    this.#max = Math.max(1, Math.min(MAX_FRAME, Math.floor(Number(maxLength) || 4096)));
    if (mode === 'line') this.#delimiter = Buffer.from([10]);
    if (mode === 'delimiter') this.#delimiter = parseDelimiter(delimiter);
    if (mode === 'length') {
      const n = Number(length);
      if (!Number.isInteger(n) || n < 1 || n > MAX_FRAME) throw oops(`Lunghezza dei messaggi non valida: ${length} (da 1 a ${MAX_FRAME} byte)`);
      this.#length = n;
    }
    if (mode === 'raw' && encoding === 'text') this.#decoder = new StringDecoder('utf8');
  }

  /** The messages that the bytes of `chunk` complete (encoded): [value]. */
  push(chunk) {
    const data = Buffer.from(chunk);
    if (this.#mode === 'raw') {
      if (this.#encoding === 'text') { const s = this.#decoder.write(data); return s ? [s] : []; }
      const out = [];
      for (let i = 0; i < data.length; i += this.#max) out.push(this.#encode(data.subarray(i, i + this.#max)));
      return out;
    }
    this.#buf = this.#buf.length ? Buffer.concat([this.#buf, data]) : data;
    const frames = [];
    if (this.#mode === 'length') {
      while (this.#buf.length >= this.#length) {
        frames.push(this.#buf.subarray(0, this.#length));
        this.#buf = this.#buf.subarray(this.#length);
      }
    } else {
      let at;
      let from = 0;
      while ((at = this.#buf.indexOf(this.#delimiter, from)) !== -1) {
        let frame = this.#buf.subarray(from, at);
        if (this.#mode === 'line' && frame.length && frame[frame.length - 1] === 13) frame = frame.subarray(0, -1);
        frames.push(frame);
        from = at + this.#delimiter.length;
      }
      this.#buf = this.#buf.subarray(from);
      // A message that never ends: out as it is, in pieces of maxLength
      while (this.#buf.length > this.#max) {
        frames.push(this.#buf.subarray(0, this.#max));
        this.#buf = this.#buf.subarray(this.#max);
      }
    }
    if (this.#buf.length) this.#buf = Buffer.from(this.#buf);   // not a view of a big chunk kept alive
    return frames.map(f => this.#encode(f));
  }

  /** What is left (the port closes): [value] or []. */
  flush() {
    if (this.#mode === 'raw') { const s = this.#decoder?.end(); return s ? [s] : []; }
    const rest = this.#buf;
    this.#buf = Buffer.alloc(0);
    return rest.length ? [this.#encode(rest)] : [];
  }

  #encode(buf) {
    if (this.#encoding === 'hex') return Buffer.from(buf).toString('hex');
    if (this.#encoding === 'bytes') return [...buf];
    return Buffer.from(buf).toString('utf8');
  }
}

/** The size of a value in a queue (to bound it in bytes). */
export const sizeOf = v => (typeof v === 'string' ? v.length : Array.isArray(v) ? v.length * 4 : 64);
