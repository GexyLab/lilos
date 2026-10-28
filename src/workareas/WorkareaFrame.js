import { h, icon } from '@lilos/sdk';

export const AREA_EDGES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
export const HEADER = 34;   // height of the title bar, in world pixels

/**
 * An open workarea on the desk: a frame with a title bar. Only the title bar and the edges take
 * the pointer; inside, clicks reach the desk (selection, menu), so items and windows in the area
 * are used as everywhere else. It only renders and reports intents; Workareas decides.
 *
 * Callbacks: onMove(e) title bar dragged · onResize(e, edge) · onCollapse() · onProperties() · onMenu(e) · onRename()
 */
export class WorkareaFrame {
  constructor(ws, { onMove, onResize, onCollapse, onProperties, onMenu, onRename }) {
    this.id = ws.id;
    this.title = h('span', { class: 'wa-title' });
    const tool = (glyph, label, onclick) => h('button', { class: 'wa-btn', type: 'button', title: label, 'aria-label': label, onclick }, icon(glyph));
    this.head = h('div', { class: 'wa-head' },
      icon('workarea'), this.title,
      tool('info', 'Proprietà della workarea', () => onProperties()),
      tool('minus', 'Riduci a icona', () => onCollapse()));
    this.edges = AREA_EDGES.map(edge => h('div', { class: `wa-edge ${edge}`, dataset: { edge } }));
    this.el = h('div', { class: 'wa-area', dataset: { kind: 'workarea', id: ws.id }, role: 'region' }, this.head, ...this.edges);

    this.head.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button, input')) return;
      onMove(e);
    });
    this.head.addEventListener('dblclick', e => { if (!e.target.closest('button')) onRename(); });
    this.head.addEventListener('contextmenu', e => { e.preventDefault(); onMenu(e); });
    for (const el of this.edges) {
      el.addEventListener('pointerdown', e => { if (e.button === 0) onResize(e, el.dataset.edge); });
    }
    this.update(ws);
  }

  update(ws) {
    this.title.textContent = ws.title;
    this.el.setAttribute('aria-label', `Workarea ${ws.title}`);
    this.head.title = ws.description ? `${ws.title}\n${ws.description}` : ws.title;
    this.setRect(ws.rect);
  }

  setRect({ x, y, w, h: hgt }) {
    Object.assign(this.el.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${hgt}px` });
  }

  setCurrent(on) {
    this.el.classList.toggle('current', on);
  }

  /** Inline rename in the title bar. Resolves with the new title, or null (cancelled / unchanged). */
  editTitle() {
    return new Promise(resolve => {
      const old = this.title.textContent;
      const input = h('input', { class: 'wa-title-input', type: 'text', value: old, spellcheck: 'false', 'aria-label': 'Titolo della workarea', maxlength: '80' });
      this.title.replaceWith(input);
      input.focus();
      input.select();
      let done = false;
      const finish = commit => {
        if (done) return;
        done = true;
        const value = input.value.replace(/\s+/g, ' ').trim();
        input.replaceWith(this.title);
        resolve(commit && value && value !== old ? value : null);
      };
      input.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); finish(true); }
        if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      });
      input.addEventListener('blur', () => finish(true));
    });
  }
}
