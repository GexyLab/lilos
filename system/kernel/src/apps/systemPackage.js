import { randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fail } from '../errors.js';
import { INSTALL_DIR, MODULES_DIR, SYSTEM_VERSION, loadConfig } from '../config.js';
import { KERNEL_API, scanModules } from '../modules.js';
import { SDK_VERSIONS, compareVersions, inRange, parseVersion, sha256 } from './manifest.js';
import { openSource } from './sources.js';
import { logger } from '../log.js';
import { writeJson } from '../jsonFile.js';
import { defineStrings } from '../strings.js';

/**
 * lilOS itself as a package: the build of one version (the page, the kernel, the files of the SDK
 * the kernel uses), published in the official repository with its README.md and CHANGELOG.md,
 * never its sources (scripts/release.mjs makes it; catalog.json says where: "system": 'system/lilos').
 *
 * system.json, at the root of a release:
 *   { name: 'lilos', version: '1.8.0', kernel: 1, sdk: ['1', '2'], node: 22, commit?, date?,
 *     files: { 'web/index.html': 'sha256-<base64>', 'system/kernel/src/main.js': …, … } }
 *   kernel: the API version kernel modules declare (module.json "kernel"); sdk: the app SDK
 *   versions it runs; node: the lowest major version of Node.js; files: every file with its hash.
 *
 * In an installed lilOS (config.js) each version is a folder releases/<version>, and current.json
 * says which one runs (run.js reads it):
 *   { version: '1.8.0', previous: '1.7.0' | null, trial?: true,
 *     updated?: { from: '1.7.0', at }, failed?: { version: '1.8.0', at, reason, log: [lines] } }
 * Updating writes the new release and current.json with `trial`, then the kernel restarts. run.js
 * keeps the new version if it comes up (and writes `updated`: lilOS asks the admins whether to
 * delete the one before), or goes back to `previous` by itself and writes `failed` (lilOS tells
 * the admins). Only admins change versions, only from the official repository. A copy of the
 * repository (development) is not updated here: git does it.
 */
const log = logger('system');
const RELEASES = INSTALL_DIR && join(INSTALL_DIR, 'releases');
const CURRENT = INSTALL_DIR && join(INSTALL_DIR, 'current.json');
const FILE = /^(?!.*\.\.)(?!\/)[\w.@-]+(\/[\w.@-]+){0,20}$/;
const HASH = /^sha256-[A-Za-z0-9+/]{43}=$/;
const MAX_FILES = 5000;
const MAX_SIZE = 200 << 20;
const DOCS = ['README.md', 'CHANGELOG.md'];

export function checkSystem(raw) {
  const m = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : fail('invalid', t('invalid'));
  const bad = key => fail('invalid', t(key));
  if (m.name !== 'lilos') bad('notLilos');
  if (!parseVersion(m.version)) bad('version');
  if (!Number.isInteger(m.kernel) || m.kernel < 1) bad('kernel');
  if (!Array.isArray(m.sdk) || !m.sdk.length || m.sdk.some(v => typeof v !== 'string' || !/^\d{1,3}$/.test(v))) bad('sdk');
  if (!Number.isInteger(m.node) || m.node < 1) bad('node');
  const files = m.files && typeof m.files === 'object' && !Array.isArray(m.files) ? Object.entries(m.files) : bad('files');
  if (!files.length || files.length > MAX_FILES) bad('count');
  if (files.some(([path, hash]) => !FILE.test(path) || !HASH.test(hash ?? ''))) bad('entry');
  if (!m.files['web/index.html'] || !m.files['system/kernel/src/main.js']) bad('parts');
  return m;
}

const exists = path => stat(path).then(() => true, () => false);

async function readCurrent() {
  try { return JSON.parse(await readFile(CURRENT, 'utf8')); } catch { return { version: SYSTEM_VERSION, previous: null }; }
}

const writeCurrent = value => writeJson(CURRENT, value, { pretty: true });

/** The versions in releases/, newest first. */
async function releases() {
  const out = [];
  for (const e of await readdir(RELEASES, { withFileTypes: true }).catch(() => [])) {
    if (e.isDirectory() && parseVersion(e.name) && await exists(join(RELEASES, e.name, 'system.json'))) out.push(e.name);
  }
  return out.sort((a, b) => compareVersions(b, a));
}

