import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Downloads what the program carries to run lilOS on the computer (versions in versions.json):
 *   node/       Node.js (with npm): runs the kernel and installs the modules' dependencies
 *   git/        portable git (dugite-native): the kernel reads apps and modules from repositories
 *   postgres/   PostgreSQL (embedded-postgres binaries): the database of fs-postgres
 *   lilos/      the release of lilOS (system/lilos of the official repository, at a tag)
 *
 *   node scripts/fetch-runtime.mjs [--platform win32|darwin|linux] [--arch x64|arm64] [--out runtime]
 *                                  [--lilos <tag>|latest]
 * Into <out>/<platform>-<arch>/ (lilos/ is the same for all: <out>/lilos/). Already there: kept.
 */
const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OFFICIAL = 'https://github.com/GexyLab/lilos-plugins-official';
const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const platform = flag('--platform', process.platform);
const arch = flag('--arch', process.arch);
const out = resolve(HERE, flag('--out', 'runtime'));
const versions = JSON.parse(await readFile(join(HERE, 'versions.json'), 'utf8'));
const lilosRef = flag('--lilos', versions.lilos);

if (!['win32', 'darwin', 'linux'].includes(platform) || !['x64', 'arm64'].includes(arch)) {
  throw new Error(`Sistema non gestito: ${platform}-${arch}`);
}
const target = join(out, `${platform}-${arch}`);
const exists = path => stat(path).then(() => true, () => false);
const sha256 = data => createHash('sha256').update(data).digest('hex');

/** Downloads `url`; a server error or a broken connection is tried again (a few times, waiting longer each time). */
async function download(url, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      const err = new Error(`${url}: ${res.status} ${res.statusText}`);
      if (res.status < 500 && res.status !== 429) throw Object.assign(err, { final: true });
      throw err;
    } catch (err) {
      if (err.final || i >= tries) throw err;
      console.log(`  ${err.message}: riprovo (${i}/${tries - 1})`);
      await new Promise(r => setTimeout(r, 5000 * i));
    }
  }
}

