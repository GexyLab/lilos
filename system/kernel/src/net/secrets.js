import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Passwords and keys of the network connections, encrypted (AES-256-GCM) with a key of this lilOS
 * kept beside them (secret.key, made on first use, readable only by who runs the kernel). They are
 * protected from who reads the connection files or a backup of them, not from who can read the
 * kernel's folder: the kernel must be able to use them to connect on its own.
 *
 *   seal(value) → 'v1:<base64 of iv | tag | data>'     value: any JSON
 *   open(sealed) → value                               throws if damaged or made with another key
 */
export class Secrets {
  #dir;
  #key = null;

  constructor(dir) {
    this.#dir = dir;
  }

  async #ready() {
    if (this.#key) return this.#key;
    const file = join(this.#dir, 'secret.key');
    try {
      this.#key = await readFile(file);
      if (this.#key.length !== 32) throw new Error('Chiave delle connessioni di rete danneggiata (secret.key)');
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      await mkdir(this.#dir, { recursive: true });
      const key = randomBytes(32);
      await writeFile(file, key, { flag: 'wx', mode: 0o600 }).catch(async e => {
        if (e.code !== 'EEXIST') throw e;   // made meanwhile: use that one
      });
      await chmod(file, 0o600).catch(() => {});
      this.#key = await readFile(file);
    }
    return this.#key;
  }

  async seal(value) {
    const key = await this.#ready();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return `v1:${Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')}`;
  }

  async open(sealed) {
    if (typeof sealed !== 'string' || !sealed.startsWith('v1:')) throw new Error('Segreto non valido');
    const key = await this.#ready();
    const raw = Buffer.from(sealed.slice(3), 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8'));
  }
}
