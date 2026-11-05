import { execFile } from 'node:child_process';
import { lstatSync, mkdirSync, readFileSync, readlinkSync, rmSync, symlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launcherPath } from './local/kernel.js';
import { LILOS_DIR } from './runtime.js';
import { settings, update } from './store.js';

/**
 * The lilos command on the PATH of the user, so that `lilos` works in any terminal:
 *   Windows        the folder of lilos.cmd (lilOS's folder) appended to the user's PATH in
 *                  HKCU\Environment, by path.ps1 (the rest of the PATH untouched); the uninstaller
 *                  takes it away (build/installer.nsh)
 *   macOS, Linux   ~/.local/bin/lilos, a symbolic link to the launcher (only ours is replaced or
 *                  removed); ~/.local/bin is on the PATH of many systems, not of all: onPath says it
 * settings.local.command keeps the folder put on the PATH (null: none).
 */
const WIN = process.platform === 'win32';
const PS_SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'path.ps1');
const LOCAL_BIN = join(homedir(), '.local', 'bin');
const LINK = join(LOCAL_BIN, 'lilos');

/** Runs path.ps1 (from inside app.asar: given as its text, not as a file). */
function pathScript(op, dir) {
  const script = readFileSync(PS_SCRIPT, 'utf8');
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  return new Promise((done, fail) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], {
      env: { ...process.env, LILOS_PATH_OP: op, LILOS_CLI_DIR: dir }, windowsHide: true, timeout: 30_000,
    }, (err, stdout, stderr) => (err ? fail(new Error(String(stderr).trim().split('\n').at(-1) || err.message)) : done(String(stdout).trim())));
  });
}

/** True when `dir` is on this PATH. */
const inPath = (dir, path = process.env.PATH ?? '') => path.split(delimiter).some(p => p && resolve(p) === resolve(dir));

/** The PATH of a login shell (macOS gives programs a short one; the shell's own is what counts). */
function shellPath() {
  return new Promise(done => {
    const sh = process.env.SHELL || '/bin/sh';
    execFile(sh, ['-lc', 'printf %s "$PATH"'], { timeout: 4000 }, (err, stdout) => done(err ? '' : String(stdout)));
  });
}

/**
 * Puts the lilos command on the PATH. { onPath, localBinMissing }: onPath false only when ours
 * could not be put there; localBinMissing: ~/.local/bin is not on the PATH of the shell.
 */
export async function addCommand() {
  if (WIN) {
    await pathScript('add', LILOS_DIR);
    update(d => { d.local.command = LILOS_DIR; });
    return { onPath: true, localBinMissing: false };
  }
  mkdirSync(LOCAL_BIN, { recursive: true });
  const existing = lstatSync(LINK, { throwIfNoEntry: false });
  if (existing && !existing.isSymbolicLink()) throw new Error(`${LINK} esiste già e non è del programma`);
  if (existing) rmSync(LINK, { force: true });
  symlinkSync(launcherPath(), LINK);
  update(d => { d.local.command = LOCAL_BIN; });
  const localBinMissing = !inPath(LOCAL_BIN) && !inPath(LOCAL_BIN, await shellPath());
  return { onPath: true, localBinMissing };
}

/** Takes the lilos command away from the PATH, if the program put it there. */
export async function removeCommand() {
  const dir = settings().local.command;
  if (!dir) return;
  if (WIN) {
    await pathScript('remove', dir);
  } else {
    // Only our link (to this lilOS's launcher): one the person made is theirs
    try {
      if (lstatSync(LINK).isSymbolicLink() && resolve(LOCAL_BIN, readlinkSync(LINK)) === launcherPath()) rmSync(LINK, { force: true });
    } catch { /* not there */ }
  }
  update(d => { d.local.command = null; });
}

/**
 * What to write in a terminal: `lilos` when the program put it on the PATH, else the launcher's
 * absolute path (in quotes when it has spaces).
 */
export function commandText() {
  if (settings().local.command) return 'lilos';
  const path = launcherPath();
  return /\s/.test(path) ? `"${path}"` : path;
}
