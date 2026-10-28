import { Emitter, h, icon, fs, fileType, session, storage, openMenu, shortcuts, trackDrag, UndoStack, history } from '@lilos/sdk';
import { addTarget } from '../../items/targets.js';
import { markItem, dropZone, dragItems } from '../../items/itemDrag.js';
import { linkEntry } from '../../items/links.js';
import { confirmRemove } from '../../items/confirmRemove.js';
import { recordCreated, renameNode, moveNode } from '../../items/fsHistory.js';
import { pickFile } from '../filePicker.js';
import { FOLDER_COLOR } from '../../desktop/itemIcons.js';

const STATE_KEY = 'editor-tree';   // { root, expanded: [ids], width }
const MIN_WIDTH = 160;
const DEFAULT_WIDTH = 240;

/**
 * Folder tree of the Editor (right sidebar). The opened folder is the root: inside it, files and
 * folders are created, renamed, removed and moved (drag a row onto a folder, or "Sposta in…").
 * Follows the file system's events, so changes made elsewhere show up here.
 *
 * The panel is resized by dragging its left edge (or with ← → on it, Home / End for the limits).
 *
 * Keys: ↑ ↓ move, → opens a folder / goes to its first item, ← closes it / goes to the parent,
 * Home / End. Open, rename, delete are the shared item shortcuts (Invio, F2, Canc).
 *
 * Its own undo history (Ctrl Z while the panel has the focus): create, rename, move, delete.
 *
 * Events: 'open' (file id), 'root' (folder id | null)
 */
export class FileTree extends Emitter {
  root = null;
  history = new UndoStack();
  collapsed = false;     // hidden by the user, the root stays open
  width = DEFAULT_WIDTH;
  #expanded = new Set();
  #selected = null;
  #current = null;       // the file open in the editor
  #editing = null;       // id being renamed
  #editingNew = false;   // the renamed node was just created: open it afterwards (files)
  #message = '';

