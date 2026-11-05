import { Emitter } from './events.js';
import { kernel } from './kernel.js';

const KB = 1 << 10, MB = 1 << 20, GB = 1 << 30;

/**
 * The limits of the files when lilOS has no kernel (or an older one, without GET /api/fs/limits):
 * the kernel's defaults (system/kernel/src/settings.js). 0: no limit.
 */
export const DEFAULT_FILE_LIMITS = Object.freeze({
  maxFileSize: GB, maxReadWhole: 256 * MB, maxText: 10 * MB, uploadPiece: 8 * MB, cacheMax: 10 * MB, quota: null, used: null,
});
// What an older kernel (lilOS < 1.33.0) accepts in one request: its old limit of 10 MB
const OLD_KERNEL = Object.freeze({ ...DEFAULT_FILE_LIMITS, maxFileSize: 10 * MB, uploadPiece: 0 });

/**
 * The kernel's settings (lilOS 1.33.0, D85): what Control Panel shows and changes, and the limits of
 * the files that count for the user. Events: 'change' { keys } when the kernel says they changed
 * (the system calls changed() on its event 'settings.change').
 *
 *   limits() → { maxFileSize, maxReadWhole, maxText, uploadPiece, cacheMax, quota, used }
 *              sizes in bytes, 0: no limit; quota/used null when the kernel has no quotas.
 *              Read once and kept until a change (fresh: true reads again, for the space used)
 *   list({ user }) → { items: [{ key, type, scope, restart, value, default, source, locked, zero?,
 *              min?, max? }], quotas }                                               admins
 *   update({ set, reset, user }) → as list()                                          admins
 *   users() → [{ id, username, name, role, used, quota, own }]                        admins
 */
class KernelSettings extends Emitter {
  #limits = null;

  constructor() {
    super();
    kernel.onLogout(() => { this.#limits = null; });
  }

  /** True when the kernel has them (connected, lilOS 1.33.0 or newer: known after limits()). */
  get available() { return kernel.connected; }

  async limits({ fresh = false } = {}) {
    if (!kernel.connected) return DEFAULT_FILE_LIMITS;
    if (this.#limits && !fresh) return this.#limits;
    try {
      this.#limits = Object.freeze({ ...DEFAULT_FILE_LIMITS, ...(await kernel.request('GET', '/fs/limits')) });
    } catch (err) {
      if (err.status !== 404) throw err;
      this.#limits = OLD_KERNEL;
    }
    return this.#limits;
  }

  list({ user = null } = {}) {
    return kernel.request('GET', `/settings${user ? `?user=${encodeURIComponent(user)}` : ''}`);
  }

  async update({ set = {}, reset = [], user = null } = {}) {
    const out = await kernel.request('PUT', '/settings', { set, reset, ...(user && { user }) });
    this.#limits = null;
    return out;
  }

  users() {
    return kernel.request('GET', '/settings/users');
  }

  /** The kernel said they changed (event 'settings.change'): the limits are read again when needed. */
  changed({ keys = [] } = {}) {
    this.#limits = null;
    this.emit('change', { keys });
  }
}

export const kernelSettings = new KernelSettings();

/** A limit as a number to compare with (0 = no limit → Infinity). */
export const limitOf = v => (v > 0 ? v : Infinity);

export const SIZE_UNITS = Object.freeze({ KB, MB, GB });
