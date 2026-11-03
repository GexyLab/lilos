/**
 * The strings of the shared components (src/shared/*.js, which apps bundle): they are in
 * src/shared/locales.json, keys 'shared.<part>.<name>', in English and in every language of the
 * apps. The build adds to the locales.json of each app the parts its shared components use
 * (sharedFor), so the component's t('shared.find.next'), called with the app's t, finds them.
 * Which parts a shared module uses: the 'shared.<part>.' strings in its source and in the shared
 * modules it imports.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const SHARED = join('src', 'shared');
const IMPORT = /(?:from\s+|import\s*\(?\s*)(['"])([^'"]+)\1/g;

const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? (e.name === 'public' ? [] : walk(join(dir, e.name))) : [join(dir, e.name)]));

/** The table of the shared strings. */
export const sharedTable = () => JSON.parse(readFileSync(join(SHARED, 'locales.json'), 'utf8'));

/** The shared modules a file imports (resolved paths inside src/shared). */
function sharedImports(file) {
  const out = [];
  for (const m of readFileSync(file, 'utf8').matchAll(IMPORT)) {
    if (!m[2].startsWith('.')) continue;
    const target = resolve(dirname(file), m[2]);
    if (relative(resolve(SHARED), target).startsWith('..')) continue;
    if (existsSync(target)) out.push(target);
  }
  return out;
}

/** The parts of the shared strings ('find', 'tabs'…) the shared modules imported by these files use. */
function partsOf(files) {
  const parts = new Set(), seen = new Set();
  const visit = file => {
    if (seen.has(file)) return;
    seen.add(file);
    if (!file.endsWith('.js')) return;
    for (const m of readFileSync(file, 'utf8').matchAll(/['"`]shared\.(\w+)\./g)) parts.add(m[1]);
    for (const next of sharedImports(file)) visit(next);
  };
  for (const file of files) for (const target of sharedImports(file)) visit(target);
  return parts;
}

/** The parts of the shared strings an app needs (src/<id>/**.js, not its public files). */
export function sharedParts(id) {
  return partsOf(walk(join('src', id)).filter(f => f.endsWith('.js')).map(f => resolve(f)));
}

/**
 * The app's table with the shared strings it needs added to every language (not to those that
 * `extends` another: they get them from it). Throws when the app has a language the shared
 * strings lack, or a key of its own named 'shared.…'.
 */
export function withShared(id, table, shared = sharedTable()) {
  const parts = sharedParts(id);
  for (const [lang, entry] of Object.entries(table)) {
    const own = Object.keys(entry.strings ?? {}).filter(k => k.startsWith('shared.'));
    if (own.length) throw new Error(`${id}: locales.json, ${lang}: le chiavi "shared.*" sono dei componenti condivisi (${own.join(', ')})`);
  }
  if (!parts.size) return table;
  const out = {};
  for (const [lang, entry] of Object.entries(table)) {
    if (entry.extends) { out[lang] = entry; continue; }
    const strings = shared[lang]?.strings;
    if (!strings) throw new Error(`${id}: src/shared/locales.json non ha la lingua "${lang}"`);
    const added = Object.fromEntries(Object.entries(strings).filter(([k]) => parts.has(k.split('.')[1])));
    out[lang] = { ...entry, strings: { ...entry.strings, ...added } };
  }
  return out;
}

/** Problems of the shared table itself: languages without every key of English, or with others. */
export function checkSharedTable(shared = sharedTable()) {
  const errors = [];
  const en = Object.keys(shared.en?.strings ?? {});
  if (!en.length) errors.push('src/shared/locales.json senza "en"');
  for (const [lang, { extends: ext, strings = {} }] of Object.entries(shared)) {
    if (lang === 'en' || ext) continue;
    for (const k of en) if (!Object.hasOwn(strings, k)) errors.push(`${lang}: manca ${k}`);
    for (const k of Object.keys(strings)) if (!en.includes(k)) errors.push(`${lang}: in più ${k}`);
  }
  for (const k of en) if (!/^shared\.\w+\./.test(k)) errors.push(`en: ${k} non è "shared.<parte>.<nome>"`);
  return errors;
}

/** The shared source files (for checking the keys they use). */
export const sharedSources = () => (existsSync(SHARED) ? walk(SHARED).filter(f => f.endsWith('.js')) : []).map(f => f.split(sep).join('/'));
