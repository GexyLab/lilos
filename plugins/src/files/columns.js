import { storage } from '@lilos/sdk';

const STATE_KEY = 'files-columns';   // { widths: { <column key>: px }, hidden: [<column key>] }
export const MIN_COL = 48;
const MAX_COL = 1600;
/** Narrowest the name column gets while it takes the room the others leave. */
const NAME_MIN = 160;
/** Width of each column until the user resizes it (the name takes what is left). */
const DEFAULT_WIDTH = { modified: 128, deleted: 128, size: 92, type: 118, workspace: 124, origin: 160, location: 160 };

/**
 * Widths and visibility of the list view's columns, shared by every view (folder, trash, tag):
 * a column has the same width wherever it appears. The name column is never hidden; until it is
 * resized it takes the room the other columns leave. Remembered in STATE_KEY.
 */
export class Columns {
  widths = {};
  hidden = new Set();

  constructor() {
    const saved = storage.get(STATE_KEY, {});
    const widths = saved && typeof saved.widths === 'object' ? saved.widths : {};
    for (const [key, px] of Object.entries(widths ?? {})) {
      if (Object.hasOwn(DEFAULT_WIDTH, key) || key === 'name') {
        if (Number.isFinite(px)) this.widths[key] = clamp(Math.round(px), MIN_COL, MAX_COL);
      }
    }
    if (Array.isArray(saved?.hidden)) saved.hidden.filter(k => Object.hasOwn(DEFAULT_WIDTH, k)).forEach(k => this.hidden.add(k));
  }

  /** The columns of a view that are shown. */
  shown(columns) { return columns.filter(c => c.key === 'name' || !this.hidden.has(c.key)); }

  width(key) { return this.widths[key] ?? DEFAULT_WIDTH[key]; }

  /** grid-template-columns and the narrowest the rows get (wider than the list: it scrolls sideways). */
  layout(columns, measuring = null) {
    const flexible = this.widths.name == null && measuring !== 'name';
    const tracks = columns.map(c => c.key === measuring ? 'max-content'
      : c.key === 'name' && flexible ? `minmax(${NAME_MIN}px, 1fr)` : `${this.width(c.key)}px`);
    // A fixed name column: an empty track after the last column fills the rest of the row
    if (!flexible) tracks.push('minmax(0, 1fr)');
    const min = columns.reduce((sum, c) => sum + (c.key === measuring ? 0 : c.key === 'name' && flexible ? NAME_MIN : this.width(c.key)), 0);
    return { template: tracks.join(' '), min: `${min}px` };
  }

  resize(key, px, save = true) {
    this.widths[key] = clamp(Math.round(px), MIN_COL, MAX_COL);
    if (save) this.save();
  }

  setHidden(key, hidden) {
    if (key === 'name') return;
    if (hidden) this.hidden.add(key); else this.hidden.delete(key);
    this.save();
  }

  /** Default widths, every column shown. */
  reset() {
    this.widths = {};
    this.hidden.clear();
    this.save();
  }

  save() {
    storage.set(STATE_KEY, { widths: this.widths, hidden: [...this.hidden] });
  }
}

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
