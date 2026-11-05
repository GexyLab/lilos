import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_DIR, KERNEL_DIR, RELEASE_DIR } from './config.js';
import { fail } from './errors.js';
import { readJson, writeJson } from './jsonFile.js';
import { logger } from './log.js';
import { defineStrings } from './strings.js';

/**
 * The license of lilOS (EULA.md of the lilOS repository, D76), accepted once per installation by an
 * administrator before lilOS is used (src/boot/boot.js), or by who prepared the installation
 * (acceptLicense in lilos-install.json). Without UI (config ui false) there is no page to accept it
 * in: the kernel asks in its console when it starts (acceptAtStart). The text is read from the official repository
 * (LILOS_LICENSE_URL changes it); when that does not answer, the copy the release carries
 * (EULA.md at its top, or of the repository in development) is used.
 * license.json in the data folder keeps what was accepted:
 *   { sha256, acceptedAt, by: { id, username } | 'install' | 'console', source: 'remote' | 'bundled' }
 * A text different from the accepted one (the license changed) is asked again; while only the
 * copy is at hand, any accepted text counts: it is compared again when the repository answers.
 */
export const LICENSE_URL = process.env.LILOS_LICENSE_URL ?? 'https://raw.githubusercontent.com/GexyLab/lilos-plugins-official/main/LICENSE.md';
const BUNDLED = join(RELEASE_DIR ?? join(KERNEL_DIR, '..', '..'), 'EULA.md');
const FILE = join(DATA_DIR, 'license.json');
const CACHE_MS = 10 * 60_000;
const TIMEOUT_MS = 8_000;
const MAX_BYTES = 256 << 10;

const log = logger('license');
const { t } = defineStrings('lilos:kernel.license', { en: { strings: {
  unreadable: 'The license of lilOS cannot be read: the official repository does not answer and the included copy is missing',
  adminOnly: 'Only an administrator can accept the license of lilOS',
  changed: 'The license of lilOS has changed: read the new text',
} } });
// The same text whatever the line endings of who saved it
const normalize = text => text.replace(/\r\n?/g, '\n');
const hash = text => createHash('sha256').update(text).digest('hex');
// Where a person reads it: the GitHub page of a raw.githubusercontent.com file
const PAGE = LICENSE_URL.replace(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/, 'https://github.com/$1/$2/blob/$3/$4');

export class License {
  #remote = null;   // { text, at } of the last answer of the repository
  #failedAt = 0;

