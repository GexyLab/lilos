import { i18nApi } from './i18n.js';

/**
 * Texts of the SDK files that locale.js cannot be imported by (it imports them: kernel.js,
 * settings.js, storage.js, events.js), or that also run in the kernel (scheduleRules.js). The same
 * table as locale.define, read the same way by scripts/lilos-strings.mjs:
 *
 *   const { t } = defineLater('lilos:sdk.kernel', { en: { strings: { … } } });
 *
 * t() gives English until someone translates: locale.js sets the page's translator once it exists
 * (the language pack of the system's language); the kernel may set one that gives its Texts.
 * `lang`: the language t() is in now. Call t() when it is needed, never when a module loads.
 */
const parts = new Map();   // id → { table, i18n }
let translator = null;

const english = table => i18nApi({ code: 'en', lang: 'en', strings: table?.en?.strings ?? {} }).locale.i18n;

export function defineLater(id, table) {
  const part = { table, i18n: translator?.(id, table) ?? english(table) };
  parts.set(id, part);
  return { t: (key, params) => part.i18n.t(key, params), get lang() { return part.i18n.lang ?? 'en'; } };
}

/** translate(id, table) → { t, lang? }: from now on every part (those defined and those to come) uses it. */
export function translateStrings(translate) {
  translator = translate;
  for (const [id, part] of parts) part.i18n = translate(id, part.table) ?? english(part.table);
}
