import { BrowserWindow, app, dialog, shell } from 'electron';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, watch, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, isAbsolute, join, parse } from 'node:path';
import { t } from './i18n.js';

/**
 * Files between lilOS and the computer.
 *   openOnComputer   a copy in a temporary folder, opened with the computer's program for its type;
 *                    when that program saves it, the page gets 'file-changed' (lilOS saves it back)
 *   exportToComputer the computer's save dialog (one file) or folder dialog (several)
 *   openPath/reveal  a file of the computer (the folders of Rete › Questo computer)
 * Programs are never started from here: files that would run (exe, scripts, installers…) are refused.
 */
const RUNNABLE = new Set([
  '.exe', '.com', '.bat', '.cmd', '.msi', '.msix', '.msp', '.scr', '.pif', '.cpl', '.ps1', '.psm1', '.vbs', '.vbe', '.js', '.jse',
  '.wsf', '.wsh', '.hta', '.lnk', '.reg', '.jar', '.appref-ms', '.application', '.gadget', '.inf', '.sys', '.dll', '.url',
  '.app', '.command', '.pkg', '.dmg', '.workflow', '.terminal', '.sh', '.bash', '.zsh', '.csh', '.run', '.bin', '.appimage',
  '.deb', '.rpm', '.desktop', '.py', '.pl', '.rb',
]);
const OPEN_DIR = join(tmpdir(), 'lilos-open');
const MAX_FILE = 512 << 20;
const watchers = new Map();   // token → { watcher, timer, contents }

export const runnable = name => RUNNABLE.has(extname(String(name)).toLowerCase());

/** A name safe on every system (no folders, no reserved characters or names). */
export function safeName(name) {
  let n = basename(String(name ?? '')).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/, '').slice(0, 200);
  if (/^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(n)) n = `_${n}`;
  return n || 'file';
}

const toBuffer = data => {
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  throw new Error('Contenuto del file non valido');
};
const hash = buf => createHash('sha256').update(buf).digest('hex');

export async function openOnComputer(contents, { name, data }) {
  const file = safeName(name);
  if (runnable(file)) throw new Error(t('files.runnable', { name: file }));
  const buf = toBuffer(data);
  if (buf.length > MAX_FILE) throw new Error(t('files.tooBig'));
  const token = randomBytes(12).toString('hex');
  const dir = join(OPEN_DIR, token);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, file);
  writeFileSync(path, buf);
  const error = await shell.openPath(path);
  if (error) {
    rmSync(dir, { recursive: true, force: true });
    throw new Error(t('files.noProgram', { name: file }));
  }
  let last = hash(buf);
  let timer = null;
  // Programs save in many ways (write in place, write a copy and rename): watch the folder
  const watcher = watch(dir, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        if (!existsSync(path) || contents.isDestroyed()) return;
        const now = readFileSync(path);
        const h = hash(now);
        if (h === last) return;
        last = h;
        contents.send('lilos-host:event', 'file-changed', { token, name: file, data: now.buffer.slice(now.byteOffset, now.byteOffset + now.byteLength) });
      } catch { /* still being written: the next change reads it */ }
    }, 800);
  });
  watchers.set(token, { watcher, contents });
  contents.once('destroyed', () => stopWatching(token));
  return { token };
}

export function stopWatching(token) {
  const w = watchers.get(token);
  if (!w) return;
  w.watcher.close();
  watchers.delete(token);
}

/** Cleans the copies of the previous runs (at start and at quit). */
export function cleanOpened() {
  for (const token of watchers.keys()) stopWatching(token);
  rmSync(OPEN_DIR, { recursive: true, force: true });
}

function uniquePath(dir, name) {
  const { name: stem, ext } = parse(name);
  let path = join(dir, name);
  for (let i = 2; existsSync(path); i++) path = join(dir, `${stem} (${i})${ext}`);
  return path;
}

export async function exportToComputer(contents, files) {
  if (!Array.isArray(files) || !files.length || files.length > 500) throw new Error('Nessun file da esportare');
  const win = BrowserWindow.fromWebContents(contents);
  const list = files.map(f => ({ name: safeName(f.name), buf: toBuffer(f.data) }));
  if (list.length === 1) {
    const { canceled, filePath } = await dialog.showSaveDialog(win, { title: t('files.exportOne'), defaultPath: join(app.getPath('downloads'), list[0].name) });
    if (canceled || !filePath) return null;
    writeFileSync(filePath, list[0].buf);
    return { saved: [filePath] };
  }
  const { canceled, filePaths } = await dialog.showOpenDialog(win, { title: t('files.exportMany', { count: list.length }), defaultPath: app.getPath('downloads'), properties: ['openDirectory', 'createDirectory'] });
  if (canceled || !filePaths[0]) return null;
  const saved = list.map(f => {
    const path = uniquePath(filePaths[0], f.name);
    writeFileSync(path, f.buf);
    return path;
  });
  return { saved };
}

function checkPath(path) {
  if (typeof path !== 'string' || !isAbsolute(path) || path.includes('\0')) throw new Error('Percorso non valido');
  if (!existsSync(path)) throw new Error(t('files.missing'));
  return path;
}

export async function openPath(path) {
  checkPath(path);
  if (statSync(path).isFile() && runnable(path)) throw new Error(t('files.runnable', { name: basename(path) }));
  const error = await shell.openPath(path);
  if (error) throw new Error(t('files.noProgram', { name: basename(path) }));
}

export function reveal(path) {
  shell.showItemInFolder(checkPath(path));
}

export async function pickFolder(contents) {
  const win = BrowserWindow.fromWebContents(contents);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, { title: t('files.pickFolder'), properties: ['openDirectory', 'createDirectory'] });
  return canceled ? null : filePaths[0] ?? null;
}
