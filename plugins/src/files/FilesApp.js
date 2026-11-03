import { Window, h, icon, fs, tags, session, storage, openMenu, shortcuts, toast, UndoStack, history, trackDrag, messageBox } from '@lilos/sdk';
import * as sdk from '@lilos/sdk';   // `automation`, `net`: missing in older lilOS, so not imported by name
import { launch, handleCommand } from '@lilos/system';
import { openFile } from '@lilos/system';
import { itemIcon } from '@lilos/system';
import { addTarget } from '@lilos/system';
import { confirmRemove, confirmPurge, confirmEmptyTrash } from '@lilos/system';
import { recordCreated, renameNode, restoreNodes, removeNodes } from '@lilos/system';
import { markItem, dropZone, dragItems, movableInto, moveInto } from '@lilos/system';
import { links, linkEntry } from '@lilos/system';
import { SYSTEM_FOLDERS, DESK_NAME } from '@lilos/system';
import { onWorkspacesChange } from '@lilos/system';
// What a newer lilOS adds (entries of installed apps in the menu): read from the module, so an older lilOS still runs the app
import * as system from '@lilos/system';
import { tagDots, tagSubmenu, setTag } from '@lilos/system';
import { showProperties } from '@lilos/system';
import { num, typeLabel, folderName, locationLabel, originLabel, ownerLabel, ownerNode, sizeLabel, retentionLabel, dateLabel } from './format.js';
import { SidePanel, MIN_WIDTH } from './SidePanel.js';
import { infoView, Preview, readable, contentKey } from './details.js';
import { Columns, MIN_COL } from './columns.js';
import { t } from './i18n.js';
import { network, mountOf, sideSection, mountMenu, mountBar, readRemote, netChips, openInBrowser } from './network.js';
import { officeEntries, openOffice } from './office.js';
import { newLinkWindow } from './newLink.js';
import { inlineRename } from '../shared/inlineRename.js';
import './files.css';

/** Recording and replaying what the user does (Automata): null in a lilOS without it. */
const automation = () => sdk.automation ?? null;
/** A search is told to the recorder once the user stops typing for this long (or presses Enter). */
const SEARCH_SETTLE = 1000;

/** Biggest file of a network connection the panels read to show it. */
const PREVIEW_NET_MAX = 1 << 20;

/** Narrowest the list gets before the panels on the right give up some of their width. */
const MAIN_MIN = 260;

const VIEW_KEY = 'files-view';
/** The sections of the sidebar folded away with their triangle (Collegamenti, Tag, Rete), by key. */
const FOLDED_KEY = 'files-side-folded';
/** The views of the list: rows with columns, small icons, big previews (the thumbnails apps make of files). */
const VIEWS = ['list', 'grid', 'thumbs'];
/** Longest side of a thumbnail in the preview view (CSS pixels), and how wide a tile is there with its gap. */
const THUMB = 112;
const TILE = { grid: 92, thumbs: 140 };
/** The trash is shown like a folder, with this id (not a node: fs.get() does not see it). */
const TRASH = fs.trashRoot;
/** Columns of the list (functions: their labels are in the language of now). */
const COLUMNS = () => [
  { key: 'name', label: t('column.name') },
  { key: 'modified', label: t('column.modified') },
  { key: 'size', label: t('column.size'), num: true },
  { key: 'type', label: t('column.type') },
  { key: 'workspace', label: t('column.workspace') },
];
const TRASH_COLUMNS = () => [
  { key: 'name', label: t('column.name') },
  { key: 'deleted', label: t('column.deleted') },
  { key: 'size', label: t('column.size'), num: true },
  { key: 'type', label: t('column.type') },
  { key: 'origin', label: t('column.origin') },
];

/** Everything with a tag, wherever it is, is shown like a folder with the id 'tag:<tag id>'. */
const TAG_VIEW = 'tag:';
const TAG_COLUMNS = () => [
  { key: 'name', label: t('column.name') },
  { key: 'location', label: t('column.location') },
  { key: 'type', label: t('column.type') },
  { key: 'workspace', label: t('column.workspace') },
];
/** The tag a view id shows (null if it is not a tag view, or the tag is gone). */
const viewTag = id => (typeof id === 'string' && id.startsWith(TAG_VIEW) ? tags.get(id.slice(TAG_VIEW.length)) : null);

/** True if some of the ids can go into the trash (not system nodes, not already in it). */
const trashable = ids => ids.some(id => fs.exists(id) && !fs.get(id).system);

/** Folder to show for launch arguments: args.folder, the trash with args.trash, a tag's items with args.tag. */
function startFolder(a) {
  if (a?.trash || a?.folder === TRASH) return TRASH;
  if (typeof a?.tag === 'string' && tags.get(a.tag)) return TAG_VIEW + a.tag;
  if (viewTag(a?.folder)) return a.folder;
  return a?.folder && fs.exists(a.folder) ? a.folder : null;
}

/** What was asked to open but is not there any more: 'folder', 'tag' or null (nothing missing). */
function missing(a) {
  if (startFolder(a)) return null;
  if (typeof a?.tag === 'string' || (typeof a?.folder === 'string' && a.folder.startsWith(TAG_VIEW))) return 'tag';
  return a?.folder ? 'folder' : null;
}

/** File Manager: browse the folders of the file system. One window, opened on args.folder (or the trash, or a tag). */
export default function createFiles({ args, openWindow } = {}) {
  const win = new Window({ title: t('@name'), icon: 'folder', width: 1000, height: 520, minWidth: 520, minHeight: 300 });
  const browser = new FileBrowser(win, openWindow);
  browser.go(startFolder(args) ?? fs.root, false);
  const gone = missing(args);
  // Once the window is on screen (lilOS opens it after this returns)
  if (gone) requestAnimationFrame(() => browser.notFound(gone));
  else if (args?.link) requestAnimationFrame(() => browser.followLink(args.link));
  // Launched again (e.g. a folder opened from the desk): show that folder in this window
  win.on('launch', a => {
    const folder = startFolder(a);
    // lilOS records the folder opened with the app itself
    if (folder) browser.go(folder, true, false);
    else if (missing(a)) return browser.notFound(missing(a));
    if (a?.link) browser.followLink(a.link);
  });
  win.getState = () => ({ folder: browser.folder });
  // What is selected here, for what acts on the selection from outside (an automation's shortcut)
  win.selection = () => browser.selected;
  return win;
}

/**
 * Entry point newLink: the window "Nuovo collegamento" alone, making the link in args.folder (the
 * desk's Nuovo → Collegamento opens it). Launched again, the window already open stays.
 */
export function newLink({ args, openWindow } = {}) {
  const folder = args?.folder && fs.get(args.folder)?.type === 'folder' && !fs.isRemote?.(args.folder) ? args.folder : fs.root;
  return newLinkWindow({ folder, openWindow: openWindow ?? (() => {}) });
}

/** Lowercase without accents, for search. */
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

