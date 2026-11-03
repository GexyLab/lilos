/**
 * Brings the development copy of lilOS up to the `development` branch, apps and modules included:
 *
 *   npm run dev:update [-- --no-pull]
 *
 * 1. git pull --ff-only of this copy, when it is on `development` (--no-pull skips it): the page,
 *    the SDK and the kernel run from these sources, so this is their update;
 * 2. the apps and kernel modules of plugins/ whose version differs from the development repository's
 *    are built and put there (plugins/scripts/publish.mjs --no-lilos), and committed.
 * The development repository is a git repository on this computer (config.json apps.devRepository,
 * system/kernel/dev-repo by default, not committed) that the kernel of this copy reads in place of
 * the official one (system/kernel/src/apps/sources.js): the system apps come from there at the first
 * start, and the AppStore offers its newer versions as updates, to install by hand. lilOS itself is
 * not in it: a copy of the repository is updated with git.
 * The kernel reads the repository again within two minutes (sources.js keeps a copy that long), or
 * at once when restarted (npm run dev:start does both).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const kernelDir = join(root, 'system', 'kernel');
const args = process.argv.slice(2);
// Commits of the development repository only: never the identity of the lilOS repository
const IDENTITY = ['-c', 'user.name=lilOS sviluppo', '-c', 'user.email=sviluppo@lilos.invalid'];

const git = (gitArgs, cwd = root) => execFileSync('git', gitArgs, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** The development repository's folder, from config.json (null if the copy has none). */
export function devRepository() {
  const config = JSON.parse(readFileSync(join(kernelDir, 'config.json'), 'utf8'));
  const dir = config.apps?.devRepository;
  return typeof dir === 'string' && dir.trim() ? resolve(kernelDir, dir.trim()) : null;
}

function pull() {
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch !== 'development') {
    console.log(`Copia sul ramo ${branch}, non development: niente git pull`);
    return;
  }
  const before = git(['rev-parse', '--short', 'HEAD']);
  try {
    git(['pull', '--ff-only', '--quiet', 'origin', 'development']);
  } catch (err) {
    throw new Error(`git pull non riuscito (modifiche locali in conflitto, o rami divergenti): ${String(err.stderr || err.message).trim()}`);
  }
  const after = git(['rev-parse', '--short', 'HEAD']);
  console.log(before === after ? `development già aggiornato (${after})` : `development: ${before} → ${after}`);
}

/** Makes the development repository when missing: an empty catalog named as the official one. */
function ensureRepository(dir) {
  if (existsSync(join(dir, '.git'))) return;
  mkdirSync(dir, { recursive: true });
  git(['init', '-q', '-b', 'main'], dir);
  // Reinstalling an app fetches the commit it came from
  git(['config', 'uploadpack.allowAnySHA1InWant', 'true'], dir);
  git(['config', 'core.autocrlf', 'false'], dir);
  const { name } = JSON.parse(readFileSync(join(root, 'plugins', 'catalog.json'), 'utf8'));
  writeFileSync(join(dir, 'catalog.json'), `${JSON.stringify({ name, apps: [], modules: [] }, null, 2)}\n`);
  git(['add', '-A'], dir);
  git([...IDENTITY, 'commit', '-q', '-m', 'Repository di sviluppo'], dir);
  console.log(`Repository di sviluppo creato in ${dir}`);
}

export function devUpdate({ pull: doPull = true } = {}) {
  const dir = devRepository();
  if (!dir) throw new Error('config.json non ha apps.devRepository: il kernel leggerebbe il repository ufficiale da GitHub');
  if (doPull) pull();
  ensureRepository(dir);
  execFileSync(process.execPath, [join('scripts', 'publish.mjs'), dir, '--no-lilos'], { cwd: join(root, 'plugins'), stdio: 'inherit' });
  git(['add', '-A'], dir);
  if (!git(['status', '--porcelain'], dir)) return;
  git([...IDENTITY, 'commit', '-q', '-m', `development ${git(['rev-parse', '--short', 'HEAD'])}`], dir);
  console.log('Repository di sviluppo aggiornato: le nuove versioni sono nell’AppStore del lilOS di sviluppo');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    devUpdate({ pull: !args.includes('--no-pull') });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
