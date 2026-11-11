import { h, LogicCanvas, openMenu, messageBox, portsOf, typesMatch, linkKey } from '@lilos/sdk';
import { DRAG_TYPE } from './palette.js';
import { t, i18n } from './i18n.js';

/**
 * A schema (.lsch) in its tab: the canvas (SDK LogicCanvas), the blocks dropped from the palette,
 * the menus. Ports are added and removed in the properties sidebar (inspector.js), never here.
 */
export class SchemaEditor {
  el; canvas; doc; name;
  #studio;
  #limits = { maxBlocks: 200, maxLinks: 600 };

  constructor(studio, doc, name) {
    this.#studio = studio;
    this.doc = doc;
    this.name = name;
    this.canvas = new LogicCanvas({
      schema: doc, catalog: studio.catalog, lang: i18n.lang,
      componentOf: b => this.#componentOf(b),
      labels: { error: t('port.error'), missing: t('block.missing') },
    });
    this.el = h('div', { class: 'ls-editor ls-schema' }, this.canvas.el);
    // the toolbar too: «Allinea» works from 2 selected blocks
    this.canvas.on('select', () => { studio.inspector.render(); studio.renderToolbar(); });
    this.canvas.on('open', ({ id }) => this.#open(id));
    this.canvas.on('contextmenu', e => this.#menu(e));
    this.canvas.on('linkDrop', e => this.#quickAdd(e));
    this.canvas.on('view', () => studio.renderStatus());
    doc.on('change', () => { studio.inspector.render(); studio.renderStatus(); });
    this.el.addEventListener('dragover', e => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
    this.el.addEventListener('drop', e => {
      const type = e.dataTransfer.getData(DRAG_TYPE);
      const def = type && studio.blockDef(type);
      if (!def) return;
      e.preventDefault();
      this.place(def, this.canvas.toWorld(e.clientX, e.clientY));
    });
    // The objects of components need their windows' definitions
    this.#loadWindows();
    requestAnimationFrame(() => { if (!doc.data.blocks.length || !doc.data.view?.zoom) this.canvas.fit(); });
  }

  get selection() { return this.canvas.selection; }

  async #loadWindows() {
    const ws = this.#studio.ws;
    if (!ws?.project) return;
    for (const path of Object.values(ws.project.data.windows)) await ws.doc(path).catch(() => null);
    this.canvas.refresh(true);
  }

  /** For the object of a Componente UI: the component's definition and its added ports. */
  #componentOf(block) {
    const ws = this.#studio.ws;
    const path = ws?.project?.data.windows[block.config.window];
    const win = path ? ws.loaded(path) : null;
    const node = win?.find(block.config.component)?.node;
    if (!node) return null;
    return { def: this.#studio.componentDef(node.type), added: node.added ?? { inputs: [], outputs: [] } };
  }

  setCatalog(catalog) { this.canvas.setCatalog(catalog); }
  show() { this.canvas.el.focus({ preventScroll: true }); }
  destroy() { this.canvas.destroy(); }

  place(def, at = null) {
    if (this.doc.data.blocks.length >= this.#limits.maxBlocks) {
      messageBox(this.#studio.win, { icon: 'warning', title: t('limit.blocks', { n: this.#limits.maxBlocks }) });
      return null;
    }
    return this.canvas.place(def, at);
  }

  setLimits(limits) { this.#limits = { ...this.#limits, ...limits }; }

  statusText() {
    return t('status.schema', { blocks: this.doc.data.blocks.length, maxBlocks: this.#limits.maxBlocks, links: this.doc.data.links.length, maxLinks: this.#limits.maxLinks, zoom: Math.round(this.canvas.view.zoom * 100) });
  }

  toolbar(b) {
    return [
      b('minus', null, () => this.canvas.zoomAt(1 / 1.2), { title: t('tb.zoomOut') }),
      b(null, `${Math.round(this.canvas.view.zoom * 100)}%`, () => this.canvas.setView({ ...this.canvas.view, zoom: 1 }), { cls: 'pct', title: t('tb.zoomReset') }),
      b('plus', null, () => this.canvas.zoomAt(1.2), { title: t('tb.zoomIn') }),
      b('fit', t('tb.fit'), () => this.canvas.fit()),
      b('cols', t('tb.align'), e => {
        const r = e.currentTarget.getBoundingClientRect();
        openMenu(r.left, r.bottom + 2, this.#alignItems());
      }, { disabled: this.canvas.readOnly || this.canvas.selection.blocks.length < 2, title: t('tb.alignHint') }),
    ];
  }

  /** The «Allinea» menu: horizontally (left, centre, right, spread), vertically (top, middle, bottom, spread). */
  #alignItems() {
    const n = this.canvas.selection.blocks.length;
    const item = (how, disabled = false) => ({ label: t(`align.${how}`), disabled, action: () => this.align(how) });
    return [
      item('left'), item('center'), item('right'), item('spreadX', n < 3),
      '-',
      item('top'), item('middle'), item('bottom'), item('spreadY', n < 3),
    ];
  }

  /**
   * Lines up the selected blocks (one step of the history): 'left' | 'center' | 'right' | 'top' |
   * 'middle' | 'bottom' on the edge (or centre) of the box around them; 'spreadX' | 'spreadY' leave
   * the first and last where they are and the same gap between the others (from 3 blocks).
   */
  align(how) {
    const list = this.canvas.selection.blocks.map(id => {
      const b = this.doc.block(id);
      const el = this.canvas.el.querySelector(`.lgc-block[data-id="${CSS.escape(id)}"]`);
      return b && { id, x: b.x, y: b.y, w: el?.offsetWidth ?? 160, h: el?.offsetHeight ?? 80 };
    }).filter(Boolean);
    if (list.length < 2 || this.canvas.readOnly) return;
    const x0 = Math.min(...list.map(r => r.x)), x1 = Math.max(...list.map(r => r.x + r.w));
    const y0 = Math.min(...list.map(r => r.y)), y1 = Math.max(...list.map(r => r.y + r.h));
    const pos = Object.fromEntries(list.map(r => [r.id, [r.x, r.y]]));
    const spread = (axis, size, from, to) => {
      if (list.length < 3) return;
      const sorted = [...list].sort((a, b) => a[axis] - b[axis]);
      const gap = (to - from - sorted.reduce((s, r) => s + r[size], 0)) / (sorted.length - 1);
      let at = from;
      for (const r of sorted) { pos[r.id][axis === 'x' ? 0 : 1] = at; at += r[size] + gap; }
    };
    for (const r of list) {
      const p = pos[r.id];
      if (how === 'left') p[0] = x0;
      else if (how === 'center') p[0] = (x0 + x1 - r.w) / 2;
      else if (how === 'right') p[0] = x1 - r.w;
      else if (how === 'top') p[1] = y0;
      else if (how === 'middle') p[1] = (y0 + y1 - r.h) / 2;
      else if (how === 'bottom') p[1] = y1 - r.h;
    }
    if (how === 'spreadX') spread('x', 'w', x0, x1);
    if (how === 'spreadY') spread('y', 'h', y0, y1);
    const moved = list.filter(r => Math.round(pos[r.id][0]) !== r.x || Math.round(pos[r.id][1]) !== r.y);
    if (moved.length) this.doc.place(Object.fromEntries(moved.map(r => [r.id, pos[r.id]])));
  }

  #open(id) {
    const block = this.doc.block(id);
    const def = block && this.#studio.blockDef(block.type);
    // The object of a component: its window
    if (def?.role === 'component') {
      const path = this.#studio.ws?.project?.data.windows[block.config.window];
      if (path) this.#studio.openElement('windows', path);
    }
  }

  #menu(e) {
    const items = [];
    const sel = this.canvas.selection;
    if (e.kind === 'block') {
      const block = this.doc.block(e.id);
      const def = this.#studio.blockDef(block?.type);
      items.push({ label: t('menu.duplicate'), icon: 'copy', shortcut: 'Ctrl+D', action: () => this.canvas.select(this.doc.duplicate(sel.blocks)) });
      items.push({ label: t('menu.label'), icon: 'pencil', action: () => this.#rename(e.id) });
      if (sel.blocks.length > 1 && !this.canvas.readOnly) items.push({ label: t('tb.align'), icon: 'cols', items: this.#alignItems() });
      if (def?.role === 'component') items.push({ label: t('menu.openWindow'), icon: 'window', action: () => this.#open(e.id) });
      items.push('-');
      items.push({ label: t(sel.blocks.length > 1 ? 'menu.removeBlocks' : 'menu.removeBlock', { n: sel.blocks.length }), icon: 'trash', danger: true, shortcut: 'Canc', action: () => this.canvas.removeSelection() });
    } else if (e.kind === 'link') {
      items.push({ label: t('menu.removeLink'), icon: 'trash', danger: true, shortcut: 'Canc', action: () => this.canvas.removeSelection() });
    } else {
      items.push({ label: t('menu.addHere'), icon: 'plus', action: () => this.#quickAdd({ world: e.world, clientX: e.clientX, clientY: e.clientY }) });
      items.push({ label: t('menu.selectAll'), shortcut: 'Ctrl+A', action: () => this.canvas.select(this.doc.data.blocks.map(b => b.id)) });
      items.push({ label: t('tb.fit'), icon: 'fit', action: () => this.canvas.fit() });
    }
    openMenu(e.clientX, e.clientY, items);
  }

  async #rename(id) {
    const block = this.doc.block(id);
    const res = await messageBox(this.#studio.win, {
      icon: 'pencil', title: t('menu.label'), text: t('menu.labelText'),
      fields: [{ name: 'label', label: t('inspector.label'), value: block?.label ?? '', maxLength: 80 }],
      buttons: ['cancel', { value: 'ok', label: t('common.ok'), primary: true }],
    });
    if (res?.button === 'ok') this.doc.setLabel(id, String(res.values.label ?? '').trim());
  }

  /**
   * A link dropped on nothing (or «Aggiungi un blocco qui»): the blocks that fit, to put there.
   * With `from`, the new block's first input that fits gets the link.
   */
  #quickAdd({ from = null, world, clientX, clientY }) {
    const studio = this.#studio;
    let fromType = null;
    if (from) {
      const block = this.doc.block(from[0]);
      const def = studio.blockDef(block?.type);
      fromType = def ? portsOf(block, def).outputs.find(p => p.name === from[1])?.type ?? 'any' : 'any';
    }
    const defs = (studio.catalog?.packages ?? []).flatMap(p => p.blocks).filter(d => !d.role || d.role === 'schemaOut');
    const fitting = defs.filter(d => !from || d.inputs.some(p => typesMatch(fromType, p.type ?? 'any')));
    const byCat = new Map();
    for (const d of fitting) (byCat.get(d.category) ?? byCat.set(d.category, []).get(d.category)).push(d);
    const items = [...byCat].map(([cat, list]) => ({
      label: t(`cat.blocks.${cat}`) ?? cat,
      items: list.sort((a, b) => studio.label(a).localeCompare(studio.label(b))).map(d => ({
        label: studio.label(d), icon: d.icon,
        action: () => {
          const id = this.place(d, world);
          if (!id || !from) return;
          const input = d.inputs.find(p => typesMatch(fromType, p.type ?? 'any'));
          if (input) this.doc.connect(from, [id, input.name]);
        },
      })),
    }));
    if (items.length) openMenu(clientX, clientY, items);
  }

  /** The links of the selection that would go if these blocks went (for the inspector's message). */
  linksOf(ids) {
    const set = new Set(ids);
    return this.doc.data.links.filter(l => set.has(l.from[0]) || set.has(l.to[0])).map(linkKey);
  }
}
