import { execFile, spawn } from 'node:child_process';
import { homedir } from 'node:os';

/**
 * Opens a terminal of the computer running `command` (the lilos launcher, by its absolute path, so
 * that it works without the PATH):
 *   Windows   Windows Terminal (wt.exe) if there, else a window of cmd.exe; both stay open (/k)
 *   macOS     Terminal, through osascript
 *   Linux     x-terminal-emulator (Debian's choice), else gnome-terminal, konsole, xterm
 * The terminal is not a child the program waits for: it stays when the program quits.
 */
const env = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('ELECTRON_') && k !== 'NODE_OPTIONS'));

/** Starts `cmd`: resolves when it started, rejects when it is not there (ENOENT). */
function launch(cmd, args, options = {}) {
  return new Promise((done, fail) => {
    const child = spawn(cmd, args, { cwd: homedir(), env: env(), stdio: 'ignore', detached: true, ...options });
    child.once('error', fail);
    child.once('spawn', () => { child.unref(); done(); });
  });
}

const found = name => new Promise(done => execFile('where.exe', [name], { windowsHide: true, timeout: 3000 }, err => done(!err)));

async function windows(command) {
  if (await found('wt.exe')) {
    return launch('wt.exe', ['-w', 'new', 'new-tab', '--title', 'lilOS', '-d', homedir(), 'cmd.exe', '/k', command]);
  }
  // A console program started by a program without a console gets a window of its own (not detached: that would have none)
  return launch('cmd.exe', ['/k', command], { detached: false, windowsHide: false });
}

function mac(command) {
  const sh = `'${command.replace(/'/g, `'\\''`)}'`;
  const apple = sh.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return launch('osascript', ['-e', 'tell application "Terminal"', '-e', 'activate', '-e', `do script "${apple}"`, '-e', 'end tell']);
}

async function linux(command) {
  const tries = [
    ['x-terminal-emulator', ['-e', command]],
    ['gnome-terminal', ['--', command]],
    ['konsole', ['-e', command]],
    ['xterm', ['-e', command]],
  ];
  for (const [cmd, args] of tries) {
    try {
      return await launch(cmd, args);
    } catch { /* not this one */ }
  }
  throw new Error('nessun terminale trovato (x-terminal-emulator, gnome-terminal, konsole, xterm)');
}

export function openTerminal(command) {
  if (process.platform === 'win32') return windows(command);
  if (process.platform === 'darwin') return mac(command);
  return linux(command);
}
