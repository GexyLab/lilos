import * as sdk from '@lilos/sdk';   // net: missing in older lilOS, so not imported by name
import './fieldsForm.css';

const { h, uid, toggle, textField, actionButton, fs } = sdk;

/**
 * Forms drawn from a list of field descriptions: the fields of a network protocol (File Manager's
 * connections, Terminal's hosts and .term files) and the settings of a kernel module (Control
 * Panel). A field, as the kernel describes it:
 *   { key, type, label, hint?, placeholder?, default?, required?, secret?, when?, options?, min?, max?, button? }
 *   type      'text' (default) | 'password' | 'number' | 'select' | 'checkbox' | 'textarea' | 'file' | 'signin'
 *   label…    a text, or { en, it, … } (see `text`)
 *   secret    its value is kept apart (secret()), never filled in from saved values
 *   when      { key: value | [values] }: shown only while the other fields have these values
 *   options   for 'select': [{ value, label, disabled? }]; disabled ones are shown («coming»), not chosen
 *   file      a file of lilOS (a private key): its path, typed or chosen; read when the form is read
 *   signin    an account to sign in to: drawn by the app (option `signin`)
 *
 * Two ways to draw them:
 *   fieldsForm(fields, options)          a form in a dialog: the values are read at the end
 *   settingRows(fields, values, options) rows of a SettingsView, each saved as soon as it changes
 */

/** Whether a field is shown with these values (its `when`), as the kernel decides it. */
export const shown = (f, values) => !f.when || Object.entries(f.when).every(([k, want]) => (Array.isArray(want) ? want.includes(values[k]) : values[k] === want));

/** A text of a description (a string or { en, it, … }) in the system's language. */
export const fieldText = v => sdk.net?.text?.(v) ?? (typeof v === 'string' ? v : '');

const isSecret = f => f.secret || f.type === 'password';

/** Fills in `values` (and returns it) the defaults of the fields without a value; never secret ones. */
export function withDefaults(fields, values) {
  for (const f of fields) if (!isSecret(f) && f.type !== 'signin' && values[f.key] === undefined && f.default !== undefined) values[f.key] = f.default;
  return values;
}

/** The values of the fields shown, without secret, sign-in and file ones, and without empty ones. */
export function cleanValues(fields, values) {
  const out = {};
  for (const f of fields) {
    if (isSecret(f) || f.type === 'signin' || f.type === 'file' || !shown(f, values)) continue;
    const v = values[f.key];
    if (v !== undefined && v !== '' && v !== null) out[f.key] = v;
  }
  return out;
}

/** The value of an option of a select, by the string of the element. */
const optionValue = (f, value) => (f.options ?? []).find(o => String(o.value) === value)?.value;

/** A select of the field's options (disabled ones shown, not chosen). */
function selectOf(f, value, text, attrs = {}) {
  return h('select', { class: 'ctl-select', ...attrs },
    ...(f.options ?? []).map(o => h('option', { value: String(o.value), selected: o.value === value, disabled: !!o.disabled }, text(o.label))));
}

const required = f => (f.required ? h('span', { class: 'sh-field-req', 'aria-hidden': 'true' }, ' *') : null);

/**
 * The fields in a form: returns { el, values(), secret(), read(), missing(), focus(), redraw() }.
 *   t          the app's t (its locales have the shared.fields.* strings)
 *   values     to start from (a saved configuration being changed, or one filled in); copied.
 *              The defaults of the fields without a value are filled in.
 *   text       (label) → string: the texts of the descriptions (default: fieldText)
 *   editing    the values are a saved configuration's: a secret field left empty keeps the secret
 *              (it says «unchanged»)
 *   only       'secret': only the secret fields (asking the password again)
 *   pairs      [['host', 'port']]: fields drawn side by side when both are shown
 *   pickFile   (options) → Promise<node | null>: lilOS's file picker (with the app's window), for
 *              the Browse… button of 'file' fields (none without it)
 *   filePlaceholder  the placeholder of 'file' fields without their own ('~/.ssh/id_ed25519')
 *   signin     (field, { values, changed }) → element: the row of a 'signin' field (File Manager's
 *              sign-in); it sets values[field.key] to the account and calls changed()
 *   extra      (field, { input, set }) → element | null: put beside the field's input (File
 *              Manager's list of shares); set(value) changes the field
 *   after      (values) → elements: drawn after the fields, again after each change (a note that
 *              depends on the values, a checkbox of the app)
 *   onChange   (values) after each change
 *
 *   values()            the values of the fields shown, without secret, file and sign-in ones (cleanValues)
 *   secret()            Promise of the secret values: typed ones, and the content of the files of
 *                       'file' fields; rejects with «no such file» when a path is not a file
 *   read()              Promise of { values, secret }: values() with non-secret files read too
 *   missing(needSecret = true)  the labels of required fields shown and left empty (secret ones
 *                       count only when needSecret)
 *   all()               every value held, sign-in accounts too (not a copy)
 *   focus()             the first field
 *   redraw()            draws the fields again (after the app changed something they show)
 */
