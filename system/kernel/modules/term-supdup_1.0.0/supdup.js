/**
 * The SUPDUP protocol (RFC 734, RFC 747, ITS .INFO.;ITS TTY) translated to and from what an
 * xterm shows and sends. No I/O here: index.js connects, this file only turns bytes into bytes,
 * so it can be tested on its own.
 *
 *   paramBlock(cols, rows)        the terminal parameters the user side sends first
 *   new Screen(cols, rows)        SUPDUP output (%TD codes) → xterm escape sequences (UTF-8)
 *   new Keys()                    what xterm sends (UTF-8, ANSI key sequences) → SUPDUP input
 *
 * All numbers in the protocol documents are octal, so they are written as 0o… here too.
 */

// ---------------------------------------------------------------------------------------------
// The parameter block
// ---------------------------------------------------------------------------------------------

/** TTYOPT bits (left half %TO…, right half %TP…), from ITS TTY. */
export const TTYOPT_BITS = {
  TOERS: 0o040000,   // selective erase: %TDEOL, %TDDLF, %TDEOF
  TOMVB: 0o010000,   // can move the cursor backwards
  TOSAI: 0o004000,   // SAIL graphics for codes 0-37 (not sent: see Screen)
  TOOVR: 0o001000,   // overprinting (not sent: a character replaces the one under it)
  TOMVU: 0o000400,   // can move the cursor up (a display, not a printing terminal)
  TOMOR: 0o000200,   // user option: **MORE** processing (normally on)
  TOROL: 0o000100,   // user option: scroll instead of wrapping to the top (normally off)
  TOLWR: 0o000020,   // the keyboard has lower case
  TOFCI: 0o000010,   // full 12-bit keyboard (not sent: see Keys)
  TOLID: 0o000002,   // %TDILP / %TDDLP
  TOCID: 0o000001,   // %TDICP / %TDDCP
  TPCBS: 0o000040,   // (right half) the intelligent terminal protocol: must be on
  TPORS: 0o000010,   // (right half) process output resets (%TDORS)
  TPRSC: 0o000004,   // (right half) region scrolling %TDRSU / %TDRSD
};
const B = TTYOPT_BITS;
const HALF = 2 ** 18;   // 36-bit words as plain numbers: left,,right = left * 2^18 + right

/**
 * What we advertise. Like the reference Unix client (%TOMVB %TOMOR %TOLWR %TPCBS, plus what its
 * terminfo allows): erase, cursor up, line and character insert/delete, output resets, and region
 * scrolling, which an xterm all does well. Not advertised: %TOSAI/%TOSA1 (ITS would then echo
 * Altmode as a lozenge and expect control characters to be one-column graphics: "$" is what users
 * expect), %TOFCI (it tells programs the keyboard makes all 12-bit characters, which a PC keyboard
 * through xterm cannot; Meta still reaches the server, see Keys), %TOOVR, %TOROL (ITS wraps to the
 * top with **MORE**, as on a real ITS display).
 */
export const TTYOPT = (B.TOERS | B.TOMVB | B.TOMVU | B.TOMOR | B.TOLWR | B.TOLID | B.TOCID) * HALF
  + (B.TPCBS | B.TPORS | B.TPRSC);

/** Largest screen we announce: coordinates travel in 7 bits in places (RFC 734: >128 "may have problems"). */
export const MAX_ROWS = 127, MAX_COLS = 128;

/** The size of the SUPDUP screen for an xterm of cols × rows. */
export function screenSize(cols, rows) {
  const ok = (v, min) => Number.isInteger(v) && v >= min;
  return {
    cols: Math.min(MAX_COLS, ok(cols, 10) ? cols : 80),
    rows: Math.min(MAX_ROWS, ok(rows, 4) ? rows : 24),
  };
}

/** A 36-bit word as six bytes, six bits each, most significant first. */
function word(value) {
  const out = [];
  for (let i = 5; i >= 0; i--) out.push(Math.floor(value / 64 ** i) % 64);
  return out;
}

