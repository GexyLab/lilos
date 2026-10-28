import { Emitter } from './events.js';
import { storage } from './storage.js';
import { shortcuts } from './shortcuts.js';

/**
 * Configurable menus. Parts of the system declare *actions* and the default *layout* of a menu;
 * the user rearranges the layout (Settings → Usabilità → Menu contestuale), which is saved under
 * 'lilos:menus' and validated against the known actions. build() turns a layout into openMenu() items.
 *
 *   menus.defineAction('desktop.arrange', { label: 'Riordina icone', icon: 'grid', run: ctx => … })
 *   menus.register('desktop.background', { label: 'Sfondo della scrivania', defaults: [...] })
 *   openMenu(x, y, menus.build('desktop.background', { at }))
 *
 * Layout entries:
 *   { type: 'action', action, label?, icon?, params? }   label/icon override the action's; params go to run()
 *   { type: 'separator' }
 *   { type: 'submenu', label, icon?, items: [...] }       one level deep
 *
 * Action definition:
 *   { label, icon?, shortcut?, run(ctx, params), enabled?(ctx, params), params?(raw) → clean | null, menus? }
 *   `shortcut` is a shortcuts command id (its keys are shown next to the item); `params` validates the
 *   parameters of saved entries; `menus` limits the action to some menus (all if omitted).
 *
 * Events: 'change' (menuId)
 */
const STORAGE_KEY = 'menus';
const MAX_ITEMS = 60;
const MAX_LABEL = 60;

class Menus extends Emitter {
  #actions = new Map();
  #menus = new Map();
  #custom = {};

  constructor() {
    super();
    const saved = storage.get(STORAGE_KEY, {});
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) this.#custom = saved;
  }

  defineAction(id, def) {
    this.#actions.set(id, { id, ...def });
  }

  register(menuId, { label, defaults }) {
    this.#menus.set(menuId, { id: menuId, label, defaults });
  }

  /** Registered menus: [{ id, label }]. */
  list() {
    return [...this.#menus.values()].map(({ id, label }) => ({ id, label }));
  }

  /** Actions usable in a menu: [{ id, label, icon }]. */
  actions(menuId) {
    return [...this.#actions.values()].filter(a => !a.menus || a.menus.includes(menuId)).map(({ id, label, icon }) => ({ id, label, icon }));
  }

  action(id) {
    const a = this.#actions.get(id);
    return a ? { id: a.id, label: a.label, icon: a.icon } : null;
  }

  /** The current layout (a copy): the user's if valid, else the default. */
  layout(menuId) {
    const menu = this.#menus.get(menuId);
    if (!menu) return [];
    const custom = this.#custom[menuId];
    const clean = Array.isArray(custom) ? this.#clean(menuId, custom, 0) : null;
    return structuredClone(clean ?? menu.defaults);
  }

  isCustom(menuId) {
    return Object.hasOwn(this.#custom, menuId);
  }

  setLayout(menuId, layout) {
    if (!this.#menus.has(menuId)) throw new Error(`Menu non registrato: ${menuId}`);
    this.#custom[menuId] = this.#clean(menuId, layout, 0) ?? [];
    storage.set(STORAGE_KEY, this.#custom);
    this.emit('change', menuId);
  }

  reset(menuId) {
    delete this.#custom[menuId];
    storage.set(STORAGE_KEY, this.#custom);
    this.emit('change', menuId);
  }

  /** openMenu() items for the current layout; ctx is passed to the actions. */
  build(menuId, ctx = {}) {
    const convert = entries => {
      const out = [];
      for (const e of entries) {
        if (e.type === 'separator') {
          if (out.length && out[out.length - 1] !== '-') out.push('-');
        } else if (e.type === 'submenu') {
          out.push({ label: e.label, icon: e.icon, items: convert(e.items) });
        } else {
          const a = this.#actions.get(e.action);
          if (!a) continue;
          out.push({
            label: e.label ?? a.label, icon: e.icon ?? a.icon,
            shortcut: a.shortcut ? shortcuts.label(a.shortcut) : undefined,
            disabled: a.enabled ? !a.enabled(ctx, e.params) : false,
            action: () => a.run(ctx, e.params),
          });
        }
      }
      while (out[out.length - 1] === '-') out.pop();
      return out;
    };
    return convert(this.layout(menuId));
  }

  /** Keeps valid entries only (unknown actions, bad params, deep submenus dropped). null if not an array. */
  #clean(menuId, entries, depth) {
    if (!Array.isArray(entries)) return null;
    const text = v => (typeof v === 'string' && v.trim() ? v.trim().slice(0, MAX_LABEL) : undefined);
    const glyph = v => (typeof v === 'string' && /^[a-zA-Z]{1,24}$/.test(v) ? v : undefined);
    const out = [];
    for (const e of entries.slice(0, MAX_ITEMS)) {
      if (!e || typeof e !== 'object') continue;
      if (e.type === 'separator') out.push({ type: 'separator' });
      else if (e.type === 'submenu' && depth === 0 && text(e.label)) {
        out.push({ type: 'submenu', label: text(e.label), ...(glyph(e.icon) && { icon: glyph(e.icon) }), items: this.#clean(menuId, e.items, 1) ?? [] });
      } else if (e.type === 'action') {
        const a = this.#actions.get(e.action);
        if (!a || (a.menus && !a.menus.includes(menuId))) continue;
        const entry = { type: 'action', action: e.action };
        if (text(e.label)) entry.label = text(e.label);
        if (glyph(e.icon)) entry.icon = glyph(e.icon);
        if (e.params !== undefined) {
          const params = a.params ? a.params(e.params) : null;
          if (a.params && !params) continue;
          if (params) entry.params = params;
        }
        out.push(entry);
      }
    }
    return out;
  }
}

export const menus = new Menus();