export function fieldsForm(fields, { t, values: initial = {}, text = fieldText, editing = false, only = null, pairs = [], pickFile = null, filePlaceholder = '', signin = null, extra = null, after = null, onChange = null } = {}) {
  const values = withDefaults(fields, { ...initial });
  const secret = {}, paths = {};
  const el = h('div', { class: 'sh-fields' });
  const tail = h('div', { class: 'sh-fields-after' });
  let drawn = '';

  const visible = () => fields.filter(f => (only !== 'secret' || f.secret) && shown(f, values) && (f.type !== 'signin' || signin));
  const changed = () => {
    onChange?.(values);
    if (visible().map(f => f.key).join('\n') !== drawn) draw();
    else drawAfter();
  };
  const drawAfter = () => {
    const nodes = after ? [after(values)].flat(Infinity).filter(Boolean) : [];
    tail.replaceChildren(...nodes);
    tail.hidden = !nodes.length;
  };

  function row(f) {
    if (f.type === 'signin') return signin(f, { values, changed });
    const store = f.secret ? secret : values;
    const id = `sh-f-${f.key}-${uid()}`;
    const label = h('label', { for: id }, text(f.label), required(f));
    const hint = f.hint ? h('small', { class: 'sh-field-hint' }, text(f.hint)) : null;
    const set = v => {
      if (v === '' || v === undefined || v === null) delete store[f.key]; else store[f.key] = v;
      changed();
    };
    let input;
    if (f.type === 'checkbox') {
      input = h('input', { id, type: 'checkbox', checked: store[f.key] === true, dataset: { key: f.key } });
      input.addEventListener('change', () => set(input.checked));
      return h('div', { class: 'sh-field' }, h('label', { class: 'sh-field-check' }, input, text(f.label)), hint);
    }
    if (f.type === 'select') {
      // What is shown is what is sent: without a value, the first option that can be chosen
      if (store[f.key] === undefined) {
        const first = (f.options ?? []).find(o => !o.disabled);
        if (first) store[f.key] = first.value;
      }
      input = selectOf(f, store[f.key], text, { id, dataset: { key: f.key } });
      input.addEventListener('change', () => set(optionValue(f, input.value)));
    } else if (f.type === 'textarea') {
      input = h('textarea', { id, class: 'ctl-text', rows: '3', spellcheck: 'false', placeholder: f.placeholder ?? '', dataset: { key: f.key } });
      input.value = store[f.key] ?? '';
      input.addEventListener('input', () => set(input.value));
    } else if (f.type === 'file') {
      // The path of a file of lilOS: what it holds is read with the form (secret()/read())
      input = h('input', {
        id, class: 'ctl-text', type: 'text', spellcheck: 'false', autocomplete: 'off', dataset: { key: f.key },
        placeholder: editing && f.secret ? t('shared.fields.unchanged') : f.placeholder ?? filePlaceholder,
      });
      input.value = paths[f.key] ?? '';
      const setPath = v => { if (v.trim()) paths[f.key] = v.trim(); else delete paths[f.key]; onChange?.(values); };
      input.addEventListener('input', () => setPath(input.value));
      const browse = pickFile && actionButton({
        label: t('shared.fields.browse'),
        onClick: async () => {
          const node = await pickFile({ kind: 'file', title: text(f.label) });
          if (!node) return;
          input.value = fs.tildePath(node.id);
          setPath(input.value);
        },
      });
      return h('div', { class: 'sh-field' }, label, browse ? h('div', { class: 'sh-field-pick' }, input, browse) : input, hint);
    } else {
      const type = f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : 'text';
      input = h('input', {
        id, class: 'ctl-text', type, spellcheck: 'false', autocomplete: type === 'password' ? 'new-password' : 'off', dataset: { key: f.key },
        placeholder: f.secret && editing ? t('shared.fields.unchanged') : f.placeholder ?? '',
        min: f.min !== undefined ? String(f.min) : null, max: f.max !== undefined ? String(f.max) : null,
      });
      input.value = store[f.key] ?? '';
      input.addEventListener('input', () => set(type === 'number' ? (input.value === '' ? '' : Number(input.value)) : input.value));
    }
    const beside = extra?.(f, { input, set: v => { input.value = v ?? ''; set(v); } });
    return h('div', { class: 'sh-field' }, label, beside ? h('div', { class: 'sh-field-pick' }, input, beside) : input, hint);
  }

  function draw() {
    const focused = el.contains(document.activeElement) ? document.activeElement.dataset?.key : null;
    const list = visible();
    drawn = list.map(f => f.key).join('\n');
    const rows = [];
    for (let i = 0; i < list.length; i++) {
      const f = list[i], next = list[i + 1];
      if (next && pairs.some(([a, b]) => a === f.key && b === next.key)) {
        rows.push(h('div', { class: 'sh-field-pair' }, row(f), row(next)));
        i++;
      } else rows.push(row(f));
    }
    el.replaceChildren(...rows, tail);
    drawAfter();
    // Drawn again while typing (a field another one depends on): the focus stays in that field
    if (focused) el.querySelector(`[data-key="${CSS.escape(focused)}"]`)?.focus();
  }
  draw();

  /** The contents of the files of 'file' fields shown: { key: text } of those with `secret` as asked. */
  const files = async wantSecret => {
    const out = {};
    for (const f of visible()) {
      if (f.type !== 'file' || !!f.secret !== wantSecret || !paths[f.key]) continue;
      const path = paths[f.key];
      const node = fs.resolve(path.startsWith('~') || path.startsWith('/') ? path : `~/${path}`);
      if (node?.type !== 'file') throw new Error(t('shared.fields.noSuchFile', { path }));
      out[f.key] = await fs.read(node.id);
    }
    return out;
  };

  return {
    el,
    values: () => cleanValues(fields, values),
    secret: async () => {
      const typed = Object.fromEntries(Object.entries(secret).filter(([k]) => visible().some(f => f.key === k)));
      return { ...typed, ...await files(true) };
    },
    read: async () => {
      const [plain, hidden] = await Promise.all([files(false), files(true)]);
      const typed = Object.fromEntries(Object.entries(secret).filter(([k]) => visible().some(f => f.key === k)));
      return { values: { ...cleanValues(fields, values), ...plain }, secret: { ...typed, ...hidden } };
    },
    missing: (needSecret = true) => visible().filter(f => f.required && (
      f.type === 'file' ? (!f.secret || needSecret) && !paths[f.key]
        : f.secret ? needSecret && !secret[f.key]
          : values[f.key] === undefined || values[f.key] === '')).map(f => text(f.label)),
    all: () => values,
    focus: () => el.querySelector('input, select, textarea, button')?.focus(),
    redraw: draw,
  };
}

