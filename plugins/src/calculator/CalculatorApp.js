import { Calculator } from './engine.js';
import { separators, localize, number, expression } from './format.js';
import { h } from '../shared/sandbox/dom.js';
import { onLocale } from '../shared/sandbox/app.js';

/**
 * Calculator: a simple desk calculator (sdk 2, an installable app). The logic is in engine.js,
 * the numbers' form in format.js; this is the window: the screen, the keys and the keyboard.
 * It runs isolated (root is the sandbox's body) or in a Shadow DOM (root is the shadow root):
 * it has no lilOS SDK, only `lilos`.
 */
/** [key of the engine, text on the key, kind, name for assistive technologies, keyboard keys] in rows of four. */
const KEYPAD = [
  ['%', '%', 'fn', 'key.percent', '%'], ['ce', 'CE', 'fn', 'key.clearEntry', 'keyname.delete'], ['c', 'C', 'fn', 'key.clear', 'Esc'], ['back', '⌫', 'fn', 'key.backspace', 'keyname.backspace'],
  ['sqr', 'x²', 'fn', 'key.square', 'Q'], ['sqrt', '√x', 'fn', 'key.sqrt', '@'], ['neg', '±', 'fn', 'key.negate', 'F9'], ['/', '÷', 'op', 'key.divide', '/'],
  ['7', '7', 'num'], ['8', '8', 'num'], ['9', '9', 'num'], ['*', '×', 'op', 'key.multiply', '*'],
  ['4', '4', 'num'], ['5', '5', 'num'], ['6', '6', 'num'], ['-', '−', 'op', 'key.subtract', '-'],
  ['1', '1', 'num'], ['2', '2', 'num'], ['3', '3', 'num'], ['+', '+', 'op', 'key.add', '+'],
  ['0', '0', 'num wide'], ['.', null, 'num', 'key.decimal', ', .'], ['=', '=', 'eq', 'key.equals', 'keyname.enter'],
];

/** Keyboard keys (KeyboardEvent.key) to keys of the engine. */
const KEYBOARD = {
  ...Object.fromEntries('0123456789'.split('').map(d => [d, d])),
  '.': '.', ',': '.', '+': '+', '-': '-', '*': '*', x: '*', X: '*', '/': '/',
  '=': '=', Enter: '=', '%': '%', q: 'sqr', Q: 'sqr', '@': 'sqrt', F9: 'neg',
  Backspace: 'back', Delete: 'ce', Escape: 'c',
};

const COPY_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/></svg>';

export function main({ lilos, root }) {
  const i18n = () => lilos.locale.i18n;
  const t = (k, p) => i18n().t(k, p);
  const calc = new Calculator();
  let sep = separators(lilos.locale.code ?? i18n().lang);

  root.append(h('style', {}, STYLE));
  const exprEl = h('div', { class: 'expr' });
  const valueEl = h('div', { class: 'value', role: 'status', 'aria-atomic': 'true' });
  const copyBtn = h('button', { type: 'button', class: 'copy', tabindex: '-1', onclick: () => copy() });
  copyBtn.innerHTML = COPY_ICON;   // a constant, not data
  const keysEl = h('div', { class: 'keys', role: 'group' });
  const box = h('div', { class: 'calc', tabindex: '-1' }, h('div', { class: 'screen' }, copyBtn, exprEl, valueEl), keysEl);
  root.append(box);

  /** The keys, with their texts in the system's language: again when it changes. */
  function drawKeys() {
    keysEl.setAttribute('aria-label', t('keypad'));
    copyBtn.title = t('tip', { label: t('copy'), keys: 'Ctrl+C' });
    copyBtn.setAttribute('aria-label', t('copy'));
    keysEl.replaceChildren(...KEYPAD.map(([key, text, kind, name, keys]) => {
      const label = name ? t(name) : null;
      const shortcut = keys?.startsWith('keyname.') ? t(keys) : keys;
      return h('button', {
        type: 'button', class: `key ${kind}`, 'data-key': key,
        'aria-label': label, title: label && t('tip', { label, keys: shortcut }),
        onclick: () => press(key),
      }, text ?? sep.decimal);
    }));
  }

  function draw() {
    const v = calc.view();
    exprEl.textContent = v.error ? '' : expression(v.expr, sep);
    const shown = v.error ? t(`error.${v.error}`) : v.text !== null ? localize(v.text, sep) : number(v.value, sep);
    valueEl.textContent = shown;
    valueEl.classList.toggle('error', !!v.error);
    valueEl.style.setProperty('--len', String(Math.max(shown.length, 9)));
    copyBtn.disabled = !!v.error;
    for (const b of keysEl.querySelectorAll('.op')) b.classList.toggle('armed', b.dataset.key === v.op);
  }

  function press(key) {
    if (calc.press(key)) draw();
  }

  async function copy() {
    const v = calc.view();
    if (v.error) return;
    try {
      await lilos.clipboard.write(number(v.value, sep, { group: false }).replace('−', '-'));
      await lilos.ui.toast(t('copied'));
    } catch (err) {
      await lilos.ui.toast(t('copyFailed'));
      console.warn(err);
    }
  }

  /** A short light on the key pressed with the keyboard. */
  function flash(key) {
    const b = keysEl.querySelector(`[data-key="${CSS.escape(key)}"]`);
    if (!b) return;
    b.classList.add('hit');
    setTimeout(() => b.classList.remove('hit'), 120);
  }

  box.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      e.stopPropagation();
      return copy();
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = Object.hasOwn(KEYBOARD, e.key) ? KEYBOARD[e.key] : null;
    if (!key) return;
    // Also Enter on a focused key: '=' only once. Not further: outside the sandbox lilOS's own
    // shortcuts would take Delete, Esc… (the selected desk items)
    e.preventDefault();
    e.stopPropagation();
    flash(key);
    press(key);
  });
  // Keys pressed with the mouse keep the focus in the calculator, so the keyboard keeps working
  box.addEventListener('pointerdown', e => { if (!e.target.closest('button')) requestAnimationFrame(() => box.focus()); });

  const off = onLocale(lilos, () => {
    sep = separators(lilos.locale.code ?? i18n().lang);
    drawKeys();
    draw();
  });
  drawKeys();
  draw();
  requestAnimationFrame(() => box.focus());
  return () => off?.();
}

