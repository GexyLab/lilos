import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { fail } from '../errors.js';
import { checkManifest, parseVersion, compareVersions } from './manifest.js';

/**
 * Where packages (apps and kernel modules) come from: a folder in a git repository.
 *
 *   { type: 'git', url: 'https://github.com/owner/name', ref?: 'v1.2.0' | branch | commit, path?: 'apps/notes' }
 *       without ref: the highest version tag (v1.2.3 or 1.2.3), or the default branch if there
 *       are none. Read with the `git` command of the kernel's computer, so private repositories
 *       work with the credentials git already has (credential helper, tokens, SSH keys).
 *       The commit is recorded: updating and reinstalling start from it.
 *   { type: 'github', repo: 'owner/name', … }     the same, written short
 *   { type: 'local', dir: 'C:/…/notes' }          a plain folder, for developing (allowLocalSources)
 *
 * With allowLocalSources a git url may also be the absolute path of a repository on this computer.
 */
export const OFFICIAL_URL = 'https://github.com/gexylab/lilos-plugins-official';

const run = promisify(execFile);
const REPO = /^[\w.-]{1,100}\/[\w.-]{1,100}$/;
const REF = /^(?!-)[\w./-]{1,200}$/;
const SUBPATH = /^(?!.*\.\.)[\w.-]+(\/[\w.-]+){0,10}$/;
const MAX_FILE = 20 << 20;
const MAX_PACKAGE = 80 << 20;
const MAX_FILES = 2000;
const CACHE_MS = 120_000;

export const normalizeUrl = url => String(url).trim().replace(/\.git$/i, '').replace(/\/+$/, '').toLowerCase();

export function cleanSource(raw, { allowLocal }) {
  if (raw?.type === 'github') {
    if (!REPO.test(raw.repo ?? '')) fail('invalid', 'Repository non valido (proprietario/nome)');
    return cleanSource({ ...raw, type: 'git', url: `https://github.com/${raw.repo}` }, { allowLocal });
  }
  if (raw?.type === 'git') {
    const url = String(raw.url ?? '').trim();
    // A folder first: 'C:\…' would also read as a URL (protocol 'c:')
    let ok = allowLocal && isAbsolute(url);
    if (!ok) try { ok = new URL(url).protocol === 'https:'; } catch { ok = false; }
    if (!ok) fail('invalid', allowLocal ? 'Indirizzo del repository non valido (https:// o una cartella)' : 'Indirizzo del repository non valido (https://)');
    if (raw.ref !== undefined && !REF.test(raw.ref)) fail('invalid', 'Riferimento non valido');
    if (raw.path !== undefined && raw.path !== '' && !SUBPATH.test(raw.path)) fail('invalid', 'Percorso nel repository non valido');
    return { type: 'git', url, ...(raw.ref && { ref: raw.ref }), ...(raw.path && { path: raw.path }) };
  }
  if (raw?.type === 'local') {
    if (!allowLocal) fail('forbidden', 'Le cartelle locali come origine sono permesse solo in sviluppo (allowLocalSources)');
    if (typeof raw.dir !== 'string' || !isAbsolute(raw.dir)) fail('invalid', 'Cartella non valida (percorso assoluto)');
    return { type: 'local', dir: resolve(raw.dir) };
  }
  return fail('invalid', 'Origine sconosciuta: "git", "github" o "local"');
}

export const isOfficial = source => source.type === 'git' && normalizeUrl(source.url) === OFFICIAL_URL;

async function git(args, cwd) {
  try {
    const { stdout } = await run('git', args, {
      cwd, timeout: 180_000, maxBuffer: 32 << 20, windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
    });
    return stdout;
  } catch (err) {
    if (err.code === 'ENOENT') fail('unavailable', 'Il comando git non è installato sul computer del kernel');
    const msg = String(err.stderr || err.message).split('\n').find(l => l.trim()) ?? 'errore';
    fail('unavailable', `git: ${msg.replace(/https:\/\/[^@\s]+@/g, 'https://')}`.slice(0, 300));
  }
}

