import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fail } from '../errors.js';
import { DATA_DIR } from '../config.js';
import { readJson, writeJson } from '../jsonFile.js';
import { checkManifest } from './manifest.js';
import { parseLocales } from '../../../../sdk/core/i18n.js';
import { checkModule } from './modulePackage.js';
import { checkSystem } from './systemPackage.js';
import { OFFICIAL_URL, cleanSource, isOfficial, normalizeUrl, openSource } from './sources.js';
import { defineStrings } from '../strings.js';

/**
 * Repositories lilOS takes apps and kernel modules from. The official one is always there; the
 * others are added by an admin and kept in repos.json, in the kernel's folder.
 *
 *   Repo: { id, name, url, official }
 *
 * A repository has catalog.json at its root, listing the package folders:
 *   { name: 'lilOS ufficiale', apps: ['apps/files', …], modules: ['modules/users-basic', …] }
 * Each app folder has lilos.json (see manifest.js), each module folder module.json (modulePackage.js).
 * The official one also has lilOS itself: "system": 'system/lilos', a folder with system.json,
 * README.md and CHANGELOG.md (systemPackage.js), and the language packs: "languages":
 * ['languages/it', …], folders with language.json (languagePackage.js); other repositories cannot
 * offer them.
 */
const { t } = defineStrings('lilos:kernel.repos', { en: { strings: {
  official: 'lilOS official', adminOnly: 'Only an administrator manages the repositories', missing: 'Repository not found',
  present: 'Repository already added', tooMany: 'At most {max} repositories', notOfficial: 'The official repository cannot be removed',
  catalog: 'catalog.json is missing or is not valid JSON', notInCatalog: 'Package not in the catalog', file: 'File not valid',
} } });
const FILE = join(DATA_DIR, 'repos.json');
/** The official repository; its name (a Text) is put in list(). */
const OFFICIAL = Object.freeze({ id: 'official', name: null, url: 'https://github.com/GexyLab/lilos-plugins-official', official: true });
const SUBPATH = /^(?!.*\.\.)[\w.-]+(\/[\w.-]+){0,10}$/;
const MAX_REPOS = 30;
const MAX_ENTRIES = 200;
const MAX_README = 64 << 10;

async function readRepos() {
  try {
    const raw = await readJson(FILE, []);
    return (Array.isArray(raw) ? raw : []).filter(r => r && /^[\w-]{4,40}$/.test(r.id) && typeof r.url === 'string' && typeof r.name === 'string').slice(0, MAX_REPOS);
  } catch {
    return [];
  }
}

const writeRepos = list => writeJson(FILE, list, { pretty: true });

/** An app's translations file with only the texts of its manifest ('@' keys), or null. */
async function manifestLocales(read, path, manifest) {
  if (!manifest.locales) return null;
  try {
    const table = parseLocales((await read(`${path}/${manifest.locales}`)).toString('utf8'));
    for (const lang of Object.values(table)) lang.strings = Object.fromEntries(Object.entries(lang.strings).filter(([k]) => k.startsWith('@')));
    return table;
  } catch {
    return null;
  }
}

const requireAdmin = p => (p?.kind === 'kernel' || p?.role === 'admin' ? p : fail('forbidden', t('adminOnly')));

export class Repos {
  #allowLocal;
  #languages;

  constructor({ allowLocalSources }, languages) {
    this.#allowLocal = allowLocalSources;
    this.#languages = languages;
  }

  async list() {
    return [{ ...OFFICIAL, name: t('official') }, ...(await readRepos()).map(r => ({ ...r, official: false }))];
  }

  async get(id) {
    return (await this.list()).find(r => r.id === id) ?? fail('not_found', t('missing'));
  }

