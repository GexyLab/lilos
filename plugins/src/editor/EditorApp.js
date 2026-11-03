import { Window, h, icon, fs, uid, settings, selectField, actionButton, openMenu, history, shortcuts, toast, PipeStopped } from '@lilos/sdk';
import * as sdk from '@lilos/sdk';   // `automation`, `messageBox`: missing in older lilOS, so not imported by name
import { launch } from '@lilos/system';
import { handleCommand } from '@lilos/system';
import { pickFile } from '@lilos/system';
import { tokenize } from '../shared/highlight.js';
import '../shared/highlight.css';
import { complete } from './complete.js';
import { languages, getLanguage, languageForName, engineFor, ENGINE_LABELS, loadCustomGrammars, languageEvents } from './lang/languages.js';
import { highlighter, FONT_STYLE } from './lang/engines.js';
import { editorConfig, isSchemaUrl } from './lang/config.js';
import { clientFor, fileUri, servers } from './lsp/manager.js';
import { positionAt, offsetAt, fromServer } from './lsp/convert.js';
import { openEditorSettings } from './EditorSettings.js';
import { FileTree } from './FileTree.js';
import { TabBar } from '../shared/TabBar.js';
import { FindBar } from '../shared/FindBar.js';
import { queryRegExp, regexError, findAll, firstAtOrAfter, replacementFor, replaceAll, MAX_MATCHES } from './search.js';
import { readSession, writeSession, removeSession, takeClosed, addClosed, readDraft, writeDraft, removeDraft, hash, CLOSED, DRAFT_LIMIT } from './sessions.js';
import { t } from './i18n.js';
import './editor.css';

export { filePreview } from './preview.js';

const INDENT = '  ';
const HIGHLIGHT_LIMIT = 300_000;   // characters: above this the text is shown plain, to stay responsive
const TEXTMATE_LIMIT = 100_000;    // TextMate re-tokenizes everything: above this the simple engine is used
const DRAFT_DELAY = 1000;          // ms after the last change before the unsaved text is kept
const CLOSED_TABS = 20;            // tabs that Ctrl+Alt+T can open again
const MAX_MARKS = 2000;            // matches of the find bar marked at once (only the lines on screen are)
/** Automations (the Automata app): what the user does here is recorded and done again. */
const automation = () => sdk.automation ?? null;
const untitled = () => t('document.untitledFile');
/** Short badges for the kinds of suggestion (complete.js, lsp/convert.js). */
const KIND_BADGES = { kw: 'kw', fn: 'ƒ', pr: 'pr', val: 'val', tag: '<>', attr: '=', abc: 'abc', ty: 'T', snip: '{}' };
/** languageId sent to language servers when it differs from ours. */
const LSP_IDS = { shell: 'shellscript' };
/** The diagnostic under the caret, by severity. */
const diagnosticText = (severity, message) => {
  if (severity === 2) return t('diagnostic.warning', { message });
  if (severity === 3) return t('diagnostic.info', { message });
  if (severity === 4) return t('diagnostic.hint', { message });
  return t('diagnostic.error', { message });
};
/** The content of the file is an app's to read (FileCrypt): it is never kept outside the file. */
const isSecret = id => Object.values(fs.get(id)?.apps ?? {}).some(v => v?.content === true);

// TextMate grammars added by the user, read once (the settings reload them)
const grammarsReady = loadCustomGrammars();

/**
 * Text editor: one tab per open document (shared/TabBar.js), line numbers, syntax highlighting
 * (Tree-sitter, TextMate or simple), completion and diagnostics from language servers (LSP) or the
 * built-in vocabularies, JSON schemas. args.file opens a file, args.folder opens a folder in the
 * panel on the right (FileTree.js), where its content is managed; the last folder opened comes
 * back in new windows. Find and replace in a bar above the text (shared/FindBar.js, search.js: Ctrl+F,
 * Ctrl+H); «Save as» (Ctrl+Shift+S, and the first save of a new document) asks for the name and
 * the folder in the bar above the text.
 *
 * Closing the window does not ask to save: the tabs and their unsaved text are kept (sessions.js)
 * and come back with the window (args.session, from getState) or, when the user closed it, in the
 * next new window. Only what cannot be kept is asked about: files whose content is an app's
 * (encrypted) and very long texts. Without the "reopen" setting the window asks for every change.
 */
export default function createEditor({ args, openWindow } = {}) {
  const win = new Window({ title: t('document.untitled'), subtitle: 'Editor', icon: 'code', width: 780, height: 520, minWidth: 460, minHeight: 280 });
  const editor = new TextEditor(win, openWindow);
  // args.folder: null means "no folder" (a window restored as it was), missing means the last one
  const folder = args && 'folder' in args ? args.folder : FileTree.savedRoot();
  editor.tree.setRoot(folder && fs.get(folder)?.type === 'folder' ? folder : null);
  editor.start(args);
  // Launched again (e.g. another file opened from File): it opens here, in a tab
  win.on('launch', a => {
    if (a?.folder && fs.get(a.folder)?.type === 'folder') editor.tree.setRoot(a.folder);
    if (a?.file && fs.exists(a.file)) editor.open(a.file);
  });
  win.canClose = () => editor.canClose();
  // A file locked again (FileCrypt): only its tab closes
  win.closeFiles = ids => editor.closeFiles(ids);
  // Saved by workareas and workspaces: the session (tabs), the files shown, the folder
  win.getState = () => editor.windowState();
  if (args?.sidebar === false && editor.tree.root) editor.tree.setCollapsed(true);
  return win;
}

const lineOf = (text, pos) => {
  let line = 1;
  for (let i = text.indexOf('\n'); i !== -1 && i < pos; i = text.indexOf('\n', i + 1)) line++;
  return line;
};

/** Offset where each line begins. */
const lineStarts = text => {
  const starts = [0];
  for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) starts.push(i + 1);
  return starts;
};

/** Text node and offset of the character `ch` inside a line of the highlighted copy. */
const pointIn = (row, ch) => {
  const walk = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
  let node, last = null;
  while ((node = walk.nextNode())) {
    if (ch <= node.length) return [node, ch];
    ch -= node.length;
    last = node;
  }
  return last ? [last, last.length] : [row, 0];
};

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

/** One open document, shown in a tab. Its own textarea keeps its own undo history. */
class Doc {
  fileId = null;
  name = '';
  saved = '';             // text as last saved (or loaded)
  lost = null;            // { id, saved } of the file while it is removed: it comes back if restored
  isNew = true;           // never had a file: shown as "Untitled"
  number = 1;             // "Untitled 2"
  lang = 'text';
  langChosen = false;     // the user picked a language: keep it on rename
  message = '';
  untitled = uid();       // the document's URI for the language servers while it has no file
  loaded = true;          // false: the file is not read yet (a tab brought back), or could not be
  loading = null;
  draft = null;           // { text, base } brought back, until the file is read
  conflict = false;       // the file changed after the unsaved text was written
  draftBase = null;       // while in conflict: what the draft was written on
  secret = false;         // the content is an app's: never kept as a draft
  fresh = false;          // opened just now: if the file cannot be read the tab goes
  discarded = false;      // "Don't save" while the window was closing: no draft until the next change
  draftTimer = 0;
  sel = null;             // [start, end] to put back once the file is read
  top = 0;
  left = 0;

  constructor(key, input) {
    this.key = key;
    this.input = input;
  }
}

class TextEditor {
  /** @type {Doc[]} */
  tabs = [];
  /** @type {Doc | null} the tab shown */
  tab = null;
  sid = null;             // the session of this window (sessions.js)
  #lines = 0;
  #raf = 0;
  #status = '';           // state shown on the right when the caret is not on a diagnostic
  #hl = null;             // { engine, tokenize } in use
  #hlKey = '';
  #engineNote = '';
  #client = null;         // language server client for the current language, when ready
  #doc = null;            // { uri, version } as known by the server
  #connectToken = null;
  #serverNote = '';
  #syncTimer = 0;
  #diagnostics = [];
  #completion = null;     // { from, items, index, manual } while the suggestion list is open
  #suggestSeq = 0;
  #accepting = false;     // inserting a suggestion: its own input event must not reopen the list
  #banner = null;         // { kind, leave } of the bar above the text
  #sessionTimer = 0;
  #closed = [];           // file ids of the tabs closed, the last at the end
  #dismissed = false;     // closed by the user: the tabs go to the next new window
  #search = null;         // { doc, text, key, matches, error, starts } of the find bar, for the text shown
  #editing = false;       // the editor changes the text itself (replace): it is not typing
  #marksRaf = 0;