const { t } = defineStrings('lilos:kernel.systemPackage', { en: { strings: {
  invalid: 'system.json not valid', notLilos: 'system.json: it is not a lilOS package', version: 'system.json: version not valid',
  kernel: 'system.json: kernel version not valid', sdk: 'system.json: SDK versions not valid', node: 'system.json: Node.js version not valid',
  files: 'system.json: files missing', count: 'system.json: number of files not valid', entry: 'system.json: path or hash not valid in files',
  parts: 'system.json: the page or the kernel is missing',
  adminOnly: 'Only an administrator updates lilOS', development: 'This lilOS runs from a copy of the repository (development): it is updated with git',
  noVersions: 'The official repository has no versions of lilOS', json: 'system.json is not valid JSON',
  older: 'The version available ({version}) is older than the one in use', tooLarge: 'lilOS package too large',
  changed: '{path}: the content does not match system.json', nodeNeeded: 'lilOS {version} needs Node.js {needed} or later (this has {node})',
  modules: 'Kernel modules not compatible with lilOS {version}: {names}. Update them first',
  apps: 'Apps not compatible with lilOS {version}: {names}. Update or remove them first', notInstalled: 'The version {version} is not installed',
  badVersion: 'Version not valid', inUse: 'The version {version} is in use', notice: 'Unknown notice',
} } });
const requireAdmin = p => (p?.kind === 'kernel' || p?.role === 'admin' ? p : fail('forbidden', t('adminOnly')));
const requireInstalled = () => INSTALL_DIR || fail('conflict', t('development'));

export class SystemReleases {
  #kernel;

  constructor(kernel) {
    this.#kernel = kernel;
  }

  /**
   * { version, mode: 'installed' | 'development' } for everyone; for admins also
   *   { kernel, sdk, releases: [version], next: version | null, previous, updated, failed }
   * next: the version that starts at the next restart, when it is not the one running.
   */
  async info(principal) {
    const base = { version: SYSTEM_VERSION, mode: INSTALL_DIR ? 'installed' : 'development' };
    if (principal?.role !== 'admin' && principal?.kind !== 'kernel') return base;
    if (!INSTALL_DIR) return { ...base, kernel: KERNEL_API, sdk: SDK_VERSIONS, releases: [], next: null, previous: null, updated: null, failed: null };
    const current = await readCurrent();
    return {
      ...base, kernel: KERNEL_API, sdk: SDK_VERSIONS, releases: await releases(),
      next: current.version !== SYSTEM_VERSION ? current.version : null,
      previous: current.previous ?? null, updated: current.updated ?? null, failed: current.failed ?? null,
    };
  }

  /** The newest version in the official repository (or `ref` of it), put next to this one: it runs from the next restart. */
  async update(principal, { ref } = {}) {
    requireAdmin(principal);
    requireInstalled();
    const catalog = await this.#kernel.repos.catalog('official');
    if (!catalog.system?.system) fail('not_found', catalog.system?.error ?? t('noVersions'));
    const { read, source } = await openSource({ type: 'git', url: catalog.repo.url, ref: ref ?? catalog.ref, path: catalog.system.path });
    let manifest;
    try {
      manifest = checkSystem(JSON.parse((await read('system.json')).toString('utf8')));
    } catch (err) {
      if (err.code && err.code !== 'invalid') throw err;
      fail('invalid', err.code ? err.text ?? err.message : t('json'));
    }
    const order = compareVersions(manifest.version, SYSTEM_VERSION);
    if (order === 0) return { version: SYSTEM_VERSION, unchanged: true };
    if (order < 0 && !ref) fail('conflict', t('older', { version: manifest.version }));
    await this.#checkCompatible(manifest);

    const dest = join(RELEASES, manifest.version);
    const temp = join(RELEASES, `.${manifest.version}-${randomBytes(4).toString('hex')}`);
    try {
      let total = 0;
      for (const [path, hash] of Object.entries(manifest.files)) {
        const data = await read(path);
        total += data.length;
        if (total > MAX_SIZE) fail('too_large', t('tooLarge'));
        if (sha256(data) !== hash) fail('invalid', t('changed', { path }));
        await mkdir(dirname(join(temp, ...path.split('/'))), { recursive: true });
        await writeFile(join(temp, ...path.split('/')), data);
      }
      for (const doc of DOCS) {
        const data = await read(doc).catch(() => null);
        if (data) await writeFile(join(temp, doc), data);
      }
      await writeFile(join(temp, 'system.json'), JSON.stringify({ ...manifest, source }, null, 2));
      // A folder of this version left by a failed try is written over
      await rm(dest, { recursive: true, force: true });
      await rename(temp, dest);
    } catch (err) {
      await rm(temp, { recursive: true, force: true }).catch(() => {});
      throw err;
    }
    const { failed, updated, ...current } = await readCurrent();
    await writeCurrent({ ...current, version: manifest.version, previous: SYSTEM_VERSION, trial: true });
    log.info(`lilOS ${manifest.version} installato accanto alla ${SYSTEM_VERSION} da ${principal.username ?? 'kernel'} (attivo dal prossimo avvio)`);
    return { version: manifest.version, previous: SYSTEM_VERSION, restartRequired: true };
  }

