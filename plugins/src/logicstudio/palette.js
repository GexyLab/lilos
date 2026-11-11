import { h, icon, openMenu, storage } from '@lilos/sdk';
import { t } from './i18n.js';

/**
 * Blocchi (or Componenti, in a window): what the installed packages give, by category, with a
 * search. A click puts it in the middle of the editor; dragging puts it where it is dropped; the
 * context menu (and F1 on an item) also opens its documentation. A click on a category folds it or
 * opens it again; the folded ones are remembered per list (blocks / components). While searching
 * every category with results is open, and folding one lasts only until the search changes.
 */
const BLOCK_ORDER = ['value', 'logic', 'math', 'text', 'object', 'list', 'matrix', 'units', 'time', 'console', 'schema', 'ui', 'lilos', 'net', 'exception', 'other'];
const COMPONENT_ORDER = ['text', 'values', 'commands', 'containers', 'charts', 'other'];
export const DRAG_TYPE = 'application/x-logicstudio-item';
const FOLD_KEY = 'logicstudio.palette';   // { blocks: [folded categories], components: [...] }

export class Palette {
  el; #list; #search;
  #studio;
  #query = '';
  #folded = { blocks: new Set(), components: new Set() };
  #searchFolded = new Set();   // folded while searching, forgotten when the search changes

  constructor(studio) {
    this.#studio = studio;
    this.#search = h('input', { type: 'search', class: 'ls-search', placeholder: t('palette.search'), 'aria-label': t('palette.search') });
    this.#search.addEventListener('input', () => { this.#query = this.#search.value.trim().toLowerCase(); this.#searchFolded.clear(); this.render(); });
    const saved = storage.get(FOLD_KEY, {}) ?? {};
    for (const kind of ['blocks', 'components']) {
      if (Array.isArray(saved[kind])) saved[kind].filter(c => typeof c === 'string').forEach(c => this.#folded[kind].add(c));
    }
    this.#list = h('div', { class: 'ls-pal-list' });
    this.el = h('div', { class: 'ls-pal' }, this.#search, this.#list);
  }

  get kind() { return this.#studio.current?.kind === 'window' ? 'components' : 'blocks'; }

  #foldSet() { return this.#query ? this.#searchFolded : this.#folded[this.kind]; }

  #setFolded(cats, folded) {
    const set = this.#foldSet();
    for (const c of cats) folded ? set.add(c) : set.delete(c);
    if (!this.#query) {
      try { storage.set(FOLD_KEY, { blocks: [...this.#folded.blocks], components: [...this.#folded.components] }); } catch { /* not saved: only this session */ }
    }
    this.render();
  }

  render() {
    const studio = this.#studio;
    const kind = this.kind;
    const view = studio.current?.view;
    const items = [];
    for (const p of studio.catalog?.packages ?? []) {
      for (const def of kind === 'blocks' ? p.blocks : p.components) {
        // the object of a component is made from the window, not from here
        if (def.role === 'component') continue;
        items.push({ def, pack: p });
      }
    }
    const q = this.#query;
    const shown = items.filter(({ def }) => !q || studio.label(def).toLowerCase().includes(q) || def.type.toLowerCase().includes(q));
    const order = kind === 'blocks' ? BLOCK_ORDER : COMPONENT_ORDER;
    const groups = new Map();
    for (const it of shown) {
      const cat = order.includes(it.def.category) ? it.def.category : 'other';
      (groups.get(cat) ?? groups.set(cat, []).get(cat)).push(it);
    }
    const rows = [];
    const folds = this.#foldSet();
    const cats = order.filter(c => groups.has(c));
    for (const cat of cats) {
      const list = groups.get(cat);
      const folded = folds.has(cat);
      const head = h('button', {
        type: 'button', class: `ls-pal-cat cat-${cat}${folded ? ' folded' : ''}`, 'aria-expanded': String(!folded),
        title: t(folded ? 'palette.expand' : 'palette.collapse'),
        onclick: () => this.#setFolded([cat], !folded),
      }, h('span', { class: 'tw', 'aria-hidden': 'true' }, folded ? '▸' : '▾'), h('i', { class: 'sw' }), h('span', { class: 'nm' }, t(`cat.${kind}.${cat}`)), h('span', { class: 'n' }, String(list.length)));
      head.addEventListener('contextmenu', e => {
        e.preventDefault();
        const r = head.getBoundingClientRect();
        openMenu(e.clientX || r.left + 24, e.clientY || r.bottom, [
          { label: t(folded ? 'palette.expand' : 'palette.collapse'), icon: folded ? 'plus' : 'minus', action: () => this.#setFolded([cat], !folded) },
          { label: t('palette.collapseAll'), disabled: cats.every(c => folds.has(c)), action: () => this.#setFolded(cats, true) },
          { label: t('palette.expandAll'), disabled: !cats.some(c => folds.has(c)), action: () => this.#setFolded(cats, false) },
        ]);
      });
      rows.push(head);
      if (folded) continue;
      for (const { def, pack } of list.sort((a, b) => studio.label(a.def).localeCompare(studio.label(b.def)))) {
        const row = h('button', {
          type: 'button', class: `ls-pal-it cat-${def.category}`, draggable: true, title: `${def.type} · ${pack.name} ${pack.version}`,
          disabled: !view?.place,
          onclick: () => view?.place?.(def),
        }, icon(def.icon ?? 'blocks'), h('span', {}, studio.label(def)));
        row.addEventListener('dragstart', e => { e.dataTransfer.setData(DRAG_TYPE, def.type); e.dataTransfer.effectAllowed = 'copy'; });
        row.addEventListener('contextmenu', e => {
          e.preventDefault();
          const r = row.getBoundingClientRect();
          const x = e.clientX || r.left + 24, y = e.clientY || r.bottom;
          openMenu(x, y, [
            { label: t('palette.add'), icon: 'plus', disabled: !view?.place, action: () => view?.place?.(def) },
            { label: t('menu.docs'), icon: 'help', shortcut: 'F1', action: () => studio.showDoc(def.type) },
          ]);
        });
        row.addEventListener('keydown', e => {
          if (e.key === 'F1') { e.preventDefault(); e.stopPropagation(); studio.showDoc(def.type); }
        });
        rows.push(row);
      }
    }
    if (!rows.length) rows.push(h('p', { class: 'ls-empty' }, studio.engineError ? t('palette.noEngine') : q ? t('palette.noMatch') : t('palette.empty')));
    this.#list.replaceChildren(...rows);
  }
}
