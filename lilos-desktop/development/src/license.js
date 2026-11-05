import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { t } from './i18n.js';
import { RELEASE_DIR } from './runtime.js';

/**
 * The license of lilOS for the step «Licenza» of lilOS without UI (welcome.html): there no page of
 * lilOS can ask it at the first sign-in, so the person accepts it in the program and install.js
 * gets --accept-license. Read as the kernel reads it (system/kernel/src/license.js): from the
 * official repository (LILOS_LICENSE_URL changes it), else the copy the carried release has at its
 * top (EULA.md, put there by scripts/release.mjs).
 */
const LICENSE_URL = process.env.LILOS_LICENSE_URL ?? 'https://raw.githubusercontent.com/GexyLab/lilos-plugins-official/main/LICENSE.md';
const TIMEOUT_MS = 8_000;
const MAX_BYTES = 256 << 10;

/** Where a person reads it: the GitHub page of a raw.githubusercontent.com file (else the address itself). */
export const LICENSE_PAGE = LICENSE_URL.replace(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/, 'https://github.com/$1/$2/blob/$3/$4');

const normalize = text => text.replace(/\r\n?/g, '\n');
let last = null;

async function remote() {
  const res = await fetch(LICENSE_URL, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = Buffer.from(await res.arrayBuffer());
  if (data.length > MAX_BYTES) throw new Error('testo troppo lungo');
  const text = normalize(data.toString('utf8'));
  if (!text.trim()) throw new Error('testo vuoto');
  return text;
}

/** { text, source: 'remote' | 'bundled', page }, or throws when neither can be read. */
export async function readLicense() {
  let text = await remote().catch(() => null);
  let source = 'remote';
  if (text == null) {
    source = 'bundled';
    text = await readFile(join(RELEASE_DIR, 'EULA.md'), 'utf8').then(normalize, () => null);
  }
  if (text == null) throw new Error(t('license.unreadable'));
  last = { text, source, page: LICENSE_PAGE };
  return last;
}

/** What was shown last (the one accepted): its source, for the log of the setup. */
export const shownLicense = () => last;
