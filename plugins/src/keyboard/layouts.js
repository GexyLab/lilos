/**
 * Keyboard layouts: five rows of keys on 15 units (a letter key is 1 wide, 1 high). A key that
 * writes has `code` (KeyboardEvent.code) and its characters: normal, with Shift, with AltGr, with
 * AltGr+Shift (null: none). The others have `fn`, the name of what they do (see KeyboardApp.js),
 * and `h` 2 for the Italian Enter, two rows high. An array of two keys is one place with the two
 * halves one above the other (↑ ↓).
 */
const k = (code, normal, shift, altGr = null, altGrShift = null, w = 1) => ({ code, normal, shift, altGr, altGrShift, w });
const letters = (text, altGr = {}) => [...text].map(c => k(`Key${c.toUpperCase()}`, c, c.toUpperCase(), altGr[c] ?? null));
const digits = shifted => [...'1234567890'].map((d, i) => k(`Digit${d}`, d, shifted[i]));
const fn = (name, w = 1, h = 1) => ({ fn: name, code: name, w, h });

const BOTTOM = [
  fn('Escape'), fn('ControlLeft', 1.25), fn('AltLeft', 1.25), fn('Layout'), fn('Space', 5.25), fn('AltRight', 1.25),
  fn('Delete'), fn('ArrowLeft'), [fn('ArrowUp'), fn('ArrowDown')], fn('ArrowRight'),
];

export const LAYOUTS = {
  it: {
    lang: 'it', short: 'IT', altGr: true,
    rows: [
      [k('Backquote', '\\', '|'), ...digits('!"£$%&/()='), k('Minus', "'", '?', '`'), k('Equal', 'ì', '^', '~'), fn('Backspace', 2)],
      [fn('Tab', 1.75), ...letters('qwertyuiop', { e: '€' }), k('BracketLeft', 'è', 'é', '[', '{'), k('BracketRight', '+', '*', ']', '}'), fn('Enter', 1.25, 2)],
      [fn('CapsLock', 1.75), ...letters('asdfghjkl'), k('Semicolon', 'ò', 'ç', '@'), k('Quote', 'à', '°', '#'), k('Backslash', 'ù', '§')],
      [fn('ShiftLeft', 1.25), k('IntlBackslash', '<', '>'), ...letters('zxcvbnm'), k('Comma', ',', ';'), k('Period', '.', ':'), k('Slash', '-', '_'), fn('ShiftRight', 2.75)],
      BOTTOM,
    ],
  },
  us: {
    lang: 'en', short: 'EN', altGr: false,
    rows: [
      [k('Backquote', '`', '~'), ...digits('!@#$%^&*()'), k('Minus', '-', '_'), k('Equal', '=', '+'), fn('Backspace', 2)],
      [fn('Tab', 1.5), ...letters('qwertyuiop'), k('BracketLeft', '[', '{'), k('BracketRight', ']', '}'), k('Backslash', '\\', '|', null, null, 1.5)],
      [fn('CapsLock', 1.75), ...letters('asdfghjkl'), k('Semicolon', ';', ':'), k('Quote', "'", '"'), fn('Enter', 2.25)],
      [fn('ShiftLeft', 2.25), ...letters('zxcvbnm'), k('Comma', ',', '<'), k('Period', '.', '>'), k('Slash', '/', '?'), fn('ShiftRight', 2.75)],
      BOTTOM,
    ],
  },
};

/** The layout for a language: Italian for Italian, the US one for every other. */
export const layoutFor = lang => (String(lang).toLowerCase().startsWith('it') ? 'it' : 'us');

/**
 * Every key with its place on the grid: { key, x, y, w, h } in units (y in rows; the halves of
 * ↑ ↓ are half a row high). A key two rows high takes its place in the row below too.
 */
export function place(layout) {
  const out = [];
  const taken = [];   // [row, from, to]: places taken by keys from the rows above
  layout.rows.forEach((row, y) => {
    let x = 0;
    const skip = () => { for (const [r, a, b] of taken) if (r === y && x >= a && x < b) x = b; };
    for (const item of row) {
      skip();
      if (Array.isArray(item)) {
        item.forEach((key, i) => out.push({ key, x, y: y + i / 2, w: key.w, h: 0.5 }));
        x += item[0].w;
        continue;
      }
      const h = item.h ?? 1;
      out.push({ key: item, x, y, w: item.w, h });
      for (let r = 1; r < h; r++) taken.push([y + r, x, x + item.w]);
      x += item.w;
    }
  });
  return out;
}
