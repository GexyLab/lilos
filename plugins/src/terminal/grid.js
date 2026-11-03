import { h, resizeHandle } from '@lilos/sdk';
import { TabBar } from '../shared/TabBar.js';
import { t } from './i18n.js';

/**
 * The panes of a Terminal window: a grid of groups of tabs, each group with its own tab bar. The
 * layout is a tree whose leaves are groups:
 *
 *   Group                                    tabs, current, tabBar (TabBar), el (bar + panes)
 *   split { dir: 'row' | 'column', items: [node], sizes: [fraction] }   side by side / one under the other
 *
 * There is no limit to how many there are. A split always has two items or more; the sizes add up
 * to 1. The separators between them (the SDK's resizeHandle) are dragged, or moved with the arrow
 * keys, to change the sizes; a double click makes them equal.
 *
 *   new Grid(onChange)      onChange(): the layout changed (sizes too)
 *   grid.el, grid.root
 *   grid.groups()           in reading order (left to right, top to bottom)
 *   grid.split(group, side, fresh)   fresh next to group: side 'left' | 'right' | 'up' | 'down'
 *   grid.remove(group)      its place goes to its neighbours
 *   grid.neighbor(group, side)       the group seen next to it on that side, or null
 *   grid.toJSON(tabState) / grid.load(json, makeGroup)
 */
export class Group {
  tabs = [];
  current = null;
  #abort = new AbortController();

  /** dragStart(pointer event, key): a tab of its bar is being dragged (drag.js). */
  constructor({ dragStart } = {}) {
    this.tabBar = new TabBar({ t, signal: this.#abort.signal, label: t('remote.tabs'), newLabel: t('remote.newShell'), dragStart, className: 'tm-tabbar' });
    this.bar = this.tabBar.el;
    this.panes = h('div', { class: 'tm-panes' });
    this.el = h('div', { class: 'tm-group' }, this.bar, this.panes);
  }

  /** The pane is gone (or its window): its bar stops listening. */
  dispose() {
    this.#abort.abort();
  }
}

const MIN = { row: 140, column: 90 };   // pixels a pane keeps when the separator is dragged
const GUTTER = 5;                        // pixels of a separator (terminal.css, .tm-gutter)
const isSplit = node => !!node && !(node instanceof Group) && Array.isArray(node.items);

export class Grid {
  root = null;

  constructor(onChange) {
    this.onChange = onChange;
    this.el = h('div', { class: 'tm-grid' });
  }

  groups() {
    const out = [];
    const walk = node => (isSplit(node) ? node.items.forEach(walk) : node && out.push(node));
    walk(this.root);
    return out;
  }

  /** { split, index } of the node in its parent, or null for the root. */
  parentOf(node, from = this.root) {
    if (!isSplit(from)) return null;
    const index = from.items.indexOf(node);
    if (index >= 0) return { split: from, index };
    for (const item of from.items) {
      const found = this.parentOf(node, item);
      if (found) return found;
    }
    return null;
  }

  #replace(old, node) {
    const p = this.parentOf(old);
    if (p) p.split.items[p.index] = node;
    else this.root = node;
  }

  split(group, side, fresh) {
    const dir = side === 'left' || side === 'right' ? 'row' : 'column';
    const after = side === 'right' || side === 'down';
    const p = this.parentOf(group);
    if (p && p.split.dir === dir) {
      const half = p.split.sizes[p.index] / 2;
      p.split.sizes[p.index] = half;
      const at = after ? p.index + 1 : p.index;
      p.split.items.splice(at, 0, fresh);
      p.split.sizes.splice(at, 0, half);
    } else {
      this.#replace(group, { dir, items: after ? [group, fresh] : [fresh, group], sizes: [0.5, 0.5] });
    }
    this.render();
  }

  remove(group) {
    const p = this.parentOf(group);
    if (!p) return;
    const { split, index } = p;
    const share = split.sizes[index];
    split.items.splice(index, 1);
    split.sizes.splice(index, 1);
    split.sizes[Math.max(0, index - 1)] += share;
    if (split.items.length === 1) {
      const only = split.items[0];
      const up = this.parentOf(split);
      // A split left alone inside a split of the same direction joins it
      if (up && isSplit(only) && only.dir === up.split.dir) {
        const size = up.split.sizes[up.index];
        up.split.items.splice(up.index, 1, ...only.items);
        up.split.sizes.splice(up.index, 1, ...only.sizes.map(s => s * size));
      } else this.#replace(split, only);
    }
    this.render();
  }

  /** The group next to this one on that side: the nearest whose edge faces it, overlapping it the most. */
  neighbor(group, side) {
    const r = group.el.getBoundingClientRect();
    let best = null, bestScore = Infinity;
    for (const g of this.groups()) {
      if (g === group) continue;
      const c = g.el.getBoundingClientRect();
      let gap, overlap;
      if (side === 'left' || side === 'right') {
        gap = side === 'left' ? r.left - c.right : c.left - r.right;
        overlap = Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top);
      } else {
        gap = side === 'up' ? r.top - c.bottom : c.top - r.bottom;
        overlap = Math.min(r.right, c.right) - Math.max(r.left, c.left);
      }
      if (gap < -2 || overlap <= 0) continue;
      const score = gap * 1000 - overlap;
      if (score < bestScore) { best = g; bestScore = score; }
    }
    return best;
  }

