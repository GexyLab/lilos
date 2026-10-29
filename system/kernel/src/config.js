import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** system/kernel: the kernel's own folder. */
export const KERNEL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MODULES_DIR = join(KERNEL_DIR, 'modules');

const NAME = /^[a-z][a-z0-9-]{0,40}$/;
const VERSION = /^\d+\.\d+\.\d+$/;

/**
 * config.json (or the file in LILOS_KERNEL_CONFIG):
 *   { host, port, origins: [origin], loopbackOrigins, secureCookies,
 *     modules: [{ name, version?, config? }],
 *     apps: { allowLocalSources, trustedPublishers: { id: 'ed25519:<key>' }, officialKey?,
 *             bootstrap: [app ids installed from the official repository when missing] } }
 * allowLocalSources lets apps be installed from a folder of this computer (development only).
 * LILOS_KERNEL_HOST and LILOS_KERNEL_PORT override host and port.
 */
export async function loadConfig() {
  const file = process.env.LILOS_KERNEL_CONFIG ?? join(KERNEL_DIR, 'config.json');
  const raw = JSON.parse(await readFile(file, 'utf8'));
  const port = Number(process.env.LILOS_KERNEL_PORT ?? raw.port ?? 8790);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta non valida');
  const modules = Array.isArray(raw.modules) ? raw.modules : [];
  for (const m of modules) {
    if (!m || !NAME.test(m.name) || (m.version != null && !VERSION.test(m.version))) throw new Error(`Modulo non valido nella configurazione: ${JSON.stringify(m)}`);
  }
  return {
    host: String(process.env.LILOS_KERNEL_HOST ?? raw.host ?? '127.0.0.1'),
    port,
    origins: (Array.isArray(raw.origins) ? raw.origins : []).filter(o => typeof o === 'string'),
    loopbackOrigins: raw.loopbackOrigins === true,
    secureCookies: raw.secureCookies === true,
    allowLocalSources: raw.apps?.allowLocalSources === true,
    trustedPublishers: raw.apps?.trustedPublishers && typeof raw.apps.trustedPublishers === 'object' ? raw.apps.trustedPublishers : {},
    officialKey: typeof raw.apps?.officialKey === 'string' ? raw.apps.officialKey : null,
    bootstrapApps: Array.isArray(raw.apps?.bootstrap) ? raw.apps.bootstrap.filter(id => typeof id === 'string') : ['files', 'editor', 'settings', 'appstore'],
    modules: modules.map(m => ({ name: m.name, version: m.version ?? null, config: m.config && typeof m.config === 'object' ? m.config : {} })),
  };
}