const STYLE = `
  :host { display: block; height: 100%; }
  html, body { height: 100%; margin: 0; }
  .calc { box-sizing: border-box; height: 100%; display: flex; flex-direction: column; gap: 8px; padding: 10px; color: var(--text); font: 14px/1.3 var(--font, system-ui); container-type: size; outline: none; user-select: none; -webkit-user-select: none; }
  .calc * { box-sizing: border-box; }
  .screen { position: relative; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end; gap: 2px; padding: 8px 6px 4px; flex: 0 0 auto; min-height: clamp(64px, 24cqh, 140px); }
  .expr { min-height: 1.3em; max-width: 100%; color: var(--dim); font-size: clamp(12px, 3.6cqh, 16px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right; }
  .value { max-width: 100%; font-size: clamp(18px, min(calc(160cqw / var(--len, 9)), 11cqh), 54px); font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; user-select: text; -webkit-user-select: text; }
  .value.error { font-weight: 500; font-size: clamp(14px, min(7cqw, 7cqh), 28px); color: var(--danger, #d64545); white-space: normal; text-align: right; }
  .copy { position: absolute; top: 4px; left: 2px; display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: var(--radius-sm, 6px); background: none; color: var(--dim); cursor: pointer; opacity: .7; }
  .copy:hover:not(:disabled) { background: var(--hover); color: var(--text); opacity: 1; }
  .copy:disabled { opacity: .3; cursor: default; }
  .keys { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 1fr; gap: 4px; }
  .key { min-width: 0; min-height: 0; padding: 0; border: 1px solid var(--border); border-radius: var(--radius-sm, 6px); font: inherit; font-size: clamp(13px, min(6cqw, 4.2cqh), 24px); color: var(--text); background: var(--chrome, var(--surface)); cursor: pointer; transition: background .08s, filter .08s; }
  .key:hover { background: var(--hover); }
  .key:active, .key.hit { filter: brightness(.9); }
  .key:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .key.num { font-weight: 600; background: var(--field-bg, var(--surface)); }
  .key.num:hover { background: var(--hover); }
  .key.fn { color: var(--dim); }
  .key.op { font-size: clamp(15px, min(7cqw, 5cqh), 28px); color: var(--accent); }
  .key.op.armed { background: var(--accent-soft, var(--hover)); border-color: var(--accent); }
  .key.eq { background: var(--accent); border-color: var(--accent); color: #fff; font-size: clamp(15px, min(7cqw, 5cqh), 28px); }
  .key.eq:hover { background: var(--accent); filter: brightness(1.08); }
  .key.eq:active, .key.eq.hit { filter: brightness(.92); }
  .key.wide { grid-column: span 2; }
`;
