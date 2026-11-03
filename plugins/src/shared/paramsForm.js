import { h, icon, fs, toggle, actionButton } from '@lilos/sdk';
import './paramsForm.css';

/**
 * Controls for the `params` of an entry point or an automation's action, as the manifest
 * describes them (texts already in the system's language):
 *   { type, label, description?, default?, required?, options?, min?, max?, maxLength? }
 *   type   'text' (default) | 'secret' | 'number' | 'boolean' | 'choice' | 'file' | 'folder' | 'files'
 *
 *   paramControl(p, value, options)            one control: { el, get(), check() }
 *   paramsForm(params, values, options)        all of them, with their labels: { el, values(), check(), focus(), controls }
 *
 * Options (both):
 *   t          the app's t (its locales have the shared.params.* strings)
 *   pickFile   (options) → Promise<node | null>: lilOS's file picker (with the app's window), for
 *              file, folder and files (no Choose… button without it)
 *   pathAs     'id' (default): files and folders are node ids, shown by their '~' path, and a
 *              button clears them · 'tilde': '~/…' paths, typed or chosen (services and
 *              schedules, which run where node ids mean nothing)
 *   live       values change at each key (default: when the field is left or Enter is pressed)
 *   locked     nothing can be changed (a system service, for users who are not admins)
 *   empty      a choice can be left empty («—», the default: it is not saved) — default true
 * paramControl only:
 *   label      the name for assistive technologies (default p.label)
 *   onChange   (value) → false | anything: the value changed (null: emptied); false refuses it
 *              (it could not be saved) and the control goes back to the last value
 * paramsForm only:
 *   onChange   (values, name) → false | anything: the values after a change, without the empty
 *              ones (a copy); false refuses it as above
 *   context    added to the name of every control for assistive technologies («Porta (Server web)»)
 *
 * check() → '' or what is wrong, in words: a required value missing, a number not valid or
 * outside min/max (shown by the app before going on).
 */
