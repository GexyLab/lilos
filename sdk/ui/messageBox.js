import { h } from '../core/dom.js';
import { locale } from '../core/locale.js';
import { icon } from './icons.js';

/** The buttons a message box can have, in the order they are shown: Cancel on the left. */
const BUTTONS = ['cancel', 'retry', 'continue', 'ok'];
const LABELS = {
  en: { ok: 'OK', cancel: 'Cancel', continue: 'Continue', retry: 'Retry' },
  it: { ok: 'OK', cancel: 'Annulla', continue: 'Continua', retry: 'Riprova' },
};
const KINDS = ['info', 'warning', 'error'];

/** Window element → { count, inert }: how many boxes cover it, and what its body was before. */
const covered = new Map();
let seq = 0;

/**
 * A message for the user, or a choice to make, over a window: its content is covered and cannot be
 * used until the box is answered (the title bar can: the window still moves and closes).
 * Without a window (null) the box covers the whole page.
 *
 *   const answer = await messageBox(win, {
 *     icon: 'error',                       // 'info' | 'warning' | 'error' — optional
 *     title: 'Percorso non trovato',       // optional
 *     text: '«/home/eugenio/Docu» non esiste.',
 *     buttons: ['retry', 'cancel'],        // any of 'ok', 'cancel', 'continue', 'retry'; default ['ok'], [] none
 *     default: 'retry',                    // optional: the button of Enter (default: the rightmost but Cancel)
 *   });
 *   // → 'retry' | 'cancel' | null
 *
 * Resolves with the button pressed. Esc presses Cancel when there is one, otherwise closes with null;
 * the window closing resolves null too. The promise has close(value = null) to take the box away from
 * code (a box without buttons only goes away like this, or with Esc).
 * Button labels follow the system's language; texts are plain text (never HTML), new lines kept.
 */
export function messageBox(win, { icon: kind = null, title = '', text = '', buttons = ['ok'], default: wanted = null } = {}) {
  let resolve;
  const answer = new Promise(r => { resolve = r; });
  const list = BUTTONS.filter(b => buttons.includes(b));
  const primary = list.includes(wanted) ? wanted : list.filter(b => b !== 'cancel').at(-1) ?? null;
  const labels = LABELS[locale.code.split('-')[0]] ?? LABELS.en;
  const glyph = KINDS.includes(kind) ? kind : null;
  const id = `msgbox-${++seq}`;

  const box = h('div', {
    class: `msgbox${glyph ? ` ${glyph}` : ''}`, tabindex: '-1', 'aria-modal': 'true',
    role: glyph === 'warning' || glyph === 'error' ? 'alertdialog' : 'dialog',
    'aria-labelledby': title ? `${id}-title` : null,
    'aria-describedby': text ? `${id}-text` : null,
    'aria-label': title ? null : String(text).split('\n')[0] || null,
  },
  h('div', { class: 'msgbox-head' },
    glyph ? h('div', { class: 'msgbox-icon' }, icon(glyph)) : null,
    h('div', { class: 'msgbox-main' },
      title ? h('h2', { class: 'msgbox-title', id: `${id}-title` }, title) : null,
      text ? h('p', { class: 'msgbox-text', id: `${id}-text` }, text) : null)),
  list.length ? h('div', { class: 'msgbox-buttons' }, ...list.map(b => h('button', {
    class: `ctl-btn${b === primary ? ' primary' : ''}`, type: 'button', dataset: { value: b }, onclick: () => finish(b),
  }, labels[b]))) : null);

  const host = win?.el ?? document.body;
  const layer = h('div', { class: `msgbox-layer${win ? '' : ' page'}` }, box);
  const before = document.activeElement;
  const buttonsOf = () => [...box.querySelectorAll('.msgbox-buttons button')];

  // A press beside the box keeps the focus in it, and the box shows it is waiting
  layer.addEventListener('mousedown', e => {
    if (e.target !== layer) return;
    e.preventDefault();
    box.focus();
    box.classList.remove('nudge');
    void box.offsetWidth;
    box.classList.add('nudge');
  });
  box.addEventListener('keydown', e => {
    const all = buttonsOf();
    const at = all.indexOf(document.activeElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      finish(list.includes('cancel') ? 'cancel' : null);
    } else if (e.key === 'Enter' && at < 0 && primary) {
      e.preventDefault();
      finish(primary);
    } else if (e.key === 'Tab' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // The focus goes round the buttons, never out of the box
      e.preventDefault();
      if (!all.length) return;
      const back = e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey);
      const next = at < 0 ? (back ? all.length - 1 : 0) : (at + (back ? -1 : 1) + all.length) % all.length;
      all[next].focus();
    }
    // Plain keys stay here (Delete, letters…: lilOS's shortcuts must not get them); combos go on
    if (!e.ctrlKey && !e.altKey && !e.metaKey) e.stopPropagation();
  });

  const state = covered.get(host) ?? { count: 0, inert: !!win?.body.inert };
  state.count++;
  covered.set(host, state);
  if (win) win.body.inert = true;
  host.append(layer);
  const widened = fitButtons(win, box, layer);
  (box.querySelector('.msgbox-buttons .primary') ?? buttonsOf()[0] ?? box).focus();

  const off = win?.on('destroy', () => finish(null));
  let done = false;
  function finish(value) {
    if (done) return;
    done = true;
    off?.();
    layer.remove();
    widened?.();
    if (--state.count === 0) {
      covered.delete(host);
      if (win) win.body.inert = state.inert;
    }
    if (before?.isConnected && !before.closest('[inert]')) before.focus?.();
    resolve(value);
  }
  answer.close = (value = null) => finish(value);
  return answer;
}

/**
 * The buttons stay on one line: the box is at least as wide as they are, and a window too narrow
 * for the box gets wider. Returns what puts the window back as it was (null: nothing changed);
 * a window the user resized meanwhile keeps its new size.
 */
function fitButtons(win, box, layer) {
  const row = box.querySelector('.msgbox-buttons');
  if (!row || !box.offsetWidth) return null;   // no buttons, or a hidden window: nothing to measure
  // The buttons one by one: what overflows a row aligned right is not in its scrollWidth
  const buttons = [...row.children];
  const line = buttons.reduce((sum, b) => sum + b.offsetWidth, 0) + (buttons.length - 1) * parseFloat(getComputedStyle(row).columnGap || 0);
  const frame = box.offsetWidth - box.clientWidth;
  const { paddingLeft, paddingRight } = getComputedStyle(box);
  const need = Math.ceil(line + parseFloat(paddingLeft) + parseFloat(paddingRight) + frame);
  box.style.minWidth = `${need}px`;
  const { paddingLeft: left, paddingRight: right } = getComputedStyle(layer);
  const missing = need - (layer.clientWidth - parseFloat(left) - parseFloat(right));
  if (!win || missing <= 0 || win.el.classList.contains('max')) return null;
  const before = { w: parseFloat(win.el.style.width), h: parseFloat(win.el.style.height) };
  if (!before.w) return null;
  win.resizeTo(before.w + missing, before.h);
  const after = win.el.style.width;
  return () => { if (win.el.style.width === after) win.resizeTo(before.w, before.h); };
}
