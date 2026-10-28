import { Window, h, icon, fs, fileType, session, storage, openMenu, shortcuts } from '@lilos/sdk';
import { launch } from '../registry.js';
import { openFile } from '../open.js';
import { itemIcon } from '../../desktop/itemIcons.js';
import { addTarget } from '../../items/targets.js';
import { confirmRemove } from '../../items/confirmRemove.js';
import { SYSTEM_FOLDERS } from '../../systemFs.js';
import './files.css';

const VIEW_KEY = 'files-view';
const COLUMNS = [
  { key: 'name', label: 'Nome' },
  { key: 'modified', label: 'Modificato' },
  { key: 'size', label: 'Dimensione', num: true },
  { key: 'type', label: 'Tipo' },
];

/** File Manager: browse the folders of the file system. One window, opened on args.folder. */
export default function createFiles({ args } = {}) {
  const win = new Window({ title: 'File', icon: 'folder', width: 780, height: 480, minWidth: 520, minHeight: 300 });
  const browser = new FileBrowser(win);
  browser.go(args?.folder && fs.exists(args.folder) ? args.folder : fs.root, false);
  // Launched again (e.g. a folder opened from the desk): show that folder in this window
  win.on('launch', a => { if (a?.folder && fs.exists(a.folder)) browser.go(a.folder); });
  return win;
}

/** Lowercase without accents, for search. */
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const typeLabel = n => (n.type === 'folder' ? 'Cartella' : n.type === 'app' ? 'App' : fileType(n.name).label);
const folderName = n => (n.id === fs.root ? 'Home' : n.name);

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = bytes, u = -1;
  do { v /= 1024; u++; } while (v >= 1024 && u < units.length - 1);
  return `${v.toLocaleString(session.locale, { maximumFractionDigits: 1 })} ${units[u]}`;
}

function sizeLabel(n) {
  if (n.type === 'folder') {
    const count = fs.children(n.id).length;
    return count === 0 ? 'Vuota' : count === 1 ? '1 elemento' : `${count} elementi`;
  }
  return n.type === 'file' ? formatBytes(n.size ?? 0) : '—';
}

