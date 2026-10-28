import treeSitterWasm from 'web-tree-sitter/web-tree-sitter.wasm?url';
import { tokenize as simpleTokenize } from '../highlight.js';

/**
 * Highlighting engines. highlighter(lang, engine) resolves to { engine, tokenize(text) } where
 * tokenize returns [[class | null, text, color?, fontStyle?], …] covering the text:
 *   simple      class from highlight.js
 *   textmate    color and font style from the theme (Shiki, JavaScript regex engine, no WebAssembly)
 *   treesitter  class from the capture names of highlights.scm
 * Everything is loaded on first use. If an engine fails, the promise rejects: callers fall back to simple.
 */

/** TextMate themes for the lilOS themes, and their default text color (left to the editor's CSS). */
const THEMES = { light: { name: 'github-light', fg: '#24292e' }, dark: { name: 'github-dark', fg: '#e1e4e8' } };
const currentTheme = () => THEMES[document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'];
const ITALIC = 1, BOLD = 2, UNDERLINE = 4;

const TEXTMATE = {
  markdown: () => import('@shikijs/langs/markdown'),
  javascript: () => import('@shikijs/langs/javascript'),
  typescript: () => import('@shikijs/langs/typescript'),
  css: () => import('@shikijs/langs/css'),
  html: () => import('@shikijs/langs/html'),
  xml: () => import('@shikijs/langs/xml'),
  json: () => import('@shikijs/langs/json'),
  python: () => import('@shikijs/langs/python'),
  shellscript: () => import('@shikijs/langs/shellscript'),
  yaml: () => import('@shikijs/langs/yaml'),
};

const cache = new Map();   // `${lang.id}:${engine}` → Promise<tokenize>

export function highlighter(lang, engine) {
  if (engine === 'simple') return Promise.resolve({ engine, tokenize: text => simpleTokenize(text, lang.simple ?? 'text') });
  const key = `${lang.id}:${engine}:${lang.fileId ?? ''}`;
  if (!cache.has(key)) {
    const make = engine === 'textmate' ? textmate(lang) : treesitter(lang);
    // A failure is not cached: the next attempt (e.g. after fixing a grammar file) tries again
    cache.set(key, make.catch(err => { cache.delete(key); throw err; }));
  }
  return cache.get(key).then(tokenize => ({ engine, tokenize }));
}

/** Forget loaded custom grammars (they changed on disk or in the settings). */
export function forgetCustom() {
  for (const key of [...cache.keys()]) if (key.startsWith('tm:')) cache.delete(key);
}

// ---------- TextMate (Shiki) ----------

let shiki = null;

function loadShiki() {
  shiki ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import('@shikijs/core'), import('@shikijs/engine-javascript'),
    ]);
    // forgiving: grammars with regex features JavaScript lacks still work, without those rules
    return createHighlighterCore({ themes: [import('@shikijs/themes/github-light'), import('@shikijs/themes/github-dark')], langs: [], engine: createJavaScriptRegexEngine({ forgiving: true }) });
  })();
  return shiki;
}

async function textmate(lang) {
  if (!lang.textmate) throw new Error(`Nessuna grammatica TextMate per ${lang.label}`);
  const h = await loadShiki();
  const spec = lang.textmate;
  const name = typeof spec === 'string' ? spec : spec.grammar.name;
  if (!h.getLoadedLanguages().includes(name)) {
    if (typeof spec === 'string') await h.loadLanguage(TEXTMATE[spec]());
    else await h.loadLanguage(spec.grammar);
  }
  return text => {
    const tokens = [];
    const theme = currentTheme();
    h.codeToTokensBase(text, { lang: name, theme: theme.name }).forEach((line, i) => {
      if (i) tokens.push([null, '\n']);
      for (const t of line) {
        const color = t.color && t.color.toLowerCase() !== theme.fg ? t.color : null;
        tokens.push([null, t.content, color, t.fontStyle || 0]);
      }
    });
    return tokens;
  };
}

export const FONT_STYLE = { ITALIC, BOLD, UNDERLINE };

// ---------- Tree-sitter ----------

let parserReady = null;
const grammars = new Map();   // name → Promise<{ Parser, language, query }>

/** Capture names (keyword, string.special, function.method…) → token classes of editor.css. */
function classFor(capture) {
  const n = capture.toLowerCase();
  const is = (...prefixes) => prefixes.some(p => n === p || n.startsWith(p + '.'));
  if (is('comment')) return 'cm';
  if (is('string.special.key')) return 'pr';
  if (is('string', 'text.literal', 'markup.raw')) return 'st';
  if (is('number', 'float', 'boolean', 'constant', 'variable.builtin', 'escape', 'character')) return 'nu';
  if (is('keyword', 'tag', 'conditional', 'repeat', 'include', 'exception', 'storageclass')) return 'kw';
  if (is('function', 'method', 'constructor')) return 'fn';
  if (is('property', 'attribute', 'label', 'field', 'variable.member')) return 'pr';
  if (is('type', 'namespace', 'module')) return 'ty';
  if (is('markup.heading', 'text.title')) return 'hd';
  if (is('markup.strong', 'text.strong')) return 'bd';
  if (is('markup.italic', 'text.emphasis')) return 'it';
  if (is('punctuation.special', 'markup.list')) return 'pu';
  return null;
}

async function treesitter(lang) {
  if (!lang.treesitter) throw new Error(`Nessuna grammatica Tree-sitter per ${lang.label}`);
  const { Parser, Language, Query } = await import('web-tree-sitter');
  parserReady ??= Parser.init({ locateFile: () => treeSitterWasm });
  await parserReady;
  const name = lang.treesitter;
  if (!grammars.has(name)) {
    grammars.set(name, (async () => {
      const base = `${import.meta.env.BASE_URL}tree-sitter/${name}/`;
      const [language, source] = await Promise.all([
        Language.load(`${base}tree-sitter-${name}.wasm`),
        fetch(`${base}highlights.scm`).then(r => { if (!r.ok) throw new Error(`highlights.scm: ${r.status}`); return r.text(); }),
      ]);
      return { language, query: new Query(language, source) };
    })().catch(err => { grammars.delete(name); throw err; }));
  }
  const { language, query } = await grammars.get(name);
  const parser = new Parser();
  parser.setLanguage(language);

  return text => {
    const tree = parser.parse(text);
    if (!tree) return [[null, text]];
    try {
      // Paint a class per character: outer nodes first, inner (shorter) ones over them; for the very
      // same range the later pattern wins — highlights.scm files put generic rules ((identifier)
      // @variable) first and specific ones (@function) after. The sort is stable: query order stays.
      const classes = new Array(text.length).fill(null);
      const caps = query.captures(tree.rootNode)
        .map(c => ({ start: c.node.startIndex, end: c.node.endIndex, cls: classFor(c.name) }))
        .sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
      for (const c of caps) {
        for (let i = c.start; i < c.end && i < classes.length; i++) classes[i] = c.cls;
      }
      const tokens = [];
      let start = 0;
      for (let i = 1; i <= text.length; i++) {
        if (i === text.length || classes[i] !== classes[start]) {
          tokens.push([classes[start], text.slice(start, i)]);
          start = i;
        }
      }
      return tokens.length ? tokens : [[null, text]];
    } finally {
      tree.delete();
    }
  };
}
