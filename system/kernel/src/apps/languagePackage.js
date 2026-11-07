import { randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fail } from '../errors.js';
import { DATA_DIR, SYSTEM_VERSION } from '../config.js';
import { LILOS_RANGE, compareVersions, inRange, parseVersion, sha256 } from './manifest.js';
import { KERNEL } from '../services.js';
import { openSource } from './sources.js';
import { logger } from '../log.js';
import { writeJson } from '../jsonFile.js';
import { readUserKey } from '../api/home.js';
import { canonicalLocale, matchLanguage, parseLanguagePack, textDirection } from '../../../../sdk/core/i18n.js';
import { defineStrings, localize, usePacks } from '../strings.js';

/**
 * Language packs: lilOS's own texts (its interface and the kernel's messages, not apps nor
 * modules, which have their own) in one more language. They come only from the official
 * repository (catalog.json "languages": ['languages/it', …]); any signed-in user installs one and
 * it is there for everyone; the user who installed it or an admin removes it. English is in the
 * code: it needs no pack.
 *
 * language.json, in the pack's folder:
 *   { id: 'lang-it', language: 'it', name: 'Italiano', englishName: 'Italian', version: '1.0.0',
 *     lilos?: '>=1.31.0', files: { 'strings.json': 'sha256-<base64>' } }
 *   language: the tag lilOS chooses it for (matchLanguage: 'it' for 'it-IT', 'pt-BR' for 'pt-PT');
 *   name: in the language itself; strings.json: see the SDK's i18n.js (parseLanguagePack).
 * Installed in languages/<language>/ (DATA_DIR) with installed.json: { by, username, at }.
 */
const log = logger('languages');
const DIR = join(DATA_DIR, 'languages');
const TAG = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$/;
const MAX_README = 64 << 10;

const { t } = defineStrings('lilos:kernel.languages', { en: { strings: {
  invalid: 'Language pack not valid: {message}',
  official: 'Language packs come only from the official repository',
  notOffered: 'The official repository has no language pack for {language}',
  noRepo: 'The official repository has no language packs',
  needs: '{name} needs lilOS {range} (this is {version})',
  changed: '{file}: its content does not match language.json',
  notInstalled: 'The language {language} is not installed',
  removeForbidden: 'Only who installed {name} or an administrator removes it',
  removed: 'The language {name} has been removed: lilOS is in English until you choose another one',
} } });

export function checkLanguage(raw) {
  const m = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : fail('invalid', t('invalid', { message: 'language.json' }));
  const bad = message => fail('invalid', t('invalid', { message }));
  const str = (v, max) => typeof v === 'string' && v.trim() && v.length <= max;
  if (typeof m.language !== 'string' || !TAG.test(m.language) || canonicalLocale(m.language) !== m.language) bad('language');
  if (m.id !== `lang-${m.language}`) bad('id');
  if (!str(m.name, 60) || (m.englishName !== undefined && !str(m.englishName, 60))) bad('name');
  if (!parseVersion(m.version)) bad('version');
  if (m.lilos !== undefined && !(typeof m.lilos === 'string' && LILOS_RANGE.test(m.lilos))) bad('lilos');
  const files = m.files && typeof m.files === 'object' && !Array.isArray(m.files) ? m.files : bad('files');
  if (Object.keys(files).join() !== 'strings.json' || !/^sha256-[A-Za-z0-9+/]{43}=$/.test(files['strings.json'] ?? '')) bad('files');
  return {
    id: m.id, language: m.language, name: m.name.trim(), ...(m.englishName && { englishName: m.englishName.trim() }),
    version: m.version, ...(m.lilos && { lilos: m.lilos }), dir: textDirection(m.language), files: { 'strings.json': files['strings.json'] },
  };
}

const isAdmin = p => p?.kind === 'kernel' || p?.role === 'admin';

export class Languages {
  #kernel;
  #packs = new Map();   // language → { manifest, installed, parts }
  #busy = new Map();    // language → the install or removal running: the next one waits for it

