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
 *   'app:launch'    { id, args, entry?, files?, auto? }   an app was requested (start menu, desktop shortcut;
 *                   auto: started by lilOS itself, at login);
 *                                        entry: one of its window entry points ('main' by default);
 *                                        files: ids of files the user handed it (it may read and write them);
 *                                        newWindow: a window of its own even if one is open already
 *   'item:open'     item data      a folder/file on the desktop was opened (newWindow: true with Ctrl:
 *                                  a folder in a File Manager window of its own)
 *   'system:ready'  { at }         lilOS is up (apps, settings, desk, saved windows back); once per page
 *   'user:login'    { user, workspace }   right after, the user is in: what starts with them starts
 */
export const bus = new Emitter();
