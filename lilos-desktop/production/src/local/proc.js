import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, renameSync, statSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { LOG_DIR } from '../runtime.js';

const LOG_MAX = 5 << 20;

/** An append-only log in the logs folder, moved to <name>.1.log past 5 MB at opening. */
export function openLog(name) {
  mkdirSync(LOG_DIR, { recursive: true });
  const file = join(LOG_DIR, `${name}.log`);
  try {
    if (statSync(file).size > LOG_MAX) renameSync(file, join(LOG_DIR, `${name}.1.log`));
  } catch { /* no log yet */ }
  return createWriteStream(file, { flags: 'a' });
}

/**
 * Runs a program to its end: { code, output } (stdout and stderr together, the last 64 KB).
 * Every line also goes to the log and to onLine.
 */
export function run(command, args, { cwd, env, log, onLine, input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, windowsHide: true, stdio: [input == null ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
    let output = '';
    const take = chunk => {
      const text = String(chunk);
      output = (output + text).slice(-64 << 10);
      log?.write(text);
      if (onLine) for (const line of text.split(/\r?\n/)) if (line.trim()) onLine(line.trim());
    };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.on('error', reject);
    // 'exit', not 'close': a program can leave its output open to what it starts (pg_ctl to the
    // server, on Windows), and 'close' would wait for that one too
    child.on('exit', code => setTimeout(() => resolve({ code, output }), 50));
    if (input != null) child.stdin.end(input);
  });
}

/** True if nothing listens on 127.0.0.1:port. */
export function portFree(port) {
  return new Promise(resolve => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}

/** The first free port from `from` (up to 200 after it). */
export async function freePort(from) {
  for (let port = from; port < from + 200; port++) if (await portFree(port)) return port;
  throw new Error(`Nessuna porta libera da ${from} a ${from + 199}`);
}

/** Stops a process and what it started: the whole tree on Windows, SIGTERM then SIGKILL elsewhere. */
export function stopTree(child, { graceMs = 8000 } = {}) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      if (process.platform !== 'win32') try { child.kill('SIGKILL'); } catch { /* gone */ }
    }, graceMs);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
    if (process.platform === 'win32') {
      // No signals on Windows: run.js could not pass one on to the kernel, so the tree goes at once
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  });
}
