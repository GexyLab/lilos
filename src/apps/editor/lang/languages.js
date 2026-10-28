import { fs, splitName, Emitter } from '@lilos/sdk';
import { editorConfig } from './config.js';

/**
 * Languages the Editor knows. For each, which engines can highlight it and which language server
 * can serve it:
 *   textmate:   a TextMate grammar (bundled through Shiki, or added by the user)
 *   treesitter: a Tree-sitter grammar in public/tree-sitter/<name>/
 *   simple:     the built-in regex highlighter and completion vocabulary (highlight.js, complete.js)
 *   server:     the built-in language server ('json' | 'css' | 'html')
 */
const BUILTIN = [
  { id: 'text', label: 'Testo', exts: ['txt', 'log', ''], simple: 'text' },
  { id: 'markdown', label: 'Markdown', exts: ['md', 'markdown'], textmate: 'markdown', simple: 'markdown' },
  { id: 'javascript', label: 'JavaScript', exts: ['js', 'mjs', 'cjs'], textmate: 'javascript', treesitter: 'javascript', simple: 'javascript' },
  { id: 'typescript', label: 'TypeScript', exts: ['ts'], textmate: 'typescript', simple: 'javascript' },
  { id: 'css', label: 'CSS', exts: ['css'], textmate: 'css', treesitter: 'css', simple: 'css', server: 'css' },
  { id: 'html', label: 'HTML', exts: ['html', 'htm'], textmate: 'html', treesitter: 'html', simple: 'html', server: 'html' },
  { id: 'xml', label: 'XML', exts: ['xml', 'svg'], textmate: 'xml', simple: 'html' },
  { id: 'json', label: 'JSON', exts: ['json'], textmate: 'json', treesitter: 'json', simple: 'json', server: 'json' },
  { id: 'python', label: 'Python', exts: ['py'], textmate: 'python', treesitter: 'python', simple: 'python' },
  { id: 'shell', label: 'Shell', exts: ['sh', 'bash'], textmate: 'shellscript', treesitter: 'bash', simple: 'text' },
  { id: 'yaml', label: 'YAML', exts: ['yml', 'yaml'], textmate: 'yaml', simple: 'text' },
];

export const ENGINE_LABELS = { treesitter: 'Tree-sitter', textmate: 'TextMate', simple: 'Semplice' };

/** Languages from TextMate grammars the user added (see loadCustomGrammars). */
const custom = new Map();   // id → language
export const languageEvents = new Emitter();

export const languages = () => [...BUILTIN, ...custom.values()];
export const getLanguage = id => languages().find(l => l.id === id) ?? BUILTIN[0];

export function languageForName(name) {
  const ext = splitName(name ?? '')[1].toLowerCase();
  // User grammars win: they were added on purpose
  return [...custom.values(), ...BUILTIN].find(l => l.exts.includes(ext))?.id ?? 'text';
}

/** Engines available for a language, in order of preference. */
export const enginesFor = lang => ['treesitter', 'textmate', 'simple'].filter(e => e === 'simple' || lang[e]);

/** The engine chosen in the settings, or the best available one. */
export function engineFor(lang) {
  const chosen = editorConfig.get('engines')[lang.id];
  const available = enginesFor(lang);
  return available.includes(chosen) ? chosen : available[0];
}

/**
 * Reads the TextMate grammars added in the settings (.tmLanguage.json files in lilOS) and registers
 * a language for each: label from `name`, extensions from `fileTypes`. Broken files are skipped and
 * reported in the returned list.
 */
export async function loadCustomGrammars() {
  custom.clear();
  const problems = [];
  for (const fileId of editorConfig.get('grammars')) {
    const node = fs.get(fileId);
    if (!node) { problems.push({ fileId, error: 'File eliminato' }); continue; }
    try {
      const grammar = JSON.parse(await fs.read(fileId));
      if (!grammar || typeof grammar.scopeName !== 'string' || !Array.isArray(grammar.patterns)) throw new Error('Non è una grammatica TextMate (mancano scopeName o patterns)');
      const id = `tm:${grammar.scopeName}`;
      custom.set(id, {
        id, label: String(grammar.name || grammar.displayName || grammar.scopeName), custom: true, fileId,
        exts: (Array.isArray(grammar.fileTypes) ? grammar.fileTypes : []).map(e => String(e).replace(/^\./, '').toLowerCase()),
        textmate: { grammar: { ...grammar, name: id } }, simple: 'text',
      });
    } catch (err) {
      problems.push({ fileId, name: node.name, error: err.message });
    }
  }
  languageEvents.emit('change');
  return problems;
}