/**
 * The fields as rows of a SettingsView ({ label, description, keywords, control }), for those
 * shown with these values (defaults filled in). Each control saves as soon as it changes:
 *   save(field, value)   value '' or undefined: the field emptied; for a secret one, null: removed
 *                        (left out of what is saved, a secret is kept: the app decides)
 *   secrets              the keys of the secret fields that have a value (they are never shown:
 *                        «set» or «not set», a button removes it)
 *   t, text, keywords    as fieldsForm; keywords: the search words of every row
 */
export function settingRows(fields, saved, { t, save, secrets = [], text = fieldText, keywords } = {}) {
  const values = withDefaults(fields, { ...saved });
  return fields.filter(f => f.type !== 'signin' && f.type !== 'file' && shown(f, values)).map(f => ({
    label: text(f.label),
    description: f.hint ? text(f.hint) : undefined,
    keywords,
    control: () => settingControl(f, values[f.key], { t, save, set: secrets.includes(f.key), text }),
  }));
}

function settingControl(f, value, { t, save, set, text }) {
  const label = text(f.label);
  if (f.type === 'checkbox') return toggle({ value: value === true, label, onChange: v => save(f, v) });
  if (f.type === 'select') {
    const el = selectOf(f, value, text, { 'aria-label': label });
    el.addEventListener('change', () => save(f, optionValue(f, el.value)));
    return el;
  }
  if (isSecret(f)) {
    const input = h('input', { class: 'ctl-text sh-setting-text', type: 'password', autocomplete: 'new-password', placeholder: set ? t('shared.fields.secretSet') : t('shared.fields.secretEmpty'), 'aria-label': label });
    input.addEventListener('change', () => { if (input.value.trim()) save(f, input.value.trim()); });
    return h('div', { class: 'sh-setting-secret' }, input, set ? actionButton({ label: t('shared.fields.secretRemove'), danger: true, onClick: () => save(f, null) }) : null);
  }
  if (f.type === 'textarea') {
    const area = h('textarea', { class: 'ctl-text sh-setting-area', rows: '5', spellcheck: 'false', placeholder: f.placeholder ?? '', 'aria-label': label });
    area.value = value ?? '';
    area.addEventListener('change', () => save(f, area.value));
    return area;
  }
  if (f.type === 'number') {
    const input = h('input', { class: 'ctl-text sh-setting-number', type: 'number', placeholder: f.placeholder ?? '', 'aria-label': label, min: f.min ?? null, max: f.max ?? null });
    input.value = value ?? '';
    input.addEventListener('change', () => save(f, input.value === '' ? '' : Number(input.value)));
    return input;
  }
  const field = textField({ value: value ?? '', placeholder: f.placeholder ?? '', label, onChange: v => save(f, v.trim()) });
  field.classList.add('sh-setting-text');
  return field;
}
