/**
 * Puts the built packages into a copy of a repository that lilOS installs from (the official one,
 * the community one or another), ready to commit and tag there:
 *
 *   npm run publish:repo -- <repository folder> [<app | module | lilos>…] [--sources] [--no-minify] [--no-merge]
 *
 * Names as for build.mjs (app/scheduler, module/scheduler). With no names it publishes what changed: every app and module whose version differs from the
 * repository's (or that it lacks), and lilOS itself when the root package.json has a version the
 * repository's system/lilos does not.
 *   apps/<id>/        build/apps/<id> (lilos.json, dist/, locales.json, README.md), see build.mjs
 *   modules/<name>/   build/modules/<name>, code merged and minified
 *   system/lilos/     lilOS itself, by the root scripts/release.mjs
 *   catalog.json      the official repository (same name as plugins/catalog.json) gets the lists
 *                     of plugins/catalog.json; any other gets the published packages added
 * --sources also copies the sources: src/<id>/ (with src/shared/) and src/modules/<name>/. The
 * official repository never gets them. --no-minify and --no-merge are for other repositories,
 * when asked.
 * It prints each package with its old and new version, for changelog/<tag>.md.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { APPS, MODULES, buildAll, packagesOf } from './build.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const [repoArg, ...names] = args.filter(a => !a.startsWith('--'));
if (!repoArg) throw new Error('Uso: npm run publish:repo -- <cartella del repository> [app | modulo | lilos…] [--sources] [--no-minify] [--no-merge]');
const repo = resolve(repoArg);
if (!existsSync(join(repo, 'catalog.json'))) throw new Error(`In ${repo} non c'è catalog.json: non è un repository di lilOS`);

const readJson = file => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);
const source = readJson('catalog.json');
const catalog = readJson(join(repo, 'catalog.json'));
const official = catalog.name === source.name;
if (official && flags.has('--sources')) throw new Error('Il repository ufficiale non riceve i sorgenti');

const versions = {
  app: id => [readJson(join(repo, 'apps', id, 'lilos.json'))?.version ?? null, readJson(join('src', id, 'app.json')).version],
  module: name => [readJson(join(repo, 'modules', name, 'module.json'))?.version ?? null, readJson(join('modules', name, 'module.json')).version],
  lilos: () => [readJson(join(repo, 'system', 'lilos', 'system.json'))?.version ?? null, readJson(join('..', 'package.json')).version],
};
const all = [{ kind: 'lilos', name: 'lilos' }, ...APPS.map(a => ({ kind: 'app', name: a.id })), ...MODULES.map(name => ({ kind: 'module', name }))];
const chosen = names.length
  ? [...(names.includes('lilos') ? [all[0]] : []), ...packagesOf(names.filter(n => n !== 'lilos'))]
  : all.filter(({ kind, name }) => { const [before, now] = versions[kind](name); return before !== now; });
if (!chosen.length) { console.log('Niente da pubblicare: il repository ha già queste versioni'); process.exit(0); }

const packages = chosen.filter(p => p.kind !== 'lilos');
const report = chosen.map(p => ({ ...p, from: versions[p.kind](p.name)[0] }));
if (packages.length) await buildAll(packages.map(p => `${p.kind}/${p.name}`), { minify: !flags.has('--no-minify'), merge: !flags.has('--no-merge') });

for (const { kind, name } of packages) {
  const folder = kind === 'app' ? 'apps' : 'modules';
  rmSync(join(repo, folder, name), { recursive: true, force: true });
  cpSync(join('build', folder, name), join(repo, folder, name), { recursive: true });
  if (!flags.has('--sources')) continue;
  const [src, dest] = kind === 'app' ? [join('src', name), join(repo, 'src', name)] : [join('modules', name), join(repo, 'src', 'modules', name)];
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true, filter: path => !/[\\/]node_modules$/.test(path) });
  if (kind === 'app' && existsSync(join('src', 'shared'))) cpSync(join('src', 'shared'), join(repo, 'src', 'shared'), { recursive: true });
}

// The catalog before lilOS's release, which adds "system" to it
const listed = { ...catalog };
if (official) Object.assign(listed, { apps: source.apps, modules: source.modules });
for (const { kind, name } of packages) {
  const key = kind === 'app' ? 'apps' : 'modules';
  if (!(listed[key] ??= []).includes(`${key}/${name}`)) listed[key] = [...listed[key], `${key}/${name}`];
}
writeFileSync(join(repo, 'catalog.json'), `${JSON.stringify(listed, null, 2)}\n`);

if (chosen.some(p => p.kind === 'lilos')) execFileSync(process.execPath, [join('scripts', 'release.mjs'), repo], { cwd: '..', stdio: 'inherit' });

console.log(`\nPubblicati in ${repo}:`);
for (const { name, kind, from } of report) console.log(`  ${kind} ${name}: ${from ?? '(nuovo)'} → ${versions[kind](name)[1]}`);
for (const path of [...catalog.apps ?? [], ...catalog.modules ?? []]) {
  if (!listed.apps.includes(path) && !listed.modules?.includes(path)) console.log(`  attenzione: ${path} non è più nel catalogo, la cartella resta: toglila a mano se va rimossa`);
}
