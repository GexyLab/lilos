/**
 * lilOS's own texts in English, as its code defines them: what a language pack translates.
 * Each part is one call, with the table written out (no variables, spreads or computed keys):
 *
 *   locale.define('lilos:desktop', { en: { strings: { … } } })                 page and SDK (sdk/core/locale.js)
 *   defineStrings('lilos:kernel.repos', { en: { strings: { … } } })            kernel (system/kernel/src/strings.js)
 *   bootStrings('lilos:boot', { en: { strings: { … } } })                      sign-in and start-up (src/boot/strings.js)
 *   defineLater('lilos:sdk.kernel', { en: { strings: { … } } })               SDK files locale.js imports, and scheduleRules.js (sdk/core/strings.js)
 *
 *   lilosStrings() → { [part]: { [key]: text | { one, other, … } } }   part: the id without 'lilos:'
 *
 *   node scripts/lilos-strings.mjs            how many parts and strings, and where
 *   node scripts/lilos-strings.mjs --json     the whole table (the English pack is made from it)
 *
 * It throws when a call cannot be read or two files define the same part.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAst } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['src', 'sdk', join('system', 'kernel', 'src')];
const CALLS = new Set(['define', 'defineStrings', 'bootStrings', 'defineLater']);

const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  if (e.name === 'node_modules' || e.name === 'dist') return [];
  return e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.js') ? [join(dir, e.name)] : [];
});

/** The value of a literal written out: objects with plain keys, strings; anything else throws. */
function literal(node, where) {
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && !node.expressions.length) return node.quasis[0].value.cooked;
  if (node.type === 'ObjectExpression') {
    const out = {};
    for (const p of node.properties) {
      if (p.type !== 'Property' || p.computed || p.kind !== 'init') throw new Error(`${where}: solo proprietà scritte per esteso`);
      const key = p.key.type === 'Identifier' ? p.key.name : p.key.value;
      out[key] = literal(p.value, `${where} ${key}`);
    }
    return out;
  }
  throw new Error(`${where}: valore non letterale (${node.type})`);
}

function calls(node, found) {
  if (!node || typeof node.type !== 'string') return;
  if (node.type === 'CallExpression') {
    const callee = node.callee;
    const name = callee.type === 'Identifier' ? callee.name : callee.type === 'MemberExpression' && !callee.computed ? callee.property.name : null;
    const [id, table] = node.arguments;
    if (CALLS.has(name) && id?.type === 'Literal' && typeof id.value === 'string' && id.value.startsWith('lilos:')) found.push({ id: id.value, table, start: node.start });
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(v => calls(v, found));
    else if (value && typeof value === 'object' && typeof value.type === 'string') calls(value, found);
  }
}

export function lilosStrings({ root = ROOT, withFiles = false } = {}) {
  const parts = {};
  const files = {};
  for (const dir of DIRS) {
    for (const file of walk(join(root, dir))) {
      const code = readFileSync(file, 'utf8');
      if (!/\b(define|defineStrings|bootStrings|defineLater)\(\s*['"`]lilos:/.test(code)) continue;
      const name = relative(root, file).split(sep).join('/');
      const found = [];
      calls(parseAst(code, { lang: 'js' }), found);
      for (const { id, table, start } of found) {
        const line = code.slice(0, start).split('\n').length;
        const where = `${name}:${line}`;
        const part = id.slice('lilos:'.length);
        if (!part) continue;   // lilos: alone is the system's formats, with no strings
        if (!table) throw new Error(`${where}: manca la tabella`);
        const value = literal(table, where);
        const strings = value.en?.strings;
        if (!strings || typeof strings !== 'object') throw new Error(`${where}: serve { en: { strings } }`);
        if (Object.keys(value).some(k => k !== 'en')) throw new Error(`${where}: solo "en" nel codice, le altre lingue nei pacchetti`);
        if (parts[part]) throw new Error(`${where}: la parte ${part} c'è già in ${files[part]}`);
        parts[part] = strings;
        files[part] = where;
      }
    }
  }
  return withFiles ? { parts, files } : parts;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { parts, files } = lilosStrings({ withFiles: true });
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(parts, null, 2)}\n`);
  } else {
    let total = 0;
    for (const [part, strings] of Object.entries(parts).sort()) {
      const n = Object.keys(strings).length;
      total += n;
      console.log(`${part.padEnd(32)} ${String(n).padStart(4)}  ${files[part]}`);
    }
    console.log(`${Object.keys(parts).length} parti, ${total} testi`);
  }
}
