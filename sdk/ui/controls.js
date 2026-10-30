import { h } from '../core/dom.js';

/**
 * Form controls for settings and dialogs. Each returns its element; changes are reported
 * through onChange(value). Options can be plain strings or { value, label }.
 */

const normalize = options => options.map(o => (typeof o === 'object' ? o : { value: o, label: String(o) }));

export function toggle({ value = false, onChange, label } = {}) {
  const el = h('button', { class: 'ctl-toggle', type: 'button', role: 'switch', 'aria-label': label });
  const set = on => {
    el.classList.toggle('on', on);
    el.setAttribute('aria-checked', String(on));
  };
  set(value);
  el.addEventListener('click', () => {
    const on = el.getAttribute('aria-checked') !== 'true';
    set(on);
    onChange?.(on);
  });
  return el;
}

export function selectField({ value, options, onChange, label } = {}) {
  const el = h('select', { class: 'ctl-select', 'aria-label': label },
    normalize(options).map(o => h('option', { value: o.value, selected: o.value === value }, o.label)));
  el.addEventListener('change', () => onChange?.(el.value));
  return el;
}

/** Radio group of choices; arrow keys move between them. */
function radioGroup(className, { value, options, onChange, label }, renderOption) {
  const items = normalize(options);
  const el = h('div', { class: className, role: 'radiogroup', 'aria-label': label });
  const buttons = items.map(o => {
    const b = renderOption(o);
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.addEventListener('click', () => choose(o.value, true));
    return b;
  });
  const choose = (v, notify) => {
    buttons.forEach((b, i) => {
      const on = items[i].value === v;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    if (notify) onChange?.(v);
  };
  el.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const i = buttons.indexOf(document.activeElement);
    const next = (i + step + buttons.length) % buttons.length;
    buttons[next].focus();
    choose(items[next].value, true);
  });
  el.append(...buttons);
  choose(value, false);
  if (!buttons.some(b => b.tabIndex === 0) && buttons[0]) buttons[0].tabIndex = 0;
  return el;
}

export function segmented(opts = {}) {
  return radioGroup('ctl-seg', opts, o => h('button', {}, o.label));
}

export function swatches({ colors, ...opts } = {}) {
  return radioGroup('ctl-swatches', { ...opts, options: colors }, o => {
    const b = h('button', { class: 'ctl-swatch', 'aria-label': o.label, title: o.label });
    b.style.background = b.style.color = o.value;
    return b;
  });
}

export function slider({ value = 0, min = 0, max = 100, step = 1, unit = '', onChange, label } = {}) {
  const input = h('input', { type: 'range', min, max, step, 'aria-label': label });
  input.value = value;
  const out = h('span', { class: 'ctl-value' }, value + unit);
  input.addEventListener('input', () => { out.textContent = input.value + unit; });
  input.addEventListener('change', () => onChange?.(Number(input.value)));
  return h('div', { class: 'ctl-slider' }, input, out);
}

/** onChange fires on commit (Enter or blur), onInput on every keystroke. */
export function textField({ value = '', placeholder, onChange, onInput, label } = {}) {
  const el = h('input', { class: 'ctl-text', type: 'text', placeholder, spellcheck: 'false', 'aria-label': label });
  el.value = value;
  el.addEventListener('input', () => onInput?.(el.value));
  el.addEventListener('change', () => onChange?.(el.value));
  el.addEventListener('keydown', e => { if (e.key === 'Enter') el.blur(); });
  return el;
}

/**
 * Marks a button as waiting: a spinner beside its label, and off until `work` (a promise, or a
 * function returning one) settles. Resolves or rejects as `work` does.
 */
export async function busyButton(button, work) {
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  try {
    return await (typeof work === 'function' ? work() : work);
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

/** spinner: when onClick returns a promise, the button waits for it (see busyButton). */
export function actionButton({ label, primary = false, danger = false, spinner = false, onClick } = {}) {
  const cls = ['ctl-btn', primary && 'primary', danger && 'danger'].filter(Boolean).join(' ');
  const el = h('button', { class: cls, type: 'button' }, label);
  el.addEventListener('click', e => {
    const result = onClick?.(e);
    if (spinner && typeof result?.then === 'function') busyButton(el, result).catch(() => {});
  });
  return el;
}
