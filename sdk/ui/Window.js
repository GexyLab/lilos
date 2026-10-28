import { h } from '../core/dom.js';
import { Emitter } from '../core/events.js';
import { icon } from './icons.js';

const CONTROLS = [
  { name: 'minimize', glyph: 'minus', label: 'Riduci a icona' },
  { name: 'maximize', glyph: 'max', label: 'Ingrandisci' },
  { name: 'close', glyph: 'x', label: 'Chiudi' },
];
/** Resize handles: four sides and four corners. */
export const WINDOW_EDGES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

/**
 * Window frame: title bar (icon, title, subtitle, controls), body and resize handles.
 * It only renders and reports intents; placing, dragging, resizing, focusing and closing are
 * up to the window manager that hosts it.
 *
 * Every control and every resize edge can be turned on and off on its own, at creation or later:
 *   new Window({ controls: { minimize: false }, resizable: ['e', 's', 'se'] })
 *   win.setControl('close', false); win.setResizable(false)
 *
 * Before closing on the user's request, the window manager asks canClose() if the window sets it
 * (e.g. to offer saving changes): return true / false, or a Promise of it.
 *
 * To be reopened later as it is (workareas save their windows), an app window sets getState():
 * it returns plain JSON data, given back to the app as `args` when the window is recreated.
 *   win.getState = () => ({ file: editor.fileId })
 *
 * Events (intents, emitted by the controls):
 *   'minimize' | 'maximize' | 'close'
 * Events (state):
 *   'title'     { title, subtitle }
 *   'controls'  { controls, resizable } — a control or the resize edges changed
 *   'launch'    args — the app was launched again while this window was open (see apps/launcher.js)
 *   'destroy'   the window is gone; listeners registered with `signal` are already removed
 */
export class Window extends Emitter {
  #abort = new AbortController();
  /** Optional: () => boolean | Promise<boolean>, asked before closing on the user's request. */
  canClose = null;
  /** Optional: () => JSON data to recreate the window with (passed back to the app as args). */
  getState = null;
  #controls = { minimize: true, maximize: true, close: true };
  #edges = new Set(WINDOW_EDGES);

  constructor({
    title = '', subtitle = '', icon: glyph = 'help',
    width = 640, height = 440, minWidth = 320, minHeight = 200, maxWidth = Infinity, maxHeight = Infinity,
    controls = {}, resizable = true,
    // Shorthands, same as controls.minimize / controls.maximize / controls.close
    minimizable, maximizable, closable,
  } = {}) {
    super();
    Object.assign(this, { glyph, minWidth, minHeight, maxWidth, maxHeight });

    this.titleText = h('span', { class: 'win-title-text' });
    this.subtitleText = h('em');
    this.controlBar = h('div', { class: 'win-controls' });
    this.titlebar = h('div', { class: 'win-titlebar' },
      h('div', { class: 'win-title' }, icon(glyph), this.titleText, this.subtitleText),
      this.controlBar);
    this.body = h('div', { class: 'win-body', dataset: { wheel: 'native' } });
    this.edgeLayer = h('div', { class: 'win-edges', 'aria-hidden': 'true' });
    this.el = h('section', { class: 'window', dataset: { kind: 'window' }, role: 'dialog' }, this.titlebar, this.body, this.edgeLayer);

    this.titlebar.addEventListener('dblclick', e => {
      if (this.#controls.maximize && !e.target.closest('button')) this.emit('maximize');
    });

    const given = { ...controls };
    if (minimizable !== undefined) given.minimize = minimizable;
    if (maximizable !== undefined) given.maximize = maximizable;
    if (closable !== undefined) given.close = closable;
    this.#applyControls(given);
    this.#applyResizable(resizable);
    this.setTitle(title, subtitle);
    this.resizeTo(width, height);
  }

  get title() { return this.titleText.textContent; }
  get subtitle() { return this.subtitleText.textContent.replace(/^ — /, ''); }

  /** Which controls are on: { minimize, maximize, close } (a copy). */
  get controls() { return { ...this.#controls }; }

  /** Resize edges that are on (empty array: not resizable). */
  get resizable() { return WINDOW_EDGES.filter(e => this.#edges.has(e)); }

  /** True while the window is in the page, visible and focused. */
  get active() {
    return this.el.isConnected && !this.el.hidden && !this.el.classList.contains('inactive');
  }

  /** Aborted on destroy: pass it to addEventListener in window content to clean up automatically. */
  get signal() { return this.#abort.signal; }

  setTitle(title, subtitle = '') {
    this.titleText.textContent = title;
    this.subtitleText.textContent = subtitle ? ` — ${subtitle}` : '';
    this.el.setAttribute('aria-label', subtitle ? `${title} — ${subtitle}` : title);
    this.emit('title', { title, subtitle });
  }

  /** Turn one control ('minimize' | 'maximize' | 'close') on or off. */
  setControl(name, enabled) {
    this.setControls({ [name]: enabled });
  }

  /** Turn several controls on or off: { minimize?, maximize?, close? }. */
  setControls(changes) {
    this.#applyControls(changes);
    this.emit('controls', { controls: this.controls, resizable: this.resizable });
  }

  /** true (all edges), false (none) or a list of edges, e.g. ['e', 's', 'se']. */
  setResizable(value) {
    this.#applyResizable(value);
    this.emit('controls', { controls: this.controls, resizable: this.resizable });
  }

  /** Position in world coordinates. */
  moveTo(x, y) {
    this.el.style.left = Math.round(x) + 'px';
    this.el.style.top = Math.round(y) + 'px';
  }

  /** Size within the window's min/max: { w, h }. */
  constrain(w, h) {
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
    return { w: clamp(w, this.minWidth, this.maxWidth), h: clamp(h, this.minHeight, this.maxHeight) };
  }

  resizeTo(w, h) {
    const size = this.constrain(w, h);
    this.el.style.width = Math.round(size.w) + 'px';
    this.el.style.height = Math.round(size.h) + 'px';
  }

  setActive(active) {
    this.el.classList.toggle('inactive', !active);
  }

  setMaximized(maximized) {
    this.el.classList.toggle('max', maximized);
    const btn = this.controlBar.querySelector('.win-maximize');
    if (btn) {
      const label = maximized ? 'Ripristina' : 'Ingrandisci';
      btn.title = label;
      btn.setAttribute('aria-label', label);
    }
  }

  /** Removes the element and every listener tied to `signal`. Called by the window manager. */
  destroy() {
    this.#abort.abort();
    this.el.remove();
    this.emit('destroy');
  }

  // ---------- Internals ----------

  #applyControls(changes) {
    for (const [name, on] of Object.entries(changes)) {
      if (Object.hasOwn(this.#controls, name)) this.#controls[name] = !!on;
    }
    const maximized = this.el.classList.contains('max');
    this.controlBar.replaceChildren(...CONTROLS.filter(c => this.#controls[c.name]).map(c => {
      const label = c.name === 'maximize' && maximized ? 'Ripristina' : c.label;
      return h('button', { class: `win-${c.name}`, type: 'button', title: label, 'aria-label': label, onclick: () => this.emit(c.name) }, icon(c.glyph));
    }));
  }

  #applyResizable(value) {
    const list = value === true ? WINDOW_EDGES : Array.isArray(value) ? value.filter(e => WINDOW_EDGES.includes(e)) : [];
    this.#edges = new Set(list);
    this.edgeLayer.replaceChildren(...this.resizable.map(edge => h('div', { class: `win-edge ${edge}`, dataset: { edge } })));
    this.el.classList.toggle('resizable', this.#edges.size > 0);
  }
}