export function paramControl(p, value, { t, label = p.label, onChange = null, pickFile = null, pathAs = 'id', live = false, locked = false, empty = true } = {}) {
  const type = p.type ?? 'text';
  const isRequired = p.required === true;
  let current = value ?? (type === 'files' ? [] : null);
  // A change the app may refuse: back to the last value then
  const accept = (next, revert) => {
    if (onChange?.(next) === false) { revert(); return false; }
    current = next;
    return true;
  };
  const on = live ? 'input' : 'change';
  const control = make();
  if (locked) {
    for (const el of [control.el, ...control.el.querySelectorAll('input, select, button, textarea')]) if ('disabled' in el) el.disabled = true;
  }
  return control;

  function make() {
    if (type === 'boolean') {
      const el = toggle({ value: current === true, label, onChange: v => accept(v, () => { el.classList.toggle('on', !v); el.setAttribute('aria-checked', String(!v)); }) });
      return { el, get: () => el.getAttribute('aria-checked') === 'true', check: () => '' };
    }
    if (type === 'choice') {
      const options = [...(empty ? [{ value: '', label: '—' }] : []), ...(p.options ?? []).map(o => ({ ...o, value: String(o.value) }))];
      const el = h('select', { class: 'ctl-select', 'aria-label': label },
        ...options.map(o => h('option', { value: o.value, selected: o.value === (current == null ? '' : String(current)), disabled: !!o.disabled }, o.label)));
      const valueOf = v => (v === '' ? null : (p.options ?? []).find(o => String(o.value) === v)?.value ?? null);
      el.addEventListener('change', () => accept(valueOf(el.value), () => { el.value = current == null ? '' : String(current); }));
      return {
        el, get: () => valueOf(el.value),
        check: () => (isRequired && valueOf(el.value) == null ? t('shared.params.required') : ''),
      };
    }
    if (type === 'number') {
      const el = h('input', { class: 'ctl-text sh-param-number', type: 'number', min: p.min ?? null, max: p.max ?? null, 'aria-label': label });
      el.value = current ?? '';
      el.addEventListener(on, () => accept(el.value === '' ? null : Number(el.value), () => { el.value = current ?? ''; }));
      return {
        el, get: () => (el.value === '' ? null : Number(el.value)),
        check: () => {
          if (el.value === '') return isRequired ? t('shared.params.required') : '';
          const n = Number(el.value);
          if (!Number.isFinite(n)) return t('shared.params.badNumber');
          if (Number.isFinite(p.min) && n < p.min) return t('shared.params.tooSmall', { min: p.min });
          if (Number.isFinite(p.max) && n > p.max) return t('shared.params.tooBig', { max: p.max });
          return '';
        },
      };
    }
    if (type === 'file' || type === 'folder') return pathControl();
    if (type === 'files') return listControl();
    // text, secret: a secret is never shown again, an empty field keeps it
    const secret = type === 'secret';
    const el = h('input', {
      class: 'ctl-text', type: secret ? 'password' : 'text', spellcheck: 'false', autocomplete: secret ? 'new-password' : 'off', 'aria-label': label,
      maxlength: p.maxLength ?? null, placeholder: secret && current ? t('shared.params.secretKept') : null,
    });
    if (!secret) el.value = current ?? '';
    el.addEventListener(on, () => {
      if (secret && !el.value) return;
      accept(el.value || null, () => { el.value = secret ? '' : current ?? ''; });
    });
    if (!live) el.addEventListener('keydown', e => { if (e.key === 'Enter') el.blur(); });
    return {
      el, get: () => (secret ? el.value || current : el.value || null),
      check: () => (isRequired && !(secret ? el.value || current : el.value) ? t('shared.params.required') : ''),
    };
  }

  /** What a value of a file or folder is called: its '~' path. */
  function shownPath(v) {
    if (!v) return '';
    if (pathAs === 'tilde') return v;
    return fs.exists(v) ? fs.tildePath(v) : t('shared.params.gone');
  }

  /** What a chosen node is kept as. */
  function refOf(node) {
    return pathAs === 'tilde' ? fs.tildePath(node.id) : node.id;
  }

  function pathControl() {
    const folder = type === 'folder';
    const tilde = pathAs === 'tilde';
    const input = h('input', {
      class: 'ctl-text', type: 'text', spellcheck: 'false', readonly: !tilde, 'aria-label': label,
      placeholder: tilde ? '~/…' : t(folder ? 'shared.params.noFolder' : 'shared.params.noFile'),
    });
    input.value = shownPath(current);
    const show = () => { input.value = shownPath(current); };
    if (tilde) {
      input.addEventListener(on, () => accept(input.value.trim() || null, show));
      if (!live) input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
    }
    const choose = pickFile && actionButton({
      label: t('shared.params.choose'),
      onClick: async () => {
        const node = await pickFile({ kind: folder ? 'folder' : 'file', title: p.label });
        if (node && accept(refOf(node), show)) show();
      },
    });
    const clear = !tilde && !isRequired && h('button', {
      class: 'ctl-btn sh-param-clear', type: 'button', title: t('shared.params.clear'), 'aria-label': t('shared.params.clearOf', { name: p.label }),
      onclick: () => { if (accept(null, show)) show(); },
    }, icon('x'));
    return {
      el: h('div', { class: 'sh-param-path' }, input, choose, clear),
      get: () => (tilde ? input.value.trim() || null : current),
      check: () => (isRequired && !(tilde ? input.value.trim() : current) ? t('shared.params.noneChosen') : ''),
    };
  }

  function listControl() {
    // Several: added one by one (files or folders), each one taken away with its ×
    current = (Array.isArray(current) ? current : current ? [current] : []).filter(v => pathAs === 'tilde' || fs.exists(v));
    const list = h('div', { class: 'sh-param-list' });
    const change = next => { if (accept(next, draw)) draw(); };
    function draw() {
      list.replaceChildren(...(current.length ? current.map((v, i) => {
        const name = shownPath(v);
        return h('div', { class: 'sh-param-item' }, icon(pathAs === 'id' && fs.get(v)?.type === 'folder' ? 'folder' : 'file'), h('code', {}, name),
          locked ? null : h('button', {
            class: 'ctl-btn sh-param-clear', type: 'button', title: t('shared.params.remove'), 'aria-label': t('shared.params.removeOf', { name }),
            onclick: () => change(current.filter((_, k) => k !== i)),
          }, icon('x')));
      }) : [h('span', { class: 'sh-param-none' }, t('shared.params.none'))]));
    }
    draw();
    const add = kind => async () => {
      const node = await pickFile({ kind, title: label });
      if (!node) return;
      const ref = refOf(node);
      if (!current.includes(ref)) change([...current, ref]);
    };
    return {
      el: h('div', { class: 'sh-param-files' }, list, pickFile ? h('div', { class: 'sh-param-add' },
        actionButton({ label: t('shared.params.addFile'), onClick: add('file') }),
        actionButton({ label: t('shared.params.addFolder'), onClick: add('folder') })) : null),
      get: () => [...current],
      check: () => (isRequired && !current.length ? t('shared.params.noneChosen') : ''),
    };
  }
}

/**
 * The params of an entry point with their labels, in a grid (label, then the control and the
 * description under it). Values left empty are not kept (a param without value takes its default).
 */
export function paramsForm(params, values = {}, { t, onChange = null, context = '', ...options } = {}) {
  let current = { ...values };
  const controls = new Map();
  const rows = Object.entries(params ?? {}).flatMap(([name, p]) => {
    const value = Object.hasOwn(current, name) ? current[name] : p.default;
    const control = paramControl(p, value, {
      ...options, t,
      label: context ? `${p.label} (${context})` : p.label,
      onChange: v => {
        const next = { ...current };
        if (v === '' || v == null || (Array.isArray(v) && !v.length)) delete next[name];
        else next[name] = v;
        if (onChange?.({ ...next }, name) === false) return false;
        current = next;
        return true;
      },
    });
    controls.set(name, control);
    return [
      h('span', { class: 'sh-param-label' }, p.label, p.required ? h('span', { class: 'sh-param-req', 'aria-hidden': 'true' }, ' *') : null),
      h('div', { class: 'sh-param-field' }, control.el, p.description ? h('small', { class: 'sh-param-hint' }, p.description) : null),
    ];
  });
  const el = h('div', { class: 'sh-params' }, rows);
  return {
    el,
    controls,
    /** The values as the controls have them now (also those not committed yet), without empty ones. */
    values: () => {
      const out = {};
      for (const [name, c] of controls) {
        const v = c.get();
        if (v !== '' && v != null && !(Array.isArray(v) && !v.length)) out[name] = v;
      }
      return out;
    },
    /** '' or the first problem, with the param's label: «Porta: at most 65535». */
    check: () => {
      for (const [name, c] of controls) {
        const problem = c.check();
        if (problem) return `${params[name].label}: ${problem}`;
      }
      return '';
    },
    focus: () => el.querySelector('input:not([readonly]), select, button')?.focus(),
  };
}
