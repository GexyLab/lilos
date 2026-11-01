import { Emitter } from './events.js';
import { kernel } from './kernel.js';
import { storage, uid } from './storage.js';

/**
 * Notifications for the user: what lilOS and the apps tell them, shown in the notification area
 * of the taskbar and in the Notifiche window. The kernel keeps them (its 'notifications' service,
 * module notifications-basic): they survive a reload and reach every page of the user. Without it
 * (no kernel, or no module) they live in this page only.
 *
 *   notifications.load()                  reads them from the kernel (lilOS does it at start-up)
 *   notifications.list() → [notification]  newest first
 *   notifications.get(id) / unread        one of them / how many are not read
 *   notifications.available               true when the kernel keeps them
 *   notifications.keep                    how many are kept (Control Panel → Notifiche); setKeep(n)
 *   notifications.send({ text, level?, action?, app? }) → notification
 *       level   'info' (default) | 'success' | 'warning' | 'error'
 *       action  { entry?, args? }: a click opens the sending app at that entry point with args
 *       app     the app that sends it: lilOS passes it for its apps; without it, lilOS itself
 *   notifications.markRead(ids?) / remove(ids?) / clear()   without ids: all of them
 *
 *   notification: { id, at, from: { app, name } | { system: true }, level, text, action, read }
 *
 * Events: 'new' notification (once per notification, also when another page sent it),
 *         'change' (list, read state or keep changed).
 * The system tells it what the kernel streams: received(id) for 'notification.new', changed()
 * for 'notification.change'.
 */
const LEVELS = ['info', 'success', 'warning', 'error'];
const KEEP_KEY = 'notifications-keep';
const DEFAULT_KEEP = 20;
const MAX_TEXT = 300;

class Notifications extends Emitter {
  available = false;
  keep = DEFAULT_KEEP;
  #items = [];
  #announced = new Set();
  #loaded = false;

  list() { return [...this.#items]; }
  get(id) { return this.#items.find(n => n.id === id) ?? null; }
  get unread() { return this.#items.filter(n => !n.read).length; }

  async load() {
    if (!kernel.connected) return this.#local();
    let data;
    try {
      data = await kernel.request('GET', '/notifications');
    } catch (err) {
      console.warn('[lilos] notifiche non lette:', err.message);
      return;
    }
    if (!data?.available) return this.#local();
    this.available = true;
    this.keep = data.keep;
    this.#items = Array.isArray(data.items) ? data.items : [];
    // Those there at start-up are not news
    if (!this.#loaded) for (const n of this.#items) this.#announced.add(n.id);
    this.#loaded = true;
    this.emit('change');
  }

  #local() {
    this.available = false;
    this.#loaded = true;
    const keep = storage.get(KEEP_KEY, DEFAULT_KEEP);
    this.keep = Number.isInteger(keep) && keep >= 1 && keep <= 200 ? keep : DEFAULT_KEEP;
    this.emit('change');
  }

  async send({ text, level = 'info', action = null, app = null } = {}) {
    // The first reading failed (kernel busy, network): try again before keeping it in the page
    if (kernel.connected && !this.#loaded) await this.load();
    if (!this.available) {
      if (typeof text !== 'string' || !text.trim()) throw new Error('La notifica non ha testo');
      if (!LEVELS.includes(level)) throw new Error('Livello non valido: info, success, warning o error');
      const n = {
        id: uid(), at: Date.now(), from: app ? { app, name: app } : { system: true }, level,
        text: text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT),
        action: action ? { entry: action.entry ?? 'main', args: action.args ?? null } : null, read: false,
      };
      this.#items.unshift(n);
      this.#items.length = Math.min(this.#items.length, this.keep);
      this.#announce(n);
      return n;
    }
    const n = await kernel.request('POST', '/notifications', { app, text, level, action });
    // The kernel's event may come first or after: whichever comes first tells
    if (!this.get(n.id)) {
      this.#items.unshift(n);
      this.#items.length = Math.min(this.#items.length, this.keep);
    }
    this.#announce(n);
    return n;
  }

  async markRead(ids = null) {
    const which = ids && new Set(ids);
    let changed = false;
    for (const n of this.#items) if (!n.read && (!which || which.has(n.id))) { n.read = true; changed = true; }
    if (!changed) return;
    this.emit('change');
    if (this.available) await kernel.request('POST', '/notifications/read', ids ? { ids } : {});
  }

  async remove(ids = null) {
    const which = ids && new Set(ids);
    this.#items = which ? this.#items.filter(n => !which.has(n.id)) : [];
    this.emit('change');
    if (this.available) await kernel.request('POST', '/notifications/remove', ids ? { ids } : {});
  }

  clear() { return this.remove(null); }

  async setKeep(keep) {
    if (!Number.isInteger(keep) || keep < 1 || keep > 200) throw new Error('Quante notifiche conservare: da 1 a 200');
    this.keep = keep;
    this.#items.length = Math.min(this.#items.length, keep);
    this.emit('change');
    if (this.available) await kernel.request('PUT', '/notifications-options', { keep });
    else storage.set(KEEP_KEY, keep);
  }

  /** The kernel said one arrived ('notification.new'): read it from there, then tell. */
  async received(id) {
    await this.load();
    const n = this.get(id);
    if (n) this.#announce(n);
  }

  /** The kernel said they changed ('notification.change'): another page read or removed some. */
  changed() { return this.load(); }

  #announce(n) {
    if (this.#announced.has(n.id)) return;
    this.#announced.add(n.id);
    if (this.#announced.size > 1000) this.#announced = new Set([...this.#announced].slice(-500));
    this.emit('change');
    this.emit('new', n);
  }
}

export const notifications = new Notifications();
