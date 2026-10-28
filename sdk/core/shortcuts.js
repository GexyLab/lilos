import { isEditing } from './dom.js';
import { Emitter } from './events.js';
import { storage } from './storage.js';

/**
 * Keyboard shortcuts. Components register commands with default key combinations; the user can
 * change them (persisted under 'lilos:shortcuts', only the customized ones). One keydown
 * listener on window runs the matching command.
 *
 * Combos are canonical strings: modifiers in the order Ctrl, Alt, Shift, then the key:
 * 'Ctrl+K', 'Shift+1', 'Ctrl+Plus', 'F2', 'Delete'. Cmd on Mac counts as Ctrl.
 *
 * Events: 'change' { id, keys }
 */

const STORAGE_KEY = 'shortcuts';

const SYMBOLS = {
  '+': 'Plus', '-': 'Minus', '=': 'Equal', ',': 'Comma', '.': 'Period', '/': 'Slash', '\\': 'Backslash',
  ';': 'Semicolon', "'": 'Quote', '`': 'Backquote', '[': 'BracketLeft', ']': 'BracketRight',
};
const NAMED = new Set([
  'Enter', 'Escape', 'Delete', 'Backspace', 'Tab', 'Space', 'Insert', 'Home', 'End', 'PageUp', 'PageDown',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ...Array.from({ length: 24 }, (_, i) => `F${i + 1}`),
]);
const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'OS']);

/** Taken by the browser before the page sees them: cannot be assigned. */
const RESERVED = new Set(['Ctrl+W', 'Ctrl+T', 'Ctrl+N', 'Ctrl+Shift+N', 'Ctrl+Shift+T', 'Ctrl+Shift+W', 'Ctrl+Tab', 'Ctrl+Shift+Tab', 'Alt+F4']);

const LABELS = {
  Plus: '+', Minus: '−', Equal: '=', Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Semicolon: ';',
  Quote: "'", Backquote: '`', BracketLeft: '[', BracketRight: ']',
  Enter: 'Invio', Escape: 'Esc', Delete: 'Canc', Space: 'Spazio', Insert: 'Ins', End: 'Fine',
  PageUp: 'Pag ↑', PageDown: 'Pag ↓', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
};

/** Elements that own plain (unmodified) keys while focused. */
const INTERACTIVE = 'button, a[href], select, input, textarea, [contenteditable], [role="tab"], [role="radio"], [role="switch"], [role="option"]';

function keyName(e) {
  if (MODIFIER_KEYS.has(e.key)) return null;
  const digit = /^Digit(\d)$/.exec(e.code);
  if (digit) return digit[1];
  const letter = /^Key([A-Z])$/.exec(e.code);
  if (/^[a-z]$/i.test(e.key) && !e.altKey) return e.key.toUpperCase();
  if (letter) return letter[1];              // non-Latin layouts, Alt+letter on Mac
  if (e.key === ' ') return 'Space';
  if (NAMED.has(e.key)) return e.key;
  if (SYMBOLS[e.key]) return SYMBOLS[e.key];
  if (/^\d$/.test(e.key)) return e.key;      // numpad
  if (e.key.length === 1) return e.key.toUpperCase();
  return null;
}

/** Canonical combo for a keydown event, or null for a modifier alone. */
export function comboFromEvent(e) {
  const key = keyName(e);
  if (!key) return null;
  const printableSymbol = !NAMED.has(key) && !/^[A-Z0-9]$/.test(key);
  const mods = [];
  if (e.ctrlKey || e.metaKey) mods.push('Ctrl');
  if (e.altKey) mods.push('Alt');
  // Shift is part of the character for symbols ('+' is Shift+= on many layouts): ignore it there
  if (e.shiftKey && !printableSymbol) mods.push('Shift');
  return [...mods, key].join('+');
}

function parse(combo) {
  const parts = String(combo).split('+');
  const key = parts.pop();
  return { ctrl: parts.includes('Ctrl'), alt: parts.includes('Alt'), shift: parts.includes('Shift'), key, parts };
}

/** True if the string is a well-formed canonical combo. */
function isCombo(combo) {
  if (typeof combo !== 'string' || !combo) return false;
  const { parts, key } = parse(combo);
  const order = ['Ctrl', 'Alt', 'Shift'];
  return !!key && !order.includes(key) && parts.every((p, i) => order.includes(p) && (i === 0 || order.indexOf(p) > order.indexOf(parts[i - 1])));
}

class Shortcuts extends Emitter {
  #commands = new Map();
  #custom = {};

  constructor() {
    super();
    const saved = storage.get(STORAGE_KEY, {});
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      for (const [id, keys] of Object.entries(saved)) {
        if (Array.isArray(keys) && keys.every(isCombo)) this.#custom[id] = [...new Set(keys)];
      }
    }
    addEventListener('keydown', e => this.#dispatch(e));
  }

