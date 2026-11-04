import { Emitter } from './events.js';
import { storage } from './storage.js';
import { defineLater } from './strings.js';

const STORAGE_KEY = 'settings';

// defineLater, not locale.define: locale.js imports this file (see strings.js)
const { t } = defineLater('lilos:sdk.settings', {
  en: { strings: { notDefined: 'Setting not defined: {key}', type: 'Wrong type for {key}' } },
});

/**
 * User preferences, persisted under 'lilos:settings'.
 * Every key must be declared with define() first: its default fixes the type, and stored
 * values of another type are ignored (storage is untrusted).
 *
 * Events:
 *   'change'        { key, value }
 *   'change:<key>'  value
 */
class Settings extends Emitter {
  #defaults = {};
  #values = {};
  #stored = storage.get(STORAGE_KEY, {});

  /** Declare keys with their defaults. Safe to call more than once (later calls add keys). */
  define(defaults) {
    const stored = this.#stored && typeof this.#stored === 'object' ? this.#stored : {};
    for (const [key, value] of Object.entries(defaults)) {
      this.#defaults[key] = value;
      const saved = Object.hasOwn(stored, key) ? stored[key] : undefined;
      this.#values[key] = typeof saved === typeof value ? saved : value;
    }
  }

  get(key) {
    if (!Object.hasOwn(this.#defaults, key)) throw new Error(t('notDefined', { key }));
    return this.#values[key];
  }

  set(key, value) {
    if (!Object.hasOwn(this.#defaults, key)) throw new Error(t('notDefined', { key }));
    if (typeof value !== typeof this.#defaults[key]) throw new TypeError(t('type', { key }));
    if (this.#values[key] === value) return;
    this.#values[key] = value;
    storage.set(STORAGE_KEY, this.#values);
    this.emit('change', { key, value });
    this.emit(`change:${key}`, value);
  }

  reset(key) {
    this.set(key, this.#defaults[key]);
  }

  /** Calls fn with the current value now and on every change. Returns the unsubscribe function. */
  watch(key, fn) {
    fn(this.get(key));
    return this.on(`change:${key}`, fn);
  }
}

export const settings = new Settings();
