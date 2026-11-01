/**
 * Makes the release of lilOS that the AppStore installs (system/kernel/src/apps/systemPackage.js)
 * and puts it in a copy of the official repository:
 *
 *   npm run release -- <official repository folder> [--allow-dirty]
 *
 * In <folder>/system/lilos it writes only what runs, never the sources of the page:
 *   web/                the page built by Vite
 *   system/kernel/      the kernel (src, tools, cli.js, setup.js, run.js, package.json) and
 *                       config.json, the configuration of a new installation
 *   sdk/…               the files of the SDK the kernel imports (found from its imports)
 *   package.json        "type": "module" for all of it
 *   system.json         version (package.json's), kernel API, app SDK versions, Node.js, commit
 *                       and every file with its hash
 * README.md is written only when missing; CHANGELOG.md gets a section for the new version with the
 * commits since the release before (its tag v<version> in this repository). catalog.json gets
 * "system": "system/lilos". Then commit and tag the official repository as for the apps.
 * Files of the release are taken from the working copy: it must have no uncommitted changes
 * (--allow-dirty: only to try).
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const allowDirty = args.includes('--allow-dirty');
const [repoArg] = args.filter(a => !a.startsWith('--'));
const KERNEL_FILES = ['cli.js', 'setup.js', 'run.js', 'package.json'];
const KERNEL_DIRS = ['src', 'tools'];
const KEEP = new Set(['README.md', 'CHANGELOG.md']);

const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
const sha256 = data => `sha256-${createHash('sha256').update(data).digest('base64')}`;
const toPosix = path => path.split(sep).join('/');

function walk(dir, base = dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, base, out);
    else if (e.isFile()) out.push(toPosix(relative(base, full)));
  }
  return out;
}

/** Files outside system/kernel that the kernel's files import (relative imports, followed). */
function kernelImports(files) {
  const found = new Set();
  const queue = [...files];
  while (queue.length) {
    const file = queue.pop();
    if (!file.endsWith('.js') && !file.endsWith('.mjs')) continue;
    const text = readFileSync(join(root, file), 'utf8');
    for (const m of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)['"](\.{1,2}\/[^'"]+)['"]/gm)) {
      const target = posix.normalize(posix.join(posix.dirname(file), m[1]));
      if (target.startsWith('..')) throw new Error(`${file} importa ${m[1]}, fuori dal repository`);
      if (target.startsWith('system/kernel/') || found.has(target)) continue;
      if (!existsSync(join(root, target))) throw new Error(`${file} importa ${m[1]}, che non esiste`);
      found.add(target);
      queue.push(target);
    }
  }
  return [...found].sort();
}

/** The section of the changelog for this version: the commits since the release before (or since the last version tag). */
function changelogSection(version, previous) {
  const tags = git('tag', '--list').split('\n');
  let since = previous && tags.includes(`v${previous}`) ? `v${previous}` : null;
  try {
    since ??= git('describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*.[0-9]*.[0-9]*', '--exclude', `v${version}`, 'HEAD');
  } catch { /* no version tag yet */ }
  const range = since ? [`${since}..HEAD`] : ['-30'];
  const subjects = git('log', '--no-merges', '--format=%s', ...range).split('\n').filter(Boolean);
  const date = new Date().toISOString().slice(0, 10);
  return [`## ${version} — ${date}`, '', ...(subjects.length ? subjects.map(s => `- ${s}`) : ['- Nessuna modifica registrata']), ''].join('\n');
}

const README = version => `# lilOS

La versione installabile di lilOS, il sistema operativo web: la pagina (\`web/\`), il kernel
(\`system/kernel/\`) e quello che il kernel usa dell'SDK. I sorgenti non sono qui.

## Aggiornare

Un lilOS installato si aggiorna dall'AppStore (scheda Aggiornamenti, voce lilOS), solo da un
amministratore. La nuova versione si mette accanto a quella in uso e parte al riavvio del kernel:
se non parte, lilOS torna da solo alla versione di prima e lo dice agli amministratori. Se parte,
chiede se eliminare la versione di prima. Le modifiche di ogni versione sono in [CHANGELOG.md](CHANGELOG.md).

## Installare da zero

Serve Node.js 22 o successivo, il comando \`git\` e, con la configurazione predefinita, PostgreSQL
(il modulo fs-postgres ha un docker-compose.yml). Da questa cartella:

\`\`\`sh
node system/kernel/tools/install.js <cartella di lilOS>
cd <cartella di lilOS>
node releases/${version}/system/kernel/cli.js users-basic add <nome> --admin
node run.js
\`\`\`

Con \`--from <cartella>\` l'installazione prende configurazione, moduli e dati (gli utenti) da
\`system/kernel\` di una copia del repository di lilOS o da un altro lilOS installato.
`;

