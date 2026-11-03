import { escapeRegExp } from '../../shared/text.js';
import { ShellError } from '../shell/signals.js';
import { POSIX_CLASSES } from '../shell/classes.js';
import { t } from '../i18n.js';

/**
 * POSIX regular expressions (grep, sed) turned into JavaScript ones. Basic syntax (BRE, the
 * default): \( \) \{ \} \| \+ \? are the operators and ( ) { } | + ? plain characters. Extended
 * (ERE, -E): like JavaScript. In both: [[:digit:]] classes, \< \> word edges.
 */
const BRE_SWAP = new Set(['(', ')', '{', '}', '|', '+', '?']);

export function toJsSource(pattern, extended) {
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '[') {
      // Bracket expression: copied, with POSIX classes expanded
      let j = i + 1;
      let cls = '[';
      if (pattern[j] === '^') { cls += '^'; j++; }
      if (pattern[j] === ']') { cls += '\\]'; j++; }
      for (; j < pattern.length && pattern[j] !== ']'; j++) {
        if (pattern[j] === '[' && pattern[j + 1] === ':') {
          const end = pattern.indexOf(':]', j + 2);
          if (end > 0) { cls += POSIX_CLASSES[pattern.slice(j + 2, end)] ?? ''; j = end + 1; continue; }
        }
        cls += pattern[j] === '\\' ? '\\\\' : pattern[j] === '[' ? '\\[' : pattern[j];
      }
      if (j >= pattern.length) throw new ShellError(t('regex.unmatchedBracket'), 2);
      out += cls + ']';
      i = j;
      continue;
    }
    if (c === '\\' && i + 1 < pattern.length) {
      const n = pattern[++i];
      if (n === '<' || n === '>') out += '\\b';
      else if (!extended && BRE_SWAP.has(n)) out += n;
      else out += '\\' + n;
      continue;
    }
    if (!extended && BRE_SWAP.has(c)) { out += '\\' + c; continue; }
    if (c === '*' && (i === 0 || (!extended && pattern.slice(0, i).endsWith('\\(')))) { out += '\\*'; continue; }
    out += c;
  }
  return out;
}

export function compile(pattern, { extended = false, fixed = false, ignoreCase = false, word = false, line = false, global = false } = {}) {
  let source = fixed ? escapeRegExp(pattern) : toJsSource(pattern, extended);
  if (word) source = `(?<![\\w])(?:${source})(?![\\w])`;
  if (line) source = `^(?:${source})$`;
  try {
    return new RegExp(source, (ignoreCase ? 'i' : '') + (global ? 'g' : '') + 'u');
  } catch {
    try {
      return new RegExp(source, (ignoreCase ? 'i' : '') + (global ? 'g' : ''));
    } catch (err) {
      throw new ShellError(t('regex.invalid', { pattern }), 2);
    }
  }
}
