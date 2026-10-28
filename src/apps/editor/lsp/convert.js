import { rankItems } from '../complete.js';

/** LSP positions are { line, character } (UTF-16 units, like JavaScript strings). */
export function positionAt(text, offset) {
  let line = 0, start = 0;
  for (let i = text.indexOf('\n'); i !== -1 && i < offset; i = text.indexOf('\n', i + 1)) { line++; start = i + 1; }
  return { line, character: offset - start };
}

export function offsetAt(text, { line, character }) {
  let start = 0;
  for (let l = 0; l < line; l++) {
    const next = text.indexOf('\n', start);
    if (next === -1) return text.length;
    start = next + 1;
  }
  const end = text.indexOf('\n', start);
  return Math.min(start + character, end === -1 ? text.length : end);
}

/** Snippet syntax ($1, ${1:text}, ${1|a,b|}, $0, \$) → plain text and where the caret goes (-1: at the end). */
export function expandSnippet(snippet) {
  let out = '', caret = -1, best = Infinity, last = 0;
  const re = /\\([$}\\])|\$(\d+)|\$\{(\d+)(?::((?:[^}\\]|\\.)*))?\}|\$\{(\d+)\|([^|]*)\|\}/g;
  for (const m of snippet.matchAll(re)) {
    out += snippet.slice(last, m.index);
    last = m.index + m[0].length;
    if (m[1]) { out += m[1]; continue; }
    const n = Number(m[2] ?? m[3] ?? m[5]);
    const text = m[4] !== undefined ? m[4].replace(/\\(.)/g, '$1') : m[6] !== undefined ? m[6].split(',')[0] : '';
    const rank = n === 0 ? Number.MAX_SAFE_INTEGER : n;   // $1 first, $0 last
    if (rank < best) { best = rank; caret = out.length; }
    out += text;
  }
  return { text: out + snippet.slice(last), caret };
}

// LSP CompletionItemKind → badge kinds of the suggestion list
const KINDS = {
  1: 'abc', 2: 'fn', 3: 'fn', 4: 'fn', 5: 'pr', 6: 'abc', 7: 'ty', 8: 'ty', 9: 'ty', 10: 'pr', 11: 'val', 12: 'val',
  13: 'val', 14: 'kw', 15: 'snip', 16: 'val', 17: 'abc', 18: 'abc', 19: 'abc', 20: 'val', 21: 'val', 22: 'ty', 23: 'fn', 24: 'kw', 25: 'ty',
};
const KIND_NAMES = {
  1: 'testo', 2: 'metodo', 3: 'funzione', 4: 'costruttore', 5: 'campo', 6: 'variabile', 7: 'classe', 8: 'interfaccia', 9: 'modulo',
  10: 'proprietà', 11: 'unità', 12: 'valore', 13: 'enumerazione', 14: 'parola chiave', 15: 'snippet', 16: 'colore', 17: 'file',
  18: 'riferimento', 19: 'cartella', 20: 'valore', 21: 'costante', 22: 'struttura', 23: 'evento', 24: 'operatore', 25: 'tipo',
};

const wordStart = (text, caret) => {
  let i = caret;
  while (i > 0 && /[\w$@#.-]/.test(text[i - 1])) i--;
  return i;
};

/**
 * Server completion items → { from, items } for the suggestion list. Each item keeps its own range
 * (from, to) and caret position after insertion; ordering follows sortText, then what was typed.
 */
export function fromServer(items, text, caret) {
  if (!items.length) return null;
  const fallbackFrom = wordStart(text, caret);
  const mapped = items.map(it => {
    const edit = it.textEdit;
    const range = edit?.range ?? edit?.insert ?? null;
    const from = range ? Math.min(offsetAt(text, range.start), caret) : fallbackFrom;
    const to = range ? Math.max(caret, offsetAt(text, edit.range?.end ?? edit.replace?.end ?? range.end)) : caret;
    const raw = edit?.newText ?? it.insertText ?? it.label;
    const { text: insert, caret: at } = it.insertTextFormat === 2 ? expandSnippet(raw) : { text: raw, caret: -1 };
    return {
      label: it.label, insert, caret: at, from, to,
      kind: KINDS[it.kind] ?? 'abc',
      detail: it.detail || KIND_NAMES[it.kind] || '',
      filter: it.filterText ?? it.label,
      sort: it.sortText ?? it.label,
    };
  }).sort((a, b) => (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0));
  const from = mapped[0].from;
  const ranked = rankItems(mapped, text.slice(from, caret));
  return ranked.length ? { from, items: ranked } : null;
}
