import { h } from '@lilos/sdk';

/**
 * Keeps a web page of the program (host.web) over its slot in a NetWave window.
 *
 * The program draws the page above the whole page of lilOS: lilOS cannot draw over it. So whenever
 * something of lilOS covers the slot (another window, a menu, a message box, the start menu…) the
 * page is hidden and a picture of it (cover()) takes its place until the slot is free again. Being
 * covered is found by asking the page of lilOS what is on top at points of the slot, every frame
 * where something may have changed (the DOM, the pointer, the keyboard, the size) and a few times a
 * second anyway (animations). Elements the size of the steps (24 × 40 px) or larger are always seen.
 * While covered, the picture is taken again every second, so a page that changes (it loads, plays)
 * does not look frozen behind a notification.
 *
 *   const live = new LiveView(slot, { win })   win: the Window the slot is in (its resize edges, 4 px
 *                                              inside it, stay free: the page is placed 4 px in)
 *   live.attach(page | null)   the page shown in the slot (null: nothing, e.g. the start page)
 *   live.hold = true           keep the page hidden (an error or a notice of NetWave in the slot)
 *   live.refresh()             check now
 *   live.dispose()
 */
const STEP_X = 40;
const STEP_Y = 24;
const views = new Set();
let frame = 0;
let observer = null;
let timer = 0;
// Something changed since the last check (else only the slot's place is looked at: animations)
let dirty = true;
const EVENTS = ['resize', 'scroll', 'wheel', 'pointerdown', 'pointerup', 'keydown', 'transitionend', 'animationend', 'focusin'];

function schedule(changed = true) {
  if (changed === true) dirty = true;
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    const full = dirty;
    dirty = false;
    for (const v of views) v.check(full);
  });
}

const onEvent = () => schedule();

function start() {
  if (observer) return;
  observer = new MutationObserver(() => schedule());
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'hidden', 'open'] });
  for (const type of EVENTS) addEventListener(type, onEvent, { capture: true, passive: true });
  timer = setInterval(() => schedule(false), 250);
}

function stop() {
  if (!observer || views.size) return;
  observer.disconnect();
  observer = null;
  for (const type of EVENTS) removeEventListener(type, onEvent, { capture: true });
  clearInterval(timer);
  cancelAnimationFrame(frame);
  frame = 0;
}

export class LiveView {
  page = null;
  hold = false;
  #slot;
  #win;
  #picture;
  #shown = false;
  #placed = '';
  #lastKey = '';
  #covered = false;
  #pictureAt = 0;
  #queue = Promise.resolve();

  constructor(slot, { win = null } = {}) {
    this.#slot = slot;
    this.#win = win;
    this.#picture = h('img', { class: 'nw-picture', alt: '', draggable: 'false', hidden: true });
    slot.prepend(this.#picture);
    views.add(this);
    start();
  }

  attach(page) {
    if (page === this.page) return;
    const old = this.page;
    this.page = page;
    this.#picture.hidden = true;
    this.#picture.removeAttribute('src');
    if (old && this.#shown) this.#run(() => old.place(null));
    this.#shown = false;
    this.#placed = '';
    this.#pictureAt = 0;
    this.refresh();
  }

  refresh() { this.#lastKey = ''; schedule(); }

  /** Where the page goes now; `full`: also look for what covers it. */
  check(full = true) {
    const page = this.page;
    if (!page || page.closed) return;
    const slot = this.#slot;
    const r = slot.getBoundingClientRect();
    const away = this.hold || !slot.isConnected || r.width < 4 || r.height < 4 || slot.closest('[hidden]');
    if (away) { this.#covered = false; return this.#hide(page, false); }
    const scale = slot.offsetWidth ? r.width / slot.offsetWidth : 1;
    // The window's resize edges reach 4 px into it (none when maximized): the page leaves them free
    const edge = this.#win && !this.#win.el.classList.contains('max') ? 4 * scale : 0;
    const place = { x: r.left + edge, y: r.top, width: Math.max(1, r.width - 2 * edge), height: Math.max(1, r.height - edge) };
    const key = `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)},${scale.toFixed(3)}`;
    if (!full && key === this.#lastKey) return this.#covered && this.#freshen(page);
    this.#lastKey = key;
    this.#covered = this.#isCovered(r);
    if (this.#covered) return this.#shown ? this.#hide(page, true) : this.#freshen(page);
    if (this.#shown && key === this.#placed) return;
    this.#shown = true;
    this.#placed = key;
    this.#run(() => page.place(place, scale));
  }

  /** Covered: a new picture of the page, at most once a second. */
  #freshen(page) {
    if (Date.now() - this.#pictureAt < 1000) return;
    this.#pictureAt = Date.now();
    this.#run(async () => {
      const url = await page.cover();
      if (url && this.page === page && !this.#shown) {
        this.#picture.src = url;
        this.#picture.hidden = false;
      }
    });
  }

  #hide(page, picture) {
    if (!this.#shown) return;
    this.#shown = false;
    this.#placed = '';
    if (!picture) {
      this.#run(() => page.place(null));
      return;
    }
    this.#pictureAt = Date.now();
    this.#run(async () => {
      const url = await page.cover();
      // Still the same page, still hidden: its picture in the slot
      if (url && this.page === page && !this.#shown) {
        this.#picture.src = url;
        this.#picture.hidden = false;
      }
    });
  }

  /** Is anything of lilOS above the slot? */
  #isCovered(r) {
    const slot = this.#slot;
    const x0 = Math.max(r.left + 2, 0), x1 = Math.min(r.right - 2, innerWidth - 1);
    const y0 = Math.max(r.top + 2, 0), y1 = Math.min(r.bottom - 2, innerHeight - 1);
    if (x1 <= x0 || y1 <= y0) return false;
    const nx = Math.max(1, Math.ceil((x1 - x0) / STEP_X)), ny = Math.max(1, Math.ceil((y1 - y0) / STEP_Y));
    for (let j = 0; j <= ny; j++) {
      const y = y0 + ((y1 - y0) * j) / ny;
      for (let i = 0; i <= nx; i++) {
        const el = document.elementFromPoint(x0 + ((x1 - x0) * i) / nx, y);
        if (el && !slot.contains(el) && !this.#ownEdge(el)) return true;
      }
    }
    return false;
  }

  /** One of the resize edges of the slot's own window (they are not above the page: it leaves them free). */
  #ownEdge(el) {
    const edges = el.closest('.win-edges');
    return !!edges && !!this.#win?.el.contains(edges);
  }

  /** The program's calls in order (a picture taken after the page was moved, not before). */
  #run(fn) {
    this.#queue = this.#queue.then(fn).catch(() => {});
    return this.#queue;
  }

  dispose() {
    views.delete(this);
    stop();
    this.page = null;
  }
}
