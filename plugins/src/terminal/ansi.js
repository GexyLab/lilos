/**
 * Output with ANSI escape codes (colors, bold… of `ls`, `grep`, the prompt) turned into DOM:
 * spans with classes for the 16 colors (themed in terminal.css) and inline styles for 256 and
 * 24-bit ones. The style carries over from one write to the next, like on a real terminal.
 * `\e[2J` asks to clear the screen (onClear); other sequences and control chars are dropped.
 */
const SEQ = /\x1b\[([0-9;?]*)([A-Za-z])|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()][0-9A-Za-z]|\x1b./g;
const XTERM = [0, 95, 135, 175, 215, 255];

function color256(n) {
  if (n < 16) return { cls: n };
  if (n >= 232) { const v = 8 + (n - 232) * 10; return { css: `rgb(${v},${v},${v})` }; }
  const i = n - 16;
  return { css: `rgb(${XTERM[Math.floor(i / 36)]},${XTERM[Math.floor(i / 6) % 6]},${XTERM[i % 6]})` };
}

export class AnsiRenderer {
  style = {};

  /** Appends `text` to `target` before `before` (null: at the end). */
  write(text, target, before = null, onClear = () => {}) {
    let last = 0;
    SEQ.lastIndex = 0;
    for (let m; (m = SEQ.exec(text));) {
      this.#text(text.slice(last, m.index), target, before);
      last = SEQ.lastIndex;
      if (m[2] === 'm') this.#sgr(m[1]);
      else if (m[2] === 'J' && (m[1] === '2' || m[1] === '3')) onClear();
    }
    this.#text(text.slice(last), target, before);
  }

  #text(text, target, before) {
    // Control chars other than newline and tab are not shown; a carriage return before a newline neither
    text = text.replace(/\r\n/g, '\n').replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');
    if (!text) return;
    const key = JSON.stringify(this.style);
    const prev = before ? before.previousSibling : target.lastChild;
    if (prev?.nodeType === 1 && prev.dataset.style === key) { prev.textContent += text; return; }
    const s = this.style;
    let node;
    if (key === '{}') {
      node = document.createElement('span');
    } else {
      node = document.createElement('span');
      const fg = s.inverse ? s.bg ?? { cls: 'bg' } : s.fg;
      const bg = s.inverse ? s.fg ?? { cls: 'fg' } : s.bg;
      if (fg?.cls != null) node.classList.add(`tm-c${fg.cls}`);
      else if (fg?.css) node.style.color = fg.css;
      if (bg?.cls != null) node.classList.add(`tm-b${bg.cls}`);
      else if (bg?.css) node.style.backgroundColor = bg.css;
      if (s.bold) node.classList.add('tm-bold');
      if (s.dim) node.classList.add('tm-dim');
      if (s.italic) node.classList.add('tm-italic');
      if (s.underline) node.classList.add('tm-underline');
      if (s.strike) node.classList.add('tm-strike');
    }
    node.dataset.style = key;
    node.textContent = text;
    target.insertBefore(node, before);
  }

  #sgr(params) {
    const codes = params === '' ? [0] : params.split(';').map(Number);
    const s = { ...this.style };
    for (let i = 0; i < codes.length; i++) {
      const c = codes[i];
      if (c === 0) { for (const k of Object.keys(s)) delete s[k]; }
      else if (c === 1) s.bold = true;
      else if (c === 2) s.dim = true;
      else if (c === 3) s.italic = true;
      else if (c === 4) s.underline = true;
      else if (c === 7) s.inverse = true;
      else if (c === 9) s.strike = true;
      else if (c === 22) { delete s.bold; delete s.dim; }
      else if (c === 23) delete s.italic;
      else if (c === 24) delete s.underline;
      else if (c === 27) delete s.inverse;
      else if (c === 29) delete s.strike;
      else if (c >= 30 && c <= 37) s.fg = { cls: c - 30 };
      else if (c >= 90 && c <= 97) s.fg = { cls: c - 90 + 8 };
      else if (c >= 40 && c <= 47) s.bg = { cls: c - 40 };
      else if (c >= 100 && c <= 107) s.bg = { cls: c - 100 + 8 };
      else if (c === 39) delete s.fg;
      else if (c === 49) delete s.bg;
      else if (c === 38 || c === 48) {
        const which = c === 38 ? 'fg' : 'bg';
        if (codes[i + 1] === 5) { s[which] = color256(codes[i + 2] ?? 0); i += 2; }
        else if (codes[i + 1] === 2) {
          const [r, g, b] = codes.slice(i + 2, i + 5).map(v => Math.max(0, Math.min(255, v || 0)));
          s[which] = { css: `rgb(${r},${g},${b})` };
          i += 4;
        }
      }
    }
    this.style = s;
  }

  reset() { this.style = {}; }
}

/** Text without escape sequences (for measuring, copying). */
export const stripAnsi = text => String(text).replace(SEQ, '');
