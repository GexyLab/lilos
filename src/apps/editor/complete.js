import { JS_KEYWORDS, PY_KEYWORDS, tokenize } from './highlight.js';

/**
 * Completion suggestions for the editor, by language and by context (what is before the caret).
 *
 *   complete(text, caret, lang, { manual }) → { from, items } | null
 *     from:  where the word being completed starts (text.slice(from, caret) is the prefix)
 *     items: [{ label, insert, kind, detail }]  — `insert` may contain '|' where the caret goes
 *
 * Automatic suggestions (while typing) need a few characters and stay quiet inside strings and
 * comments; manual ones (Ctrl+Space) always answer, with an empty prefix too.
 */

// ---------- Vocabularies ----------

const JS_GLOBALS = ['console', 'document', 'window', 'globalThis', 'Math', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Promise', 'Map', 'Set', 'WeakMap', 'Date', 'RegExp', 'Error', 'Symbol', 'fetch', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'requestAnimationFrame', 'localStorage', 'parseInt', 'parseFloat', 'isNaN', 'structuredClone', 'true', 'false', 'null', 'undefined'];
const JS_MEMBERS = ['log', 'warn', 'error', 'info', 'length', 'push', 'pop', 'shift', 'unshift', 'slice', 'splice', 'concat', 'map', 'filter', 'reduce', 'forEach', 'find', 'findIndex', 'some', 'every', 'includes', 'indexOf', 'join', 'sort', 'reverse', 'flat', 'flatMap', 'at', 'split', 'trim', 'toLowerCase', 'toUpperCase', 'replace', 'replaceAll', 'startsWith', 'endsWith', 'padStart', 'keys', 'values', 'entries', 'assign', 'then', 'catch', 'finally', 'resolve', 'all', 'addEventListener', 'removeEventListener', 'querySelector', 'querySelectorAll', 'getElementById', 'createElement', 'append', 'appendChild', 'remove', 'classList', 'textContent', 'style', 'dataset', 'parse', 'stringify', 'floor', 'ceil', 'round', 'max', 'min', 'abs', 'random', 'now', 'toString', 'toFixed', 'get', 'set', 'has', 'delete', 'size'];

const PY_BUILTINS = ['print', 'len', 'range', 'str', 'int', 'float', 'bool', 'list', 'dict', 'set', 'tuple', 'open', 'input', 'enumerate', 'zip', 'map', 'filter', 'sorted', 'reversed', 'sum', 'min', 'max', 'abs', 'round', 'isinstance', 'type', 'super', 'self', 'True', 'False', 'None'];
const PY_MEMBERS = ['append', 'extend', 'insert', 'pop', 'remove', 'sort', 'copy', 'keys', 'values', 'items', 'get', 'update', 'split', 'join', 'strip', 'lower', 'upper', 'replace', 'format', 'startswith', 'endswith', 'find', 'count', 'read', 'write', 'readlines', 'close'];

const CSS_PROPERTIES = ['align-content', 'align-items', 'align-self', 'animation', 'aspect-ratio', 'background', 'background-color', 'background-image', 'background-position', 'background-repeat', 'background-size', 'border', 'border-bottom', 'border-color', 'border-left', 'border-radius', 'border-right', 'border-style', 'border-top', 'border-width', 'bottom', 'box-shadow', 'box-sizing', 'color', 'column-gap', 'content', 'cursor', 'display', 'filter', 'flex', 'flex-basis', 'flex-direction', 'flex-grow', 'flex-shrink', 'flex-wrap', 'font', 'font-family', 'font-size', 'font-style', 'font-weight', 'gap', 'grid', 'grid-area', 'grid-column', 'grid-row', 'grid-template-areas', 'grid-template-columns', 'grid-template-rows', 'height', 'inset', 'justify-content', 'justify-items', 'justify-self', 'left', 'letter-spacing', 'line-height', 'list-style', 'margin', 'margin-bottom', 'margin-left', 'margin-right', 'margin-top', 'max-height', 'max-width', 'min-height', 'min-width', 'object-fit', 'opacity', 'outline', 'overflow', 'overflow-x', 'overflow-y', 'padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top', 'pointer-events', 'position', 'right', 'row-gap', 'text-align', 'text-decoration', 'text-overflow', 'text-transform', 'top', 'transform', 'transition', 'user-select', 'vertical-align', 'visibility', 'white-space', 'width', 'word-break', 'z-index'];
const CSS_GENERIC_VALUES = ['auto', 'none', 'inherit', 'initial', 'unset', '0', '100%', 'transparent', 'currentColor', 'var(--|)', 'calc(|)'];
const ALIGN = ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly', 'stretch', 'start', 'end', 'baseline'];
const CSS_VALUES = {
  display: ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'contents', 'none'],
  position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
  'flex-direction': ['row', 'column', 'row-reverse', 'column-reverse'],
  'flex-wrap': ['nowrap', 'wrap', 'wrap-reverse'],
  'justify-content': ALIGN, 'align-items': ALIGN, 'align-content': ALIGN, 'align-self': ALIGN, 'justify-items': ALIGN, 'justify-self': ALIGN,
  'text-align': ['left', 'right', 'center', 'justify', 'start', 'end'],
  overflow: ['visible', 'hidden', 'scroll', 'auto', 'clip'], 'overflow-x': ['visible', 'hidden', 'scroll', 'auto'], 'overflow-y': ['visible', 'hidden', 'scroll', 'auto'],
  cursor: ['pointer', 'default', 'text', 'move', 'grab', 'grabbing', 'not-allowed', 'wait', 'help'],
  'white-space': ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line'],
  'font-weight': ['normal', 'bold', '400', '500', '600', '700'],
  'font-style': ['normal', 'italic'],
  'box-sizing': ['border-box', 'content-box'],
  visibility: ['visible', 'hidden'],
  'user-select': ['none', 'text', 'all', 'auto'],
  'pointer-events': ['auto', 'none'],
  'text-transform': ['uppercase', 'lowercase', 'capitalize', 'none'],
  'text-decoration': ['none', 'underline', 'line-through'],
  'object-fit': ['cover', 'contain', 'fill', 'none'],
  'border-style': ['solid', 'dashed', 'dotted', 'none'],
  'vertical-align': ['top', 'middle', 'bottom', 'baseline'],
};
const CSS_AT_RULES = ['@media', '@import', '@keyframes', '@font-face', '@supports', '@layer', '@container'];

