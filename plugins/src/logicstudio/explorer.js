import { h, icon, fs, openMenu, messageBox } from '@lilos/sdk';
import { openFile } from '@lilos/system';
import { t } from './i18n.js';

/**
 * The project's elements: the groups Schemi, Finestre and Risorse, each with the subfolders the
 * user makes to keep them in order. Click opens; the menu (right button, or the menu key) makes,
 * renames and removes; dragging an element or a folder onto a folder of the same group moves it.
 */
export class Explorer {
  el;
  #studio;
  #open = new Set();      // folder ids expanded
  #selected = null;

  constructor(studio) {
    this.#studio = studio;
    this.el = h('div', { class: 'ls-tree', role: 'tree', 'aria-label': t('left.project') });
    this.el.addEventListener('contextmenu', e => e.preventDefault());
  }

  render() {
    const ws = this.#studio.ws;
    if (!ws) { this.el.replaceChildren(h('p', { class: 'ls-empty' }, t('explorer.none'))); return; }
    const head = h('div', { class: 'ls-tree-h' },
      h('span', { class: 'ls-fico' }, icon('blocks')),
      h('b', {}, ws.name),
      ws.project ? h('button', { type: 'button', class: 'ls-icon-btn', title: t('tb.map'), onclick: () => this.#studio.openMap() }, icon('grid')) : null);
    if (!ws.project) {
      const node = fs.get(ws.single);
      this.el.replaceChildren(head, this.#item(node, 'schemas', 0));
      return;
    }
    const rows = [head];
    for (const g of ws.groups) {
      if (!g.folder) continue;
      const count = this.#count(g.folder, g.key);
      rows.push(h('div', {
        class: 'ls-grp', role: 'treeitem', tabIndex: 0, dataset: { id: g.folder, group: g.key },
        oncontextmenu: e => this.#menu(e, { group: g.key, folder: g.folder, top: true }),
        onkeydown: e => { if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { const r = e.target.getBoundingClientRect(); this.#menu({ clientX: r.left + 20, clientY: r.bottom, preventDefault() {} }, { group: g.key, folder: g.folder, top: true }); } },
      }, h('span', {}, t(`group.${g.key}`)), h('span', { class: 'n' }, String(count)),
      h('button', { type: 'button', class: 'ls-icon-btn', title: t(`explorer.new.${g.key}`), onclick: () => this.#create(g.key, g.folder) }, icon('plus'))));
      this.#dropTarget(rows.at(-1), g.folder, g.key);
      rows.push(...this.#children(g.folder, g.key, 1));
    }
    this.el.replaceChildren(...rows);
  }

  #count(folder, group) {
    let n = 0;
    for (const c of fs.children(folder)) n += c.type === 'folder' ? this.#count(c.id, group) : this.#belongs(c, group) ? 1 : 0;
    return n;
  }

  #belongs(node, group) {
    const kind = this.#studio.ws.kindOf(node.name);
    return group === 'resources' ? !kind : kind === group;
  }

  #children(folderId, group, depth) {
    const out = [];
    const kids = fs.children(folderId).sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1));
    for (const n of kids) {
      if (n.type === 'folder') {
        const open = this.#open.has(n.id);
        const row = h('div', {
          class: `ls-ti folder${this.#selected === n.id ? ' on' : ''}`, role: 'treeitem', 'aria-expanded': String(open), tabIndex: 0, draggable: true,
          style: `padding-left:${8 + depth * 14}px`, dataset: { id: n.id },
          onclick: () => { open ? this.#open.delete(n.id) : this.#open.add(n.id); this.#selected = n.id; this.render(); },
          oncontextmenu: e => this.#menu(e, { group, folder: n.id, node: n }),
          onkeydown: e => this.#key(e, { group, folder: n.id, node: n }),
        }, h('span', { class: 'chev' }, open ? '▾' : '▸'), icon(open ? 'folderOpen' : 'folder'), h('span', { class: 'nm' }, n.name));
        this.#draggable(row, n);
        this.#dropTarget(row, n.id, group);
        out.push(row);
        if (open) out.push(...this.#children(n.id, group, depth + 1));
      } else if (this.#belongs(n, group)) {
        out.push(this.#item(n, group, depth));
      }
    }
    return out;
  }

  #item(n, group, depth) {
    const ws = this.#studio.ws;
    const path = ws.single ? n.name : ws.relative(n.id);
    const name = ws.project && group !== 'resources' ? ws.nameOf(group, path) ?? n.name : n.name;
    const isMain = group === 'windows' && ws.project?.data.main === name;
    const entry = group === 'windows' && ws.project?.data.entrypoints?.[name];
    const doc = ws.loaded(path);
    const glyph = group === 'schemas' ? 'blocks' : group === 'windows' ? 'window' : 'file';
    const row = h('div', {
      class: `ls-ti${this.#selected === n.id ? ' on' : ''}`, role: 'treeitem', tabIndex: 0, draggable: !ws.single,
      style: `padding-left:${8 + depth * 14 + 12}px`, dataset: { id: n.id },
      title: path,
      onclick: () => { this.#selected = n.id; this.#activate(group, path, n); this.render(); },
      oncontextmenu: e => this.#menu(e, { group, node: n, path, name }),
      onkeydown: e => this.#key(e, { group, node: n, path, name }),
    }, icon(glyph), h('span', { class: 'nm' }, name),
    doc?.dirty ? h('span', { class: 'dot', title: t('explorer.unsaved') }) : null,
    isMain ? h('span', { class: 'star', title: t('explorer.main') }, '★') : null,
    entry ? h('span', { class: 'ep', title: t(`entry.${entry.kind}`) }, icon('link')) : null);
    if (!ws.single) this.#draggable(row, n);
    return row;
  }

  #activate(group, path, node) {
    if (group === 'resources') openFile(node);
    else this.#studio.openElement(group, path);
  }

  #key(e, ctx) {
    if (e.key === 'Enter') { e.preventDefault(); if (ctx.node.type === 'folder') e.target.click(); else this.#activate(ctx.group, ctx.path, ctx.node); }
    else if (e.key === 'F2') { e.preventDefault(); this.#rename(ctx.node, ctx.name); }
    else if (e.key === 'Delete') { e.preventDefault(); this.#remove(ctx.node, ctx.name); }
    else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      this.#menu({ clientX: r.left + 24, clientY: r.bottom, preventDefault() {} }, ctx);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const all = [...this.el.querySelectorAll('[role=treeitem]')];
      all[all.indexOf(e.target) + (e.key === 'ArrowDown' ? 1 : -1)]?.focus();
    }
  }

  #menu(e, { group, folder = null, node = null, path = null, name = null, top = false }) {
    e.preventDefault();
    const ws = this.#studio.ws;
    if (!ws?.project) return;
    const items = [];
    const where = folder ?? (node ? node.parent : null);
    if (folder || top) {
      if (group !== 'resources') items.push({ label: t(`explorer.new.${group}`), icon: group === 'schemas' ? 'blocks' : 'window', action: () => this.#create(group, where) });
      items.push({ label: t('explorer.newFolder'), icon: 'folderPlus', action: () => this.#newFolder(where) });
    }
    if (node?.type === 'file') {
      items.push({ label: t('explorer.open'), icon: 'open', action: () => this.#activate(group, path, node) });
      if (group === 'windows' && ws.project.data.main !== name) items.push({ label: t('explorer.makeMain'), icon: 'star', action: () => { ws.project.setMain(name); ws.save(ws.project); this.render(); } });
    }
    if (node && !top) {
      if (items.length) items.push('-');
      items.push({ label: t('explorer.rename'), icon: 'pencil', shortcut: 'F2', action: () => this.#rename(node, name) });
      items.push({ label: t('explorer.remove'), icon: 'trash', danger: true, shortcut: 'Canc', action: () => this.#remove(node, name) });
    }
    if (items.length) items.push('-');
    items.push({ label: t('menu.docs'), icon: 'help', action: () => this.#studio.showDoc({ schemas: 'ide/schemas', windows: 'ide/windows' }[group] ?? 'ide/projects') });
    openMenu(e.clientX, e.clientY, items);
  }

  async #create(group, folderId) {
    const ws = this.#studio.ws;
    const res = await messageBox(this.#studio.win, {
      icon: group === 'schemas' ? 'blocks' : 'window', title: t(`explorer.new.${group}`),
      fields: [{ name: 'name', label: t('explorer.name'), value: '', required: true, maxLength: 60, pattern: /^[^/\\:*?"<>|]+$/, invalid: t('explorer.badName') }],
      buttons: ['cancel', { value: 'ok', label: t('common.create'), primary: true }],
      validate: v => (String(v.name).trim() in ws.project.data[group] ? t('ws.nameTaken', { name: String(v.name).trim() }) : true),
    });
    if (res?.button !== 'ok') return;
    try {
      const path = await ws.createElement(group, folderId, res.values.name);
      this.#open.add(folderId);
      this.render();
      this.#studio.openElement(group, path);
    } catch (err) {
      messageBox(this.#studio.win, { icon: 'error', title: t('explorer.failed'), text: err.message });
    }
  }

  async #newFolder(parentId) {
    const res = await messageBox(this.#studio.win, {
      icon: 'folderPlus', title: t('explorer.newFolder'),
      fields: [{ name: 'name', label: t('explorer.name'), value: t('ws.newFolder'), required: true, maxLength: 60, pattern: /^[^/\\:*?"<>|]+$/, invalid: t('explorer.badName') }],
      buttons: ['cancel', { value: 'ok', label: t('common.create'), primary: true }],
    });
    if (res?.button !== 'ok') return;
    const id = this.#studio.ws.createFolder(parentId, res.values.name);
    this.#open.add(parentId);
    this.#selected = id;
    this.render();
  }

  async #rename(node, name) {
    const res = await messageBox(this.#studio.win, {
      icon: 'pencil', title: t('explorer.rename'),
      fields: [{ name: 'name', label: t('explorer.name'), value: name ?? node.name, required: true, maxLength: 60, pattern: /^[^/\\:*?"<>|]+$/, invalid: t('explorer.badName') }],
      buttons: ['cancel', { value: 'ok', label: t('explorer.rename'), primary: true }],
    });
    if (res?.button !== 'ok') return;
    try {
      await this.#studio.ws.rename(node.id, res.values.name);
      for (const tab of this.#studio.tabs) if (tab.doc) tab.path = this.#studio.ws.relative(this.#studio.ws.fileOf(tab.doc)) ?? tab.path;
      this.#studio.renderTabs();
    } catch (err) {
      messageBox(this.#studio.win, { icon: 'error', title: t('explorer.failed'), text: err.message });
    }
  }

  async #remove(node, name) {
    const res = await messageBox(this.#studio.win, {
      icon: 'warning', title: t(node.type === 'folder' ? 'explorer.removeFolder' : 'explorer.removeItem', { name: name ?? node.name }),
      text: t(node.type === 'folder' ? 'explorer.removeFolderText' : 'explorer.removeItemText'),
      buttons: ['cancel', { value: 'ok', label: t('explorer.remove'), danger: true }],
    });
    if (res !== 'ok') return;
    const path = this.#studio.ws.relative(node.id);
    for (const tab of [...this.#studio.tabs]) if (tab.path && (tab.path === path || tab.path.startsWith(`${path}/`))) { tab.view.destroy?.(); this.#studio.tabs.splice(this.#studio.tabs.indexOf(tab), 1); }
    await this.#studio.ws.remove(node.id);
    if (!this.#studio.tabs.some(x => x.key === this.#studio.active)) this.#studio.show('home');
    this.#studio.renderTabs();
  }

  // ------------------------------------------------------------------ drag and drop between folders

  #draggable(row, node) {
    row.addEventListener('dragstart', e => {
      e.dataTransfer.setData('application/x-logicstudio-node', node.id);
      e.dataTransfer.effectAllowed = 'move';
    });
  }

  #dropTarget(row, folderId, group) {
    row.addEventListener('dragover', e => {
      if (!e.dataTransfer.types.includes('application/x-logicstudio-node')) return;
      e.preventDefault();
      row.classList.add('drop');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drop'));
    row.addEventListener('drop', async e => {
      row.classList.remove('drop');
      const id = e.dataTransfer.getData('application/x-logicstudio-node');
      if (!id || id === folderId) return;
      e.preventDefault();
      const node = fs.get(id);
      const ws = this.#studio.ws;
      // An element stays in its group; a folder not inside itself
      if (!node || (node.type === 'file' && !this.#belongs(node, group)) || fs.isInside(folderId, id)) return;
      const groupFolder = ws.groups.find(g => g.key === group)?.folder;
      if (!fs.isInside(id, groupFolder)) return;
      try {
        await ws.move(id, folderId);
        this.#open.add(folderId);
        for (const tab of this.#studio.tabs) if (tab.doc) tab.path = ws.relative(ws.fileOf(tab.doc)) ?? tab.path;
        this.render();
      } catch (err) {
        messageBox(this.#studio.win, { icon: 'error', title: t('explorer.failed'), text: err.message });
      }
    });
  }
}
