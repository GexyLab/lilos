import { Emitter, h, icon } from '@lilos/sdk';
import './TabBar.css';

/**
 * A bar of tabs (Editor's documents, Terminal's sessions). Only shows them and reports what the
 * user asks; the app decides.
 *   new TabBar({ t, signal, label, newLabel, newButton = true, reorder = true, dragStart, className })
 *     t          the app's t (its locales have the shared.tabs.* strings)
 *     signal     an AbortSignal: its listeners go when it aborts
 *     label      the name of the list for assistive technologies («Open documents»)
 *     newLabel   the tooltip of the + button (default «New tab»); newButton false: no + button
 *     reorder    dragging a tab moves it inside the bar ('move' event)
 *     dragStart  (pointerdown event, key) → void: the app drags the tab itself (Terminal: to other
 *                panes and windows); takes the place of `reorder`
 *     className  more classes for the bar
 *   render([{ key, label, title?, detail?, dirty?, icon?, activity?, class?, closeLabel?, closeTitle? }], activeKey)
 *     icon       a glyph name of the SDK or an element (Terminal's protocol badge), before the name
 *     detail     a dim word after the name (the folder of a file with the same name as another)
 *     dirty      unsaved changes: a dot in place of the ×, which comes back under the pointer
 *     activity   something happened in a tab not shown: a dot (a string is its tooltip)
 *     class      more classes for the tab (Terminal: 'lost', 'remote')
 *   setSlots({ start, end })   elements before the tabs and at the right end of the bar (its own buttons)
 *   focus()                     the keyboard focus on the active tab
 *
 * Mouse: click selects, middle click closes, drag moves, double click on the free space opens a
 * new tab, the wheel scrolls. Keyboard (tablist): ← → Home End select, Delete closes, the menu key
 * or Shift F10 opens the menu, Enter or Space select.
 *
 * Events: 'select' key · 'close' key · 'new' · 'menu' { key, x, y } · 'move' { key, index }
 */
export class TabBar extends Emitter {
  #t;
  #tabs = new Map();      // key → element
  #items = new Map();     // key → the item drawn
  #order = [];
  #active = null;
  #drag = null;           // { key, el, startX, moved, index }
  #reorder;
  #dragStart;

