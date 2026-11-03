import { app } from 'electron';
import { existsSync, readFileSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * What the program carries to run lilOS on this computer (scripts/fetch-runtime.mjs):
 *   <runtime>/node, git, postgres   for this system (in development: runtime/<platform>-<arch>)
 *   <lilos>                         the release of lilOS installed at the first start
 * Packaged, they are in the program's resources (electron-builder extraResources).
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WIN = process.platform === 'win32';

export const RUNTIME_DIR = app.isPackaged ? join(process.resourcesPath, 'runtime') : join(ROOT, 'runtime', `${process.platform}-${process.arch}`);
export const RELEASE_DIR = app.isPackaged ? join(process.resourcesPath, 'lilos') : join(ROOT, 'runtime', 'lilos');

/**
 * Where the program keeps its data: settings, the installed lilOS, the database, the logs.
 * LILOS_DESKTOP_DATA puts them elsewhere (tests, a second copy). The installation settings can
 * put lilOS and its database in another folder (installer.dir, installFile.js): useLilosDir.
 */
if (process.env.LILOS_DESKTOP_DATA) app.setPath('userData', process.env.LILOS_DESKTOP_DATA);
export const DATA_DIR = app.getPath('userData');
export let LILOS_DIR = join(DATA_DIR, 'lilos');
export let PG_DIR = join(DATA_DIR, 'postgres');
export const LOG_DIR = join(DATA_DIR, 'logs');

/** lilOS in `dir`, its database in <dir>/postgres. */
export function useLilosDir(dir) {
  LILOS_DIR = dir;
  PG_DIR = join(dir, 'postgres');
}

export const NODE = join(RUNTIME_DIR, 'node', WIN ? 'node.exe' : join('bin', 'node'));
const NODE_BIN = join(RUNTIME_DIR, 'node', WIN ? '' : 'bin');
const GIT_DIR = join(RUNTIME_DIR, 'git');
const PG_BIN = join(RUNTIME_DIR, 'postgres', 'bin');
export const pgTool = name => join(PG_BIN, WIN ? `${name}.exe` : name);

/** The program can run lilOS here: it carries Node, git, PostgreSQL and a release. */
export const hasRuntime = () => existsSync(NODE) && existsSync(pgTool('postgres')) && existsSync(join(RELEASE_DIR, 'system.json'));

/** The release carried by the program: { version, ref }. */
export function bundledRelease() {
  try {
    const system = JSON.parse(readFileSync(join(RELEASE_DIR, 'system.json'), 'utf8'));
    const ref = JSON.parse(readFileSync(join(RELEASE_DIR, 'runtime-ref.json'), 'utf8')).ref;
    return { version: String(system.version), ref };
  } catch {
    return null;
  }
}

/** Versions of what is carried, for Informazioni: { node, git, postgres } (null where missing). */
export function runtimeVersions() {
  try {
    return JSON.parse(readFileSync(join(RUNTIME_DIR, 'runtime.json'), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * The environment of the kernel and of its tools: the carried Node (and npm) and git first in
 * PATH, git set up as dugite does (its programs, templates, certificates), the computer's own
 * git configuration left alone.
 */
export function toolEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  for (const key of Object.keys(env)) if (key.startsWith('ELECTRON_') || key === 'NODE_OPTIONS') delete env[key];
  const paths = [NODE_BIN];
  if (WIN) {
    const mingw = ['ucrt64', 'mingw64', 'clangarm64'].map(d => join(GIT_DIR, d)).find(existsSync) ?? join(GIT_DIR, 'mingw64');
    paths.push(join(GIT_DIR, 'cmd'), join(mingw, 'bin'), join(GIT_DIR, 'usr', 'bin'));
    env.GIT_EXEC_PATH = join(mingw, 'libexec', 'git-core');
  } else {
    paths.push(join(GIT_DIR, 'bin'));
    env.GIT_EXEC_PATH = join(GIT_DIR, 'libexec', 'git-core');
    env.GIT_TEMPLATE_DIR = join(GIT_DIR, 'share', 'git-core', 'templates');
    env.PREFIX = GIT_DIR;
    const ca = join(GIT_DIR, 'ssl', 'cacert.pem');
    if (process.platform === 'linux' && existsSync(ca)) env.GIT_SSL_CAINFO = ca;
  }
  const key = WIN ? Object.keys(env).find(k => k.toUpperCase() === 'PATH') ?? 'Path' : 'PATH';
  env[key] = [...paths, env[key] ?? ''].filter(Boolean).join(delimiter);
  return env;
}
