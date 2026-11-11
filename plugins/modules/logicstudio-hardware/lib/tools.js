import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, isAbsolute, join } from 'node:path';
import { oops } from './common.js';

/**
 * The system programs the package uses (ffmpeg, PowerShell, espeak-ng, gpioget, i2cget, lp…).
 * Never a shell: always spawn(absolute path, [arguments]) with windowsHide; what comes from a
 * program goes as an argument of its own, in an environment variable or on stdin, never pasted
 * into a command line. On Windows PowerShell gets a fixed script with -EncodedCommand and its
 * values in LS_* environment variables.
 *
 * Every child is tracked: the module's stop() kills what is still running (killAll).
 */

export const IS_WIN = process.platform === 'win32';
export const IS_MAC = process.platform === 'darwin';
export const IS_LINUX = process.platform === 'linux';

const children = new Set();
const found = new Map();      // name → { path, at }
const FOUND_MS = 60_000;

// Where the Linux tools live even when the kernel's PATH lacks them (i2c-tools are in /usr/sbin)
const EXTRA = IS_WIN ? [] : ['/usr/local/bin', '/usr/bin', '/bin', '/usr/local/sbin', '/usr/sbin', '/sbin', '/opt/homebrew/bin'];

async function executable(file) {
  try {
    const s = await stat(file);
    if (!s.isFile()) return false;
    if (!IS_WIN) await access(file, constants.X_OK);
    return true;
  } catch { return false; }
}

/**
 * The absolute path of a program on the PATH, or null. Never the current folder (Windows would
 * look there first): only absolute folders of PATH. On Windows also the system's PowerShell.
 */
export async function which(name) {
  const have = found.get(name);
  if (have && Date.now() - have.at < FOUND_MS) return have.path;
  let path = null;
  if (IS_WIN && name === 'powershell') {
    const root = process.env.SystemRoot || 'C:\\Windows';
    const ps = join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    path = await executable(ps) ? ps : null;
  } else {
    const dirs = [...new Set([...(process.env.PATH ?? process.env.Path ?? '').split(delimiter), ...EXTRA])].filter(d => d && isAbsolute(d));
    const exts = IS_WIN ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM').split(';').filter(e => /^\.(exe|com)$/i.test(e)) : [''];
    outer: for (const dir of dirs) {
      for (const ext of exts) {
        const file = join(dir, name + ext.toLowerCase());
        if (await executable(file)) { path = file; break outer; }
      }
    }
  }
  found.set(name, { path, at: Date.now() });
  return path;
}

/** Forgets what which() found (the tests, or after installing ffmpeg: /status?refresh=1). */
export const forgetFound = () => found.clear();

/**
 * Runs a program and waits for it: { code, stdout (Buffer), stderr (string) }.
 * options: { input (string|Buffer for stdin), timeoutMs, maxOutput, signal, env (added), cwd }.
 * Killed when it takes longer than timeoutMs or the signal aborts (then it throws).
 */
export function run(file, args, { input = null, timeoutMs = 15_000, maxOutput = 4 << 20, signal = null, env = null, cwd = undefined } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(oops('Il programma non è in esecuzione')); return; }
    let child;
    try {
      child = spawn(file, args, { shell: false, windowsHide: true, cwd, env: env ? { ...process.env, ...env } : process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) { reject(err); return; }
    children.add(child);
    const out = [], err = [];
    let outSize = 0, errSize = 0, ended = false, why = null;
    const stop = reason => { if (!ended) { why = reason; try { child.kill(); } catch { /* gone */ } } };
    const timer = setTimeout(() => stop('timeout'), timeoutMs);
    const onAbort = () => stop('abort');
    signal?.addEventListener?.('abort', onAbort, { once: true });
    child.stdout.on('data', d => { outSize += d.length; if (outSize <= maxOutput) out.push(d); else stop('output'); });
    child.stderr.on('data', d => { errSize += d.length; if (errSize <= 256 << 10) err.push(d); });
    child.on('error', e => { ended = true; finish(); reject(e); });
    child.on('close', code => {
      if (ended) return;
      ended = true;
      finish();
      if (why === 'timeout') reject(oops(`${baseName(file)} non ha finito in tempo (${Math.round(timeoutMs / 1000)} s)`));
      else if (why === 'abort') reject(oops('Il programma non è in esecuzione'));
      else if (why === 'output') reject(oops(`${baseName(file)}: risposta troppo grande`));
      else resolve({ code, stdout: Buffer.concat(out), stderr: Buffer.concat(err).toString('utf8') });
    });
    function finish() {
      clearTimeout(timer);
      signal?.removeEventListener?.('abort', onAbort);
      children.delete(child);
    }
    child.stdin.on('error', () => {});
    if (input !== null && input !== undefined) child.stdin.end(input);
    else child.stdin.end();
  });
}

