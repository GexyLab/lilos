import { h, icon, fs, menus, selectField, textField, actionButton } from '@lilos/sdk';
import { apps } from '@lilos/system';
import { pickFile } from '@lilos/system';
import { t } from './i18n.js';

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
    if (e.type === 'separator') return { label: t('menu.separator'), description: '' };
    if (e.type === 'submenu') return { label: e.label, description: t('menu.submenu', { n: e.items.length }) };
    const a = menus.action(e.action);
    const label = e.label ?? a?.label ?? e.action;
    if (e.action === 'desktop.create') {
      const name = e.params.name;
      if (e.params.kind === 'folder') return { label, description: t('menu.create.folder', { name }) };
      if (e.params.template) {
        const template = fs.exists(e.params.template) ? fs.path(e.params.template) : t('menu.create.deletedTemplate');
        return { label, description: t('menu.create.fileFromTemplate', { name, template }) };
      }
      return { label, description: e.params.content ? t('menu.create.fileWithContent', { name }) : t('menu.create.file', { name }) };
    }
    if (e.action === 'app.launch') return { label, description: t('menu.launch', { name: apps.find(x => x.id === e.params.app)?.name ?? e.params.app }) };
    return { label, description: t('menu.action') };
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
      keywords: t('menu.keywords'),
      control: h('div', { class: 'mm-ctl' },
        btn('arrowUp', t('menu.moveUp'), () => move(path, -1), i === 0),
        btn('arrowDown', t('menu.moveDown'), () => move(path, 1), i === count - 1),
        btn('x', t('common.remove'), () => remove(path))),
    };
  };
  const rows = [];
  layout.forEach((e, i) => {
    rows.push(row(e, [i], layout.length));
    if (e.type === 'submenu') e.items.forEach((c, j) => rows.push(row(c, [i, j], e.items.length)));
  });

  // ---------- Adding ----------
  const submenus = layout.map((e, i) => [e, i]).filter(([e]) => e.type === 'submenu');
  const targetOptions = [{ value: 'root', label: t('menu.target.root') }, ...submenus.map(([e, i]) => ({ value: String(i), label: t('menu.target.inside', { name: e.label }) }))];
  const addTo = (target, entry) => save(withList(target === 'root' ? [0] : [Number(target), 0], list => list.push(entry)));

  const simple = menus.actions(menuId).filter(a => a.id !== 'desktop.create' && a.id !== 'app.launch');
  const actionSelect = selectField({
    value: simple[0]?.id, label: t('menu.item.field'),
    options: [...simple.map(a => ({ value: a.id, label: a.label })), ...apps.filter(a => a.load).map(a => ({ value: `app:${a.id}`, label: t('menu.item.open', { name: a.name }) }))],
  });
  const actionTarget = selectField({ value: 'root', options: targetOptions, label: t('menu.target.label') });
  const sepTarget = selectField({ value: 'root', options: targetOptions, label: t('menu.target.label') });

  const newTarget = submenus[0];
  const newLabel = textField({ placeholder: t('menu.new.labelPlaceholder'), label: t('menu.new.labelField') });
  const newName = textField({ placeholder: t('menu.new.namePlaceholder'), label: t('menu.new.nameField') });
  const newKind = selectField({ value: 'file', options: [{ value: 'file', label: t('menu.new.kindFile') }, { value: 'folder', label: t('menu.new.kindFolder') }], label: t('menu.new.kind') });
  let template = null;
  const templateBtn = actionButton({
    label: t('menu.template.button'), onClick: async () => {
      const node = await pickFile(openWindow, { title: t('menu.template.title'), text: t('menu.template.text') });
      if (!node) return;
      template = node.id;
      templateBtn.textContent = t('menu.template.chosen', { name: node.name });
    },
  });
  const note = h('small', { class: 'mm-note' });
  const addNew = () => {
    const label = newLabel.value.trim();
    const name = newName.value.trim();
    if (!label || !name) { note.textContent = t('menu.new.missing'); return; }
    const params = { kind: newKind.value, name, ...(template && newKind.value === 'file' && { template }) };
    addTo(String(newTarget[1]), { type: 'action', action: 'desktop.create', label, icon: params.kind === 'folder' ? 'folderPlus' : 'filePlus', params });
  };

  return [
    { title: menus.list().find(m => m.id === menuId)?.label ?? menuId, rows },
    {
      title: t('common.add'),
      rows: [
        {
          label: t('menu.item.label'), description: t('menu.item.description'),
          control: h('div', { class: 'mm-add' }, actionSelect, actionTarget, actionButton({
            label: t('common.add'), onClick: () => {
              const v = actionSelect.value;
              const entry = v.startsWith('app:')
                ? { type: 'action', action: 'app.launch', label: t('menu.item.open', { name: apps.find(a => a.id === v.slice(4))?.name }), params: { app: v.slice(4) } }
                : { type: 'action', action: v };
              addTo(actionTarget.value, entry);
            },
          })),
        },
        {
          label: t('menu.separatorRow.label'), description: t('menu.separatorRow.description'),
          control: h('div', { class: 'mm-add' }, sepTarget, actionButton({ label: t('common.add'), onClick: () => addTo(sepTarget.value, { type: 'separator' }) })),
        },
        ...(newTarget ? [{
          label: t('menu.new.label', { name: newTarget[0].label }),
          description: t('menu.new.description'),
          control: h('div', { class: 'mm-add' }, newLabel, newName, newKind, templateBtn, actionButton({ label: t('common.add'), primary: true, onClick: addNew }), note),
        }] : []),
        {
          label: t('menu.defaults.label'), description: menus.isCustom(menuId) ? t('menu.defaults.custom') : t('menu.defaults.default'),
          control: confirmButton(t('common.reset'), t('common.confirm'), () => { menus.reset(menuId); rerender(); }),
        },
      ],
    },
  ];
}