  /** Adds a repository after reading its catalog (so a wrong address is said at once). */
  async add(principal, { url, name }) {
    requireAdmin(principal);
    const source = cleanSource({ type: 'git', url }, { allowLocal: this.#allowLocal });
    const list = await readRepos();
    if (normalizeUrl(source.url) === OFFICIAL_URL || list.some(r => normalizeUrl(r.url) === normalizeUrl(source.url))) fail('conflict', t('present'));
    if (list.length >= MAX_REPOS) fail('invalid', t('tooMany', { max: MAX_REPOS }));
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
    if (id === OFFICIAL.id) fail('forbidden', t('notOfficial'));
    const list = await readRepos();
    if (!list.some(r => r.id === id)) fail('not_found', t('missing'));
    await writeRepos(list.filter(r => r.id !== id));
  }

  async #readCatalog(url) {
    const { read, source } = await openSource({ type: 'git', url });
    let raw;
    try {
      raw = JSON.parse((await read('catalog.json')).toString('utf8'));
    } catch (err) {
      if (err.code && err.code !== 'invalid') throw err;
      fail('invalid', t('catalog'));
    }
    const paths = v => (Array.isArray(v) ? v : []).filter(p => typeof p === 'string' && SUBPATH.test(p)).slice(0, MAX_ENTRIES);
    return {
      name: typeof raw.name === 'string' ? raw.name.slice(0, 60) : '', apps: paths(raw.apps), modules: paths(raw.modules),
      system: typeof raw.system === 'string' && SUBPATH.test(raw.system) ? raw.system : null, languages: paths(raw.languages), read, source,
    };
  }

  /**
   * What a repository offers, at its latest version tag:
   *   { repo, ref, commit, name, apps: [{ path, manifest, locales, readme, readmeTruncated? } | { path, error }],
   *     modules: [{ path, module, readme, readmeTruncated? } | { path, error }],
   *     system: { path, system, readme, readmeTruncated?, changelog, changelogTruncated? } | { path, error } | null,
   *     languages: [{ path, language, readme } | { path, error }] }   (only the official one has them)
   * readme: the text of README.md in the package folder (Markdown), or null. Past 64 KB it is cut at
   * the end of a line and readmeTruncated is true: readme() gives it whole. The same for lilOS's
   * CHANGELOG.md. system: lilOS, only in the official repository (system.json with `files` turned
   * into how many they are).
   * locales: the app's translations file with only the texts of the manifest ('@' keys), or null:
   * the SDK's locale.manifest(manifest, locales) shows them in the user's language.
   */
  async catalog(id) {
    const repo = await this.get(id);
    const { name, apps, modules, system, languages, read, source } = await this.#readCatalog(repo.url);
    const doc = async (path, file = 'README.md', key = 'readme') => {
      const text = await read(`${path}/${file}`).then(b => b.toString('utf8'), () => null);
      if (text === null || Buffer.byteLength(text) <= MAX_README) return { [key]: text };
      const cut = Buffer.from(text).subarray(0, MAX_README).toString('utf8').replace(/�$/, '');
      return { [key]: cut.includes('\n') ? cut.slice(0, cut.lastIndexOf('\n') + 1) : cut, [`${key}Truncated`]: true };
    };
    const readme = path => doc(path);
    const entry = async (path, file, check, key) => {
      try {
        const value = check(JSON.parse((await read(`${path}/${file}`)).toString('utf8')));
        return { path, [key]: value, ...(key === 'manifest' && { locales: await manifestLocales(read, path, value) }), ...await readme(path) };
      } catch (err) {
        return { path, error: err.text ?? err.message };
      }
    };
    return {
      repo, name, ref: source.ref, commit: source.commit,
      apps: await Promise.all(apps.map(p => entry(p, 'lilos.json', checkManifest, 'manifest'))),
      modules: await Promise.all(modules.map(p => entry(p, 'module.json', checkModule, 'module'))),
      system: repo.official && system ? await entry(system, 'system.json', raw => {
        const { files, ...rest } = checkSystem(raw);
        return { ...rest, files: Object.keys(files).length };
      }, 'system').then(async e => (e.error ? e : { ...e, ...await doc(system, 'CHANGELOG.md', 'changelog') })) : null,
      // Without the language packs (tools/install.js reads only the modules): none
      languages: repo.official && this.#languages ? await this.#languages.catalog(read, languages) : [],
    };
  }

  /**
   * The packages of the repository at `url` (one an admin added or not: a package names where its
   * dependencies come from), at its latest version tag, without READMEs:
   *   { url, official, ref, commit, apps: [{ path, manifest, locales }], modules: [{ path, module }] }
   * Packages whose manifest is not valid are left out.
   */
  async packages(url) {
    const { apps, modules, read, source } = await this.#readCatalog(url);
    const entry = async (path, file, check, key) => {
      try {
        const value = check(JSON.parse((await read(`${path}/${file}`)).toString('utf8')));
        return { path, [key]: value, ...(key === 'manifest' && { locales: await manifestLocales(read, path, value) }) };
      } catch {
        return null;
      }
    };
    return {
      url: source.url, official: isOfficial(source), ref: source.ref, commit: source.commit,
      apps: (await Promise.all(apps.map(p => entry(p, 'lilos.json', checkManifest, 'manifest')))).filter(Boolean),
      modules: (await Promise.all(modules.map(p => entry(p, 'module.json', checkModule, 'module')))).filter(Boolean),
    };
  }

  /** The whole README.md of a package of the catalog (`path` as the catalog lists it); of lilOS also CHANGELOG.md. */
  async readme(id, path, file = 'README.md') {
    const repo = await this.get(id);
    const { apps, modules, system, read } = await this.#readCatalog(repo.url);
    const isSystem = repo.official && !!system && path === system;
    if (![...apps, ...modules].includes(path) && !isSystem) fail('not_found', t('notInCatalog'));
    if (file !== 'README.md' && !(isSystem && file === 'CHANGELOG.md')) fail('invalid', t('file'));
    return (await read(`${path}/${file}`)).toString('utf8');
  }
}