  /**
   * Register a command. Returns a function that unregisters it.
   *   id           stable, e.g. 'desk.fit'
   *   label        shown in Settings, e.g. 'Mostra tutto'
   *   group        heading in Settings, e.g. 'Scrivania'
   *   keys         default combos
   *   run(event)   the action
   *   when()       optional: the command is active only while it returns true
   *   whenEditing  also runs while typing in a field (needs Ctrl or Alt)
   *   repeat       runs again while the key is held down
   */
  register({ id, label, group = 'Generale', keys = [], run, when = null, whenEditing = false, repeat = false }) {
    if (this.#commands.has(id)) throw new Error(`Scorciatoia già registrata: ${id}`);
    this.#commands.set(id, { id, label, group, defaults: [...keys], run, when, whenEditing, repeat });
    // Stored combos are untrusted: drop them if any is not valid for this command
    if (Object.hasOwn(this.#custom, id) && this.#custom[id].some(k => this.validate(k, id))) delete this.#custom[id];
    this.emit('change', { id, keys: this.get(id) });
    return () => {
      this.#commands.delete(id);
      this.emit('change', { id, keys: [] });
    };
  }

  /** Registered commands, in registration order, with their current keys. */
  list() {
    return [...this.#commands.values()].map(c => ({
      id: c.id, label: c.label, group: c.group, whenEditing: c.whenEditing,
      keys: this.get(c.id), defaults: [...c.defaults], custom: Object.hasOwn(this.#custom, c.id),
    }));
  }

  /** Current combos of a command. */
  get(id) {
    if (Object.hasOwn(this.#custom, id)) return [...this.#custom[id]];
    return [...(this.#commands.get(id)?.defaults ?? [])];
  }

  /** Replace the combos of a command. Throws if one is invalid (see validate()). */
  set(id, keys) {
    const cmd = this.#commands.get(id);
    if (!cmd) throw new Error(`Scorciatoia non registrata: ${id}`);
    const unique = [...new Set(keys)];
    for (const k of unique) {
      const error = isCombo(k) ? this.validate(k, id) : 'Combinazione non valida';
      if (error) throw new Error(error);
    }
    const same = unique.length === cmd.defaults.length && unique.every((k, i) => k === cmd.defaults[i]);
    if (same) delete this.#custom[id];
    else this.#custom[id] = unique;
    this.#save();
    this.emit('change', { id, keys: this.get(id) });
  }

  reset(id) {
    if (!Object.hasOwn(this.#custom, id)) return;
    delete this.#custom[id];
    this.#save();
    this.emit('change', { id, keys: this.get(id) });
  }

  resetAll() {
    for (const id of Object.keys(this.#custom)) this.reset(id);
  }

  /** The command (other than `exceptId`) that uses this combo, if any. */
  owner(combo, exceptId = null) {
    for (const c of this.#commands.values()) {
      if (c.id !== exceptId && this.get(c.id).includes(combo)) return { id: c.id, label: c.label };
    }
    return null;
  }

  /** Why a combo cannot be assigned to the command, or null if it can. */
  validate(combo, id = null) {
    const { ctrl, alt, shift, key } = parse(combo);
    if (!key) return 'Premi anche un tasto oltre a Ctrl, Alt o Shift';
    if (RESERVED.has(combo)) return 'Combinazione riservata dal browser';
    const strong = ctrl || alt;
    if (!strong && (key === 'Tab' || key === 'Space')) return 'Tab e Spazio da soli servono per muoversi e per spostare la scrivania';
    if (!strong && !shift && !NAMED.has(key)) return 'Un tasto che scrive va usato con Ctrl, Alt o Shift';
    if (!strong && this.#commands.get(id)?.whenEditing) return 'Questa scorciatoia funziona anche mentre scrivi: serve Ctrl o Alt';
    return null;
  }

  /** True if the event matches one of the command's combos. */
  matches(event, id) {
    const combo = comboFromEvent(event);
    return !!combo && this.get(id).includes(combo);
  }

  /** First combo of a command, formatted for labels ('Ctrl K'), or ''. */
  label(id) {
    const [first] = this.get(id);
    return first ? this.format(first) : '';
  }

  /** 'Ctrl+Plus' → 'Ctrl +' */
  format(combo) {
    return this.parts(combo).join(' ');
  }

  /** 'Ctrl+Plus' → ['Ctrl', '+'], one entry per key cap. */
  parts(combo) {
    const { parts, key } = parse(combo);
    return [...parts, key].map(p => LABELS[p] ?? p);
  }

  /**
   * Capture the next key combination instead of running commands (for editors).
   *   onCombo(combo)   a complete combination was pressed
   *   onPreview(text)  modifiers currently held, e.g. 'Ctrl Shift'
   *   onCancel()       Esc was pressed
   * Returns stop().
   */
  record({ onCombo, onPreview, onCancel }) {
    const held = e => [e.ctrlKey || e.metaKey ? 'Ctrl' : '', e.altKey ? 'Alt' : '', e.shiftKey ? 'Shift' : ''].filter(Boolean).join(' ');
    const down = e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      if (e.key === 'Escape' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) return onCancel?.();
      const combo = comboFromEvent(e);
      if (combo) onCombo?.(combo);
      else onPreview?.(held(e));
    };
    const up = e => {
      e.stopImmediatePropagation();
      onPreview?.(held(e));
    };
    addEventListener('keydown', down, true);
    addEventListener('keyup', up, true);
    return () => {
      removeEventListener('keydown', down, true);
      removeEventListener('keyup', up, true);
    };
  }

  // ---------- Internals ----------

  #dispatch(e) {
    const combo = comboFromEvent(e);
    if (!combo) return;
    const editing = isEditing();
    const plain = !(e.ctrlKey || e.metaKey || e.altKey);
    // A focused control owns plain keys (Enter on a button, Esc in a field…)
    if (plain && e.target instanceof Element && e.target.closest(INTERACTIVE)) return;
    for (const cmd of this.#commands.values()) {
      if (!this.get(cmd.id).includes(combo)) continue;
      if (editing && !cmd.whenEditing) continue;
      if (cmd.when && !cmd.when()) continue;
      e.preventDefault();
      if (e.repeat && !cmd.repeat) return;
      cmd.run(e);
      return;
    }
  }

  #save() {
    storage.set(STORAGE_KEY, this.#custom);
  }
}

export const shortcuts = new Shortcuts();
