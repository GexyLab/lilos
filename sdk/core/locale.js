import { Emitter } from './events.js';
import { settings } from './settings.js';
import { storage } from './storage.js';
import { kernel } from './kernel.js';
import { DEFAULT_LANG, canonicalLocale, i18nApi, localizeManifest, matchLanguage, parseLocales, resolveLocale, textDirection } from './i18n.js';
import { translateStrings } from './strings.js';

settings.define({ language: 'auto' });   // 'auto' (the browser's language) or a language tag ('it-IT')

/** English, always there (lilOS's texts are in English in the code): the other languages come with their packs. */
const BUILT_IN = ['en-US', 'en-GB'];

/**
 * The languages Control Panel offers besides 'auto': English and those of the language packs
 * installed (kept up to date: the same array changes). Apps without one of them fall back to English.
 */
export const LANGUAGES = [...BUILT_IN];

/** Where the sign-in page finds the language of the last user of this browser (boot/strings.js). */
const LAST = 'lilos.language';

/** The locale the system is in: the setting, or the browser's language for 'auto'. */
function systemCode() {
  const chosen = settings.get('language');
  return (chosen !== 'auto' && canonicalLocale(chosen)) || canonicalLocale(globalThis.navigator?.language) || DEFAULT_LANG;
}

/**
 * The locale of the system and the translations of apps (the engine is in i18n.js).
 *
 *   locale.code                 'it-IT'; follows the 'language' setting
 *   locale.language             the language lilOS's own texts are in: that of the pack in use ('it'), or 'en'
 *   locale.dir                  'rtl' when that language is written right to left (ar, ur…), else 'ltr'
 *   locale.packs                the language packs installed: [{ language, name, englishName?, version, dir }]
 *   locale.ready                a promise: the pack of the system's language is loaded (lilOS waits for
 *                               it before drawing, so t() never shows English for a moment)
 *   locale.refresh()            reads the packs installed again (the kernel said they changed)
 *   locale.forApp(id)           what an app gets as `lilos.locale` ({ code, i18n }), with its strings:
 *                               system apps take it from here, `const { t } = locale.forApp('files').i18n`
 *   locale.manifest(manifest, table?)   the manifest with its texts translated (@name, @commands…):
 *                               with the table of the installed app, or the one given (a catalog's)
 *   locale.parse(text) → table  /  locale.resolve(table, code?) → { code, lang, strings }
 *   locale.load(id, table)  /  locale.unload(id)   the system, when it reads an app's file
 *   locale.engine               i18nApi, the engine that sandboxes and workers get as text
 *   locale.formatBytes(n)       '1,5 KB' in the system's locale (also exported as formatBytes)
 *   locale.define(id, table) → i18n   the strings of a part of lilOS itself (core and SDK), in
 *                               English only ({ en: { strings } }): `const { t } = locale.define('lilos:properties', { … })`.
 *                               The other languages come from the language pack in use (its part
 *                               'properties'); t() follows the system's language. id: 'lilos:<part>'
 *                               (never an app's id). Call t() when drawing, never when a module loads.
 *
 * Events: 'change' { code } — the system's locale, or the pack of its language, changed; every
 * forApp() object already has the new strings, and installed apps get 'locale' on `lilos`.
 * 'languages' — the packs installed changed (LANGUAGES has them).
 * The resolved code is also stored ('locale'), so the kernel knows it for the services of the user,
 * and sent with each request to the kernel, which answers in it.
 */
class Locale extends Emitter {
  #code = systemCode();
  #tables = new Map();   // app id (or 'lilos:<part>') → table
  #apps = new Map();     // app id → { locale, set } (i18nApi)
  #packs = [];           // the packs installed
  #pack = null;          // { language, version, dir, strings: { [part]: { key: text } } } of the pack in use
  #loading = null;

