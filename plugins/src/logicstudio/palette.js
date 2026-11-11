import { h, icon, openMenu, storage } from '@lilos/sdk';
import { t } from './i18n.js';

/**
 * Blocchi (or Componenti, in a window): what the installed packages give, by category, with a
 * search. A click puts it in the middle of the editor; dragging puts it where it is dropped; the
 * context menu (and F1 on an item) also opens its documentation. A click on a category folds it or
 * opens it again; the folded ones are remembered per list (blocks / components). While searching
 * every category with results is open, and folding one lasts only until the search changes.
 *
 * A crowded category is split into subcategories: a definition may have
 * `subcategory: { id, label: { en, it }, order }` (from the engine 1.9.0). Its blocks go under a
 * smaller heading, also foldable (key `<category>/<id>`), ordered by `order` and then by where they
 * first appear; blocks without one in such a category go under «Altri», at the end.
 */
const BLOCK_ORDER = ['value', 'constMath', 'constPhysics', 'constAstro', 'logic', 'math', 'text', 'object', 'list', 'matrix', 'units', 'signal', 'geometry', 'trig', 'functions', 'integrals', 'analysis', 'time', 'console', 'schema', 'ui', 'lilos', 'net', 'hardware', 'db', 'exception', 'program', 'draw', 'other'];
const COMPONENT_ORDER = ['text', 'values', 'commands', 'containers', 'charts', 'draw', 'other'];
export const DRAG_TYPE = 'application/x-logicstudio-item';
const FOLD_KEY = 'logicstudio.palette';   // { blocks: [folded categories and category/subcategory], components: [...] }
const OTHER_SUB = '~other';                // the blocks without a subcategory in a category that has some

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

  #setFolded(keys, folded) {
    const set = this.#foldSet();
    for (const k of keys) folded ? set.add(k) : set.delete(k);
    if (!this.#query) {
      try { storage.set(FOLD_KEY, { blocks: [...this.#folded.blocks], components: [...this.#folded.components] }); } catch { /* not saved: only this session */ }
    }
    this.render();
  }

  /** The subcategories of a category's items, in order; null when it has none. */
  #subgroups(list) {
    if (!list.some(it => it.def.subcategory)) return null;
    const subs = new Map();
    list.forEach((it, i) => {
      const sc = it.def.subcategory;
      const id = sc?.id ?? OTHER_SUB;
      if (!subs.has(id)) subs.set(id, { id, label: sc ? this.#studio.label(sc) : t('palette.otherSub'), order: sc ? (sc.order ?? Infinity) : Infinity, first: sc ? i : Infinity, items: [] });
      subs.get(id).items.push(it);
    });
    return [...subs.values()].sort((a, b) => a.order - b.order || a.first - b.first);
  }

  #itemRow(def, pack, nested) {
    const studio = this.#studio;
    const view = studio.current?.view;
    const row = h('button', {
      type: 'button', class: `ls-pal-it cat-${def.category}${nested ? ' nested' : ''}`, draggable: true, title: `${def.type} · ${pack.name} ${pack.version}`,
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
    return row;
  }

  render() {
    const studio = this.#studio;
    const kind = this.kind;
    const items = [];
    for (const p of studio.catalog?.packages ?? []) {
      for (const def of kind === 'blocks' ? p.blocks : p.components) {
        // the object of a component is made from the window, not from here
        if (def.role === 'component') continue;
        // replaced by other blocks: saved schemas still use it, it is no longer offered
        if (def.obsolete) continue;
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
    const byLabel = (a, b) => studio.label(a.def).localeCompare(studio.label(b.def));
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
      const subs = this.#subgroups(list);
      if (!subs) {
        for (const { def, pack } of list.sort(byLabel)) rows.push(this.#itemRow(def, pack, false));
        continue;
      }
      const subKeys = subs.map(s => `${cat}/${s.id}`);
      for (const sub of subs) {
        const key = `${cat}/${sub.id}`;
        const subFolded = folds.has(key);
        const subHead = h('button', {
          type: 'button', class: `ls-pal-sub cat-${cat}${subFolded ? ' folded' : ''}`, 'aria-expanded': String(!subFolded),
          title: t(subFolded ? 'palette.expand' : 'palette.collapse'),
          onclick: () => this.#setFolded([key], !subFolded),
        }, h('span', { class: 'tw', 'aria-hidden': 'true' }, subFolded ? '▸' : '▾'), h('span', { class: 'nm' }, sub.label), h('span', { class: 'n' }, String(sub.items.length)));
        subHead.addEventListener('contextmenu', e => {
          e.preventDefault();
          const r = subHead.getBoundingClientRect();
          openMenu(e.clientX || r.left + 24, e.clientY || r.bottom, [
            { label: t(subFolded ? 'palette.expand' : 'palette.collapse'), icon: subFolded ? 'plus' : 'minus', action: () => this.#setFolded([key], !subFolded) },
            { label: t('palette.collapseSubs'), disabled: subKeys.every(k => folds.has(k)), action: () => this.#setFolded(subKeys, true) },
            { label: t('palette.expandSubs'), disabled: !subKeys.some(k => folds.has(k)), action: () => this.#setFolded(subKeys, false) },
          ]);
        });
        rows.push(subHead);
        if (subFolded) continue;
        for (const { def, pack } of sub.items.sort(byLabel)) rows.push(this.#itemRow(def, pack, true));
      }
    }
    if (!rows.length) rows.push(h('p', { class: 'ls-empty' }, studio.engineError ? t('palette.noEngine') : q ? t('palette.noMatch') : t('palette.empty')));
    this.#list.replaceChildren(...rows);
  }
}