/**
 * Starts a program that goes on (a recording, a stream, gpiomon): the child, tracked. The caller
 * listens to it; stopChild() ends it.
 */
export function start(file, args, { env = null, stdin = 'ignore' } = {}) {
  const child = spawn(file, args, { shell: false, windowsHide: true, env: env ? { ...process.env, ...env } : process.env, stdio: [stdin, 'pipe', 'pipe'] });
  children.add(child);
  child.on('close', () => children.delete(child));
  child.on('error', () => children.delete(child));
  child.stdin?.on?.('error', () => {});
  return child;
}

/**
 * Ends a child: `gently` first (ffmpeg: 'q' on stdin, to close the file well), then kill after
 * graceMs. Resolves when it is gone.
 */
export function stopChild(child, { gently = null, graceMs = 4000 } = {}) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise(resolve => {
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* gone */ } }, graceMs);
    child.once('close', () => { clearTimeout(t); resolve(); });
    try {
      if (gently) gently(child);
      else child.kill();
    } catch { try { child.kill(); } catch { /* gone */ } }
  });
}

/** Kills every child still running (the module stops). */
export async function killAll() {
  await Promise.all([...children].map(c => stopChild(c, { graceMs: 1500 })));
  children.clear();
}

export const runningChildren = () => children.size;

const baseName = file => String(file).split(/[\\/]/).pop();

/**
 * A fixed PowerShell script, with its values in environment variables (LS_…): nothing a program
 * sends is ever part of the script. { code, stdout, stderr }.
 */
export async function powershell(script, env = {}, options = {}) {
  const ps = await which('powershell');
  if (!ps) throw oops('PowerShell non c\'è su questo computer');
  for (const k of Object.keys(env)) if (!/^LS_[A-Z0-9_]{1,30}$/.test(k)) throw new Error(`variabile non valida: ${k}`);
  const encoded = Buffer.from(`$ErrorActionPreference = 'Stop'\n[Console]::OutputEncoding = [Text.Encoding]::UTF8\n${script}`, 'utf16le').toString('base64');
  const values = Object.fromEntries(Object.entries(env).map(([k, v]) => [k, String(v ?? '')]));
  return run(ps, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], { ...options, env: values });
}

/** A private temporary folder (removed by the caller with cleanTemp). */
export const tempDir = () => mkdtemp(join(tmpdir(), 'lilos-hw-'));
export const cleanTemp = dir => (dir ? rm(dir, { recursive: true, force: true }).catch(() => {}) : Promise.resolve());

/** The system tools the package can use, found or not (for /status). */
export async function toolsFound() {
  const names = IS_WIN ? ['ffmpeg', 'powershell']
    : IS_MAC ? ['ffmpeg', 'say', 'afplay', 'osascript', 'lp', 'lpstat']
      : ['ffmpeg', 'ffplay', 'espeak-ng', 'espeak', 'spd-say', 'aplay', 'paplay', 'pactl', 'amixer', 'lp', 'lpstat', 'gpioget', 'gpioset', 'gpiomon', 'gpiodetect', 'i2cget', 'i2cset', 'i2ctransfer', 'i2cdetect'];
  const out = {};
  for (const n of names) out[n] = !!(await which(n));
  return out;
}