  constructor() {
    super();
    this.#publish();
    this.ready = this.refresh();
    settings.on('change:language', () => {
      const next = systemCode();
      if (next === this.#code) return;
      this.#code = next;
      this.#publish();
      // The strings change once the pack of the new language is there (or known to be missing)
      this.refresh().then(changed => { if (!changed) this.#changed(); });
    });
  }

  get code() {
    return this.#code;
  }

  get language() {
    return this.#pack?.language ?? DEFAULT_LANG;
  }

  get dir() {
    return textDirection(this.language);
  }

  get packs() {
    return this.#packs.map(p => ({ ...p }));
  }

  #publish() {
    kernel.locale = this.#code;
    if (storage.get('locale', null) !== this.#code) storage.set('locale', this.#code);
    try { localStorage.setItem(LAST, this.#code); } catch { /* storage blocked */ }
  }

  /** Every table resolved again (the code or the pack changed), then 'change'. */
  #changed() {
    for (const [id, app] of this.#apps) app.set(this.#resolveId(id));
    this.emit('change', { code: this.#code });
  }

  /**
   * Reads the packs installed and loads the one of the system's language (or drops it). Without a
   * kernel there are none. Never throws: a pack that does not load leaves lilOS in English.
   * Resolves true when the strings changed ('change' already sent).
   */
  refresh() {
    if (!kernel.connected) return Promise.resolve(false);
    const run = (this.#loading ?? Promise.resolve()).then(async () => {
      let packs = this.#packs;
      try {
        packs = (await kernel.request('GET', '/languages')).filter(p => canonicalLocale(p?.language));
      } catch (err) {
        console.warn('[lilos] lingue installate:', err.message);
      }
      const listChanged = JSON.stringify(packs) !== JSON.stringify(this.#packs);
      this.#packs = packs;
      // The English pack is a model for translators: English is offered already (en-US, en-GB)
      LANGUAGES.splice(0, LANGUAGES.length, ...BUILT_IN, ...packs.map(p => p.language).filter(l => !BUILT_IN.includes(l) && l !== DEFAULT_LANG).sort());
      const want = packs.find(p => p.language === matchLanguage(this.#code, packs.map(x => x.language))) ?? null;
      const current = this.#pack;
      if (want && !(current?.language === want.language && current.version === want.version)) {
        try {
          this.#pack = await kernel.request('GET', `/languages/${encodeURIComponent(want.language)}`);
        } catch (err) {
          console.warn(`[lilos] lingua ${want.language}:`, err.message);
          this.#pack = null;
        }
      } else if (!want) {
        this.#pack = null;
      }
      if (listChanged) this.emit('languages', { languages: [...LANGUAGES] });
      if (this.#pack === current) return false;
      this.#changed();
      return true;
    });
    this.#loading = run;
    return run;
  }

  parse(text) {
    return parseLocales(text);
  }

  resolve(table, code = this.#code) {
    return resolveLocale(table ?? null, code);
  }

  /** The strings of an id: an app's table, or a part of lilOS with the pack of the system's language over it. */
  #resolveId(id) {
    let table = this.#tables.get(id) ?? null;
    const own = id.startsWith('lilos:') ? this.#pack?.strings?.[id.slice('lilos:'.length)] : null;
    if (own) table = { ...(table ?? { [DEFAULT_LANG]: { extends: null, strings: {} } }), [this.#code]: { extends: null, strings: own } };
    return this.resolve(table);
  }

  /** The resolved strings of an installed app, for the system's locale. */
  strings(id) {
    return this.#resolveId(id);
  }

  table(id) {
    return this.#tables.get(id) ?? null;
  }

  load(id, table) {
    this.#tables.set(id, table);
    this.#apps.get(id)?.set(this.#resolveId(id));
  }

  unload(id) {
    this.#tables.delete(id);
    this.#apps.get(id)?.set(this.#resolveId(id));
  }

  forApp(id) {
    if (!this.#apps.has(id)) this.#apps.set(id, i18nApi(this.#resolveId(id)));
    return this.#apps.get(id).locale;
  }

  define(id, table) {
    if (!/^lilos:/.test(id)) throw new Error(`Testi di lilOS: id non valido (${id})`);
    this.load(id, table);
    return this.forApp(id).i18n;
  }

  formatBytes(n) {
    return this.forApp('lilos:').formatBytes(n);
  }

  manifest(manifest, table = this.#tables.get(manifest?.id)) {
    return localizeManifest(manifest, table ? this.resolve(table).strings : null);
  }

  get engine() {
    return i18nApi;
  }
}

export const locale = new Locale();

// The texts of the SDK files this one imports (strings.js): from now on in the system's language
translateStrings((id, table) => locale.define(id, table));

/** 12345 → '12,1 KB', in the system's language (see i18nApi). */
export const formatBytes = n => locale.formatBytes(n);
