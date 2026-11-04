import { h, fs } from '@lilos/sdk';
import { DesktopItem } from './DesktopItem.js';
import { itemIcon } from './itemIcons.js';
import { loadWidget } from './widgets.js';

const SIZE = { min: 40, max: 1200 };
const clamp = v => Math.min(SIZE.max, Math.max(SIZE.min, Math.round(Number(v) || 0)));
const COLOR = /^#[0-9a-f]{3,8}$|^rgb\(\s*\d{1,3}(\s*,\s*\d{1,3}){2}\s*\)$/i;

/**
 * A file shown on the desk by its app's widget (widgets.js) instead of an icon: a DesktopItem
 * whose glyph is the widget's element. The desk selects, drags, deletes and renames it as any
 * item; the label is seen only while renaming. Until the app's code is there (or if it fails)
 * the file's icon shows in the middle.
 */
export class DeskWidget extends DesktopItem {
  #ctl = null;
  #offCamera;
  #gone = false;
  #openWhenReady = false;   // opened before the app's code was there

  /** found: { app, widget } of widgetFor(); canvas: the desk's; onSelect(item): select it alone. */
  constructor(data, { app, widget }, { canvas, onSelect }) {
    super(data);
    this.widget = { app: app.id, id: widget.id };
    this.canvas = canvas;
    this.el.classList.add('dwidget');
    this.body = h('div', { class: 'dwidget-body' }, h('div', { class: 'dwidget-wait' }, itemIcon(data)));
    this.glyph.replaceWith(this.body);
    this.resize(widget.width, widget.height);
    const host = {
      setSize: (w, hgt) => { this.resize(w, hgt); canvas.changed(); },
      setEditing: on => this.el.classList.toggle('editing', !!on),
      setColor: color => {
        if (typeof color === 'string' && COLOR.test(color.trim())) this.el.dataset.mmColor = color.trim();
        else delete this.el.dataset.mmColor;
        canvas.changed();
      },
      select: () => onSelect(this),
      get scale() { return canvas.cam.s; },
    };
    loadWidget(app, widget).then(make => {
      if (this.#gone) return;
      this.body.replaceChildren();
      this.#ctl = make({ el: this.body, node: fs.get(data.id) ?? { ...data }, host }) ?? {};
      this.#ctl.zoom?.(canvas.cam.s);
      if (this.el.classList.contains('selected')) this.#ctl.selected?.(true);
      if (this.#openWhenReady) this.#ctl.open?.();
    }).catch(err => console.error(`[lilos] widget di ${app.id}:`, err));
    this.#offCamera = canvas.on('camera', cam => this.#ctl?.zoom?.(cam.s));
  }

  /** Size on the desk, in desk pixels. */
  resize(w, hgt) {
    this.el.style.width = `${clamp(w)}px`;
    this.el.style.height = `${clamp(hgt)}px`;
  }

  setSelected(selected) {
    super.setSelected(selected);
    this.#ctl?.selected?.(selected);
  }

  setData(node) {
    Object.assign(this.data, { name: node.name, color: node.color, tags: node.tags, apps: node.apps, modified: node.modified, size: node.size });
    this.label.textContent = node.name;
    this.#ctl?.update?.(fs.get(node.id) ?? node);
  }

  /** Opened by the user: the widget's own (editing in place). */
  open() {
    if (this.#ctl) this.#ctl.open?.();
    else this.#openWhenReady = true;
  }

  /** The widget's entries for the item's menu. */
  menuEntries() {
    try {
      const entries = this.#ctl?.menu?.();
      return Array.isArray(entries) ? entries.filter(Boolean) : [];
    } catch (err) {
      console.error(`[lilos] widget di ${this.widget.app}:`, err);
      return [];
    }
  }

  destroy() {
    this.#gone = true;
    this.#offCamera();
    try { this.#ctl?.destroy?.(); } catch (err) { console.error(`[lilos] widget di ${this.widget.app}:`, err); }
    this.#ctl = null;
  }
}
