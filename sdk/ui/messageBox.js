import { h } from '../core/dom.js';
import { locale } from '../core/locale.js';
import { icon } from './icons.js';
import { busyButton, checkbox } from './controls.js';

/** The standard buttons, in the order they are shown when only those are asked for: Cancel on the left. */
const STANDARD = ['cancel', 'retry', 'continue', 'ok'];
const KINDS = ['info', 'warning', 'error'];
const FIELD_TYPES = ['text', 'password', 'number', 'textarea', 'select', 'checkbox'];

const { t } = locale.define('lilos:messageBox', {
  en: { strings: {
    ok: 'OK', cancel: 'Cancel', continue: 'Continue', retry: 'Retry',
    required: 'Fill in “{label}”', invalid: '“{label}” is not valid', number: '“{label}” must be a number',
    min: '“{label}” must be at least {min}', max: '“{label}” must be at most {max}', long: '“{label}” is too long (at most {max} characters)',
  } },
});

/** Window element → { count, inert }: how many boxes cover it, and what its body was before. */
const covered = new Map();
let seq = 0;

/**
 * A message for the user, a choice to make or a few values to fill in, over a window: its content
 * is covered and cannot be used until the box is answered (the title bar can: the window still
 * moves and closes). Without a window (null) the box covers the whole page.
 *
 *   const answer = await messageBox(win, {
 *     icon: 'error',                       // 'info' | 'warning' | 'error' — optional
 *     title: 'Percorso non trovato',       // optional
 *     text: '«/home/eugenio/Docu» non esiste.',   // (or message:) plain text, new lines kept
 *     buttons: ['retry', 'cancel'],        // any of 'ok', 'cancel', 'continue', 'retry'; default ['ok'], [] none
 *     default: 'retry',                    // optional: the button of Enter (default: the rightmost but Cancel)
 *   });
 *   // → 'retry' | 'cancel' | null
 *
 * Buttons of the app's own: objects, shown in the order given (strings among them are the standard
 * ones, with their label): { value, label, primary?, danger?, icon? }. `primary` makes it the
 * button of Enter (as `default` does), `danger` red:
 *   buttons: ['cancel', { value: 'keep', label: 'Tieni entrambi' }, { value: 'replace', label: 'Sostituisci', primary: true }]
 *
 * Values to fill in (a prompt): `fields`, shown under the text, and the box resolves
 * { button, values } instead of the button alone ({ name: value }, also for Cancel and Esc):
 *   fields: [{ name, type?, label, value?, placeholder?, hint?, required?, pattern?, invalid?,
 *              min?, max?, step?, maxLength?, options? }]
 *     type: 'text' (default) | 'password' | 'number' | 'textarea' | 'select' | 'checkbox'
 *     value: text, number (null when empty), the chosen option's value, true/false
 *     options (select): ['a', 'b'] or [{ value, label, disabled? }]
 *     required, pattern (a RegExp the whole text must match; `invalid` is the message), min, max,
 *     maxLength: checked when a button other than Cancel is pressed; the first field that fails
 *     shows why, gets the focus and the box stays open.
 * `content`: a Node of the app's own (a preview, a list, its own controls), under the text and
 * before the fields. Enter in one of its inputs presses the button of Enter, unless its own
 * handler calls preventDefault().
 * `validate(values, button)`: called after those checks for every button but Cancel; may be
 * async (the button shows it waits: busyButton; Cancel and Esc still work). It returns a text
 * (shown, the box stays open), false (the box stays open: the app shows why itself) or anything
 * else (the box closes with that button). An error it throws is shown as a text.
 * `width`: the box's width in pixels (default 400; never wider than the window).
 *
 * Resolves with the button pressed. Esc presses Cancel when there is one, otherwise closes with null;
 * the window closing resolves null too. The promise has close(value = null) to take the box away from
 * code (a box without buttons only goes away like this, or with Esc).
 * Labels and messages follow the system's language; texts are plain text (never HTML).
 */
