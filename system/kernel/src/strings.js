import { canonicalLocale, i18nApi } from '../../../sdk/core/i18n.js';
import { translateStrings } from '../../../sdk/core/strings.js';

/**
 * The kernel's own texts (what it says to users: errors, notifications), in English in the code
 * and translated by the language packs installed (apps/languagePackage.js). Each file names its
 * part, as lilOS's page does with locale.define:
 *
 *   const { t } = defineStrings('lilos:kernel.repos', { en: { strings: {
 *     adminOnly: 'Only an administrator manages the repositories', missing: 'Repository {id} not found',
 *   } } });
 *   fail('forbidden', t('adminOnly'));
 *
 * t(key, params) gives a Text, not a string: it becomes the user's language where it reaches them.
 * A Text in a response (an error's message, anywhere in the JSON) is translated with the language of
 * the request (localeOf); String(text) and JSON elsewhere (logs, files) are English. Modules do not
 * use this: they keep their own texts.
 */
const parts = new Map();   // part ('kernel.repos') → English strings
let packOf = () => null;   // language tag → { language, parts } of an installed pack, or null

export class Text {
  constructor(part, key, params) {
    this.part = part;
    this.key = key;
    this.params = params ?? null;
  }

  toString() {
    return localize(this, 'en');
  }

  toJSON() {
    return this.toString();
  }
}

/** A size in bytes among a Text's params: written in the language of who reads it ('1,5 GB'). */
export class Bytes {
  constructor(n) {
    this.n = Number(n);
  }

  toString() {
    return i18nApi({ code: 'en', lang: 'en', strings: {} }).locale.formatBytes(this.n);
  }

  toJSON() {
    return this.toString();
  }
}

export const bytes = n => new Bytes(n);

export function defineStrings(id, table) {
  if (!/^lilos:kernel\.[\w.-]+$/.test(id)) throw new Error(`Testi del kernel: id non valido (${id})`);
  const part = id.slice('lilos:'.length);
  parts.set(part, table?.en?.strings ?? {});
  return { t: (key, params) => new Text(part, key, params) };
}

// The SDK's texts the kernel uses too (scheduleRules.js, sdk/core/strings.js): Texts like its own
translateStrings((id, table) => {
  const part = id.slice('lilos:'.length);
  parts.set(part, table?.en?.strings ?? {});
  return { t: (key, params) => new Text(part, key, params), lang: 'en' };
});

/** Set by the language packs: the strings of the pack for a language tag, or null. */
export function usePacks(fn) {
  packOf = fn;
}

/** A Text in the language `code` (falls back to English, key by key); anything else as a string. */
export function localize(value, code) {
  if (!(value instanceof Text)) return value == null ? '' : String(value);
  const en = parts.get(value.part) ?? {};
  const pack = code && !/^en\b/.test(code) ? packOf(code) : null;
  const own = pack?.parts?.[value.part];
  const found = own && Object.hasOwn(own, value.key) ? own[value.key] : en[value.key];
  if (found === undefined) return value.key;
  const lang = own && Object.hasOwn(own, value.key) ? pack.language : 'en';
  // A Text among the params (an error inside a message) in the same language
  // A size (bytes()) as the language writes it: '1,5 GB'
  const params = value.params && Object.fromEntries(Object.entries(value.params).map(([k, v]) => [k,
    v instanceof Text ? localize(v, code) : v instanceof Bytes ? i18nApi({ code: code || 'en', lang: code || 'en', strings: {} }).locale.formatBytes(v.n) : v]));
  return i18nApi({ code: lang, lang, strings: { [value.key]: found } }).locale.i18n.t(value.key, params ?? undefined);
}

/** JSON of `body` with every Text in it in the language `code`. */
export function localizedJson(body, code) {
  return JSON.stringify(body, function (key, v) {
    const raw = this[key];
    return raw instanceof Text ? localize(raw, code) : v;
  });
}

/**
 * The language of a request: what lilOS's page says it uses (X-Lilos-Locale, see the SDK's
 * kernel.js), else the browser's first (Accept-Language), else English.
 */
export function localeOf(req) {
  const own = canonicalLocale(String(req?.headers?.['x-lilos-locale'] ?? '').slice(0, 35));
  if (own) return own;
  const first = String(req?.headers?.['accept-language'] ?? '').split(',')[0].split(';')[0].trim().slice(0, 35);
  return canonicalLocale(first) ?? 'en';
}
