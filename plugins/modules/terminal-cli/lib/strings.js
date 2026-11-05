import terminal from '../../../src/terminal/locales.json';
import own from '../locales.json';

/**
 * The texts of the command lilos: the Terminal's (its shell and commands) and its own (cli.*,
 * appstore.*, license.*), in English or Italian, the languages of their tables. Before signing in
 * the language of the computer (LANG, LC_ALL, the system's locale); then the user's lilOS language
 * (setLanguage). {name} placeholders; plural forms chosen with params.n, as the SDK's i18n.
 */
let code = 'en';
let lang = 'en';
let table = {};

const own_ = (obj, key) => !!obj && Object.hasOwn(obj, key);
const fill = (text, params) => text.replace(/\{(\w+)\}/g, (all, name) => (own_(params, name) ? String(params[name]) : all));

/** The computer's language, as a BCP 47 tag. */
export function systemLocale() {
  const env = process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || '';
  const fromEnv = env && env !== 'C' && env !== 'POSIX' ? env.split('.')[0].replace('_', '-') : null;
  try {
    return Intl.getCanonicalLocales(fromEnv ?? Intl.DateTimeFormat().resolvedOptions().locale)[0];
  } catch {
    return 'en';
  }
}

/** Texts in this locale from now on (its language when the tables have it, else English). */
export function setLanguage(locale) {
  try {
    code = Intl.getCanonicalLocales(locale && locale !== 'auto' ? locale : systemLocale())[0];
  } catch {
    code = 'en';
  }
  lang = code.split('-')[0] === 'it' ? 'it' : 'en';
  table = { ...terminal.en.strings, ...own.en.strings, ...(lang === 'it' && { ...terminal.it.strings, ...own.it.strings }) };
}
setLanguage(null);

export function t(key, params) {
  const value = own_(table, key) ? table[key] : undefined;
  if (value === undefined) return String(key);
  if (typeof value === 'string') return fill(value, params);
  const n = Number(own_(params, 'n') ? params.n : 0);
  return fill(n === 0 && value.zero ? value.zero : value[new Intl.PluralRules(lang).select(n)] ?? value.other, params);
}

/** The i18n the Terminal's code asks the SDK for (kernel/sdk.js locale.forApp). */
export const i18n = {
  t,
  get lang() { return lang; },
  get code() { return code; },
  date: (value, options) => new Intl.DateTimeFormat(code, options).format(value instanceof Date ? value : new Date(value)),
  number: (value, options) => new Intl.NumberFormat(code, options).format(value),
};