const dateLabel = t => new Date(t).toLocaleString(session.locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

class FileBrowser {
  folder = fs.root;
  #back = [];
  #forward = [];
  #view = storage.get(VIEW_KEY) === 'grid' ? 'grid' : 'list';
  #sort = { key: 'name', dir: 1 };
  #query = '';
  #items = [];          // nodes shown, in order
  #selection = new Set();
  #anchor = null;       // id where a Shift range starts
  #cursor = null;       // id with the keyboard focus
  #editing = null;      // id being renamed
  #message = '';

  constructor(win) {
    this.win = win;
    const tool = (glyph, label, onclick) => h('button', { class: 'fm-btn', type: 'button', title: label, 'aria-label': label, onclick }, icon(glyph));

    this.backBtn = tool('arrowLeft', 'Indietro (Alt ←)', () => this.back());
    this.forwardBtn = tool('arrowRight', 'Avanti (Alt →)', () => this.forward());
    this.upBtn = tool('arrowUp', 'Cartella superiore (Alt ↑)', () => this.up());
    this.crumbs = h('nav', { class: 'fm-path', 'aria-label': 'Percorso' });
    this.listBtn = tool('list', 'Vista elenco', () => this.setView('list'));
    this.gridBtn = tool('grid', 'Vista a icone', () => this.setView('grid'));
    this.search = h('input', { type: 'text', spellcheck: 'false', 'aria-label': 'Cerca nella cartella' });
    this.search.addEventListener('input', () => { this.#query = fold(this.search.value.trim()); this.render(); });
    this.search.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.search.value) { e.stopPropagation(); this.search.value = ''; this.#query = ''; this.render(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); this.list.focus(); }
    });

    this.side = h('aside', { class: 'fm-side', 'aria-label': 'Risorse' });
    this.list = h('div', { class: 'fm-list', role: 'listbox', tabindex: '0', 'aria-multiselectable': 'true', 'aria-label': 'Contenuto della cartella' });
    this.statusLeft = h('span');
    this.statusRight = h('span', { class: 'fm-status-right' });

    win.body.append(
      h('div', { class: 'fm-toolbar' },
        this.backBtn, this.forwardBtn, this.upBtn,
        this.crumbs,
        tool('folderPlus', 'Nuova cartella', () => this.create('folder')),
        h('span', { class: 'fm-sep' }),
        this.listBtn, this.gridBtn,
        h('label', { class: 'fm-search' }, icon('search'), this.search)),
      h('div', { class: 'fm' },
        this.side,
        h('div', { class: 'fm-main' }, this.list, h('div', { class: 'fm-status' }, this.statusLeft, this.statusRight))));

    this.#bindList();
    const off = fs.on('change', e => this.#onChange(e));
    const removeTarget = addTarget({
      isActive: () => win.active,
      selectionSize: () => this.#selection.size,
      open: () => this.openSelected(),
      rename: () => this.rename([...this.#selection][0]),
      remove: () => this.remove([...this.#selection]),
      selectAll: () => this.#select(this.#items.map(n => n.id)),
      deselect: () => this.#select([]),
    });
    win.on('destroy', () => { off(); removeTarget(); });
  }

  // ---------- Navigation ----------

  go(id, record = true) {
    if (!fs.exists(id) || fs.get(id).type !== 'folder') return;
    if (record && id !== this.folder) {
      this.#back.push(this.folder);
      this.#forward = [];
    }
    const previous = this.folder;
    this.folder = id;
    this.#selection.clear();
    this.#editing = null;
    this.#message = '';
    this.search.value = '';
    this.#query = '';
    // Coming back up: keep the folder we left selected, like a file manager does
    const child = fs.ancestors(previous).find(n => n.parent === id);
    this.#cursor = child?.id ?? null;
    if (child) this.#selection.add(child.id);
    this.#anchor = this.#cursor;
    this.render();
    this.list.scrollTop = 0;
  }

  back() { this.#travel(this.#back, this.#forward); }
  forward() { this.#travel(this.#forward, this.#back); }

  up() {
    const parent = fs.get(this.folder)?.parent;
    if (parent) this.go(parent);
  }

  setView(view) {
    this.#view = view;
    storage.set(VIEW_KEY, view);
    this.render();
  }

  // ---------- Actions ----------

  open(node) {
    if (node.type === 'folder') return this.go(node.id);
    if (node.type === 'app') return launch(node.app);
    openFile(node);
  }

  openSelected() {
    const nodes = this.#items.filter(n => this.#selection.has(n.id));
    const folder = nodes.find(n => n.type === 'folder');
    nodes.filter(n => n.type !== 'folder').forEach(n => this.open(n));
    if (folder) this.go(folder.id);
  }

  create(type) {
    if (this.#query) { this.search.value = ''; this.#query = ''; }
    const node = fs.create(this.folder, { type, name: type === 'folder' ? 'Nuova cartella' : 'Nuovo file.txt' });
    this.#select([node.id]);
    this.rename(node.id);
  }

  /** Inline rename in the list or grid. */
  rename(id) {
    const node = fs.get(id);
    if (!node || node.system) return;
    this.#editing = id;
    this.render();
    const input = this.list.querySelector('.fm-rename');
    if (!input) return;
    input.focus();
    const ext = node.type === 'file' ? node.name.lastIndexOf('.') : -1;
    input.setSelectionRange(0, ext > 0 ? ext : node.name.length);
    let done = false;
    const finish = commit => {
      if (done) return;
      done = true;
      this.#editing = null;
      const name = input.value.replace(/\s+/g, ' ').trim();
      if (commit && name && name !== node.name && fs.exists(id)) {
        try { fs.rename(id, name); } catch (err) { this.#say(err.message); }
      }
      this.render();
      this.list.focus();
    };
    input.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }

  remove(ids) {
    const removable = ids.filter(id => !fs.get(id)?.system);
    if (!removable.length) return this.#say('Le cartelle di sistema non si possono eliminare');
    const row = this.list.querySelector(`[data-id="${CSS.escape(removable[0])}"]`)?.getBoundingClientRect();
    confirmRemove(removable, row ? row.left + 40 : innerWidth / 2, row ? row.bottom : innerHeight / 2);
  }

  // ---------- Rendering ----------

  render() {
    const folder = fs.get(this.folder);
    if (!folder) return;
    this.win.setTitle(folderName(folder), 'File');
    this.#renderToolbar(folder);
    this.#renderSide();

    const all = fs.children(this.folder);
    this.#items = this.#sorted(this.#query ? all.filter(n => fold(n.name).includes(this.#query)) : all);
    const ids = new Set(this.#items.map(n => n.id));
    this.#selection = new Set([...this.#selection].filter(id => ids.has(id)));
    if (!ids.has(this.#cursor)) this.#cursor = this.#items[0]?.id ?? null;

    const scroll = this.list.scrollTop;
    this.list.classList.toggle('grid', this.#view === 'grid');
    if (!this.#items.length) {
      this.list.replaceChildren(h('div', { class: 'fm-empty' },
        this.#query ? `Nessun elemento corrisponde a «${this.search.value.trim()}»` : 'Questa cartella è vuota'));
    } else if (this.#view === 'list') {
      this.list.replaceChildren(this.#header(), ...this.#items.map(n => this.#row(n)));
    } else {
      this.list.replaceChildren(...this.#items.map(n => this.#tile(n)));
    }
    this.list.scrollTop = scroll;
    this.list.setAttribute('aria-activedescendant', this.#cursor ? `fm-${this.#cursor}` : '');

    const n = all.length;
    const sel = this.#selection.size;
    this.statusLeft.textContent = (n === 1 ? '1 elemento' : `${n} elementi`) + (sel ? ` · ${sel} selezionat${sel === 1 ? 'o' : 'i'}` : '');
    this.statusRight.textContent = this.#message || fs.path(this.folder);
    this.statusRight.classList.toggle('msg', !!this.#message);
  }

  #renderToolbar(folder) {
    this.backBtn.disabled = !this.#back.some(id => fs.exists(id));
    this.forwardBtn.disabled = !this.#forward.some(id => fs.exists(id));
    this.upBtn.disabled = !folder.parent;
    this.listBtn.classList.toggle('on', this.#view === 'list');
    this.gridBtn.classList.toggle('on', this.#view === 'grid');
    this.listBtn.setAttribute('aria-pressed', String(this.#view === 'list'));
    this.gridBtn.setAttribute('aria-pressed', String(this.#view === 'grid'));
    this.search.placeholder = `Cerca in ${folderName(folder)}`;

    const trail = fs.ancestors(this.folder);
    this.crumbs.replaceChildren(...trail.flatMap((n, i) => {
      const last = i === trail.length - 1;
      const crumb = last
        ? h('span', { class: 'fm-crumb current', 'aria-current': 'page' }, folderName(n))
        : h('button', { class: 'fm-crumb', type: 'button', onclick: () => this.go(n.id) }, folderName(n));
      return i ? [h('span', { class: 'fm-crumb-sep', 'aria-hidden': 'true' }, '›'), crumb] : [crumb];
    }));
  }

  #renderSide() {
    const roots = fs.children(fs.root);
    const trail = new Set(fs.ancestors(this.folder).map(n => n.id));
    const places = [
      { id: fs.root, name: 'Home', glyph: 'home' },
      ...SYSTEM_FOLDERS.map(f => ({ ...f, id: roots.find(n => n.name === f.name && n.system)?.id, glyph: f.icon })).filter(p => p.id),
    ];
    // The deepest place that contains the current folder is the active one
    const active = [...places].reverse().find(p => trail.has(p.id))?.id;
    this.side.replaceChildren(
      h('h6', {}, 'Risorse'),
      ...places.map(p => h('button', {
        class: p.id === active ? 'fm-place on' : 'fm-place', type: 'button',
        'aria-current': p.id === active ? 'true' : null, onclick: () => this.go(p.id),
      }, icon(p.glyph), h('span', {}, p.name))));
  }

  #header() {
    return h('div', { class: 'fm-head', role: 'presentation' }, COLUMNS.map(c => {
      const on = this.#sort.key === c.key;
      return h('button', {
        class: ['fm-col', c.num && 'num', on && 'on'].filter(Boolean).join(' '), type: 'button', tabindex: '-1',
        'aria-sort': on ? (this.#sort.dir > 0 ? 'ascending' : 'descending') : null,
        onclick: () => { this.#sort = { key: c.key, dir: on ? -this.#sort.dir : 1 }; this.render(); },
      }, c.label, on ? h('span', { class: 'fm-arrow', 'aria-hidden': 'true' }, this.#sort.dir > 0 ? '▲' : '▼') : null);
    }));
  }

  #row(n) {
    return this.#option(n, 'fm-row',
      h('span', { class: 'fm-name' }, h('span', { class: 'fm-icon' }, itemIcon(n)), this.#nameNode(n)),
      h('span', {}, dateLabel(n.modified)),
      h('span', { class: 'num' }, sizeLabel(n)),
      h('span', {}, typeLabel(n)));
  }

  #tile(n) {
    return this.#option(n, 'fm-tile', h('span', { class: 'fm-tile-icon' }, itemIcon(n)), this.#nameNode(n));
  }

  #nameNode(n) {
    if (this.#editing === n.id) return h('input', { class: 'fm-rename', type: 'text', value: n.name, spellcheck: 'false', 'aria-label': 'Nuovo nome' });
    return h('span', { class: 'fm-label', title: n.name }, n.name);
  }

  #option(n, cls, ...children) {
    const selected = this.#selection.has(n.id);
    return h('div', {
      class: [cls, selected && 'selected', n.id === this.#cursor && 'cursor'].filter(Boolean).join(' '),
      id: `fm-${n.id}`, role: 'option', 'aria-selected': String(selected), dataset: { id: n.id },
    }, ...children);
  }

  #sorted(nodes) {
    const { key, dir } = this.#sort;
    const value = n => key === 'type' ? typeLabel(n)
      : key === 'size' ? (n.type === 'folder' ? fs.children(n.id).length : n.size ?? 0)
      : key === 'modified' ? n.modified : n.name;
    const rank = { folder: 0, file: 1, app: 1 };
    return [...nodes].sort((a, b) => {
      if (rank[a.type] !== rank[b.type]) return rank[a.type] - rank[b.type];  // folders first
      const va = value(a), vb = value(b);
      const c = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), session.locale, { numeric: true });
      return (c || a.name.localeCompare(b.name, session.locale, { numeric: true })) * dir;
    });
  }

  // ---------- Selection and input ----------

  #select(ids, cursor = ids[ids.length - 1] ?? this.#cursor) {
    this.#selection = new Set(ids);
    this.#cursor = cursor;
    this.render();
  }

  #bindList() {
    const { signal } = this.win;
    const optionOf = e => e.target.closest?.('[role="option"]');

    this.list.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('.fm-rename, .fm-head')) return;
      const opt = optionOf(e);
      if (!opt) { if (!e.ctrlKey && !e.metaKey && !e.shiftKey) this.#select([]); return; }
      const id = opt.dataset.id;
      const order = this.#items.map(n => n.id);
      if (e.shiftKey && this.#anchor && order.includes(this.#anchor)) {
        const [a, b] = [order.indexOf(this.#anchor), order.indexOf(id)].sort((x, y) => x - y);
        const range = order.slice(a, b + 1);
        this.#select(e.ctrlKey || e.metaKey ? [...new Set([...this.#selection, ...range])] : range, id);
      } else if (e.ctrlKey || e.metaKey) {
        const next = new Set(this.#selection);
        if (next.has(id)) next.delete(id); else next.add(id);
        this.#anchor = id;
        this.#select([...next], id);
      } else {
        this.#anchor = id;
        if (!this.#selection.has(id) || this.#selection.size > 1) this.#select([id], id);
      }
    }, { signal });

    this.list.addEventListener('dblclick', e => {
      const opt = optionOf(e);
      if (!opt || e.target.closest('.fm-rename')) return;
      const node = fs.get(opt.dataset.id);
      if (node) this.open(node);
    }, { signal });

    this.list.addEventListener('contextmenu', e => {
      e.preventDefault();
      const opt = optionOf(e);
      if (!opt) return this.#backgroundMenu(e);
      if (!this.#selection.has(opt.dataset.id)) this.#select([opt.dataset.id], opt.dataset.id);
      this.#itemMenu(e);
    }, { signal });

    // Navigation keys of the list (fixed). Enter, F2, Canc, Ctrl A and Esc are shared item shortcuts.
    this.list.addEventListener('keydown', e => {
      if (e.target !== this.list) return;
      if (e.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        ({ ArrowLeft: () => this.back(), ArrowRight: () => this.forward(), ArrowUp: () => this.up() })[e.key]();
        return;
      }
      if (e.key === 'Backspace') { e.preventDefault(); this.up(); return; }
      const step = this.#step(e.key);
      if (step == null || !this.#items.length) return;
      e.preventDefault();
      const order = this.#items.map(n => n.id);
      const i = order.indexOf(this.#cursor);
      const j = step === -Infinity ? 0 : step === Infinity ? order.length - 1 : Math.max(0, Math.min(order.length - 1, (i < 0 ? 0 : i) + step));
      const id = order[j];
      if (e.shiftKey) {
        if (!this.#anchor) this.#anchor = this.#cursor ?? id;
        const [a, b] = [order.indexOf(this.#anchor), j].sort((x, y) => x - y);
        this.#select(order.slice(a, b + 1), id);
      } else {
        this.#anchor = id;
        this.#select([id], id);
      }
      this.list.querySelector(`#fm-${CSS.escape(id)}`)?.scrollIntoView({ block: 'nearest' });
    }, { signal });
  }

  /** How many items an arrow key moves by (grid: a row is as many tiles as fit). */
  #step(key) {
    const perRow = this.#view === 'grid' ? Math.max(1, Math.floor(this.list.clientWidth / 92)) : 1;
    return {
      ArrowDown: perRow, ArrowUp: -perRow, Home: -Infinity, End: Infinity,
      ...(this.#view === 'grid' && { ArrowRight: 1, ArrowLeft: -1 }),
    }[key] ?? null;
  }

  #backgroundMenu(e) {
    openMenu(e.clientX, e.clientY, [
      { label: 'Nuova cartella', icon: 'folderPlus', action: () => this.create('folder') },
      { label: 'Nuovo file di testo', icon: 'filePlus', action: () => this.create('file') },
      '-',
      { label: this.#view === 'list' ? 'Vista a icone' : 'Vista elenco', icon: this.#view === 'list' ? 'grid' : 'list', action: () => this.setView(this.#view === 'list' ? 'grid' : 'list') },
    ]);
  }

  #itemMenu(e) {
    const nodes = this.#items.filter(n => this.#selection.has(n.id));
    const many = nodes.length > 1;
    const system = nodes.some(n => n.system);
    openMenu(e.clientX, e.clientY, [
      { label: many ? `Apri ${nodes.length} elementi` : 'Apri', icon: 'open', shortcut: shortcuts.label('items.open'), action: () => this.openSelected() },
      !many && nodes[0].type === 'file' && { label: 'Apri con…', icon: 'open', action: () => openFile(nodes[0], { choose: true }) },
      { label: 'Rinomina', icon: 'pencil', shortcut: shortcuts.label('items.rename'), disabled: many || system, action: () => this.rename(nodes[0].id) },
      '-',
      { label: many ? `Elimina ${nodes.length} elementi` : 'Elimina', icon: 'trash', shortcut: shortcuts.label('items.delete'), danger: true, disabled: system, action: () => this.remove(nodes.map(n => n.id)) },
    ].filter(Boolean));
  }

  // ---------- Internals ----------

  #travel(from, to) {
    while (from.length) {
      const id = from.pop();
      if (!fs.exists(id)) continue;
      to.push(this.folder);
      this.go(id, false);
      return;
    }
  }

  #say(text) {
    this.#message = text;
    this.render();
  }

  #onChange(e) {
    if (e.type === 'remove' && e.ids.includes(this.folder)) {
      // The open folder is gone: go to the closest folder that still exists
      return this.go(e.parent && fs.exists(e.parent) ? e.parent : fs.root, false);
    }
    const inFolder = e.parent === this.folder;
    const onTrail = e.type !== 'remove' && fs.isInside(this.folder, e.node.id);      // renamed ancestor: title, path
    const inChild = fs.exists(e.parent) && fs.get(e.parent).parent === this.folder;  // item counts of subfolders
    if (!inFolder && !onTrail && !inChild) return;
    if (inFolder && (e.type === 'remove' || e.type === 'create')) this.#message = '';
    this.render();
  }
}