export function messageBox(win, {
  icon: kind = null, title = '', text = '', message = '', content = null, fields = null,
  buttons = ['ok'], default: wanted = null, validate = null, width = null,
} = {}) {
  let resolve;
  const answer = new Promise(r => { resolve = r; });
  const body = String(text || message || '');
  const list = buttonList(buttons);
  const primary = list.find(b => b.value === wanted)?.value ?? list.find(b => b.primary)?.value ?? list.filter(b => b.value !== 'cancel').at(-1)?.value ?? null;
  const hasCancel = list.some(b => b.value === 'cancel');
  const inputs = Array.isArray(fields) ? fields.filter(f => f && typeof f.name === 'string').map(field) : null;
  const glyph = KINDS.includes(kind) ? kind : null;
  const id = `msgbox-${++seq}`;
  const error = h('p', { class: 'msgbox-error', role: 'alert', hidden: true });

  const box = h('div', {
    class: `msgbox${glyph ? ` ${glyph}` : ''}`, tabindex: '-1', 'aria-modal': 'true',
    role: glyph === 'warning' || glyph === 'error' ? 'alertdialog' : 'dialog',
    'aria-labelledby': title ? `${id}-title` : null,
    'aria-describedby': body ? `${id}-text` : null,
    'aria-label': title ? null : body.split('\n')[0] || null,
  },
  h('div', { class: 'msgbox-head' },
    glyph ? h('div', { class: 'msgbox-icon' }, icon(glyph)) : null,
    h('div', { class: 'msgbox-main' },
      title ? h('h2', { class: 'msgbox-title', id: `${id}-title` }, title) : null,
      body ? h('p', { class: 'msgbox-text', id: `${id}-text` }, body) : null,
      content instanceof Node ? h('div', { class: 'msgbox-content' }, content) : null,
      inputs?.length ? h('div', { class: 'msgbox-fields' }, inputs.map(f => f.el)) : null,
      error)),
  list.length ? h('div', { class: 'msgbox-buttons' }, ...list.map(b => h('button', {
    class: ['ctl-btn', b.value === primary && 'primary', b.danger && 'danger'].filter(Boolean).join(' '),
    type: 'button', dataset: { value: b.value }, onclick: () => press(b.value),
  }, b.icon ? icon(b.icon) : null, b.label))) : null);
  if (Number.isFinite(width) && width > 0) box.style.width = `min(${Math.round(width)}px, 100%)`;

  const host = win?.el ?? document.body;
  const layer = h('div', { class: `msgbox-layer${win ? '' : ' page'}` }, box);
  const before = document.activeElement;
  const buttonsOf = () => [...box.querySelectorAll('.msgbox-buttons button')];
  const buttonOf = value => buttonsOf().find(b => b.dataset.value === value);
  const focusables = () => [...box.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.disabled && el.tabIndex !== -1 && !el.closest('[hidden]') && el.getClientRects().length);

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
    if (e.defaultPrevented) {
      // the app's content took it
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish(hasCancel ? 'cancel' : null);
    } else if (e.key === 'Enter' && at < 0 && primary && !e.target.matches?.('textarea, button, a[href]')) {
      e.preventDefault();
      press(primary);
    } else if (e.key === 'Tab') {
      // The focus goes round what the box has, never out of it
      e.preventDefault();
      const ring = focusables();
      if (!ring.length) return;
      const i = ring.indexOf(document.activeElement);
      ring[i < 0 ? (e.shiftKey ? ring.length - 1 : 0) : (i + (e.shiftKey ? -1 : 1) + ring.length) % ring.length].focus();
    } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && (at >= 0 || e.target === box) && all.length) {
      // Arrows go round the buttons (in a field they move the caret)
      e.preventDefault();
      const back = e.key === (getComputedStyle(box).direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft');
      all[at < 0 ? (back ? all.length - 1 : 0) : (at + (back ? -1 : 1) + all.length) % all.length].focus();
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
  const first = inputs?.find(f => f.focus)?.focus;
  (first ?? box.querySelector('.msgbox-buttons .primary') ?? buttonsOf()[0] ?? box).focus();
  if (first?.select && first.type !== 'number') first.select();

  const values = () => (inputs ? Object.fromEntries(inputs.map(f => [f.name, f.value()])) : {});
  const showError = (message, el = null) => {
    error.textContent = message;
    error.hidden = !message;
    inputs?.forEach(f => f.invalid(f.focus === el && !!el));
    el?.focus();
  };

  const off = win?.on('destroy', () => finish(null));
  let done = false;
  let waiting = false;
  async function press(value) {
    if (done || waiting) return;
    if (value === 'cancel') return finish(value);
    const now = values();
    for (const f of inputs ?? []) {
      const problem = f.check();
      if (problem) return showError(problem, f.focus);
    }
    if (typeof validate === 'function') {
      waiting = true;
      box.setAttribute('aria-busy', 'true');
      const button = buttonOf(value);
      // The waiting button is off: the focus stays in the box (Esc and Cancel still work), then goes back
      const had = document.activeElement === button;
      if (had) box.focus();
      let result;
      try {
        result = button ? await busyButton(button, () => validate(now, value)) : await validate(now, value);
      } catch (err) {
        result = String(err?.message ?? err);
      }
      waiting = false;
      box.removeAttribute('aria-busy');
      if (done) return;
      if (had && document.activeElement === box) button.focus();
      if (typeof result === 'string' && result) return showError(result);
      if (result === false) return showError('');
    }
    finish(value);
  }
  function finish(value) {
    if (done) return;
    done = true;
    const result = inputs ? { button: value, values: values() } : value;
    off?.();
    layer.remove();
    widened?.();
    if (--state.count === 0) {
      covered.delete(host);
      if (win) win.body.inert = state.inert;
    }
    if (before?.isConnected && !before.closest('[inert]')) before.focus?.();
    resolve(result);
  }
  answer.close = (value = null) => finish(value);
  return answer;
}

/** The buttons as { value, label, primary, danger, icon }: only standard ones keep their fixed order. */
function buttonList(buttons) {
  const given = Array.isArray(buttons) ? buttons : [];
  const own = given.some(b => b && typeof b === 'object');
  const list = own ? given : STANDARD.filter(b => given.includes(b));
  return list.filter(b => (typeof b === 'string' && b) || (b && typeof b === 'object' && b.value != null)).map(b => (typeof b === 'string'
    ? { value: b, label: STANDARD.includes(b) ? t(b) : b }
    : { value: String(b.value), label: String(b.label ?? (STANDARD.includes(String(b.value)) ? t(String(b.value)) : b.value)), primary: !!b.primary, danger: !!b.danger, icon: typeof b.icon === 'string' ? b.icon : null }));
}

/** One field of `fields`: { name, el, focus (what gets the focus), value(), check() → message | null, invalid(on) }. */
function field(def) {
  const type = FIELD_TYPES.includes(def.type) ? def.type : 'text';
  const label = String(def.label ?? def.name);
  const fid = `msgbox-field-${++seq}`;
  const hint = def.hint ? h('small', { class: 'msgbox-hint', id: `${fid}-hint` }, String(def.hint)) : null;
  const described = hint ? `${fid}-hint` : null;
  if (type === 'checkbox') {
    const box = checkbox({ value: !!def.value, label, disabled: !!def.disabled });
    const input = box.querySelector('input');
    if (described) input.setAttribute('aria-describedby', described);
    return {
      name: def.name, el: h('div', { class: 'msgbox-field check' }, box, hint), focus: input,
      value: () => input.checked, check: () => null, invalid: () => {},
    };
  }
  let input;
  if (type === 'select') {
    const options = (Array.isArray(def.options) ? def.options : []).map(o => (o && typeof o === 'object' ? o : { value: o, label: String(o) }));
    input = h('select', { class: 'ctl-select', id: fid, disabled: !!def.disabled },
      options.map(o => h('option', { value: String(o.value), disabled: !!o.disabled, selected: String(o.value) === String(def.value ?? '') }, String(o.label ?? o.value))));
  } else {
    input = h(type === 'textarea' ? 'textarea' : 'input', {
      class: 'ctl-text', id: fid, ...(type !== 'textarea' && { type }), placeholder: def.placeholder != null ? String(def.placeholder) : null,
      spellcheck: 'false', autocomplete: type === 'password' ? 'off' : null, disabled: !!def.disabled,
      min: def.min, max: def.max, step: def.step, maxlength: Number.isFinite(def.maxLength) ? def.maxLength : null, rows: type === 'textarea' ? def.rows ?? 4 : null,
    });
    input.value = def.value == null ? '' : String(def.value);
  }
  if (described) input.setAttribute('aria-describedby', described);
  const pattern = def.pattern instanceof RegExp ? def.pattern : null;
  const read = () => (type === 'number' ? (input.value.trim() === '' ? null : Number(input.value)) : input.value);
  const check = () => {
    const v = read();
    if (def.required && (v === null || v === '' || (typeof v === 'string' && !v.trim()))) return t('required', { label });
    if (v === null || v === '') return null;
    if (type === 'number') {
      if (!Number.isFinite(v)) return t('number', { label });
      if (Number.isFinite(def.min) && v < def.min) return t('min', { label, min: def.min });
      if (Number.isFinite(def.max) && v > def.max) return t('max', { label, max: def.max });
    }
    if (typeof v === 'string' && Number.isFinite(def.maxLength) && v.length > def.maxLength) return t('long', { label, max: def.maxLength });
    if (pattern && typeof v === 'string') {
      const whole = new RegExp(`^(?:${pattern.source})$`, pattern.flags.replace(/[gy]/g, ''));
      if (!whole.test(v)) return def.invalid ? String(def.invalid) : t('invalid', { label });
    }
    return null;
  };
  return {
    name: def.name, focus: input, value: read, check,
    el: h('div', { class: 'msgbox-field' }, h('label', { class: 'msgbox-label', for: fid }, label), input, hint),
    invalid: on => (on ? input.setAttribute('aria-invalid', 'true') : input.removeAttribute('aria-invalid')),
  };
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
