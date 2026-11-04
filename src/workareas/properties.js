import { Window, h, icon, session, textField, actionButton, locale } from '@lilos/sdk';
import { MAX_META, LIMITS } from './store.js';

const { t } = locale.define('lilos:workareaProperties', {
  en: { strings: {
    subtitle: 'Work area properties', title: 'Title', description: 'Description', placeholder: 'What this work area is for',
    addMeta: 'Add a metadata field', created: 'Created', modified: 'Modified', state: 'State',
    collapsed: 'Minimized to an icon', open: 'Open on the desk', contents: 'Contents',
    items: { one: '{n} item', other: '{n} items' }, windows: { one: '{n} window', other: '{n} windows' },
    contentsValue: '{items}, {windows}', size: 'Size',
    metaName: 'Name', metaNameLabel: 'Name of metadata field {n}', metaValue: 'Value', metaValueLabel: 'Value of metadata field {n}',
    removeMeta: 'Remove the metadata field', removeMetaLabel: 'Remove the metadata field {name}',
    noMeta: 'No metadata. Add some to note, for example, customer, deadline or status.',
    maxMeta: 'At most {max} metadata fields.', info: 'Information', customMeta: 'Custom metadata',
  } },
});

const dateLabel = time => new Date(time).toLocaleString(session.locale, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * Properties of a workarea: title, description, dates, what it contains, custom metadata
 * (key → value, added and removed by the user). Changes are saved as they are typed.
 * One window per workarea (key `workarea:<id>`); it closes when the workarea is deleted.
 */
export function openProperties(wm, workareas, id) {
  const key = `workarea:${id}`;
  const open = wm.get(key);
  if (open) return wm.show(open);
  const ws = workareas.get(id);
  if (!ws) return;

  const win = new Window({ title: ws.title, subtitle: t('subtitle'), icon: 'workarea', width: 460, height: 520, minWidth: 380, minHeight: 320, controls: { minimize: false } });
  win.el.classList.add('wa-props-window');

  const title = textField({ value: ws.title, label: t('title'), onInput: v => { if (v.trim()) workareas.rename(id, v); } });
  title.maxLength = LIMITS.MAX_TITLE;
  title.addEventListener('change', () => { if (!title.value.trim()) title.value = workareas.get(id)?.title ?? ''; });
  const description = h('textarea', { class: 'wa-props-desc', rows: '3', maxlength: String(LIMITS.MAX_DESCRIPTION), 'aria-label': t('description'), placeholder: t('placeholder') });
  description.value = ws.description;
  description.addEventListener('input', () => workareas.update(id, { description: description.value }));

  const dates = h('dl', { class: 'wa-props-dates' });
  const metaList = h('div', { class: 'wa-props-meta', role: 'list' });
  const metaNote = h('p', { class: 'wa-props-note' });
  const addBtn = actionButton({ label: t('addMeta'), onClick: () => {
    const meta = [...workareas.get(id).meta, { key: '', value: '' }];
    workareas.update(id, { meta });
    renderMeta();
    metaList.querySelector('.wa-meta-row:last-child input')?.focus();
  } });

  const renderInfo = () => {
    const w = workareas.get(id);
    if (!w) return;
    const content = workareas.contentOf(id);
    win.setTitle(w.title, t('subtitle'));
    const row = (label, value) => [h('dt', {}, label), h('dd', {}, value)];
    dates.replaceChildren(
      ...row(t('created'), dateLabel(w.created)),
      ...row(t('modified'), dateLabel(w.modified)),
      ...row(t('state'), w.collapsed ? t('collapsed') : t('open')),
      ...row(t('contents'), t('contentsValue', { items: t('items', { n: content.items }), windows: t('windows', { n: content.windows }) })),
      ...row(t('size'), `${Math.round(w.rect.w)} × ${Math.round(w.rect.h)}`));
  };

  // Rebuilt only when rows are added or removed, so typing keeps the focus
  const renderMeta = () => {
    const meta = workareas.get(id)?.meta ?? [];
    const write = (i, field, value) => {
      const next = workareas.get(id).meta.map((m, j) => (j === i ? { ...m, [field]: value } : m));
      workareas.update(id, { meta: next });
    };
    metaList.replaceChildren(...meta.map((m, i) => {
      const k = textField({ value: m.key, placeholder: t('metaName'), label: t('metaNameLabel', { n: i + 1 }), onInput: v => write(i, 'key', v) });
      const v = textField({ value: m.value, placeholder: t('metaValue'), label: t('metaValueLabel', { n: i + 1 }), onInput: val => write(i, 'value', val) });
      k.maxLength = LIMITS.MAX_META_KEY;
      v.maxLength = LIMITS.MAX_META_VALUE;
      const remove = h('button', {
        class: 'wa-meta-remove', type: 'button', title: t('removeMeta'), 'aria-label': t('removeMetaLabel', { name: m.key || i + 1 }),
        onclick: () => { workareas.update(id, { meta: workareas.get(id).meta.filter((_, j) => j !== i) }); renderMeta(); },
      }, icon('x'));
      return h('div', { class: 'wa-meta-row', role: 'listitem' }, k, v, remove);
    }));
    if (!meta.length) metaList.append(h('p', { class: 'wa-props-empty' }, t('noMeta')));
    addBtn.disabled = meta.length >= MAX_META;
    metaNote.textContent = meta.length >= MAX_META ? t('maxMeta', { max: MAX_META }) : '';
  };

  win.body.append(h('div', { class: 'wa-props' },
    h('label', { class: 'wa-props-field' }, h('span', {}, t('title')), title),
    h('label', { class: 'wa-props-field' }, h('span', {}, t('description')), description),
    h('h3', {}, t('info')), dates,
    h('h3', {}, t('customMeta')), metaList, metaNote,
    h('div', { class: 'wa-props-actions' }, addBtn)));

  renderInfo();
  renderMeta();
  const off = workareas.on('change', changed => {
    if (changed !== id) return;
    if (!workareas.get(id)) return win.emit('close');
    if (document.activeElement !== title && title.value !== workareas.get(id).title) title.value = workareas.get(id).title;
    renderInfo();
  });
  win.on('destroy', off);
  wm.open(win, { key, center: workareas.centerOf(id), bounds: workareas.boundsOf(id) });
  title.focus();
}
