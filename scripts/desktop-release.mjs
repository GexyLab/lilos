/**
 * «Pubblica release» of the program lilOS: makes lilos-desktop/production from
 * lilos-desktop/development, lighter and clean, ready for the GitHub Actions workflow
 * (.github/workflows/lilos-desktop.yml, at the tag release-vX.Y.Z) that builds the installers:
 *
 *   npm run release:desktop [-- --check]
 *
 * production/ is made again from nothing (never edited by hand) with only what the packages and
 * the workflow need: package.json, package-lock.json, electron-builder.yml, versions.json,
 * build/ and src/ (as committed: only what git keeps, never node_modules, runtime/ or dist/),
 * and scripts/fetch-runtime.mjs. The JavaScript is minified (one file at a time: imports and
 * folders stay as they are), the CSS too, the JSON written compact; comments and development
 * scripts go. --check: only says what it would write.
 *
 * The release carries the version of lilOS, not the program's: production/package.json gets
 * "version" = the lilOS of versions.json (system.json of the official repository at that tag), so
 * the installers, the GitHub release «lilOS X.Y.Z» and its tag release-vX.Y.Z say it, and the
 * program's updates compare it; "programVersion" keeps the program's own (development/package.json).
 * A tag release-v of that version already there: lilOS needs a new version first (also when only
 * the program changed).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minifySync } from 'rolldown/experimental';
import { transform as transformCss } from 'lightningcss';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FROM = 'lilos-desktop/development';
const TO = join(root, 'lilos-desktop', 'production');
const check = process.argv.includes('--check');
/** What production/ takes from development/ (paths relative to it): the rest stays out. */
const KEEP = [/^package(-lock)?\.json$/, /^electron-builder\.yml$/, /^versions\.json$/, /^build\//, /^src\//, /^scripts\/fetch-runtime\.mjs$/];

const git = (...a) => execFileSync('git', a, { cwd: root, maxBuffer: 1 << 28 });
const status = git('status', '--porcelain', '--', FROM).toString().trim();
if (status && !check) throw new Error(`${FROM} ha modifiche non committate: la release si fa da quello che è committato\n${status}`);

const files = git('ls-files', '--', FROM).toString().split('\n').filter(Boolean)
  .map(p => p.slice(FROM.length + 1)).filter(p => KEEP.some(re => re.test(p)));

/** The file as it goes into production/. */
function lighter(path, data) {
  if (/\.(m?js|cjs)$/.test(path)) {
    const { code, errors } = minifySync(path, data.toString('utf8'), { compress: true, mangle: true, module: !path.endsWith('.cjs') });
    if (errors?.length) throw new Error(`${path}: ${errors.map(e => e.message ?? e).join('; ')}`);
    return Buffer.from(code);
  }
  if (path.endsWith('.css')) return Buffer.from(transformCss({ filename: path, code: data, minify: true }).code);
  // JSON the program reads (texts, credits): compact. package*.json and versions.json stay readable
  if (path.startsWith('src/') && path.endsWith('.json')) return Buffer.from(JSON.stringify(JSON.parse(data.toString('utf8'))));
  if (path.endsWith('.html')) return Buffer.from(data.toString('utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/\n\s*\n/g, '\n'));
  return data;
}

let before = 0, after = 0;
if (!check) rmSync(TO, { recursive: true, force: true });
for (const path of files) {
  const data = git('show', `HEAD:${FROM}/${path}`);
  const out = lighter(path, data);
  before += data.length;
  after += out.length;
  if (check) continue;
  mkdirSync(dirname(join(TO, path)), { recursive: true });
  writeFileSync(join(TO, path), out);
}
const { version: programVersion } = JSON.parse(git('show', `HEAD:${FROM}/package.json`).toString('utf8'));
const { lilos: ref } = JSON.parse(git('show', `HEAD:${FROM}/versions.json`).toString('utf8'));
const res = await fetch(`https://raw.githubusercontent.com/GexyLab/lilos-plugins-official/${ref}/system/lilos/system.json`);
if (!res.ok) throw new Error(`system.json di lilOS al tag ${ref} del repository ufficiale: ${res.status}`);
const { version } = await res.json();
const tag = `release-v${version}`;
const tags = git('ls-remote', '--tags', 'origin', tag).toString().trim() || git('tag', '--list', tag).toString().trim();
if (tags) throw new Error(`${tag} c'è già: la release porta la versione di lilOS, serve prima una nuova versione di lilOS (${ref} ha la ${version})`);
if (!check) {
  for (const name of ['package.json', 'package-lock.json']) {
    const data = JSON.parse(readFileSync(join(TO, name), 'utf8'));
    data.version = version;
    if (name === 'package.json') data.programVersion = programVersion;
    if (data.packages?.['']) data.packages[''].version = version;
    writeFileSync(join(TO, name), `${JSON.stringify(data, null, 2)}\n`);
  }
  writeFileSync(join(TO, 'README.md'), `# lilOS ${version} — programma ${programVersion} (production)

Fatta da \`${FROM}\` con \`npm run release:desktop\` («pubblica release»): non modificarla a mano.
Porta lilOS ${version} (repository ufficiale ${ref}). Il workflow \`.github/workflows/lilos-desktop.yml\`
la usa al tag \`${tag}\` per gli installer e la release «lilOS ${version}».
`);
}
console.log(`lilOS ${version} (programma ${programVersion}, ufficiale ${ref}): ${files.length} file, ${Math.round(before / 1024)} KB → ${Math.round(after / 1024)} KB${check ? ' (prova: niente scritto)' : ' in lilos-desktop/production'}`);
console.log(`Poi: changelog/${tag}.md, commit, push, tag ${tag} (il workflow fa gli installer e la release di GitHub «lilOS ${version}»)`);
