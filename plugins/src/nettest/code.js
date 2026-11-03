import { h } from '@lilos/sdk';
import { tokenize } from '../shared/highlight.js';
import '../shared/highlight.css';

/**
 * A text area with coloured code (the Editor's highlight.js, shared): a transparent <textarea> over
 * a copy of the text drawn in tokens, as the Editor does. For bodies, GraphQL, scripts and the
 * response. Tab inserts two spaces (Esc then Tab leaves the field, as in the Editor); {{variables}}
 * stand out in every language.
 *
 *   const area = codeArea({ value, lang, onInput, placeholder, readOnly, label, minLines })
 *   area.el · area.value · area.setValue(text) · area.setLang(lang) · area.focus()
 *   lang: 'json' | 'javascript' | 'html' (also XML) | 'css' | 'python' | 'markdown' | 'text' | 'graphql'
 */
const MAX_COLOURED = 400_000;   // longer texts are shown plain: colouring them would slow typing
const GRAPHQL = /\b(?:query|mutation|subscription|fragment|on|schema|type|input|enum|interface|union|scalar|extend|directive|implements)\b/;

function graphqlTokens(text) {
  const re = new RegExp(`(#[^\\n]*)|("(?:\\\\.|[^"\\\\\\n])*"?)|(${GRAPHQL.source})|(\\$[A-Za-z_]\\w*)|(\\b\\d+(?:\\.\\d+)?\\b)|(@[A-Za-z_]\\w*)|(\\b[A-Za-z_]\\w*(?=\\s*[:(]))`, 'g');
  const classes = ['cm', 'st', 'kw', 'pr', 'nu', 'pu', 'fn'];
  const out = [];
  let last = 0;
  for (let m; (m = re.exec(text)); ) {
    if (m.index > last) out.push([null, text.slice(last, m.index)]);
    out.push([classes[m.slice(1).findIndex(g => g !== undefined)], m[0]]);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push([null, text.slice(last)]);
  return out;
}

/** Tokens with the {{variables}} picked out of the plain parts and of the strings. */
function paint(text, lang) {
  const tokens = text.length > MAX_COLOURED ? [[null, text]] : lang === 'graphql' ? graphqlTokens(text) : tokenize(text, lang === 'xml' ? 'html' : lang);
  const out = [];
  for (const [cls, part] of tokens) {
    let last = 0;
    for (const m of part.matchAll(/\{\{[^{}]{1,120}\}\}/g)) {
      if (m.index > last) out.push(h('span', cls ? { class: `tk-${cls}` } : {}, part.slice(last, m.index)));
      out.push(h('span', { class: 'nx-var' }, m[0]));
      last = m.index + m[0].length;
    }
    if (last < part.length) out.push(cls ? h('span', { class: `tk-${cls}` }, part.slice(last)) : document.createTextNode(part.slice(last)));
  }
  return out;
}

export function codeArea({ value = '', lang = 'text', onInput, placeholder = '', readOnly = false, label = '', minLines = 4 } = {}) {
  let current = String(value);
  let language = lang;
  const copy = h('pre', { class: 'nx-code-hl', 'aria-hidden': 'true' });
  const input = h('textarea', {
    class: 'nx-code-in', spellcheck: 'false', autocomplete: 'off', placeholder, readOnly, 'aria-label': label || placeholder,
    wrap: 'soft',
  });
  input.value = current;
  const el = h('div', { class: `nx-code${readOnly ? ' ro' : ''}`, style: `--min-lines: ${minLines}` }, copy, input);
  const draw = () => {
    // The trailing new line keeps the copy as tall as the text area when the text ends with one
    copy.replaceChildren(...paint(current, language), '\n');
  };
  const sync = () => { copy.scrollTop = input.scrollTop; copy.scrollLeft = input.scrollLeft; };
  let escaped = false;
  input.addEventListener('input', () => {
    current = input.value;
    draw();
    onInput?.(current);
  });
  input.addEventListener('scroll', sync);
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { escaped = true; return; }
    if (e.key === 'Tab' && !e.shiftKey && !escaped && !readOnly && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: end } = input;
      input.setRangeText('  ', s, end, 'end');
      input.dispatchEvent(new Event('input'));
    }
    escaped = false;
  });
  draw();
  return {
    el,
    get value() { return current; },
    setValue(text) {
      current = String(text ?? '');
      if (input.value !== current) input.value = current;
      draw();
      sync();
    },
    setLang(l) { language = l; draw(); },
    focus: () => input.focus(),
    input,
  };
}