  constructor(win, openWindow) {
    this.win = win;
    this.openWindow = openWindow ?? (() => {});
    const { signal } = win;

    const tool = (glyph, label, onclick) => h('button', { class: 'ed-btn', type: 'button', title: label, 'aria-label': label, onclick }, icon(glyph));
    this.revealBtn = tool('folder', t('toolbar.reveal'), () => this.reveal());
    this.schemaBtn = h('button', { class: 'ed-schema', type: 'button', onclick: () => this.#schemaMenu() });
    this.langSelect = selectField({ value: 'text', label: t('toolbar.language'), options: [], onChange: v => this.#setLanguage(v, true) });
    this.langSelect.classList.add('ed-lang');
    this.#fillLanguages();
    this.banner = h('div', { class: 'ed-banner', role: 'alertdialog', hidden: true });

    this.tabBar = new TabBar({ t, signal, label: t('tabs.label'), newLabel: t('toolbar.newDocument') });
    this.tabBar.on('select', key => this.#activate(this.#find(key)));
    this.tabBar.on('close', key => this.closeTab(this.#find(key)));
    this.tabBar.on('new', () => this.newDocument());
    this.tabBar.on('menu', e => this.#tabMenu(e));
    this.tabBar.on('move', ({ key, index }) => this.#moveTab(this.#find(key), index));

    this.gutter = h('div', { class: 'ed-gutter', 'aria-hidden': 'true' });
    this.current = h('div', { class: 'ed-current', 'aria-hidden': 'true' });
    // The matches of the find bar, under the highlighted copy
    this.marks = h('div', { class: 'ed-marks', 'aria-hidden': 'true' });
    this.code = h('pre', { class: 'ed-hl', 'aria-hidden': 'true' });
    this.squiggles = h('div', { class: 'ed-diags', 'aria-hidden': 'true' });
    this.suggestions = h('div', { class: 'ed-complete', role: 'listbox', id: `ed-complete-${uid()}`, 'aria-label': t('completion.label'), hidden: true });
    // The textareas of the tabs go before the suggestions
    this.area = h('div', { class: 'ed-area' }, this.current, this.marks, this.code, this.squiggles, this.suggestions);
    // Clicking a suggestion must not take the focus away from the text
    this.suggestions.addEventListener('pointerdown', e => {
      e.preventDefault();
      const opt = e.target.closest('[data-index]');
      if (opt) this.#acceptCompletion(Number(opt.dataset.index));
    }, { signal });
    this.suggestions.addEventListener('pointermove', e => {
      const opt = e.target.closest('[data-index]');
      if (opt && this.#completion && Number(opt.dataset.index) !== this.#completion.index) this.#selectCompletion(Number(opt.dataset.index));
    }, { signal });
    this.position = h('span');
    this.info = h('button', { class: 'ed-info', type: 'button', title: t('toolbar.settings'), onclick: () => openEditorSettings(this.openWindow) });
    this.state = h('span', { class: 'ed-state' });

    this.tree = new FileTree({ win, openWindow: this.openWindow });
    this.tree.on('open', id => this.open(id));
    this.tree.on('root', () => this.#renderSidebarButton());
    this.tree.on('layout', () => this.#renderSidebarButton());
    this.sidebarBtn = tool('sidebar', t('toolbar.showFolder'), () => this.toggleSidebar());

    this.findBar = new FindBar({ t, signal });
    this.findBar.on('query', () => this.#findFrom(this.input?.selectionStart ?? 0));
    this.findBar.on('next', () => this.findNext(1));
    this.findBar.on('previous', () => this.findNext(-1));
    this.findBar.on('replace', () => this.replaceOne());
    this.findBar.on('replaceAll', () => this.replaceAll());
    this.findBar.on('close', () => this.closeFind());

    win.body.append(
      h('div', { class: 'ed-toolbar' },
        tool('filePlus', t('toolbar.newDocument'), () => this.newDocument()),
        tool('open', t('toolbar.openFile'), () => this.openFile()),
        tool('folderOpen', t('toolbar.openFolder'), () => this.openFolder()),
        tool('save', t('toolbar.save'), () => this.save()),
        this.revealBtn,
        tool('search', t('toolbar.find'), () => this.openFind(true)),
        h('span', { class: 'ed-grow' }),
        this.schemaBtn,
        this.langSelect,
        tool('gear', t('toolbar.settings'), () => openEditorSettings(this.openWindow)),
        this.sidebarBtn),
      this.tabBar.el,
      this.banner,
      this.findBar.el,
      h('div', { class: 'ed-main' },
        h('div', { class: 'ed' }, this.gutter, this.area),
        this.tree.el),
      h('div', { class: 'ed-status' }, this.position, this.info, this.state));

    // Leaving (reload, closing the browser tab): the unsaved texts are kept; the browser asks only
    // for those that cannot be
    addEventListener('beforeunload', e => {
      this.#flushDrafts();
      this.#saveSession();
      if (this.tabs.some(doc => this.#dirtyOf(doc) && !this.#keepable(doc))) e.preventDefault();
    }, { signal });

    const off = [
      fs.on('change', e => this.#onFsChange(e)),
      // Back in its workspace: path and name again (from another one its file may not be visible)
      fs.on('scope', () => { if (this.fileId && fs.exists(this.fileId)) this.render(); }),
      editorConfig.on('change', section => {
        if (section === 'engines') { this.#loadHighlighter(); this.render(); }
        if (section === 'schemas') this.render();
      }),
      servers.on('changed', () => this.#connect()),
      // TextMate colors come from a theme: repaint with the other one
      settings.on('change:theme', () => this.#paint()),
      languageEvents.on('change', () => {
        this.#fillLanguages();
        for (const doc of this.tabs) if (!doc.langChosen && doc !== this.tab) doc.lang = languageForName(doc.name);
        if (!this.tab) return;
        if (!this.tab.langChosen) this.#setLanguage(languageForName(this.name));
        else this.#loadHighlighter();
      }),
      handleCommand('editor.save', { isActive: () => win.active, run: () => this.save() }),
      handleCommand('editor.new', { isActive: () => win.active, run: () => this.newDocument() }),
      handleCommand('editor.openFile', { isActive: () => win.active, run: () => this.openFile() }),
      handleCommand('editor.openFolder', { isActive: () => win.active, run: () => this.openFolder() }),
      handleCommand('editor.sidebar', { isActive: () => win.active, run: () => this.toggleSidebar() }),
      handleCommand('editor.complete', { isActive: () => win.active && document.activeElement === this.input, run: () => this.#suggest(true) }),
      handleCommand('editor.closeTab', { isActive: () => win.active, run: () => this.closeTab(this.tab) }),
      handleCommand('editor.nextTab', { isActive: () => win.active && this.tabs.length > 1, run: () => this.#step(1) }),
      handleCommand('editor.previousTab', { isActive: () => win.active && this.tabs.length > 1, run: () => this.#step(-1) }),
      handleCommand('editor.reopenTab', { isActive: () => win.active, run: () => this.reopenTab() }),
      handleCommand('editor.saveAs', { isActive: () => win.active, run: () => this.saveAs() }),
      handleCommand('editor.find', { isActive: () => win.active, run: () => this.openFind(false) }),
      handleCommand('editor.replace', { isActive: () => win.active, run: () => this.openFind(true) }),
      // Ctrl Z / Ctrl Y in the text: the textarea's own history (typing, completions, indents)
      history.attach(this.area, {
        text: true,
        undo: () => this.#nativeHistory('undo'),
        redo: () => this.#nativeHistory('redo'),
      }),
    ];
    // Automations: this window saves again the file of a step (in its tab, shown first)
    automation()?.handle('editor.save', (params, { file }) => this.saveFile(file), { window: win, file: () => this.fileId });
    automation()?.handle('editor.replace', (params, { file }) => this.replaceAllIn(file, params), { window: win, file: () => this.fileId });
    automation()?.handle('editor.saveAs', (params, { file }) => this.saveAsFile(file, params), { window: win, file: () => this.fileId });
    win.on('dismiss', () => { this.#dismissed = true; });
    win.on('destroy', () => {
      off.forEach(o => o());
      this.#disconnect();
      cancelAnimationFrame(this.#raf);
      cancelAnimationFrame(this.#marksRaf);
      clearTimeout(this.#sessionTimer);
      this.#closeSession();
    });
    // The panel keeps within 60% of the window
    const fit = new ResizeObserver(() => { if (!this.tree.el.hidden) this.tree.resize(this.tree.width, false); });
    fit.observe(win.body);
    // Another width wraps the lines elsewhere
    const wrap = new ResizeObserver(() => { if (this.tab) this.#layout(); });
    wrap.observe(this.area);
    // So does the monospaced font when it arrives after the first layout (it is loaded on first use)
    document.fonts.addEventListener('loadingdone', () => { if (this.tab) this.#layout(); }, { signal });
    win.on('destroy', () => { fit.disconnect(); wrap.disconnect(); });
  }

  /** Undo / redo of the text, through the browser (execCommand keeps one history with typing). */
  #nativeHistory(what) {
    this.#hideCompletion();
    this.input.focus();
    return document.execCommand(what) ? '' : null;
  }

  // The tab shown
  get input() { return this.tab?.input; }
  get fileId() { return this.tab?.fileId ?? null; }
  get name() { return this.tab?.name ?? ''; }
  get dirty() { return !!this.tab && this.#dirtyOf(this.tab); }
  get text() { return this.input?.value ?? ''; }

  // ---------- Session ----------

  /**
   * The tabs of the window: those of its session (a window brought back), or those of the windows
   * closed by the user (a new window), then args.file.
   */
  start(args) {
    const id = typeof args?.session === 'string' && args.session !== CLOSED ? args.session : null;
    let saved = id ? readSession(id) : null;
    this.sid = saved ? id : uid();
    // A file missing here was deleted if the tab was closed in this workspace; otherwise another
    // workspace hides it, and its tab stays aside for a window there
    if (!id && editorConfig.get('tabs').reopen) saved = takeClosed(entry => !entry.file || fs.exists(entry.file) || (entry.ws ?? null) === (fs.workspace ?? null));
    if (saved) this.#restore(saved);
    if (args?.file && fs.exists(args.file)) this.open(args.file);
    else if (!this.tabs.length) this.newDocument();
    this.#saveSession();
  }

  /** What the window manager saves to recreate the window. */
  windowState() {
    return {
      session: this.sid,
      file: this.fileId,
      // The files shown: lilOS closes their tabs when one is locked again
      files: this.tabs.filter(doc => doc.fileId && (doc.loaded || doc.loading)).map(doc => doc.fileId),
      folder: this.tree.root,
      ...(this.tree.collapsed && { sidebar: false }),
    };
  }

  #restore({ active, tabs }) {
    for (const entry of tabs) {
      const draft = readDraft(entry.key);
      const node = entry.file ? fs.get(entry.file) : null;
      if (entry.file && node?.type !== 'file' && !draft) continue;   // the file went and nothing was changed
      // The same file twice (tabs put aside by two windows): one tab, with the unsaved text if any
      const twin = entry.file && this.#find(entry.file, 'fileId');
      if (twin) {
        if (draft && !twin.draft && !twin.loaded) {
          twin.draft = draft;
          twin.input.value = draft.text;
        }
        removeDraft(entry.key);
        continue;
      }
      const doc = this.#addTab(entry.key, { after: this.tabs.at(-1) });
      if (node?.type === 'file') {
        Object.assign(doc, { fileId: node.id, name: node.name, isNew: false, loaded: false, draft, secret: isSecret(node.id) });
        if (draft) doc.input.value = draft.text;
      } else if (entry.file) {
        // The file went: only its unsaved text stays (and the tab is the file's again if it comes back)
        Object.assign(doc, { name: entry.name || untitled(), isNew: false, lost: { id: entry.file, saved: '' }, message: t('status.missing') });
        doc.input.value = draft.text;
      } else {
        doc.name = entry.name || untitled();
        doc.number = this.#freeNumber(doc);
        doc.input.value = draft?.text ?? '';
      }
      if (entry.lang) Object.assign(doc, { lang: getLanguage(entry.lang).id, langChosen: true });
      else doc.lang = languageForName(doc.name);
      doc.sel = entry.sel ?? null;
      doc.top = entry.top ?? 0;
      if (doc.loaded) this.#putBack(doc);
    }
    this.#activate(this.#find(active) ?? this.tabs[0]);
  }

  #sessionTabs() {
    return this.tabs.map(doc => ({
      // A file removed meanwhile keeps its id: put back from the trash, the tab is its again
      key: doc.key, file: doc.fileId ?? doc.lost?.id ?? null, name: doc.name,
      ...(doc.langChosen && { lang: doc.lang }),
      sel: doc.loaded ? [doc.input.selectionStart, doc.input.selectionEnd] : doc.sel ?? undefined,
      top: doc === this.tab ? doc.input.scrollTop : doc.top,
    }));
  }

  #saveSession() {
    clearTimeout(this.#sessionTimer);
    if (this.sid) writeSession(this.sid, { active: this.tab?.key, tabs: this.#sessionTabs() });
  }

  #saveSessionSoon() {
    clearTimeout(this.#sessionTimer);
    this.#sessionTimer = setTimeout(() => this.#saveSession(), 300);
  }

  /**
   * The window is gone. Closed by lilOS to be recreated (a workarea reduced to an icon, an update):
   * the session stays. Closed by the user: its tabs wait for the next new window, or with the
   * "reopen" setting off they go with their unsaved text.
   */
  #closeSession() {
    this.#flushDrafts();
    if (!this.#dismissed) return this.#saveSession();
    if (editorConfig.get('tabs').reopen) {
      const blank = new Set(this.tabs.filter(doc => this.#isBlank(doc)).map(doc => doc.key));
      const ws = fs.workspace ?? undefined;
      addClosed({ active: this.tab?.key, tabs: this.#sessionTabs().filter(entry => !blank.has(entry.key)).map(entry => ({ ...entry, ws })) });
    } else {
      this.tabs.forEach(doc => removeDraft(doc.key));
    }
    removeSession(this.sid);
  }

  // ---------- Unsaved text ----------

  #dirtyOf(doc) {
    return doc.loaded ? doc.input.value !== doc.saved : !!doc.draft;
  }

  /** Its unsaved text can be kept outside the file. */
  #keepable(doc) {
    return !doc.secret && doc.input.value.length <= DRAFT_LIMIT;
  }

  #draftSoon(doc) {
    clearTimeout(doc.draftTimer);
    doc.draftTimer = setTimeout(() => this.#writeDraft(doc), DRAFT_DELAY);
  }

  /** Keeps the unsaved text of a tab, or forgets it when there is none (or it cannot be kept). */
  #writeDraft(doc) {
    clearTimeout(doc.draftTimer);
    doc.draftTimer = 0;
    if (!doc.loaded || !this.tabs.includes(doc)) return;
    if (doc.discarded || !this.#dirtyOf(doc) || !this.#keepable(doc)) removeDraft(doc.key);
    // In conflict the draft keeps saying what it was written on: the question comes back with it
    else writeDraft(doc.key, doc.input.value, doc.conflict ? doc.draftBase : doc.fileId ? hash(doc.saved) : null);
  }

  #flushDrafts() {
    for (const doc of this.tabs) if (doc.draftTimer) this.#writeDraft(doc);
  }

  // ---------- Documents ----------

  /** Opens a file in a tab (its own, if it is open already). */
  async open(id) {
    const node = fs.get(id);
    if (!node || node.type !== 'file') return;
    const open = this.#find(id, 'fileId');
    if (open) return this.#activate(open);
    // An empty "Untitled" nobody touched gives its place to the file
    const blank = this.#isBlank(this.tab) ? this.tab : null;
    const doc = this.#addTab();
    Object.assign(doc, { fileId: id, name: node.name, isNew: false, loaded: false, fresh: true, secret: isSecret(id), lang: languageForName(node.name) });
    this.#activate(doc);
    if (blank) this.#removeTab(blank);
    await doc.loading;
  }

  newDocument() {
    const number = this.#freeNumber();
    const doc = this.#addTab();
    Object.assign(doc, { name: untitled(), number });
    doc.lang = languageForName(doc.name);
    this.#activate(doc);
  }

  /** Chooses a file of lilOS and opens it. */
  async openFile() {
    const node = await pickFile(this.openWindow, { title: t('picker.openFile.title') });
    if (node) this.open(node.id);
  }

  /** Chooses a folder: it opens in the panel on the right, as the root of what is managed there. */
  async openFolder() {
    const node = await pickFile(this.openWindow, {
      kind: 'folder', title: t('picker.openFolder.title'), text: t('picker.openFolder.text'),
    });
    if (node) {
      this.tree.setRoot(node.id);
      this.tree.tree.focus();
    }
  }

  /** Hides or shows the folder panel; with no folder open, asks for one. */
  toggleSidebar() {
    if (!this.tree.root) return this.openFolder();
    this.tree.setCollapsed(!this.tree.collapsed);
    if (!this.tree.collapsed) this.tree.tree.focus();
  }

  /**
   * Saves the tab shown to its file. A document without one (new, or its file was deleted) asks
   * where and with which name, as «Save as» does. Resolves true when saved.
   */
  async save() {
    const doc = this.tab;
    if (!doc?.loaded) return false;   // the file is not read yet: there is nothing to save over it
    if (!doc.fileId || !fs.exists(doc.fileId)) return this.saveAs();
    doc.message = '';
    const text = doc.input.value;
    await fs.write(doc.fileId, text);
    doc.saved = text;
    doc.conflict = false;
    automation()?.record('editor.save', { file: doc.fileId });
    if (this.#banner?.kind === 'conflict' && this.tab === doc) this.#closeBanner();
    this.#writeDraft(doc);
    if (this.tab === doc) this.tree.setCurrent(doc.fileId);
    this.#saveSessionSoon();
    this.render();
    return true;
  }

  /**
   * «Save as»: name and folder in the bar above the text (the folder chosen with lilOS's picker),
   * then the tab shown is saved there and becomes the new file's. A file with that name already
   * there is written over after asking. Resolves true when saved.
   */
  saveAs() {
    const doc = this.tab;
    if (!doc?.loaded) return Promise.resolve(false);
    const proposal = this.#saveProposal(doc);
    let folder = proposal.folder;
    let confirmed = null;   // without messageBox (older lilOS): the file a second Save writes over
    let busy = false;
    let mine = null;
    return new Promise(resolve => {
      const finish = saved => {
        if (this.#banner === mine) this.#closeBanner();
        mine = null;
        resolve(saved);
      };
      const note = h('span', { class: 'ed-banner-text' }, t('saveAs.prompt'));
      const name = h('input', { class: 'ctl-text ed-banner-input', type: 'text', spellcheck: 'false', autocomplete: 'off', 'aria-label': t('saveAs.name') });
      name.value = proposal.name;
      const where = h('span', { class: 'ed-saveas-path', id: `ed-saveas-${uid()}` });
      const showFolder = () => {
        where.textContent = fs.get(folder)?.type === 'folder' ? fs.path(folder) : t('saveAs.noFolder');
        where.title = where.textContent;
      };
      const choose = actionButton({ label: t('saveAs.chooseFolder'), onClick: async () => {
        const node = await pickFile(this.openWindow, { kind: 'folder', title: t('saveAs.pickFolder.title'), text: t('saveAs.pickFolder.text') });
        if (!mine) return;
        if (node) { folder = node.id; confirmed = null; showFolder(); }
        name.focus();
      } });
      choose.setAttribute('aria-describedby', where.id);
      const apply = async () => {
        if (busy || !mine) return;
        const fileName = name.value.trim();
        if (!fileName || fileName.includes('/')) { note.textContent = t('saveAs.badName'); return name.focus(); }
        if (fs.get(folder)?.type !== 'folder') { note.textContent = t('saveAs.noFolder'); return choose.focus(); }
        const existing = this.#childNamed(folder, fileName);
        if (existing && existing.type !== 'file') { note.textContent = t('saveAs.notAFile', { name: existing.name }); return name.focus(); }
        if (existing && existing.id !== doc.fileId) {
          if (sdk.messageBox) {
            busy = true;
            const answer = await sdk.messageBox(this.win, {
              icon: 'warning', title: t('saveAs.overwrite.title', { name: existing.name }),
              text: t('saveAs.overwrite.text', { path: fs.path(folder) }), buttons: ['continue', 'cancel'],
            });
            busy = false;
            if (answer !== 'continue' || !mine) return name.focus();
          } else if (confirmed !== existing.id) {
            confirmed = existing.id;
            note.textContent = t('saveAs.overwrite.again', { name: existing.name });
            return;
          }
        }
        const before = doc.fileId && fs.exists(doc.fileId) ? doc.fileId : null;
        busy = true;
        try {
          const node = await this.#saveTo(doc, folder, fileName);
          automation()?.record('editor.saveAs', {
            params: { folder, name: fileName }, defaults: { folder: proposal.folder, name: proposal.name },
            file: before, result: node.id,
          });
          finish(true);
          if (this.tab === doc) doc.input.focus();
        } catch (err) {
          busy = false;
          note.textContent = t('saveAs.failed', { error: err?.message ?? String(err) });
        }
      };
      name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
      name.addEventListener('input', () => { confirmed = null; });
      showFolder();
      this.#openBanner('saveAs', [
        icon('save'), note, name,
        h('span', { class: 'ed-saveas-in' }, t('saveAs.in')), where, choose,
        actionButton({ label: t('saveAs.save'), primary: true, onClick: apply }),
        actionButton({ label: t('dialog.cancel'), onClick: () => { finish(false); this.input?.focus(); } }),
      ], () => { finish(false); this.input?.focus(); }, () => finish(false));
      mine = this.#banner;
      name.focus();
      // The name without its extension is selected: typing replaces it
      const dot = proposal.name.lastIndexOf('.');
      name.setSelectionRange(0, dot > 0 ? dot : proposal.name.length);
    });
  }

  /**
   * «Save as» without asking anything (automations): the tab of the file (for a document that had
   * none, the tab shown) saved as `name` in `folder`. A file already there with that name is
   * written over without asking: a step that runs must not stop on a question, and the user chose
   * that name when recording. Resolves the id of the file.
   */
  async saveAsFile(id, { folder, name } = {}) {
    const doc = id ? this.#find(id, 'fileId') : this.tab;
    if (!doc) throw new Error(t('automation.notOpen'));
    this.#activate(doc, { focus: false });
    if (!doc.loaded) await this.#loadFile(doc);
    if (!doc.loaded || !this.tabs.includes(doc)) throw new Error(t('automation.notRead'));
    if (typeof folder !== 'string' || fs.get(folder)?.type !== 'folder') throw new Error(t('saveAs.noFolder'));
    const fileName = typeof name === 'string' ? name.trim() : '';
    if (!fileName || fileName.includes('/')) throw new Error(t('saveAs.badName'));
    const node = await this.#saveTo(doc, folder, fileName);
    return node.id;
  }

  /** Where «Save as» proposes to save: next to the file, otherwise in the open folder or Documenti. */
  #saveProposal(doc) {
    const node = doc.fileId && fs.get(doc.fileId);
    if (node && fs.get(node.parent)?.type === 'folder') return { folder: node.parent, name: node.name };
    const folder = ((this.tree.root && fs.get(this.tree.root)) ?? fs.resolve('/Documenti') ?? fs.get(fs.root)).id;
    return { folder, name: fs.uniqueName?.(folder, doc.name) ?? doc.name };
  }

  /** The node with this name in a folder (names are unique there, whatever the case), or null. */
  #childNamed(folder, name) {
    const lower = name.toLowerCase();
    return fs.children(folder).find(n => n.name.toLowerCase() === lower) ?? null;
  }

  /**
   * Writes the text of a tab into `name` in a folder (into the file already there with that name,
   * or a new one) and makes the tab that file's. Another tab showing that file goes: its file now
   * has this text. Resolves the node; throws when it could not be written.
   */
  async #saveTo(doc, folder, name) {
    const existing = this.#childNamed(folder, name);
    if (existing && existing.type !== 'file') throw new Error(t('saveAs.notAFile', { name: existing.name }));
    const node = existing ?? await fs.create(folder, { type: 'file', name });
    const text = doc.input.value;
    try {
      await fs.write(node.id, text);
    } catch (err) {
      if (!existing) fs.remove(node.id);
      throw err;
    }
    const twin = this.tabs.find(d => d !== doc && d.fileId === node.id);
    if (twin) this.#removeTab(twin);
    Object.assign(doc, {
      fileId: node.id, name: node.name, isNew: false, lost: null, saved: text, conflict: false,
      secret: isSecret(node.id), message: t('status.savedIn', { path: fs.path(node.id) }),
    });
    if (!doc.langChosen) doc.lang = languageForName(node.name);
    if (this.#banner?.kind === 'conflict' && this.tab === doc) this.#closeBanner();
    this.#writeDraft(doc);
    if (this.tab === doc) {
      this.tree.setCurrent(doc.fileId);
      this.#loadHighlighter();   // the name may say another language
      this.#connect();           // another file URI
    }
    this.#saveSessionSoon();
    this.render();
    return node;
  }

  /** Saves the tab of a file without asking anything (automations), showing it first. */
  async saveFile(id) {
    const doc = id ? this.#find(id, 'fileId') : null;
    if (!doc) throw new Error(t('automation.notOpen'));
    this.#activate(doc, { focus: false });
    if (!doc.loaded) await this.#loadFile(doc);
    if (!doc.loaded || !this.tabs.includes(doc)) throw new Error(t('automation.notRead'));
    if (!(await this.save())) throw new Error(t('automation.notSaved'));
  }

  /** Opens File on the folder of a document (the one shown). */
  reveal(doc = this.tab) {
    const node = doc?.fileId && fs.get(doc.fileId);
    if (node) launch('files', { folder: node.parent });
  }

  /**
   * With unsaved changes in the tab shown, asks in a bar above the text: Save / Don't save /
   * Cancel. Resolves true when it is fine to go on.
   */
  confirmDiscard() {
    if (!this.dirty) return Promise.resolve(true);
    return new Promise(resolve => {
      const done = async choice => {
        this.#closeBanner();
        if (choice === 'save') resolve(await this.save());
        else resolve(choice === 'discard');
        if (choice === 'cancel') this.input?.focus();
      };
      this.#openBanner('unsaved', [
        icon('help'),
        h('span', { class: 'ed-banner-text' }, t('dialog.unsaved.text', { name: this.#displayName() })),
        actionButton({ label: t('dialog.unsaved.save'), primary: true, onClick: () => done('save') }),
        actionButton({ label: t('dialog.unsaved.discard'), danger: true, onClick: () => done('discard') }),
        actionButton({ label: t('dialog.cancel'), onClick: () => done('cancel') }),
      ], () => done('cancel'));
    });
  }

  /**
   * Closing the window: with "reopen" on, only the changes that cannot be kept are asked about,
   * one tab at a time; otherwise every change. Resolves false if one answer was Cancel.
   */
  async canClose() {
    const reopen = editorConfig.get('tabs').reopen;
    for (const doc of [...this.tabs]) {
      if (!this.tabs.includes(doc) || !this.#dirtyOf(doc) || (reopen && this.#keepable(doc))) continue;
      this.#activate(doc);
      if (!(await this.confirmDiscard())) return false;
      if (this.#dirtyOf(doc)) {
        // "Don't save": the window may come back (a workarea), without this text
        doc.discarded = true;
        clearTimeout(doc.draftTimer);
        removeDraft(doc.key);
      }
    }
    return true;
  }

  // ---------- Find and replace ----------

  /**
   * Opens the find bar (Ctrl+F; Ctrl+H with the replace row). A short selection on one line
   * becomes what to find.
   */
  openFind(replace = false) {
    const ta = this.input;
    if (!ta) return;
    const selected = ta.value.slice(ta.selectionStart, ta.selectionEnd);
    this.#hideCompletion();
    this.findBar.open({ replace, text: selected && selected.length <= 200 && !selected.includes('\n') ? selected : null });
  }

  /** Closes the find bar; the focus goes back to the text, with the match it showed selected. */
  closeFind() {
    if (!this.findBar.isOpen) return;
    this.findBar.close();
    this.#search = null;
    this.marks.replaceChildren();
    this.input?.focus();
  }

  /**
   * The matches of the find bar in the text shown (found again when the text or the query
   * changes), or null when the bar is closed.
   */
  #matches() {
    if (!this.findBar.isOpen || !this.tab) return null;
    const query = this.findBar.query;
    const key = JSON.stringify([query.find, query.matchCase, query.wholeWord, query.regex]);
    const text = this.text;
    const s = this.#search;
    if (s && s.doc === this.tab && s.key === key && s.text === text) return s;
    let re = null, error = '';
    try {
      re = queryRegExp(query);
    } catch (err) {
      error = regexError(err);
    }
    this.#search = { doc: this.tab, key, text, error, matches: findAll(text, re), starts: null };
    return this.#search;
  }

  /** The index of the match selected in the text, or -1. */
  #currentMatch(s = this.#matches()) {
    if (!s?.matches.length) return -1;
    const { selectionStart, selectionEnd } = this.input;
    const i = firstAtOrAfter(s.matches, selectionStart);
    return s.matches[i]?.start === selectionStart && s.matches[i].end === selectionEnd ? i : -1;
  }

  /** Selects the first match at `pos` or after it (the first of all after the last one). */
  #findFrom(pos) {
    const s = this.#matches();
    if (s?.matches.length) {
      const i = firstAtOrAfter(s.matches, pos);
      this.#selectMatch(s.matches[i] ?? s.matches[0]);
    } else this.#renderFind();
  }

  /** The next match (dir 1) or the previous one (-1), from the one selected or from the caret. */
  findNext(dir = 1) {
    if (!this.findBar.isOpen) return this.openFind(false);
    const s = this.#matches();
    if (!s?.matches.length) return this.#renderFind();
    const list = s.matches, ta = this.input;
    const cur = this.#currentMatch(s);
    let i;
    if (cur !== -1) i = (cur + dir + list.length) % list.length;
    else if (dir > 0) i = firstAtOrAfter(list, ta.selectionEnd) % list.length;
    else i = (firstAtOrAfter(list, ta.selectionStart) - 1 + list.length) % list.length;
    this.#selectMatch(list[i]);
  }

  #selectMatch(match) {
    this.input.setSelectionRange(match.start, match.end);
    this.#reveal(match.start, match.end);
    this.#renderFind();
  }

  /** Replaces the match selected and selects the next one; with none selected, selects the next one. */
  replaceOne() {
    const doc = this.tab;
    if (!doc?.loaded || doc.input.readOnly) return;
    const s = this.#matches();
    if (!s?.matches.length) return;
    const cur = this.#currentMatch(s);
    if (cur === -1) return this.findNext(1);
    const match = s.matches[cur];
    const by = replacementFor(this.findBar.query, match, s.text);
    this.#editText(match.start, match.end, by);
    this.#findFrom(match.start + by.length);
  }

  /** Replaces every match of the find bar in the tab shown (one step of Ctrl Z), and records it. */
  replaceAll() {
    const doc = this.tab;
    if (!doc?.loaded || doc.input.readOnly) return;
    const query = this.findBar.query;
    let n;
    try {
      n = this.#replaceAll(query);
    } catch {
      return this.#renderFind();   // an invalid regular expression: the bar says it
    }
    if (!n) return;
    doc.message = t('status.replaced', { n });
    const { find, replace, matchCase, wholeWord, regex } = query;
    automation()?.record('editor.replace', { params: { find, replace, matchCase, wholeWord, regex }, file: doc.fileId });
    this.render();
  }

  /**
   * Replace all without the bar (automations), in the tab of the file (for a document without
   * one, the tab shown), shown first. Throws when the regular expression is not valid.
   */
  async replaceAllIn(id, params = {}) {
    const doc = id ? this.#find(id, 'fileId') : this.tab;
    if (!doc) throw new Error(t('automation.notOpen'));
    this.#activate(doc, { focus: false });
    if (!doc.loaded) await this.#loadFile(doc);
    if (!doc.loaded || !this.tabs.includes(doc)) throw new Error(t('automation.notRead'));
    const query = {
      find: typeof params.find === 'string' ? params.find : '', replace: typeof params.replace === 'string' ? params.replace : '',
      matchCase: params.matchCase === true, wholeWord: params.wholeWord === true, regex: params.regex === true,
    };
    if (!query.find) throw new Error(t('automation.noFind'));
    try {
      queryRegExp(query);
    } catch (err) {
      throw new Error(t('shared.find.badRegex', { error: regexError(err) }));
    }
    const n = this.#replaceAll(query);
    if (n) {
      doc.message = t('status.replaced', { n });
      this.render();
    }
  }

  /** Every match replaced in the tab shown, as one change. Returns how many; throws for an invalid regular expression. */
  #replaceAll(query) {
    const change = replaceAll(this.text, query);
    if (!change) return 0;
    this.#editText(change.from, change.to, change.text);
    return change.count;
  }

  /**
   * Replaces from..to of the text shown through the textarea's own editing (execCommand), so
   * that Ctrl Z undoes it in one step. The focus goes back where it was (the find bar), and so
   * does the scroll (the next match is shown by whoever asked).
   */
  #editText(from, to, text) {
    const ta = this.input;
    const focused = document.activeElement;
    const top = ta.scrollTop;
    this.#editing = true;
    try {
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(from, to);
      if (document.activeElement === ta) this.#insert(text);
      else {
        // The textarea cannot take the focus (a replay in a window not shown): execCommand would
        // write wherever the focus is, so the text changes without the undo history
        ta.setRangeText(text, from, to, 'end');
        this.tab.discarded = false;
        this.#changed();
        this.#syncLater();
      }
    } finally {
      this.#editing = false;
    }
    ta.scrollTop = top;
    if (focused && focused !== ta && focused !== document.body && focused.isConnected) focused.focus({ preventScroll: true });
    // The copy must show the new text before matches are marked or shown
    cancelAnimationFrame(this.#raf);
    this.#raf = 0;
    this.render();
  }

  /** Scrolls the text so that from..to is on screen (the textarea does it only while it has the focus). */
  #reveal(from, to) {
    if (this.#raf) { cancelAnimationFrame(this.#raf); this.#raf = 0; this.render(); }
    const text = this.text;
    const lineStart = text.lastIndexOf('\n', from - 1) + 1;
    const lineEnd = text.indexOf('\n', from);
    const col = from - lineStart;
    const [at] = this.#rowRects(lineOf(text, from) - 1, col, Math.min(col + Math.max(1, to - from), (lineEnd === -1 ? text.length : lineEnd) - lineStart));
    if (!at) return;
    const ta = this.input;
    const y = at.top - this.code.getBoundingClientRect().top;   // from the top of the text
    if (y < ta.scrollTop || y + at.height > ta.scrollTop + ta.clientHeight) {
      ta.scrollTop = Math.max(0, y - Math.round(ta.clientHeight / 3));
      this.#syncScroll();
    }
  }

  #renderFindSoon() {
    if (this.#marksRaf || !this.findBar.isOpen) return;
    this.#marksRaf = requestAnimationFrame(() => { this.#marksRaf = 0; this.#renderFind(); });
  }

  /** The count in the find bar and the matches marked on the lines on screen. */
  #renderFind() {
    const s = this.#matches();
    if (!s) { if (this.marks.firstChild) this.marks.replaceChildren(); return; }
    const { matches } = s;
    const cur = this.#currentMatch(s);
    this.findBar.results({ total: matches.length, index: cur, more: matches.length >= MAX_MATCHES, error: s.error });
    if (!matches.length) return this.marks.replaceChildren();

    // Only the lines on screen: their rows in the copy, found by their place
    const rows = this.code.children;
    const ta = this.input;
    const top = ta.scrollTop, bottom = top + ta.clientHeight;
    let lo = 0, hi = rows.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (rows[mid].offsetTop + rows[mid].offsetHeight <= top) lo = mid + 1;
      else hi = mid;
    }
    let last = lo;
    while (last < rows.length - 1 && rows[last + 1].offsetTop < bottom) last++;
    const starts = s.starts ??= lineStarts(s.text);
    const lineAt = pos => {
      let a = 0, b = starts.length - 1;
      while (a < b) {
        const mid = (a + b + 1) >> 1;
        if (starts[mid] <= pos) a = mid;
        else b = mid - 1;
      }
      return a;
    };
    const origin = this.code.getBoundingClientRect();
    const marks = [];
    const end = starts[last + 1] ?? Infinity;
    // A match may begin on a line above the screen and go on into it (a regular expression with \n)
    for (let i = Math.max(0, firstAtOrAfter(matches, starts[lo]) - 1); i < matches.length && matches[i].start < end && marks.length < MAX_MARKS; i++) {
      const { start, end: stop } = matches[i];
      for (let l = Math.max(lo, lineAt(start)); l <= Math.min(last, lineAt(stop - 1)); l++) {
        const from = Math.max(start, starts[l]) - starts[l];
        const to = Math.min(stop, (starts[l + 1] ?? s.text.length + 1) - 1) - starts[l];
        for (const r of this.#rowRects(l, from, Math.max(from, to))) {
          marks.push(h('div', {
            class: i === cur ? 'ed-mark on' : 'ed-mark',
            style: { left: `${r.left - origin.left}px`, top: `${r.top - origin.top}px`, width: `${Math.max(4, r.right - r.left)}px`, height: `${r.height}px` },
          }));
        }
      }
    }
    this.marks.replaceChildren(...marks);
  }

  // ---------- Tabs ----------

  /** Closes a tab, asking first if it has changes. Resolves false if the user cancelled. */
  async closeTab(doc) {
    if (!doc || !this.tabs.includes(doc)) return true;
    if (this.#dirtyOf(doc)) {
      this.#activate(doc);
      if (!(await this.confirmDiscard())) return false;
      if (!this.tabs.includes(doc)) return true;
    }
    if (doc.fileId) this.#closed = [...this.#closed.filter(id => id !== doc.fileId), doc.fileId].slice(-CLOSED_TABS);
    this.#removeTab(doc);
    return true;
  }

  /** Closes the tabs of these files (they were locked again). */
  async closeFiles(ids) {
    for (const doc of this.tabs.filter(d => d.fileId && ids.includes(d.fileId))) {
      if (!(await this.closeTab(doc))) return;
    }
  }

  /** Opens again the last tab closed whose file still exists. */
  reopenTab() {
    while (this.#closed.length) {
      const id = this.#closed.pop();
      if (fs.get(id)?.type === 'file') return this.open(id);
    }
  }

  async #closeMany(docs) {
    for (const doc of docs) if (!(await this.closeTab(doc))) return;
  }

  #find(value, field = 'key') {
    return value ? this.tabs.find(doc => doc[field] === value) ?? null : null;
  }

  /** An empty "Untitled" nobody touched. */
  #isBlank(doc) {
    return !!doc && doc.isNew && !doc.fileId && !doc.lost && doc.loaded && doc.input.value === '' && doc.saved === '';
  }

  #freeNumber(except = null) {
    const used = new Set(this.tabs.filter(doc => doc !== except && doc.isNew && !doc.fileId).map(doc => doc.number));
    let n = 1;
    while (used.has(n)) n++;
    return n;
  }

  /** A new tab, after `after` (the tab shown): its own textarea, hidden until it is shown. */
  #addTab(key = uid(), { after = this.tab } = {}) {
    const { signal } = this.win;
    const input = h('textarea', {
      class: 'ed-input', wrap: 'soft', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': t('document.text'),
      'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': this.suggestions.id, hidden: true,
    });
    input.addEventListener('input', e => this.#onInput(e), { signal });
    input.addEventListener('keydown', e => this.#onKey(e), { signal });
    input.addEventListener('scroll', () => { this.#syncScroll(); this.#hideCompletion(); this.#renderFindSoon(); }, { signal });
    input.addEventListener('blur', () => this.#hideCompletion(), { signal });
    input.addEventListener('pointerdown', () => this.#hideCompletion(), { signal });
    for (const type of ['keyup', 'pointerup', 'select', 'focus']) input.addEventListener(type, () => this.#caret(), { signal });
    this.area.insertBefore(input, this.suggestions);
    const doc = new Doc(key, input);
    const i = after ? this.tabs.indexOf(after) : -1;
    this.tabs.splice(i === -1 ? this.tabs.length : i + 1, 0, doc);
    return doc;
  }

  #removeTab(doc) {
    const i = this.tabs.indexOf(doc);
    if (i === -1) return;
    clearTimeout(doc.draftTimer);
    removeDraft(doc.key);
    if (this.tab === doc) {
      this.#hideCompletion();
      this.#cancelBanner();
    }
    this.tabs.splice(i, 1);
    doc.input.remove();
    if (this.tab === doc) {
      this.tab = null;
      const next = this.tabs[i] ?? this.tabs[i - 1];
      if (next) this.#activate(next);
      else this.newDocument();
    } else {
      this.#renderTabs();
    }
    this.#saveSessionSoon();
  }

  #moveTab(doc, index) {
    if (!doc) return;
    this.tabs.splice(this.tabs.indexOf(doc), 1);
    this.tabs.splice(Math.max(0, Math.min(index, this.tabs.length)), 0, doc);
    this.#renderTabs();
    this.#saveSessionSoon();
  }

  #step(by) {
    const i = this.tabs.indexOf(this.tab);
    this.#activate(this.tabs[(i + by + this.tabs.length) % this.tabs.length]);
  }

  /** Shows a tab: its textarea, language, server, the folder panel's highlight. */
  #activate(doc, { focus = true } = {}) {
    if (!doc) return;
    const old = this.tab;
    if (old === doc) { if (focus) doc.input.focus(); return; }
    if (old) {
      this.#hideCompletion();
      this.#cancelBanner();
      old.top = old.input.scrollTop;
      old.left = old.input.scrollLeft;
      old.input.hidden = true;
      if (old.draftTimer) this.#writeDraft(old);
    }
    this.tab = doc;
    doc.input.hidden = false;
    doc.input.scrollTop = doc.top;
    doc.input.scrollLeft = doc.left;
    this.#lines = -1;   // another gutter
    this.#loadHighlighter();
    this.#connect();
    this.tree.setCurrent(doc.fileId);
    this.render();
    if (doc.conflict) this.#askConflict();
    if (!doc.loaded) this.#loadFile(doc);
    if (focus) doc.input.focus();
    this.#saveSessionSoon();
  }

  /** Reads the file of a tab (once at a time); with a draft, the draft stays as the text. */
  #loadFile(doc) {
    if (doc.loading) return doc.loading;
    doc.message = t('status.loading');
    doc.input.readOnly = true;
    if (doc === this.tab) this.render();
    doc.loading = (async () => {
      try {
        const [text] = await Promise.all([fs.read(doc.fileId), grammarsReady]);
        if (!this.tabs.includes(doc) || !doc.fileId || doc.loaded) return;   // closed, or its file went meanwhile
        Object.assign(doc, { saved: text, loaded: true, message: '', fresh: false });
        if (doc.draft) Object.assign(doc, { conflict: doc.draft.base !== hash(text), draftBase: doc.draft.base });
        else doc.input.value = text;
        doc.draft = null;
        doc.input.readOnly = false;
        this.#putBack(doc);
        this.#writeDraft(doc);   // a draft equal to the file is not needed any more
        if (doc !== this.tab) return this.#renderTabs();
        this.#connect();   // the server gets the text read
        this.render();
        if (doc.conflict) this.#askConflict();
      } catch (err) {
        if (!this.tabs.includes(doc)) return;
        if (!(err instanceof PipeStopped && err.silent)) toast(t('status.readFailed', { name: doc.name, error: err.message }), { timeout: 6000 });
        // Opened now: it goes. Brought back: it stays, and showing it again tries again
        if (doc.fresh && !doc.draft) return this.#removeTab(doc);
        doc.message = t('status.readFailed', { name: doc.name, error: err.message });
        if (doc === this.tab) this.render();
      } finally {
        doc.loading = null;
      }
    })();
    return doc.loading;
  }

  /** The caret and the scroll the tab had (a tab brought back). */
  #putBack(doc) {
    if (doc.sel) {
      const max = doc.input.value.length;
      doc.input.setSelectionRange(Math.min(doc.sel[0], max), Math.min(doc.sel[1], max));
      doc.sel = null;
    }
    if (doc === this.tab) doc.input.scrollTop = doc.top;
  }

  /** The file of the tab changed after its unsaved text was written: which one stays? */
  #askConflict() {
    const doc = this.tab;
    const keep = () => { doc.conflict = false; this.#closeBanner(); doc.input.focus(); };
    this.#openBanner('conflict', [
      icon('info'),
      h('span', { class: 'ed-banner-text' }, t('dialog.conflict.text', { name: this.#displayName(doc) })),
      actionButton({ label: t('dialog.conflict.keep'), primary: true, onClick: keep }),
      actionButton({ label: t('dialog.conflict.reload'), onClick: () => {
        doc.conflict = false;
        this.#closeBanner();
        doc.input.value = doc.saved;
        this.#writeDraft(doc);
        this.#changed();
        this.#syncLater();
        doc.input.focus();
      } }),
    ], keep, () => {});   // shown again with the tab
  }

  #tabMenu({ key, x, y }) {
    const doc = this.#find(key);
    if (!doc) return;
    const i = this.tabs.indexOf(doc);
    openMenu(x, y, [
      { label: t('tabs.menu.close'), icon: 'x', shortcut: shortcuts.label('editor.closeTab'), action: () => this.closeTab(doc) },
      { label: t('tabs.menu.closeOthers'), disabled: this.tabs.length < 2, action: () => this.#closeMany(this.tabs.filter(d => d !== doc)) },
      { label: t('tabs.menu.closeRight'), disabled: i === this.tabs.length - 1, action: () => this.#closeMany(this.tabs.slice(i + 1)) },
      { label: t('tabs.menu.closeSaved'), disabled: !this.tabs.some(d => !this.#dirtyOf(d)), action: () => this.#closeMany(this.tabs.filter(d => !this.#dirtyOf(d))) },
      '-',
      { label: t('tabs.menu.saveAs'), icon: 'save', shortcut: shortcuts.label('editor.saveAs'), disabled: !doc.loaded, action: () => { this.#activate(doc); this.saveAs(); } },
      { label: t('tabs.menu.copyPath'), icon: 'link', disabled: !doc.fileId, action: () => this.#copyPath(doc) },
      { label: t('tabs.menu.reveal'), icon: 'folder', disabled: !doc.fileId, action: () => this.reveal(doc) },
    ]);
  }

  async #copyPath(doc) {
    if (!doc.fileId || !fs.exists(doc.fileId)) return;
    try {
      await navigator.clipboard.writeText(fs.path(doc.fileId));
      toast(t('tabs.pathCopied'));
    } catch (err) {
      toast(t('tabs.copyFailed', { error: err.message }));
    }
  }

  #renderTabs() {
    const count = new Map();
    for (const doc of this.tabs) if (doc.fileId) count.set(doc.name.toLowerCase(), (count.get(doc.name.toLowerCase()) ?? 0) + 1);
    this.tabBar.render(this.tabs.map(doc => {
      const node = doc.fileId && fs.get(doc.fileId);
      const label = this.#displayName(doc);
      // Two files with the same name: the folder tells them apart
      const detail = node && count.get(doc.name.toLowerCase()) > 1 ? fs.get(node.parent)?.name ?? '' : '';
      return { key: doc.key, label, detail, title: node ? fs.path(node.id) : label, dirty: this.#dirtyOf(doc) };
    }), this.tab?.key);
  }

  // ---------- Rendering ----------

  render() {
    const doc = this.tab;
    if (!doc) return;
    const node = doc.fileId && fs.get(doc.fileId);
    this.win.setTitle(`${this.#displayName()}${this.dirty ? ' •' : ''}`, 'Editor');
    this.revealBtn.disabled = !node;
    this.langSelect.value = doc.lang;
    this.#renderSchemaButton();
    this.#status = doc.message
      || (this.dirty ? t('status.modified') : node ? t('status.saved', { path: fs.path(node.id) }) : t('status.newDocument'));
    this.state.classList.toggle('dirty', this.dirty);
    this.#paint();
    this.#renderInfo();
    this.#renderTabs();
  }

  #renderSidebarButton() {
    const label = !this.tree.root ? t('toolbar.openFolder') : this.tree.collapsed ? t('toolbar.showFolder') : t('toolbar.hideFolder');
    this.sidebarBtn.title = label;
    this.sidebarBtn.setAttribute('aria-label', label);
    this.sidebarBtn.setAttribute('aria-pressed', String(!!this.tree.root && !this.tree.collapsed));
  }

  /** Highlighted copy, line numbers, current line, diagnostics. */
  #paint() {
    if (!this.tab) return;
    const text = this.text;
    const lang = getLanguage(this.tab.lang);
    let hl = this.#hl ?? this.#simple(lang);
    if (hl.engine === 'textmate' && text.length > TEXTMATE_LIMIT) hl = this.#simple(lang);
    let tokens;
    try {
      tokens = text.length > HIGHLIGHT_LIMIT ? [[null, text]] : hl.tokenize(text);
    } catch (err) {
      this.#engineNote = err.message;
      tokens = this.#simple(lang).tokenize(text);
    }
    // One block per line, so that a wrapped line can be measured. Text nodes only: file contents never become HTML
    let row = h('div', {});
    const rows = [row];
    for (const [cls, part, color, style] of tokens) {
      part.split('\n').forEach((piece, i) => {
        if (i) rows.push(row = h('div', {}));
        if (!piece) return;
        if (cls) row.append(h('span', { class: `tk-${cls}` }, piece));
        else if (color || style) {
          const span = h('span', {}, piece);
          if (color) span.style.color = color;
          if (style & FONT_STYLE.ITALIC) span.style.fontStyle = 'italic';
          if (style & FONT_STYLE.BOLD) span.style.fontWeight = '700';
          if (style & FONT_STYLE.UNDERLINE) span.style.textDecoration = 'underline';
          row.append(span);
        } else row.append(piece);
      });
    }
    this.code.replaceChildren(...rows);

    const lines = text.split('\n').length;
    if (lines !== this.#lines) {
      this.#lines = lines;
      this.gutter.replaceChildren(...Array.from({ length: lines }, (_, i) => h('div', {}, String(i + 1))));
    }
    this.#layout();
  }

  /** Follows the wrapping of the copy: width as the textarea's, line numbers as tall as their lines, current line, squiggles. */
  #layout() {
    this.code.style.width = `${this.input.clientWidth}px`;
    // Read every height first, then write: one layout only
    const heights = Array.from(this.code.children, row => `${row.offsetHeight}px`);
    heights.forEach((px, i) => {
      const num = this.gutter.children[i];
      if (num && num.style.height !== px) num.style.height = px;
    });
    this.#renderDiagnostics();
    this.#renderFind();
    this.#caret();
    this.#syncScroll();
  }

  /**
   * Client rectangles of the characters from..to of a line, one per visual row (a wrapped line has
   * more), read from the highlighted copy.
   */
  #rowRects(line, from, to) {
    const row = this.code.children[line];
    if (!row) return [];
    const range = document.createRange();
    range.setStart(...pointIn(row, from));
    range.setEnd(...pointIn(row, to));
    const box = row.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(row).lineHeight);
    const byRow = new Map();
    for (const r of range.getClientRects()) {
      const i = Math.max(0, Math.floor((r.top + r.height / 2 - box.top) / lh));
      const prev = byRow.get(i);
      byRow.set(i, prev ? { left: Math.min(prev.left, r.left), right: Math.max(prev.right, r.right) } : { left: r.left, right: r.right });
    }
    if (!byRow.size) byRow.set(0, { left: box.left, right: box.left });   // an empty line
    return [...byRow].map(([i, r]) => ({ ...r, top: box.top + i * lh, height: lh }));
  }

  #renderInfo() {
    if (!this.tab) return;
    const lang = getLanguage(this.tab.lang);
    const engine = this.#hl?.engine ?? 'simple';
    const errors = this.#diagnostics.filter(d => (d.severity ?? 1) === 1).length;
    const warnings = this.#diagnostics.filter(d => d.severity === 2).length;
    const parts = [engineFor(lang) !== engine ? t('info.engineLoading', { engine: ENGINE_LABELS[engine], loading: ENGINE_LABELS[engineFor(lang)] }) : ENGINE_LABELS[engine]];
    if (this.#serverNote) parts.push(this.#serverNote);
    if (errors && warnings) parts.push(t('info.problems', { errors: t('info.errors', { n: errors }), warnings: t('info.warnings', { n: warnings }) }));
    else if (errors) parts.push(t('info.errors', { n: errors }));
    else if (warnings) parts.push(t('info.warnings', { n: warnings }));
    this.info.textContent = parts.join(' · ');
    this.info.title = [this.#engineNote, t('toolbar.settings')].filter(Boolean).join('\n');
    this.info.classList.toggle('has-errors', errors > 0);
  }

  #caret() {
    if (!this.tab) return;
    const text = this.text;
    const pos = this.input.selectionStart;
    const line = lineOf(text, pos);
    const col = pos - text.lastIndexOf('\n', pos - 1);
    // The diagnostic under the caret, if any, is shown next to the position
    const here = this.#diagnosticAt(text, pos);
    this.position.textContent = t('status.position', { line, col, n: this.#lines });
    this.state.textContent = here ? diagnosticText(here.severity ?? 1, here.message) : this.#status;
    this.state.title = this.state.textContent;
    this.state.classList.toggle('diag', !!here);
    this.gutter.querySelector('.on')?.classList.remove('on');
    this.gutter.children[line - 1]?.classList.add('on');
    const row = this.code.children[line - 1];
    if (row) {
      this.current.style.setProperty('--top', `${row.offsetTop}px`);
      this.current.style.setProperty('--height', `${row.offsetHeight}px`);
    }
  }

  #syncScroll() {
    if (!this.tab) return;
    const { scrollTop, scrollLeft } = this.input;
    const t = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    this.code.style.transform = t;
    this.squiggles.style.transform = t;
    this.marks.style.transform = t;
    this.current.style.setProperty('--scroll', `${scrollTop}px`);
    this.gutter.scrollTop = scrollTop;
  }

  // ---------- Languages and highlighting ----------

  #fillLanguages() {
    const value = this.langSelect.value || this.tab?.lang || 'text';
    this.langSelect.replaceChildren(...languages().map(l => h('option', { value: l.id }, l.label)));
    this.langSelect.value = value;
  }

  #simple(lang) {
    return { engine: 'simple', tokenize: text => tokenize(text, lang.simple ?? 'text') };
  }

  #setLanguage(id, chosen = false) {
    if (!this.tab) return;
    this.tab.lang = getLanguage(id).id;
    if (chosen) {
      this.tab.langChosen = true;
      this.#saveSessionSoon();
    }
    this.#hideCompletion();
    this.#loadHighlighter();
    this.#connect();
    this.render();
  }

  /** Simple highlighting right away; the chosen engine replaces it once loaded. */
  #loadHighlighter() {
    if (!this.tab) return;
    const lang = getLanguage(this.tab.lang);
    const engine = engineFor(lang);
    const key = `${lang.id}:${engine}`;
    if (key === this.#hlKey && this.#hl?.engine === engine) return;
    this.#hlKey = key;
    this.#engineNote = '';
    this.#hl = this.#simple(lang);
    if (engine === 'simple') return;
    highlighter(lang, engine)
      .then(hl => { if (this.#hlKey === key) { this.#hl = hl; this.#paint(); this.#renderInfo(); } })
      .catch(err => { if (this.#hlKey === key) { this.#engineNote = t('info.engineUnavailable', { engine: ENGINE_LABELS[engine], error: err.message }); this.#renderInfo(); } });
  }

  // ---------- Language server ----------

  async #connect() {
    this.#disconnect();
    const doc = this.tab;
    if (!doc) return;
    const lang = getLanguage(doc.lang);
    const pending = clientFor(lang);
    if (!pending) { this.#serverNote = ''; return this.#renderInfo(); }
    const token = this.#connectToken = {};
    this.#serverNote = t('server.starting');
    this.#renderInfo();
    const client = await pending;
    if (this.#connectToken !== token || this.tab !== doc) return;
    if (!client.ready) {
      this.#serverNote = t('server.unavailable', { error: client.error ?? t('server.unknownError') });
      return this.#renderInfo();
    }
    const uri = doc.fileId && fs.exists(doc.fileId) ? fileUri(doc.fileId) : `untitled:${doc.untitled}`;
    this.#client = client;
    this.#doc = { uri, version: 1, off: [
      client.on('diagnostics', p => {
        if (p.uri !== this.#doc?.uri) return;
        this.#diagnostics = Array.isArray(p.diagnostics) ? p.diagnostics : [];
        this.#renderDiagnostics();
        this.#caret();
        this.#renderInfo();
      }),
      client.on('status', () => {
        if (client.ready || this.#client !== client) return;
        this.#client = null;
        this.#diagnostics = [];
        this.#serverNote = t('server.unavailable', { error: client.error ?? t('server.closedShort') });
        this.#renderDiagnostics();
        this.#renderInfo();
      }),
    ] };
    client.open(uri, LSP_IDS[lang.id] ?? lang.id, 1, this.text);
    this.#serverNote = client.name;
    this.#renderInfo();
  }

  #disconnect() {
    this.#connectToken = null;
    clearTimeout(this.#syncTimer);
    if (this.#client?.ready && this.#doc) this.#client.close(this.#doc.uri);
    this.#doc?.off.forEach(o => o());
    this.#client = null;
    this.#doc = null;
    this.#diagnostics = [];
  }

  #syncLater() {
    if (!this.#client) return;
    clearTimeout(this.#syncTimer);
    this.#syncTimer = setTimeout(() => this.#syncNow(), 150);
  }

  #syncNow() {
    clearTimeout(this.#syncTimer);
    if (this.#client?.ready && this.#doc) this.#client.change(this.#doc.uri, ++this.#doc.version, this.text);
  }

  /** Squiggles under the ranges and markers in the gutter. */
  #renderDiagnostics() {
    for (const el of this.gutter.querySelectorAll('.err, .warn')) { el.classList.remove('err', 'warn'); el.removeAttribute('title'); }
    if (!this.#diagnostics.length) return this.squiggles.replaceChildren();
    const lines = this.text.split('\n');
    const origin = this.code.getBoundingClientRect();
    const marks = [];
    const byLine = new Map();
    for (const d of this.#diagnostics.slice(0, 300)) {
      const sev = (d.severity ?? 1) === 1 ? 'err' : 'warn';
      const start = d.range?.start ?? { line: 0, character: 0 };
      const end = d.range?.end ?? start;
      for (let l = start.line; l <= Math.min(end.line, lines.length - 1); l++) {
        const line = lines[l] ?? '';
        const from = Math.min(line.length, l === start.line ? start.character : 0);
        let to = Math.min(line.length, l === end.line ? end.character : line.length);
        if (to <= from) to = Math.min(line.length, from + 1);   // an empty range still marks one character
        for (const r of this.#rowRects(l, from, to)) {
          marks.push(h('div', {
            class: `ed-sq ${sev}`,
            style: { left: `${r.left - origin.left}px`, top: `${r.top - origin.top + r.height - 4}px`, width: `${Math.max(6, r.right - r.left)}px` },
          }));
        }
      }
      const entry = byLine.get(start.line) ?? { sev: 'warn', messages: [] };
      if (sev === 'err') entry.sev = 'err';
      entry.messages.push(d.message);
      byLine.set(start.line, entry);
    }
    this.squiggles.replaceChildren(...marks);
    for (const [l, { sev, messages }] of byLine) {
      const el = this.gutter.children[l];
      if (!el) continue;
      el.classList.add(sev);
      el.title = messages.join('\n');
    }
  }

  #diagnosticAt(text, pos) {
    if (!this.#diagnostics.length) return null;
    return this.#diagnostics.find(d => {
      if (!d.range) return false;
      const a = offsetAt(text, d.range.start), b = offsetAt(text, d.range.end);
      return pos >= a && pos <= Math.max(b, a + 1);
    }) ?? null;
  }

  // ---------- JSON schema ----------

  #renderSchemaButton() {
    const isJson = getLanguage(this.tab.lang).id === 'json';
    this.schemaBtn.hidden = !isJson;
    if (!isJson) return;
    const source = this.fileId ? editorConfig.get('schemas')[this.fileId] : null;
    let label = t('schema.none');
    if (source?.type === 'file') label = fs.get(source.id)?.name ?? t('schema.fileDeleted');
    else if (source?.type === 'url') { try { label = new URL(source.url).host; } catch { label = source.url; } }
    this.schemaBtn.replaceChildren(icon('file'), h('span', {}, t('schema.button', { name: label })));
    this.schemaBtn.disabled = !this.fileId;
    this.schemaBtn.title = this.fileId ? (source?.type === 'url' ? source.url : t('schema.tooltip')) : t('schema.saveFirst');
  }

  #schemaMenu() {
    if (!this.fileId) return;
    const fileId = this.fileId;
    const r = this.schemaBtn.getBoundingClientRect();
    const source = editorConfig.get('schemas')[fileId];
    openMenu(r.left, r.bottom + 2, [
      { label: t('schema.menu.none'), icon: source ? 'x' : 'check', action: () => editorConfig.setEntry('schemas', fileId, undefined) },
      { label: t('schema.menu.file'), icon: 'file', action: async () => {
        const node = await pickFile(this.openWindow, { title: t('schema.picker.title'), exts: ['json'], text: t('schema.picker.text', { name: this.name }) });
        if (node && node.id !== fileId) editorConfig.setEntry('schemas', fileId, { type: 'file', id: node.id });
      } },
      { label: t('schema.menu.url'), icon: 'globe', action: () => this.#askSchemaUrl(fileId, source?.type === 'url' ? source.url : '') },
      '-',
      { label: t('schema.menu.inFile'), icon: 'info', disabled: true },
    ]);
  }

  #askSchemaUrl(fileId, value) {
    const input = h('input', { class: 'ctl-text ed-banner-input', type: 'url', placeholder: 'https://json.schemastore.org/package.json', spellcheck: 'false', 'aria-label': t('schema.url.label') });
    input.value = value;
    const note = h('span', { class: 'ed-banner-text' }, t('schema.url.prompt'));
    const apply = () => {
      const url = input.value.trim();
      if (!isSchemaUrl(url)) { note.textContent = t('schema.url.invalid'); input.focus(); return; }
      editorConfig.setEntry('schemas', fileId, { type: 'url', url });
      this.#closeBanner();
      this.input.focus();
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
    this.#openBanner('schema', [
      icon('globe'), note, input,
      actionButton({ label: t('schema.url.use'), primary: true, onClick: apply }),
      actionButton({ label: t('dialog.cancel'), onClick: () => { this.#closeBanner(); this.input.focus(); } }),
    ], () => { this.#closeBanner(); this.input.focus(); });
    input.focus();
    input.select();
  }

  /**
   * The bar above the text: `cancel` runs on Esc, `leave` when another tab is shown or another bar
   * opens (by default the same).
   */
  #openBanner(kind, children, cancel, leave = cancel) {
    this.#cancelBanner();
    this.#banner = { kind, leave };
    this.banner.replaceChildren(...children);
    this.banner.hidden = false;
    this.banner.querySelector('button')?.focus();
    this.banner.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); cancel(); } };
  }

  #closeBanner() {
    this.#banner = null;
    this.banner.hidden = true;
    this.banner.replaceChildren();
  }

  #cancelBanner() {
    const open = this.#banner;
    if (!open) return;
    this.#closeBanner();
    open.leave();
  }

  // ---------- Completion ----------

  /**
   * Opens (or refreshes) the suggestion list for the word at the caret: from the language server
   * when there is one, from the built-in vocabularies otherwise (or when the server has nothing).
   */
  async #suggest(manual = false, trigger = null) {
    const ta = this.input;
    if (ta.selectionStart !== ta.selectionEnd || (!manual && this.text.length > HIGHLIGHT_LIMIT)) return this.#hideCompletion();
    const seq = ++this.#suggestSeq;
    let result = null;
    const client = this.#client;
    if (client?.ready && client.capabilities.completionProvider && this.#doc) {
      this.#syncNow();
      try {
        const items = await withTimeout(client.completion(this.#doc.uri, positionAt(this.text, ta.selectionStart), trigger), 1500);
        if (seq !== this.#suggestSeq) return;
        result = fromServer(items, this.text, ta.selectionStart);
      } catch {
        if (seq !== this.#suggestSeq) return;
      }
    }
    result ??= complete(this.text, ta.selectionStart, getLanguage(this.tab.lang).simple ?? 'text', { manual });
    if (!result || ta.selectionStart !== ta.selectionEnd) return this.#hideCompletion();
    this.#completion = { ...result, index: 0, manual };
    const prefix = this.text.slice(result.from, ta.selectionStart);
    this.suggestions.replaceChildren(...result.items.map((it, i) => {
      const n = it.label.toLowerCase().startsWith(prefix.toLowerCase()) ? prefix.length : 0;
      return h('div', { class: 'ed-ci', role: 'option', id: `${this.suggestions.id}-${i}`, dataset: { index: i } },
        h('span', { class: `ed-ci-kind k-${it.kind}` }, KIND_BADGES[it.kind] ?? it.kind),
        h('span', { class: 'ed-ci-label' }, n ? h('b', {}, it.label.slice(0, n)) : null, it.label.slice(n)),
        h('span', { class: 'ed-ci-detail' }, it.detail));
    }));
    this.suggestions.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
    this.#selectCompletion(0);
    this.#placeCompletion(result.from);
  }

  #hideCompletion() {
    this.#suggestSeq++;
    if (!this.#completion) return;
    this.#completion = null;
    this.suggestions.hidden = true;
    this.suggestions.replaceChildren();
    this.input?.setAttribute('aria-expanded', 'false');
    this.input?.removeAttribute('aria-activedescendant');
  }

  #selectCompletion(index) {
    const c = this.#completion;
    if (!c) return;
    c.index = (index + c.items.length) % c.items.length;
    [...this.suggestions.children].forEach((el, i) => {
      el.classList.toggle('on', i === c.index);
      el.setAttribute('aria-selected', String(i === c.index));
    });
    const active = this.suggestions.children[c.index];
    active?.scrollIntoView({ block: 'nearest' });
    this.input.setAttribute('aria-activedescendant', active?.id ?? '');
  }

  /**
   * Replaces the word being typed (or the server's range) with the suggestion and puts the caret
   * where the item says: `caret` (server items) or a '|' in the text (built-in items).
   */
  #acceptCompletion(index = this.#completion?.index) {
    const c = this.#completion;
    const it = c?.items[index];
    if (!it) return;
    this.#hideCompletion();
    const from = it.from ?? c.from;
    const to = Math.max(it.to ?? 0, this.input.selectionStart);
    let text = it.insert, mark = it.caret;
    if (mark === undefined) { mark = text.indexOf('|'); text = text.replace('|', ''); }
    this.input.setSelectionRange(from, to);
    this.#accepting = true;
    this.#insert(text);
    this.#accepting = false;
    if (mark !== -1) this.input.setSelectionRange(from + mark, from + mark);
    this.#caret();
    // A CSS property is followed by its values right away
    if (getLanguage(this.tab.lang).simple === 'css' && it.kind === 'pr') this.#suggest(false, ':');
  }

  /** Puts the list under the word being completed (above it if there is no room below). */
  #placeCompletion(from) {
    // The copy must show the text just typed (its repaint waits for the next frame)
    if (this.#raf) { cancelAnimationFrame(this.#raf); this.#raf = 0; this.render(); }
    const text = this.text;
    const lineStart = text.lastIndexOf('\n', from - 1) + 1;
    const [at] = this.#rowRects(lineOf(text, from) - 1, from - lineStart, from - lineStart);
    if (!at) return;
    const box = this.suggestions;
    const area = this.input.getBoundingClientRect();
    const x = at.left - area.left, y = at.top - area.top, lh = at.height;
    const w = box.offsetWidth, hgt = box.offsetHeight;
    const below = y + lh + 2;
    const top = below + hgt > area.height && y - hgt - 2 >= 0 ? y - hgt - 2 : below;
    box.style.left = Math.max(4, Math.min(x - 30, area.width - w - 4)) + 'px';
    box.style.top = top + 'px';
  }

  #onInput(e) {
    this.tab.discarded = false;
    // Typing is not recorded: the recorder shows it, struck out, once per burst (a replace is not typing)
    if (!this.#editing) automation()?.missed('editor', t('automation.typing'));
    this.#changed();
    this.#syncLater();
    if (this.#accepting || this.#editing) return;
    const data = typeof e.data === 'string' ? e.data : '';
    const typed = e.inputType === 'insertText' && data.length === 1;
    const triggers = this.#client?.ready ? this.#client.triggerCharacters : [];
    const lang = getLanguage(this.tab.lang).simple;
    // Word characters and the server's trigger characters ask; a space inside an HTML tag asks for attributes
    if (typed && (triggers.includes(data) || !/\s/.test(data) || (lang === 'html' && data === ' '))) {
      this.#suggest(this.#completion?.manual ?? false, triggers.includes(data) ? data : null);
    } else if (e.inputType === 'deleteContentBackward' && this.#completion) this.#suggest(this.#completion.manual);
    else this.#hideCompletion();
  }

  // ---------- Internals ----------

  #displayName(doc = this.tab) {
    if (!doc.isNew || doc.fileId) return doc.name;
    return doc.number > 1 ? t('document.untitledNumber', { n: doc.number }) : t('document.untitled');
  }

  #changed() {
    this.tab.message = '';
    this.#draftSoon(this.tab);
    cancelAnimationFrame(this.#raf);
    this.#raf = requestAnimationFrame(() => { this.#raf = 0; this.render(); });
  }

  /** Inserts text keeping the native undo history (execCommand), with a fallback. */
  #insert(text) {
    if (!document.execCommand?.('insertText', false, text)) {
      this.input.setRangeText(text, this.input.selectionStart, this.input.selectionEnd, 'end');
      this.#changed();
      this.#syncLater();
    }
  }

  #onKey(e) {
    const ta = this.input;
    // While the suggestion list is open it owns arrows, Enter, Tab and Esc
    if (this.#completion && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const c = this.#completion;
      const page = Math.max(1, Math.floor(this.suggestions.clientHeight / 24));
      const step = { ArrowDown: 1, ArrowUp: -1, PageDown: page, PageUp: -page }[e.key];
      if (step) {
        e.preventDefault();
        return this.#selectCompletion(Math.abs(step) > 1 ? Math.max(0, Math.min(c.items.length - 1, c.index + step)) : c.index + step);
      }
      if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey) { e.preventDefault(); return this.#acceptCompletion(); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return this.#hideCompletion(); }
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) this.#hideCompletion();
    }
    if (ta.readOnly) return;
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (!e.shiftKey) return this.#insert(INDENT);
      // Shift+Tab: remove one indent from the start of the line
      const start = ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1;
      const n = ta.value.slice(start, start + INDENT.length).match(/^ */)[0].length;
      if (n) {
        const caret = ta.selectionStart;
        ta.setSelectionRange(start, start + n);
        this.#insert('');
        ta.setSelectionRange(Math.max(start, caret - n), Math.max(start, caret - n));
      }
    } else if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // Keep the indentation of the current line
      e.preventDefault();
      const start = ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1;
      const indent = ta.value.slice(start).match(/^[ \t]*/)[0].slice(0, ta.selectionStart - start);
      this.#insert('\n' + indent);
    } else if (e.key === 'Escape') {
      // Closes the find bar; otherwise leaves the text with the keyboard (Tab then moves the focus on)
      if (this.findBar.isOpen) { e.preventDefault(); this.closeFind(); }
      else ta.blur();
    }
  }

  #onFsChange(e) {
    for (const doc of [...this.tabs]) this.#fsChangeOf(doc, e);
    this.#renderTabs();
  }

  /** A change of the file system, for one tab (the one shown also updates what is on screen). */
  #fsChangeOf(doc, e) {
    const shown = doc === this.tab;
    if (e.type === 'create' && doc.lost?.id === e.node.id && !doc.fileId) {
      // Put back (from the trash, or undo): the tab is the file's again
      Object.assign(doc, { fileId: e.node.id, saved: doc.lost.saved, lost: null, name: e.node.name, message: t('status.restored') });
      doc.secret ||= isSecret(doc.fileId);
      this.#draftSoon(doc);
      this.#saveSessionSoon();
      if (!shown) return;
      this.tree.setCurrent(doc.fileId);
      this.#connect();
      this.render();
      return;
    }
    if (!doc.fileId) return;
    if (e.type === 'remove' && e.ids.includes(doc.fileId)) {
      // Not read yet and nothing changed: there is nothing to keep
      if (!doc.loaded && !doc.draft) return this.#removeTab(doc);
      if (!doc.loaded) {
        Object.assign(doc, { loaded: true, draft: null });
        doc.input.readOnly = false;
      }
      doc.lost = { id: doc.fileId, saved: doc.saved };
      doc.fileId = null;
      doc.saved = '';   // nothing on disk any more: everything counts as unsaved
      doc.message = e.trashed ? t('status.trashed') : t('status.deleted');
      this.#draftSoon(doc);
      this.#saveSessionSoon();
      if (!shown) return;
      this.tree.setCurrent(null);
      this.#connect();
      this.render();
    } else if (e.type === 'move' && e.ids.includes(doc.fileId)) {
      // Moved (itself or a folder above it): new path and URI, maybe a new name
      doc.name = fs.get(doc.fileId).name;
      this.#saveSessionSoon();
      if (shown) { this.#connect(); this.render(); }
    } else if (e.type === 'rename' && e.node.id === doc.fileId) {
      doc.name = e.node.name;
      this.#saveSessionSoon();
      const lang = languageForName(doc.name);
      if (!shown) { if (!doc.langChosen) doc.lang = lang; return; }
      if (!doc.langChosen && lang !== doc.lang) this.#setLanguage(lang);
      else { this.#connect(); this.render(); }   // the file URI changed
    } else if (e.type === 'rename' && e.node.type === 'folder' && fs.isInside(doc.fileId, e.node.id)) {
      if (shown) { this.#connect(); this.render(); }   // a folder above it: the path and the URI changed
    } else if (e.type === 'update' && e.node.id === doc.fileId && !doc.secret && isSecret(doc.fileId)) {
      // Its content became an app's (encrypted): its text is not kept outside the file any more
      doc.secret = true;
      removeDraft(doc.key);
    }
  }
}