  /** The text to accept now: { text, sha256, source, url }. */
  async current() {
    const now = Date.now();
    if (!this.#remote || now - this.#remote.at > CACHE_MS) {
      if (now - this.#failedAt > 60_000) {
        try {
          this.#remote = { text: await this.#fetch(), at: now };
        } catch (err) {
          this.#failedAt = now;
          if (!this.#remote) log.warn(`Licenza non letta da ${LICENSE_URL}: ${err.message}; si usa la copia inclusa`);
        }
      }
    }
    if (this.#remote) return { text: this.#remote.text, sha256: hash(this.#remote.text), source: 'remote', url: PAGE };
    const text = await readFile(BUNDLED, 'utf8').then(normalize, () => null);
    if (text == null) fail('unavailable', t('unreadable'));
    return { text, sha256: hash(text), source: 'bundled', url: PAGE };
  }

  async #fetch() {
    const res = await fetch(LICENSE_URL, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (Number(res.headers.get('content-length')) > MAX_BYTES) throw new Error('testo troppo lungo');
    const data = Buffer.from(await res.arrayBuffer());
    if (data.length > MAX_BYTES) throw new Error('testo troppo lungo');
    const text = normalize(data.toString('utf8'));
    if (!text.trim()) throw new Error('testo vuoto');
    return text;
  }

  /** What was accepted, or null. */
  accepted() {
    return readJson(FILE, null).catch(err => {
      log.warn(`license.json non letto: ${err.message}`);
      return null;
    });
  }

  /** { accepted, text, sha256, source, url, acceptedAt }: accepted when the text now is the one accepted (see above). */
  async status() {
    const [now, done] = await Promise.all([this.current(), this.accepted()]);
    const accepted = !!done && (done.sha256 === now.sha256 || now.source === 'bundled');
    return { ...now, accepted, acceptedAt: accepted ? done.acceptedAt ?? null : null };
  }

  /**
   * An administrator accepts the text with this sha256 (the one they read): when the text changed
   * meanwhile, a conflict, so that they read the new one.
   */
  async accept(principal, sha256) {
    if (principal?.role !== 'admin') fail('forbidden', t('adminOnly'));
    const now = await this.current();
    if (sha256 !== now.sha256) fail('conflict', t('changed'));
    await writeJson(FILE, { sha256, acceptedAt: new Date().toISOString(), by: { id: principal.id, username: principal.username }, source: now.source }, { pretty: true });
    log.info(`Licenza di lilOS accettata da ${principal.username}`);
    return this.status();
  }

  /**
   * lilOS without UI, before the kernel opens its port. Accepted already: nothing. Never accepted:
   * --accept-license (or LILOS_ACCEPT_LICENSE=1) prints the text and accepts it; with a terminal
   * the text is shown a page at a time and «accetto» accepts it; anything else stops the kernel
   * (LicenseRefused: exit code 3). Accepted before but the text changed since: asked the same way
   * when there is a terminal; without one the kernel starts and says so (the admins accept it with
   * `lilos license`).
   */
  async acceptAtStart({ argv = process.argv.slice(2), env = process.env, input = process.stdin, output = process.stdout } = {}) {
    const status = await this.status();
    if (status.accepted) return;
    const before = await this.accepted();
    const byFlag = argv.includes('--accept-license') || env.LILOS_ACCEPT_LICENSE === '1';
    const tty = !!input.isTTY && !!output.isTTY;
    if (before && !tty && !byFlag) {
      log.warn('Il testo della licenza di lilOS è cambiato dall\'ultima accettazione: un amministratore lo accetta con «lilos license» o al prossimo avvio del kernel da un terminale');
      return;
    }
    if (!byFlag && !tty) {
      log.error([
        'Licenza di lilOS non accettata, e nessun terminale per chiederlo.',
        '  Avvia una volta il kernel da un terminale, oppure: node run.js --accept-license (o LILOS_ACCEPT_LICENSE=1)',
        '  oppure "acceptLicense": true in lilos-install.json',
      ].join('\n'));
      throw new LicenseRefused();
    }
    output.write(`\n${before ? 'Il testo della licenza di lilOS è cambiato dall\'ultima accettazione: leggilo e accettalo di nuovo' : 'Prima del primo avvio va accettata la licenza di lilOS'}\n`);
    if (byFlag) {
      output.write(`${status.text.replace(/\n*$/, '\n')}\nTesto completo: ${status.url}\n`);
    } else if (!await askConsole(status, input, output)) {
      log.error('Licenza di lilOS non accettata: il kernel non parte');
      throw new LicenseRefused();
    }
    await writeJson(FILE, { sha256: status.sha256, acceptedAt: new Date().toISOString(), by: 'console', source: status.source }, { pretty: true });
    log.info(`Licenza di lilOS accettata${byFlag ? ' con --accept-license' : ''} (console, sha256 ${status.sha256.slice(0, 12)}…)`);
  }

  /** acceptLicense of lilos-install.json: accepted for the installation, when nothing was yet. */
  async acceptFromInstall() {
    if (await this.accepted()) return;
    const now = await this.current();
    await writeJson(FILE, { sha256: now.sha256, acceptedAt: new Date().toISOString(), by: 'install', source: now.source }, { pretty: true });
    log.info('Licenza di lilOS accettata dalle impostazioni di installazione');
  }
}

/** The kernel stops: the license of lilOS was not accepted (main.js exits with code 3). */
export class LicenseRefused extends Error {
  constructor() {
    super('Licenza di lilOS non accettata');
    this.exitCode = 3;
  }
}

/** The text a page at a time (Enter: next, q: stop reading), then «accetto» or not. */
async function askConsole({ text, url }, input, output) {
  const { createInterface } = await import('node:readline');
  const rl = createInterface({ input, output, terminal: true });
  const ask = question => new Promise(resolve => rl.question(question, resolve));
  try {
    const lines = text.replace(/\n+$/, '').split('\n');
    const page = Math.max(5, (output.rows ?? 25) - 4);
    output.write(`${'─'.repeat(20)} LICENZA D'USO DI lilOS ${'─'.repeat(20)}\n`);
    for (let i = 0; i < lines.length; i += page) {
      output.write(`${lines.slice(i, i + page).join('\n')}\n`);
      if (i + page >= lines.length) break;
      const key = await ask(`\x1b[2m— righe ${i + 1}-${i + page} di ${lines.length} · Invio avanti, q per finire di leggere —\x1b[0m `);
      if (key.trim().toLowerCase() === 'q') break;
    }
    output.write(`\nTesto completo: ${url}\n\n`);
    const answer = await ask('Accetti la licenza? Scrivi «accetto» per accettarla, altro per uscire: ');
    return answer.trim().toLowerCase() === 'accetto';
  } finally {
    rl.close();
  }
}
