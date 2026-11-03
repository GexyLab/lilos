/**
 * Checks the translations of apps (src/<id>/locales.json) against their code and manifest:
 *   errors    keys used with t('…') that English lacks; texts of app.json without their '@' key
 *             in a language; languages without every key of English
 *   warnings  keys of English that no t('…') uses (keys built at run time look unused too)
 * The strings of the shared components (src/shared/locales.json) are checked too: every language
 * with every key of English, the keys their code uses in English. An app that uses shared
 * components knows the parts of them it gets (scripts/shared-locales.mjs).
 *
 *   node scripts/check-locales.mjs [id…]     every app with a locales.json by default, and the shared strings
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { sharedTable, checkSharedTable, sharedSources, withShared } from './shared-locales.mjs';

const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? (e.name === 'public' ? [] : walk(join(dir, e.name))) : [join(dir, e.name)]));

/** The '@' keys the texts of a manifest need (see lilOS's SDK i18n.js, localizeManifest). */
function manifestKeys(m) {
  const keys = ['@name'];
  if (m.description) keys.push('@description');
  for (const c of m.contributes?.commands ?? []) keys.push(`@commands.${c.id}.label`);
  for (const w of m.contributes?.widgets ?? []) keys.push(`@widgets.${w.id}.name`);
  for (const a of m.contributes?.actions ?? []) keys.push(`@actions.${a.id}.label`);
  for (const menu of m.contributes?.menus ?? []) keys.push(`@menus.${menu.id}.label`);
  if (m.contributes?.badge) keys.push('@badge.label');
  for (const a of m.contributes?.automation ?? []) {
    const base = `@automation.${a.id}`;
    keys.push(`${base}.label`);
    if (a.description) keys.push(`${base}.description`);
    for (const [p, def] of Object.entries(a.params ?? {})) {
      if (def.label) keys.push(`${base}.params.${p}.label`);
      if (def.description) keys.push(`${base}.params.${p}.description`);
      for (const o of def.options ?? []) keys.push(`${base}.params.${p}.options.${o.value}.label`);
    }
  }
  for (const [name, ep] of Object.entries(m.entrypoints ?? {})) {
    if (ep.label) keys.push(`@entrypoints.${name}.label`);
    for (const [p, def] of Object.entries(ep.params ?? {})) {
      const base = `@entrypoints.${name}.params.${p}`;
      if (def.label) keys.push(`${base}.label`);
      if (def.description) keys.push(`${base}.description`);
      for (const o of def.options ?? []) keys.push(`${base}.options.${o.value}.label`);
    }
  }
  return keys;
}

const keysUsed = file => [...readFileSync(file, 'utf8').matchAll(/\bt\(\s*(['"`])([\w.:-]+)\1/g)].map(m => m[2]);

let failed = false;
const SHARED = sharedTable();
{
  const errors = checkSharedTable(SHARED);
  const en = SHARED.en?.strings ?? {}, used = new Set();
  for (const file of sharedSources()) {
    // Keys chosen at run time (t(a ? 'shared.x.a' : 'shared.x.b')) count as used too
    for (const m of readFileSync(file, 'utf8').matchAll(/(['"`])(shared\.[\w.-]+)\1/g)) used.add(m[2]);
    // Other keys are the app's (a component may use one every app has: 'error.generic')
    for (const key of keysUsed(file)) if (key.startsWith('shared.') && !Object.hasOwn(en, key)) errors.push(`${file}: "${key}" non è in en`);
  }
  const unused = Object.keys(en).filter(k => !used.has(k));
  console.log(`shared: ${Object.keys(en).length} chiavi, ${errors.length} errori${unused.length ? `, non usate (o costruite al volo): ${unused.join(', ')}` : ''}`);
  for (const e of errors) console.log(`  ${e}`);
  if (errors.length) failed = true;
}
const ids = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync('src').filter(id => id !== 'shared' && existsSync(join('src', id, 'locales.json')));
for (const id of ids) {
  const own = JSON.parse(readFileSync(join('src', id, 'locales.json'), 'utf8'));
  const errors = [], used = new Set();
  let table = own;
  try { table = withShared(id, own, SHARED); } catch (err) { errors.push(err.message); }
  const en = table.en?.strings ?? {};
  for (const file of walk(join('src', id)).filter(f => f.endsWith('.js'))) {
    for (const key of keysUsed(file)) {
      used.add(key);
      if (!Object.hasOwn(en, key)) errors.push(`${file}: "${key}" non è in en`);
    }
  }
  const manifest = JSON.parse(readFileSync(join('src', id, 'app.json'), 'utf8'));
  for (const [lang, entry] of Object.entries(table)) {
    if (entry.extends) continue;
    for (const key of manifestKeys(manifest)) if (!Object.hasOwn(entry.strings ?? {}, key)) errors.push(`${lang}: manca ${key} (testo del manifesto)`);
    if (lang !== 'en') for (const key of Object.keys(en)) if (!Object.hasOwn(entry.strings ?? {}, key)) errors.push(`${lang}: manca ${key}`);
  }
  const unused = Object.keys(en).filter(k => !k.startsWith('@') && !k.startsWith('shared.') && !used.has(k));
  console.log(`${id}: ${Object.keys(own.en?.strings ?? {}).length} chiavi, ${errors.length} errori${unused.length ? `, non usate (o costruite al volo): ${unused.join(', ')}` : ''}`);
  for (const e of errors) console.log(`  ${e}`);
  if (errors.length) failed = true;
}
process.exit(failed ? 1 : 0);
