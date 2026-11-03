/**
 * Shell patterns (`*.txt`, `file?.[ch]`, `[[:digit:]]*`) turned into regular expressions. In a
 * pattern a backslash quotes the next char: quoted parts of a word come in already escaped
 * (escapeGlob), so `"*".txt` matches only the name `*.txt`.
 */
import { escapeRegExp } from '../../shared/text.js';
import { POSIX_CLASSES } from './classes.js';

const cache = new Map();

export const escapeGlob = s => String(s).replace(/[\\*?[\]]/g, '\\$&');

/** True if the pattern has an unquoted * ? or [ … ]. */
export function hasGlob(pattern) {
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '\\') i++;
    else if (c === '*' || c === '?') return true;
    else if (c === '[' && classEnd(pattern, i) > 0) return true;
  }
  return false;
}

/** Index of the ']' closing the bracket expression opened at i, or -1. */
function classEnd(p, i) {
  let j = i + 1;
  if (p[j] === '!' || p[j] === '^') j++;
  if (p[j] === ']') j++;
  for (; j < p.length; j++) {
    if (p[j] === '\\') j++;
    else if (p[j] === '[' && p[j + 1] === ':') {
      const end = p.indexOf(':]', j + 2);
      if (end > 0) j = end + 1;
    } else if (p[j] === ']') return j;
  }
  return -1;
}

/** Source of a regular expression matching what the pattern matches (not anchored). */
export function patternSource(pattern) {
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '\\') {
      if (i + 1 < pattern.length) out += escapeRegExp(pattern[++i]);
      else out += '\\\\';
    } else if (c === '*') out += '[\\s\\S]*';
    else if (c === '?') out += '[\\s\\S]';
    else if (c === '[' && classEnd(pattern, i) > 0) {
      const end = classEnd(pattern, i);
      let j = i + 1, cls = '';
      if (pattern[j] === '!' || pattern[j] === '^') { cls += '^'; j++; }
      for (; j < end; j++) {
        const d = pattern[j];
        if (d === '[' && pattern[j + 1] === ':') {
          const close = pattern.indexOf(':]', j + 2);
          const name = pattern.slice(j + 2, close);
          cls += POSIX_CLASSES[name] ?? '';
          j = close + 1;
        } else if (d === '\\') cls += '\\' + (pattern[++j] ?? '\\');
        else if (d === '-' && j > i + 1 && j < end - 1 && cls && cls !== '^') cls += '-';
        else cls += /[\]\\^-]/.test(d) ? '\\' + d : d;
      }
      out += `[${cls}]`;
      i = end;
    } else out += escapeRegExp(c);
  }
  return out;
}

/** The whole text matches the pattern. */
export function matchPattern(pattern, text, { ignoreCase = false } = {}) {
  const key = (ignoreCase ? 'i' : 's') + pattern;
  let re = cache.get(key);
  if (!re) {
    re = new RegExp(`^(?:${patternSource(pattern)})$`, ignoreCase ? 'i' : '');
    if (cache.size > 500) cache.clear();
    cache.set(key, re);
  }
  return re.test(text);
}

/** Removes the backslashes of a pattern (what a pattern without wildcards stands for). */
export const unescapeGlob = s => String(s).replace(/\\([\s\S])/g, '$1');