class FileBrowser {
  folder = fs.root;
  #back = [];
  #forward = [];
  #view = VIEWS.includes(storage.get(VIEW_KEY)) ? storage.get(VIEW_KEY) : 'list';
  #folded = new Set([].concat(storage.get(FOLDED_KEY) ?? []).filter(k => typeof k === 'string'));
  #sort = { key: 'name', dir: 1 };
  #columns = new Columns();   // widths and visibility of the list view's columns
  #query = '';
  #searched = '';       // the search last told to the automation recorder
  #searchTimer = 0;
  #items = [];          // nodes shown, in order
  #expanded = new Set();  // folders opened in place in the list view (a tree), by id
  #depth = new Map();     // id → how deep an item of the list is in that tree (0: in the folder shown)
  #selection = new Set();
  #anchor = null;       // id where a Shift range starts
  #cursor = null;       // id with the keyboard focus
  #editing = null;      // id being renamed
  #message = '';
  #addressSaid = '';     // the last message about a path written in the address
  #asking = false;       // a message box about the address is open: it keeps the text written
  #side = { defaults: [], desk: null };   // the sidebar's default places and the desk's id (last render)
  #content = { key: null, text: null };   // the last file read for the panels (one read for both)
  /** Undo history of this window (Ctrl Z while it has the focus): create, rename, delete. */
  history = new UndoStack();

