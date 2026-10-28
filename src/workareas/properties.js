import { Window, h, icon, session, textField, actionButton } from '@lilos/sdk';
import { MAX_META, LIMITS } from './store.js';

const dateLabel = t => new Date(t).toLocaleString(session.locale, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

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

  const win = new Window({ title: ws.title, subtitle: 'Proprietà della workarea', icon: 'workarea', width: 460, height: 520, minWidth: 380, minHeight: 320, controls: { minimize: false } });
  win.el.classList.add('wa-props-window');

  const title = textField({ value: ws.title, label: 'Titolo', onInput: v => { if (v.trim()) workareas.rename(id, v); } });
  title.maxLength = LIMITS.MAX_TITLE;
  title.addEventListener('change', () => { if (!title.value.trim()) title.value = workareas.get(id)?.title ?? ''; });
  const description = h('textarea', { class: 'wa-props-desc', rows: '3', maxlength: String(LIMITS.MAX_DESCRIPTION), 'aria-label': 'Descrizione', placeholder: 'A cosa serve questa workarea' });
  description.value = ws.description;
  description.addEventListener('input', () => workareas.update(id, { description: description.value }));

  const dates = h('dl', { class: 'wa-props-dates' });
  const metaList = h('div', { class: 'wa-props-meta', role: 'list' });
  const metaNote = h('p', { class: 'wa-props-note' });
  const addBtn = actionButton({ label: 'Aggiungi un metadato', onClick: () => {
    const meta = [...workareas.get(id).meta, { key: '', value: '' }];
    workareas.update(id, { meta });
    renderMeta();
    metaList.querySelector('.wa-meta-row:last-child input')?.focus();
  } });

  const renderInfo = () => {
    const w = workareas.get(id);
    if (!w) return;
    const content = workareas.contentOf(id);
    win.setTitle(w.title, 'Proprietà della workarea');
    const row = (label, value) => [h('dt', {}, label), h('dd', {}, value)];
    dates.replaceChildren(
      ...row('Creato', dateLabel(w.created)),
      ...row('Modificato', dateLabel(w.modified)),
      ...row('Stato', w.collapsed ? 'Ridotto a icona' : 'Aperto sulla scrivania'),
      ...row('Contenuto', `${content.items === 1 ? '1 elemento' : `${content.items} elementi`}, ${content.windows === 1 ? '1 finestra' : `${content.windows} finestre`}`),
      ...row('Dimensioni', `${Math.round(w.rect.w)} × ${Math.round(w.rect.h)}`));
  };

  // Rebuilt only when rows are added or removed, so typing keeps the focus
  const renderMeta = () => {
    const meta = workareas.get(id)?.meta ?? [];
    const write = (i, field, value) => {
      const next = workareas.get(id).meta.map((m, j) => (j === i ? { ...m, [field]: value } : m));
      workareas.update(id, { meta: next });
    };
    metaList.replaceChildren(...meta.map((m, i) => {
      const k = textField({ value: m.key, placeholder: 'Nome', label: `Nome del metadato ${i + 1}`, onInput: v => write(i, 'key', v) });
      const v = textField({ value: m.value, placeholder: 'Valore', label: `Valore del metadato ${i + 1}`, onInput: val => write(i, 'value', val) });
      k.maxLength = LIMITS.MAX_META_KEY;
      v.maxLength = LIMITS.MAX_META_VALUE;
      const remove = h('button', {
        class: 'wa-meta-remove', type: 'button', title: 'Togli il metadato', 'aria-label': `Togli il metadato ${m.key || i + 1}`,
        onclick: () => { workareas.update(id, { meta: workareas.get(id).meta.filter((_, j) => j !== i) }); renderMeta(); },
      }, icon('x'));
      return h('div', { class: 'wa-meta-row', role: 'listitem' }, k, v, remove);
    }));
    if (!meta.length) metaList.append(h('p', { class: 'wa-props-empty' }, 'Nessun metadato. Aggiungine per annotare, per esempio, cliente, scadenza o stato.'));
    addBtn.disabled = meta.length >= MAX_META;
    metaNote.textContent = meta.length >= MAX_META ? `Al massimo ${MAX_META} metadati.` : '';
  };

  win.body.append(h('div', { class: 'wa-props' },
    h('label', { class: 'wa-props-field' }, h('span', {}, 'Titolo'), title),
    h('label', { class: 'wa-props-field' }, h('span', {}, 'Descrizione'), description),
    h('h3', {}, 'Informazioni'), dates,
    h('h3', {}, 'Metadati personalizzati'), metaList, metaNote,
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
