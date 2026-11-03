import { h, icon, storage, resizeHandle } from '@lilos/sdk';

const STATE_KEY = 'files-panels';   // { info: { open, width }, preview: { open, width } }
export const MIN_WIDTH = 180;
const MAX_WIDTH = 720;

/**
 * A panel on the right of the File Manager (information, preview): a header with its title and
 * a close button, then its body. It is resized by its left edge (the SDK's resizeHandle: drag,
 * ← → on it, Home / End for the limits, double click for the default width) and shown or hidden
 * with setOpen().
 * Open and width are remembered (STATE_KEY), one entry per panel.
 *
 * `room()` is the widest the panel can be now (the window decides, see FileBrowser#fit);
 * `onLayout()` runs when it opens, closes or changes width.
 */
export class SidePanel {
  open;
  width;          // the width the user chose; the one shown can be less (see show)

  constructor({ key, title, resizeLabel, closeLabel, width, open = false, room, onLayout }) {
    this.key = key;
    this.room = room;
    this.onLayout = onLayout;
    const saved = storage.get(STATE_KEY, {})?.[key];
    this.open = typeof saved?.open === 'boolean' ? saved.open : open;
    this.width = Number.isFinite(saved?.width) ? clamp(saved.width, MIN_WIDTH, MAX_WIDTH) : width;

    this.body = h('div', { class: 'fm-panel-body' });
    this.el = h('aside', { class: `fm-panel fm-panel-${key}`, 'aria-label': title, hidden: !this.open });
    // The panel is on the right of its bar: dragging left makes it wider
    this.split = resizeHandle({
      get: () => this.el.offsetWidth,
      set: (px, final) => this.resize(px, final),
      min: MIN_WIDTH, max: () => this.#max(),
      reset: width, invert: true, label: resizeLabel, host: this.el, className: 'at-start',
    });
    this.el.append(this.split,
      h('div', { class: 'fm-panel-head' },
        h('span', { class: 'fm-panel-title' }, title),
        h('button', { class: 'fm-btn', type: 'button', title: closeLabel, 'aria-label': closeLabel, onclick: () => this.setOpen(false) }, icon('x'))),
      this.body);
  }

  setOpen(open) {
    if (this.open === !!open) return;
    this.open = !!open;
    this.el.hidden = !this.open;
    this.#save();
    this.onLayout();
  }

  toggle() { this.setOpen(!this.open); }

  /** Width shown now (0 if closed). */
  get shown() { return this.open ? this.el.offsetWidth : 0; }

  /** Shows the panel `px` wide (less than `width` when the window is narrow). */
  show(px) {
    this.el.style.width = `${px}px`;
  }

  /** The width the user chose, within the limits and the room there is. */
  resize(px, save = true) {
    this.width = Math.round(clamp(px, MIN_WIDTH, this.#max()));
    if (save) this.#save();
    this.onLayout();
  }

  /** The widest it can be now. */
  #max() { return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, this.room())); }

  #save() {
    const all = storage.get(STATE_KEY, {});
    storage.set(STATE_KEY, { ...(all && typeof all === 'object' ? all : {}), [this.key]: { open: this.open, width: this.width } });
  }
}

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
