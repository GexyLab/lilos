import * as sdk from '@lilos/sdk';   // `locale`: missing in older lilOS, so not imported by name

/**
 * The strings of an app in the system's language: lilOS's SDK gives them (locale.forApp), from
 * the app's locales.json, which lilOS reads before the app starts. Each app has its i18n.js:
 *
 *   import { appI18n } from '../shared/i18n.js';
 *   import table from './locales.json';
 *   export const i18n = appI18n('files', table);
 *   export const { t } = i18n;
 *
 *   t('toolbar.newFolder')               a text
 *   t('status.selected', { n: 3 })       {name} placeholders; plural forms chosen with params.n
 *   i18n.date(ms, options) / i18n.number(n, options)   in the system's locale
 *
 * Call t() when drawing, not when the module loads: the language may change while lilOS runs.
 * A lilOS older than translations has no `locale`: then the app's own copy of the file, in
 * Italian (the only language of those versions).
 */
export function appI18n(id, table) {
  if (sdk.locale) return sdk.locale.forApp(id).i18n;
  const strings = { ...table.en.strings, ...table.it?.strings };
  const own = (obj, key) => !!obj && Object.hasOwn(obj, key);
  const fill = (text, params) => text.replace(/\{(\w+)\}/g, (all, name) => (own(params, name) ? String(params[name]) : all));
  const rules = new Intl.PluralRules('it');
  const t = (key, params) => {
    const value = own(strings, key) ? strings[key] : undefined;
    if (value === undefined) return String(key);
    if (typeof value === 'string') return fill(value, params);
    const n = Number(own(params, 'n') ? params.n : 0);
    return fill(n === 0 && value.zero ? value.zero : value[rules.select(n)] ?? value.other, params);
  };
  return {
    t, lang: 'it',
    date: (value, options) => new Intl.DateTimeFormat('it-IT', options).format(value instanceof Date ? value : new Date(value)),
    number: (value, options) => new Intl.NumberFormat('it-IT', options).format(value),
  };
}
