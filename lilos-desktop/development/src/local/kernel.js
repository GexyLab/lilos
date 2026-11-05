import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { LILOS_DIR, LOG_DIR, NODE, RELEASE_DIR, toolEnv } from '../runtime.js';
import { openLog, run, stopTree } from './proc.js';

/**
 * The lilOS run here: installed in <data>/lilos by the release's tools/install.js (as by hand),
 * then started with its run.js (which restarts the kernel when it asks, and tries new versions
 * of lilOS installed from the AppStore, going back if they do not start). The program changes
 * only port and database in config.json, and "ui" when lilOS without UI becomes lilOS with the UI
 * (setUi); everything else is lilOS's.
 */
export const installed = () => existsSync(join(LILOS_DIR, 'current.json'));

export function currentVersion() {
  try {
    return String(JSON.parse(readFileSync(join(LILOS_DIR, 'current.json'), 'utf8')).version);
  } catch {
    return null;
  }
}

const configPath = () => join(LILOS_DIR, 'config.json');

/**
 * The lilos command, written by tools/install.js next to run.js for every installation: lilos.cmd
 * on Windows, an executable sh script elsewhere. Its absolute path works without the PATH.
 */
export const launcherPath = () => join(LILOS_DIR, process.platform === 'win32' ? 'lilos.cmd' : 'lilos');

/** What tools/install.js writes in the folder: a half-done installation loses only these (the folder may be the user's). */
const INSTALLED = ['releases', 'modules', 'modules-data', '.image', 'run.js', 'package.json', 'config.json', 'repos.json', 'current.json', 'lilos-install.json', 'lilos.cmd', 'lilos', 'lilos.mjs'];

/**
 * Installs the carried release (and the modules of its configuration, from the official repository),
 * or what the installation settings say (`settingsFile`: another lilOS, an image, other modules…).
 *   noUi            --no-ui: "ui": false in config.json, the module terminal-cli and the community
 *                   repository (lilOS without UI, release 1.34.0 or later)
 *   acceptLicense   --accept-license: the person accepted the license in the program (the kernel
 *                   writes it at its first start, by "install"): without UI no page can ask it
 */
export async function install(onLine, settingsFile = null, { noUi = false, acceptLicense = false } = {}) {
  const log = openLog('install');
  try {
    // A half-done installation (no current.json) starts again from nothing
    if (existsSync(LILOS_DIR) && !installed()) for (const name of INSTALLED) rmSync(join(LILOS_DIR, name), { recursive: true, force: true });
    // The folder first: install.js takes the first argument left after its flags as the folder
    const flags = [...(settingsFile ? ['--settings', settingsFile] : []), ...(noUi ? ['--no-ui'] : []), ...(acceptLicense ? ['--accept-license'] : [])];
    const { code, output } = await run(NODE, [join(RELEASE_DIR, 'system', 'kernel', 'tools', 'install.js'), LILOS_DIR, ...flags], { env: toolEnv(), log, onLine });
    if (code !== 0) throw new Error(output.trim().split('\n').at(-1) || `install.js: codice ${code}`);
  } finally {
    log.end();
  }
}

/**
 * Port of the kernel and address of the database, in config.json. The rest stays as it is: "ui"
 * above all (lilOS without UI keeps its false at every start).
 */
export function configure({ port, databaseUrl }) {
  const config = JSON.parse(readFileSync(configPath(), 'utf8'));
  config.host = '127.0.0.1';
  config.port = port;
  config.loopbackOrigins = true;
  for (const m of config.modules ?? []) {
    if (m.name === 'fs-postgres') m.config = { ...m.config, url: databaseUrl };
  }
  writeFileSync(configPath(), `${JSON.stringify(config, null, 2)}\n`);
}

/**
 * lilOS with the UI (true: the key goes, the kernel's default) or without (false). The kernel reads
 * it when it starts: with the UI and no app installed it installs the system apps by itself.
 */
export function setUi(on) {
  const config = JSON.parse(readFileSync(configPath(), 'utf8'));
  if (on) delete config.ui;
  else config.ui = false;
  writeFileSync(configPath(), `${JSON.stringify(config, null, 2)}
`);
}