const HTML_TAGS = ['a', 'abbr', 'article', 'aside', 'audio', 'b', 'blockquote', 'body', 'br', 'button', 'canvas', 'code', 'dd', 'details', 'dialog', 'div', 'dl', 'dt', 'em', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html', 'i', 'iframe', 'img', 'input', 'label', 'legend', 'li', 'link', 'main', 'meta', 'nav', 'ol', 'option', 'p', 'picture', 'pre', 'progress', 'script', 'section', 'select', 'small', 'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup', 'svg', 'table', 'tbody', 'td', 'template', 'textarea', 'th', 'thead', 'time', 'title', 'tr', 'u', 'ul', 'video'];
const HTML_VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const HTML_GLOBAL_ATTRS = ['class', 'id', 'style', 'title', 'lang', 'hidden', 'tabindex', 'role', 'aria-label', 'aria-hidden', 'data-'];
const HTML_ATTRS = {
  a: ['href', 'target', 'rel', 'download'], img: ['src', 'alt', 'width', 'height', 'loading'],
  input: ['type', 'name', 'value', 'placeholder', 'required', 'disabled', 'checked', 'min', 'max'],
  button: ['type', 'disabled', 'name', 'value'], form: ['action', 'method'], label: ['for'],
  link: ['rel', 'href'], script: ['src', 'type', 'defer', 'async'], meta: ['name', 'content', 'charset'],
  select: ['name', 'disabled', 'multiple'], option: ['value', 'selected'], textarea: ['name', 'rows', 'cols', 'placeholder'],
  iframe: ['src', 'width', 'height'], video: ['src', 'controls', 'autoplay', 'loop', 'muted'], audio: ['src', 'controls', 'autoplay', 'loop'],
  html: ['lang'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan', 'scope'],
};
const BOOLEAN_ATTRS = new Set(['hidden', 'required', 'disabled', 'checked', 'defer', 'async', 'multiple', 'selected', 'controls', 'autoplay', 'loop', 'muted']);
const HTML_ENTITIES = ['&nbsp;', '&amp;', '&lt;', '&gt;', '&quot;', '&copy;', '&euro;', '&hellip;', '&mdash;', '&rarr;'];

const FENCE_LANGUAGES = ['javascript', 'js', 'css', 'html', 'json', 'python', 'bash', 'sh', 'text', 'markdown'];

// ---------- Helpers ----------

const item = (label, kind, detail, insert = label) => ({ label, insert, kind, detail });
const items = (list, kind, detail) => list.map(w => item(w.replace('|', ''), kind, detail, w));

/** Words already in the document (identifiers or plain words), except the one being typed. */
function documentWords(text, re, skipFrom, skipTo, min = 3) {
  const seen = new Set();
  for (const m of text.matchAll(re)) {
    if (m.index === skipFrom || m[0].length < min) continue;
    if (m.index < skipTo && m.index + m[0].length > skipFrom) continue;
    seen.add(m[0]);
    if (seen.size > 2000) break;
  }
  return [...seen].map(w => item(w, 'abc', 'dal testo'));
}

/** Token class at the caret (string, comment…), looking at the text before it. */
function tokenAt(text, caret, lang) {
  const before = text.slice(Math.max(0, caret - 4000), caret);
  const tokens = tokenize(before, lang);
  const last = tokens[tokens.length - 1];
  return last ? last[0] : null;
}

const prefixStart = (text, caret, re) => {
  let i = caret;
  while (i > 0 && re.test(text[i - 1])) i--;
  return i;
};

// ---------- Languages ----------

function completeCode(text, caret, lang, manual) {
  const from = prefixStart(text, caret, /[\w$]/);
  const inside = tokenAt(text, from, lang);
  if (!manual && (inside === 'st' || inside === 'cm')) return null;
  // After a dot: members, right away (the dot is enough)
  const member = text[from - 1] === '.';
  const re = lang === 'python' ? /[A-Za-z_]\w*/g : /[A-Za-z_$][\w$]*/g;
  const words = documentWords(text, re, from, caret);
  if (lang === 'python') {
    return { from, items: member
      ? [...items(PY_MEMBERS, 'fn', 'metodo'), ...words]
      : [...items([...PY_KEYWORDS], 'kw', 'parola chiave'), ...items(PY_BUILTINS, 'fn', 'predefinita'), ...words], allowEmpty: member };
  }
  return { from, items: member
    ? [...items(JS_MEMBERS, 'fn', 'proprietà o metodo'), ...words]
    : [...items(JS_KEYWORDS, 'kw', 'parola chiave'), ...items(JS_GLOBALS, 'fn', 'globale'), ...words], allowEmpty: member };
}

function completeCss(text, caret, manual) {
  const from = prefixStart(text, caret, /[\w@-]/);
  const inside = tokenAt(text, from, 'css');
  if (!manual && (inside === 'st' || inside === 'cm')) return null;
  const open = text.lastIndexOf('{', from), close = text.lastIndexOf('}', from);
  const statementStart = Math.max(open, close, text.lastIndexOf(';', from - 1)) + 1;
  const statement = text.slice(statementStart, from);
  if (text.slice(from, caret).startsWith('@')) return { from, items: items(CSS_AT_RULES, 'kw', 'regola') };
  if (open > close) {
    const colon = statement.lastIndexOf(':');
    if (colon !== -1) {
      const prop = statement.slice(0, colon).trim();
      const vars = documentWords(text, /--[\w-]+/g, from, caret, 3).map(w => ({ ...w, label: `var(${w.label})`, insert: `var(${w.label})`, kind: 'val' }));
      return { from, items: [...items(CSS_VALUES[prop] ?? [], 'val', prop), ...items(CSS_GENERIC_VALUES, 'val', 'valore'), ...vars], allowEmpty: true };
    }
    return { from, items: CSS_PROPERTIES.map(p => item(p, 'pr', 'proprietà', `${p}: |;`)) };
  }
  // Outside rules: selectors
  return { from, items: [...items(HTML_TAGS, 'tag', 'elemento'), ...items(CSS_AT_RULES, 'kw', 'regola'), ...documentWords(text, /[.#][\w-]+/g, from, caret, 2)] };
}

function completeHtml(text, caret) {
  const lt = text.lastIndexOf('<', caret - 1), gt = text.lastIndexOf('>', caret - 1);
  // Entities in text content
  const amp = text.lastIndexOf('&', caret - 1);
  if (amp > gt && amp > lt && !/\s/.test(text.slice(amp, caret))) {
    return { from: amp, items: items(HTML_ENTITIES, 'val', 'carattere') };
  }
  if (lt <= gt) return null;
  const tagText = text.slice(lt + 1, caret);
  if (/["']/.test(tagText.replace(/"[^"]*"|'[^']*'/g, ''))) return null;   // inside an attribute value
  if (!/\s/.test(tagText)) {
    if (tagText.startsWith('/')) {
      // Closing tag: the nearest one still open first
      const open = openTags(text.slice(0, lt));
      return { from: lt + 2, items: [...new Set([...open.reverse(), ...HTML_TAGS])].map(t => item(t, 'tag', open.includes(t) ? 'da chiudere' : 'elemento', `${t}>`)), allowEmpty: true };
    }
    if (tagText.startsWith('!')) return null;
    return { from: lt + 1, items: HTML_TAGS.map(t => item(t, 'tag', 'elemento', HTML_VOID.has(t) ? `${t}|>` : `${t}>|</${t}>`)), allowEmpty: true };
  }
  const tag = tagText.match(/^[\w-]+/)?.[0]?.toLowerCase() ?? '';
  const from = prefixStart(text, caret, /[\w:-]/);
  const used = new Set([...tagText.matchAll(/\s([\w:-]+)(?==)/g)].map(m => m[1]));
  const attrs = [...(HTML_ATTRS[tag] ?? []), ...HTML_GLOBAL_ATTRS].filter(a => !used.has(a));
  return { from, items: attrs.map(a => item(a, 'attr', tag ? `attributo di <${tag}>` : 'attributo', BOOLEAN_ATTRS.has(a) ? a : a === 'data-' ? 'data-|=""' : `${a}="|"`)), allowEmpty: /\s$/.test(tagText) };
}

/** Tags opened and not closed in the text (in order). */
function openTags(text) {
  const stack = [];
  for (const m of text.matchAll(/<(\/?)([\w-]+)[^>]*?(\/?)>/g)) {
    const name = m[2].toLowerCase();
    if (m[1]) { const i = stack.lastIndexOf(name); if (i !== -1) stack.splice(i); }
    else if (!m[3] && !HTML_VOID.has(name)) stack.push(name);
  }
  return stack;
}

function completeJson(text, caret) {
  const from = prefixStart(text, caret, /[\w$-]/);
  const keys = [...new Set([...text.matchAll(/"((?:\\.|[^"\\\n])+)"(?=\s*:)/g)].map(m => m[1]))]
    .filter(k => text.slice(from, caret) !== k)
    .map(k => item(k, 'pr', 'chiave'));
  const inString = text.slice(text.lastIndexOf('\n', from - 1) + 1, from).split('"').length % 2 === 0;
  return { from, items: inString ? keys : [...items(['true', 'false', 'null'], 'kw', 'valore'), ...keys] };
}

function completeMarkdown(text, caret, manual) {
  const lineStart = text.lastIndexOf('\n', caret - 1) + 1;
  const line = text.slice(lineStart, caret);
  const fence = line.match(/^\s*```(\w*)$/);
  // Only on the line that opens a block: the closing ``` is followed by Enter, which would accept a language
  const opening = (text.slice(0, lineStart).match(/^\s*```/gm) ?? []).length % 2 === 0;
  if (fence && opening) return { from: caret - fence[1].length, items: items(FENCE_LANGUAGES, 'kw', 'linguaggio del blocco'), allowEmpty: true };
  return completeText(text, caret, manual);
}

function completeText(text, caret) {
  const from = prefixStart(text, caret, /[\p{L}\p{N}_'-]/u);
  return { from, items: documentWords(text, /[\p{L}][\p{L}\p{N}_'-]+/gu, from, caret, 4) };
}

// ---------- Entry point ----------

const MIN_PREFIX = { text: 3, markdown: 3 };   // code languages: 1

export function complete(text, caret, lang, { manual = false } = {}) {
  const result =
    lang === 'javascript' || lang === 'python' ? completeCode(text, caret, lang, manual)
    : lang === 'css' ? completeCss(text, caret, manual)
    : lang === 'html' ? completeHtml(text, caret)
    : lang === 'json' ? completeJson(text, caret)
    : lang === 'markdown' ? completeMarkdown(text, caret, manual)
    : completeText(text, caret);
  if (!result) return null;

  const prefix = text.slice(result.from, caret);
  if (!manual && !result.allowEmpty && prefix.length < (MIN_PREFIX[lang] ?? 1)) return null;

  const list = rankItems(result.items, prefix);
  return list.length ? { from: result.from, items: list } : null;
}

/**
 * Filters and orders suggestions by what was typed: first those starting with it (same case, then
 * any case), then those containing it (from 2 characters); the given order is kept within each
 * group. Matches on `filter` when an item has it (language servers), else on `label`. At most 100.
 */
export function rankItems(items, prefix) {
  const p = prefix.toLowerCase();
  const seen = new Set();
  const ranked = [];
  for (const it of items) {
    const key = it.filter ?? it.label;
    const l = key.toLowerCase();
    if (seen.has(it.label) || key === prefix) continue;
    const rank = l.startsWith(p) ? (key.startsWith(prefix) ? 0 : 1) : p.length >= 2 && l.includes(p) ? 2 : -1;
    if (rank < 0) continue;
    seen.add(it.label);
    ranked.push([rank, it]);
  }
  ranked.sort((a, b) => a[0] - b[0]);   // stable: keeps the given order within a rank
  return ranked.slice(0, 100).map(([, it]) => it);
}
