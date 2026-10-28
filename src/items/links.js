import { Emitter, fs, storage } from '@lilos/sdk';

const STORAGE_KEY = 'files-sidebar';
const OLD_KEY = 'files-links';   // links before they could go anywhere in the sidebar: added at the end
const MAX = 80;
const SPECIAL = new Set(['desk']);
const DROPPED = new Set(['tags', 'trash']);   // keys of an earlier version: removed when read

const differ = (a, b) => a.length !== b.length || a.some((k, i) => k !== b[i]);

/**
 * "Collegamenti", the first section of the File Manager's sidebar, in the order the user chose:
 * its places (Home, Scrivania, Documenti…) and the links to files and folders dragged there.
 * The tags and the trash come after it and are not part of it.
 *
 * The order is a list of keys, saved under 'lilos:files-sidebar' (shared by every workspace):
 *   a node id    a place (Home is 'root', the shared system folders) or a link
 *   'desk'       the current workspace's Scrivania (every workspace has its own)
 * ('tags' and 'trash' were keys too in an earlier version: they are removed when the order is read.)
 * A link follows its node when it is renamed or moved, and is not shown while the node cannot be
 * seen (in the trash, on another workspace's desk); it stays in the list for when it comes back.
 *
 * Events: 'change' — the order changed.
 */
class Links extends Emitter {
  #order;

  constructor() {
    super();
    // Stored data is untrusted: only distinct strings
    const clean = v => (Array.isArray(v) ? [...new Set(v.filter(k => typeof k === 'string' && k))] : []);
    const saved = clean(storage.get(STORAGE_KEY, []));
    const old = clean(storage.get(OLD_KEY, null));
    this.#order = [...new Set([...saved, ...old])].filter(k => !DROPPED.has(k)).slice(-MAX);
    if (old.length) storage.remove(OLD_KEY);
    if (differ(saved, this.#order)) storage.set(STORAGE_KEY, this.#order);
  }

  /**
   * The sidebar's keys for these places (`defaults`, in their default order): the saved order of
   * what can be seen now, with each place not placed yet after the place that comes before it.
   */
  arrange(defaults) {
    const out = this.#order.filter(k => defaults.includes(k) || (!SPECIAL.has(k) && fs.exists(k)));
    defaults.forEach((k, i) => {
      if (out.includes(k)) return;
      const prev = defaults.slice(0, i).reverse().find(p => out.includes(p));
      out.splice(prev ? out.indexOf(prev) + 1 : 0, 0, k);
    });
    return out;
  }

  /** True if a node is in the sidebar as a link (not as one of the places in `defaults`). */
  has(id, defaults = []) {
    return this.#order.includes(id) && !defaults.includes(id);
  }

  /**
   * Puts `keys` at position `index` of arrange(defaults): new ones become links, those already
   * there move. Returns how many links were added.
   */
  place(keys, index, defaults) {
    const { list, next, added } = this.#placed(keys, index, defaults);
    if (next && differ(list, next)) this.#save(next);
    return added;
  }

  /** True if place() with these arguments would change the sidebar (false: already like that). */
  changes(keys, index, defaults) {
    const { list, next } = this.#placed(keys, index, defaults);
    return !!next && differ(list, next);
  }

  /** The visible order now (list) and after placing `keys` at `index` (next; null if none can go). */
  #placed(keys, index, defaults) {
    const list = this.arrange(defaults);
    const moving = [...new Set(keys)].filter(k => defaults.includes(k) || (!SPECIAL.has(k) && fs.exists(k)));
    if (!moving.length) return { list, next: null, added: 0 };
    const added = moving.filter(k => !list.includes(k)).length;
    const at = index - list.slice(0, index).filter(k => moving.includes(k)).length;
    const next = list.filter(k => !moving.includes(k));
    next.splice(Math.max(0, Math.min(at, next.length)), 0, ...moving);
    return { list, next, added };
  }

  /** Adds links at the end (from an item's menu). Returns how many were added. */
  add(ids) {
    const fresh = ids.filter(id => !this.#order.includes(id) && fs.exists(id) && id !== fs.root);
    if (!fresh.length) return 0;
    this.#save([...this.#order, ...fresh]);
    return fresh.length;
  }

  remove(id) {
    if (!this.#order.includes(id)) return;
    this.#save(this.#order.filter(k => k !== id), id);
  }

  /**
   * Saves `visible` as the new order; what cannot be seen now keeps its place after the key it
   * followed (except `removed`).
   */
  #save(visible, removed = null) {
    const next = [...visible];
    this.#order.forEach((k, i) => {
      if (next.includes(k) || k === removed) return;
      const prev = this.#order.slice(0, i).reverse().find(p => next.includes(p));
      next.splice(prev ? next.indexOf(prev) + 1 : next.length, 0, k);
    });
    this.#order = next.slice(-MAX);
    storage.set(STORAGE_KEY, this.#order);
    this.emit('change');
  }
}

export const links = new Links();

/** Menu entry that adds a link to the File Manager's sidebar, or null if they all have one already. */
export function linkEntry(ids) {
  const fresh = ids.filter(id => !links.has(id) && fs.exists(id) && id !== fs.root && !fs.get(id).system);
  return fresh.length ? { label: 'Aggiungi alla barra laterale di File', icon: 'link', action: () => links.add(fresh) } : null;
}