/**
 * The parameter block (RFC 734 + RFC 747): -count,,0 then TCTYP, TTYOPT, TCMXV, TCMXH, TTYROL,
 * TTYSMT (SMARTS), ISPEED, OSPEED. TCMXH is the width minus one (ITS keeps the last column for
 * the "!" of a continued line); TTYROL 1: the screen scrolls by one line; SMARTS 0: no graphics;
 * speeds 0: unknown.
 */
export function paramBlock(cols, rows) {
  const vars = [0o7 /* %TNSFW */, TTYOPT, rows, cols - 1, 1, 0, 0, 0];
  const count = (HALF - vars.length) * HALF;   // -8,,0 = 777770,,0
  return Buffer.from([count, ...vars].flatMap(word));
}

// ---------------------------------------------------------------------------------------------
// Output: %TD codes → xterm
// ---------------------------------------------------------------------------------------------

export const TD = {
  MOV: 0o200, MV1: 0o201, EOF: 0o202, EOL: 0o203, DLF: 0o204, MTF: 0o205, MTN: 0o206, CRL: 0o207,
  NOP: 0o210, BS: 0o211, LF: 0o212, RCR: 0o213, ORS: 0o214, QOT: 0o215, FS: 0o216, MV0: 0o217,
  CLR: 0o220, BEL: 0o221, INI: 0o222, ILP: 0o223, DLP: 0o224, ICP: 0o225, DCP: 0o226, BOW: 0o227,
  RST: 0o230, GRF: 0o231, RSU: 0o232, RSD: 0o233,
};

/** How many argument bytes follow each %TD code that has some. */
const ARGS = { [TD.MOV]: 4, [TD.MV1]: 2, [TD.MV0]: 2, [TD.QOT]: 1, [TD.ILP]: 1, [TD.DLP]: 1, [TD.ICP]: 1, [TD.DCP]: 1, [TD.RSU]: 2, [TD.RSD]: 2 };

/** The Stanford/ITS graphics for codes 000-037 and 177 (RFC 734 page 12; Unicode as in the reference client's charmap.c). */
export const SAIL = [
  '·', '↓', 'α', 'β', '∧', '¬', 'ε', 'π', 'λ', 'γ', 'δ', '↑', '±', '⊕', '∞', '∂',
  '⊂', '⊃', '∩', '∪', '∀', '∃', '⊗', '↔', '←', '→', '≠', '◊', '≤', '≥', '≡', '∨',
];
const INTEGRAL = '∫';
const sail = c => (c < 0o40 ? SAIL[c] : c === 0o177 ? INTEGRAL : String.fromCharCode(c));

const ESC = '\x1b', CSI = '\x1b[';

/**
 * The virtual SUPDUP display drawn on an xterm. The xterm is set up so that it behaves like the
 * SUPDUP terminal we described: no autowrap (?7l: a SUPDUP terminal must never do a CRLF by itself
 * in the last column; characters past the right edge are dropped, as the reference client does),
 * a scroll region as tall as the SUPDUP screen (so %TDCRL on its bottom line scrolls just that,
 * also when the xterm is taller than the 127 lines we can announce), normal video.
 *
 * The cursor is tracked here, as ITS sees it: ITS needs it back after an output reset (%TDORS),
 * and keeping our idea and ITS's in step is what keeps the screen right.
 *
 * feed(Buffer) → { out: Buffer (UTF-8 for the xterm), reply: Buffer | null (to send to the server) }
 */
