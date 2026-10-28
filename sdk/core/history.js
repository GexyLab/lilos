import { Emitter } from './events.js';
import { isEditing } from './dom.js';

const LIMIT = 100;

/**
 * Undo / redo history of one place (the desk, a window, a panel). An entry describes an action
 * already done and how to take it back and do it again; undo and redo may be asynchronous.
 *
 *   const stack = new UndoStack();
 *   fs.rename(id, 'b.txt');
 *   stack.push({ label: 'Rinomina «b.txt»', undo: () => fs.rename(id, 'a.txt'), redo: () => fs.rename(id, 'b.txt') });
 *
 *   // or: run it and record it in one go
 *   await stack.run({ label: 'Rinomina', do: () => fs.rename(id, 'b.txt'), undo: () => fs.rename(id, 'a.txt') });
 *
 * If an undo or a redo throws (what it acted on is gone), the entry is dropped and 'error' is
 * emitted: the history never gets stuck. A new push clears what could be redone.
 *
 * Events: 'change' (after every push, undo, redo, clear) · 'error' { entry, error }
 */
export class UndoStack extends Emitter {
  #done = [];
  #undone = [];
  #busy = false;

  constructor({ limit = LIMIT } = {}) {
    super();
    this.limit = limit;
  }

  get canUndo() { return !this.#busy && this.#done.length > 0; }
  get canRedo() { return !this.#busy && this.#undone.length > 0; }
  /** Label of what undo / redo would act on ('' if nothing). */
  get undoLabel() { return this.#done.at(-1)?.label ?? ''; }
  get redoLabel() { return this.#undone.at(-1)?.label ?? ''; }

  /** Records an action already done: { label, undo(), redo() }. */
  push({ label = '', undo, redo }) {
    if (typeof undo !== 'function' || typeof redo !== 'function') throw new Error('Una voce della cronologia vuole undo e redo');
    this.#done.push({ label: String(label), undo, redo });
    if (this.#done.length > this.limit) this.#done.shift();
    this.#undone = [];
    this.emit('change');
  }

  /** Does the action ({ label, do, undo }) and records it; resolves with what do() returned. */
  async run({ label, do: act, undo }) {
    const result = await act();
    this.push({ label, undo, redo: act });
    return result;
  }

  /** Takes back the last action. Resolves with its label, or null if there was nothing (or it failed). */
  undo() {
    return this.#step(this.#done, this.#undone, 'undo');
  }

  redo() {
    return this.#step(this.#undone, this.#done, 'redo');
  }

  clear() {
    this.#done = [];
    this.#undone = [];
    this.emit('change');
  }

  async #step(from, to, what) {
    if (this.#busy || !from.length) return null;
    const entry = from.pop();
    this.#busy = true;
    try {
      await entry[what]();
      to.push(entry);
      return entry.label;
    } catch (error) {
      this.emit('error', { entry, error });
      return null;
    } finally {
      this.#busy = false;
      this.emit('change');
    }
  }
}

/**
 * The central undo / redo: Ctrl Z and Ctrl Y act on the history of whoever has the focus.
 * A place attaches a handler to its element; the handler of the nearest element around the focus
 * wins. With nothing focused, the active window counts (setContext); with no active window, the
 * root handler (the desk).
 *
 *   const off = history.attach(win.body, stack);            // an UndoStack
 *   history.attach(textarea, { text: true, undo, redo });    // or any handler
 *
 * Handler: { undo(), redo(), canUndo?, canRedo?, undoLabel?, redoLabel?, text? }.
 * Inside text fields the browser's own undo is left alone, unless the handler attached around the
 * field says `text: true` (it takes care of the text itself).
 *
 * Events: 'undo' | 'redo' { label, handler } — after a step went through ·
 *         'error' { entry, error } — an UndoStack attached here dropped an entry it could not undo
 */
class History extends Emitter {
  #handlers = new WeakMap();   // element → handler
  #root = null;
  #context = () => null;

  /** Attaches a handler to an element; returns the function that detaches it. */
  attach(el, handler) {
    this.#handlers.set(el, handler);
    const off = this.#forwardErrors(handler);
    return () => {
      off();
      if (this.#handlers.get(el) === handler) this.#handlers.delete(el);
    };
  }

  #offRoot = () => {};

  /** Handler used when no window is active (the desk). */
  setRoot(handler) {
    this.#offRoot();
    this.#root = handler;
    this.#offRoot = this.#forwardErrors(handler);
  }

  #forwardErrors(handler) {
    return typeof handler?.on === 'function' ? handler.on('error', e => this.emit('error', e)) : () => {};
  }

  /** () → element of the active window, or null: where to look when the focus is on nothing. */
  setContext(fn) {
    this.#context = fn;
  }

  /** The handler Ctrl Z would act on now, or null. */
  resolve() {
    const focus = document.activeElement;
    const context = this.#context();
    const start = focus && focus !== document.body ? focus : context;
    for (let el = start; el; el = el.parentElement) {
      const handler = this.#handlers.get(el);
      if (handler) return handler;
    }
    // A window has the focus but keeps no history: nothing to do (not the desk behind it)
    if (context || start?.closest?.('.window')) return null;
    return this.#root;
  }

  /** True when Ctrl Z belongs to us now (and not to the browser's text undo). */
  handles(what = 'undo') {
    const handler = this.resolve();
    if (!handler || (isEditing() && !handler.text)) return false;
    const can = what === 'undo' ? handler.canUndo : handler.canRedo;
    return can === undefined ? true : !!can;
  }

  /** Undo on whoever has the focus; resolves with the label of what was undone, or null. */
  undo() {
    return this.#step('undo', this.resolve());
  }

  redo() {
    return this.#step('redo', this.resolve());
  }

  /** Undo / redo on a given handler (a menu entry acting on the desk, a button in a window). */
  undoOn(handler) {
    return this.#step('undo', handler);
  }

  redoOn(handler) {
    return this.#step('redo', handler);
  }

  async #step(what, handler) {
    if (!handler) return null;
    const label = await handler[what]();
    if (label !== null && label !== false) this.emit(what, { label: typeof label === 'string' ? label : '', handler });
    return label ?? null;
  }
}

export const history = new History();
