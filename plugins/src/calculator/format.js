/**
 * Numbers as the calculator shows them, with the separators of the system's language:
 * digits grouped by three, the decimal separator of the language, exponent past 16 digits
 * (or below 0.0000001). A number being typed keeps its form ('0,50', '12,').
 */
const SYMBOLS = { '+': '+', '-': '−', '*': '×', '/': '÷' };

/** { decimal, group } of a locale ('it' → ',' and '.'). */
export function separators(code) {
  let parts;
  try { parts = new Intl.NumberFormat(code).formatToParts(12345.6); } catch { parts = new Intl.NumberFormat('en').formatToParts(12345.6); }
  const find = (type, fallback) => parts.find(p => p.type === type)?.value ?? fallback;
  return { decimal: find('decimal', '.'), group: find('group', ',') };
}

/** '−1234.5' or '1.5e+21' (JS form) to the locale's: '−1.234,5', '1,5e+21'. `group: false` without grouping. */
export function localize(str, sep, { group = true } = {}) {
  const m = /^(-?)(\d*)(\.?)(\d*)(e[-+]\d+)?$/.exec(str);
  if (!m) return str;
  const [, sign, int, dot, frac, exp = ''] = m;
  const grouped = group ? int.replace(/\B(?=(\d{3})+(?!\d))/g, sep.group) : int;
  return `${sign ? '−' : ''}${grouped}${dot ? sep.decimal : ''}${frac}${exp}`;
}

/** A computed number in JS form, plain between 1e-7 and 1e16, otherwise with exponent. */
export function plain(x) {
  const abs = Math.abs(x);
  if (x === 0) return '0';
  if (abs >= 1e16 || abs < 1e-7) return x.toExponential();
  return String(x);
}

export const number = (x, sep, options) => localize(plain(x), sep, options);

export const symbol = op => SYMBOLS[op] ?? op;

/** A label of the engine (a number, or { fn, arg }) in words: √(9), 5², (−3)², −(5). */
export function label(item, sep) {
  if (typeof item === 'number') return number(item, sep);
  const arg = label(item.arg, sep);
  const simple = typeof item.arg === 'number' && item.arg >= 0;
  if (item.fn === 'sqrt') return `√(${arg})`;
  if (item.fn === 'sqr') return simple ? `${arg}²` : `(${arg})²`;
  return `−(${arg})`;
}

/** The line above the number: '200 + 20', '2 + 3 =', '√(9) ×'. */
export const expression = (items, sep) => items.map(i => (typeof i === 'string' ? symbol(i) : label(i, sep))).join(' ');
