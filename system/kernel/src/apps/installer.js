import { fail } from '../errors.js';
import { KERNEL } from '../services.js';
import { logger } from '../log.js';
import { checkFiles, checkIntegrity, compareVersions, verifySignature } from './manifest.js';
import { needsGrant } from './permissions.js';
import { cleanSource, fetchPackage, isOfficial } from './sources.js';

/**
 * Installs, updates and removes apps, for everyone, through the fs service (as the kernel):
 *
 *   /system/app/<id>                 folder 'app:<id>', meta.state: what is installed (see State)
 *   /system/app/<id>/<version>/…     the package: lilos.json and its files, never changed after
 *                                    (a reinstall writes them again; nothing is deleted)
 *   /system/commons/<lib>/<version>  libraries with cache: true, meta.usedBy: [app ids]
 *   /system/tmp/<id>                 the app's temporary files, removed with it
 *
 *   State: { id, version, previous, kind, system, required, source, signed, publisher, granted, installed, updated }
 *
 * Only admins install: an app is for every user and every workspace. What an app does in each
 * user's home (its install operations) runs in lilOS, for each user, the first time they meet it.
 */
const log = logger('apps');
const MAX_LIBRARY = 20 << 20;

const appId = id => `app:${id}`;
const versionId = (id, version) => `app:${id}/${version}`;
const libId = (name, version) => `lib:${name}/${version}`;

function requireAdmin(principal) {
  if (principal?.kind === 'kernel') return;
  if (principal?.kind !== 'user' || principal.role !== 'admin') fail('forbidden', 'Solo un amministratore installa o rimuove app');
}

export class Installer {
  #fs; #config; #listeners = new Set();

  constructor(fs, config) {
    this.#fs = fs;
    this.#config = config;
  }

  onChange(fn) { this.#listeners.add(fn); }
  #changed(id) { this.#listeners.forEach(fn => fn(id)); }

  async #put(node) {
    const now = Date.now();
    await this.#fs.apply(KERNEL, { put: [{ meta: {}, created: now, modified: now, ...node }] });
  }