  constructor({ t, signal, label = '', newLabel = null, newButton = true, reorder = true, dragStart = null, className = '' } = {}) {
    super();
    this.#t = t;
    this.#reorder = reorder;
    this.#dragStart = dragStart;
    this.list = h('div', { class: 'sh-tabs', role: 'tablist', 'aria-label': label || null });
    this.start = h('div', { class: 'sh-tabbar-slot' });
    this.end = h('div', { class: 'sh-tabbar-slot end' });
    const name = newLabel ?? t('shared.tabs.new');
    this.newButton = newButton ? h('button', { class: 'sh-tabbar-btn sh-tab-new', type: 'button', title: name, 'aria-label': name, onclick: () => this.emit('new') }, icon('plus')) : null;
    this.el = h('div', { class: ['sh-tabbar', className].filter(Boolean).join(' ') }, this.start, this.list, this.newButton, this.end);
    this.start.hidden = this.end.hidden = true;

    this.list.addEventListener('pointerdown', e => this.#onPointerDown(e), { signal });
    this.list.addEventListener('auxclick', e => {
      const tab = e.target.closest('.sh-tab');
      if (e.button === 1 && tab) { e.preventDefault(); this.emit('close', tab.dataset.key); }
    }, { signal });
    // A middle click must not start the browser's autoscroll
    this.list.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); }, { signal });
    // The free space: after the tabs, or around the + button
    this.el.addEventListener('dblclick', e => { if (e.target === this.list || e.target === this.el) this.emit('new'); }, { signal });
    this.list.addEventListener('contextmenu', e => {
      const tab = e.target.closest('.sh-tab');
      if (!tab) return;
      e.preventDefault();
      this.emit('menu', { key: tab.dataset.key, x: e.clientX, y: e.clientY });
    }, { signal });
    this.list.addEventListener('wheel', e => {
      if (!e.deltaY || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      this.list.scrollLeft += e.deltaY;
    }, { signal, passive: false });
    this.list.addEventListener('keydown', e => this.#onKey(e), { signal });
    // A narrower window: the active tab stays in view
    const fit = new ResizeObserver(() => this.#reveal());
    fit.observe(this.list);
    signal?.addEventListener('abort', () => fit.disconnect());
  }

  render(items, activeKey) {
    const keys = items.map(it => it.key);
    for (const [key, el] of this.#tabs) {
      if (!keys.includes(key)) { el.remove(); this.#tabs.delete(key); this.#items.delete(key); }
    }
    for (const it of items) {
      let el = this.#tabs.get(it.key);
      if (!el) {
        el = this.#create(it.key);
        this.#tabs.set(it.key, el);
      }
      this.#update(el, it, this.#items.get(it.key), it.key === activeKey);
      this.#items.set(it.key, it);
    }
    if (keys.join('\n') !== this.#order.join('\n')) {
      this.list.append(...keys.map(k => this.#tabs.get(k)));
      this.#order = keys;
    }
    if (activeKey !== this.#active) {
      this.#active = activeKey;
      this.#reveal();
    }
  }

  /** The bar's own elements: `start` before the tabs, `end` at its right end (null or [] for none). */
  setSlots({ start, end } = {}) {
    if (start !== undefined) { this.start.replaceChildren(...[start ?? []].flat().filter(Boolean)); this.start.hidden = !this.start.childElementCount; }
    if (end !== undefined) { this.end.replaceChildren(...[end ?? []].flat().filter(Boolean)); this.end.hidden = !this.end.childElementCount; }
  }

  /** Puts the keyboard focus on the active tab. */
  focus() {
    this.#tabs.get(this.#active)?.focus({ preventScroll: true });
  }

  /** The element of a tab (the app may need its place, e.g. to drop on it). */
  tabElement(key) {
    return this.#tabs.get(key) ?? null;
  }

  /** Scrolls the list (only the list: not the windows around it) to show the active tab. */
  #reveal() {
    const el = this.#tabs.get(this.#active);
    if (!el) return;
    const { offsetLeft: left, offsetWidth: width } = el;
    if (left < this.list.scrollLeft) this.list.scrollLeft = left;
    else if (left + width > this.list.scrollLeft + this.list.clientWidth) this.list.scrollLeft = left + width - this.list.clientWidth;
  }

  #create(key) {
    const close = h('button', { class: 'sh-tab-close', type: 'button', tabindex: '-1' }, icon('x'));
    close.addEventListener('click', e => { e.stopPropagation(); this.emit('close', key); });
    close.addEventListener('pointerdown', e => e.stopPropagation());
    return h('div', { class: 'sh-tab', role: 'tab', dataset: { key } },
      h('span', { class: 'sh-tab-icon', hidden: true }), h('span', { class: 'sh-tab-name' }), h('span', { class: 'sh-tab-detail', hidden: true }),
      h('span', { class: 'sh-tab-act', hidden: true }), close);
  }

  #update(el, it, before, on) {
    el.className = ['sh-tab', on && 'on', it.dirty && 'dirty', it.class, el.classList.contains('dragging') && 'dragging'].filter(Boolean).join(' ');
    el.setAttribute('aria-selected', String(on));
    el.tabIndex = on ? 0 : -1;
    el.title = it.title ?? it.label;
    const [glyph, name, detail, act, close] = el.children;
    if (it.icon !== before?.icon) {
      glyph.replaceChildren(...(it.icon == null ? [] : [typeof it.icon === 'string' ? icon(it.icon) : it.icon]));
      glyph.hidden = it.icon == null;
    }
    if (name.textContent !== it.label) name.textContent = it.label;
    detail.textContent = it.detail ?? '';
    detail.hidden = !it.detail;
    act.hidden = !it.activity;
    act.title = typeof it.activity === 'string' ? it.activity : '';
    const label = it.closeLabel ?? this.#t('shared.tabs.close', { name: it.label });
    const title = it.closeTitle ?? label;
    if (close.getAttribute('aria-label') !== label) close.setAttribute('aria-label', label);
    if (close.title !== title) close.title = title;
  }

  #onKey(e) {
    const tab = e.target.closest?.('.sh-tab');
    if (!tab) return;
    const i = this.#order.indexOf(tab.dataset.key);
    const to = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: this.#order.length - 1 }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      const key = this.#order[Math.max(0, Math.min(this.#order.length - 1, to))];
      this.emit('select', key);
      this.#tabs.get(key)?.focus({ preventScroll: true });
    } else if (e.key === 'Delete') {
      e.preventDefault();
      this.emit('close', tab.dataset.key);
    } else if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
      e.preventDefault();
      const r = tab.getBoundingClientRect();
      this.emit('menu', { key: tab.dataset.key, x: r.left, y: r.bottom + 2 });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.emit('select', tab.dataset.key);
    }
  }

  // ---------- Selecting and moving with the mouse ----------

  #onPointerDown(e) {
    const tab = e.target.closest('.sh-tab');
    if (!tab || e.button !== 0) return;
    const key = tab.dataset.key;
    this.emit('select', key);
    if (this.#dragStart) return this.#dragStart(e, key);
    if (!this.#reorder) return;
    this.#drag = { key, el: tab, startX: e.clientX, moved: false, index: this.#order.indexOf(key) };
    // On the window, not with a pointer capture on the tab: moving it among the others takes it
    // out of the page for a moment, and that ends a capture
    const move = ev => { if (ev.pointerId === e.pointerId) this.#dragMove(ev); };
    const end = ev => {
      if (ev.pointerId !== e.pointerId) return;
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', end);
      removeEventListener('pointercancel', end);
      this.#dragEnd();
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);
  }

  #dragMove(e) {
    const d = this.#drag;
    if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.startX) < 5) return;
    d.moved = true;
    d.el.classList.add('dragging');
    // The place among the other tabs: before the first one whose middle is right of the pointer
    const others = this.#order.filter(k => k !== d.key).map(k => this.#tabs.get(k));
    let index = others.findIndex(el => {
      const r = el.getBoundingClientRect();
      return e.clientX < r.left + r.width / 2;
    });
    if (index === -1) index = others.length;
    if (index !== d.index) {
      d.index = index;
      this.list.insertBefore(d.el, others[index] ?? null);
    }
    // Near the edges the list scrolls
    const box = this.list.getBoundingClientRect();
    if (e.clientX < box.left + 16) this.list.scrollLeft -= 8;
    else if (e.clientX > box.right - 16) this.list.scrollLeft += 8;
  }

  #dragEnd() {
    const d = this.#drag;
    this.#drag = null;
    if (!d?.moved) return;
    d.el.classList.remove('dragging');
    // Back in the order known until the app renders the new one
    this.list.append(...this.#order.map(k => this.#tabs.get(k)));
    if (d.index !== this.#order.indexOf(d.key)) this.emit('move', { key: d.key, index: d.index });
  }
}