/** The ref to use: the given one, else the highest version tag, else the default branch. */
export async function resolveRef(url, ref) {
  if (ref) return ref;
  const tags = (await git(['ls-remote', '--tags', '--', url])).split('\n')
    .map(l => l.split('\t')[1]?.replace('refs/tags/', ''))
    .filter(t => t && !t.endsWith('^{}') && parseVersion(t.replace(/^v/, '')));
  if (!tags.length) return 'HEAD';
  return tags.sort((a, b) => compareVersions(b.replace(/^v/, ''), a.replace(/^v/, '')))[0];
}

const checkouts = new Map();   // 'url@ref' → { promise, at }

function forget(key) {
  const entry = checkouts.get(key);
  checkouts.delete(key);
  entry?.promise.then(c => rm(c.dir, { recursive: true, force: true })).catch(() => {});
}

/** A shallow copy of the repository at `ref` in a temporary folder: { dir, commit }. Shared for a short while. */
async function checkout(url, ref) {
  const key = `${normalizeUrl(url)}@${ref}`;
  const cached = checkouts.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.promise;
  if (cached) forget(key);
  const promise = (async () => {
    const dir = await mkdtemp(join(tmpdir(), 'lilos-git-'));
    try {
      await git(['init', '-q'], dir);
      await git(['fetch', '-q', '--depth', '1', '--', url, ref], dir);
      // Files exactly as committed: no line-ending conversion, or their hashes would not match
      await git(['config', 'core.autocrlf', 'false'], dir);
      await git(['config', 'core.eol', 'lf'], dir);
      await git(['-c', 'advice.detachedHead=false', 'checkout', '-q', 'FETCH_HEAD'], dir);
      const commit = (await git(['rev-parse', 'HEAD'], dir)).trim();
      return { dir, commit };
    } catch (err) {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
      throw err;
    }
  })();
  checkouts.set(key, { promise, at: Date.now() });
  promise.catch(() => checkouts.delete(key));
  setTimeout(() => forget(key), CACHE_MS * 2).unref();
  return promise;
}

/** Reads files inside `base` only. */
function reader(base) {
  return async path => {
    const full = resolve(base, path);
    const rel = relative(base, full);
    if (!rel || rel.startsWith('..') || isAbsolute(rel) || rel.split(sep).includes('..')) fail('invalid', `Percorso fuori dal pacchetto: ${path}`);
    const s = await stat(full).catch(() => fail('not_found', `Manca ${path}`));
    if (!s.isFile() || s.size > MAX_FILE) fail('invalid', `${path} non è un file o è troppo grande`);
    return readFile(full);
  };
}

/** Every file under `base` ('a/b.js'), without .git, node_modules and dot-files. */
export async function walk(base, dir = base, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await walk(base, full, out);
    else if (e.isFile()) out.push(relative(base, full).split(sep).join('/'));
    if (out.length > MAX_FILES) fail('too_large', 'Troppi file nel pacchetto');
  }
  return out;
}

/**
 * Opens a source: { base, read(path) → Buffer, source } where `source` has the ref and the
 * commit it resolved to. `base` is the package folder on disk.
 */
export async function openSource(source) {
  if (source.type === 'local') return { base: source.dir, read: reader(source.dir), source };
  const ref = await resolveRef(source.url, source.ref);
  const { dir, commit } = await checkout(source.url, ref);
  const base = source.path ? join(dir, ...source.path.split('/')) : dir;
  if (!(await stat(base).catch(() => null))?.isDirectory()) fail('not_found', `Nel repository non c'è ${source.path}`);
  return { base, read: reader(base), source: { ...source, ref, commit } };
}

/** An app package: the manifest (checked) and the files it lists (hashes are checked by the caller). */
export async function fetchPackage(source) {
  const { read, source: resolved } = await openSource(source);
  let raw;
  try {
    raw = JSON.parse((await read('lilos.json')).toString('utf8'));
  } catch (err) {
    if (err.code) throw err;
    fail('invalid', 'lilos.json non è JSON valido');
  }
  const manifest = checkManifest(raw);
  const files = new Map();
  let total = 0;
  for (const path of Object.keys(manifest.files ?? {})) {
    const data = await read(path);
    total += data.length;
    if (total > MAX_PACKAGE) fail('too_large', 'Pacchetto troppo grande');
    files.set(path, data);
  }
  return { manifest, files, source: resolved };
}
