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
 * only port and database in config.json; everything else is lilOS's.
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

/** What tools/install.js writes in the folder: a half-done installation loses only these (the folder may be the user's). */
const INSTALLED = ['releases', 'modules', 'modules-data', '.image', 'run.js', 'package.json', 'config.json', 'repos.json', 'current.json', 'lilos-install.json'];

/**
 * Installs the carried release (and the modules of its configuration, from the official repository),
 * or what the installation settings say (`settingsFile`: another lilOS, an image, other modules…).
 */
export async function install(onLine, settingsFile = null) {
  const log = openLog('install');
  try {
    // A half-done installation (no current.json) starts again from nothing
    if (existsSync(LILOS_DIR) && !installed()) for (const name of INSTALLED) rmSync(join(LILOS_DIR, name), { recursive: true, force: true });
    const settings = settingsFile ? ['--settings', settingsFile] : [];
    const { code, output } = await run(NODE, [join(RELEASE_DIR, 'system', 'kernel', 'tools', 'install.js'), LILOS_DIR, ...settings], { env: toolEnv(), log, onLine });
    if (code !== 0) throw new Error(output.trim().split('\n').at(-1) || `install.js: codice ${code}`);
  } finally {
    log.end();
  }
}

/** Port of the kernel and address of the database, in config.json (the rest stays as it is). */
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

/** The running kernel (run.js): events 'line' (its output) and 'exit' (code). */
export class Kernel extends EventEmitter {
  #child = null;
  #log = null;

  get running() {
    return !!this.#child;
  }

  start() {
    if (this.#child) return;
    mkdirSync(LOG_DIR, { recursive: true });
    this.#log = openLog('kernel');
    const child = spawn(NODE, [join(LILOS_DIR, 'run.js')], { cwd: LILOS_DIR, env: toolEnv({ LILOS_DESKTOP: '1' }), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    this.#child = child;
    const take = chunk => {
      this.#log?.write(chunk);
      for (const line of String(chunk).split(/\r?\n/)) if (line.trim()) this.emit('line', line.trim());
    };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.on('exit', code => {
      if (this.#child === child) this.#child = null;
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
