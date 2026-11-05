import { EventEmitter } from 'node:events';
import { editConfig } from './config.js';
import { fail } from './errors.js';
import { logger } from './log.js';
import { defineStrings, bytes } from './strings.js';

const log = logger('settings');
const { t } = defineStrings('lilos:kernel.settings', { en: { strings: {
  unknown: 'Unknown setting: {key}', value: 'Value not valid for {key}', noZero: '{key} cannot be 0',
  min: '{key} must be at least {min}', max: '{key} must be at most {max}', perUser: '{key} cannot be set for a single user',
  user: 'User not found', admin: 'Only an administrator changes the settings of the kernel', changes: 'Changes not valid',
} } });

const KB = 1 << 10, MB = 1 << 20, GB = 1 << 30;

/**
 * The catalog of the kernel's settings (D85). Each one:
 *   key       'group.name'
 *   type      'size' (bytes, a whole number ≥ 0)
 *   default   the value of lilOS
 *   zero      what 0 means: 'unlimited' | 'whole' (one request) | 'never' (never in one row) |
 *             'all' (every file); missing: 0 is not allowed
 *   min, max  for a value that is not 0
 *   scope     'system', or 'user' when it may also be given to a single user
 *   restart   true when it counts only from the next start of the kernel
 * More settings come into the catalog in phase 2 (design/limiti-file.html, section 6).
 */
export const CATALOG = Object.freeze([
  { key: 'files.maxFileSize', type: 'size', default: GB, zero: 'unlimited', min: MB },
  { key: 'files.quota', type: 'size', default: 0, zero: 'unlimited', min: MB, scope: 'user' },
  { key: 'files.maxReadWhole', type: 'size', default: 256 * MB, zero: 'unlimited', min: MB },
  { key: 'files.maxText', type: 'size', default: 10 * MB, zero: 'unlimited', min: 64 * KB },
  { key: 'files.uploadPiece', type: 'size', default: 8 * MB, zero: 'whole', min: 256 * KB, max: GB },
  { key: 'files.inlineMax', type: 'size', default: MB, zero: 'never', min: 1, max: 64 * MB },
  { key: 'files.dbChunk', type: 'size', default: MB, min: 256 * KB, max: 16 * MB },
  { key: 'files.cacheMax', type: 'size', default: 10 * MB, zero: 'all', min: 1 },
].map(e => Object.freeze({ scope: 'system', restart: false, ...e })));

const BY_KEY = new Map(CATALOG.map(e => [e.key, e]));
const USERS = 'users';
const USER_ID = /^[\w:.@-]{1,128}$/;
const isObject = v => !!v && typeof v === 'object' && !Array.isArray(v);

/** The value checked against its entry, or a KernelError ('invalid') saying why. */
function checked(entry, value) {
  if (entry.type === 'size') {
    const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    if (!Number.isSafeInteger(n) || n < 0) fail('invalid', t('value', { key: entry.key }));
    if (n === 0) return entry.zero ? 0 : fail('invalid', t('noZero', { key: entry.key }));
    if (entry.min != null && n < entry.min) fail('invalid', t('min', { key: entry.key, min: bytes(entry.min) }));
    if (entry.max != null && n > entry.max) fail('invalid', t('max', { key: entry.key, max: bytes(entry.max) }));
    return n;
  }
  return fail('invalid', t('value', { key: entry.key }));
}

/** A value read from a file (config.json): the checked one, or undefined (wrong: it is left out and said in the log). */
function fromFile(entry, value, where) {
  try {
    return checked(entry, value);
  } catch (err) {
    log.warn(`${where}: ${entry.key} ignorata (${err.message})`);
    return undefined;
  }
}

/**
 * The kernel's settings: each value from the highest layer that has it (design/limiti-file.html,
 * section 5):
 *   1 default     the catalog
 *   2 install     lilos-install.json kernel.settings, written into config.json by the installer
 *   3 local       config.json `settings` (an admin, from Control Panel or by hand); for settings
 *                 of scope 'user', also `settings.users.<user id>`
 *   (4 central    a module providing the service 'settings': phase 2)
 * config.json keeps only what differs from the default. Events: 'change' { keys, user } (user:
 * the id when only a user's values changed, else null).
 */
export class KernelSettings extends EventEmitter {
  #local = new Map();         // key → value
  #users = new Map();         // user id → Map key → value

  constructor(raw) {
    super();
    this.setMaxListeners(0);
    this.#load(raw);
  }

