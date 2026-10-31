/**
 * Translations of apps: the engine. No imports, so the same code runs in lilOS's page, in the
 * sandboxes and workers of apps (bridge.js puts i18nApi in them as text) and in the kernel.
 *
 * Each app has one file of translations, named by `locales` in its manifest ('locales.json'):
 *
 *   {
 *     "en":    { "strings": { "save": "Save", "files.count": { "one": "{n} file", "other": "{n} files" } } },
 *     "it":    { "strings": { "save": "Salva", "files.count": { "one": "{n} file", "other": "{n} file" } } },
 *     "it-CH": { "extends": "it", "strings": { "save": "Memorizza" } }
 *   }
 *
 * `en` is required: it is the default language. A string is looked for in the language of the
 * system ('it-CH'), then in the ones it extends, then in the language without its region ('it')
 * and the ones that extends, then in `en`; missing everywhere, t() gives back the key.
 * A value is a text with {name} placeholders, or plural forms ({ zero?, one, two, few, many, other },
 * chosen with Intl.PluralRules on params.n; `zero` is used for 0 when it is there).
 * Keys starting with '@' translate what lilOS shows of the manifest (see localizeManifest).
 * The file is untrusted: parseLocales keeps only what it expects, within limits.
 */
export const DEFAULT_LANG = 'en';

const KEY = /^@?[\w.:-]{1,200}$/;
const FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];
export const LOCALE_LIMITS = { bytes: 1 << 20, langs: 50, strings: 5000, text: 4000 };

/** The canonical form of a language tag ('it-it' → 'it-IT'), or null if it is not one. */
export function canonicalLocale(tag) {
  if (typeof tag !== 'string' || !tag || tag.length > 35) return null;
  try {
    return Intl.getCanonicalLocales(tag)[0] ?? null;
  } catch {
    return null;
  }
}

const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const fail = message => { throw new Error(`File delle traduzioni non valido: ${message}`); };

function value(v, key) {
  if (typeof v === 'string') return v.length <= LOCALE_LIMITS.text ? v : fail(`testo troppo lungo (${key})`);
  if (!isPlain(v)) return fail(`valore non valido (${key})`);
  const forms = {};
  for (const [form, text] of Object.entries(v)) {
    if (!FORMS.includes(form) || typeof text !== 'string' || text.length > LOCALE_LIMITS.text) fail(`forma plurale non valida (${key}.${form})`);
    forms[form] = text;
  }
  return typeof forms.other === 'string' ? forms : fail(`manca la forma "other" (${key})`);
}

/**
 * Checks a translations file (its text or the parsed object): { [lang]: { extends, strings } },
 * languages in canonical form. Throws if it is not valid.
 */
export function parseLocales(input) {
  if (typeof input === 'string') {
    if (input.length > LOCALE_LIMITS.bytes) fail('troppo grande');
    try {
      input = JSON.parse(input);
    } catch {
      fail('non è JSON');
    }
  }
  if (!isPlain(input)) fail('serve un oggetto con una chiave per lingua');
  const entries = Object.entries(input);
  if (entries.length > LOCALE_LIMITS.langs) fail('troppe lingue');
  const table = {};
  let count = 0;
  for (const [tag, entry] of entries) {
    const lang = canonicalLocale(tag) ?? fail(`lingua non valida: ${String(tag).slice(0, 40)}`);
    if (!isPlain(entry)) fail(`lingua ${lang}: serve un oggetto`);
    const ext = entry.extends === undefined || entry.extends === null ? null : canonicalLocale(entry.extends) ?? fail(`lingua ${lang}: "extends" non valido`);
    if (ext === lang) fail(`lingua ${lang}: estende sé stessa`);
    const source = entry.strings ?? {};
    if (!isPlain(source)) fail(`lingua ${lang}: "strings" deve essere un oggetto`);
    const strings = {};
    for (const [key, v] of Object.entries(source)) {
      if (!KEY.test(key)) fail(`chiave non valida: ${key.slice(0, 60)}`);
      if (++count > LOCALE_LIMITS.strings) fail('troppe stringhe');
      strings[key] = value(v, key);
    }
    table[lang] = { extends: ext, strings };
  }
  if (!table[DEFAULT_LANG]) fail(`manca la lingua "${DEFAULT_LANG}"`);
  for (const [lang, entry] of Object.entries(table)) {
    if (entry.extends && !table[entry.extends]) fail(`lingua ${lang}: estende ${entry.extends}, che non c'è`);
  }
  return table;
}

/** The languages of the table a string is looked for in, in order, for the locale `code`. */
export function localeChain(table, code) {
  const chain = [];
  const follow = lang => {
    while (lang && Object.hasOwn(table, lang) && !chain.includes(lang)) {
      chain.push(lang);
      lang = table[lang].extends;
    }
  };
  const tag = canonicalLocale(code) ?? DEFAULT_LANG;
  follow(tag);
  follow(tag.split('-')[0]);
  follow(DEFAULT_LANG);
  return chain;
}

