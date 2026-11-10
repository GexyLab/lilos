import { appendFile, mkdir, readFile, stat, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

/**
 * The log of each user's active programs: the console lines copied there (the project's option)
 * and how the programs ended. One file per user, JSON lines; over the user's quota (logMb) the
 * older half is dropped.
 */
export class Logs {
  #dir;
  #sizes = new Map();
  #queue = new Map();    // userId → Promise (writes of a user one after the other)

  constructor(dir) { this.#dir = join(dir, 'logs'); }

  #file(userId) { return join(this.#dir, `${createHash('sha256').update(String(userId)).digest('hex').slice(0, 32)}.jsonl`); }

  size(userId) { return this.#sizes.get(userId) ?? 0; }

  append(userId, entry, capMb) {
    const line = `${JSON.stringify({ at: Date.now(), ...entry })}\n`;
    const prev = this.#queue.get(userId) ?? Promise.resolve();
    const next = prev.then(async () => {
      await mkdir(this.#dir, { recursive: true });
      const file = this.#file(userId);
      if (!this.#sizes.has(userId)) this.#sizes.set(userId, (await stat(file).catch(() => null))?.size ?? 0);
      await appendFile(file, line);
      let size = this.#sizes.get(userId) + Buffer.byteLength(line);
      if (size > capMb * 1024 * 1024) {
        const text = await readFile(file, 'utf8');
        const keep = text.slice(Math.floor(text.length / 2));
        const rest = keep.slice(keep.indexOf('\n') + 1);
        await writeFile(`${file}.tmp`, rest);
        await rename(`${file}.tmp`, file);
        size = Buffer.byteLength(rest);
      }
      this.#sizes.set(userId, size);
    }).catch(() => {});
    this.#queue.set(userId, next);
    return next;
  }

  /** The last `limit` entries of a user (of one program, when given), newest last. */
  async read(userId, { program = null, limit = 500 } = {}) {
    const text = await readFile(this.#file(userId), 'utf8').catch(() => '');
    const out = [];
    for (const line of text.split('\n')) {
      if (!line) continue;
      try {
        const e = JSON.parse(line);
        if (!program || e.program === program) out.push(e);
      } catch { /* a line cut by a crash */ }
    }
    return out.slice(-limit);
  }
}
