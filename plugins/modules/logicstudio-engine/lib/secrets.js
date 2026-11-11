import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * The secret settings of the blocks (config fields of type 'secret', such as a database password):
 * the IDE asks the engine to seal what the user typed (POST /seal) and the schema keeps only the
 * sealed text; a package's action opens it in the kernel (tools.secret), never in the worker.
 *
 * AES-256-GCM with a key of this engine (secret.key in its data folder, made on first use, readable
 * only by who runs the kernel), and the user's id as additional data: a sealed text opens only for
 * a program of the user who sealed it, on this lilOS. A schema copied to another user or to another
 * lilOS needs the password typed again.
 *
 *   seal(userId, value) → 'ls1:<base64 of iv | tag | data>'     value: a string
 *   open(userId, sealed) → value                                 throws when it cannot be opened
 */
export const SEALED = /^ls1:[A-Za-z0-9+/=]{40,12000}$/;
const MAX_VALUE = 4096;

export class Secrets {
  #dir;
  #key = null;

  constructor(dir) { this.#dir = dir; }

  async #ready() {
    if (this.#key) return this.#key;
    const file = join(this.#dir, 'secret.key');
    try {
      const key = await readFile(file);
      if (key.length !== 32) throw new Error('Chiave dei segreti di Logic Studio danneggiata (secret.key)');
      this.#key = key;
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      await mkdir(this.#dir, { recursive: true });
      await writeFile(file, randomBytes(32), { flag: 'wx', mode: 0o600 }).catch(e => { if (e.code !== 'EEXIST') throw e; });
      await chmod(file, 0o600).catch(() => {});
      this.#key = await readFile(file);
    }
    return this.#key;
  }

  async seal(userId, value) {
    if (typeof value !== 'string') throw new Error('Serve un testo');
    if (value.length > MAX_VALUE) throw new Error(`Testo troppo lungo (al massimo ${MAX_VALUE} caratteri)`);
    const key = await this.#ready();
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', key, iv);
    c.setAAD(Buffer.from(`lilos-logicstudio:${userId}`));
    const data = Buffer.concat([c.update(value, 'utf8'), c.final()]);
    return `ls1:${Buffer.concat([iv, c.getAuthTag(), data]).toString('base64')}`;
  }

  async open(userId, sealed) {
    if (typeof sealed !== 'string' || !SEALED.test(sealed)) throw new Error('Segreto non valido');
    const key = await this.#ready();
    const raw = Buffer.from(sealed.slice(4), 'base64');
    try {
      const d = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
      d.setAAD(Buffer.from(`lilos-logicstudio:${userId}`));
      d.setAuthTag(raw.subarray(12, 28));
      return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8');
    } catch {
      throw new Error('Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)');
    }
  }
}