  /** fn() after whatever is running for that language (two users clicking at once). */
  #queue(language, fn) {
    const run = (this.#busy.get(language) ?? Promise.resolve()).catch(() => {}).then(fn);
    const done = run.catch(() => {});
    this.#busy.set(language, done);
    done.then(() => { if (this.#busy.get(language) === done) this.#busy.delete(language); });
    return run;
  }

  constructor(kernel) {
    this.#kernel = kernel;
    usePacks(code => {
      const language = matchLanguage(code, [...this.#packs.keys()]);
      return language ? { language, parts: this.#packs.get(language).parts } : null;
    });
  }

  /** Reads the packs installed (at start): one that is damaged is left out, with a line in the log. */
  async load() {
    for (const e of await readdir(DIR, { withFileTypes: true }).catch(() => [])) {
      if (!e.isDirectory() || !TAG.test(e.name)) continue;
      try {
        const dir = join(DIR, e.name);
        const manifest = checkLanguage(JSON.parse(await readFile(join(dir, 'language.json'), 'utf8')));
        if (manifest.language !== e.name) throw new Error('la cartella non è quella della lingua');
        const text = await readFile(join(dir, 'strings.json'));
        if (sha256(text) !== manifest.files['strings.json']) throw new Error('strings.json non corrisponde a language.json');
        const installed = JSON.parse(await readFile(join(dir, 'installed.json'), 'utf8').catch(() => '{}'));
        this.#packs.set(manifest.language, { manifest, installed, parts: parseLanguagePack(text.toString('utf8')) });
      } catch (err) {
        log.warn(`Pacchetto di lingua ${e.name} non caricato: ${err.message}`);
      }
    }
    if (this.#packs.size) log.info(`Lingue installate: ${[...this.#packs.keys()].join(', ')}`);
  }

  /**
   * The packs installed: { language, name, englishName?, version, lilos?, dir }; for a signed-in
   * user also { installedBy: { id, username }, installedAt, canRemove }.
   */
  list(principal) {
    return [...this.#packs.values()].map(({ manifest, installed }) => {
      const { files, id, ...info } = manifest;
      if (!principal) return info;
      return {
        ...info, installedBy: installed.by ? { id: installed.by, username: installed.username ?? null } : null,
        installedAt: installed.at ?? null, canRemove: isAdmin(principal) || (!!installed.by && installed.by === principal.id),
      };
    });
  }

  /** The strings of an installed pack: { language, version, dir, strings: { [part]: { key: text } } }. */
  strings(language) {
    const pack = this.#packs.get(language) ?? fail('not_found', t('notInstalled', { language }));
    return { language, version: pack.manifest.version, dir: pack.manifest.dir, strings: pack.parts };
  }

  /** The packs of the official repository (catalog "languages"): [{ path, language, readme } | { path, error }]. */
  async catalog(read, paths) {
    return Promise.all(paths.map(async path => {
      try {
        const language = checkLanguage(JSON.parse((await read(`${path}/language.json`)).toString('utf8')));
        const readme = await read(`${path}/README.md`).then(b => b.toString('utf8').slice(0, MAX_README), () => null);
        return { path, language, readme };
      } catch (err) {
        return { path, error: err.text ?? err.message };
      }
    }));
  }

  /**
   * At start: the packs installed that the official repository has in a newer version for this
   * lilOS are updated, so the texts a lilOS update brought are in the language too (not English).
   * Never throws: without the repository they stay as they are, with a line in the log.
   */
  async updateInstalled() {
    if (!this.#packs.size) return;
    let catalog;
    try {
      catalog = await this.#kernel.repos.catalog('official');
    } catch (err) {
      log.warn(`Aggiornamento delle lingue non controllato: ${err.message}`);
      return;
    }
    for (const [language, pack] of this.#packs) {
      const offered = catalog.languages?.find(e => e.language?.language === language)?.language;
      if (!offered || compareVersions(offered.version, pack.manifest.version) <= 0) continue;
      if (offered.lilos && !inRange(offered.lilos, SYSTEM_VERSION)) continue;
      await this.install(KERNEL, language).catch(err => log.warn(`Lingua ${language} non aggiornata: ${err.text ?? err.message}`));
    }
  }

  /** Installs (or updates) the pack of `language` from the official repository, for everyone. */
  install(principal, language) {
    return this.#queue(language, () => this.#install(principal, language));
  }

  async #install(principal, language) {
    const catalog = await this.#kernel.repos.catalog('official');
    if (!catalog.repo.official) fail('forbidden', t('official'));
    if (!catalog.languages?.length) fail('not_found', t('noRepo'));
    const entry = catalog.languages.find(e => e.language?.language === language) ?? fail('not_found', t('notOffered', { language }));
    const { read, source } = await openSource({ type: 'git', url: catalog.repo.url, ref: catalog.ref, path: entry.path });
    let manifest;
    try {
      manifest = checkLanguage(JSON.parse((await read('language.json')).toString('utf8')));
    } catch (err) {
      if (err.code && err.code !== 'invalid') throw err;
      fail('invalid', err.code ? err.text ?? err.message : t('invalid', { message: 'language.json' }));
    }
    if (manifest.language !== language) fail('invalid', t('invalid', { message: 'language' }));
    if (manifest.lilos && !inRange(manifest.lilos, SYSTEM_VERSION)) fail('conflict', t('needs', { name: manifest.name, range: manifest.lilos, version: SYSTEM_VERSION }));
    const text = await read('strings.json');
    if (sha256(text) !== manifest.files['strings.json']) fail('invalid', t('changed', { file: 'strings.json' }));
    let parts;
    try {
      parts = parseLanguagePack(text.toString('utf8'));
    } catch (err) {
      fail('invalid', t('invalid', { message: err.detail ?? err.message }));
    }
    const readme = await read('README.md').catch(() => null);
    const before = this.#packs.get(language);
    // Who installed it first stays: an update by another user does not take it from them
    const installed = before?.installed?.by ? before.installed : { by: principal.id ?? null, username: principal.username ?? null, at: new Date().toISOString() };
    const dest = join(DIR, language);
    const temp = join(DIR, `.${language}-${randomBytes(4).toString('hex')}`);
    try {
      await mkdir(temp, { recursive: true });
      await writeFile(join(temp, 'language.json'), JSON.stringify({ ...manifest, source }, null, 2));
      await writeFile(join(temp, 'strings.json'), text);
      if (readme) await writeFile(join(temp, 'README.md'), readme);
      await writeJson(join(temp, 'installed.json'), installed, { pretty: true });
      await rm(dest, { recursive: true, force: true });
      await rename(temp, dest);
    } catch (err) {
      await rm(temp, { recursive: true, force: true }).catch(() => {});
      throw err;
    }
    this.#packs.set(language, { manifest, installed, parts });
    log.info(`Lingua ${language} ${manifest.version} ${before ? `aggiornata (era ${before.manifest.version})` : 'installata'} da ${principal.username ?? 'kernel'}`);
    this.#changed();
    return this.list(principal).find(p => p.language === language);
  }

  /** Removes a pack: the user who installed it or an admin. Who was using it is told (English from now on). */
  remove(principal, language) {
    return this.#queue(language, () => this.#remove(principal, language));
  }

  async #remove(principal, language) {
    const pack = this.#packs.get(language) ?? fail('not_found', t('notInstalled', { language }));
    if (!isAdmin(principal) && !(principal?.id && pack.installed.by === principal.id)) fail('forbidden', t('removeForbidden', { name: pack.manifest.name }));
    await rm(join(DIR, language), { recursive: true, force: true });
    this.#packs.delete(language);
    log.info(`Lingua ${language} rimossa da ${principal.username ?? 'kernel'}`);
    this.#changed();
    // English is in the code: nobody loses their language with its pack
    if (language !== 'en') this.#tellUsers(language, pack.manifest.name).catch(err => log.warn(`Avviso della lingua rimossa: ${err.message}`));
  }

  #changed() {
    this.#kernel.events.emit('user', { owner: '*', event: 'languages', data: { languages: [...this.#packs.keys()] } });
  }

  /** A notification to each user whose lilOS was in that language (and is not in another pack now). */
  async #tellUsers(language, name) {
    const notifications = this.#kernel.services.get('notifications');
    if (!notifications) return;
    for (const id of await this.#kernel.userIds()) {
      const principal = await this.#kernel.userPrincipal(id);
      if (!principal) continue;
      const code = await readUserKey(this.#kernel, principal, 'locale', null).catch(() => null);
      if (typeof code !== 'string' || matchLanguage(code, [language]) !== language || matchLanguage(code, [...this.#packs.keys()])) continue;
      await notifications.send(id, { from: { system: true }, level: 'warning', text: localize(t('removed', { name }), code) });
    }
  }
}
