import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Checks before a commit or a package: every source file parses, every text the program uses
 * is in locales.json in English and Italian, and versions.json is complete.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
let errors = 0;
const fail = msg => { errors++; console.error(`✗ ${msg}`); };

const files = dir => readdirSync(dir).flatMap(n => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]));
const sources = files(SRC).filter(f => /\.(m?js|cjs)$/.test(f));
for (const f of sources) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (err) {
    fail(`${relative(ROOT, f)}: ${String(err.stderr).split('\n').find(l => l.includes('Error')) ?? 'non si legge'}`);
  }
}

const locales = JSON.parse(readFileSync(join(SRC, 'locales.json'), 'utf8'));
const en = Object.keys(locales.en), it = Object.keys(locales.it);
for (const k of en) if (!it.includes(k)) fail(`locales.json: «${k}» manca in italiano`);
for (const k of it) if (!en.includes(k)) fail(`locales.json: «${k}» manca in inglese`);

// Keys used by the main process: t('…'); by the pages: tr('…') within their group
const used = new Set();
for (const f of sources) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/\bt\('([\w.]+)'/g)) used.add(m[1]);
  const group = f.includes(`${join('pages', 'welcome')}`) ? 'welcome' : f.includes(`${join('pages', 'status')}`) ? 'status' : null;
  if (group) for (const m of text.matchAll(/\btr\('([\w.]+)'/g)) used.add(`${group}.${m[1]}`);
}
for (const f of files(join(SRC, 'pages')).filter(f => f.endsWith('.html'))) {
  const group = f.includes('welcome') ? 'welcome' : 'status';
  for (const m of readFileSync(f, 'utf8').matchAll(/data-t="([\w.]+)"/g)) used.add(`${group}.${m[1]}`);
}
for (const k of used) {
  // Built keys (devices.choose.<kind>, status.<state>.title) are checked by their prefix
  if (!en.includes(k) && !en.some(e => e.startsWith(`${k}.`))) fail(`testo «${k}» usato ma non in locales.json`);
}

const versions = JSON.parse(readFileSync(join(ROOT, 'versions.json'), 'utf8'));
for (const k of ['node', 'git', 'postgres', 'lilos']) if (!versions[k]) fail(`versions.json: manca ${k}`);

if (errors) {
  console.error(`${errors} problemi`);
  process.exit(1);
}
console.log(`OK: ${sources.length} file, ${en.length} testi`);