  // ---------- Drawing ----------

  render() {
    const build = node => {
      if (!isSplit(node)) return node.el;
      const box = h('div', { class: `tm-split ${node.dir}` });
      node.items.forEach((item, i) => {
        if (i) box.append(this.#gutter(node, i, box));
        const el = build(item);
        el.style.flex = `${node.sizes[i]} 1 0`;
        box.append(el);
      });
      return box;
    };
    if (!this.root) return this.el.replaceChildren();
    const top = build(this.root);
    top.style.flex = '';
    this.el.replaceChildren(top);
    this.el.classList.toggle('many', isSplit(this.root));
    this.onChange?.();
  }

  /** The separator before item i of a split: it sizes the item before it (and the one after, with what is left of the two). */
  #gutter(split, i, box) {
    const row = split.dir === 'row';
    const sizeOf = () => {
      const r = box.getBoundingClientRect();
      const gutters = (split.items.length - 1) * GUTTER;
      return Math.max(1, (row ? r.width : r.height) - gutters);
    };
    const apply = () => {
      const kids = [...box.children].filter(el => !el.classList.contains('tm-gutter'));
      kids.forEach((el, k) => { el.style.flex = `${split.sizes[k]} 1 0`; });
    };
    const pair = () => split.sizes[i - 1] + split.sizes[i];
    const least = () => Math.min(0.45 * sizeOf(), MIN[split.dir]);
    return resizeHandle({
      orientation: row ? 'vertical' : 'horizontal', className: 'tm-gutter', label: t('grid.gutter'), step: 24,
      get: () => split.sizes[i - 1] * sizeOf(),
      set: (px, final) => {
        const both = pair();
        const a = Math.min(both, px / sizeOf());
        split.sizes[i - 1] = a;
        split.sizes[i] = both - a;
        apply();
        if (final) this.onChange?.();
      },
      min: least,
      max: () => pair() * sizeOf() - least(),
      reset: () => {
        split.sizes = split.items.map(() => 1 / split.items.length);
        apply();
        this.onChange?.();
      },
    });
  }

  // ---------- Saved state ----------

  /** The layout as JSON: tabState(tab) → its saved state or null (left out). */
  toJSON(tabState) {
    const save = node => {
      if (isSplit(node)) return { dir: node.dir, sizes: node.sizes.map(s => Math.round(s * 1e4) / 1e4), items: node.items.map(save) };
      const tabs = node.tabs.map(tabState);
      return { tabs, current: Math.max(0, node.tabs.indexOf(node.current)) };
    };
    return this.root ? save(this.root) : null;
  }

  /**
   * Builds the layout from toJSON's JSON (saved data: checked); makeGroup(json) makes a group with
   * its tabs, or null when none could come back. Returns false when nothing could.
   */
  load(json, makeGroup, depth = 0) {
    const build = (node, d) => {
      if (!node || typeof node !== 'object' || d > 12) return null;
      if (Array.isArray(node.items)) {
        const dir = node.dir === 'column' ? 'column' : 'row';
        const pairs = node.items.slice(0, 64).map((item, k) => [build(item, d + 1), Number(node.sizes?.[k])]).filter(([n]) => n);
        if (!pairs.length) return null;
        if (pairs.length === 1) return pairs[0][0];
        const sizes = pairs.map(([, s]) => (Number.isFinite(s) && s > 0 ? s : 1));
        const sum = sizes.reduce((a, b) => a + b, 0);
        return { dir, items: pairs.map(([n]) => n), sizes: sizes.map(s => s / sum) };
      }
      return makeGroup(node);
    };
    this.root = build(json, depth);
    this.render();
    return !!this.root;
  }
}