  /** What would not work with that version: throws, saying what to update first. */
  async #checkCompatible(manifest) {
    const node = Number(process.versions.node.split('.')[0]);
    if (node < manifest.node) fail('conflict', t('nodeNeeded', { version: manifest.version, needed: manifest.node, node }));
    const config = await loadConfig();
    const installed = await scanModules(MODULES_DIR);
    const modules = [];
    for (const want of config.modules) {
      const mod = installed.get(want.name)?.find(v => !want.version || v.version === want.version);
      const declared = mod && JSON.parse(await readFile(join(mod.dir, 'module.json'), 'utf8').catch(() => '{}')).kernel;
      if (mod && String(declared) !== String(manifest.kernel)) modules.push(want.name);
    }
    if (modules.length) fail('conflict', t('modules', { version: manifest.version, names: modules.join(', ') }));
    const apps = (await this.#kernel.installer.list())
      .filter(a => !manifest.sdk.includes(String(a.manifest.sdk)) || (a.manifest.lilos && !inRange(a.manifest.lilos, manifest.version)))
      .map(a => a.manifest.name ?? a.id);
    if (apps.length) fail('conflict', t('apps', { version: manifest.version, names: apps.join(', ') }));
  }

  /** Goes back (or forth) to another version kept in releases/: it runs from the next restart, on trial as an update. */
  async use(principal, version) {
    requireAdmin(principal);
    requireInstalled();
    if (!(await releases()).includes(version)) fail('not_found', t('notInstalled', { version }));
    const { failed, updated, trial, ...current } = await readCurrent();
    // The one running: a version waiting for the restart is called off
    if (version === SYSTEM_VERSION) {
      await writeCurrent({ ...current, version, previous: current.previous === version ? null : current.previous });
      return { version, restartRequired: false };
    }
    const manifest = checkSystem(JSON.parse(await readFile(join(RELEASES, version, 'system.json'), 'utf8')));
    await this.#checkCompatible(manifest);
    await writeCurrent({ ...current, version, previous: SYSTEM_VERSION, trial: true });
    log.info(`lilOS ${version} scelto da ${principal.username ?? 'kernel'} al posto della ${SYSTEM_VERSION} (attivo dal prossimo avvio)`);
    return { version, restartRequired: true };
  }

  /** Deletes a version kept in releases/ (not the one running, nor the one starting next). */
  async remove(principal, version) {
    requireAdmin(principal);
    requireInstalled();
    if (!parseVersion(version)) fail('invalid', t('badVersion'));
    const current = await readCurrent();
    if (version === SYSTEM_VERSION || version === current.version) fail('conflict', t('inUse', { version }));
    if (!(await releases()).includes(version)) fail('not_found', t('notInstalled', { version }));
    await rm(join(RELEASES, version), { recursive: true, force: true });
    const next = { ...current };
    if (next.previous === version) next.previous = null;
    if (next.updated?.from === version) delete next.updated;
    await writeCurrent(next);
    log.info(`lilOS ${version} eliminato da ${principal.username ?? 'kernel'}`);
    return { removed: version };
  }

  /** The admins saw a notice: 'updated' (they keep the version before) or 'failed'. */
  async acknowledge(principal, notice) {
    requireAdmin(principal);
    requireInstalled();
    if (notice !== 'updated' && notice !== 'failed') fail('invalid', t('notice'));
    const { [notice]: _, ...rest } = await readCurrent();
    await writeCurrent(rest);
  }
}