export class Screen {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.x = 0;
    this.y = 0;
    this.greeting = true;    // until the first %TDNOP the server sends plain ASCII text
    this.graphics = false;   // inside %TDGRF (not advertised: its bytes are skipped)
    this.code = 0;           // the %TD code whose arguments are being collected
    this.args = [];
  }

  /** What sets the xterm up (on connect, and again after the page resized it). */
  setup({ clear = true } = {}) {
    return `${CSI}0m${CSI}?7l${CSI}?25h${CSI}1;${this.rows}r${clear ? `${CSI}H${CSI}2J` : ''}${this.#at()}`;
  }

  /** ^\ ^P vpos hpos: where the cursor is, as ITS wants it after an output reset (7-bit numbers). */
  cursorReport() {
    return [0o34, 0o20, Math.min(this.y, 0o177), Math.min(this.x, 0o177)];
  }

  /** What puts the xterm back as it was, when the session ends: below the SUPDUP screen. */
  teardown() {
    return `${CSI}0m${CSI}r${CSI}?7h${CSI}${this.rows};1H\r\n`;
  }

  feed(data) {
    let out = '';
    const reply = [];
    for (const c of data) {
      if (this.code) {
        this.args.push(c);
        if (this.args.length === ARGS[this.code]) {
          const code = this.code;
          this.code = 0;
          out += this.#withArgs(code, this.args, reply);
        }
        continue;
      }
      if (c < 0o200) {
        if (!this.graphics) out += this.greeting ? this.#greetingChar(c) : this.#char(c);
        continue;
      }
      this.graphics = false;   // any %TD code leaves graphics mode (RFC 734, %TDGRF)
      if (ARGS[c]) {
        this.code = c;
        this.args = [];
        continue;
      }
      out += this.#code(c, reply);
    }
    return { out: Buffer.from(out, 'utf8'), reply: reply.length ? Buffer.from(reply) : null };
  }

  /** Where the xterm cursor goes for our cursor (a cursor past the last column stays on it). */
  #at() {
    return `${CSI}${this.y + 1};${Math.min(this.x, this.cols - 1) + 1}H`;
  }

  /** The greeting, before the first %TDNOP: ASCII with its usual formatting characters. */
  #greetingChar(c) {
    switch (c) {
      case 0o15: this.x = 0; return '\r';
      case 0o12:
        if (this.y < this.rows - 1) { this.y++; return this.#at(); }
        return `${CSI}${this.rows};1H\n${this.#at()}`;   // at the bottom: scroll
      case 0o11: { const x = Math.min(this.cols - 1, (Math.floor(this.x / 8) + 1) * 8); this.x = x; return this.#at(); }
      case 0o10: if (this.x > 0) this.x--; return this.#at();
      case 0o07: return '\x07';
      default: return c >= 0o40 && c < 0o177 ? this.#char(c) : '';
    }
  }

  /**
   * A printing character. Without %TOSAI, ITS sends codes below 040 only in image mode and
   * expects them not to move the cursor: the bell rings, the others are dropped (passing them
   * to the xterm would move its cursor away from where ITS thinks it is).
   */
  #char(c) {
    if (c < 0o40 || c === 0o177) return c === 0o07 ? '\x07' : '';
    if (this.x >= this.cols) return '';   // past the right edge: the line "sticks"
    this.x++;
    return String.fromCharCode(c);
  }

  #code(c, reply) {
    switch (c) {
      case TD.EOF:
        if (this.x < this.cols) return `${CSI}J`;
        return this.y < this.rows - 1 ? `${CSI}${this.y + 2};1H${CSI}J${this.#at()}` : '';
      case TD.EOL: return this.x < this.cols ? `${CSI}K` : '';
      case TD.DLF: return this.x < this.cols ? `${CSI}X` : '';
      case TD.CRL:
        this.x = 0;
        if (this.y < this.rows - 1) { this.y++; return `${this.#at()}${CSI}K`; }
        return `${CSI}${this.rows};1H\n${CSI}K`;   // bottom line: scroll the region up one line
      case TD.NOP: this.greeting = false; return '';
      case TD.BS: if (this.x > 0) this.x--; return this.#at();
      case TD.LF: if (this.y < this.rows - 1) this.y++; return this.#at();
      case TD.RCR: this.x = 0; return this.#at();
      case TD.ORS:
        // Output reset: nothing is buffered here, so the cursor is where the output left it.
        // ITS holds output until it knows it: ^\ ^P vpos hpos (7-bit numbers).
        reply.push(...this.cursorReport());
        return '';
      case TD.FS:
        if (this.x < this.cols) this.x++;
        return this.#at();
      case TD.CLR: this.x = 0; this.y = 0; return `${CSI}H${CSI}2J`;
      case TD.BEL: return '\x07';
      case TD.INI: return `${CSI}0m`;
      case TD.BOW: return `${CSI}7m`;
      case TD.RST: return `${CSI}0m`;
      case TD.GRF: this.graphics = true; return '';
      default: return '';   // %TDMTF, %TDMTN, and codes we do not know: ignored, as RFC 734 asks
    }
  }

  #withArgs(code, args, reply) {
    switch (code) {
      case TD.MOV: case TD.MV1: case TD.MV0: {
        // %TDMOV also has the old position first: only the new one counts
        const [v, h] = args.slice(-2);
        this.y = Math.min(v, this.rows - 1);
        this.x = Math.min(h, this.cols - 1);
        return this.#at();
      }
      case TD.QOT: {
        // A character passed as it is: shown, but ITS does not count it as moving the cursor
        const c = args[0];
        return c < 0o200 ? `${sail(c)}${this.#at()}` : '';
      }
      // xterm's IL/DL also put the cursor in column 1: put it back where it was
      case TD.ILP: return args[0] ? `${CSI}${args[0]}L${this.#at()}` : '';
      case TD.DLP: return args[0] ? `${CSI}${args[0]}M${this.#at()}` : '';
      case TD.ICP: return args[0] && this.x < this.cols ? `${CSI}${args[0]}@` : '';
      case TD.DCP: return args[0] && this.x < this.cols ? `${CSI}${args[0]}P` : '';
      case TD.RSU: case TD.RSD: {
        // Region scroll: from the cursor's line down `lines` lines, by `by`; a scroll region of
        // the xterm does it, then the whole screen is the region again (that homes the cursor)
        const [lines, by] = args;
        if (!lines || !by) return '';
        const bottom = Math.min(this.rows, this.y + lines);
        return `${CSI}${this.y + 1};${bottom}r${CSI}${Math.min(by, bottom - this.y)}${code === TD.RSU ? 'S' : 'T'}${CSI}1;${this.rows}r${this.#at()}`;
      }
      default: return '';
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Input: xterm → SUPDUP
// ---------------------------------------------------------------------------------------------

/** Bucky bits of the 12-bit character set (RFC 734 page 8, ITS TTY D/8). */
export const BUCKY = { CTL: 0o200, MTA: 0o400, SUP: 0o1000, TOP: 0o4000 };
export const ITP_ESCAPE = 0o34;
/** User commands, escaped by 0300: 0301 logs the remote job out (RFC 734 page 4). */
export const LOGOUT = Buffer.from([0o300, 0o301]);

/**
 * One character with bucky bits: ^\ (0o100 | bits >> 7) char; with none, the character itself
 * (a ^\ doubled). Hyper has no bit in SUPDUP (2000 is "reserved, must be zero" and ITS masks it
 * out), so it is never sent.
 */
export function bucky(bits, c) {
  bits &= BUCKY.CTL | BUCKY.MTA | BUCKY.SUP | BUCKY.TOP;
  if (!bits) return c === ITP_ESCAPE ? [ITP_ESCAPE, ITP_ESCAPE] : [c];
  return [ITP_ESCAPE, 0o100 | (bits >> 7), c & 0o177];
}

/**
 * A key with modifiers: Control is folded into an ASCII control character when there is one
 * (Ctrl+a → 001, as an ASCII keyboard sends it and ITS expects), otherwise it stays a bucky bit;
 * Alt and Meta are META, Super is SUPER.
 */
export function keyWith(c, { shift = false, alt = false, ctrl = false, meta = false, superKey = false } = {}) {
  if (shift && c >= 0x61 && c <= 0x7a) c -= 0x20;
  let bits = 0;
  if (ctrl) {
    const folded = c === 0x20 ? 0 : c === 0x3f ? 0x7f : c >= 0x40 && c <= 0x7a ? c & 0x1f : -1;
    if (folded >= 0) c = folded;
    else bits |= BUCKY.CTL;
  }
  if (alt || meta) bits |= BUCKY.MTA;
  if (superKey) bits |= BUCKY.SUP;
  return bucky(bits, c);
}

/** xterm's modifier parameter (1 + shift 1, alt 2, ctrl 4, meta 8). */
const xtermMods = m => {
  const b = Math.max(0, (Number(m) || 1) - 1);
  return { shift: !!(b & 1), alt: !!(b & 2), ctrl: !!(b & 4), meta: !!(b & 8) };
};
/** The kitty keyboard protocol's (1 + shift 1, alt 2, ctrl 4, super 8, hyper 16, meta 32). */
const kittyMods = m => {
  const b = Math.max(0, (Number(m) || 1) - 1);
  return { shift: !!(b & 1), alt: !!(b & 2), ctrl: !!(b & 4), superKey: !!(b & 8), meta: !!(b & 32) };
};

/**
 * Keys an ITS keyboard does not have, as the Emacs-style characters ITS programs (EMACS, TECO
 * ^R mode, the Lisp editors) use for them. F1 is [HELP] (TOP-H, RFC 734 page 13).
 */
const ctl = ch => ch.charCodeAt(0) & 0x1f;
const KEYS = {
  up: [ctl('P')], down: [ctl('N')], right: [ctl('F')], left: [ctl('B')],
  home: [ctl('A')], end: [ctl('E')], delete: [ctl('D')],
  pageDown: [ctl('V')], pageUp: bucky(BUCKY.MTA, 0x76 /* v */),
  help: bucky(BUCKY.TOP, 0x48 /* H */),
  backtab: [0o11],
};
const LETTER_KEYS = { A: 'up', B: 'down', C: 'right', D: 'left', H: 'home', F: 'end', P: 'help', Z: 'backtab' };
const TILDE_KEYS = { 1: 'home', 3: 'delete', 4: 'end', 5: 'pageUp', 6: 'pageDown', 7: 'home', 8: 'end', 11: 'help' };
// Application keypad (only if a program asked for it; ITS never does): the plain characters
const KEYPAD = { M: 0o15, j: 0x2a, k: 0x2b, l: 0x2c, m: 0x2d, n: 0x2e, o: 0x2f, p: 0x30, q: 0x31, r: 0x32, s: 0x33, t: 0x34, u: 0x35, v: 0x36, w: 0x37, x: 0x38, y: 0x39, X: 0x3d };

/** A named key, with Alt/Meta added as META (other modifiers are dropped). */
function named(name, mods) {
  const seq = KEYS[name];
  if (!seq) return [];
  if (!(mods.alt || mods.meta)) return seq;
  if (seq.length === 3) return [seq[0], seq[1] | (BUCKY.MTA >> 7), seq[2]];   // already a bucky character
  return bucky(BUCKY.MTA, seq[0]);
}

/**
 * What the user types, as xterm sends it, into SUPDUP input. Each write is translated on its own:
 * xterm sends a whole key in one write, so an ESC at the end of one is the ESC key (ITS's
 * ALTMODE, which must not wait for a following character), never the start of a sequence.
 *
 *   printable ASCII, Enter (CR), Tab, Ctrl+letter    as they are (034, ^\, is doubled)
 *   Backspace (DEL 177)                              RUBOUT 177 (BS 010 if the session sends BS)
 *   ESC alone                                        ALTMODE 033
 *   ESC + key (Alt/Meta as xterm sends it)           META + that character: 034 102 c
 *   arrows, Home, End, Delete, PgUp, PgDn            ^P ^N ^F ^B, ^A, ^E, ^D, M-v, ^V
 *   F1                                               [HELP] (TOP-H): 034 120 110
 *   CSI u / CSI 27;m;c~ (kitty, modifyOtherKeys)     the key with CONTROL/META/SUPER bucky bits
 *   anything else (other function keys, mouse,       dropped
 *     focus and paste marks, non-ASCII characters)
 *
 * Non-ASCII characters are dropped: SUPDUP input is 7-bit ASCII plus bucky bits, and sending
 * the SAIL graphics with TOP would be read as control characters by programs that fold input
 * to 7 bits (TOP-≠ would become ^Z, CALL).
 */
export class Keys {
  encode(data) {
    const out = [];
    const n = data.length;
    for (let i = 0; i < n; i++) {
      const c = data[i];
      if (c >= 0x80) continue;                       // UTF-8 bytes of a non-ASCII character
      if (c !== 0x1b) { out.push(...bucky(0, c)); continue; }
      if (i + 1 >= n) { out.push(0o33); continue; }  // ESC alone: ALTMODE
      const next = data[i + 1];
      if (next === 0x5b /* [ */ || next === 0x4f /* O */) {
        const end = sequenceEnd(data, i + 2, next === 0x4f);
        if (end < 0) { i = n; continue; }            // cut short: dropped
        const params = data.subarray(i + 2, end).toString('latin1');
        out.push(...(next === 0x4f ? ss3(params, data[end]) : csi(params, data[end])));
        i = end;
        continue;
      }
      if (next >= 0x80) { out.push(0o33); continue; }  // ESC then a non-ASCII character
      out.push(...bucky(BUCKY.MTA, next));              // Alt+key: META
      i++;
    }
    return Buffer.from(out);
  }
}

/** Index of the final byte of a CSI (parameters 0x20-0x3f, final 0x40-0x7e) or SS3 sequence, -1 if cut short. */
function sequenceEnd(data, start, ss3Seq) {
  let i = start;
  if (!ss3Seq) while (i < data.length && data[i] >= 0x20 && data[i] <= 0x3f) i++;
  else while (i < data.length && ((data[i] >= 0x30 && data[i] <= 0x39) || data[i] === 0x3b)) i++;   // "ESC O 5 P" (old xterm)
  return i < data.length && data[i] >= 0x40 && data[i] <= 0x7e ? i : -1;
}

function ss3(params, final) {
  const f = String.fromCharCode(final);
  if (KEYPAD[f] !== undefined) return [KEYPAD[f]];
  if (LETTER_KEYS[f]) return named(LETTER_KEYS[f], xtermMods(params || 1));
  return [];
}

function csi(params, final) {
  const f = String.fromCharCode(final);
  if (/[<>?=]/.test(params[0] ?? '')) return [];   // private replies, mouse reports
  const p = params.split(';').map(s => s.split(':')[0]);
  if (f === 'u') {
    const code = Number(p[0]);
    return Number.isInteger(code) && code > 0 && code < 0x80 ? keyWith(code, kittyMods(p[1])) : [];
  }
  if (f === '~') {
    if (p[0] === '27') {   // modifyOtherKeys: CSI 27 ; mods ; code ~
      const code = Number(p[2]);
      return Number.isInteger(code) && code > 0 && code < 0x80 ? keyWith(code, xtermMods(p[1])) : [];
    }
    const name = TILDE_KEYS[p[0]];
    return name ? named(name, xtermMods(p[1])) : [];
  }
  if (LETTER_KEYS[f]) return named(LETTER_KEYS[f], xtermMods(p[1]));
  return [];   // focus (I, O), other function keys, and the rest
}
