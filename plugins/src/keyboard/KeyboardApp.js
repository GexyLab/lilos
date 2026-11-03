import { Window, h, storage } from '@lilos/sdk';
import * as system from '@lilos/system';   // `sendKey`: missing in older lilOS, so not imported by name
import { LAYOUTS, layoutFor, place } from './layouts.js';
import { i18n, t } from './i18n.js';
import './keyboard.css';

/**
 * Tastiera a schermo: a keyboard to type with the mouse or a finger. Its window never takes the
 * focus (the field where the user writes keeps it) and stays above the others; every key goes to
 * that field through lilOS's sendKey, as a real key would.
 *
 * Shift, Ctrl, Alt and AltGr hold for the next key; pressed twice they stay on until pressed again.
 * Keys held down repeat. Keys pressed on the real keyboard light up here.
 */
const LAYOUT_KEY = 'keyboard:layout';
const MODS = { ShiftLeft: 'shift', ShiftRight: 'shift', ControlLeft: 'ctrl', AltLeft: 'alt', AltRight: 'altGr' };
const DOUBLE_TAP = 400;
const REPEAT_DELAY = 450, REPEAT_EVERY = 45;

/** What the keys without characters show and send. */
const FN = {
  Backspace: { text: '⌫', send: 'Backspace' },
  Tab: { text: '⇥', send: 'Tab' },
  CapsLock: { text: '⇪' },
  Enter: { text: '↵', send: 'Enter' },
  ShiftLeft: { text: '⇧' }, ShiftRight: { text: '⇧' },
  ControlLeft: { label: 'key.ctrl' },
  AltLeft: { text: 'Alt' }, AltRight: { text: 'AltGr' },
  Escape: { text: 'Esc', send: 'Escape' },
  Delete: { label: 'key.delete', send: 'Delete' },
  Space: { send: ' ' },
  ArrowLeft: { text: '←', send: 'ArrowLeft' }, ArrowRight: { text: '→', send: 'ArrowRight' },
  ArrowUp: { text: '↑', send: 'ArrowUp' }, ArrowDown: { text: '↓', send: 'ArrowDown' },
  Layout: {},
};

const isLetter = key => key.normal !== key.shift && key.normal.toUpperCase() === key.shift;

