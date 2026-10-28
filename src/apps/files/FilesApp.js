import { Window, h, icon, fs, tags, fileType, session, storage, settings, openMenu, shortcuts, toast, UndoStack, history } from '@lilos/sdk';
import { launch } from '../registry.js';
import { openFile } from '../open.js';
import { itemIcon } from '../../desktop/itemIcons.js';
import { addTarget } from '../../items/targets.js';
import { confirmRemove } from '../../items/confirmRemove.js';
import { recordCreated, renameNode, restoreNodes, removeNodes } from '../../items/fsHistory.js';
import { markItem, dropZone, dragItems, movableInto, moveInto } from '../../items/itemDrag.js';
import { links, linkEntry } from '../../items/links.js';
import { SYSTEM_FOLDERS, DESK_NAME } from '../../systemFs.js';
import { describeWorkspace, onWorkspacesChange } from '../../workspaces/info.js';
import { tagDots, tagSubmenu, setTag } from '../../tags/tagUi.js';
import './files.css';

const VIEW_KEY = 'files-view';
/** The trash is shown like a folder, with this id (not a node: fs.get() does not see it). */
const TRASH = fs.trashRoot;
const COLUMNS = [
  { key: 'name', label: 'Nome' },
  { key: 'modified', label: 'Modificato' },
  { key: 'size', label: 'Dimensione', num: true },
  { key: 'type', label: 'Tipo' },
  { key: 'workspace', label: 'Workspace' },
];
const TRASH_COLUMNS = [
  { key: 'name', label: 'Nome' },
  { key: 'deleted', label: 'Eliminato' },
  { key: 'size', label: 'Dimensione', num: true },
  { key: 'type', label: 'Tipo' },
  { key: 'origin', label: 'Posizione originale' },
];

/** Everything with a tag, wherever it is, is shown like a folder with the id 'tag:<tag id>'. */
const TAG_VIEW = 'tag:';
const TAG_COLUMNS = [
  { key: 'name', label: 'Nome' },
  { key: 'location', label: 'Posizione' },
  { key: 'type', label: 'Tipo' },
  { key: 'workspace', label: 'Workspace' },
];
/** The tag a view id shows (null if it is not a tag view, or the tag is gone). */
const viewTag = id => (typeof id === 'string' && id.startsWith(TAG_VIEW) ? tags.get(id.slice(TAG_VIEW.length)) : null);
const locationLabel = n => (n.parent === fs.root ? 'Home' : fs.path(n.parent));

/** Where a trashed item goes back when restored: the folder it left, or Home if that is gone. */
function originLabel(n) {
  const from = n.trashed.from;
  return fs.exists(from) && from !== fs.root ? fs.path(from) : 'Home';
}

/** Whose a node is: the workspace that made it, or shared (system folders). */
function ownerLabel(n) {
  const ws = describeWorkspace(n.workspace);
  if (!ws) return n.workspace ? 'Sconosciuto' : 'Condiviso';
  return ws.removed ? `${ws.name} (eliminato)` : ws.name;
}

function ownerNode(n) {
  const ws = describeWorkspace(n.workspace);
  const dot = h('span', { class: 'ws-owner-dot', 'aria-hidden': 'true' });
  if (ws) dot.style.background = ws.color;   // validated hex color (workspaces/store.js)
  return h('span', { class: ['ws-owner', !ws && 'shared', ws?.removed && 'removed'].filter(Boolean).join(' '), title: `Workspace: ${ownerLabel(n)}` },
    dot, h('span', {}, ownerLabel(n)));
}

/** Folder to show for launch arguments: args.folder, the trash with args.trash, a tag's items with args.tag. */
function startFolder(a) {
  if (a?.trash || a?.folder === TRASH) return TRASH;
  if (typeof a?.tag === 'string' && tags.get(a.tag)) return TAG_VIEW + a.tag;
  if (viewTag(a?.folder)) return a.folder;
  return a?.folder && fs.exists(a.folder) ? a.folder : null;
}

