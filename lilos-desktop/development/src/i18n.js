import { app } from 'electron';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The program's own texts (tray, menus, dialogs, first start): locales.json, English and Italian,
 * in the language of the computer (Italian if it is Italian, else English). lilOS translates its
 * own texts in the page.
 */
const LOCALES = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'locales.json'), 'utf8'));
let lang = null;

export const language = () => (lang ??= app.getLocale().toLowerCase().startsWith('it') ? 'it' : 'en');

/** The text of `key`, with {name} replaced by vars.name. */
export function t(key, vars = {}) {
  const text = LOCALES[language()][key] ?? LOCALES.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

/** All the texts of one group (keys starting with `prefix.`), for a page of the program. */
export function texts(prefix) {
  const out = {};
  for (const [key, value] of Object.entries({ ...LOCALES.en, ...LOCALES[language()] })) {
    if (key.startsWith(`${prefix}.`)) out[key.slice(prefix.length + 1)] = value;
  }
  return out;
}
