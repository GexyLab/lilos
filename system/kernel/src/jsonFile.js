import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * JSON files of the kernel and of its modules, written whole and safely: to '<file>.tmp', then
 * renamed over the file, so whoever reads it (or a crash midway) finds the old file or the new
 * one, never half of one. They are readable only by who runs the kernel (mode 0o600: they hold
 * sessions, sealed passwords, server keys). Writes to the same file from this process go one at a
 * time, in the order they were asked: two parts of the kernel never interleave on one file.
 */
const queues = new Map();   // file → the last operation on it

/** Runs fn() after the operations on `file` asked before it. */
function queued(file, fn) {
  const run = (queues.get(file) ?? Promise.resolve()).then(fn);
  const tail = run.catch(() => {});
  queues.set(file, tail);
  tail.then(() => { if (queues.get(file) === tail) queues.delete(file); });
  return run;
}

const text = (value, pretty) => (pretty ? `${JSON.stringify(value, null, 2)}\n` : JSON.stringify(value));

/** Writes now (callers are in the file's queue). */
async function writeNow(file, value, { pretty = false, mode = 0o600 } = {}) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(`${file}.tmp`, text(value, pretty), { mode });
  await rename(`${file}.tmp`, file);
}

/** The JSON of a file; `fallback` when there is no file. Invalid JSON throws. */
export async function readJson(file, fallback = null) {
  let raw;
  try {
    raw = await readFile(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
  return JSON.parse(raw);
}

/**
 * Writes `value` as the whole file (its folder made if missing). pretty: indented, with a final
 * newline (files people read, such as config.json); mode: 0o600 unless said.
 */
export function writeJson(file, value, options = {}) {
  return queued(file, () => writeNow(file, value, options));
}

/** Removes the file (nothing if there is none), in its queue: after the writes asked before. */
export function removeJson(file) {
  return queued(file, () => rm(file, { force: true }));
}

/**
 * Reads the file, changes it and writes it, with no other write between: fn(value) → the new
 * value (undefined: `value` itself, changed in place). `fallback` when there is no file.
 * Returns what was written.
 */
export function updateJson(file, fn, { fallback = null, ...options } = {}) {
  return queued(file, async () => {
    const value = await readJson(file, fallback);
    const next = await fn(value);
    const out = next === undefined ? value : next;
    await writeNow(file, out, options);
    return out;
  });
}

/**
 * One JSON file kept in memory and saved whole after each change (the stores of the modules:
 * users, notifications, scheduled operations; ctx.jsonStore in modules.js).
 *
 *   new JsonStore(file, { clean, watch, pretty, mode, invalid })
 *     clean(raw) → data   makes the data from what the file holds: raw is its JSON, or null when
 *                         there is no file (default: raw ?? {}). Called at each read of the file
 *     watch               the file may be changed by someone else (the kernel's command line): read()
 *                         reads it again when its modification time changed (default false: read once)
 *     pretty, mode        as writeJson (default false, 0o600)
 *     invalid             a file that is not JSON: 'throw' (default: read() fails, nothing is lost)
 *                         or 'empty' (read as if there were no file: the next save replaces it)
 *   read() → data         the data (read from the file the first time; with watch, when it changed)
 *   current               the data read, without waiting: null before the first read()
 *   change(fn) → result   fn(data) (it may change data in place and be async), then the file is
 *                         saved; one change at a time, the data read again first (watch)
 *   save()                saves the data as they are now (changed in place by the caller)
 *   replace(data)         the data become `data`, and are saved
 */
export class JsonStore {
  #file; #clean; #watch; #options; #invalid;
  #data = null;
  #mtime = null;      // the file's modification time when read or written (watch)
  #loading = null;

  constructor(file, { clean = raw => raw ?? {}, watch = false, pretty = false, mode = 0o600, invalid = 'throw' } = {}) {
    if (typeof file !== 'string' || !file) throw new Error('JsonStore: file mancante');
    if (typeof clean !== 'function') throw new Error('JsonStore: clean deve essere una funzione');
    this.#file = file;
    this.#clean = clean;
    this.#watch = watch === true;
    this.#options = { pretty: pretty === true, mode };
    this.#invalid = invalid === 'empty' ? 'empty' : 'throw';
  }

  get file() { return this.#file; }
  get current() { return this.#data; }

  async #mtimeNow() {
    return (await stat(this.#file).catch(() => null))?.mtimeMs ?? 0;
  }

  async #load() {
    const mtime = this.#watch ? await this.#mtimeNow() : null;
    let raw = null;
    try {
      raw = await readJson(this.#file, null);
    } catch (err) {
      if (this.#invalid === 'throw') throw err;
      raw = null;
    }
    this.#data = this.#clean(raw);
    this.#mtime = mtime;
    return this.#data;
  }

  async read() {
    if (this.#data && (!this.#watch || await this.#mtimeNow() === this.#mtime)) return this.#data;
    this.#loading ??= this.#load().finally(() => { this.#loading = null; });
    return this.#loading;
  }

  async #write() {
    await writeNow(this.#file, this.#data, this.#options);
    if (this.#watch) this.#mtime = await this.#mtimeNow();
  }

  change(fn) {
    return queued(this.#file, async () => {
      const data = await this.read();
      const result = await fn(data);
      await this.#write();
      return result;
    });
  }

  save() {
    return queued(this.#file, async () => {
      if (this.#data === null) await this.read();
      await this.#write();
    });
  }

  replace(data) {
    this.#data = data;
    return queued(this.#file, () => this.#write());
  }
}

/**
 * The file of a user's data in `dir`: '<prefix><32 hex>.json', a hash of the user's id (ids are
 * not names of files). The connections, transfers, server keys and terminal hosts of each user.
 */
export const userFile = (dir, userId, prefix = '') => join(dir, `${prefix}${createHash('sha256').update(String(userId)).digest('hex').slice(0, 32)}.json`);