  #load(raw) {
    this.#local.clear();
    this.#users.clear();
    if (raw == null) return;
    if (!isObject(raw)) { log.warn('config.json: "settings" non è un oggetto, ignorato'); return; }
    for (const [key, value] of Object.entries(raw)) {
      if (key === USERS) continue;
      const entry = BY_KEY.get(key);
      if (!entry) { log.warn(`config.json: impostazione sconosciuta ${key}, ignorata`); continue; }
      const v = fromFile(entry, value, 'config.json');
      if (v !== undefined) this.#local.set(key, v);
    }
    for (const [user, values] of Object.entries(isObject(raw[USERS]) ? raw[USERS] : {})) {
      if (!USER_ID.test(user) || !isObject(values)) continue;
      const own = new Map();
      for (const [key, value] of Object.entries(values)) {
        const entry = BY_KEY.get(key);
        if (entry?.scope !== 'user') continue;
        const v = fromFile(entry, value, `config.json (utente ${user})`);
        if (v !== undefined) own.set(key, v);
      }
      if (own.size) this.#users.set(user, own);
    }
  }

  /** The value of a setting (for a user, when `user` is given and the setting may be theirs). */
  get(key, user = null) {
    const entry = BY_KEY.get(key);
    if (!entry) throw new Error(`Impostazione del kernel sconosciuta: ${key}`);
    if (user && entry.scope === 'user' && this.#users.get(user)?.has(key)) return this.#users.get(user).get(key);
    return this.#local.has(key) ? this.#local.get(key) : entry.default;
  }

  /** A size limit as a number to compare with: 0 ('unlimited') becomes Infinity. */
  limit(key, user = null) {
    const v = this.get(key, user);
    return v > 0 ? v : Infinity;
  }

  /** Where the value comes from: 'user' | 'local' | 'default'. */
  source(key, user = null) {
    if (user && this.#users.get(user)?.has(key)) return 'user';
    return this.#local.has(key) ? 'local' : 'default';
  }

  /** The users with values of their own: Map id → { key: value }. */
  userValues() {
    return new Map([...this.#users].map(([id, m]) => [id, Object.fromEntries(m)]));
  }

  /** Every setting as Control Panel shows it (for a user: their values, where they have them). */
  describe(user = null) {
    return CATALOG.map(e => ({
      key: e.key, type: e.type, scope: e.scope, restart: e.restart,
      value: this.get(e.key, user), default: e.default, source: this.source(e.key, user), locked: false,
      ...(e.zero && { zero: e.zero }), ...(e.min != null && { min: e.min }), ...(e.max != null && { max: e.max }),
    }));
  }

  /**
   * An admin's change: set { key: value } and reset [key] (back to the default, or for a user back to
   * the value of everyone). With `user`, only settings of scope 'user'. Saved in config.json, valid
   * at once. Returns the keys changed.
   */
  async update(principal, { set = {}, reset = [], user = null } = {}) {
    if (principal?.kind !== 'kernel' && principal?.role !== 'admin') fail('forbidden', t('admin'));
    if (!isObject(set) || !Array.isArray(reset) || (user != null && (typeof user !== 'string' || !USER_ID.test(user)))) fail('invalid', t('changes'));
    const values = new Map();
    for (const [key, value] of Object.entries(set)) {
      const entry = BY_KEY.get(key) ?? fail('invalid', t('unknown', { key }));
      if (user && entry.scope !== 'user') fail('invalid', t('perUser', { key }));
      values.set(key, checked(entry, value));
    }
    for (const key of reset) {
      const entry = BY_KEY.get(key) ?? fail('invalid', t('unknown', { key: String(key).slice(0, 60) }));
      if (user && entry.scope !== 'user') fail('invalid', t('perUser', { key }));
      if (values.has(key)) fail('invalid', t('changes'));
    }
    if (!values.size && !reset.length) return [];
    await editConfig(raw => {
      const s = isObject(raw.settings) ? raw.settings : (raw.settings = {});
      let target = s;
      if (user) {
        s[USERS] = isObject(s[USERS]) ? s[USERS] : {};
        target = s[USERS][user] = isObject(s[USERS][user]) ? s[USERS][user] : {};
      }
      for (const [key, v] of values) {
        // Only what differs from the default stays (for a user: from the value of everyone)
        if (!user && v === BY_KEY.get(key).default) delete target[key];
        else target[key] = v;
      }
      for (const key of reset) delete target[key];
      if (user && !Object.keys(target).length) delete s[USERS][user];
      if (s[USERS] && !Object.keys(s[USERS]).length) delete s[USERS];
      if (!Object.keys(s).length) delete raw.settings;
    });
    const map = user ? (this.#users.get(user) ?? new Map()) : this.#local;
    for (const [key, v] of values) {
      if (!user && v === BY_KEY.get(key).default) map.delete(key); else map.set(key, v);
    }
    for (const key of reset) map.delete(key);
    if (user) { if (map.size) this.#users.set(user, map); else this.#users.delete(user); }
    const keys = [...values.keys(), ...reset];
    log.info(`Impostazioni ${user ? `dell'utente ${user} ` : ''}cambiate da ${principal.username ?? 'kernel'}: ${keys.join(', ')}`);
    this.emit('change', { keys, user });
    return keys;
  }

  /**
   * What a module sees (ctx.settings): get(key) of the whole system, onChange(fn) with the keys that
   * changed (only changes of the whole system: a single user's values are the kernel's business).
   */
  forModule() {
    return Object.freeze({
      get: key => this.get(key),
      onChange: fn => {
        if (typeof fn === 'function') this.on('change', ({ keys, user }) => { if (!user) fn(keys); });
      },
    });
  }
}
