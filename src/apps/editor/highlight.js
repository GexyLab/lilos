import { splitName } from '@lilos/sdk';

/**
 * Small regex highlighter. Each language is a list of [pattern, class]; the patterns are joined
 * into one regex with a capture group each, so they must not contain capture groups themselves
 * (use (?:…)). Text between matches stays plain.
 */
const STRING_DQ = /"(?:\\.|[^"\\\n])*"?/;
const STRING_SQ = /'(?:\\.|[^'\\\n])*'?/;
const NUMBER = /\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/;

const word = list => new RegExp(`\\b(?:${list.join('|')})\\b`);

export const JS_KEYWORDS = ['async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'from', 'function', 'if', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'of', 'return', 'static', 'super', 'switch', 'this', 'throw', 'try', 'type', 'typeof', 'var', 'void', 'while', 'with', 'yield'];
export const PY_KEYWORDS = ['and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield'];

export const LANGUAGES = {
  text: { label: 'Testo', rules: [] },
  markdown: {
    label: 'Markdown',
    rules: [
      [/```[\s\S]*?(?:```|$)/, 'st'],
      [/^#{1,6} .*$/m, 'hd'],
      [/^ {0,3}>.*$/m, 'cm'],
      [/^\s*(?:[-*+]|\d+\.)(?= )/m, 'pu'],
      [/`[^`\n]+`/, 'st'],
      [/\*\*[^*\n]+\*\*|__[^_\n]+__/, 'bd'],
      [/\*[^*\n]+\*|_[^_\n]+_/, 'it'],
      [/!?\[[^\]\n]*\]\([^)\n]*\)/, 'fn'],
    ],
  },
  javascript: {
    label: 'JavaScript',
    rules: [
      [/\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/, 'cm'],
      [STRING_DQ, 'st'], [STRING_SQ, 'st'], [/`(?:\\[\s\S]|[^`\\])*`?/, 'st'],
      [word(JS_KEYWORDS), 'kw'],
      [word(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']), 'nu'],
      [NUMBER, 'nu'],
      [/\b[A-Za-z_$][\w$]*(?=\s*\()/, 'fn'],
    ],
  },
  css: {
    label: 'CSS',
    rules: [
      [/\/\*[\s\S]*?(?:\*\/|$)/, 'cm'],
      [STRING_DQ, 'st'], [STRING_SQ, 'st'],
      [/@[\w-]+/, 'kw'],
      [/#[\da-fA-F]{3,8}\b/, 'nu'],
      [/-?\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|fr|ch)?/, 'nu'],
      [/--[\w-]+|[a-z-]+(?=\s*:[^:{]*[;}])/, 'pr'],
      [/!important/, 'kw'],
    ],
  },
  html: {
    label: 'HTML',
    rules: [
      [/<!--[\s\S]*?(?:-->|$)/, 'cm'],
      [/<!DOCTYPE[^>]*>/i, 'cm'],
      [/<\/?[\w-]+|\/?>/, 'kw'],
      [/[\w:-]+(?==)/, 'pr'],
      [STRING_DQ, 'st'], [STRING_SQ, 'st'],
      [/&#?\w+;/, 'nu'],
    ],
  },
  json: {
    label: 'JSON',
    rules: [
      [/"(?:\\.|[^"\\\n])*"(?=\s*:)/, 'pr'],
      [STRING_DQ, 'st'],
      [word(['true', 'false', 'null']), 'kw'],
      [/-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/, 'nu'],
    ],
  },
  python: {
    label: 'Python',
    rules: [
      [/#[^\n]*/, 'cm'],
      [/"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)/, 'st'],
      [STRING_DQ, 'st'], [STRING_SQ, 'st'],
      [/@[\w.]+/, 'fn'],
      [word(PY_KEYWORDS), 'kw'],
      [word(['True', 'False', 'None', 'self']), 'nu'],
      [NUMBER, 'nu'],
      [/\b[A-Za-z_]\w*(?=\s*\()/, 'fn'],
    ],
  },
};

const BY_EXTENSION = {
  md: 'markdown', markdown: 'markdown',
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', ts: 'javascript',
  css: 'css', html: 'html', htm: 'html', xml: 'html', svg: 'html',
  json: 'json', py: 'python',
};

export const languageFor = name => BY_EXTENSION[splitName(name ?? '')[1].toLowerCase()] ?? 'text';

const compiled = new Map();

function compile(lang) {
  if (!compiled.has(lang)) {
    const { rules } = LANGUAGES[lang] ?? LANGUAGES.text;
    const flags = new Set(['g', ...rules.flatMap(([re]) => [...re.flags])]);
    compiled.set(lang, rules.length
      ? { re: new RegExp(rules.map(([re]) => `(${re.source})`).join('|'), [...flags].join('')), classes: rules.map(([, c]) => c) }
      : null);
  }
  return compiled.get(lang);
}

/** [[class | null, text], …] covering the whole text. */
export function tokenize(text, lang) {
  const c = compile(lang);
  if (!c) return [[null, text]];
  const tokens = [];
  let last = 0;
  c.re.lastIndex = 0;
  for (let m; (m = c.re.exec(text)); ) {
    if (!m[0]) { c.re.lastIndex++; continue; }
    if (m.index > last) tokens.push([null, text.slice(last, m.index)]);
    const group = m.findIndex((g, i) => i > 0 && g !== undefined) - 1;
    tokens.push([c.classes[group], m[0]]);
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push([null, text.slice(last)]);
  return tokens;
}
