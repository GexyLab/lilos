/**
 * Find and replace in a text (the find bar, shared/FindBar.js, and the automation editor.replace).
 * A query is { find, replace, matchCase, wholeWord, regex }: `find` as written, or a regular
 * expression; ^ and $ match at every line. Empty matches (a* or ^) are left out: they would
 * replace nothing visible and could never be selected.
 */
import { escapeRegExp } from '../shared/text.js';

/** Letters that make a word for «whole word» (\w and the accented and Greek or Cyrillic letters). */
const WORD = '[\\w\\u00C0-\\u024F\\u0370-\\u03FF\\u0400-\\u04FF]';
/** Matches counted for the find bar at most (replacing all has no limit). */
export const MAX_MATCHES = 10_000;

/**
 * The RegExp of a query, or null when there is nothing to find. Throws a SyntaxError when
 * `find` is not a valid regular expression (regexError() makes it short).
 */
export function queryRegExp({ find = '', matchCase = false, wholeWord = false, regex = false } = {}) {
  if (!find) return null;
  const flags = `gm${matchCase ? '' : 'i'}`;
  let source = regex ? find : escapeRegExp(find);
  // Checked alone first: the error speaks of what the user wrote, not of the word boundaries
  if (regex) new RegExp(source, flags);
  if (wholeWord) source = `(?<!${WORD})(?:${source})(?!${WORD})`;
  return new RegExp(source, flags);
}

/** What is wrong with a regular expression, without the expression itself (the browser repeats it). */
export function regexError(err) {
  const message = String(err?.message ?? err);
  return message.slice(message.lastIndexOf(': ') + 2) || message;
}

/** The matches of `re` in the text, in order: [{ start, end, m }] (m: what exec gave, for $1). */
export function findAll(text, re, limit = MAX_MATCHES) {
  const out = [];
  if (!re) return out;
  re.lastIndex = 0;
  let m;
  while (out.length < limit && (m = re.exec(text))) {
    if (!m[0]) {
      re.lastIndex = m.index + 1;
      if (re.lastIndex > text.length) break;
      continue;
    }
    out.push({ start: m.index, end: m.index + m[0].length, m });
  }
  return out;
}

/** Index of the first match starting at `pos` or after it (matches.length when none). */
export function firstAtOrAfter(matches, pos) {
  let lo = 0, hi = matches.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (matches[mid].start < pos) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The text that replaces a match. Written as it is, except with a regular expression:
 * $1…$99, $<name>, $& (the match), $` and $' (before and after it), $$ ($), \n (new line), \t (tab), \\ (\).
 */
export function replacementFor(query, match, text) {
  const by = query.replace ?? '';
  if (!query.regex) return by;
  const m = match.m;
  return by.replace(/\$(\$|&|`|'|\d{1,2}|<([^>]*)>)|\\([nt\\])/g, (all, what, name, escaped) => {
    if (escaped) return escaped === 'n' ? '\n' : escaped === 't' ? '\t' : '\\';
    if (what === '$') return '$';
    if (what === '&') return m[0];
    if (what === '`') return text.slice(0, m.index);
    if (what === "'") return text.slice(m.index + m[0].length);
    if (name !== undefined) return m.groups ? (m.groups[name] ?? '') : all;
    // $12 is group 12 when there is one, otherwise group 1 followed by "2"
    if (what.length === 2 && Number(what) >= 1 && Number(what) < m.length) return m[Number(what)] ?? '';
    const n = Number(what[0]);
    return n >= 1 && n < m.length ? (m[n] ?? '') + what.slice(1) : all;
  });
}

/**
 * Every match replaced: { from, to, text } is the part of the text that changes (from the first
 * match to the end of the last) and what it becomes, or null when nothing matches. `count` is
 * how many matches. Throws for an invalid regular expression.
 */
export function replaceAll(text, query) {
  const list = findAll(text, queryRegExp(query), Infinity);
  if (!list.length) return null;
  let out = '', at = list[0].start;
  for (const match of list) {
    out += text.slice(at, match.start) + replacementFor(query, match, text);
    at = match.end;
  }
  return { from: list[0].start, to: at, text: out, count: list.length };
}