  async #file(id, parent, name, data) {
    await this.#put({ id, parent, name, type: 'file' });
    await this.#fs.write(KERNEL, id, data);
  }

  async state(id) {
    return (await this.#fs.stat(KERNEL, appId(id)))?.meta?.state ?? null;
  }

  /** Every installed app: state and manifest. Any signed-in user may read it. */
  async list() {
    const out = [];
    for (const folder of await this.#fs.list(KERNEL, 'fs:app')) {
      const state = folder.meta?.state;
      if (!state) continue;
      try {
        const manifest = JSON.parse((await this.#fs.read(KERNEL, `${versionId(state.id, state.version)}/lilos.json`)).toString('utf8'));
        out.push({ ...state, manifest });
      } catch (err) {
        log.error(`Manifesto illeggibile: ${state.id}`, err);
      }
    }
    return out;
  }

  /** A file of an installed app: of its current version, or of `version` (the current or the previous one). */
  async file(principal, id, path, version = null) {
    const state = await this.state(id) ?? fail('not_found', 'App non installata');
    if (version && version !== state.version && version !== state.previous) fail('not_found', 'Versione non installata');
    return this.#fs.read(principal, `${versionId(id, version ?? state.version)}/${path}`);
  }

  /** A cached library. */
  async library(principal, name, version) {
    const folder = await this.#fs.stat(principal, libId(name, version)) ?? fail('not_found', 'Libreria inesistente');
    return this.#fs.read(principal, `${libId(name, version)}/${folder.meta.file}`);
  }

  /** Signed by a known publisher (true), not verifiable (false); a signature that does not match throws. */
  #trust(manifest, source) {
    const key = manifest.publisher.key;
    if (manifest.signature && !verifySignature(manifest, key)) fail('forbidden', 'La firma del pacchetto non corrisponde: è stato modificato. Installazione rifiutata.');
    const trusted = this.#config.trustedPublishers?.[manifest.publisher.id];
    const signed = !!manifest.signature && !!trusted && trusted === key;
    if (manifest.system) {
      if (!isOfficial(source)) fail('forbidden', 'Le app di sistema si installano solo dal repository ufficiale GexyLab/lilos-plugins-official');
      if (this.#config.officialKey && !(manifest.signature && key === this.#config.officialKey)) fail('forbidden', 'App di sistema senza la firma ufficiale');
    }
    return signed || (manifest.system === true && isOfficial(source));
  }

  #checkGrant(manifest, grant, already = []) {
    const missing = needsGrant(manifest.permissions ?? []).filter(p => !already.includes(p) && !grant.includes(p));
    if (missing.length) fail('forbidden', `Permessi da concedere: ${missing.join(', ')}`);
  }

  async #store({ manifest, files }) {
    const base = versionId(manifest.id, manifest.version);
    await this.#put({ id: appId(manifest.id), parent: 'fs:app', name: manifest.id, type: 'folder', meta: (await this.#fs.stat(KERNEL, appId(manifest.id)))?.meta ?? {} });
    await this.#put({ id: base, parent: appId(manifest.id), name: manifest.version, type: 'folder' });
    const folders = new Set();
    for (const path of files.keys()) {
      const parts = path.split('/');
      for (let i = 1; i < parts.length; i++) folders.add(parts.slice(0, i).join('/'));
    }
    for (const dir of [...folders].sort((a, b) => a.split('/').length - b.split('/').length)) {
      const parent = dir.includes('/') ? `${base}/${dir.slice(0, dir.lastIndexOf('/'))}` : base;
      await this.#put({ id: `${base}/${dir}`, parent, name: dir.split('/').pop(), type: 'folder' });
    }
    for (const [path, data] of files) {
      const parent = path.includes('/') ? `${base}/${path.slice(0, path.lastIndexOf('/'))}` : base;
      await this.#file(`${base}/${path}`, parent, path.split('/').pop(), data);
    }
    await this.#file(`${base}/lilos.json`, base, 'lilos.json', Buffer.from(JSON.stringify(manifest, null, 2)));
  }

  /** Downloads (or reuses) the libraries with cache: true and marks them used by the app. */
  async #cacheLibraries(manifest) {
    for (const lib of (manifest.libraries ?? []).filter(l => l.cache)) {
      const id = libId(lib.name, lib.version);
      const existing = await this.#fs.stat(KERNEL, id);
      if (existing) {
        if (existing.meta.integrity !== lib.integrity) fail('conflict', `La libreria ${lib.name} ${lib.version} in commons ha un altro hash`);
        await this.#put({ ...existing, meta: { ...existing.meta, usedBy: [...new Set([...existing.meta.usedBy, manifest.id])] } });
        continue;
      }
      let data;
      try {
        const res = await fetch(lib.url, { signal: AbortSignal.timeout(20_000), redirect: 'follow' });
        if (!res.ok) throw new Error(`risposta ${res.status}`);
        data = Buffer.from(await res.arrayBuffer());
      } catch (err) {
        fail('unavailable', `Libreria ${lib.name} non scaricata: ${err.message}`);
      }
      if (data.length > MAX_LIBRARY) fail('too_large', `Libreria ${lib.name} troppo grande`);
      if (!checkIntegrity(data, lib.integrity)) fail('forbidden', `La libreria ${lib.name} non corrisponde al suo hash: non installata`);
      const file = new URL(lib.url).pathname.split('/').pop().replace(/[^\w.-]/g, '_') || 'index.js';
      await this.#put({ id: `lib:${lib.name}`, parent: 'fs:commons', name: lib.name, type: 'folder' });
      await this.#put({ id, parent: `lib:${lib.name}`, name: lib.version, type: 'folder', meta: { usedBy: [manifest.id], integrity: lib.integrity, url: lib.url, file } });
      await this.#file(`${id}/${file}`, id, file, data);
    }
  }

  /** The app no longer uses these libraries (all of them without `keep`): deletes the ones nobody uses. */
  async #releaseLibraries(appIdValue, keep = []) {
    for (const folder of await this.#fs.list(KERNEL, 'fs:commons')) {
      for (const v of await this.#fs.list(KERNEL, folder.id)) {
        if (!v.meta?.usedBy?.includes(appIdValue) || keep.includes(v.id)) continue;
        const usedBy = v.meta.usedBy.filter(a => a !== appIdValue);
        if (usedBy.length) await this.#put({ ...v, meta: { ...v.meta, usedBy } });
        else await this.#fs.remove(KERNEL, [v.id]);
      }
      if (!(await this.#fs.list(KERNEL, folder.id)).length) await this.#fs.remove(KERNEL, [folder.id]);
    }
  }

  async #saveState(state) {
    const folder = await this.#fs.stat(KERNEL, appId(state.id));
    await this.#put({ ...folder, meta: { ...folder.meta, state } });
  }

  async install(principal, { source: rawSource, grant = [], allowUnsigned = false } = {}) {
    requireAdmin(principal);
    const source = cleanSource(rawSource, { allowLocal: this.#config.allowLocalSources });
    const pkg = await fetchPackage(source);
    const { manifest } = pkg;
    checkFiles(manifest, pkg.files);
    if (await this.state(manifest.id)) fail('conflict', `${manifest.name} è già installata: per una nuova versione usa l'aggiornamento`);
    const signed = this.#trust(manifest, pkg.source);
    if (!signed && !allowUnsigned) fail('forbidden', 'App non verificata: si installa solo confermando l’avviso (allowUnsigned)');
    this.#checkGrant(manifest, grant);
    await this.#store(pkg);
    await this.#cacheLibraries(manifest);
    const now = Date.now();
    const state = {
      id: manifest.id, version: manifest.version, previous: null, kind: manifest.kind, system: manifest.system === true, required: manifest.required === true,
      source: pkg.source, signed, publisher: { id: manifest.publisher.id, name: manifest.publisher.name },
      granted: needsGrant(manifest.permissions ?? []), installed: now, updated: now,
    };
    await this.#saveState(state);
    log.info(`Installata ${manifest.id} ${manifest.version} (${signed ? 'verificata' : 'non verificata'}) da ${principal.username ?? 'kernel'}`);
    this.#changed(manifest.id);
    return state;
  }

  /**
   * A newer version from the app's source (`ref` for a precise one, older ones included), or
   * with `reinstall` the same version again: its files are written again, nothing is deleted.
   */
  async update(principal, id, { ref, reinstall = false, grant = [], allowUnsigned = false } = {}) {
    requireAdmin(principal);
    const state = await this.state(id) ?? fail('not_found', 'App non installata');
    const source = { ...state.source };
    delete source.commit;
    if (source.type === 'git' || source.type === 'github') {
      if (reinstall) source.ref = state.source.commit;
      else if (ref !== undefined) source.ref = ref;
      else delete source.ref;
    }
    const pkg = await fetchPackage(cleanSource(source, { allowLocal: this.#config.allowLocalSources }));
    const { manifest } = pkg;
    if (manifest.id !== id) fail('invalid', `Il pacchetto è dell'app ${manifest.id}, non di ${id}`);
    checkFiles(manifest, pkg.files);
    const order = compareVersions(manifest.version, state.version);
    if (!reinstall && order === 0) return { ...state, unchanged: true };
    if (!reinstall && order < 0 && ref === undefined) fail('conflict', `La versione disponibile (${manifest.version}) è più vecchia di quella installata`);
    if (state.system && !manifest.system) fail('forbidden', 'Un’app di sistema resta di sistema');
    const signed = this.#trust(manifest, pkg.source);
    if (!signed && !allowUnsigned) fail('forbidden', 'Versione non verificata: si installa solo confermando l’avviso (allowUnsigned)');
    this.#checkGrant(manifest, grant, state.granted);
    await this.#store(pkg);
    await this.#cacheLibraries(manifest);
    await this.#releaseLibraries(id, (manifest.libraries ?? []).filter(l => l.cache).map(l => libId(l.name, l.version)));
    const next = {
      ...state, version: manifest.version, kind: manifest.kind, required: manifest.required === true, source: pkg.source, signed,
      previous: order === 0 ? state.previous : state.version,
      granted: needsGrant(manifest.permissions ?? []), updated: Date.now(),
    };
    await this.#saveState(next);
    // Kept: the version in use and the one before it
    for (const v of await this.#fs.list(KERNEL, appId(id))) {
      if (v.type === 'folder' && v.name !== next.version && v.name !== next.previous) await this.#fs.remove(KERNEL, [v.id]);
    }
    log.info(`${reinstall ? 'Reinstallata' : 'Aggiornata'} ${id} ${state.version} → ${manifest.version}`);
    this.#changed(id);
    return next;
  }

  async uninstall(principal, id) {
    requireAdmin(principal);
    const state = await this.state(id) ?? fail('not_found', 'App non installata');
    if (state.required) fail('forbidden', `${state.id} è un'app di sistema necessaria: non si rimuove`);
    await this.#fs.remove(KERNEL, [appId(id)]);
    await this.#releaseLibraries(id);
    if (await this.#fs.stat(KERNEL, `tmp:${id}`)) await this.#fs.remove(KERNEL, [`tmp:${id}`]);
    log.info(`Rimossa ${id}`);
    this.#changed(id);
  }
}
