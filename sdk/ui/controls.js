import { h } from '../core/dom.js';

/**
 * Form controls for settings and dialogs. Each returns its element; changes are reported
 * through onChange(value). Options can be plain strings or { value, label, disabled? }.
 */

const normalize = options => options.map(o => (typeof o === 'object' ? o : { value: o, label: String(o) }));
let seq = 0;

export function toggle({ value = false, onChange, label, disabled = false } = {}) {
  const el = h('button', { class: 'ctl-toggle', type: 'button', role: 'switch', 'aria-label': label, disabled });
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

/** A check box with its label beside it (a <label> with the <input> inside): value true/false. */
export function checkbox({ value = false, onChange, label, disabled = false } = {}) {
  const input = h('input', { type: 'checkbox', disabled });
  input.checked = !!value;
  input.addEventListener('change', () => onChange?.(input.checked));
  return h('label', { class: 'ctl-check' }, input, label != null ? h('span', {}, label) : null);
}

export function selectField({ value, options, onChange, label, disabled = false } = {}) {
  const el = h('select', { class: 'ctl-select', 'aria-label': label, disabled },
    normalize(options).map(o => h('option', { value: o.value, selected: o.value === value, disabled: !!o.disabled }, o.label)));
  el.addEventListener('change', () => onChange?.(el.value));
  return el;
}

/** Radio group of choices; arrow keys move between them, skipping the disabled ones. */
function radioGroup(className, { value, options, onChange, label }, renderOption) {
  const items = normalize(options);
  const el = h('div', { class: className, role: 'radiogroup', 'aria-label': label });
  const buttons = items.map(o => {
    const b = renderOption(o);
    b.type = 'button';
    b.setAttribute('role', 'radio');
    if (o.disabled) b.disabled = true;
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
    let next = buttons.indexOf(document.activeElement);
    for (let n = 0; n < buttons.length; n++) {
      next = (next + step + buttons.length) % buttons.length;
      if (!buttons[next].disabled) break;
    }
    if (buttons[next].disabled) return;
    buttons[next].focus();
    choose(items[next].value, true);
  });
  el.append(...buttons);
  choose(value, false);
  if (!buttons.some(b => b.tabIndex === 0)) {
    const first = buttons.find(b => !b.disabled);
    if (first) first.tabIndex = 0;
  }
  return el;
}

/**
 * Buttons side by side, one chosen. Each option may have `disabled` and `class` (its own colour:
 * '.ctl-seg button.on.<class>' in the app's CSS); `icon` (a Node) goes before the label.
 * className: added to 'ctl-seg' ('wide' fills the row, each button the same width).
 */
export function segmented({ className = '', ...opts } = {}) {
  return radioGroup(['ctl-seg', className].filter(Boolean).join(' '), opts, o => h('button', { class: o.class || null, title: o.title ?? null }, o.icon ?? null, o.label));
}

/** Radio buttons one under the other, each with its label (native inputs: the browser moves between them with the arrows). */
export function radios({ value, options, onChange, label, disabled = false } = {}) {
  const name = `ctl-radios-${++seq}`;
  return h('div', { class: 'ctl-radios', role: 'radiogroup', 'aria-label': label }, normalize(options).map(o => {
    const input = h('input', { type: 'radio', name, value: String(o.value), disabled: disabled || !!o.disabled });
    input.checked = o.value === value;
    input.addEventListener('change', () => { if (input.checked) onChange?.(o.value); });
    return h('label', { class: 'ctl-radio' }, input, h('span', {}, o.label));
  }));
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

/**
 * onChange fires on commit (Enter or blur), onInput on every keystroke.
 * type: 'text' (default), 'password', 'number', 'search', 'url', 'email', 'date', 'time'…;
 * min, max, step, maxLength as the input's own; mono: in the fixed-width font; className: added.
 */
export function textField({ value = '', placeholder, onChange, onInput, label, type = 'text', min, max, step, maxLength, disabled = false, mono = false, className = '' } = {}) {
  const el = h('input', {
    class: ['ctl-text', mono && 'mono', className].filter(Boolean).join(' '), type, placeholder, spellcheck: 'false', 'aria-label': label,
    min, max, step, maxlength: maxLength, disabled, autocomplete: type === 'password' ? 'off' : null,
  });
  el.value = value;
  el.addEventListener('input', () => onInput?.(el.value));
  el.addEventListener('change', () => onChange?.(el.value));
  el.addEventListener('keydown', e => { if (e.key === 'Enter') el.blur(); });
  return el;
}

/**
 * Marks a button as waiting: a spinner beside its label, and off until `work` (a promise, or a
 * function returning one) settles. Resolves or rejects as `work` does. Any <button> works (one
 * drawn as a link too): the spinner comes from [aria-busy="true"] (controls.css).
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

/**
 * spinner: when onClick returns a promise, the button waits for it (see busyButton).
 * icon: a Node before the label. confirm: a second label for a destructive action done in two
 * clicks: the first one shows it (red) for a few seconds, the second one runs onClick (a promise
 * it returns makes the button wait, as with spinner; its errors are the app's to show).
 */
export function actionButton({ label, primary = false, danger = false, spinner = false, confirm = null, icon = null, onClick } = {}) {
  const cls = ['ctl-btn', primary && 'primary', danger && 'danger'].filter(Boolean).join(' ');
  const el = h('button', { class: cls, type: 'button' }, icon, label);
  let timer = 0;
  const armed = () => el.classList.contains('confirming');
  const reset = () => {
    clearTimeout(timer);
    if (!armed()) return;
    el.classList.remove('confirming');
    el.replaceChildren(...[icon, label].filter(x => x != null));
  };
  el.addEventListener('click', e => {
    if (confirm && !armed()) {
      el.classList.add('confirming');
      el.replaceChildren(...[icon, confirm].filter(x => x != null));
      timer = setTimeout(reset, 4000);
      return;
    }
    clearTimeout(timer);
    const result = onClick?.(e);
    const waits = typeof result?.then === 'function';
    if ((spinner || confirm) && waits) busyButton(el, result).catch(() => {}).finally(reset);
    else reset();
  });
  el.addEventListener('blur', () => { if (armed() && !el.disabled) reset(); });
  return el;
}
