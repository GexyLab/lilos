export class Emitter {
  #handlers = new Map();

  /** Subscribe; returns an unsubscribe function. */
  on(type, fn) {
    if (!this.#handlers.has(type)) this.#handlers.set(type, new Set());
    this.#handlers.get(type).add(fn);
    return () => this.off(type, fn);
  }

  off(type, fn) {
    this.#handlers.get(type)?.delete(fn);
  }

  emit(type, payload) {
    this.#handlers.get(type)?.forEach(fn => fn(payload));
  }
}

/**
 * System-wide bus. Current events:
 *   'app:launch'  { id, args, entry? }   an app was requested (start menu, desktop shortcut);
 *                                        entry: one of its window entry points ('main' by default)
 *   'item:open'   item data      a folder/file on the desktop was opened
 */
export const bus = new Emitter();
