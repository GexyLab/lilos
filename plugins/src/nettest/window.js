import { Window, h, icon, fs, openMenu, messageBox, resizeHandle, storage, notifications, calls } from '@lilos/sdk';
import * as system from '@lilos/system';
import { TabBar } from '../shared/TabBar.js';
import { RequestView, methodClass } from './request.js';
import { LiveView } from './live.js';
import { FolderView } from './folder.js';
import { openEnvironments } from './envs.js';
import { openRunner } from './run.js';
import { importDialog, codeDialog, scheduleCollection, cookiesDialog } from './dialogs.js';
import { PROTOCOLS, protocolOf, newRequest, newFolder, find, walk, cloneItem, EXT } from './model.js';
import { store, MINE_KEY } from './store.js';
import { t } from './i18n.js';

/**
 * NetTest's window: on the left the collections open (and the history), on the right the tabs of
 * the requests open, each with its editor (request.js, live.js) or the settings of a folder or a
 * collection (folder.js). The tabs and the width of the sidebar come back when the window does
 * (getState).
 *
 *   tab: { key: '<collection key>/<item id>' | '<collection key>/', col, id, view }
 */
const SIDE = 'nettest.side';
const OPEN_FOLDERS = 'nettest.folders';
export const windows = new Set();

export class NetTestWindow {
  tabs = [];
  active = null;
  #side = 'collections';
  #query = '';
  #folded = new Set(storage.get(OPEN_FOLDERS, []));

