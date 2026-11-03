import { h, icon } from '@lilos/sdk';
import './kvTable.css';

/**
 * A table of name and value rows that the user edits (NetTest's parameters, headers, form fields
 * and variables): a check box to turn a row off, the two fields, an optional third column, and a
 * last empty row that becomes a new one as soon as something is typed in it.
 *
 *   const table = kvTable({ t, rows, onChange, columns?, secret?, mono?, keys?, values?, placeholder? })
 *     t           the app's t (its locales have the shared.kv.* strings)
 *     rows        [{ key, value, enabled?, secret?, … }]: changed in place, onChange(rows) after
 *     columns     more columns after the value: [{ field, placeholder, width?, options? }] (options: a select)
 *     secret      a lock button per row: { onSecret(row, on) → Promise | void, label(row) → text shown in
 *                 place of the value when it is set (e.g. '••••' or «sealed») }; a secret row's value
 *                 is typed once and never shown again
 *     mono        values in the fixed-width font
 *     keys        names to suggest for the first column (a datalist: HTTP headers)
 *     values      (row) → names to suggest for the value
 *     placeholder { key, value }
 *   table.el        the element
 *   table.render()  draws the rows again (after they changed outside)
 *   table.focusLast()
 */
let lists = 0;

export function kvTable({ t, rows, onChange, columns = [], secret = null, mono = false, keys = null, values = null, placeholder = {} }) {
  const el = h('div', { class: `kv${mono ? ' mono' : ''}`, role: 'table' });
  const listId = keys ? `kv-keys-${++lists}` : null;
  const changed = () => onChange?.(rows);

  const field = (row, name, ph, extra = {}) => {
    const input = h('input', {
      class: 'kv-in', type: 'text', value: String(row[name] ?? ''), placeholder: ph ?? '', spellcheck: 'false', autocomplete: 'off',
      'aria-label': ph ?? name, ...extra,
      oninput: () => {
        row[name] = input.value;
        if (row === draft && input.value) {
          rows.push(row);
          draft = blank();
          el.append(line(draft, true));
          input.closest('.kv-row').classList.remove('draft');
        }
        changed();
      },
    });
    return input;
  };
  const blank = () => ({ key: '', value: '', enabled: true });
  let draft = blank();

  const line = (row, isDraft = false) => {
    const tr = h('div', { class: `kv-row${isDraft ? ' draft' : ''}${row.enabled === false ? ' off' : ''}`, role: 'row' });
    const on = h('input', {
      type: 'checkbox', class: 'kv-on', checked: row.enabled !== false, 'aria-label': t('shared.kv.enabled'),
      onchange: () => { row.enabled = on.checked; tr.classList.toggle('off', !on.checked); changed(); },
    });
    const cells = [h('span', { class: 'kv-c on' }, on), h('span', { class: 'kv-c' }, field(row, 'key', placeholder.key ?? t('shared.kv.key'), listId ? { list: listId } : {}))];
    if (secret && row.secret) {
      const shown = h('span', { class: 'kv-sealed' }, icon('lock'), secret.label(row));
      cells.push(h('span', { class: 'kv-c' }, shown));
    } else {
      const own = values?.(row);
      const id = own?.length ? `kv-vals-${++lists}` : null;
      cells.push(h('span', { class: 'kv-c' }, field(row, 'value', placeholder.value ?? t('shared.kv.value'), id ? { list: id } : {}), id ? h('datalist', { id }, ...own.map(v => h('option', { value: v }))) : null));
    }
    for (const col of columns) {
      if (col.options) {
        const sel = h('select', { class: 'kv-in', 'aria-label': col.placeholder, onchange: () => { row[col.field] = sel.value; if (row !== draft) changed(); } },
          ...col.options.map(o => h('option', { value: o.value, selected: String(row[col.field] ?? col.options[0].value) === o.value }, o.label)));
        cells.push(h('span', { class: 'kv-c', style: col.width ? `flex: 0 0 ${col.width}px` : '' }, sel));
      } else cells.push(h('span', { class: 'kv-c', style: col.width ? `flex: 0 0 ${col.width}px` : '' }, field(row, col.field, col.placeholder)));
    }
    // Made for the empty last row too (hidden there): typing in it makes it a row like the others
    const tools = h('span', { class: 'kv-c tools' });
    if (secret) {
      tools.append(h('button', {
        type: 'button', class: `kv-btn${row.secret ? ' on' : ''}`, title: row.secret ? t('shared.kv.unseal') : t('shared.kv.seal'), 'aria-pressed': String(!!row.secret),
        onclick: async () => {
          await secret.onSecret(row, !row.secret);
          render();
          changed();
        },
      }, icon(row.secret ? 'lock' : 'lockOpen')));
    }
    {
      tools.append(h('button', {
        type: 'button', class: 'kv-btn', title: t('shared.kv.remove'),
        onclick: () => {
          rows.splice(rows.indexOf(row), 1);
          tr.remove();
          changed();
        },
      }, icon('x')));
    }
    cells.push(tools);
    tr.append(...cells);
    return tr;
  };

  function render() {
    draft = blank();
    el.replaceChildren(...rows.map(r => line(r)), line(draft, true));
    if (listId) el.append(h('datalist', { id: listId }, ...keys.map(k => h('option', { value: k }))));
  }
  render();
  return {
    el, render,
    focusLast: () => el.querySelector('.kv-row.draft .kv-in')?.focus(),
  };
}
