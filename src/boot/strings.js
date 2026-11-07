/**
 * The texts of the screens before lilOS starts (sign-in, license, start-up), in the language of the
 * language pack that fits: the SDK cannot be imported yet, so not locale.define but the same engine
 * (sdk/core/i18n.js, no imports) and the same tables, read by scripts/lilos-strings.mjs:
 *
 *   const i18n = bootStrings('lilos:boot', { en: { strings: { … } } });   →  { t, date, number, lang }
 *   await loadBootLanguage(kernel, code?)   the pack of `code` (else the last user's language in this
 *                                           browser, else the browser's), before the first screen
 *
 * t() follows the pack loaded last, key by key over English. Without a kernel the boot parts of the
 * last pack loaded in this browser are used, if they are in the language wanted.
 */
// Relative, not '@lilos/sdk/i18n': the same file, with no alias needed by the bundler
import { DEFAULT_LANG, canonicalLocale, i18nApi, matchLanguage, parseLanguagePack } from '../../sdk/core/i18n.js';

/** Written by the SDK (sdk/core/locale.js) with the locale of the last user of this browser. */
const LAST = 'lilos.language';
/** The boot parts of the last pack loaded: { language, version, dir, strings }. */
const CACHE = 'lilos.boot.language';

const parts = new Map();   // part → { en: strings, api: i18nApi }
let code = DEFAULT_LANG;
let pack = null;           // { language, version, dir, strings: { [part]: { key: text } } }

function load(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function resolved(part, en) {
  const own = pack?.strings?.[part];
  return { code, lang: pack?.language ?? DEFAULT_LANG, strings: own ? { ...en, ...own } : { ...en } };
}

function apply() {
  for (const [part, { en, api }] of parts) api.set(resolved(part, en));
  const root = document.documentElement;
  root.lang = pack?.language ?? DEFAULT_LANG;
  root.dir = pack?.dir === 'rtl' ? 'rtl' : 'ltr';
}

/** The strings of a part of the boot screens: id 'lilos:<part>', table { en: { strings } } written out. */
export function bootStrings(id, table) {
  const part = id.slice('lilos:'.length);
  const en = table.en.strings;
  const api = i18nApi(resolved(part, en));
  parts.set(part, { en, api });
  return api.locale.i18n;
}

/**
 * Whether `key` of `part` is in the language of the screens: always in English (or without a pack,
 * when everything is), else only if the pack has it (one older than the key falls back to English).
 */
export function translated(part, key) {
  return !pack || pack.language === DEFAULT_LANG || Object.hasOwn(pack.strings?.[part] ?? {}, key);
}

/** Only the boot parts, checked: what a pack (or the copy in this browser) gives these screens. */
function bootParts(strings) {
  const all = parseLanguagePack(strings ?? {});
  return Object.fromEntries([...parts.keys()].filter(p => all[p]).map(p => [p, all[p]]));
}

function cached(want) {
  try {
    const c = JSON.parse(load(CACHE));
    if (!c || !matchLanguage(want, [c.language])) return null;
    return { language: c.language, version: c.version, dir: c.dir, strings: bootParts(c.strings) };
  } catch {
    return null;
  }
}

/**
 * Loads the language of `code` (else the last user's, else the browser's) for the boot screens,
 * and tells the kernel to answer in it. Never throws: without a kernel or a pack, English (or the
 * copy kept in this browser).
 */
export async function loadBootLanguage(kernel, wanted) {
  code = canonicalLocale(wanted) ?? canonicalLocale(load(LAST)) ?? canonicalLocale(globalThis.navigator?.language) ?? DEFAULT_LANG;
  kernel.locale = code;
  let next = null;
  try {
    const list = await kernel.request('GET', '/languages');
    const packs = (Array.isArray(list) ? list : []).filter(p => canonicalLocale(p?.language));
    const language = matchLanguage(code, packs.map(p => p.language));
    const info = packs.find(p => p.language === language);
    if (info && pack?.language === info.language && pack.version === info.version) {
      next = pack;
    } else if (info) {
      const got = await kernel.request('GET', `/languages/${encodeURIComponent(info.language)}`);
      next = { language: info.language, version: got?.version ?? info.version, dir: got?.dir ?? info.dir, strings: bootParts(got?.strings) };
    }
    try {
      if (next) localStorage.setItem(CACHE, JSON.stringify(next));
      else if (!packs.some(p => p.language === JSON.parse(load(CACHE))?.language)) localStorage.removeItem(CACHE);   // uninstalled
    } catch { /* not kept */ }
  } catch (err) {
    // No kernel (or a pack that is not valid): what this browser kept, if it fits
    next = err?.code === 'offline' ? (pack && matchLanguage(code, [pack.language]) ? pack : cached(code)) : null;
  }
  pack = next;
  apply();
}
