/**
 * What the kernel keeps of a terminal's screen while nobody looks at it, and the character sets.
 *
 * History: the last bytes sent to the screen (at most `limit`), in the pieces they came in; a page
 * that attaches gets them again, after the modes that were on before the first of them (Modes),
 * so a full-screen program (vim, htop: the alternate screen, the mouse, the cursor keys) comes
 * back as it was.
 */
export class History {
  #chunks = [];      // [{ data: Buffer, before: modes snapshot }]
  #size = 0;
  #limit;
  modes = new Modes();

  constructor(limit = 1 << 20) {
    this.#limit = limit;
  }

  /** Adds what went to the screen (UTF-8). */
  add(data) {
    if (!data.length) return;
    this.#chunks.push({ data, before: this.modes.snapshot() });
    this.modes.scan(data);
    this.#size += data.length;
    while (this.#size > this.#limit && this.#chunks.length > 1) this.#size -= this.#chunks.shift().data.length;
  }

  /** What a page that attaches gets: the modes, then the bytes. */
  replay() {
    const before = this.#chunks[0]?.before ?? this.modes.snapshot();
    return Buffer.concat([Buffer.from(Modes.sequence(before), 'utf8'), ...this.#chunks.map(c => c.data)]);
  }
}

/** DEC private modes a program turns on and the screen must have again when it is drawn anew. */
const TRACKED = new Set([1, 7, 12, 25, 47, 1047, 1049, 66, 1000, 1002, 1003, 1004, 1005, 1006, 1015, 2004]);
const DEFAULTS = { 7: true, 25: true };
const SEQ = /\x1b\[\?([0-9;]+)([hl])|\x1b([=>])|\x1b\](?:0|2);([^\x07\x1b]{0,400})(?:\x07|\x1b\\)/g;

/** The modes and the window title the screen has now, from what went to it. */
export class Modes {
  #on = new Map();      // mode → boolean (only the ones a program changed)
  #snapshot = null;
  title = '';
  #tail = '';           // the end of the last piece, in case a sequence was cut in two

  scan(data) {
    const text = this.#tail + data.toString('latin1');   // the sequences are ASCII: no need to decode
    let changed = false, last = 0;
    SEQ.lastIndex = 0;
    for (let m; (m = SEQ.exec(text));) {
      last = SEQ.lastIndex;
      if (m[1]) {
        for (const n of m[1].split(';').map(Number)) if (TRACKED.has(n)) { this.#on.set(n, m[2] === 'h'); changed = true; }
      } else if (m[3]) {
        this.#on.set('keypad', m[3] === '='); changed = true;
      } else {
        this.title = Buffer.from(m[4], 'latin1').toString('utf8').replace(/[\0-\x1f\x7f]/g, '').slice(0, 120);
      }
    }
    // Keep what could be the start of a sequence (after the last one seen)
    const esc = text.lastIndexOf('\x1b');
    this.#tail = esc >= last && text.length - esc < 420 ? text.slice(esc) : '';
    if (changed) this.#snapshot = null;
  }

  /** The modes as they are now (an object that does not change: shared until they do). */
  snapshot() {
    return this.#snapshot ??= Object.freeze(Object.fromEntries(this.#on));
  }

  /** The sequences that turn the modes of a snapshot on (or off, when a program turned off a default one). */
  static sequence(snapshot) {
    let out = '';
    for (const [mode, on] of Object.entries(snapshot)) {
      if (mode === 'keypad') { if (on) out += '\x1b='; continue; }
      if (on !== (DEFAULTS[mode] ?? false)) out += `\x1b[?${mode}${on ? 'h' : 'l'}`;
    }
    return out;
  }
}

// ---------- Character sets ----------

export const ENCODINGS = ['utf-8', 'iso-8859-1', 'iso-8859-15', 'cp437'];

/* IBM PC (code page 437), 128-255 */
const CP437 = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';
/* ISO 8859-15 differs from 8859-1 in eight places */
const LATIN9 = { 0xa4: '€', 0xa6: 'Š', 0xa8: 'š', 0xb4: 'Ž', 0xb8: 'ž', 0xbc: 'Œ', 0xbd: 'œ', 0xbe: 'Ÿ' };

const tables = {};
function table(encoding) {
  if (tables[encoding]) return tables[encoding];
  const high = [];
  for (let b = 128; b < 256; b++) {
    high.push(encoding === 'cp437' ? CP437[b - 128] : encoding === 'iso-8859-15' ? LATIN9[b] ?? String.fromCharCode(b) : String.fromCharCode(b));
  }
  return tables[encoding] = { high, back: new Map(high.map((ch, i) => [ch, 128 + i])) };
}

/**
 * Converts between the server's character set and UTF-8 (what the page speaks).
 *   decode(Buffer from the server) → Buffer UTF-8;  encode(Buffer UTF-8 from the page) → Buffer for the server
 * With 'utf-8' both leave the bytes as they are. A character the server's set has not becomes '?'.
 */
export class Charset {
  #decoder = new TextDecoder('utf-8');

  constructor(encoding = 'utf-8') {
    this.encoding = ENCODINGS.includes(encoding) ? encoding : 'utf-8';
  }

  decode(data) {
    if (this.encoding === 'utf-8') return data;
    const { high } = table(this.encoding);
    let out = '';
    for (const b of data) out += b < 128 ? String.fromCharCode(b) : high[b - 128];
    return Buffer.from(out, 'utf8');
  }

  encode(data) {
    if (this.encoding === 'utf-8') return data;
    const { back } = table(this.encoding);
    const text = this.#decoder.decode(data, { stream: true });
    const out = [];
    for (const ch of text) {
      const c = ch.codePointAt(0);
      out.push(c < 128 ? c : back.get(ch) ?? 0x3f);
    }
    return Buffer.from(out);
  }
}
