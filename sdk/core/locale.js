import { Emitter } from './events.js';
import { settings } from './settings.js';
import { storage } from './storage.js';
import { DEFAULT_LANG, canonicalLocale, i18nApi, localizeManifest, parseLocales, resolveLocale } from './i18n.js';

settings.define({ language: 'auto' });   // 'auto' (the browser's language) or a language tag ('it-IT')

/** The languages Sistema offers besides 'auto'. Apps without one of them fall back to English. */
export const LANGUAGES = ['en-US', 'en-GB', 'it-IT', 'de-DE', 'es-ES', 'fr-FR', 'pt-BR'];

/** The locale the system is in: the setting, or the browser's language for 'auto'. */
function systemCode() {
  const chosen = settings.get('language');
  return (chosen !== 'auto' && canonicalLocale(chosen)) || canonicalLocale(globalThis.navigator?.language) || DEFAULT_LANG;
}

/**
 * The locale of the system and the translations of apps (the engine is in i18n.js).
 *
 *   locale.code                 'it-IT'; follows the 'language' setting
 *   locale.forApp(id)           what an app gets as `lilos.locale` ({ code, i18n }), with its strings:
 *                               system apps take it from here, `const { t } = locale.forApp('files').i18n`
 *   locale.manifest(manifest, table?)   the manifest with its texts translated (@name, @commands…):
 *                               with the table of the installed app, or the one given (a catalog's)
 *   locale.parse(text) → table  /  locale.resolve(table, code?) → { code, lang, strings }
 *   locale.load(id, table)  /  locale.unload(id)   the system, when it reads an app's file
 *   locale.engine               i18nApi, the engine that sandboxes and workers get as text
 *
 * Events: 'change' { code } — the system's locale changed; every forApp() object already has the
 * new strings, and installed apps get 'locale' on `lilos`.
 * The resolved code is also stored ('locale'), so the kernel knows it for the services of the user.
 */
class Locale extends Emitter {
  #code = systemCode();
  #tables = new Map();   // app id → table
  #apps = new Map();     // app id → { locale, set } (i18nApi)

  constructor() {
    super();
    this.#publish();
    settings.on('change:language', () => {
      const next = systemCode();
      if (next === this.#code) return;
      this.#code = next;
      this.#publish();
      for (const [id, app] of this.#apps) app.set(this.resolve(this.#tables.get(id)));
      this.emit('change', { code: next });
    });
  }

  get code() {
    return this.#code;
  }

  #publish() {
    if (storage.get('locale', null) !== this.#code) storage.set('locale', this.#code);
  }

  parse(text) {
    return parseLocales(text);
  }

  resolve(table, code = this.#code) {
    return resolveLocale(table ?? null, code);
  }

  /** The resolved strings of an installed app, for the system's locale. */
  strings(id) {
    return this.resolve(this.#tables.get(id));
  }

  table(id) {
    return this.#tables.get(id) ?? null;
  }

  load(id, table) {
    this.#tables.set(id, table);
    this.#apps.get(id)?.set(this.resolve(table));
  }

  unload(id) {
    this.#tables.delete(id);
    this.#apps.get(id)?.set(this.resolve(null));
  }

  forApp(id) {
    if (!this.#apps.has(id)) this.#apps.set(id, i18nApi(this.resolve(this.#tables.get(id))));
    return this.#apps.get(id).locale;
  }

  manifest(manifest, table = this.#tables.get(manifest?.id)) {
    return localizeManifest(manifest, table ? this.resolve(table).strings : null);
  }

  get engine() {
    return i18nApi;
  }
}

export const locale = new Locale();