export default function createKeyboard() {
  const win = new Window({
    title: t('title'), icon: 'keyboard', width: 780, height: 290, minWidth: 420, minHeight: 170,
    maximizable: false, focusable: false, onTop: true,
  });
  let layoutId = LAYOUTS[storage.get(LAYOUT_KEY)] ? storage.get(LAYOUT_KEY) : layoutFor(i18n.lang);
  const mods = { shift: 0, ctrl: 0, alt: 0, altGr: 0 };   // 0 off, 1 for the next key, 2 on until pressed again
  let caps = false;
  let lastTap = { mod: null, at: 0 };
  let repeat = null;
  const keyOf = new Map();   // button → its key

  const keysEl = h('div', { class: 'osk-keys', role: 'group' });
  const root = h('div', { class: 'osk' }, keysEl);
  win.body.append(root);

  if (typeof system.sendKey !== 'function') {
    root.replaceChildren(h('p', { class: 'osk-old' }, t('needsNewer')));
    return win;
  }

  const layout = () => LAYOUTS[layoutId];

  function draw() {
    keysEl.setAttribute('aria-label', t('title'));
    keyOf.clear();
    keysEl.replaceChildren(...place(layout()).map(({ key, x, y, w, h: hgt }) => {
      const el = h('button', {
        type: 'button', tabindex: '-1', class: `osk-key ${key.fn ? `fn fn-${key.fn}` : 'char'}`,
        dataset: { code: key.code },
        style: `grid-column: ${x * 4 + 1} / span ${w * 4}; grid-row: ${y * 2 + 1} / span ${hgt * 2}`,
      });
      keyOf.set(el, key);
      el.addEventListener('pointerdown', e => down(e, key, el));
      // Assistive technologies click without pressing
      el.addEventListener('click', e => { if (e.detail === 0) press(key); });
      return el;
    }));
    paint();
  }

  /** The labels and lit modifiers, for the state of the modifiers. */
  function paint() {
    const l = layout();
    const altGr = !!mods.altGr && l.altGr;
    root.classList.toggle('shifted', !!mods.shift);
    for (const el of keysEl.children) {
      const key = keyOf.get(el);
      if (!key) continue;
      if (key.fn) {
        paintFn(el, key, l);
        continue;
      }
      const typed = charOf(key);
      // A key that writes nothing with AltGr still shows its letter, faint, to find the others
      const parts = [h('span', { class: 'main' }, typed ?? plainOf(key))];
      if (!altGr && !isLetter(key) && !mods.shift && key.shift !== key.normal) parts.push(h('span', { class: 'sub shift' }, key.shift));
      if (l.altGr && !altGr && key.altGr) parts.push(h('span', { class: 'sub altgr' }, key.altGr));
      el.replaceChildren(...parts);
      el.classList.toggle('dead', altGr && typed == null);
      el.setAttribute('aria-label', typed ?? key.normal);
    }
  }

  function paintFn(el, key, l) {
    const def = FN[key.fn];
    const name = key.fn === 'AltRight' && !l.altGr ? 'AltLeft' : key.fn;
    const mod = MODS[name] && mods[MODS[name]];
    let text = def.label ? t(def.label) : def.text ?? '';
    if (key.fn === 'AltRight' && !l.altGr) text = 'Alt';
    if (key.fn === 'Layout') text = l.short;
    if (key.fn === 'Space') text = t(`layout.${layoutId}`);
    el.replaceChildren(h('span', { class: 'main' }, text));
    el.classList.toggle('on', !!mod || (key.fn === 'CapsLock' && caps));
    el.classList.toggle('locked', mod === 2 || (key.fn === 'CapsLock' && caps));
    const label = key.fn === 'Layout' ? t('key.layout', { name: t(`layout.${layoutId}`) }) : t(`key.${key.fn}`);
    el.setAttribute('aria-label', label);
    el.title = label;
    if (MODS[name] || key.fn === 'CapsLock') el.setAttribute('aria-pressed', String(!!mod || (key.fn === 'CapsLock' && caps)));
  }

  /** The character a key writes now (null: none, e.g. AltGr on a key without a third character). */
  function charOf(key) {
    if (mods.altGr && layout().altGr) return (mods.shift ? key.altGrShift : key.altGr) ?? null;
    return plainOf(key);
  }

  /** The key's character with Shift and Caps Lock only. */
  function plainOf(key) {
    const shift = !!mods.shift;
    return (isLetter(key) ? shift !== caps : shift) ? key.shift : key.normal;
  }

  function press(key) {
    if (key.fn === 'Layout') return switchLayout();
    if (key.fn === 'CapsLock') {
      caps = !caps;
      return paint();
    }
    const fnMod = MODS[key.fn === 'AltRight' && !layout().altGr ? 'AltLeft' : key.fn];
    if (fnMod) return tapMod(fnMod);

    const ctrl = !!mods.ctrl, alt = !!mods.alt, shift = !!mods.shift;
    const altGr = !!mods.altGr && layout().altGr;
    if (key.fn) {
      const send = FN[key.fn].send;
      system.sendKey({ key: send, code: key.code, text: send === ' ' ? ' ' : undefined, ctrl, alt, shift });
    } else if (altGr) {
      const text = charOf(key);
      system.sendKey({ key: text ?? key.normal, code: key.code, text: text ?? undefined, shift, altGraph: true });
    } else if (ctrl || alt) {
      // A shortcut: the key without writing (Ctrl+S, Ctrl+Shift+Z…)
      system.sendKey({ key: plainOf(key), code: key.code, ctrl, alt, shift });
    } else {
      const text = charOf(key);
      system.sendKey({ key: text, code: key.code, text, shift });
    }
    release();
  }

  /** A modifier: once for the next key, twice in a row to keep it on. */
  function tapMod(mod) {
    const now = performance.now();
    if (mods[mod] === 1 && lastTap.mod === mod && now - lastTap.at < DOUBLE_TAP) mods[mod] = 2;
    else mods[mod] = mods[mod] ? 0 : 1;
    lastTap = { mod, at: now };
    paint();
  }

  /** After a key, the modifiers held for one key go off. */
  function release() {
    let changed = false;
    for (const m of Object.keys(mods)) if (mods[m] === 1) { mods[m] = 0; changed = true; }
    if (changed) paint();
  }

  function switchLayout() {
    const ids = Object.keys(LAYOUTS);
    layoutId = ids[(ids.indexOf(layoutId) + 1) % ids.length];
    storage.set(LAYOUT_KEY, layoutId);
    if (!layout().altGr) mods.altGr = 0;
    draw();
  }

  /** Pressed: the key goes at once; held, it repeats (not the modifiers). */
  function down(e, key, el) {
    if (e.button !== 0) return;
    e.preventDefault();
    stopRepeat();
    el.setPointerCapture?.(e.pointerId);
    el.classList.add('down');
    const up = () => {
      el.classList.remove('down');
      stopRepeat();
    };
    el.addEventListener('pointerup', up, { once: true });
    el.addEventListener('pointercancel', up, { once: true });
    press(key);
    if (key.fn && !FN[key.fn].send) return;
    repeat = setTimeout(function again() {
      press(key);
      repeat = setTimeout(again, REPEAT_EVERY);
    }, REPEAT_DELAY);
  }

  function stopRepeat() {
    clearTimeout(repeat);
    repeat = null;
  }

  // Keys pressed on the real keyboard light up (not those typed here: they are not trusted)
  const lit = (code, on) => {
    for (const el of keysEl.querySelectorAll(`[data-code="${CSS.escape(code)}"]`)) el.classList.toggle('hit', on);
  };
  addEventListener('keydown', e => { if (e.isTrusted) lit(e.code, true); }, { capture: true, signal: win.signal });
  addEventListener('keyup', e => { if (e.isTrusted) lit(e.code, false); }, { capture: true, signal: win.signal });
  addEventListener('blur', () => { for (const el of keysEl.querySelectorAll('.hit')) el.classList.remove('hit'); }, { signal: win.signal });

  win.on('destroy', stopRepeat);
  draw();
  return win;
}
