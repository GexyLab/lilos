import { readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fail } from '../errors.js';
import { KERNEL_DIR } from '../config.js';
import { checkManifest } from './manifest.js';
import { checkModule } from './modulePackage.js';
import { OFFICIAL_URL, cleanSource, normalizeUrl, openSource } from './sources.js';

/**
 * Repositories lilOS takes apps and kernel modules from. The official one is always there; the
 * others are added by an admin and kept in repos.json, in the kernel's folder.
 *
 *   Repo: { id, name, url, official }
 *
 * A repository has catalog.json at its root, listing the package folders:
 *   { name: 'lilOS ufficiale', apps: ['apps/files', …], modules: ['modules/users-basic', …] }
 * Each app folder has lilos.json (see manifest.js), each module folder module.json (modulePackage.js).
 */
const FILE = join(KERNEL_DIR, 'repos.json');
const OFFICIAL = Object.freeze({ id: 'official', name: 'lilOS ufficiale', url: 'https://github.com/GexyLab/lilos-plugins-official', official: true });
const SUBPATH = /^(?!.*\.\.)[\w.-]+(\/[\w.-]+){0,10}$/;
const MAX_REPOS = 30;
const MAX_ENTRIES = 200;

async function readRepos() {
  try {
    const raw = JSON.parse(await readFile(FILE, 'utf8'));
    return (Array.isArray(raw) ? raw : []).filter(r => r && /^[\w-]{4,40}$/.test(r.id) && typeof r.url === 'string' && typeof r.name === 'string').slice(0, MAX_REPOS);
  } catch {
    return [];
  }
}

async function writeRepos(list) {
  await writeFile(`${FILE}.tmp`, JSON.stringify(list, null, 2));
  await rename(`${FILE}.tmp`, FILE);
}

const requireAdmin = p => (p?.kind === 'kernel' || p?.role === 'admin' ? p : fail('forbidden', 'Solo un amministratore gestisce i repository'));

export class Repos {
  #allowLocal;

  constructor({ allowLocalSources }) {
    this.#allowLocal = allowLocalSources;
  }

  async list() {
    return [OFFICIAL, ...(await readRepos()).map(r => ({ ...r, official: false }))];
  }

  async get(id) {
    return (await this.list()).find(r => r.id === id) ?? fail('not_found', 'Repository inesistente');
  }

  /** Adds a repository after reading its catalog (so a wrong address is said at once). */
  async add(principal, { url, name }) {
    requireAdmin(principal);
    const source = cleanSource({ type: 'git', url }, { allowLocal: this.#allowLocal });
    const list = await readRepos();
    if (normalizeUrl(source.url) === OFFICIAL_URL || list.some(r => normalizeUrl(r.url) === normalizeUrl(source.url))) fail('conflict', 'Repository già presente');
    if (list.length >= MAX_REPOS) fail('invalid', `Al massimo ${MAX_REPOS} repository`);
    const catalog = await this.#readCatalog(source.url);
    const repo = {
      id: randomBytes(6).toString('base64url'),
      name: (typeof name === 'string' && name.trim().slice(0, 60)) || catalog.name || source.url,
      url: source.url,
    };
    await writeRepos([...list, repo]);
    return { ...repo, official: false };
  }

  async remove(principal, id) {
    requireAdmin(principal);
    if (id === OFFICIAL.id) fail('forbidden', 'Il repository ufficiale non si rimuove');
    const list = await readRepos();
    if (!list.some(r => r.id === id)) fail('not_found', 'Repository inesistente');
    await writeRepos(list.filter(r => r.id !== id));
  }

  async #readCatalog(url) {
    const { read, source } = await openSource({ type: 'git', url });
    let raw;
    try {
      raw = JSON.parse((await read('catalog.json')).toString('utf8'));
    } catch (err) {
      if (err.code && err.code !== 'invalid') throw err;
      fail('invalid', 'catalog.json manca o non è JSON valido');
    }
    const paths = v => (Array.isArray(v) ? v : []).filter(p => typeof p === 'string' && SUBPATH.test(p)).slice(0, MAX_ENTRIES);
    return { name: typeof raw.name === 'string' ? raw.name.slice(0, 60) : '', apps: paths(raw.apps), modules: paths(raw.modules), read, source };
  }

  /**
   * What a repository offers, at its latest version tag:
   *   { repo, ref, commit, name, apps: [{ path, manifest } | { path, error }], modules: [{ path, module } | { path, error }] }
   */
  async catalog(id) {
    const repo = await this.get(id);
    const { name, apps, modules, read, source } = await this.#readCatalog(repo.url);
    const entry = async (path, file, check) => {
      try {
        return { path, value: check(JSON.parse((await read(`${path}/${file}`)).toString('utf8'))) };
      } catch (err) {
        return { path, error: err.message };
      }
    };
    return {
      repo, name, ref: source.ref, commit: source.commit,
      apps: (await Promise.all(apps.map(p => entry(p, 'lilos.json', checkManifest)))).map(({ path, value, error }) => (error ? { path, error } : { path, manifest: value })),
      modules: (await Promise.all(modules.map(p => entry(p, 'module.json', checkModule)))).map(({ path, value, error }) => (error ? { path, error } : { path, module: value })),
    };
  }
}
