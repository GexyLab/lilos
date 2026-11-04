/**
 * Language packs: lilOS's own texts (its interface and the kernel's messages) in one more language,
 * installed from the official repository (lilOS: system/kernel/src/apps/languagePackage.js).
 *
 *   languages/<language>/language.json   { id: 'lang-<language>', language, name, englishName, version, lilos }
 *   languages/<language>/README.md       what the AppStore shows
 *   languages/<language>/strings/<part>.json   { key: text } for each part of lilOS
 *
 * English is in lilOS's code (scripts/lilos-strings.mjs reads it): the English pack has no strings
 * folder, its strings.json is made from the code, a full model for whoever adds a language.
 * The build stops if a pack lacks a part or a key of the code, has one the code does not, or a
 * text with a {placeholder} English does not have (or without one English has).
 *
 * build/languages/<language>/: language.json with the hash of strings.json (every part in one
 * file), strings.json, README.md.
 *
 *   node scripts/languages.mjs check <language> [<part>…]   the problems of a pack (of those parts only)
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lilosStrings } from '../../scripts/lilos-strings.mjs';

/** The language packs of the catalog, by language tag. */
export const LANGUAGES = (JSON.parse(readFileSync('catalog.json', 'utf8')).languages ?? []).map(path => path.split('/').pop());

const FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];
const holders = text => new Set([...String(text).matchAll(/\{(\w+)\}/g)].map(m => m[1]));
const texts = v => (typeof v === 'string' ? [v] : Object.values(v ?? {}));
const sha256 = data => `sha256-${createHash('sha256').update(data).digest('base64')}`;

/** What is wrong with a translated value against the English one: [] when nothing. */
function checkValue(en, value) {
  const problems = [];
  if (typeof value !== 'string' && (!value || typeof value !== 'object' || Array.isArray(value))) return ['valore non valido'];
  if (typeof value === 'object') {
    if (typeof value.other !== 'string') problems.push('manca la forma "other"');
    for (const [form, text] of Object.entries(value)) if (!FORMS.includes(form) || typeof text !== 'string') problems.push(`forma plurale non valida: ${form}`);
  }
  const want = new Set(texts(en).flatMap(t => [...holders(t)]));
  const got = texts(value).map(holders);
  for (const set of got) for (const h of set) if (!want.has(h)) problems.push(`segnaposto {${h}} che l'inglese non ha`);
  const all = new Set(got.flatMap(s => [...s]));
  // {n} chooses the plural form: a form may say it in words ('un file')
  for (const h of want) if (!all.has(h) && !(h === 'n' && typeof value === 'object')) problems.push(`manca il segnaposto {${h}}`);
  return problems;
}

/** The parts of a pack's sources (strings/*.json) checked against English: { parts, problems }. */
export function packStrings(language, reference = lilosStrings()) {
  if (language === 'en') return { parts: reference, problems: [] };
  const dir = join('languages', language, 'strings');
  const parts = {};
  const problems = [];
  for (const file of existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.json')) : []) {
    const part = file.slice(0, -'.json'.length);
    if (!reference[part]) { problems.push(`${part}: parte che lilOS non ha`); continue; }
    parts[part] = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  }
  for (const [part, en] of Object.entries(reference)) {
    const own = parts[part] ?? {};
    if (!parts[part]) { problems.push(`${part}: manca la parte`); continue; }
    for (const key of Object.keys(en)) {
      if (!Object.hasOwn(own, key)) problems.push(`${part}/${key}: manca`);
      else for (const p of checkValue(en[key], own[key])) problems.push(`${part}/${key}: ${p}`);
    }
    for (const key of Object.keys(own)) if (!Object.hasOwn(en, key)) problems.push(`${part}/${key}: chiave che lilOS non ha`);
  }
  return { parts, problems };
}

/** build/languages/<language>; throws with every problem of the pack. */
export function buildLanguage(language, { reference = lilosStrings() } = {}) {
  const src = join('languages', language);
  const template = JSON.parse(readFileSync(join(src, 'language.json'), 'utf8'));
  if (template.language !== language || template.id !== `lang-${language}`) throw new Error(`${language}: language.json non è di questa lingua`);
  const { parts, problems } = packStrings(language, reference);
  if (problems.length) throw new Error(`lingua ${language}, ${problems.length} problemi:\n  ${problems.slice(0, 40).join('\n  ')}${problems.length > 40 ? '\n  …' : ''}`);
  const out = join('build', 'languages', language);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const sorted = Object.fromEntries(Object.keys(parts).sort().map(p => [p, parts[p]]));
  const strings = `${JSON.stringify(sorted, null, 2)}\n`;
  writeFileSync(join(out, 'strings.json'), strings);
  if (existsSync(join(src, 'README.md'))) copyFileSync(join(src, 'README.md'), join(out, 'README.md'));
  writeFileSync(join(out, 'language.json'), `${JSON.stringify({ ...template, files: { 'strings.json': sha256(strings) } }, null, 2)}\n`);
  console.log(`lingua ${language} ${template.version}: ${Object.keys(parts).length} parti`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === 'check') {
  const [language, ...only] = process.argv.slice(3);
  const { problems } = packStrings(language);
  const shown = only.length ? problems.filter(p => only.includes(p.split(/[/:]/)[0])) : problems;
  console.log(shown.length ? shown.join('\n') : `${language}: nessun problema${only.length ? ` in ${only.join(', ')}` : ''}`);
  process.exitCode = shown.length ? 1 : 0;
}