/** File Manager: browse the folders of the file system. One window, opened on args.folder (or the trash, or a tag). */
export default function createFiles({ args } = {}) {
  const win = new Window({ title: 'File', icon: 'folder', width: 780, height: 480, minWidth: 520, minHeight: 300 });
  const browser = new FileBrowser(win);
  browser.go(startFolder(args) ?? fs.root, false);
  // Launched again (e.g. a folder opened from the desk): show that folder in this window
  win.on('launch', a => { const folder = startFolder(a); if (folder) browser.go(folder); });
  win.getState = () => ({ folder: browser.folder });
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
    const count = n.trashed ? n.inside : fs.children(n.id).length;
    return count === 0 ? 'Vuota' : count === 1 ? '1 elemento' : `${count} elementi`;
  }
  return n.type === 'file' ? formatBytes(n.size ?? 0) : '—';
}

/** Status bar of the trash: how long it keeps what it holds. */
function retentionLabel() {
  const days = settings.get('trashRetention');
  if (days <= 0) return 'Gli elementi restano finché non li elimini';
  return `Eliminati definitivamente dopo ${days === 1 ? '1 giorno' : `${days} giorni`}`;
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
  #side = { defaults: [], desk: null };   // the sidebar's default places and the desk's id (last render)
  /** Undo history of this window (Ctrl Z while it has the focus): create, rename, delete. */
  history = new UndoStack();

  constructor(win) {
    this.win = win;
    const tool = (glyph, label, onclick) => h('button', { class: 'fm-btn', type: 'button', title: label, 'aria-label': label, onclick }, icon(glyph));

    this.backBtn = tool('arrowLeft', 'Indietro (Alt ←)', () => this.back());
    this.forwardBtn = tool('arrowRight', 'Avanti (Alt →)', () => this.forward());
    this.upBtn = tool('arrowUp', 'Cartella superiore (Alt ↑)', () => this.up());
    this.crumbs = h('nav', { class: 'fm-path', 'aria-label': 'Percorso' });
    this.newBtn = tool('folderPlus', 'Nuova cartella', () => this.create('folder'));
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
        this.newBtn,
        h('span', { class: 'fm-sep' }),
        this.listBtn, this.gridBtn,
        h('label', { class: 'fm-search' }, icon('search'), this.search)),
      h('div', { class: 'fm' },
        this.side,
        h('div', { class: 'fm-main' }, this.list, h('div', { class: 'fm-status' }, this.statusLeft, this.statusRight))));

    this.#bindList();
    // Files and folders dropped on the list (not on one of its folders) go into the folder shown
    dropZone(this.list, { folder: () => (this.inTrash || this.inTag ? null : this.folder) });
    // On the sidebar: into a folder or the trash, or a link where dropped (see #sideTarget)
    this.gap = h('div', { class: 'fm-gap', 'aria-hidden': 'true' });
    dropZone(this.side, { target: (hit, x, y, ids) => this.#sideTarget(hit, x, y, ids) });
    const off = fs.on('change', e => this.#onChange(e));
    const offLinks = links.on('change', () => { if (this.#reachable(this.folder)) this.render(); });
    // Another workspace: what is visible changed. A window of another workspace (hidden) whose
    // folder cannot be seen from there waits, unchanged, for its workspace to come back
    const offScope = fs.on('scope', () => { if (this.#reachable(this.folder)) this.render(); });
    const offWorkspaces = onWorkspacesChange(() => { if (this.#reachable(this.folder)) this.render(); });
    const offTrash = fs.on('trash', () => { if (this.inTrash) { this.#message = ''; this.render(); } });
    // Tags renamed, recolored, hidden or deleted: sidebar and dots; a deleted tag's view goes Home
    const offTags = tags.on('change', () => {
      if (this.folder.startsWith?.(TAG_VIEW) && !this.inTag) return this.go(fs.root, false);
      if (this.#reachable(this.folder)) this.render();
    });
    const removeTarget = addTarget({
      isActive: () => win.active,
      selectionSize: () => this.#selection.size,
      open: () => this.openSelected(),
      rename: () => this.rename([...this.#selection][0]),
      remove: () => this.remove([...this.#selection]),
      selectAll: () => this.#select(this.#items.map(n => n.id)),
      deselect: () => this.#select([]),
    });
    const detach = history.attach(win.el, this.history);
    win.on('destroy', () => { off(); offLinks(); offScope(); offWorkspaces(); offTrash(); offTags(); removeTarget(); detach(); });
  }

  /** True while the trash is shown. */
  get inTrash() { return this.folder === TRASH; }

  /** The tag whose items are shown (everything with it, wherever it is), or null. */
  get inTag() { return viewTag(this.folder); }

  // ---------- Navigation ----------

  go(id, record = true) {
    if (id !== TRASH && !viewTag(id) && fs.get(id)?.type !== 'folder') return;
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

  /** Opens the folder that holds a node, with the node selected. */
  reveal(id) {
    const node = fs.get(id);
    if (!node) return;
    this.go(node.parent);
    if (fs.isHidden(id)) this.#say(`«${node.name}» è nascosto da un tag invisibile`);
    else this.#select([id], id);
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
    // Trashed items do not open: restore them first
    if (this.inTrash) return this.#say('Per aprirlo, ripristinalo (clic destro → Ripristina)');
    const nodes = this.#items.filter(n => this.#selection.has(n.id));
    const folder = nodes.find(n => n.type === 'folder');
    nodes.filter(n => n.type !== 'folder').forEach(n => this.open(n));
    if (folder) this.go(folder.id);
  }

  create(type) {
    if (this.inTrash || this.inTag) return;
    if (this.#query) { this.search.value = ''; this.#query = ''; }
    const node = fs.create(this.folder, { type, name: type === 'folder' ? 'Nuova cartella' : 'Nuovo file.txt' });
    this.#select([node.id]);
    this.rename(node.id, true);
  }

  /** Inline rename in the list or grid. created: the node was just made (one undo step with it). */
  rename(id, created = false) {
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
        try { renameNode(created ? null : this.history, id, name); } catch (err) { this.#say(err.message); }
      }
      if (created) recordCreated(this.history, id);
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
    if (this.inTrash) return this.purge(ids);
    const removable = ids.filter(id => !fs.get(id)?.system);
    if (!removable.length) return this.#say('Le cartelle di sistema non si possono eliminare');
    const { x, y } = this.#menuPoint(removable[0]);
    confirmRemove(removable, x, y, this.history);
  }

  // ---------- Trash ----------

  /** Takes trashed items back where they were (undoable); says where they went. */
  restore(ids) {
    const restored = restoreNodes(this.history, ids);
    if (!restored.length) return;
    const places = [...new Set(restored.map(r => (r.parent === fs.root ? 'Home' : fs.path(r.parent))))];
    const what = restored.length === 1 ? `«${fs.get(restored[0].id).name}»` : `${restored.length} elementi`;
    toast(`Ripristinat${restored.length === 1 ? 'o' : 'i'} ${what} in ${places.length === 1 ? places[0] : `${places.length} cartelle`}`);
  }

  /** Deletes trashed items for good, always asking first (it cannot be undone). */
  purge(ids) {
    const nodes = this.#items.filter(n => ids.includes(n.id));
    if (!nodes.length) return;
    const what = nodes.length === 1 ? `«${nodes[0].name}»` : `${nodes.length} elementi`;
    const { x, y } = this.#menuPoint(nodes[0].id);
    openMenu(x, y, [
      { label: `Elimina definitivamente ${what}`, icon: 'trash', danger: true, action: () => fs.purge(nodes.map(n => n.id)) },
      { label: 'Annulla', icon: 'x', action: () => {} },
    ]);
  }

  /** Empties the trash, asking first. */
  empty(x, y) {
    const n = fs.trashed().length;
    if (!n) return;
    openMenu(x, y, [
      { label: `Elimina definitivamente ${n === 1 ? 'l’elemento' : `tutti i ${n} elementi`} nel cestino`, icon: 'trash', danger: true, action: () => fs.purgeTrash() },
      { label: 'Annulla', icon: 'x', action: () => {} },
    ]);
  }

  // ---------- Rendering ----------

  render() {
    const tag = this.inTag;
    const folder = this.inTrash ? { id: TRASH, name: 'Cestino', parent: null }
      : tag ? { id: this.folder, name: `Tag «${tag.name}»`, parent: null }
      : fs.get(this.folder);
    if (!folder) return;
    this.win.setTitle(folderName(folder), 'File');
    this.#renderToolbar(folder);
    this.#renderSide();

    const all = this.inTrash ? fs.trashed() : tag ? fs.tagged(tag.id) : fs.children(this.folder);
    this.#items = this.#sorted(this.#query ? all.filter(n => fold(n.name).includes(this.#query)) : all);
    const ids = new Set(this.#items.map(n => n.id));
    this.#selection = new Set([...this.#selection].filter(id => ids.has(id)));
    if (!ids.has(this.#cursor)) this.#cursor = this.#items[0]?.id ?? null;

    const scroll = this.list.scrollTop;
    this.list.classList.toggle('grid', this.#view === 'grid');
    if (!this.#items.length) {
      this.list.replaceChildren(h('div', { class: 'fm-empty' },
        this.#query ? `Nessun elemento corrisponde a «${this.search.value.trim()}»`
          : this.inTrash ? 'Il cestino è vuoto'
          : tag ? 'Nessun elemento ha questo tag. Si assegna dal menu del tasto destro → Tag.'
          : 'Questa cartella è vuota'));
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
    this.statusRight.textContent = this.#message || (this.inTrash ? retentionLabel()
      : tag ? (tag.visible ? 'Tutti gli elementi con questo tag' : 'Tag invisibile: questi elementi sono nascosti altrove')
      : fs.path(this.folder));
    this.statusRight.classList.toggle('msg', !!this.#message);
  }

  #renderToolbar(folder) {
    this.backBtn.disabled = !this.#back.some(id => this.#reachable(id));
    this.forwardBtn.disabled = !this.#forward.some(id => this.#reachable(id));
    this.upBtn.disabled = !folder.parent;
    this.newBtn.disabled = this.inTrash || !!this.inTag;
    this.listBtn.classList.toggle('on', this.#view === 'list');
    this.gridBtn.classList.toggle('on', this.#view === 'grid');
    this.listBtn.setAttribute('aria-pressed', String(this.#view === 'list'));
    this.gridBtn.setAttribute('aria-pressed', String(this.#view === 'grid'));
    this.search.placeholder = `Cerca in ${folderName(folder)}`;

    const trail = this.inTrash || this.inTag ? [folder] : fs.ancestors(this.folder);
    this.crumbs.replaceChildren(...trail.flatMap((n, i) => {
      const last = i === trail.length - 1;
      const crumb = last
        ? h('span', { class: 'fm-crumb current', 'aria-current': 'page' }, folderName(n))
        : h('button', { class: 'fm-crumb', type: 'button', onclick: () => this.go(n.id) }, folderName(n));
      // A folder of the path accepts drops (the trash and tag views are not folders)
      if (fs.exists(n.id)) markItem(crumb, n);
      return i ? [h('span', { class: 'fm-crumb-sep', 'aria-hidden': 'true' }, '›'), crumb] : [crumb];
    }));
  }

  /**
   * The sidebar: places (Home, Scrivania, Documenti…), the tags, the trash and links to files and
   * folders, in the order the user chose (links.js). Its entries can be dragged to another place
   * in it; what is dropped on it is handled by #sideTarget.
   */
  #renderSide() {
    const roots = fs.children(fs.root);
    const trail = new Set(fs.ancestors(this.folder).map(n => n.id));
    const places = [
      { key: 'root', id: fs.root, name: 'Home', glyph: 'home' },
      ...SYSTEM_FOLDERS.map(f => ({ ...f, id: roots.find(n => n.name === f.name && n.system)?.id, glyph: f.icon }))
        .filter(p => p.id).map(p => ({ ...p, key: p.name === DESK_NAME ? 'desk' : p.id })),
    ];
    // The deepest place that contains the current folder is the active one
    const active = this.inTrash || this.inTag ? this.folder : [...places].reverse().find(p => trail.has(p.id))?.id;
    const place = p => h('button', {
      class: p.id === active ? 'fm-place on' : 'fm-place', type: 'button',
      'aria-current': p.id === active ? 'true' : null, onclick: () => this.go(p.id),
    }, icon(p.glyph), h('span', {}, p.name));
    // Tags: everything that has one, wherever it is (invisible ones included: that is where their items are)
    const tagPlace = t => {
      const id = TAG_VIEW + t.id;
      return h('button', {
        class: id === active ? 'fm-place fm-tag on' : 'fm-place fm-tag', type: 'button',
        'aria-current': id === active ? 'true' : null, title: t.visible ? t.name : `${t.name}: tag invisibile, i suoi elementi sono nascosti altrove`,
        onclick: () => this.go(id),
      }, h('span', { class: 'tag-dot', style: { background: t.color }, 'aria-hidden': 'true' }), h('span', {}, t.name),
      t.visible ? null : icon('eyeOff'));
    };
    const list = tags.list();
    const defaults = places.map(p => p.key);
    this.#side = { defaults, desk: places.find(p => p.key === 'desk')?.id };
    // Every entry of "Collegamenti" says what it is (data-entry: its key; data-folder: the folder it opens)
    const entry = (key, el, { node, folder } = {}) => {
      el.dataset.entry = key;
      if (folder) el.dataset.folder = folder;
      el.addEventListener('pointerdown', e => {
        if (e.button === 0 && !e.target.closest('.fm-link-x')) dragItems(e, { ids: [node], stack: this.history });
      });
      return el;
    };
    const link = n => {
      const on = n.id === this.folder;
      const unlink = () => this.#unlink(n);
      const btn = h('button', {
        class: on ? 'fm-place fm-link on' : 'fm-place fm-link', type: 'button', 'aria-current': on ? 'true' : null,
        title: n.parent === fs.root ? `Home › ${n.name}` : `${fs.path(n.parent)} › ${n.name}`, onclick: () => this.open(n),
      }, h('span', { class: 'fm-link-icon' }, itemIcon(n)), h('span', {}, n.name));
      btn.addEventListener('contextmenu', e => {
        e.preventDefault();
        openMenu(e.clientX, e.clientY, [
          { label: 'Apri', icon: 'open', action: () => this.open(n) },
          { label: 'Mostra nella cartella', icon: 'folderOpen', action: () => this.reveal(n.id) },
          '-',
          { label: 'Elimina il collegamento', icon: 'x', action: unlink },
        ]);
      });
      // Canc on the link deletes the link, never the files selected in the list
      btn.addEventListener('keydown', e => {
        if (e.key !== 'Delete') return;
        e.preventDefault();
        e.stopPropagation();
        unlink();
      });
      const x = h('button', {
        class: 'fm-link-x', type: 'button', title: 'Elimina il collegamento (il file resta)',
        'aria-label': `Elimina il collegamento a «${n.name}»`, onclick: unlink,
      }, icon('x'));
      return entry(n.id, h('div', { class: 'fm-link-row' }, btn, x), { node: n.id, folder: n.type === 'folder' ? n.id : null });
    };
    const show = key => {
      const p = places.find(x => x.key === key);
      if (p) return entry(key, place(p), { node: p.id, folder: p.id });
      const n = fs.get(key);
      return n ? link(n) : [];
    };
    const trash = place({ id: TRASH, name: 'Cestino', glyph: 'trash' });
    trash.dataset.trash = '';
    this.side.replaceChildren(
      h('section', { class: 'fm-side-links', 'aria-label': 'Collegamenti' }, h('h6', {}, 'Collegamenti'), ...links.arrange(defaults).flatMap(show)),
      ...(list.length ? [h('h6', {}, 'Tag'), ...list.map(tagPlace)] : []),
      h('hr', { class: 'fm-side-sep' }),
      trash,
      this.gap);
  }

  /** Deletes a link of the sidebar (the file or folder stays where it is); Ctrl Z puts it back. */
  #unlink(n) {
    const { defaults } = this.#side;
    const index = links.arrange(defaults).indexOf(n.id);
    if (index < 0) return;
    links.remove(n.id);
    this.history.push({
      label: `Elimina il collegamento a «${n.name}»`,
      undo: () => links.place([n.id], index, defaults),
      redo: () => links.remove(n.id),
    });
    toast(`Collegamento a «${n.name}» eliminato`);
    this.list.focus();
  }

  /** The sidebar key of a node: a place's, or its own id (a link). */
  #sideKey(id) {
    if (id === fs.root) return 'root';
    if (id === this.#side.desk) return 'desk';
    return fs.exists(id) ? id : null;
  }

  /**
   * What a drop on the sidebar does, from where the pointer is. In "Collegamenti":
   *   in the middle of a folder (a place, or a link to a folder): the items move into it;
   *   near the edge of an entry (between two), on a link to a file, or in the empty part at the
   *   end of the section: a link to each one there (an entry already there moves instead),
   *   shown by a line.
   * On the trash: into the trash. Anywhere else (the tags, below the trash): nothing.
   */
  #sideTarget(hit, x, y, ids) {
    const trash = hit?.closest?.('[data-trash]');
    if (trash) return ids.some(id => !fs.get(id)?.system) ? { el: trash, run: (ev, stack) => this.#trashDropped(ids, stack) } : null;
    const section = this.side.querySelector('.fm-side-links');
    if (!section?.contains(hit)) return null;
    const entries = [...section.querySelectorAll(':scope > [data-entry]')];
    const el = hit.closest('[data-entry]');
    if (el && entries.includes(el)) {
      const r = el.getBoundingClientRect();
      const edge = Math.min(8, r.height / 4);
      const { folder } = el.dataset;
      if (folder && y > r.top + edge && y < r.bottom - edge) {
        const movable = movableInto(ids, folder);
        return movable && { el, run: (ev, stack) => moveInto(stack, movable, folder) };
      }
    }
    let index = entries.findIndex(e => { const r = e.getBoundingClientRect(); return y < r.top + r.height / 2; });
    if (index < 0) index = entries.length;
    const moving = [...new Set(ids.map(id => this.#sideKey(id)).filter(Boolean))];
    const { defaults } = this.#side;
    // Entries dropped right where they already are: nothing to do, no line
    if (!links.changes(moving, index, defaults)) return null;
    const side = this.side.getBoundingClientRect();
    const at = index < entries.length ? entries[index].getBoundingClientRect().top : entries[entries.length - 1].getBoundingClientRect().bottom;
    this.gap.style.top = `${at - side.top + this.side.scrollTop}px`;
    return {
      el: this.gap,
      run: () => {
        const n = links.place(moving, index, defaults);
        if (n) toast(n === 1 ? 'Collegamento aggiunto' : `${n} collegamenti aggiunti`);
      },
    };
  }

  /** Dropped on the trash in the sidebar: always into the trash (Ctrl Z in the view it came from). */
  #trashDropped(ids, stack) {
    const n = ids.filter(id => !fs.get(id)?.system).length;
    removeNodes(stack, ids);
    toast(n === 1 ? 'Spostato nel cestino' : `${n} elementi spostati nel cestino`);
  }

  #header() {
    const columns = this.inTrash ? TRASH_COLUMNS : this.inTag ? TAG_COLUMNS : COLUMNS;
    return h('div', { class: this.inTag ? 'fm-head tagged' : 'fm-head', role: 'presentation' }, columns.map(c => {
      const on = this.#sort.key === c.key;
      return h('button', {
        class: ['fm-col', c.num && 'num', on && 'on'].filter(Boolean).join(' '), type: 'button', tabindex: '-1',
        'aria-sort': on ? (this.#sort.dir > 0 ? 'ascending' : 'descending') : null,
        onclick: () => { this.#sort = { key: c.key, dir: on ? -this.#sort.dir : 1 }; this.render(); },
      }, c.label, on ? h('span', { class: 'fm-arrow', 'aria-hidden': 'true' }, this.#sort.dir > 0 ? '▲' : '▼') : null);
    }));
  }

  #row(n) {
    if (n.trashed) {
      const origin = originLabel(n);
      return this.#option(n, 'fm-row',
        h('span', { class: 'fm-name' }, h('span', { class: 'fm-icon' }, itemIcon(n)), this.#nameNode(n)),
        h('span', {}, dateLabel(n.trashed.at)),
        h('span', { class: 'num' }, sizeLabel(n)),
        h('span', {}, typeLabel(n)),
        h('span', { title: `Ripristinando torna in ${origin}` }, origin));
    }
    const name = h('span', { class: 'fm-name' }, h('span', { class: 'fm-icon' }, itemIcon(n)), this.#nameNode(n), tagDots(n));
    if (this.inTag) {
      const where = locationLabel(n);
      return this.#option(n, 'fm-row tagged', name,
        h('span', { title: where }, where),
        h('span', {}, typeLabel(n)),
        ownerNode(n));
    }
    return this.#option(n, 'fm-row',
      name,
      h('span', {}, dateLabel(n.modified)),
      h('span', { class: 'num' }, sizeLabel(n)),
      h('span', {}, typeLabel(n)),
      ownerNode(n));
  }

  #tile(n) {
    const tile = this.#option(n, 'fm-tile', h('span', { class: 'fm-tile-icon' }, itemIcon(n), tagDots(n, 'fm-tile-tags')), this.#nameNode(n));
    const tagNames = (n.tags ?? []).map(id => tags.get(id)?.name).filter(Boolean);
    tile.title = n.trashed
      ? `${n.name}\nEliminato: ${dateLabel(n.trashed.at)}\nPosizione originale: ${originLabel(n)}`
      : `${n.name}${this.inTag ? `\nPosizione: ${locationLabel(n)}` : ''}\nWorkspace: ${ownerLabel(n)}${tagNames.length ? `\nTag: ${tagNames.join(', ')}` : ''}`;
    return tile;
  }

  #nameNode(n) {
    if (this.#editing === n.id) return h('input', { class: 'fm-rename', type: 'text', value: n.name, spellcheck: 'false', 'aria-label': 'Nuovo nome' });
    return h('span', { class: 'fm-label', title: n.name }, n.name);
  }

  #option(n, cls, ...children) {
    const selected = this.#selection.has(n.id);
    const el = h('div', {
      class: [cls, selected && 'selected', n.id === this.#cursor && 'cursor'].filter(Boolean).join(' '),
      id: `fm-${n.id}`, role: 'option', 'aria-selected': String(selected), dataset: { id: n.id },
    }, ...children);
    return n.trashed ? el : markItem(el, n);
  }

  #sorted(nodes) {
    const { key, dir } = this.#sort;
    const value = n => key === 'type' ? typeLabel(n)
      : key === 'workspace' ? ownerLabel(n)
      : key === 'size' ? (n.type === 'folder' ? (n.trashed ? n.inside : fs.children(n.id).length) : n.size ?? 0)
      : key === 'modified' ? n.modified
      : key === 'deleted' ? n.trashed?.at ?? n.modified
      : key === 'origin' && n.trashed ? originLabel(n)
      : key === 'location' ? locationLabel(n) : n.name;
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
      let narrow = false;   // a plain click on one of several selected items keeps only it, once released
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
        if (!this.#selection.has(id)) this.#select([id], id);
        else narrow = this.#selection.size > 1;
      }
      // Dragging the selection moves it into a folder (here, on the desk, in another window…)
      if (this.inTrash || !this.#selection.has(id)) return;
      dragItems(e, {
        ids: [...this.#selection],
        stack: this.history,
        onEnd: ({ moved }) => { if (!moved && narrow) this.#select([id], id); },
      });
    }, { signal });

    this.list.addEventListener('dblclick', e => {
      const opt = optionOf(e);
      if (!opt || e.target.closest('.fm-rename')) return;
      if (this.inTrash) return this.openSelected();
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
    const toggleView = { label: this.#view === 'list' ? 'Vista a icone' : 'Vista elenco', icon: this.#view === 'list' ? 'grid' : 'list', action: () => this.setView(this.#view === 'list' ? 'grid' : 'list') };
    if (this.inTrash) {
      const empty = !this.#items.length;
      return openMenu(e.clientX, e.clientY, [
        { label: 'Ripristina tutto', icon: 'undo', disabled: empty, action: () => this.restore(fs.trashed().map(n => n.id)) },
        { label: 'Svuota il cestino…', icon: 'trash', danger: true, disabled: empty, action: () => this.empty(e.clientX, e.clientY) },
        '-',
        toggleView,
      ]);
    }
    if (this.inTag) {
      return openMenu(e.clientX, e.clientY, [
        { label: 'Gestisci i tag…', icon: 'gear', action: () => launch('settings', { tab: 'tags' }) },
        '-',
        toggleView,
      ]);
    }
    openMenu(e.clientX, e.clientY, [
      { label: 'Nuova cartella', icon: 'folderPlus', action: () => this.create('folder') },
      { label: 'Nuovo file di testo', icon: 'filePlus', action: () => this.create('file') },
      '-',
      toggleView,
    ]);
  }

  #itemMenu(e) {
    const nodes = this.#items.filter(n => this.#selection.has(n.id));
    const many = nodes.length > 1;
    if (this.inTrash) {
      const ids = nodes.map(n => n.id);
      return openMenu(e.clientX, e.clientY, [
        { label: many ? `Ripristina ${nodes.length} elementi` : 'Ripristina', icon: 'undo', action: () => this.restore(ids) },
        '-',
        { label: 'Elimina definitivamente…', icon: 'trash', shortcut: shortcuts.label('items.delete'), danger: true, action: () => this.purge(ids) },
      ]);
    }
    const system = nodes.some(n => n.system);
    const ids = nodes.map(n => n.id);
    const tag = this.inTag;
    openMenu(e.clientX, e.clientY, [
      { label: many ? `Apri ${nodes.length} elementi` : 'Apri', icon: 'open', shortcut: shortcuts.label('items.open'), action: () => this.openSelected() },
      !many && nodes[0].type === 'file' && { label: 'Apri con…', icon: 'open', action: () => openFile(nodes[0], { choose: true }) },
      !many && nodes[0].type === 'folder' && { label: 'Apri nell’Editor', icon: 'code', action: () => launch('editor', { folder: nodes[0].id }) },
      // In a tag's view items come from everywhere: show one where it is
      tag && !many && { label: 'Mostra nella cartella', icon: 'folderOpen', action: () => this.reveal(nodes[0].id) },
      { label: 'Rinomina', icon: 'pencil', shortcut: shortcuts.label('items.rename'), disabled: many || system, action: () => this.rename(nodes[0].id) },
      tagSubmenu(ids),
      tag && { label: `Togli il tag «${tag.name}»`, icon: 'x', action: () => setTag(ids, tag.id, false) },
      linkEntry(ids),
      '-',
      { label: many ? `Elimina ${nodes.length} elementi` : 'Elimina', icon: 'trash', shortcut: shortcuts.label('items.delete'), danger: true, disabled: system, action: () => this.remove(nodes.map(n => n.id)) },
    ].filter(Boolean));
  }

  // ---------- Internals ----------

  /** A folder that can be shown: an existing one, the trash, or an existing tag. */
  #reachable(id) {
    return id === TRASH || !!viewTag(id) || fs.exists(id);
  }

  /** Where a small menu about an item opens: under its row (or in the middle of the screen). */
  #menuPoint(id) {
    const row = this.list.querySelector(`[data-id="${CSS.escape(id)}"]`)?.getBoundingClientRect();
    return { x: row ? row.left + 40 : innerWidth / 2, y: row ? row.bottom : innerHeight / 2 };
  }

  #travel(from, to) {
    while (from.length) {
      const id = from.pop();
      if (!this.#reachable(id)) continue;
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
    const linked = e.node && links.has(e.node.id);   // a link in the sidebar: its name, or it went
    if (this.inTrash) return linked ? this.render() : undefined;   // the trash redraws on fs 'trash'
    if (this.inTag) return this.render();   // its items can be anywhere
    if (e.type === 'remove' && e.ids.includes(this.folder)) {
      // The open folder is gone: go to the closest folder that still exists
      return this.go(e.parent && fs.exists(e.parent) ? e.parent : fs.root, false);
    }
    const inFolder = e.parent === this.folder || e.from === this.folder;
    const onTrail = e.type !== 'remove' && fs.isInside(this.folder, e.node.id);      // renamed ancestor: title, path
    const inChild = [e.parent, e.from].some(p => p && fs.exists(p) && fs.get(p).parent === this.folder);  // item counts of subfolders
    if (!inFolder && !onTrail && !inChild && !linked) return;
    if (inFolder && e.type !== 'rename') this.#message = '';
    this.render();
  }
}