  constructor(win, openWindow) {
    this.win = win;
    /** Opens a window of the app (the network's dialogs, the file picker). */
    this.openWindow = openWindow ?? (() => {});
    const tool = (glyph, label, onclick) => h('button', { class: 'fm-btn', type: 'button', title: label, 'aria-label': label, onclick }, icon(glyph));

    this.backBtn = tool('arrowLeft', t('toolbar.back'), () => this.back());
    this.forwardBtn = tool('arrowRight', t('toolbar.forward'), () => this.forward());
    this.upBtn = tool('arrowUp', t('toolbar.up'), () => this.up());
    this.crumbs = h('nav', { class: 'fm-path', 'aria-label': t('toolbar.path') });
    // A click on the path, outside its folders, makes it text to write in (see editAddress)
    this.crumbs.addEventListener('click', e => { if (!e.target.closest('button')) this.editAddress(); });
    this.address = h('input', { class: 'fm-path fm-address', type: 'text', spellcheck: 'false', autocomplete: 'off', hidden: true, 'aria-label': t('toolbar.address') });
    this.address.addEventListener('input', () => this.#badAddress(false));
    this.address.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); this.#goAddress(); }
      if (e.key === 'Escape') { e.preventDefault(); this.#closeAddress(true); }
    });
    this.address.addEventListener('blur', () => { if (!this.#asking) this.#closeAddress(false); });
    this.newBtn = tool('folderPlus', t('menu.newFolder'), () => this.create('folder'));
    this.listBtn = tool('list', t('view.list'), () => this.setView('list'));
    this.gridBtn = tool('grid', t('view.grid'), () => this.setView('grid'));
    this.thumbsBtn = tool('image', t('view.thumbs'), () => this.setView('thumbs'));
    this.previewBtn = tool('sidebar', '', () => this.preview.toggle());
    this.infoBtn = tool('info', '', () => this.info.toggle());
    this.search = h('input', { type: 'text', spellcheck: 'false', 'aria-label': t('toolbar.search') });
    this.search.addEventListener('input', () => {
      this.#query = fold(this.search.value.trim());
      this.render();
      clearTimeout(this.#searchTimer);
      this.#searchTimer = setTimeout(() => this.#recordSearch(), SEARCH_SETTLE);
    });
    this.search.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.#recordSearch();
      if (e.key === 'Escape' && this.search.value) { e.stopPropagation(); this.search.value = ''; this.#query = ''; this.render(); this.#recordSearch(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); this.list.focus(); }
    });

    this.side = h('aside', { class: 'fm-side', 'aria-label': t('side.label') });
    this.list = h('div', { class: 'fm-list', role: 'listbox', tabindex: '0', 'aria-multiselectable': 'true', 'aria-label': t('list.label') });
    /** Inside a network connection: where it is connected (network.js mountBar). */
    this.mountSlot = h('div', { class: 'fm-mountslot' });
    this.statusLeft = h('span');
    this.statusRight = h('span', { class: 'fm-status-right' });

    // Panels on the right: the preview next to the list, the information at the edge
    const panel = (key, texts, width, open) => new SidePanel({
      key, ...texts, width, open,
      room: () => this.#room() - (key === 'info' ? this.preview : this.info).shown,
      onLayout: () => { this.#fit(); this.#renderPanels(); },
    });
    this.preview = panel('preview', { title: t('panel.preview.title'), resizeLabel: t('panel.preview.resize'), closeLabel: t('panel.preview.close') }, 300, false);
    this.info = panel('info', { title: t('panel.info.title'), resizeLabel: t('panel.info.resize'), closeLabel: t('panel.info.close') }, 260, true);
    this.previewView = new Preview(this.preview.body, { text: n => this.#read(n), open: n => this.open(n) });

    this.main = h('div', { class: 'fm' },
      this.side,
      h('div', { class: 'fm-main' }, this.mountSlot, this.list, h('div', { class: 'fm-status' }, this.statusLeft, this.statusRight)),
      this.preview.el,
      this.info.el);
    win.body.append(
      h('div', { class: 'fm-toolbar' },
        this.backBtn, this.forwardBtn, this.upBtn,
        this.crumbs, this.address,
        this.newBtn,
        h('span', { class: 'fm-sep' }),
        this.listBtn, this.gridBtn, this.thumbsBtn,
        h('span', { class: 'fm-sep' }),
        this.previewBtn, this.infoBtn,
        h('label', { class: 'fm-search' }, icon('search'), this.search)),
      this.main);
    // A narrower window: the panels give up width before the list does
    const fit = new ResizeObserver(() => this.#fit());
    fit.observe(this.main);

    this.#bindList();
    // Files and folders dropped on the list (not on one of its folders) go into the folder shown,
    // or into the trash when it is shown (see #listTarget)
    dropZone(this.list, { target: (hit, x, y, ids) => this.#listTarget(ids) });
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
    // Connections added, changed, connected or not: the Rete section and the bar over the list
    const offNet = network() ? sdk.net.on('mounts', () => { if (this.#reachable(this.folder)) this.render(); }) : () => {};
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
    const commands = [
      handleCommand('files.info', { isActive: () => win.active, run: () => this.info.toggle() }),
      handleCommand('files.preview', { isActive: () => win.active, run: () => this.preview.toggle() }),
      handleCommand('files.address', { isActive: () => win.active, run: () => this.editAddress() }),
    ];
    win.on('destroy', () => {
      off(); offLinks(); offScope(); offWorkspaces(); offTrash(); offTags(); offNet(); removeTarget(); detach();
      commands.forEach(c => c()); fit.disconnect(); this.previewView.destroy(); clearTimeout(this.#searchTimer);
    });
    this.#handleAutomation();
  }

  /** True while the trash is shown. */
  get inTrash() { return this.folder === TRASH; }
  /** Ids of the selected items (none in the trash: they cannot be worked on). */
  get selected() { return this.inTrash ? [] : [...this.#selection]; }

  /** The tag whose items are shown (everything with it, wherever it is), or null. */
  get inTag() { return viewTag(this.folder); }

  /** True when folders open in place, as a tree: the list view (not in the trash, whose folders cannot be opened). */
  get tree() { return this.#view === 'list' && !this.inTrash; }

  // ---------- Navigation ----------

  /**
   * Shows a folder (or the trash, or a tag's items). record: it goes in the Back history; byUser:
   * the user went there (told to the automation recorder; not the folder a window opens on).
   */
  go(id, record = true, byUser = record) {
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
    clearTimeout(this.#searchTimer);
    this.#searched = '';
    // Coming back up: keep the folder we left selected, like a file manager does
    const child = fs.ancestors(previous).find(n => n.parent === id);
    this.#cursor = child?.id ?? null;
    if (child) this.#selection.add(child.id);
    this.#anchor = this.#cursor;
    this.render();
    this.list.scrollTop = 0;
    if (fs.isRemote?.(id)) this.#readRemote(id);
    if (byUser && id !== previous) this.#recordGo();
  }

  /** A folder of a network connection: read from the server now (it is opened), saying so meanwhile. */
  async #readRemote(id) {
    this.#say(t('net.loading'));
    const read = await readRemote(this, id);
    if (this.folder === id && this.#message === t('net.loading')) this.#say(read ? '' : t('net.notRead'));
  }

  /** An error of the network, in a message box: resolves with the button pressed ('retry' with retry). */
  netError(err, { retry = false, title = t('net.error.title') } = {}) {
    return this.#error(title, err?.message ?? String(err), retry ? ['retry', 'cancel'] : ['ok']);
  }

  /** Opens the folder that holds a node, with the node selected. */
  reveal(id) {
    const node = fs.get(id);
    if (!node) return;
    this.go(node.parent);
    if (fs.isHidden(id)) this.#say(t('message.hiddenByTag', { name: node.name }));
    else this.#select([id], id);
  }

  back() { this.#travel(this.#back, this.#forward); }
  forward() { this.#travel(this.#forward, this.#back); }

  up() {
    const parent = fs.get(this.folder)?.parent;
    if (parent) this.go(parent);
  }

  /**
   * The path as text, '/home/eugenio/Documenti/Note', to write another one in (Ctrl L, or a click on
   * the path outside its folders). Enter goes there (to the folder that holds it, for a file).
   */
  editAddress() {
    if (this.address.hidden) {
      this.address.value = this.inTrash || this.inTag ? `${fs.home}/` : fs.path(this.folder);
      this.#badAddress(false);
      this.crumbs.hidden = true;
      this.address.hidden = false;
    }
    this.address.focus();
    this.address.select();
  }

  /** Back to the folders of the path. focus: give the focus back to the list (Enter, Esc). */
  #closeAddress(focus) {
    if (this.address.hidden) return;
    this.address.hidden = true;
    this.crumbs.hidden = false;
    // What it said of a path not found goes with it
    if (this.#message && this.#message === this.#addressSaid) this.#say('');
    if (focus) this.list.focus();
  }

  async #goAddress() {
    const text = this.address.value.trim().replace(/\\/g, '/');
    const node = text ? fs.resolve(text) : null;
    if (!node && text) {
      // Riprova: back to the text written, to correct it; Annulla (Esc): back to the path
      this.#badAddress(true);
      this.#asking = true;
      const answer = await this.#error(t('error.pathNotFound'), t('message.noPath', { path: text }), ['retry', 'cancel']);
      this.#asking = false;
      if (answer !== 'retry') return this.#closeAddress(true);
      this.address.focus();
      this.address.setSelectionRange(this.address.value.length, this.address.value.length);
      return;
    }
    if (!node) {
      this.#badAddress(true);
      this.#addressSaid = text ? t('message.noPath', { path: text }) : t('message.typePath', { path: fs.path(this.inTrash || this.inTag ? fs.root : this.folder) });
      return this.#say(this.#addressSaid);
    }
    this.#closeAddress(true);
    if (node.type === 'folder') this.go(node.id);
    else this.reveal(node.id);
  }

  #badAddress(bad) {
    this.address.classList.toggle('bad', bad);
    this.address.setAttribute('aria-invalid', String(bad));
  }

  setView(view) {
    if (view !== this.#view) automation()?.record('files.view', { params: { mode: view } });
    this.#view = view;
    storage.set(VIEW_KEY, view);
    this.render();
  }

  // ---------- Actions ----------

  open(node) {
    if (node.type === 'folder') return this.go(node.id);
    if (node.type === 'app') return launch(node.app);
    if (node.type === 'link') return this.#openLink(node);
    // A document with no bytes of its own (Google's): it opens on the provider's site
    if (node.net && node.web) return openInBrowser(this, node.id);
    // A document of OneDrive: Office for the web (unless an app of lilOS is chosen for it)
    if (openOffice(this, node)) return;
    openFile(node);
  }

  /**
   * A link: what it points to, a folder here, a file with its app. On a connection it is read from
   * the server asking the password when needed; not found, lilOS says so and marks the link broken.
   */
  async #openLink(node) {
    if (node.link?.kind === 'web') return system.openWebLink?.(node.link.url);
    const target = await system.findLinkTarget?.(node, { win: this.win, read: id => readRemote(this, id) });
    if (target) this.open(target);
  }

  /** Launched to open a link (lilOS hands it here when a connection asks for a password). */
  followLink(id) {
    const node = fs.get(id);
    if (node?.type === 'link') this.#openLink(node);
  }

  /** "Nuovo collegamento…": the window to write where a link points, making it in the folder shown (selected once made). */
  newLink() {
    if (this.inTrash || this.inTag) return;
    const folder = this.folder;
    this.openWindow(newLinkWindow({
      folder, openWindow: this.openWindow,
      onMade: id => {
        recordCreated(this.history, id);
        if (this.folder === folder) this.#select([id], id);
      },
    }));
  }

  /** "Aggiungi un collegamento al desktop": one on this workspace's desk to each item (Ctrl Z takes them away). */
  addDeskLinks(ids) {
    let made;
    try {
      made = system.addDeskLinks(ids);
    } catch (err) {
      return void this.#error(t('error.deskLink'), err.message);
    }
    made.forEach(id => recordCreated(this.history, id));
    if (made.length) toast(t('toast.deskLinks', { n: made.length, count: num(made.length) }));
  }

  openSelected() {
    // Trashed items do not open: restore them first
    if (this.inTrash) return this.#say(t('message.restoreToOpen'));
    const nodes = this.#items.filter(n => this.#selection.has(n.id));
    const folder = nodes.find(n => n.type === 'folder');
    nodes.filter(n => n.type !== 'folder').forEach(n => this.open(n));
    if (folder) this.go(folder.id);
  }

  create(type) {
    if (this.inTrash || this.inTag) return;
    if (this.#query) { this.search.value = ''; this.#query = ''; }
    let node;
    try {
      node = fs.create(this.folder, { type, name: type === 'folder' ? t('create.folderName') : t('create.fileName') });
    } catch (err) {
      this.#error(type === 'folder' ? t('error.createFolder') : t('error.createFile'), err.message);
      return;
    }
    this.#select([node.id]);
    this.rename(node.id, true);
  }

  /** Inline rename in the list or grid. created: the node was just made (one undo step with it). */
  rename(id, created = false) {
    const node = fs.get(id);
    if (!node || node.system) return;
    if (node.noRename) return this.#say(t('message.noRename', { name: node.name }));
    this.#editing = id;
    this.render();
    const input = this.list.querySelector('.fm-rename');
    if (!input) return;
    // Acted on in the same task as the key or the blur: the list is drawn again at once
    inlineRename(input, node, {
      onDone: name => {
        this.#editing = null;
        if (name && fs.exists(id)) {
          try { renameNode(created ? null : this.history, id, name); } catch (err) {
            // Riprova: the name can be changed again
            this.#error(t('error.rename', { name: node.name }), err.message, ['retry', 'cancel'])
              .then(answer => { if (answer === 'retry' && fs.exists(id)) this.rename(id); });
          }
        }
        if (created) recordCreated(this.history, id);
        this.render();
        this.list.focus();
      },
    });
  }

  /**
   * Opens or closes a folder in place (list view). deep: its subfolders too, at any depth.
   * Closed, what was selected inside it gives the selection to the folder.
   */
  setOpen(id, open, deep = false) {
    const folders = [id];
    if (deep) for (let i = 0; i < folders.length; i++) folders.push(...fs.children(folders[i]).filter(n => n.type === 'folder').map(n => n.id));
    folders.forEach(f => (open ? this.#expanded.add(f) : this.#expanded.delete(f)));
    if (open) folders.filter(f => fs.isRemote?.(f)).forEach(f => readRemote(this, f));
    if (!open) {
      const inside = x => x != null && x !== id && fs.isInside(x, id);
      if (inside(this.#cursor)) this.#cursor = id;
      if (inside(this.#anchor)) this.#anchor = id;
      if ([...this.#selection].some(inside)) this.#selection = new Set([...this.#selection].filter(x => !inside(x)).concat(id));
    }
    this.render();
  }

  remove(ids) {
    if (this.inTrash) return this.purge(ids);
    const removable = ids.filter(id => !fs.get(id)?.system && !fs.get(id)?.noRemove);
    if (!removable.length) return void this.#error(t('error.delete'), ids.some(id => fs.get(id)?.noRemove) ? t('message.noRemove') : t('message.systemFolders'));
    const { x, y } = this.#menuPoint(removable[0]);
    confirmRemove(removable, x, y, this.history);
  }

  // ---------- Trash ----------

  /** Takes trashed items back where they were (undoable); says where they went. */
  restore(ids) {
    const restored = restoreNodes(this.history, ids);
    if (!restored.length) return;
    const places = [...new Set(restored.map(r => (r.parent === fs.root ? t('place.home') : fs.path(r.parent))))];
    const count = num(restored.length);
    toast(restored.length === 1 ? t('toast.restored', { name: fs.get(restored[0].id).name, place: places[0] })
      : places.length === 1 ? t('toast.restoredMany', { count, place: places[0] })
      : t('toast.restoredManyPlaces', { count, folders: num(places.length) }));
  }

  /** Deletes trashed items for good, always asking first (it cannot be undone). */
  purge(ids) {
    const nodes = this.#items.filter(n => ids.includes(n.id));
    if (!nodes.length) return;
    const { x, y } = this.#menuPoint(nodes[0].id);
    confirmPurge(nodes.map(n => n.id), x, y);
  }

  /** Empties the trash, asking first. */
  empty(x, y) {
    confirmEmptyTrash(x, y);
  }

  // ---------- Rendering ----------

  render() {
    const tag = this.inTag;
    const folder = this.inTrash ? { id: TRASH, name: t('place.trash'), parent: null }
      : tag ? { id: this.folder, name: t('place.tag', { name: tag.name }), parent: null }
      : fs.get(this.folder);
    if (!folder) return;
    this.win.setTitle(folderName(folder), t('@name'));
    this.#renderToolbar(folder);
    this.#renderSide();
    const bar = !this.inTrash && !tag && network() ? mountBar(this, this.folder) : null;
    this.mountSlot.replaceChildren(...(bar ? [bar] : []));

    const all = this.inTrash ? fs.trashed() : tag ? fs.tagged(tag.id) : fs.children(this.folder);
    this.#depth.clear();
    this.#items = this.#flatten(all);
    const ids = new Set(this.#items.map(n => n.id));
    this.#selection = new Set([...this.#selection].filter(id => ids.has(id)));
    if (!ids.has(this.#cursor)) this.#cursor = this.#items[0]?.id ?? null;

    const scroll = this.list.scrollTop;
    this.list.classList.toggle('grid', this.#view !== 'list');
    this.list.classList.toggle('thumbs', this.#view === 'thumbs');
    this.list.classList.toggle('tree', this.tree);
    this.list.setAttribute('role', this.tree ? 'tree' : 'listbox');
    if (!this.#items.length) {
      this.list.replaceChildren(h('div', { class: 'fm-empty' },
        this.#query ? t('empty.noMatch', { query: this.search.value.trim() })
          : this.inTrash ? t('empty.trash')
          : tag ? t('empty.tag')
          : t('empty.folder')));
    } else if (this.#view === 'list') {
      this.#layoutColumns();
      this.list.replaceChildren(this.#header(), ...this.#items.map(n => this.#row(n)));
    } else {
      this.list.replaceChildren(...this.#items.map(n => this.#tile(n)));
    }
    this.list.scrollTop = scroll;
    this.list.setAttribute('aria-activedescendant', this.#cursor ? `fm-${this.#cursor}` : '');

    const n = all.length;
    const sel = this.#selection.size;
    this.statusLeft.textContent = t('status.items', { n, count: num(n) }) + (sel ? ` · ${t('status.selected', { n: sel, count: num(sel) })}` : '');
    this.statusRight.textContent = this.#message || (this.inTrash ? retentionLabel()
      : tag ? (tag.visible ? t('status.tag') : t('status.tagHidden'))
      : fs.path(this.folder));
    this.statusRight.classList.toggle('msg', !!this.#message);
    this.#renderPanels();
  }

  // ---------- Panels on the right ----------

  /** Information and preview of the selection (the information of the folder shown, with none). */
  #renderPanels() {
    const toggles = [
      [this.previewBtn, this.preview, 'files.preview', t('panel.preview.show'), t('panel.preview.hide')],
      [this.infoBtn, this.info, 'files.info', t('panel.info.show'), t('panel.info.hide')],
    ];
    for (const [btn, panel, id, show, hide] of toggles) {
      const keys = shortcuts.label(id);
      const title = `${panel.open ? hide : show}${keys ? ` (${keys})` : ''}`;
      btn.title = title;
      btn.setAttribute('aria-label', title);
      btn.setAttribute('aria-pressed', String(panel.open));
      btn.classList.toggle('on', panel.open);
    }
    if (!this.info.open && !this.preview.open) return;
    const nodes = this.#items.filter(n => this.#selection.has(n.id));
    if (this.preview.open) this.previewView.update(nodes);
    if (this.info.open) {
      const tag = this.inTag;
      const place = this.inTrash ? { trash: true } : tag ? { tag } : { node: fs.get(this.folder) };
      if (!place.trash && !place.tag && !place.node) return;
      const body = this.info.body;
      const scroll = body.scrollTop;
      body.replaceChildren(infoView({ nodes, place, text: n => this.#read(n) }));
      body.scrollTop = scroll;
    }
  }

  /** Content of a file for the panels: read once while it does not change. */
  #read(n) {
    if (!readable(n)) return Promise.reject(new Error(t('error.notFile')));
    // On a server: only small files (the preview would download it)
    if (n.net && (n.size ?? 0) > PREVIEW_NET_MAX) return Promise.reject(new Error(t('net.preview.big')));
    const key = contentKey(n);
    if (this.#content.key !== key) this.#content = { key, text: fs.read(n.id) };
    return this.#content.text;
  }

  /** Width the panels on the right can take together, leaving the list at least MAIN_MIN. */
  #room() {
    return this.main.clientWidth - this.side.offsetWidth - MAIN_MIN;
  }

  /** Shows each open panel as wide as chosen, or narrower (in proportion) if the window is not wide enough. */
  #fit() {
    const open = [this.preview, this.info].filter(p => p.open);
    if (!open.length || !this.main.isConnected) return;
    const want = open.reduce((sum, p) => sum + p.width, 0);
    const scale = Math.min(1, Math.max(0, this.#room()) / want);
    open.forEach(p => p.show(Math.max(MIN_WIDTH, Math.floor(p.width * scale))));
  }

  #renderToolbar(folder) {
    this.backBtn.disabled = !this.#back.some(id => this.#reachable(id));
    this.forwardBtn.disabled = !this.#forward.some(id => this.#reachable(id));
    this.upBtn.disabled = !folder.parent;
    this.newBtn.disabled = this.inTrash || !!this.inTag;
    for (const [btn, view] of [[this.listBtn, 'list'], [this.gridBtn, 'grid'], [this.thumbsBtn, 'thumbs']]) {
      btn.classList.toggle('on', this.#view === view);
      btn.setAttribute('aria-pressed', String(this.#view === view));
    }
    this.search.placeholder = t('toolbar.searchIn', { name: folderName(folder) });

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
      { key: 'root', id: fs.root, name: t('place.home'), glyph: 'home' },
      ...SYSTEM_FOLDERS.map(f => ({ ...f, id: roots.find(n => n.name === f.name && n.system)?.id, glyph: f.icon }))
        .filter(p => p.id).map(p => ({ ...p, key: p.name === DESK_NAME ? 'desk' : p.id })),
    ];
    // The deepest place that contains the current folder is the active one (inside a connection: its entry in Rete)
    const mount = fs.ancestors(this.folder).find(n => n.mount)?.id ?? null;
    const active = this.inTrash || this.inTag ? this.folder : mount ? null : [...places].reverse().find(p => trail.has(p.id))?.id;
    const place = p => h('button', {
      class: p.id === active ? 'fm-place on' : 'fm-place', type: 'button',
      'aria-current': p.id === active ? 'true' : null, onclick: () => this.go(p.id),
    }, icon(p.glyph), h('span', {}, p.name));
    // Tags: everything that has one, wherever it is (invisible ones included: that is where their items are)
    const tagPlace = tag => {
      const id = TAG_VIEW + tag.id;
      return h('button', {
        class: id === active ? 'fm-place fm-tag on' : 'fm-place fm-tag', type: 'button',
        'aria-current': id === active ? 'true' : null, title: tag.visible ? tag.name : t('side.tagHidden', { name: tag.name }),
        onclick: () => this.go(id),
      }, h('span', { class: 'tag-dot', style: { background: tag.color }, 'aria-hidden': 'true' }), h('span', {}, tag.name),
      tag.visible ? null : icon('eyeOff'));
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
        title: `${locationLabel(n)} › ${n.name}`, onclick: () => this.open(n),
      }, h('span', { class: 'fm-link-icon' }, itemIcon(n)), h('span', {}, n.name));
      btn.addEventListener('contextmenu', e => {
        e.preventDefault();
        openMenu(e.clientX, e.clientY, [
          { label: t('menu.open'), icon: 'open', action: () => this.open(n) },
          { label: t('menu.reveal'), icon: 'folderOpen', action: () => this.reveal(n.id) },
          '-',
          { label: t('menu.unlink'), icon: 'x', action: unlink },
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
        class: 'fm-link-x', type: 'button', title: t('side.unlinkTitle'),
        'aria-label': t('link.remove', { name: n.name }), onclick: unlink,
      }, icon('x'));
      return entry(n.id, h('div', { class: 'fm-link-row' }, btn, x), { node: n.id, folder: n.type === 'folder' ? n.id : null });
    };
    const show = key => {
      const p = places.find(x => x.key === key);
      if (p) return entry(key, place(p), { node: p.id, folder: p.id });
      const n = fs.get(key);
      return n ? link(n) : [];
    };
    const trash = place({ id: TRASH, name: t('place.trash'), glyph: 'trash' });
    trash.dataset.trash = '';
    const rete = roots.find(n => n.system && n.name === system.NETWORK_NAME)?.id ?? null;
    const plain = label => h('h6', { class: 'fm-side-head' }, h('span', { class: 'fm-side-label' }, label));
    this.side.replaceChildren(
      this.#fold('links', t('side.links'), h('section', { class: 'fm-side-links', 'aria-label': t('side.links') }, plain(t('side.links')), ...links.arrange(defaults).flatMap(show))),
      ...(list.length ? [this.#fold('tags', t('side.tags'), h('section', { class: 'fm-side-tags', 'aria-label': t('side.tags') }, plain(t('side.tags')), ...list.map(tagPlace)))] : []),
      ...sideSection(this, { active: mount, reteFolder: rete }).map(s => this.#fold('net', t('net.section'), s)),
      h('hr', { class: 'fm-side-sep' }),
      trash,
      this.gap);
  }

  /**
   * A section of the sidebar that folds: a triangle at the left of its title shows or hides what is
   * under it (a click on a plain title too). Folded or not, it stays so (FOLDED_KEY).
   */
  #fold(key, label, section) {
    const open = !this.#folded.has(key);
    const head = section.querySelector(':scope > h6');
    const text = t(open ? 'side.collapse' : 'side.expand', { name: label });
    const toggle = () => {
      if (open) this.#folded.add(key); else this.#folded.delete(key);
      storage.set(FOLDED_KEY, [...this.#folded]);
      this.#renderSide();
      this.side.querySelector(`[data-fold="${key}"]`)?.focus();
    };
    head.prepend(h('button', {
      class: open ? 'fm-side-fold open' : 'fm-side-fold', type: 'button', dataset: { fold: key },
      title: text, 'aria-label': text, 'aria-expanded': String(open), onclick: toggle,
    }));
    head.querySelector('.fm-side-label')?.addEventListener('click', toggle);
    section.classList.toggle('folded', !open);
    return section;
  }

  /** Deletes a link of the sidebar (the file or folder stays where it is); Ctrl Z puts it back. */
  #unlink(n) {
    const { defaults } = this.#side;
    const index = links.arrange(defaults).indexOf(n.id);
    if (index < 0) return;
    links.remove(n.id);
    this.history.push({
      label: t('link.remove', { name: n.name }),
      undo: () => links.place([n.id], index, defaults),
      redo: () => links.remove(n.id),
    });
    toast(t('toast.unlinked', { name: n.name }));
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
    if (trash) return trashable(ids) ? { el: trash, run: (ev, stack) => this.#trashDropped(ids, stack) } : null;
    const mount = hit?.closest?.('.fm-mount');
    if (mount) {
      const movable = movableInto(ids, mount.dataset.folder);
      return movable && { el: mount, run: (ev, stack) => moveInto(stack, movable, mount.dataset.folder) };
    }
    const section = this.side.querySelector('.fm-side-links');
    if (!section?.contains(hit) || section.classList.contains('folded')) return null;
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
        if (n) toast(t('toast.linksAdded', { n, count: num(n) }));
      },
    };
  }

  /** What a drop on the list does: into the folder shown, into the trash shown, nothing on a tag. */
  #listTarget(ids) {
    if (this.inTrash) return trashable(ids) ? { el: this.list, run: (ev, stack) => this.#trashDropped(ids, stack) } : null;
    if (this.inTag) return null;
    const movable = movableInto(ids, this.folder);
    return movable && { el: this.list, run: (ev, stack) => moveInto(stack, movable, this.folder) };
  }

  /** Dropped on the trash (in the sidebar or shown): always into the trash (Ctrl Z in the view it came from). */
  #trashDropped(ids, stack) {
    const n = ids.filter(id => !fs.get(id)?.system).length;
    removeNodes(stack, ids);
    toast(t('toast.trashed', { n, count: num(n) }));
  }

  // ---------- Columns of the list view ----------

  /** All the columns of the view shown (hidden ones too). */
  #viewColumns() {
    return (this.inTrash ? TRASH_COLUMNS : this.inTag ? TAG_COLUMNS : COLUMNS)();
  }

  /** Puts the widths of the columns shown on the list: header and rows follow them. measuring: a column sized by its content. */
  #layoutColumns(measuring = null) {
    const { template, min } = this.#columns.layout(this.#columns.shown(this.#viewColumns()), measuring);
    this.list.style.setProperty('--fm-cols', template);
    this.list.style.setProperty('--fm-min', min);
  }

  /** Makes a column as wide as its widest cell, header included. */
  #fitColumn(key) {
    const cells = this.list.querySelectorAll(`[data-col="${key}"]`);
    if (!cells.length) return;   // empty folder, or the icon view: nothing to measure
    this.#layoutColumns(key);
    let widest = MIN_COL;
    for (const cell of cells) widest = Math.max(widest, cell.offsetWidth + 1);
    this.#columns.resize(key, widest);
    this.#layoutColumns();
  }

  #showColumn(key, show) {
    this.#columns.setHidden(key, !show);
    // Sorted by a column that is no longer there: by name
    if (!show && this.#sort.key === key) this.#sort = { key: 'name', dir: 1 };
    this.render();
  }

  /** Menu entries of the columns: each one shown or not (the name always is), fit them all, defaults. */
  #columnItems() {
    const columns = this.#viewColumns();
    return [
      ...columns.map(c => {
        const shown = c.key === 'name' || !this.#columns.hidden.has(c.key);
        return { label: c.label, icon: shown ? 'check' : null, disabled: c.key === 'name', action: () => this.#showColumn(c.key, !shown) };
      }),
      '-',
      { label: t('columns.fitAll'), icon: 'fit', action: () => this.#columns.shown(columns).forEach(c => this.#fitColumn(c.key)) },
      { label: t('columns.reset'), icon: 'undo', action: () => { this.#columns.reset(); this.render(); } },
    ];
  }

  /**
   * The right edge of a column's header: dragged, it resizes the column (← → when it has the
   * focus); double click: as wide as its content.
   */
  #grip(c) {
    const grip = h('span', {
      class: 'fm-grip', role: 'separator', tabindex: '-1', 'aria-orientation': 'vertical',
      'aria-label': t('column.resize', { name: c.label }), title: t('column.resizeTitle'),
    });
    const width = () => grip.parentElement.offsetWidth;
    grip.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      const start = width();
      this.list.classList.add('resizing');
      trackDrag(e, {
        threshold: 0,
        onMove: dx => { this.#columns.resize(c.key, start + dx, false); this.#layoutColumns(); },
        onEnd: moved => { this.list.classList.remove('resizing'); if (moved) this.#columns.save(); },
      });
    });
    grip.addEventListener('dblclick', () => this.#fitColumn(c.key));
    grip.addEventListener('keydown', e => {
      const step = e.shiftKey ? 48 : 16;
      const by = { ArrowLeft: -step, ArrowRight: step }[e.key];
      if (by === undefined) return;
      e.preventDefault();
      this.#columns.resize(c.key, width() + by);
      this.#layoutColumns();
    });
    return grip;
  }

  #header() {
    const columns = this.#columns.shown(this.#viewColumns());
    return h('div', { class: 'fm-head', role: 'presentation' }, columns.map(c => {
      const on = this.#sort.key === c.key;
      const sort = h('button', {
        class: ['fm-col', c.num && 'num', on && 'on'].filter(Boolean).join(' '), type: 'button', tabindex: '-1',
        'aria-sort': on ? (this.#sort.dir > 0 ? 'ascending' : 'descending') : null,
        onclick: () => {
          this.#sort = { key: c.key, dir: on ? -this.#sort.dir : 1 };
          this.render();
          automation()?.record('files.sort', { params: { by: c.key, direction: this.#sort.dir > 0 ? 'asc' : 'desc' } });
        },
      }, c.label, on ? h('span', { class: 'fm-arrow', 'aria-hidden': 'true' }, this.#sort.dir > 0 ? '▲' : '▼') : null);
      return h('div', { class: 'fm-th', dataset: { col: c.key } }, sort, this.#grip(c));
    }));
  }

  #row(n) {
    const cells = this.#cells(n);
    if (this.tree) {
      cells.name.prepend(this.#twisty(n));
      cells.name.style.setProperty('--fm-depth', this.#depth.get(n.id) ?? 0);
    }
    return this.#option(n, 'fm-row', ...this.#columns.shown(this.#viewColumns()).map(c => {
      const cell = cells[c.key] ?? h('span');
      cell.dataset.col = c.key;
      return cell;
    }));
  }

  /** The triangle that opens a folder in place; an empty one as wide for the rest, so the icons line up. */
  #twisty(n) {
    if (n.type !== 'folder') return h('span', { class: 'fm-twisty', 'aria-hidden': 'true' });
    const open = this.#expanded.has(n.id);
    return h('span', {
      class: open ? 'fm-twisty open' : 'fm-twisty', dataset: { twisty: n.id }, 'aria-hidden': 'true',
      title: open ? t('tree.collapseTitle') : t('tree.expandTitle'),
    });
  }

  /**
   * The items in the order they are shown: each one, and after an open folder what is in it (sorted
   * the same way, one level deeper in #depth). Searching, an item that does not match stays only if
   * something inside it does.
   */
  #flatten(nodes, depth = 0, out = []) {
    for (const n of this.#sorted(nodes)) {
      const at = out.length;
      out.push(n);
      this.#depth.set(n.id, depth);
      if (this.#isOpen(n)) this.#flatten(fs.children(n.id), depth + 1, out);
      if (this.#query && out.length === at + 1 && !fold(n.name).includes(this.#query)) out.pop();
    }
    return out;
  }

  /** True if a folder of the list shows its content under it. */
  #isOpen(n) {
    return this.tree && n.type === 'folder' && this.#expanded.has(n.id);
  }

  /** The cells of an item's row, by column key. */
  #cells(n) {
    if (n.trashed) {
      const origin = originLabel(n);
      return {
        name: h('span', { class: 'fm-name' }, h('span', { class: 'fm-icon' }, itemIcon(n)), this.#nameNode(n)),
        deleted: h('span', {}, dateLabel(n.trashed.at)),
        size: h('span', { class: 'num' }, sizeLabel(n)),
        type: h('span', {}, typeLabel(n)),
        origin: h('span', { title: t('trash.restoresTo', { place: origin }) }, origin),
      };
    }
    const where = this.inTag ? locationLabel(n) : '';
    return {
      name: h('span', { class: 'fm-name' }, h('span', { class: 'fm-icon' }, itemIcon(n)), this.#nameNode(n), tagDots(n)),
      modified: h('span', {}, dateLabel(n.modified)),
      size: h('span', { class: 'num' }, sizeLabel(n)),
      type: h('span', {}, typeLabel(n)),
      workspace: ownerNode(n),
      location: h('span', { title: where }, where),
    };
  }

  #tile(n) {
    // In the preview view a file shows the thumbnail its app makes (a lilOS without them ignores `preview`)
    const glyph = itemIcon(n, this.#view === 'thumbs' && !n.trashed ? { preview: THUMB } : undefined);
    const tile = this.#option(n, 'fm-tile', h('span', { class: 'fm-tile-icon' }, glyph, tagDots(n, 'fm-tile-tags')), this.#nameNode(n));
    const tagNames = (n.tags ?? []).map(id => tags.get(id)?.name).filter(Boolean);
    const lines = n.trashed
      ? [t('tile.deleted', { date: dateLabel(n.trashed.at) }), t('tile.origin', { place: originLabel(n) })]
      : [
        this.inTag && t('tile.location', { place: locationLabel(n) }),
        t('owner.label', { name: ownerLabel(n) }),
        tagNames.length && t('tile.tags', { names: tagNames.join(', ') }),
      ];
    tile.title = [n.name, ...lines.filter(Boolean)].join('\n');
    return tile;
  }

  #nameNode(n) {
    if (this.#editing === n.id) return h('input', { class: 'fm-rename', type: 'text', value: n.name, spellcheck: 'false', 'aria-label': t('rename.label') });
    const chips = netChips(n);
    if (!chips.length) return h('span', { class: 'fm-label', title: n.name }, n.name);
    return h('span', { class: 'fm-label-chips' }, h('span', { class: 'fm-label', title: n.name }, n.name), ...chips);
  }

  #option(n, cls, ...children) {
    const selected = this.#selection.has(n.id);
    const tree = this.tree && cls === 'fm-row';
    const el = h('div', {
      class: [cls, selected && 'selected', n.id === this.#cursor && 'cursor'].filter(Boolean).join(' '),
      id: `fm-${n.id}`, role: tree ? 'treeitem' : 'option', 'aria-selected': String(selected), dataset: { id: n.id },
      'aria-level': tree ? String((this.#depth.get(n.id) ?? 0) + 1) : null,
      'aria-expanded': tree && n.type === 'folder' ? String(this.#expanded.has(n.id)) : null,
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
    const rank = { folder: 0, file: 1, app: 1, link: 1 };
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
    const optionOf = e => e.target.closest?.('[role="option"], [role="treeitem"]');

    this.list.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('.fm-rename, .fm-head')) return;
      // The triangle of a folder: opens or closes it in place (with Alt, its subfolders too)
      const twisty = e.target.closest('[data-twisty]');
      if (twisty) {
        e.preventDefault();
        this.list.focus();
        this.setOpen(twisty.dataset.twisty, !this.#expanded.has(twisty.dataset.twisty), e.altKey);
        return;
      }
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
      // Dragging the selection moves it into a folder (here, on the desk, in another window…);
      // from the trash it is restored there (lilOS without fs.isTrashed cannot)
      if ((this.inTrash && !fs.isTrashed) || !this.#selection.has(id)) return;
      dragItems(e, {
        ids: [...this.#selection],
        stack: this.history,
        onEnd: ({ moved }) => { if (!moved && narrow) this.#select([id], id); },
      });
    }, { signal });

    this.list.addEventListener('dblclick', e => {
      const opt = optionOf(e);
      if (!opt || e.target.closest('.fm-rename, [data-twisty]')) return;
      if (this.inTrash) return this.openSelected();
      const node = fs.get(opt.dataset.id);
      if (node) this.open(node);
    }, { signal });

    this.list.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (e.target.closest('.fm-head')) return openMenu(e.clientX, e.clientY, this.#columnItems());
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
      if (this.tree && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.#treeKey(e.key === 'ArrowRight');
        return;
      }
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
      } else this.#moveTo(id);
    }, { signal });
  }

  /**
   * → and ← in the tree: → opens the folder with the cursor, or goes to the first item in it if it is
   * open; ← closes it, or goes to the folder the item is in.
   */
  #treeKey(right) {
    const i = this.#items.findIndex(n => n.id === this.#cursor);
    const node = this.#items[i];
    if (!node) return;
    const open = this.#isOpen(node);
    const depth = this.#depth.get(node.id);
    if (right) {
      if (node.type !== 'folder') return;
      if (!open) return this.setOpen(node.id, true);
      const next = this.#items[i + 1];
      if (next && this.#depth.get(next.id) > depth) this.#moveTo(next.id);
    } else if (open) this.setOpen(node.id, false);
    else if (depth > 0) this.#moveTo(node.parent);
  }

  /** Selects only one item and brings it into view. */
  #moveTo(id) {
    this.#anchor = id;
    this.#select([id], id);
    this.list.querySelector(`#fm-${CSS.escape(id)}`)?.scrollIntoView({ block: 'nearest' });
  }

  /** How many items an arrow key moves by (icons and previews: a row is as many tiles as fit). */
  #step(key) {
    const tiles = this.#view !== 'list';
    const perRow = tiles ? Math.max(1, Math.floor(this.list.clientWidth / TILE[this.#view])) : 1;
    return {
      ArrowDown: perRow, ArrowUp: -perRow, Home: -Infinity, End: Infinity,
      ...(tiles && { ArrowRight: 1, ArrowLeft: -1 }),
    }[key] ?? null;
  }

  #backgroundMenu(e) {
    const toggleView = { label: t('view.menu'), icon: 'grid', items: VIEWS.map(view => ({ label: t(`view.${view}`), icon: this.#view === view ? 'check' : null, action: () => this.setView(view) })) };
    const columns = this.#view === 'list' && { label: t('columns.menu'), icon: 'list', items: this.#columnItems() };
    const collapse = this.#items.some(n => this.#isOpen(n)) && { label: t('tree.collapseAll'), icon: 'minus', action: () => { this.#expanded.clear(); this.render(); } };
    if (this.inTrash) {
      const empty = !this.#items.length;
      return openMenu(e.clientX, e.clientY, [
        { label: t('menu.restoreAll'), icon: 'undo', disabled: empty, action: () => this.restore(fs.trashed().map(n => n.id)) },
        { label: t('menu.emptyTrash'), icon: 'trash', danger: true, disabled: empty, action: () => this.empty(e.clientX, e.clientY) },
        '-',
        toggleView,
        columns,
      ].filter(Boolean));
    }
    if (this.inTag) {
      return openMenu(e.clientX, e.clientY, [
        { label: t('menu.manageTags'), icon: 'gear', action: () => launch('settings', { tab: 'tags' }) },
        '-',
        toggleView,
        columns,
        collapse,
      ].filter(Boolean));
    }
    // Links are made in folders of the home (lilOS with links only)
    const linkable = system.locateLink && !fs.isRemote?.(this.folder);
    openMenu(e.clientX, e.clientY, [
      { label: t('menu.newFolder'), icon: 'folderPlus', action: () => this.create('folder') },
      { label: t('menu.newTextFile'), icon: 'filePlus', action: () => this.create('file') },
      linkable && { label: t('menu.newLink'), icon: 'link', action: () => this.newLink() },
      '-',
      toggleView,
      columns,
      collapse,
    ].filter(Boolean));
  }

  #itemMenu(e) {
    const nodes = this.#items.filter(n => this.#selection.has(n.id));
    const many = nodes.length > 1;
    const count = num(nodes.length);
    if (this.inTrash) {
      const ids = nodes.map(n => n.id);
      return openMenu(e.clientX, e.clientY, [
        { label: many ? t('menu.restoreMany', { count }) : t('menu.restore'), icon: 'undo', action: () => this.restore(ids) },
        { label: t('menu.info'), icon: 'info', shortcut: shortcuts.label('files.info'), action: () => this.info.setOpen(true) },
        '-',
        { label: t('menu.purge'), icon: 'trash', shortcut: shortcuts.label('items.delete'), danger: true, action: () => this.purge(ids) },
      ]);
    }
    // A connection's folder (in Rete): the connection's menu
    if (!many && nodes[0].mount) {
      const m = mountOf(nodes[0].id);
      if (m) return mountMenu(this, m, e.clientX, e.clientY);
    }
    const fixed = nodes.some(n => n.system);   // main folders: no rename, no delete (not `system`: that is the module)
    const remote = nodes.some(n => n.net);     // on a server: no tags, no links (they would not last)
    const ids = nodes.map(n => n.id);
    const tag = this.inTag;
    const folder = !many && this.tree && nodes[0].type === 'folder' && nodes[0];
    const open = folder && this.#expanded.has(folder.id);
    openMenu(e.clientX, e.clientY, [
      { label: many ? t('menu.openMany', { count }) : t('menu.open'), icon: 'open', shortcut: shortcuts.label('items.open'), action: () => this.openSelected() },
      folder && { label: open ? t('tree.collapse') : t('tree.expand'), icon: open ? 'minus' : 'plus', action: () => this.setOpen(folder.id, !open) },
      folder && { label: t('tree.expandAll'), icon: 'plus', action: () => this.setOpen(folder.id, true, true) },
      !many && nodes[0].type === 'file' && { label: t('menu.openWith'), icon: 'open', action: () => openFile(nodes[0], { choose: true }) },
      ...officeEntries(this, nodes),
      !many && nodes[0].type === 'folder' && { label: t('menu.openInEditor'), icon: 'code', action: () => launch('editor', { folder: nodes[0].id }) },
      // In a tag's view items come from everywhere: show one where it is
      tag && !many && { label: t('menu.reveal'), icon: 'folderOpen', action: () => this.reveal(nodes[0].id) },
      { label: t('menu.rename'), icon: 'pencil', shortcut: shortcuts.label('items.rename'), disabled: many || fixed || nodes[0].noRename, action: () => this.rename(nodes[0].id) },
      !remote && tagSubmenu(ids),
      tag && { label: t('menu.untag', { name: tag.name }), icon: 'x', action: () => setTag(ids, tag.id, false) },
      !remote && linkEntry(ids),
      system.canLinkOnDesk?.(ids) && { label: t('menu.deskLink'), icon: 'link', action: () => this.addDeskLinks(ids) },
      { label: t('menu.info'), icon: 'info', shortcut: shortcuts.label('files.info'), action: () => this.info.setOpen(true) },
      !many && { label: t('menu.properties'), icon: 'info', action: () => showProperties(nodes[0].id) },
      ...(system.appActionEntries?.(ids, { separator: true }) ?? []),
      '-',
      // A connection may name removing otherwise («Togli dall’album»), or not allow it
      { label: nodes.every(n => n.removeLabel) ? network()?.text(nodes[0].removeLabel) : many ? t('menu.deleteMany', { count }) : t('menu.delete'), icon: 'trash', shortcut: shortcuts.label('items.delete'), danger: true, disabled: fixed || nodes.every(n => n.noRemove), action: () => this.remove(nodes.map(n => n.id)) },
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
      this.go(id, false, true);
      return;
    }
  }

  #say(text) {
    this.#message = text;
    this.render();
  }

  // ---------- Automation (Automata) ----------

  /** Tells the recorder the folder the user went to (the trash and the tags' views are not folders: not recorded). */
  #recordGo() {
    if (fs.get(this.folder)?.type === 'folder') automation()?.record('files.go', { params: { folder: this.folder } });
  }

  /** Tells the recorder the search the user settled on (also an emptied one, when it had told one). */
  #recordSearch() {
    clearTimeout(this.#searchTimer);
    const query = this.search.value.trim();
    if (query === this.#searched) return;
    this.#searched = query;
    automation()?.record('files.search', { params: { query } });
  }

  /** What this window can do again for Automata: go to a folder, search, sort, change the view. It shows no document. */
  #handleAutomation() {
    const auto = automation();
    if (!auto) return;
    const opts = { window: this.win, file: () => null };
    auto.handle('files.go', ({ folder }) => {
      if (fs.get(folder)?.type !== 'folder') throw new Error(t('automation.noFolder'));
      this.go(folder);
    }, opts);
    auto.handle('files.search', ({ query = '' }) => {
      this.search.value = query;
      this.#query = fold(query.trim());
      this.#searched = query.trim();
      this.render();
    }, opts);
    auto.handle('files.sort', ({ by, direction }) => {
      if (!this.#viewColumns().some(c => c.key === by)) throw new Error(t('automation.noColumn'));
      this.#sort = { key: by, dir: direction === 'desc' ? -1 : 1 };
      this.render();
    }, opts);
    auto.handle('files.view', ({ mode }) => {
      if (!VIEWS.includes(mode)) throw new Error(t('automation.noView'));
      this.setView(mode);
    }, opts);
  }

  /** An error, in a message box over the window: resolves with the button pressed. */
  async #error(title, text = '', buttons = ['ok']) {
    const answer = await messageBox(this.win, { icon: 'error', title, text, buttons });
    if (this.list.isConnected && !this.win.el.contains(document.activeElement)) this.list.focus();
    return answer;
  }

  /** Asked to open a folder or a tag that is not there any more: Home is shown instead. */
  notFound(what) {
    const place = t('place.home');
    this.#error(what === 'tag' ? t('error.tagNotFound') : t('error.folderNotFound'),
      what === 'tag' ? t('error.tagNotFoundText', { place }) : t('error.folderNotFoundText', { place }));
  }

  #onChange(e) {
    const linked = e.node && links.has(e.node.id);   // a link in the sidebar: its name, or it went
    if (this.inTrash) return linked ? this.render() : undefined;   // the trash redraws on fs 'trash'
    if (this.inTag) return this.render();   // its items can be anywhere
    if (e.type === 'remove' && e.ids.includes(this.folder)) {
      // The open folder is gone: go to the closest folder that still exists
      return this.go(e.parent && fs.exists(e.parent) ? e.parent : fs.root, false);
    }
    // The folder shown and the folders open in it (the tree of the list view)
    const shown = id => id === this.folder || this.#expanded.has(id);
    const inFolder = shown(e.parent) || shown(e.from);
    const onTrail = e.type !== 'remove' && fs.isInside(this.folder, e.node.id);      // renamed ancestor: title, path
    const inChild = [e.parent, e.from].some(p => p && fs.exists(p) && shown(fs.get(p).parent));  // item counts of subfolders
    if (!inFolder && !onTrail && !inChild && !linked) return;
    if (inFolder && e.type !== 'rename') this.#message = '';
    this.render();
  }
}