  constructor({ args = {}, openWindow }) {
    this.openWindow = openWindow;
    store.load();
    this.win = new Window({ title: t('app.name'), icon: 'globe', width: 1180, height: 720 });
    this.win.getState = () => ({ tabs: this.tabs.map(x => x.key), active: this.active?.key ?? null });
    this.win.canClose = () => this.#canClose();
    const abort = new AbortController();
    this.signal = abort.signal;
    this.win.on('destroy', () => { abort.abort(); this.offs.forEach(off => off()); this.tabs.forEach(x => x.view?.destroy?.()); windows.delete(this); });
    windows.add(this);

    this.bar = new TabBar({ t, signal: this.signal, label: t('tabs.label'), newLabel: t('tabs.new') });
    this.bar.on('select', key => this.select(key));
    this.bar.on('close', key => this.closeTab(key));
    this.bar.on('new', () => this.newRequest(MINE_KEY, 'http'));
    this.bar.on('move', ({ key, index }) => { const tab = this.tabs.find(x => x.key === key); this.tabs.splice(this.tabs.indexOf(tab), 1); this.tabs.splice(index, 0, tab); this.#drawTabs(); });
    this.bar.on('menu', ({ key, x, y }) => openMenu(x, y, [
      { label: t('tabs.close'), action: () => this.closeTab(key) },
      { label: t('tabs.closeOthers'), action: () => this.tabs.filter(tb => tb.key !== key).forEach(tb => this.closeTab(tb.key)) },
    ]));

    this.envSelect = h('select', { class: 'ctl-select nx-envsel', 'aria-label': t('env.choose'), onchange: () => { const tab = this.active; if (tab) store.setEnv(tab.col, this.envSelect.value || null); } });
    this.tree = h('div', { class: 'nx-tree', role: 'tree', 'aria-label': t('side.collections') });
    this.side = h('aside', { class: 'nx-side' });
    this.main = h('div', { class: 'nx-main' });
    this.empty = h('div', { class: 'nx-empty' });
    const width = Number(storage.get(SIDE, 0)) || 260;
    this.side.style.width = `${width}px`;
    const handle = resizeHandle({ get: () => this.side.offsetWidth, set: (px, final) => { this.side.style.width = `${px}px`; if (final) storage.set(SIDE, px); }, min: 180, max: 520, reset: 260, label: t('side.resize'), host: this.side });

    const tools = h('div', { class: 'nx-tools' },
      h('button', { type: 'button', class: 'ctl-btn primary', onclick: e => this.#newMenu(e.currentTarget) }, icon('plus'), t('tools.new')),
      h('button', { type: 'button', class: 'ctl-btn', onclick: () => importDialog(this) }, icon('download'), t('tools.import')),
      h('button', { type: 'button', class: 'ctl-btn', onclick: () => this.openCollectionFile() }, icon('folderOpen'), t('tools.open')),
      h('span', { class: 'nx-sep' }),
      icon('globe', 'ico nx-envico'), this.envSelect,
      h('button', { type: 'button', class: 'nx-icon', title: t('env.manage'), onclick: () => this.environments() }, icon('gear')),
      h('span', { class: 'nx-grow' }),
      h('button', { type: 'button', class: 'ctl-btn', onclick: () => cookiesDialog(this) }, t('tools.cookies')),
      h('button', { type: 'button', class: 'ctl-btn', onclick: () => this.run() }, icon('play'), t('tools.run')),
      h('button', { type: 'button', class: 'ctl-btn', onclick: () => this.schedule() }, icon('clock'), t('tools.schedule')),
      h('button', { type: 'button', class: 'ctl-btn', title: t('tools.saveKeys'), onclick: () => this.save() }, icon('save'), t('tools.save')));
    this.body = h('div', { class: 'nx-body' }, this.side, handle, h('div', { class: 'nx-work' }, this.bar.el, this.main));
    this.win.body.append(h('div', { class: 'nx' }, tools, this.body));
    this.win.body.addEventListener('keydown', e => this.#keys(e));

    this.offs = [
      store.on('collections', () => { this.#drawSide(); this.#drawTabs(); this.#drawEnv(); }),
      store.on('change', key => { if (key !== this.#editing) this.#drawTree(); }),
      store.on('history', () => { if (this.#side === 'history') this.#drawTree(); }),
      store.on('env', () => this.#drawEnv()),
    ];

    this.#drawSide();
    this.#restore(args);
    // The protocols the kernel has (gRPC and MQTT come with their modules): the others show, off, saying what is missing
    calls.info().then(info => { this.protocols = new Set(info.protocols.map(x => x.id)); }, () => {});
  }

  #editing = null;
  protocols = null;   // ids the kernel offers, once known

  /** The menu items to make a request of each protocol (folderId: inside that folder). */
  #protocolItems(col, folderId = null) {
    return PROTOCOLS.map(p => {
      const missing = p.module && this.protocols && !this.protocols.has(p.id);
      return { label: missing ? t('menu.needsModule', { protocol: p.label, module: p.module }) : p.label, disabled: !!missing, action: () => this.newRequest(col, p.id, folderId) };
    });
  }

  async #restore(args) {
    if (typeof args?.file === 'string') {
      try { const c = await store.openFile(args.file); this.openItem(c.key, null); } catch (err) { this.notice(err.message); }
    }
    for (const key of Array.isArray(args?.tabs) ? args.tabs : []) {
      const [col, id] = String(key).split('/');
      if (store.get(col) || (await store.openFile(col).catch(() => null))) this.openItem(col, id || null, { quiet: true });
    }
    if (args?.active) this.select(args.active);
    if (!this.tabs.length) this.#drawTabs();
  }

  /** A .nettest file given to this window (opened again with a file): its collection opens and shows. */
  async openFileArg(id) {
    try {
      const entry = await store.openFile(id);
      this.#folded.delete(entry.key);
      this.openItem(entry.key, null);
    } catch (err) { this.notice(err.message, 'error'); }
  }

  notice(text, level = 'info') {
    notifications?.send?.({ text: String(text), level }).catch(() => {});
  }

  // ---------- Sidebar ----------

  #drawSide() {
    const seg = h('div', { class: 'nx-sideseg' }, ...['collections', 'history'].map(s => h('button', { type: 'button', class: this.#side === s ? 'on' : '', onclick: () => { this.#side = s; this.#drawSide(); } }, icon(s === 'history' ? 'clock' : 'list'), t(`side.${s}`))));
    const search = h('input', { class: 'ctl-text nx-search', type: 'search', placeholder: t('side.search'), value: this.#query, oninput: () => { this.#query = search.value.toLowerCase(); this.#drawTree(); } });
    this.side.replaceChildren(seg, search, this.tree);
    this.#drawTree();
  }

  #drawTree() {
    if (this.#side === 'history') return this.#drawHistory();
    const rows = [];
    const q = this.#query;
    for (const entry of store.list) {
      const c = entry.data;
      const open = !this.#folded.has(entry.key);
      rows.push(h('div', {
        class: `nx-node col${this.active?.col === entry.key && !this.active.id ? ' sel' : ''}`, role: 'treeitem', 'aria-expanded': String(open), tabindex: '0',
        onclick: () => this.#fold(entry.key), ondblclick: () => this.openItem(entry.key, null),
        oncontextmenu: e => { e.preventDefault(); this.#colMenu(entry, e.clientX, e.clientY); },
      }, icon(open ? 'arrowDown' : 'arrowRight', 'ico nx-caret'), icon(entry.file ? 'file' : 'star'), h('span', { class: 'nx-name' }, store.nameOf(entry)), entry.dirty ? h('span', { class: 'nx-dirty', title: t('side.unsaved') }) : null,
      h('button', { type: 'button', class: 'nx-icon nx-more', title: t('side.menu'), onclick: e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); this.#colMenu(entry, r.left, r.bottom); } }, icon('list'))));
      if (!open && !q) continue;
      const visible = item => !q || item.name.toLowerCase().includes(q) || (item.url ?? '').toLowerCase().includes(q) || (item.type === 'folder' && item.items.some(visible));
      const draw = (items, depth) => {
        for (const item of items) {
          if (!visible(item)) continue;
          const key = `${entry.key}/${item.id}`;
          if (item.type === 'folder') {
            const fOpen = q || !this.#folded.has(key);
            rows.push(h('div', {
              class: `nx-node folder${this.active?.key === key ? ' sel' : ''}`, style: `--depth:${depth}`, role: 'treeitem', 'aria-expanded': String(!!fOpen), tabindex: '0',
              onclick: () => this.#fold(key), ondblclick: () => this.openItem(entry.key, item.id),
              oncontextmenu: e => { e.preventDefault(); this.#itemMenu(entry, item, e.clientX, e.clientY); },
              draggable: 'true', ondragstart: e => this.#dragStart(e, entry, item), ondragover: e => this.#dragOver(e), ondrop: e => this.#drop(e, entry, item),
            }, icon(fOpen ? 'arrowDown' : 'arrowRight', 'ico nx-caret'), icon(fOpen ? 'folderOpen' : 'folder'), h('span', { class: 'nx-name' }, item.name || t('item.unnamedFolder'))));
            if (fOpen) draw(item.items, depth + 1);
          } else {
            const p = protocolOf(item.protocol);
            rows.push(h('div', {
              class: `nx-node req${this.active?.key === key ? ' sel' : ''}`, style: `--depth:${depth}`, role: 'treeitem', tabindex: '0',
              onclick: () => this.openItem(entry.key, item.id), onkeydown: e => { if (e.key === 'Enter') this.openItem(entry.key, item.id); },
              oncontextmenu: e => { e.preventDefault(); this.#itemMenu(entry, item, e.clientX, e.clientY); },
              draggable: 'true', ondragstart: e => this.#dragStart(e, entry, item), ondragover: e => this.#dragOver(e), ondrop: e => this.#drop(e, entry, item),
            }, item.protocol === 'http' ? h('span', { class: `nx-m ${methodClass(item.method)}` }, item.method.slice(0, 6)) : h('span', { class: `nx-m p-${item.protocol}` }, p.label.slice(0, 4)),
            h('span', { class: 'nx-name' }, item.name || item.url || t('item.unnamed'))));
          }
        }
      };
      draw(c.items, 1);
      if (!c.items.length && !q) rows.push(h('button', { type: 'button', class: 'nx-node add', style: '--depth:1', onclick: () => this.newRequest(entry.key, 'http') }, icon('plus'), t('side.firstRequest')));
    }
    this.tree.replaceChildren(...rows);
  }

  #drawHistory() {
    const q = this.#query;
    const list = store.history.filter(x => !q || `${x.method} ${x.url} ${x.name}`.toLowerCase().includes(q));
    const day = at => new Date(at).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    const rows = [];
    let last = '';
    for (const x of list) {
      const d = day(x.at);
      if (d !== last) { rows.push(h('h6', { class: 'nx-day' }, d)); last = d; }
      rows.push(h('div', {
        class: 'nx-node hist', tabindex: '0', title: `${x.method} ${x.url}`, onclick: () => this.#openHistory(x),
      }, x.protocol === 'http' || x.protocol === 'graphql' ? h('span', { class: `nx-m ${methodClass(x.method)}` }, String(x.method).slice(0, 6)) : h('span', { class: `nx-m p-${x.protocol}` }, protocolOf(x.protocol).label.slice(0, 4)),
      h('span', { class: 'nx-name' }, x.url), h('span', { class: `nx-st ${x.error ? 's5' : x.status >= 400 ? 's4' : 's2'}` }, x.error ? '!' : String(x.status ?? ''))));
    }
    if (list.length) rows.push(h('button', { type: 'button', class: 'nx-link', onclick: () => store.clearHistory() }, icon('trash'), t('side.clearHistory')));
    else rows.push(h('p', { class: 'nx-dim nx-pad' }, t('side.noHistory')));
    this.tree.replaceChildren(...rows);
  }

  #openHistory(x) {
    const entry = store.get(x.key);
    if (entry && find(entry.data, x.item)) return this.openItem(x.key, x.item);
    if (!x.snapshot) return this.notice(t('side.historyGone'));
    const copy = { ...cloneItem(x.snapshot), name: x.snapshot.name || x.url };
    store.get(MINE_KEY).data.items.push(copy);
    store.touch(MINE_KEY);
    this.openItem(MINE_KEY, copy.id);
  }

  #fold(key) {
    if (this.#folded.has(key)) this.#folded.delete(key); else this.#folded.add(key);
    storage.set(OPEN_FOLDERS, [...this.#folded].slice(-500));
    this.#drawTree();
  }

  // Dragging inside a collection: onto a folder puts it inside, onto a request puts it before
  #dragStart(e, entry, item) {
    e.dataTransfer.setData('application/x-nettest', JSON.stringify({ col: entry.key, id: item.id }));
    e.dataTransfer.effectAllowed = 'move';
  }

  #dragOver(e) {
    if (e.dataTransfer.types.includes('application/x-nettest')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
  }

  #drop(e, entry, target) {
    e.preventDefault();
    let from;
    try { from = JSON.parse(e.dataTransfer.getData('application/x-nettest')); } catch { return; }
    if (from.id === target.id) return;
    const src = store.get(from.col)?.data;
    const at = src && find(src, from.id);
    if (!at) return;
    // Not into itself or one of its folders
    if (at.item.type === 'folder' && (at.item.id === target.id || !walk(at.item.items, x => x.id !== target.id))) return;
    at.list.splice(at.list.indexOf(at.item), 1);
    const dest = find(entry.data, target.id);
    if (target.type === 'folder') target.items.push(at.item);
    else dest.list.splice(dest.list.indexOf(target), 0, at.item);
    store.touch(from.col);
    if (from.col !== entry.key) {
      store.touch(entry.key);
      for (const tab of this.tabs.filter(x => x.col === from.col && x.id === at.item.id)) this.closeTab(tab.key);
    }
  }

  #colMenu(entry, x, y) {
    openMenu(x, y, [
      { label: t('menu.newRequest'), icon: 'plus', items: this.#protocolItems(entry.key) },
      { label: t('menu.newFolder'), icon: 'folderPlus', action: () => this.newFolder(entry.key) },
      '-',
      { label: t('menu.settings'), icon: 'gear', action: () => this.openItem(entry.key, null) },
      { label: t('menu.environments'), icon: 'globe', action: () => this.environments(entry.key) },
      { label: t('menu.run'), icon: 'play', action: () => this.run(entry.key) },
      { label: t('menu.schedule'), icon: 'clock', disabled: !entry.file, action: () => this.schedule(entry.key) },
      '-',
      ...(entry.file ? [{ label: t('menu.save'), icon: 'save', disabled: !entry.dirty, action: () => this.save(entry.key) }] : []),
      { label: t('menu.saveAs'), icon: 'filePlus', action: () => this.saveAs(entry.key) },
      { label: t('menu.export'), icon: 'download', action: () => this.exportPostman(entry.key) },
      ...(entry.file ? ['-', { label: t('menu.close'), icon: 'x', action: () => this.closeCollection(entry.key) }] : []),
    ]);
  }

  #itemMenu(entry, item, x, y) {
    const folder = item.type === 'folder';
    openMenu(x, y, [
      ...(folder ? [
        { label: t('menu.newRequest'), icon: 'plus', items: this.#protocolItems(entry.key, item.id) },
        { label: t('menu.newFolder'), icon: 'folderPlus', action: () => this.newFolder(entry.key, item.id) },
        { label: t('menu.settings'), icon: 'gear', action: () => this.openItem(entry.key, item.id) },
        { label: t('menu.run'), icon: 'play', action: () => this.run(entry.key, item.id) },
        '-',
      ] : [
        { label: t('menu.open'), icon: 'open', action: () => this.openItem(entry.key, item.id) },
        { label: t('req.copyCode'), icon: 'code', disabled: !['http', 'graphql'].includes(item.protocol), action: () => this.copyAsCode(entry.key, item) },
        '-',
      ]),
      { label: t('menu.rename'), icon: 'pencil', action: () => this.rename(entry.key, item) },
      { label: t('menu.duplicate'), icon: 'filePlus', action: () => this.duplicate(entry.key, item.id) },
      { label: t('menu.delete'), icon: 'trash', danger: true, action: () => this.remove(entry.key, item) },
    ]);
  }

  #newMenu(button) {
    const r = button.getBoundingClientRect();
    const col = this.active?.col ?? MINE_KEY;
    openMenu(r.left, r.bottom, [
      ...this.#protocolItems(col),
      '-',
      { label: t('menu.newFolder'), icon: 'folderPlus', action: () => this.newFolder(col) },
      { label: t('menu.newCollection'), icon: 'filePlus', action: () => this.newCollection() },
    ]);
  }

  #drawEnv() {
    const col = this.active?.col ?? MINE_KEY;
    const entry = store.get(col);
    const id = store.envId(col);
    this.envSelect.replaceChildren(h('option', { value: '' }, t('env.none')), ...(entry?.data.environments ?? []).map(e => h('option', { value: e.id, selected: e.id === id }, e.name)));
    this.envSelect.title = entry ? t('env.of', { name: store.nameOf(entry) }) : '';
  }

  // ---------- Tabs ----------

  #drawTabs() {
    this.tabs = this.tabs.filter(tab => {
      const entry = store.get(tab.col);
      if (entry && (!tab.id || find(entry.data, tab.id))) return true;
      tab.view?.destroy?.();
      return false;
    });
    if (this.active && !this.tabs.includes(this.active)) this.active = this.tabs.at(-1) ?? null;
    this.bar.render(this.tabs.map(tab => {
      const entry = store.get(tab.col);
      const item = tab.id ? find(entry.data, tab.id)?.item : null;
      const label = this.#tabLabel(tab);
      const badge = item?.type === 'request' ? h('span', { class: `nx-m small ${item.protocol === 'http' ? methodClass(item.method) : `p-${item.protocol}`}` }, item.protocol === 'http' ? item.method.slice(0, 3) : protocolOf(item.protocol).label.slice(0, 3)) : (item ? 'folder' : 'gear');
      return { key: tab.key, label, icon: badge, detail: store.list.length > 1 ? store.nameOf(entry) : '', dirty: entry.dirty, title: item?.url ?? '' };
    }), this.active?.key);
    if (!this.active) {
      this.main.replaceChildren(this.empty);
      this.empty.replaceChildren(h('div', { class: 'nx-hello' }, icon('globe', 'ico big'), h('h2', {}, t('empty.title')), h('p', {}, t('empty.text')),
        h('div', { class: 'nx-modes center' }, ...['http', 'graphql', 'ws', 'grpc', 'mqtt'].map(p => h('button', { type: 'button', class: 'ctl-btn', onclick: () => this.newRequest(MINE_KEY, p) }, protocolOf(p).label))),
        h('p', {}, h('button', { type: 'button', class: 'nx-link', onclick: () => importDialog(this) }, t('empty.import')))));
    } else if (this.main.firstChild !== this.active.view.el) {
      this.main.replaceChildren(this.active.view.el);
    }
    const title = this.active ? this.#tabLabel(this.active) : '';
    this.win.setTitle(title ? `${title} — ${t('app.name')}` : t('app.name'));
    this.#drawEnv();
  }

  #tabLabel(tab) {
    const entry = store.get(tab.col);
    const item = tab.id ? find(entry.data, tab.id)?.item : null;
    return item ? item.name || item.url || t('item.unnamed') : store.nameOf(entry);
  }

  openItem(col, id, { quiet = false } = {}) {
    const key = `${col}/${id ?? ''}`;
    let tab = this.tabs.find(x => x.key === key);
    if (!tab) {
      const entry = store.get(col);
      const item = id ? find(entry?.data ?? { items: [] }, id)?.item : null;
      if (!entry || (id && !item)) return;
      const view = !item || item.type === 'folder' ? new FolderView(this, col, item) : protocolOf(item.protocol).live || item.protocol === 'grpc' ? new LiveView(this, col, item) : new RequestView(this, col, item);
      tab = { key, col, id, view };
      this.tabs.push(tab);
    }
    if (!quiet || !this.active) this.select(key);
    else this.#drawTabs();
    return tab;
  }

  select(key) {
    const tab = this.tabs.find(x => x.key === key);
    if (!tab) return;
    this.active = tab;
    this.#drawTabs();
    this.#drawTree();
    queueMicrotask(() => tab.view.focus?.());
  }

  closeTab(key) {
    const tab = this.tabs.find(x => x.key === key);
    if (!tab) return;
    tab.view?.destroy?.();
    const i = this.tabs.indexOf(tab);
    this.tabs.splice(i, 1);
    if (this.active === tab) this.active = this.tabs[i] ?? this.tabs[i - 1] ?? null;
    this.#drawTabs();
    this.#drawTree();
  }

  /** A view changed its item: the tree and the tab's name follow, the view itself is left alone. */
  itemChanged(col) {
    this.#editing = col;
    clearTimeout(this.itemTimer);
    this.itemTimer = setTimeout(() => {
      this.#editing = null;
      this.#drawTree();
      for (const w of windows) if (w !== this) w.#drawTree();
      const scroll = this.bar.el.scrollLeft;
      this.#drawTabs();
      this.bar.el.scrollLeft = scroll;
    }, 250);
  }

  // ---------- Items ----------

  #listOf(col, folderId) {
    const c = store.get(col).data;
    return folderId ? find(c, folderId)?.item.items ?? c.items : c.items;
  }

  newRequest(col, protocol, folderId = null) {
    const item = newRequest(protocol, '');
    item.name = t('item.newName', { protocol: protocolOf(protocol).label });
    this.#listOf(col, folderId).push(item);
    if (folderId) this.#folded.delete(`${col}/${folderId}`);
    this.#folded.delete(col);
    store.touch(col);
    this.openItem(col, item.id);
  }

  async newFolder(col, folderId = null) {
    const name = await this.#ask(t('menu.newFolder'), t('item.folderName'), t('item.newFolderName'));
    if (!name) return;
    this.#listOf(col, folderId).push(newFolder(name));
    store.touch(col);
  }

  async rename(col, item) {
    const name = await this.#ask(t('menu.rename'), t('item.name'), item.name);
    if (name === null) return;
    item.name = name;
    store.touch(col);
    this.#drawTabs();
  }

  duplicate(col, id) {
    const at = find(store.get(col).data, id);
    if (!at) return;
    const copy = cloneItem(at.item);
    copy.name = t('item.copyOf', { name: at.item.name });
    at.list.splice(at.list.indexOf(at.item) + 1, 0, copy);
    store.touch(col);
    if (copy.type === 'request') this.openItem(col, copy.id);
  }

  async remove(col, item) {
    const answer = await messageBox(this.win, {
      icon: 'warning', title: t(item.type === 'folder' ? 'item.deleteFolder' : 'item.deleteRequest', { name: item.name }),
      text: item.type === 'folder' ? t('item.deleteFolderText') : '', buttons: ['cancel', { value: 'delete', label: t('menu.delete'), danger: true, primary: true }],
    });
    if (answer !== 'delete') return;
    const at = find(store.get(col).data, item.id);
    if (!at) return;
    at.list.splice(at.list.indexOf(at.item), 1);
    store.touch(col);
    this.#drawTabs();
  }

  async #ask(title, label, value = '') {
    const r = await messageBox(this.win, { title, fields: [{ name: 'v', label, value, required: true, maxLength: 120 }], buttons: ['cancel', 'ok'] });
    return r?.button === 'ok' ? String(r.values.v).trim() : null;
  }

  // ---------- Collections ----------

  async newCollection() {
    const name = await this.#ask(t('menu.newCollection'), t('item.collectionName'), t('item.newCollectionName'));
    if (!name) return;
    const folder = await system.pickFile(this.openWindow, { kind: 'folder', title: t('file.whereTo') });
    if (!folder) return;
    try {
      const entry = await store.createFile(folder.id, name);
      this.openItem(entry.key, null);
    } catch (err) { this.notice(err.message); }
  }

  async openCollectionFile() {
    const node = await system.pickFile(this.openWindow, { title: t('tools.open'), exts: [EXT] });
    if (!node) return;
    try { const entry = await store.openFile(node.id); this.#folded.delete(entry.key); this.#drawTree(); } catch (err) { messageBox(this.win, { icon: 'error', text: err.message }); }
  }

  async save(col = this.active?.col) {
    const entry = store.get(col);
    if (!entry) return;
    if (!entry.file) return this.saveAs(col);
    try { await store.save(col); } catch (err) { messageBox(this.win, { icon: 'error', title: t('file.saveFailed'), text: err.message }); }
  }

  async saveAs(col) {
    const entry = store.get(col);
    const name = await this.#ask(t('menu.saveAs'), t('item.collectionName'), store.nameOf(entry));
    if (!name) return;
    const folder = await system.pickFile(this.openWindow, { kind: 'folder', title: t('file.whereTo') });
    if (!folder) return;
    try {
      const copy = await store.saveAs(col, folder.id, name);
      this.notice(t('file.saved', { path: fs.tildePath(copy.file) }));
    } catch (err) { messageBox(this.win, { icon: 'error', title: t('file.saveFailed'), text: err.message }); }
  }

  async closeCollection(col) {
    const entry = store.get(col);
    if (entry?.dirty) {
      const answer = await messageBox(this.win, { icon: 'warning', title: t('file.unsavedTitle', { name: store.nameOf(entry) }), text: t('file.unsavedText'),
        buttons: ['cancel', { value: 'discard', label: t('file.discard'), danger: true }, { value: 'save', label: t('menu.save'), primary: true }] });
      if (answer === 'cancel' || !answer) return;
      if (answer === 'save') await this.save(col);
    }
    for (const tab of this.tabs.filter(x => x.col === col)) this.closeTab(tab.key);
    store.close(col);
  }

  async exportPostman(col) {
    const { toPostman } = await import('./formats/index.js');
    const entry = store.get(col);
    const folder = await system.pickFile(this.openWindow, { kind: 'folder', title: t('file.whereTo') });
    if (!folder) return;
    const name = `${fs.cleanName(store.nameOf(entry), { portable: true }) || 'collection'}.postman_collection.json`;
    const node = fs.create(folder.id, { type: 'file', name });
    await fs.write(node.id, `${JSON.stringify(toPostman(entry.data), null, 2)}\n`);
    this.notice(t('file.exported', { path: fs.tildePath(node.id) }));
  }

  async #canClose() {
    if (windows.size > 1) return true;
    const dirty = store.list.filter(c => c.dirty);
    if (!dirty.length) return true;
    const answer = await messageBox(this.win, {
      icon: 'warning', title: t('file.unsavedMany', { n: dirty.length }), text: dirty.map(c => store.nameOf(c)).join('\n'),
      buttons: ['cancel', { value: 'discard', label: t('file.discard'), danger: true }, { value: 'save', label: t('file.saveAll'), primary: true }],
    });
    if (answer === 'save') { for (const c of dirty) await this.save(c.key); return true; }
    return answer === 'discard';
  }

  // ---------- What the kernel sent back after a request ----------

  /** The variables the scripts and «save to variable» changed, and the OAuth tokens it renewed. */
  applyResult(col, answer) {
    const entry = store.get(col);
    if (!entry || !answer?.vars) return;
    const c = entry.data;
    let changed = false;
    const merge = (rows, values, { secret = [] } = {}) => {
      for (const [k, v] of Object.entries(values ?? {})) {
        if (secret.includes(k)) continue;
        const row = rows.find(r => r.key === k);
        if (row && row.secret && !answer.secret?.includes(k)) { row.secret = false; delete row.sealed; row.value = v; changed = true; } else if (row && !row.secret && row.value !== v) { row.value = v; changed = true; } else if (!row) { rows.push({ key: k, value: v, enabled: true }); changed = true; }
      }
    };
    const env = store.env(col);
    if (env) merge(env.variables, answer.vars.environment, { secret: answer.secret ?? [] });
    merge(c.variables, answer.vars.collection);
    const globals = store.globals;
    const before = JSON.stringify(globals);
    merge(globals, answer.vars.globals);
    if (JSON.stringify(globals) !== before) store.setGlobals(globals);
    for (const [old, fresh] of Object.entries(answer.renewed ?? {})) {
      const fix = node => { if (node?.auth?.tokens === old) { node.auth.tokens = fresh.sealed; node.auth.tokenInfo = { expires: fresh.expires, scope: fresh.scope, preview: fresh.preview, refresh: fresh.refresh }; changed = true; } };
      fix(c);
      walk(c.items, fix);
    }
    if (changed) store.touch(col);
  }

  // ---------- Dialogs ----------

  environments(col = this.active?.col ?? MINE_KEY) { openEnvironments(this, col); }
  run(col = this.active?.col ?? MINE_KEY, folderId = null) { openRunner(this, col, folderId); }
  schedule(col = this.active?.col ?? MINE_KEY, id = null) { scheduleCollection(this, col, id); }
  copyAsCode(col, item) { codeDialog(this, col, item); }

  #keys(e) {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === 's') { e.preventDefault(); this.save(); }
    else if (mod && e.key === 'Enter') { e.preventDefault(); this.active?.view.send?.() ?? this.active?.view.connect?.(); }
    else if (mod && e.key.toLowerCase() === 'n' && e.altKey) { e.preventDefault(); this.newRequest(this.active?.col ?? MINE_KEY, 'http'); }
    else if (mod && e.key.toLowerCase() === 'w' && e.altKey && this.active) { e.preventDefault(); this.closeTab(this.active.key); }
  }
}
