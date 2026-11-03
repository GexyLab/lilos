/**
 * Starts the development copy of lilOS, up to date with `development`:
 *
 *   npm run dev:start [-- --no-update] [--no-pull]
 *
 * 1. npm run dev:update (scripts/dev-update.mjs: git pull, apps and modules of plugins/ into the
 *    development repository), unless --no-update; --no-pull only skips the git pull;
 * 2. the npm dependencies of the modules of config.json, when missing (npm run kernel:setup), and
 *    the development database (the docker-compose.yml of the fs-postgres module in config.json);
 * 3. the kernel (system/kernel/run.js, on the port of config.json: 8791, next to an installed lilOS
 *    on 8790) and the page (Vite, http://localhost:5173), their lines marked [kernel] and [vite].
 * Ctrl+C stops both. Stopping this process from outside stops them too (the whole tree on Windows).
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { devUpdate } from './dev-update.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const kernelDir = join(root, 'system', 'kernel');
const args = process.argv.slice(2);
const config = JSON.parse(readFileSync(join(kernelDir, 'config.json'), 'utf8'));
const port = Number(process.env.LILOS_KERNEL_PORT ?? config.port ?? 8790);

const PAGE_PORT = 5173;

/** True if something answers on host:port. */
const busy = (p, host = '127.0.0.1') => new Promise(done => {
  const socket = createConnection({ host, port: p });
  socket.once('connect', () => { socket.destroy(); done(true); });
  socket.once('error', () => done(false));
});
// Vite listens on localhost, which may be ::1 only
const busyLocal = p => busy(p, '::1');

function database() {
  const pg = config.modules?.find(m => m.name === 'fs-postgres');
  const compose = pg && join(kernelDir, 'modules', `fs-postgres_${pg.version}`, 'docker-compose.yml');
  if (!compose || !existsSync(compose)) return;
  // The container keeps its name across versions of the module (made by another folder's compose file): started as it is
  let running = null;
  try {
    running = execFileSync('docker', ['inspect', '-f', '{{.State.Running}}', 'lilos-postgres'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { /* no such container, or no Docker */ }
  try {
    if (running === 'true') return;
    if (running === 'false') execFileSync('docker', ['start', 'lilos-postgres'], { stdio: 'inherit' });
    else execFileSync('docker', ['compose', '-f', compose, 'up', '-d'], { stdio: 'inherit' });
  } catch {
    console.warn('Database di sviluppo non avviato (Docker è acceso?): il kernel non partirà senza');
  }
}

/** npm run kernel:setup when a module of config.json has npm dependencies and no node_modules yet. */
function moduleDependencies() {
  const missing = (config.modules ?? []).filter(m => {
    const dir = join(kernelDir, 'modules', `${m.name}_${m.version}`);
    if (!existsSync(join(dir, 'package.json')) || existsSync(join(dir, 'node_modules'))) return false;
    return Object.keys(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).dependencies ?? {}).length > 0;
  });
  if (!missing.length) return;
  console.log(`Dipendenze dei moduli da installare: ${missing.map(m => `${m.name} ${m.version}`).join(', ')}`);
  execFileSync(process.execPath, [join('system', 'kernel', 'setup.js')], { cwd: root, stdio: 'inherit' });
}

const children = [];

/** Runs a Node.js script with its lines marked by `name`. */
function run(name, script, scriptArgs = []) {
  const child = spawn(process.execPath, [script, ...scriptArgs], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, FORCE_COLOR: '1' } });
  for (const [from, to] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
    let rest = '';
    from.on('data', chunk => {
      const lines = (rest + chunk).split(/\r?\n/);
      rest = lines.pop();
      for (const line of lines) to.write(`[${name}] ${line}\n`);
    });
  }
  child.on('exit', code => {
    console.log(`[${name}] terminato (${code ?? 'interrotto'})`);
    stop();
  });
  children.push(child);
}

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    // run.js starts the kernel as its own child: on Windows only the whole tree stops it
    if (process.platform === 'win32') {
      try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* already gone */ }
    } else {
      child.kill('SIGTERM');
    }
  }
  setTimeout(() => process.exit(0), 500).unref();
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, stop);

try {
  if (await busy(port)) throw new Error(`Sulla porta ${port} risponde già qualcosa (un lilOS di sviluppo acceso?): fermalo prima`);
  if (await busy(PAGE_PORT) || await busyLocal(PAGE_PORT)) throw new Error(`Sulla porta ${PAGE_PORT} c'è già una pagina (npm run dev acceso?): fermala prima`);
  if (!args.includes('--no-update')) devUpdate({ pull: !args.includes('--no-pull') });
  moduleDependencies();
  database();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
execFileSync(process.execPath, [join('scripts', 'host-shims.mjs')], { cwd: root, stdio: 'inherit' });
run('kernel', join('system', 'kernel', 'run.js'));
run('vite', join('node_modules', 'vite', 'bin', 'vite.js'), ['--port', String(PAGE_PORT), '--strictPort']);
console.log(`lilOS di sviluppo: http://localhost:${PAGE_PORT} (kernel su 127.0.0.1:${port})`);