  constructor({ win, openWindow }) {
    super();
    this.win = win;
    this.openWindow = openWindow;
    const { signal } = win;

    this.title = h('span', { class: 'ft-title' });
    this.rootIcon = h('span', { class: 'ft-icon folder' }, icon('folder'));
    const tool = (glyph, label, onclick) => h('button', { class: 'ft-btn', type: 'button', title: label, 'aria-label': label, onclick }, icon(glyph));
    this.tree = h('div', { class: 'ft-tree', role: 'tree', tabindex: '0', 'aria-label': 'Contenuto della cartella' });
    this.note = h('div', { class: 'ft-note', role: 'status', 'aria-live': 'polite' });
    this.split = h('div', {
      class: 'ft-split', role: 'separator', tabindex: '0', 'aria-orientation': 'vertical',
      'aria-label': 'Larghezza del pannello della cartella', 'aria-valuemin': MIN_WIDTH,
    });
    this.el = h('aside', { class: 'ft', 'aria-label': 'Cartella aperta' }, this.split,
      h('div', { class: 'ft-head' },
        this.rootIcon, this.title,
        tool('filePlus', 'Nuovo file', () => this.create('file', this.#targetFolder())),
        tool('folderPlus', 'Nuova cartella', () => this.create('folder', this.#targetFolder())),
        tool('x', 'Chiudi la cartella', () => this.setRoot(null))),
      this.tree, this.note);

    this.#bind(signal);
    const offFs = fs.on('change', e => this.#onFsChange(e));
    // Another workspace: a root it cannot see is hidden, and comes back with its workspace
    const offScope = fs.on('scope', () => this.render());
    const removeTarget = addTarget({
      isActive: () => win.active && this.tree.contains(document.activeElement) && !this.#editing,
      selectionSize: () => (this.#selected ? 1 : 0),
      open: () => this.#activate(this.#selected),
      rename: () => this.rename(this.#selected),
      remove: () => this.remove(this.#selected),
      selectAll: () => {},
      deselect: () => this.#select(null),
    });
    const detach = history.attach(this.el, this.history);
    win.on('destroy', () => { offFs(); offScope(); removeTarget(); detach(); });

    const saved = storage.get(STATE_KEY, {});
    if (Number.isFinite(saved?.width)) this.width = saved.width;
    if (Array.isArray(saved?.expanded)) saved.expanded.filter(id => typeof id === 'string').forEach(id => this.#expanded.add(id));
  }

  /** Opens a folder as the root (null closes it). */
  setRoot(id) {
    const node = id && fs.get(id);
    this.root = node?.type === 'folder' ? id : null;
    if (this.root) this.collapsed = false;
    this.#selected = null;
    this.#editing = null;
    this.#message = '';
    this.#save();
    this.render();
    this.emit('root', this.root);
  }

  /** The root saved last time, if it still exists. */
  static savedRoot() {
    const id = storage.get(STATE_KEY, {})?.root;
    return typeof id === 'string' && fs.get(id)?.type === 'folder' ? id : null;
  }

  /** Shows or hides the panel (the root stays open). */
  setCollapsed(collapsed) {
    this.collapsed = !!collapsed;
    this.render();
    this.emit('layout');
  }

  /** Panel width in pixels, kept between the limits of the window. */
  resize(px, save = true) {
    const host = this.el.parentElement?.clientWidth || 800;
    this.width = Math.round(Math.max(MIN_WIDTH, Math.min(px, Math.max(MIN_WIDTH, host * 0.6))));
    this.el.style.width = `${this.width}px`;
    this.split.setAttribute('aria-valuenow', this.width);
    this.split.setAttribute('aria-valuemax', Math.round(Math.max(MIN_WIDTH, host * 0.6)));
    if (save) this.#save();
  }

  /** Highlights the file open in the editor (and opens the folders above it). */
  setCurrent(id) {
    if (id === this.#current) return;
    this.#current = id;
    if (id && this.root && fs.isInside(id, this.root)) {
      for (const a of fs.ancestors(id)) if (a.id !== id && fs.isInside(a.id, this.root) && a.id !== this.root) this.#expanded.add(a.id);
    }
    this.render();
  }

  // ---------- Actions ----------

  /** New file or folder inside a folder of the root, then straight into rename. */
  create(type, parentId = this.root) {
    if (!this.root || !this.#inRoot(parentId)) return;
    const node = fs.create(parentId, { type, name: type === 'folder' ? 'Nuova cartella' : 'nuovo.txt' });
    if (parentId !== this.root) this.#expanded.add(parentId);
    this.#select(node.id);
    this.rename(node.id, true);
  }

  rename(id, isNew = false) {
    if (!id || id === this.root || !fs.exists(id) || fs.get(id).system) return;
    this.#editing = id;
    this.#editingNew = isNew;
    this.render();
    const input = this.tree.querySelector('.ft-rename');
    if (!input) return;
    input.focus();
    const name = fs.get(id).name;
    const dot = fs.get(id).type === 'file' ? name.lastIndexOf('.') : -1;
    input.setSelectionRange(0, dot > 0 ? dot : name.length);
    let done = false;
    const finish = commit => {
      if (done) return;
      done = true;
      this.#editing = null;
      const value = input.value.replace(/\s+/g, ' ').trim();
      const created = this.#editingNew;
      if (commit && value && value !== name && fs.exists(id)) {
        try { renameNode(created ? null : this.history, id, value); } catch (err) { this.#say(err.message); }
      }
      if (created) recordCreated(this.history, id);
      const opened = created && fs.get(id)?.type === 'file';
      this.render();
      this.tree.focus();
      if (opened) this.emit('open', id);
    };
    input.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }

  remove(id) {
    if (!id || id === this.root || !fs.exists(id)) return;
    const r = this.#row(id)?.getBoundingClientRect();
    // Focus back on the tree once done, so that Ctrl Z reaches its history
    confirmRemove([id], r ? r.left + 24 : innerWidth / 2, r ? r.bottom : innerHeight / 2, this.history, { then: () => this.tree.focus() });
  }

  /** Moves into another folder of the root; reports why it cannot. */
  move(id, parentId) {
    if (!id || id === this.root || !this.#inRoot(parentId)) return;
    try {
      // Opened before moving: the redraw that follows the move already shows it inside
      if (parentId !== this.root) this.#expanded.add(parentId);
      moveNode(this.history, id, parentId);
      this.#save();
      this.#select(id);
    } catch (err) {
      this.#say(err.message);
    }
  }

  async moveTo(id) {
    const node = fs.get(id);
    if (!node || id === this.root) return;
    const target = await pickFile(this.openWindow, {
      kind: 'folder', within: this.root, exclude: id,
      title: `Sposta «${node.name}»`, text: `Scegli la cartella, dentro «${fs.get(this.root).name}», in cui spostarlo.`,
    });
    if (target) this.move(id, target.id);
  }

  // ---------- Rendering ----------

  render() {
    const root = this.root && fs.get(this.root);
    this.el.hidden = !root || this.collapsed;
    if (!root) return this.tree.replaceChildren();
    this.resize(this.width, false);
    this.title.textContent = root.id === fs.root ? 'Home' : root.name;
    this.title.title = fs.path(root.id);
    this.rootIcon.style.color = root.color ?? FOLDER_COLOR;
    const rows = [];
    const walk = (id, depth) => {
      for (const n of this.#sorted(fs.children(id))) {
        rows.push(this.#rowFor(n, depth));
        if (n.type === 'folder' && this.#expanded.has(n.id)) walk(n.id, depth + 1);
      }
    };
    walk(root.id, 0);
    this.tree.replaceChildren(...(rows.length ? rows : [h('div', { class: 'ft-empty' }, 'Cartella vuota')]));
    this.tree.setAttribute('aria-activedescendant', this.#selected && this.#row(this.#selected) ? `ft-${this.#selected}` : '');
    this.note.textContent = this.#message;
  }

  #rowFor(n, depth) {
    const folder = n.type === 'folder';
    const open = folder && this.#expanded.has(n.id);
    const name = this.#editing === n.id
      ? h('input', { class: 'ft-rename', type: 'text', value: n.name, spellcheck: 'false', 'aria-label': 'Nuovo nome' })
      : h('span', { class: 'ft-name' }, n.name);
    const glyph = folder
      ? h('span', { class: 'ft-icon folder', style: { color: n.color ?? FOLDER_COLOR } }, icon('folder'))
      : h('span', { class: 'ft-icon file', style: { background: fileType(n.name).color } });
    return markItem(h('div', {
      class: ['ft-row', n.id === this.#selected && 'selected', n.id === this.#current && 'current'].filter(Boolean).join(' '),
      id: `ft-${n.id}`, role: 'treeitem', 'aria-level': depth + 1, 'aria-selected': String(n.id === this.#selected),
      'aria-expanded': folder ? String(open) : null, dataset: { id: n.id },
      style: { paddingLeft: `${6 + depth * 14}px` },
    }, h('span', { class: 'ft-twisty', 'aria-hidden': 'true' }, folder ? (open ? '▾' : '▸') : ''), glyph, name), n);
  }

  #sorted(nodes) {
    return [...nodes].sort((a, b) => (a.type === 'folder') !== (b.type === 'folder') ? (a.type === 'folder' ? -1 : 1)
      : a.name.localeCompare(b.name, session.locale, { numeric: true }));
  }

  /** Rows in display order (ids). */
  #visible() {
    return [...this.tree.querySelectorAll('.ft-row')].map(r => r.dataset.id);
  }

  #row(id) {
    return this.tree.querySelector(`#ft-${CSS.escape(id)}`);
  }

  // ---------- Input ----------

  #bind(signal) {
    const rowOf = e => e.target.closest?.('.ft-row');

    // Resizing: the panel is on the right, so dragging left makes it wider
    this.split.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      const start = this.width;
      this.el.classList.add('resizing');
      trackDrag(e, {
        threshold: 0,
        onMove: dx => this.resize(start - dx, false),
        onEnd: () => { this.el.classList.remove('resizing'); this.#save(); },
      });
    }, { signal });
    this.split.addEventListener('dblclick', () => this.resize(DEFAULT_WIDTH), { signal });
    this.split.addEventListener('keydown', e => {
      const step = e.shiftKey ? 48 : 16;
      const to = { ArrowLeft: this.width + step, ArrowRight: this.width - step, Home: MIN_WIDTH, End: Infinity }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      this.resize(to);
    }, { signal });

    this.tree.addEventListener('click', e => {
      if (e.target.closest('.ft-rename')) return;
      const row = rowOf(e);
      if (!row) return this.#select(null);
      const node = fs.get(row.dataset.id);
      // detail counts the clicks: the second one of a double click opens a file
      if (node?.type === 'file' && e.detail === 2) return this.emit('open', node.id);
      this.#select(node.id);
      if (node?.type === 'folder' && e.detail === 1) this.#toggle(node.id);
    }, { signal });

    this.tree.addEventListener('contextmenu', e => {
      e.preventDefault();
      const row = rowOf(e);
      const id = row?.dataset.id ?? null;
      if (id) this.#select(id);
      const node = id && fs.get(id);
      const folder = node?.type === 'folder' ? node.id : node ? node.parent : this.root;
      openMenu(e.clientX, e.clientY, [
        node?.type === 'file' && { label: 'Apri', icon: 'open', shortcut: shortcuts.label('items.open'), action: () => this.emit('open', id) },
        { label: 'Nuovo file', icon: 'filePlus', action: () => this.create('file', folder) },
        { label: 'Nuova cartella', icon: 'folderPlus', action: () => this.create('folder', folder) },
        ...(node ? [
          '-',
          { label: 'Rinomina', icon: 'pencil', shortcut: shortcuts.label('items.rename'), disabled: node.system, action: () => this.rename(id) },
          { label: 'Sposta in…', icon: 'arrowRight', disabled: node.system, action: () => this.moveTo(id) },
          linkEntry([id]),
          '-',
          { label: 'Elimina', icon: 'trash', shortcut: shortcuts.label('items.delete'), danger: true, disabled: node.system, action: () => this.remove(id) },
        ] : []),
      ].filter(Boolean));
    }, { signal });

    // Drag a row onto a folder (here, on the desk, in the File Manager…) to move it (itemDrag.js).
    // Dropped on a file's row, it goes into that file's folder; on the empty part, into the root
    dropZone(this.tree, {
      folder: hit => {
        const n = fs.get(hit?.closest?.('.ft-row')?.dataset.id);
        return n ? n.parent : this.root;
      },
      highlight: id => (id === this.root ? this.tree : this.#row(id)),
    });
    this.tree.addEventListener('pointerdown', e => {
      const row = rowOf(e);
      if (e.button !== 0 || !row || e.target.closest('.ft-rename')) return;
      const id = row.dataset.id;
      if (fs.get(id)?.system) return;   // system folders stay where they are
      dragItems(e, {
        ids: [id],
        stack: this.history,
        onMove: () => row.classList.add('dragging'),
        onEnd: () => { row.classList.remove('dragging'); },
      });
    }, { signal });

    // Navigation keys of the tree (fixed); Invio, F2 and Canc are the shared item shortcuts
    this.tree.addEventListener('keydown', e => {
      if (e.target !== this.tree) return;
      const ids = this.#visible();
      const i = ids.indexOf(this.#selected);
      const node = this.#selected && fs.get(this.#selected);
      const go = j => { if (ids[j]) { e.preventDefault(); this.#select(ids[j]); } };
      if (e.key === 'ArrowDown') go(i < 0 ? 0 : Math.min(ids.length - 1, i + 1));
      else if (e.key === 'ArrowUp') go(i < 0 ? 0 : Math.max(0, i - 1));
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(ids.length - 1);
      else if (e.key === 'ArrowRight' && node?.type === 'folder') {
        e.preventDefault();
        if (!this.#expanded.has(node.id)) this.#toggle(node.id);
        else go(i + 1);
      } else if (e.key === 'ArrowLeft' && node) {
        e.preventDefault();
        if (node.type === 'folder' && this.#expanded.has(node.id)) this.#toggle(node.id);
        else if (node.parent !== this.root) this.#select(node.parent);
      }
    }, { signal });
  }

  #activate(id) {
    const node = id && fs.get(id);
    if (!node) return;
    if (node.type === 'file') this.emit('open', id);
    else this.#toggle(id);
  }

  /** Moves the selection without rebuilding the rows. */
  #select(id) {
    this.#selected = id;
    for (const row of this.tree.querySelectorAll('.ft-row')) {
      const on = row.dataset.id === id;
      row.classList.toggle('selected', on);
      row.setAttribute('aria-selected', String(on));
    }
    this.tree.setAttribute('aria-activedescendant', id && this.#row(id) ? `ft-${id}` : '');
    this.#row(id)?.scrollIntoView({ block: 'nearest' });
  }

  #toggle(id) {
    if (this.#expanded.has(id)) this.#expanded.delete(id);
    else this.#expanded.add(id);
    this.#save();
    this.render();
  }

  /** Folder for the header buttons: the selected folder, the folder of the selected file, or the root. */
  #targetFolder() {
    const n = this.#selected && fs.get(this.#selected);
    return n ? (n.type === 'folder' ? n.id : n.parent) : this.root;
  }

  #inRoot(id) {
    return !!this.root && !!id && fs.exists(id) && fs.isInside(id, this.root);
  }

  #say(text) {
    this.#message = text;
    this.render();
    clearTimeout(this.#sayTimer);
    this.#sayTimer = setTimeout(() => { this.#message = ''; this.note.textContent = ''; }, 5000);
  }

  #sayTimer = 0;

  #save() {
    storage.set(STATE_KEY, { root: this.root, expanded: [...this.#expanded].filter(id => fs.exists(id)).slice(0, 500), width: this.width });
  }

  #onFsChange(e) {
    if (!this.root) return;
    if (e.type === 'remove' && e.ids.includes(this.root)) {
      this.setRoot(null);
      return;
    }
    if (e.type === 'remove' && e.ids.includes(this.#selected)) this.#selected = null;
    // Renaming in place: redraw when done, the input must not be replaced
    if (this.#editing && fs.exists(this.#editing)) return;
    // Anything inside the root, or the root itself (renamed, moved)
    const touches = [e.node.id, e.parent, e.from].some(id => id && (id === this.root || (fs.exists(id) && fs.isInside(id, this.root))));
    if (touches || e.type === 'remove') this.render();
  }
}
