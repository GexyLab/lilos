import { h, icon, fs, menus, selectField, textField, actionButton } from '@lilos/sdk';
import { apps } from '../registry.js';
import { pickFile } from '../filePicker.js';

/**
 * Sections of Settings → Usabilità → Menu contestuale for one menu of the registry: the entries
 * (submenu items indented) with move up/down and remove, then rows to add actions, apps,
 * separators and new "create" entries to a submenu (e.g. Nuovo).
 */
export function menuSections(menuId, { openWindow, rerender, confirmButton }) {
  const layout = menus.layout(menuId);
  const save = next => { menus.setLayout(menuId, next); rerender(); };

  // ---------- Entries ----------
  const describe = e => {
    if (e.type === 'separator') return { label: '— Separatore —', description: '' };
    if (e.type === 'submenu') return { label: e.label, description: `Sottomenu · ${e.items.length} ${e.items.length === 1 ? 'voce' : 'voci'}` };
    const a = menus.action(e.action);
    const label = e.label ?? a?.label ?? e.action;
    if (e.action === 'desktop.create') {
      const what = e.params.kind === 'folder' ? 'Crea la cartella' : 'Crea il file';
      const from = e.params.template ? ` dal modello ${fs.exists(e.params.template) ? fs.path(e.params.template) : '(file eliminato)'}` : e.params.content ? ' con un contenuto iniziale' : '';
      return { label, description: `${what} «${e.params.name}»${from}` };
    }
    if (e.action === 'app.launch') return { label, description: `Apre l’app ${apps.find(x => x.id === e.params.app)?.name ?? e.params.app}` };
    return { label, description: 'Azione' };
  };

  /** Copy of the layout with fn applied to the list holding the entry at path [i] or [i, j]. */
  const withList = (path, fn) => {
    const next = structuredClone(layout);
    const list = path.length === 1 ? next : next[path[0]].items;
    fn(list, path[path.length - 1]);
    return next;
  };
  const move = (path, step) => save(withList(path, (list, i) => {
    const j = i + step;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
  }));
  const remove = path => save(withList(path, (list, i) => list.splice(i, 1)));

  const row = (e, path, count) => {
    const { label, description } = describe(e);
    const i = path[path.length - 1];
    const btn = (glyph, title, onClick, disabled) =>
      h('button', { class: 'mm-btn', type: 'button', title, 'aria-label': `${title}: ${label}`, disabled, onclick: onClick }, icon(glyph));
    return {
      label: path.length === 2 ? `↳ ${label}` : label,
      description,
      keywords: 'menu contestuale voce separatore nuovo',
      control: h('div', { class: 'mm-ctl' },
        btn('arrowUp', 'Sposta su', () => move(path, -1), i === 0),
        btn('arrowDown', 'Sposta giù', () => move(path, 1), i === count - 1),
        btn('x', 'Togli', () => remove(path))),
    };
  };
  const rows = [];
  layout.forEach((e, i) => {
    rows.push(row(e, [i], layout.length));
    if (e.type === 'submenu') e.items.forEach((c, j) => rows.push(row(c, [i, j], e.items.length)));
  });

  // ---------- Adding ----------
  const submenus = layout.map((e, i) => [e, i]).filter(([e]) => e.type === 'submenu');
  const targetOptions = [{ value: 'root', label: 'Menu principale' }, ...submenus.map(([e, i]) => ({ value: String(i), label: `Dentro «${e.label}»` }))];
  const addTo = (target, entry) => save(withList(target === 'root' ? [0] : [Number(target), 0], list => list.push(entry)));

  const simple = menus.actions(menuId).filter(a => a.id !== 'desktop.create' && a.id !== 'app.launch');
  const actionSelect = selectField({
    value: simple[0]?.id, label: 'Voce da aggiungere',
    options: [...simple.map(a => ({ value: a.id, label: a.label })), ...apps.filter(a => a.load).map(a => ({ value: `app:${a.id}`, label: `Apri ${a.name}` }))],
  });
  const actionTarget = selectField({ value: 'root', options: targetOptions, label: 'Dove' });
  const sepTarget = selectField({ value: 'root', options: targetOptions, label: 'Dove' });

  const newTarget = submenus[0];
  const newLabel = textField({ placeholder: 'Etichetta (es. Foglio di stile)', label: 'Etichetta' });
  const newName = textField({ placeholder: 'Nome (es. stile.css)', label: 'Nome del file o della cartella' });
  const newKind = selectField({ value: 'file', options: [{ value: 'file', label: 'File' }, { value: 'folder', label: 'Cartella' }], label: 'Tipo' });
  let template = null;
  const templateBtn = actionButton({
    label: 'Modello…', onClick: async () => {
      const node = await pickFile(openWindow, { title: 'Scegli il file modello', text: 'Il nuovo file partirà con il contenuto di questo file.' });
      if (!node) return;
      template = node.id;
      templateBtn.textContent = `Modello: ${node.name}`;
    },
  });
  const note = h('small', { class: 'mm-note' });
  const addNew = () => {
    const label = newLabel.value.trim();
    const name = newName.value.trim();
    if (!label || !name) { note.textContent = 'Servono l’etichetta e il nome'; return; }
    const params = { kind: newKind.value, name, ...(template && newKind.value === 'file' && { template }) };
    addTo(String(newTarget[1]), { type: 'action', action: 'desktop.create', label, icon: params.kind === 'folder' ? 'folderPlus' : 'filePlus', params });
  };

  return [
    { title: menus.list().find(m => m.id === menuId)?.label ?? menuId, rows },
    {
      title: 'Aggiungi',
      rows: [
        {
          label: 'Voce', description: 'Un’azione o l’apertura di un’app',
          control: h('div', { class: 'mm-add' }, actionSelect, actionTarget, actionButton({
            label: 'Aggiungi', onClick: () => {
              const v = actionSelect.value;
              const entry = v.startsWith('app:')
                ? { type: 'action', action: 'app.launch', label: `Apri ${apps.find(a => a.id === v.slice(4))?.name}`, params: { app: v.slice(4) } }
                : { type: 'action', action: v };
              addTo(actionTarget.value, entry);
            },
          })),
        },
        {
          label: 'Separatore', description: 'Una linea per raggruppare le voci',
          control: h('div', { class: 'mm-add' }, sepTarget, actionButton({ label: 'Aggiungi', onClick: () => addTo(sepTarget.value, { type: 'separator' }) })),
        },
        ...(newTarget ? [{
          label: `Nuovo elemento in «${newTarget[0].label}»`,
          description: 'Crea un file o una cartella con questo nome; un file può partire dal contenuto di un modello',
          control: h('div', { class: 'mm-add' }, newLabel, newName, newKind, templateBtn, actionButton({ label: 'Aggiungi', primary: true, onClick: addNew }), note),
        }] : []),
        {
          label: 'Voci predefinite', description: menus.isCustom(menuId) ? 'Il menu è stato personalizzato' : 'Il menu è quello predefinito',
          control: confirmButton('Ripristina', 'Conferma', () => { menus.reset(menuId); rerender(); }),
        },
      ],
    },
  ];
}
