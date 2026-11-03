import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, updateJson } from './jsonFile.js';

/** system/kernel: the kernel's own folder (its code). */
export const KERNEL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Where lilOS runs from:
 *   development   a copy of the lilOS repository: code, config.json, repos.json and modules/ are
 *                 all in system/kernel (KERNEL_DIR); Vite serves the page
 *   installed     a folder made by tools/install.js: run.js, current.json, config.json, repos.json
 *                 and modules/ at the top, each version of lilOS in releases/<version> (system.json,
 *                 web/, system/kernel/…: see apps/systemPackage.js); the kernel serves web/
 * RELEASE_DIR: the release this kernel is part of; INSTALL_DIR: the folder that holds releases/.
 * DATA_DIR: where config.json, repos.json and modules/ are (LILOS_DATA_DIR changes it).
 * MODULES_DATA_DIR: the modules' data that outlives their versions (ctx.dataDir, see modules.js).
 */
const releaseRoot = resolve(KERNEL_DIR, '..', '..');
const inRelease = existsSync(join(releaseRoot, 'system.json')) && basename(dirname(releaseRoot)) === 'releases';
export const RELEASE_DIR = inRelease ? releaseRoot : null;
export const INSTALL_DIR = inRelease ? dirname(dirname(releaseRoot)) : null;
export const DATA_DIR = process.env.LILOS_DATA_DIR ? resolve(process.env.LILOS_DATA_DIR) : INSTALL_DIR ?? KERNEL_DIR;
export const MODULES_DIR = join(DATA_DIR, 'modules');
export const MODULES_DATA_DIR = join(DATA_DIR, 'modules-data');

/** The version of lilOS running: its release's system.json, or the repository's package.json. */
export const SYSTEM_VERSION = (() => {
  try {
    return String(JSON.parse(readFileSync(RELEASE_DIR ? join(RELEASE_DIR, 'system.json') : join(releaseRoot, 'package.json'), 'utf8')).version);
  } catch {
    return '0.0.0';
  }
})();

/** The configuration file: config.json in DATA_DIR, or the one in LILOS_KERNEL_CONFIG. */
export const configFile = () => process.env.LILOS_KERNEL_CONFIG ?? join(DATA_DIR, 'config.json');

/**
 * Changes config.json: fn(raw) changes the file's JSON in place (or returns a new one); the
 * changes of the kernel never interleave (jsonFile.js). The running kernel keeps what it loaded:
 * who changes something that counts at once also changes it in memory.
 */
export const editConfig = fn => updateJson(configFile(), fn, { pretty: true });

const NAME = /^[a-z][a-z0-9-]{0,40}$/;
const VERSION = /^\d+\.\d+\.\d+$/;

/**
 * config.json (or the file in LILOS_KERNEL_CONFIG):
 *   { host, port, origins: [origin], loopbackOrigins, secureCookies,
 *     modules: [{ name, version?, config? }],
 *     apps: { allowLocalSources, trustedPublishers: { id: 'ed25519:<key>' }, officialKey?,
 *             bootstrap: [app ids installed from the official repository when missing],
 *             devRepository?: 'dev-repo' },
 *     net: { allowPrivate, allow: ['192.168.1.50/32'] },   where users may connect, with sign-in (net/guard.js):
 *                                                          the local network is closed unless opened here
 *     oauth: { microsoft: {…}, google: {…} } }             the apps registered with the providers, for the
 *                                                          sign-ins of the network protocols (net/oauth.js)
 * allowLocalSources lets apps be installed from a folder of this computer (development only).
 * devRepository (development only, ignored in an installed lilOS): a git repository on this computer,
 * relative to system/kernel or absolute, read in place of the official one; `npm run dev:update`
 * fills it with the apps and modules of plugins/ (see scripts/dev-update.mjs).
 * LILOS_KERNEL_HOST and LILOS_KERNEL_PORT override host and port.
 */
export async function loadConfig() {
  const raw = await readJson(configFile());
  if (!raw || typeof raw !== 'object') throw new Error(`Configurazione mancante: ${configFile()}`);
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
    bootstrapApps: Array.isArray(raw.apps?.bootstrap) ? raw.apps.bootstrap.filter(id => typeof id === 'string') : ['files', 'editor', 'settings', 'appstore', 'scheduler'],
    devRepository: !RELEASE_DIR && typeof raw.apps?.devRepository === 'string' && raw.apps.devRepository.trim() ? resolve(KERNEL_DIR, raw.apps.devRepository.trim()) : null,
    modules: modules.map(m => ({ name: m.name, version: m.version ?? null, config: m.config && typeof m.config === 'object' ? m.config : {} })),
    net: raw.net && typeof raw.net === 'object' && !Array.isArray(raw.net) ? raw.net : {},
    oauth: raw.oauth && typeof raw.oauth === 'object' && !Array.isArray(raw.oauth) ? raw.oauth : {},
  };
}