try {
  if (!repoArg) throw new Error('Uso: npm run release -- <cartella del repository ufficiale> [--allow-dirty]');
  const repo = resolve(repoArg);
  if (!existsSync(join(repo, 'catalog.json'))) throw new Error(`In ${repo} non c'è catalog.json: non è il repository ufficiale`);
  const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Versione non valida in package.json: ${version}`);
  const dirty = git('status', '--porcelain', '--untracked-files=no');
  if (dirty && !allowDirty) throw new Error(`Ci sono modifiche non salvate in un commit:\n${dirty}`);

  const kernelFiles = [
    ...KERNEL_FILES.map(f => `system/kernel/${f}`),
    ...git('ls-files', ...KERNEL_DIRS.map(d => `system/kernel/${d}`)).split('\n').filter(Boolean),
  ];
  const sdkFiles = kernelImports(kernelFiles);

  // The page, built apart (dist/ stays as it is)
  const build = mkdtempSync(join(tmpdir(), 'lilos-release-'));
  try {
    execFileSync(process.execPath, [join(root, 'scripts/host-shims.mjs')], { cwd: root, stdio: 'inherit' });
    execFileSync(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', join(build, 'web'), '--emptyOutDir'], { cwd: root, stdio: 'inherit' });

    const out = join(repo, 'system', 'lilos');
    const previous = existsSync(join(out, 'system.json')) ? JSON.parse(readFileSync(join(out, 'system.json'), 'utf8')).version : null;
    mkdirSync(out, { recursive: true });
    for (const name of readdirSync(out)) if (!KEEP.has(name)) rmSync(join(out, name), { recursive: true, force: true });

    const files = {};
    const put = (path, data) => {
      mkdirSync(dirname(join(out, ...path.split('/'))), { recursive: true });
      writeFileSync(join(out, ...path.split('/')), data);
      files[path] = sha256(data);
    };
    for (const path of walk(join(build, 'web'))) put(`web/${path}`, readFileSync(join(build, 'web', ...path.split('/'))));
    for (const path of [...kernelFiles, ...sdkFiles]) put(path, readFileSync(join(root, ...path.split('/'))));
    // The configuration of a new installation: apps only from repositories
    const config = JSON.parse(git('show', 'HEAD:system/kernel/config.json'));
    config.apps = { ...config.apps, allowLocalSources: false };
    put('system/kernel/config.json', `${JSON.stringify(config, null, 2)}\n`);
    put('package.json', `${JSON.stringify({ name: 'lilos-release', private: true, type: 'module' }, null, 2)}\n`);

    const { KERNEL_API } = await import(pathToFileURL(join(root, 'system/kernel/src/modules.js')));
    const { SDK_VERSIONS } = await import(pathToFileURL(join(root, 'system/kernel/src/apps/manifest.js')));
    const engines = JSON.parse(readFileSync(join(root, 'system/kernel/package.json'), 'utf8')).engines?.node ?? '>=22';
    const manifest = {
      name: 'lilos', version, kernel: KERNEL_API, sdk: SDK_VERSIONS, node: Number(/\d+/.exec(engines)[0]),
      commit: git('rev-parse', 'HEAD'), date: new Date().toISOString().slice(0, 10),
      files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1))),
    };
    const { checkSystem } = await import(pathToFileURL(join(root, 'system/kernel/src/apps/systemPackage.js')));
    checkSystem(manifest);
    writeFileSync(join(out, 'system.json'), `${JSON.stringify(manifest, null, 2)}\n`);

    if (!existsSync(join(out, 'README.md'))) writeFileSync(join(out, 'README.md'), README(version));
    const changelogFile = join(out, 'CHANGELOG.md');
    const changelog = existsSync(changelogFile) ? readFileSync(changelogFile, 'utf8') : '# Changelog di lilOS\n\n';
    if (!new RegExp(`^## ${version.replace(/\./g, '\\.')}\\b`, 'm').test(changelog)) {
      const at = changelog.search(/^## /m);
      const section = changelogSection(version, previous && previous !== version ? previous : null);
      writeFileSync(changelogFile, at < 0 ? `${changelog.trimEnd()}\n\n${section}` : `${changelog.slice(0, at)}${section}\n${changelog.slice(at)}`);
    }

    const catalogFile = join(repo, 'catalog.json');
    const catalog = JSON.parse(readFileSync(catalogFile, 'utf8'));
    if (catalog.system !== 'system/lilos') {
      catalog.system = 'system/lilos';
      writeFileSync(catalogFile, `${JSON.stringify(catalog, null, 2)}\n`);
    }

    const size = Object.keys(files).reduce((n, path) => n + statSync(join(out, ...path.split('/'))).size, 0);
    console.log(`\nlilOS ${version}${previous ? ` (prima ${previous})` : ''}: ${Object.keys(files).length} file, ${(size / 1024).toFixed(0)} KB in ${toPosix(relative(process.cwd(), out)) || out}`);
    console.log(`SDK per il kernel: ${sdkFiles.join(', ') || 'nessun file'}`);
    console.log('Controlla CHANGELOG.md, poi commit e tag nel repository ufficiale.');
  } finally {
    rmSync(build, { recursive: true, force: true });
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