/**
 * The strings of `table` for the locale `code`, every fallback already applied:
 * { code, lang (the language of the table it chose), strings }. Without a table: no strings.
 */
export function resolveLocale(table, code) {
  const canonical = canonicalLocale(code) ?? DEFAULT_LANG;
  if (!table) return { code: canonical, lang: DEFAULT_LANG, strings: {} };
  const chain = localeChain(table, canonical);
  const strings = {};
  for (const lang of [...chain].reverse()) Object.assign(strings, table[lang].strings);
  return { code: canonical, lang: chain[0] ?? DEFAULT_LANG, strings };
}

/**
 * A copy of the manifest with its texts in the language of `strings` (from resolveLocale). The
 * key of a text is its path in the manifest, with the items of a list named by their id (value
 * for options):
 *   @name   @description   @commands.<id>.label   @widgets.<id>.name   @entrypoints.<name>.label
 *   @entrypoints.<name>.params.<param>.label   @entrypoints.<name>.params.<param>.description
 *   @entrypoints.<name>.params.<param>.options.<value>.label
 * What has no translation stays as the manifest says (in English).
 */
export function localizeManifest(manifest, strings) {
  const m = structuredClone(manifest);
  if (!strings) return m;
  const set = (obj, prop, key) => {
    const text = Object.hasOwn(strings, key) ? strings[key] : undefined;
    if (typeof text === 'string') obj[prop] = text;
  };
  set(m, 'name', '@name');
  set(m, 'description', '@description');
  for (const cmd of m.contributes?.commands ?? []) set(cmd, 'label', `@commands.${cmd.id}.label`);
  for (const widget of m.contributes?.widgets ?? []) set(widget, 'name', `@widgets.${widget.id}.name`);
  for (const [name, ep] of Object.entries(m.entrypoints ?? {})) {
    if (!isPlain(ep)) continue;
    set(ep, 'label', `@entrypoints.${name}.label`);
    for (const [param, def] of Object.entries(isPlain(ep.params) ? ep.params : {})) {
      if (!isPlain(def)) continue;
      const base = `@entrypoints.${name}.params.${param}`;
      set(def, 'label', `${base}.label`);
      set(def, 'description', `${base}.description`);
      for (const option of Array.isArray(def.options) ? def.options : []) set(option, 'label', `${base}.options.${option.value}.label`);
    }
  }
  return m;
}

/**
 * What an app gets as `lilos.locale`, around the result of resolveLocale:
 *   locale.code               the locale of the system ('it-IT')
 *   locale.i18n.t(key, params)    the text for the key; params fill {name} and choose plural forms (n)
 *   locale.i18n.lang          the language of the app's file in use ('it')
 *   locale.i18n.date(value, options) / number(value, options)   Intl formats in the system's locale
 * Returns { locale, set(resolved) }: set() changes the strings (the system's language changed).
 * Put in sandboxes and workers as text (toString): it must not use anything from outside itself.
 */
export function i18nApi(initial) {
  let state = initial && typeof initial === 'object' ? initial : { code: 'en', lang: 'en', strings: {} };
  let rules = null;
  const warned = new Set();
  const own = (obj, key) => !!obj && Object.prototype.hasOwnProperty.call(obj, key);
  const fill = (text, params) => text.replace(/\{(\w+)\}/g, (all, name) => (own(params, name) ? String(params[name]) : all));
  const plural = n => {
    if (!rules) {
      try { rules = new Intl.PluralRules(state.lang); } catch { rules = new Intl.PluralRules('en'); }
    }
    return rules.select(n);
  };
  const t = (key, params) => {
    const found = own(state.strings, key) ? state.strings[key] : undefined;
    if (found === undefined) {
      if (!warned.has(key)) {
        warned.add(key);
        console.warn(`[lilos] traduzione mancante: ${key}`);
      }
      return String(key);
    }
    if (typeof found === 'string') return fill(found, params);
    const n = Number(own(params, 'n') ? params.n : 0);
    const form = n === 0 && typeof found.zero === 'string' ? 'zero' : plural(n);
    return fill(typeof found[form] === 'string' ? found[form] : found.other, params);
  };
  const date = (value, options) => new Intl.DateTimeFormat(state.code, options).format(value instanceof Date ? value : new Date(value));
  const number = (value, options) => new Intl.NumberFormat(state.code, options).format(value);
  const i18n = Object.freeze({ t, date, number, get lang() { return state.lang; } });
  const locale = Object.freeze({ get code() { return state.code; }, i18n });
  return {
    locale,
    set(next) {
      if (next && typeof next === 'object') state = next;
      rules = null;
    },
  };
}