/** Extracts an archive (zip, tar.gz, tar.xz, tgz) with the system's tar: bsdtar on Windows reads zip too. */
async function extract(data, name, into) {
  const tmp = await mkdtemp(join(tmpdir(), 'lilos-runtime-'));
  try {
    const file = join(tmp, name);
    await writeFile(file, data);
    await mkdir(into, { recursive: true });
    // On Windows the system's bsdtar: a GNU tar earlier in PATH (Git Bash) reads neither zip nor C:\…
    const tar = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
    execFileSync(tar, ['-xf', file, '-C', into], { stdio: 'inherit' });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

/** The only folder inside `dir` becomes `dest`. */
async function hoist(dir, dest) {
  const [inner] = await readdir(dir);
  await rename(join(dir, inner), dest);
  await rm(dir, { recursive: true, force: true });
}

async function node() {
  const dest = join(target, 'node');
  if (await exists(dest)) return console.log(`node: già in ${dest}`);
  const v = versions.node;
  const os = { win32: 'win', darwin: 'darwin', linux: 'linux' }[platform];
  const name = `node-v${v}-${os}-${arch}.${platform === 'win32' ? 'zip' : 'tar.gz'}`;
  console.log(`node: ${name}`);
  const sums = (await download(`https://nodejs.org/dist/v${v}/SHASUMS256.txt`)).toString('utf8');
  const want = sums.split('\n').find(l => l.endsWith(`  ${name}`))?.split(' ')[0];
  const data = await download(`https://nodejs.org/dist/v${v}/${name}`);
  if (!want || sha256(data) !== want) throw new Error(`${name}: impronta SHA-256 diversa da SHASUMS256.txt`);
  await extract(data, name, `${dest}.tmp`);
  await hoist(`${dest}.tmp`, dest);
}

async function git() {
  const dest = join(target, 'git');
  if (await exists(dest)) return console.log(`git: già in ${dest}`);
  const { tag, version, commit } = versions.git;
  const os = { win32: 'windows', darwin: 'macOS', linux: 'ubuntu' }[platform];
  const name = `dugite-native-v${version}-${commit}-${os}-${arch}.tar.gz`;
  console.log(`git: ${name}`);
  const base = `https://github.com/desktop/dugite-native/releases/download/${tag}/${name}`;
  const want = (await download(`${base}.sha256`)).toString('utf8').trim().split(/\s+/)[0];
  const data = await download(base);
  if (sha256(data) !== want) throw new Error(`${name}: impronta SHA-256 diversa da quella pubblicata`);
  await extract(data, name, dest);
}

async function postgres() {
  const dest = join(target, 'postgres');
  if (await exists(dest)) return console.log(`postgres: già in ${dest}`);
  const pkg = `@embedded-postgres/${{ win32: 'windows', darwin: 'darwin', linux: 'linux' }[platform]}-${arch}`;
  console.log(`postgres: ${pkg}@${versions.postgres}`);
  const meta = JSON.parse((await download(`https://registry.npmjs.org/${pkg}/${versions.postgres}`)).toString('utf8'));
  const data = await download(meta.dist.tarball);
  // The registry's integrity (sha512) is the check of what was downloaded
  const [algo, hash] = meta.dist.integrity.split('-');
  if (createHash(algo).update(data).digest('base64') !== hash) throw new Error(`${pkg}: integrità diversa da quella del registro npm`);
  await extract(data, 'postgres.tgz', `${dest}.tmp`);
  await rename(join(`${dest}.tmp`, 'package', 'native'), dest);
  await rm(`${dest}.tmp`, { recursive: true, force: true });
  if (platform !== 'win32') {
    // npm packages hold no symbolic links: the package lists them (its install script makes them)
    const links = JSON.parse(await readFile(join(dest, 'pg-symlinks.json'), 'utf8').catch(() => '[]'));
    for (const { source, target: to } of links) {
      const at = join(dest, ...String(to).split('/').slice(1));
      await rm(at, { force: true });
      await symlink(relative(dirname(at), join(dest, ...String(source).split('/').slice(1))), at);
    }
    execFileSync('chmod', ['-R', 'u+x', join(dest, 'bin')]);
  }
}

/** The highest vX.Y.Z tag of the official repository. */
function latestTag() {
  const tags = execFileSync('git', ['ls-remote', '--tags', OFFICIAL], { encoding: 'utf8' }).split('\n')
    .map(l => l.split('\t')[1]?.replace('refs/tags/', '')).filter(t => /^v\d+\.\d+\.\d+$/.test(t ?? ''));
  const key = t => t.slice(1).split('.').map(Number);
  tags.sort((a, b) => { const [x, y] = [key(a), key(b)]; return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
  if (!tags.length) throw new Error('Nessun tag di versione nel repository ufficiale');
  return tags.at(-1);
}

async function lilos() {
  const dest = join(out, 'lilos');
  const ref = lilosRef === 'latest' ? latestTag() : lilosRef;
  const info = await readFile(join(dest, 'runtime-ref.json'), 'utf8').then(JSON.parse, () => null);
  if (info?.ref === ref) return console.log(`lilos: ${ref} già in ${dest}`);
  console.log(`lilos: ${OFFICIAL} ${ref}`);
  const data = await download(`https://codeload.github.com/GexyLab/lilos-plugins-official/tar.gz/refs/tags/${ref}`);
  const tmp = `${dest}.tmp`;
  await rm(tmp, { recursive: true, force: true });
  await extract(data, 'official.tar.gz', tmp);
  const [root] = await readdir(tmp);
  await rm(dest, { recursive: true, force: true });
  await cp(join(tmp, root, 'system', 'lilos'), dest, { recursive: true });
  await rm(tmp, { recursive: true, force: true });
  const system = JSON.parse(await readFile(join(dest, 'system.json'), 'utf8'));
  await writeFile(join(dest, 'runtime-ref.json'), `${JSON.stringify({ ref, version: system.version }, null, 2)}\n`);
}

await node();
await git();
await postgres();
await lilos();
await writeFile(join(target, 'runtime.json'), `${JSON.stringify({ platform, arch, node: versions.node, git: versions.git.version, postgres: versions.postgres }, null, 2)}\n`);
console.log(`Fatto: ${target}`);