/** The folder of the installed module `name` (its highest version). */
function moduleDir(name) {
  const dirs = readdirSync(join(LILOS_DIR, 'modules')).filter(d => d.startsWith(`${name}_`))
    .sort((a, b) => a.split('_')[1].localeCompare(b.split('_')[1], undefined, { numeric: true }));
  if (!dirs.length) throw new Error(`Il modulo ${name} non è installato`);
  return join(LILOS_DIR, 'modules', dirs.at(-1));
}

/**
 * Creates the database of lilOS if missing, with the `pg` of the installed fs-postgres (the
 * carried PostgreSQL has no psql): connects to the database `postgres` of the same server.
 */
export async function createDatabase(adminUrl, name) {
  const dir = moduleDir('fs-postgres');
  const script = `
    import { createRequire } from 'node:module';
    const pg = createRequire(${JSON.stringify(pathToFileURL(join(dir, 'package.json')).href)})('pg');
    const client = new pg.Client({ connectionString: process.env.LILOS_PG_ADMIN });
    await client.connect();
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [${JSON.stringify(name)}]);
    if (!rowCount) await client.query('CREATE DATABASE ' + ${JSON.stringify(`"${name}"`)} + ' ENCODING UTF8 TEMPLATE template0');
    await client.end();
  `;
  const log = openLog('install');
  try {
    const { code, output } = await run(NODE, ['--input-type=module', '-'], { env: toolEnv({ LILOS_PG_ADMIN: adminUrl }), log, input: script });
    if (code !== 0) throw new Error(`Database non creato: ${output.trim().split('\n').at(-1)}`);
  } finally {
    log.end();
  }
}

/** Adds an administrator of lilOS with the kernel's command line (users-basic add --admin). */
export async function addAdmin(username, password) {
  const version = currentVersion();
  const cli = join(LILOS_DIR, 'releases', version, 'system', 'kernel', 'cli.js');
  const log = openLog('install');
  try {
    const { code, output } = await run(NODE, [cli, 'users-basic', 'add', username, '--admin'], { cwd: LILOS_DIR, env: toolEnv({ LILOS_PASSWORD: password }), log });
    if (code !== 0) throw new Error(output.trim().split('\n').at(-1) || `cli.js: codice ${code}`);
  } finally {
    log.end();
  }
}

/**
 * Exit code of the kernel when the license of lilOS is not accepted and nobody can be asked (lilOS
 * without UI started with no terminal and no --accept-license): run.js does not try again.
 */
export const LICENSE_REFUSED = 3;

/** The running kernel (run.js): events 'line' (its output) and 'exit' (code). */
export class Kernel extends EventEmitter {
  #child = null;
  #log = null;
  /** The exit code of the last run (null while it runs, or before the first). */
  lastExit = null;

  get running() {
    return !!this.#child;
  }

  start() {
    if (this.#child) return;
    mkdirSync(LOG_DIR, { recursive: true });
    this.#log = openLog('kernel');
    const child = spawn(NODE, [join(LILOS_DIR, 'run.js')], { cwd: LILOS_DIR, env: toolEnv({ LILOS_DESKTOP: '1' }), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    this.#child = child;
    this.lastExit = null;
    const take = chunk => {
      this.#log?.write(chunk);
      for (const line of String(chunk).split(/\r?\n/)) if (line.trim()) this.emit('line', line.trim());
    };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.on('exit', code => {
      if (this.#child === child) this.#child = null;
      this.lastExit = code;
      this.#log?.end();
      this.#log = null;
      this.emit('exit', code);
    });
  }

  async stop() {
    const child = this.#child;
    if (!child) return;
    await stopTree(child);
  }
}

/**
 * Waits for the kernel to answer on 127.0.0.1:port (GET /api/session): the first start installs
 * the system apps from the official repository before listening, so it can take minutes.
 */
export async function waitReady(port, { timeoutMs = 10 * 60_000, isAlive = () => true } = {}) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (!isAlive()) throw new Error('Il kernel si è fermato mentre partiva (vedi kernel.log)');
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/session`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return;
    } catch { /* not yet */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Il kernel non ha risposto in tempo (vedi kernel.log)');
}
