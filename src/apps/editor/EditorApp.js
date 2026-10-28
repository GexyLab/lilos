import { Window, h, icon, fs, uid, settings, selectField, actionButton, openMenu, history } from '@lilos/sdk';
import { launch } from '../registry.js';
import { handleCommand } from '../commands.js';
import { pickFile } from '../filePicker.js';
import { tokenize } from './highlight.js';
import { complete } from './complete.js';
import { languages, getLanguage, languageForName, engineFor, ENGINE_LABELS, loadCustomGrammars, languageEvents } from './lang/languages.js';
import { highlighter, FONT_STYLE } from './lang/engines.js';
import { editorConfig, isSchemaUrl } from './lang/config.js';
import { clientFor, fileUri, servers } from './lsp/manager.js';
import { positionAt, offsetAt, fromServer } from './lsp/convert.js';
import { openEditorSettings } from './EditorSettings.js';
import { FileTree } from './FileTree.js';
import './editor.css';

const INDENT = '  ';
const HIGHLIGHT_LIMIT = 300_000;   // characters: above this the text is shown plain, to stay responsive
const TEXTMATE_LIMIT = 100_000;    // TextMate re-tokenizes everything: above this the simple engine is used
const UNTITLED = 'Senza titolo.txt';
/** Short badges for the kinds of suggestion (complete.js, lsp/convert.js). */
const KIND_BADGES = { kw: 'kw', fn: 'ƒ', pr: 'pr', val: 'val', tag: '<>', attr: '=', abc: 'abc', ty: 'T', snip: '{}' };
/** languageId sent to language servers when it differs from ours. */
const LSP_IDS = { shell: 'shellscript' };
const SEVERITY = { 1: 'errore', 2: 'avviso', 3: 'informazione', 4: 'suggerimento' };

// TextMate grammars added by the user, read once (the settings reload them)
const grammarsReady = loadCustomGrammars();

/**
 * Text editor: one document per window, line numbers, syntax highlighting (Tree-sitter, TextMate or
 * simple), completion and diagnostics from language servers (LSP) or the built-in vocabularies,
 * JSON schemas. args.file opens a file, args.folder opens a folder in the panel on the right
 * (FileTree.js), where its content is managed; the last folder opened comes back in new windows.
 */
export default function createEditor({ args, openWindow } = {}) {
  const win = new Window({ title: 'Senza titolo', subtitle: 'Editor', icon: 'code', width: 780, height: 520, minWidth: 460, minHeight: 280 });
  const editor = new TextEditor(win, openWindow);
  // args.folder: null means "no folder" (a window restored as it was), missing means the last one
  const folder = args && 'folder' in args ? args.folder : FileTree.savedRoot();
  editor.tree.setRoot(folder && fs.get(folder)?.type === 'folder' ? folder : null);
  if (args?.file && fs.exists(args.file)) editor.open(args.file);
  else editor.newDocument();
  // Launched again (e.g. another file opened from File): open it here, asking first if there are changes
  win.on('launch', a => {
    if (a?.folder && fs.get(a.folder)?.type === 'folder') editor.tree.setRoot(a.folder);
    if (a?.file && fs.exists(a.file)) editor.open(a.file);
  });
  win.canClose = () => editor.confirmDiscard();
  // Saved by workareas: the open file and folder (unsaved text is asked about before closing)
  win.getState = () => ({ file: editor.fileId, folder: editor.tree.root, ...(editor.tree.collapsed && { sidebar: false }) });
  if (args?.sidebar === false && editor.tree.root) editor.tree.setCollapsed(true);
  return win;
}

const lineOf = (text, pos) => {
  let line = 1;
  for (let i = text.indexOf('\n'); i !== -1 && i < pos; i = text.indexOf('\n', i + 1)) line++;
  return line;
};

/** Visual column (tabs every 4) of a character offset inside its line. */
const visualColumn = (line, chars) => {
  let col = 0;
  for (const ch of line.slice(0, chars)) col = ch === '\t' ? col + 4 - (col % 4) : col + 1;
  return col;
};

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

class TextEditor {
  fileId = null;
  name = UNTITLED;
  #saved = '';            // text as last saved (or loaded)
  #lost = null;           // { id, saved } of the file while it is removed: it comes back if restored
  #lang = 'text';
  #langChosen = false;    // the user picked a language: keep it on rename
  #lines = 0;
  #raf = 0;
  #message = '';
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
  #untitled = uid();
  #completion = null;     // { from, items, index, manual } while the suggestion list is open
  #suggestSeq = 0;
  #accepting = false;     // inserting a suggestion: its own input event must not reopen the list
  #measure = null;        // canvas context to measure the monospace character width

  constructor(win, openWindow) {
    this.win = win;
    this.openWindow = openWindow ?? (() => {});
    const { signal } = win;

    const tool = (glyph, label, onclick) => h('button', { class: 'ed-btn', type: 'button', title: label, 'aria-label': label, onclick }, icon(glyph));
    this.revealBtn = tool('folder', 'Mostra nella cartella', () => this.reveal());
    this.schemaBtn = h('button', { class: 'ed-schema', type: 'button', onclick: () => this.#schemaMenu() });
    this.langSelect = selectField({ value: 'text', label: 'Linguaggio', options: [], onChange: v => this.#setLanguage(v, true) });
    this.langSelect.classList.add('ed-lang');
    this.#fillLanguages();
    this.banner = h('div', { class: 'ed-banner', role: 'alertdialog', hidden: true });

    this.gutter = h('div', { class: 'ed-gutter', 'aria-hidden': 'true' });
    this.current = h('div', { class: 'ed-current', 'aria-hidden': 'true' });
    this.code = h('pre', { class: 'ed-hl', 'aria-hidden': 'true' });
    this.squiggles = h('div', { class: 'ed-diags', 'aria-hidden': 'true' });
    this.input = h('textarea', {
      class: 'ed-input', wrap: 'off', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': 'Testo del documento',
      'aria-autocomplete': 'list', 'aria-expanded': 'false',
    });
    this.suggestions = h('div', { class: 'ed-complete', role: 'listbox', id: `ed-complete-${uid()}`, 'aria-label': 'Suggerimenti', hidden: true });
    this.input.setAttribute('aria-controls', this.suggestions.id);
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
    this.info = h('button', { class: 'ed-info', type: 'button', title: 'Impostazioni dell’Editor', onclick: () => openEditorSettings(this.openWindow) });
    this.state = h('span', { class: 'ed-state' });

    this.tree = new FileTree({ win, openWindow: this.openWindow });
    this.tree.on('open', id => this.open(id));
    this.tree.on('root', () => this.#renderSidebarButton());
    this.tree.on('layout', () => this.#renderSidebarButton());
    this.sidebarBtn = tool('sidebar', 'Mostra la cartella', () => this.toggleSidebar());

    win.body.append(
      h('div', { class: 'ed-toolbar' },
        tool('filePlus', 'Nuovo documento', () => this.newDocument()),
        tool('open', 'Apri un file…', () => this.openFile()),
        tool('folderOpen', 'Apri una cartella…', () => this.openFolder()),
        tool('save', 'Salva', () => this.save()),
        this.revealBtn,
        h('span', { class: 'ed-grow' }),
        this.schemaBtn,
        this.langSelect,
        tool('gear', 'Impostazioni dell’Editor', () => openEditorSettings(this.openWindow)),
        this.sidebarBtn),
      this.banner,
      h('div', { class: 'ed-main' },
        h('div', { class: 'ed' }, this.gutter, h('div', { class: 'ed-area' }, this.current, this.code, this.squiggles, this.input, this.suggestions)),
        this.tree.el),
      h('div', { class: 'ed-status' }, this.position, this.info, this.state));

    this.input.addEventListener('input', e => this.#onInput(e), { signal });
    this.input.addEventListener('keydown', e => this.#onKey(e), { signal });
    this.input.addEventListener('scroll', () => { this.#syncScroll(); this.#hideCompletion(); }, { signal });
    this.input.addEventListener('blur', () => this.#hideCompletion(), { signal });
    this.input.addEventListener('pointerdown', () => this.#hideCompletion(), { signal });
    for (const type of ['keyup', 'pointerup', 'select', 'focus']) this.input.addEventListener(type, () => this.#caret(), { signal });
    // Leaving with unsaved changes (reload, closing the tab): let the browser ask
    addEventListener('beforeunload', e => { if (this.dirty) e.preventDefault(); }, { signal });

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
        if (!this.#langChosen) this.#setLanguage(languageForName(this.name));
        else this.#loadHighlighter();
      }),
      handleCommand('editor.save', { isActive: () => win.active, run: () => this.save() }),
      handleCommand('editor.new', { isActive: () => win.active, run: () => this.newDocument() }),
      handleCommand('editor.openFile', { isActive: () => win.active, run: () => this.openFile() }),
      handleCommand('editor.openFolder', { isActive: () => win.active, run: () => this.openFolder() }),
      handleCommand('editor.sidebar', { isActive: () => win.active, run: () => this.toggleSidebar() }),
      handleCommand('editor.complete', { isActive: () => win.active && document.activeElement === this.input, run: () => this.#suggest(true) }),
      // Ctrl Z / Ctrl Y in the text: the textarea's own history (typing, completions, indents)
      history.attach(this.input, {
        text: true,
        undo: () => this.#nativeHistory('undo'),
        redo: () => this.#nativeHistory('redo'),
      }),
    ];
    win.on('destroy', () => { off.forEach(o => o()); this.#disconnect(); cancelAnimationFrame(this.#raf); });
    // The panel keeps within 60% of the window
    const fit = new ResizeObserver(() => { if (!this.tree.el.hidden) this.tree.resize(this.tree.width, false); });
    fit.observe(win.body);
    win.on('destroy', () => fit.disconnect());
  }

  /** Undo / redo of the text, through the browser (execCommand keeps one history with typing). */
  #nativeHistory(what) {
    this.#hideCompletion();
    this.input.focus();
    return document.execCommand(what) ? '' : null;
  }

  get dirty() { return this.input.value !== this.#saved; }
  get text() { return this.input.value; }

  // ---------- Documents ----------

  async open(id) {
    if (id === this.fileId) return;
    const node = fs.get(id);
    if (!node || node.type !== 'file') return;
    if (!(await this.confirmDiscard(`prima di aprire «${node.name}»`))) return;
    const [text] = await Promise.all([fs.read(id), grammarsReady]);
    this.#load(id, node.name, text);
  }

  async newDocument() {
    if (!(await this.confirmDiscard())) return;
    this.#untitled = uid();
    this.#load(null, UNTITLED, '');
  }

  /** Chooses a file of lilOS and opens it. */
  async openFile() {
    const node = await pickFile(this.openWindow, { title: 'Apri un file' });
    if (node) this.open(node.id);
  }

  /** Chooses a folder: it opens in the panel on the right, as the root of what is managed there. */
  async openFolder() {
    const node = await pickFile(this.openWindow, {
      kind: 'folder', title: 'Apri una cartella', text: 'La cartella compare a destra: lì puoi creare, rinominare, spostare ed eliminare file e cartelle.',
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

  /** Saves to the open file; a new document is created in /Documenti (or in the open folder). */
  async save() {
    const wasUntitled = !this.fileId || !fs.exists(this.fileId);
    if (wasUntitled) {
      const docs = (this.tree.root && fs.get(this.tree.root)) ?? fs.resolve('/Documenti') ?? fs.get(fs.root);
      const node = fs.create(docs.id, { type: 'file', name: this.name });
      this.fileId = node.id;
      this.name = node.name;
      this.#message = `Salvato in ${fs.path(node.id)}`;
    } else {
      this.#message = '';
    }
    const text = this.text;
    await fs.write(this.fileId, text);
    this.#saved = text;
    if (wasUntitled) this.#connect();   // the document has a file URI now
    this.tree.setCurrent(this.fileId);
    this.render();
    return true;
  }

  /** Opens File on the folder of the document. */
  reveal() {
    const node = this.fileId && fs.get(this.fileId);
    if (node) launch('files', { folder: node.parent });
  }

  /**
   * With unsaved changes, asks in a bar above the text: Salva / Non salvare / Annulla.
   * Resolves true when it is fine to go on.
   */
  confirmDiscard(context = '') {
    if (!this.dirty) return Promise.resolve(true);
    return new Promise(resolve => {
      const done = async choice => {
        this.#closeBanner();
        if (choice === 'save') resolve(await this.save());
        else resolve(choice === 'discard');
        if (choice === 'cancel') this.input.focus();
      };
      this.#openBanner([
        icon('help'),
        h('span', { class: 'ed-banner-text' }, `Le modifiche a «${this.#displayName()}» non sono salvate${context ? ` (${context})` : ''}.`),
        actionButton({ label: 'Salva', primary: true, onClick: () => done('save') }),
        actionButton({ label: 'Non salvare', danger: true, onClick: () => done('discard') }),
        actionButton({ label: 'Annulla', onClick: () => done('cancel') }),
      ], () => done('cancel'));
    });
  }

  // ---------- Rendering ----------

  render() {
    const node = this.fileId && fs.get(this.fileId);
    this.win.setTitle(`${this.#displayName()}${this.dirty ? ' •' : ''}`, 'Editor');
    this.revealBtn.disabled = !node;
    this.langSelect.value = this.#lang;
    this.#renderSchemaButton();
    this.#status = this.#message
      || (this.dirty ? 'Modificato' : node ? `Salvato · ${fs.path(node.id)}` : 'Nuovo documento');
    this.state.classList.toggle('dirty', this.dirty);
    this.#paint();
    this.#renderInfo();
  }

  #renderSidebarButton() {
    const label = !this.tree.root ? 'Apri una cartella…' : this.tree.collapsed ? 'Mostra la cartella' : 'Nascondi la cartella';
    this.sidebarBtn.title = label;
    this.sidebarBtn.setAttribute('aria-label', label);
    this.sidebarBtn.setAttribute('aria-pressed', String(!!this.tree.root && !this.tree.collapsed));
  }

  /** Highlighted copy, line numbers, current line, diagnostics. */
  #paint() {
    const text = this.text;
    const lang = getLanguage(this.#lang);
    let hl = this.#hl ?? this.#simple(lang);
    if (hl.engine === 'textmate' && text.length > TEXTMATE_LIMIT) hl = this.#simple(lang);
    let tokens;
    try {
      tokens = text.length > HIGHLIGHT_LIMIT ? [[null, text]] : hl.tokenize(text);
    } catch (err) {
      this.#engineNote = err.message;
      tokens = this.#simple(lang).tokenize(text);
    }
    // Text nodes only: file contents never become HTML
    const frag = document.createDocumentFragment();
    for (const [cls, part, color, style] of tokens) {
      if (cls) frag.append(h('span', { class: `tk-${cls}` }, part));
      else if (color || style) {
        const span = h('span', {}, part);
        if (color) span.style.color = color;
        if (style & FONT_STYLE.ITALIC) span.style.fontStyle = 'italic';
        if (style & FONT_STYLE.BOLD) span.style.fontWeight = '700';
        if (style & FONT_STYLE.UNDERLINE) span.style.textDecoration = 'underline';
        frag.append(span);
      } else frag.append(part);
    }
    frag.append('\n ');   // a trailing newline needs a line to exist below it
    this.code.replaceChildren(frag);

    const lines = text.split('\n').length;
    if (lines !== this.#lines) {
      this.#lines = lines;
      this.gutter.replaceChildren(...Array.from({ length: lines }, (_, i) => h('div', {}, String(i + 1))));
    }
    this.#renderDiagnostics();
    this.#caret();
    this.#syncScroll();
  }

  #renderInfo() {
    const lang = getLanguage(this.#lang);
    const engine = this.#hl?.engine ?? 'simple';
    const errors = this.#diagnostics.filter(d => (d.severity ?? 1) === 1).length;
    const warnings = this.#diagnostics.filter(d => d.severity === 2).length;
    const parts = [ENGINE_LABELS[engine] + (engineFor(lang) !== engine ? ` (${ENGINE_LABELS[engineFor(lang)]} in caricamento)` : '')];
    if (this.#serverNote) parts.push(this.#serverNote);
    if (errors || warnings) parts.push([errors && `${errors} ${errors === 1 ? 'errore' : 'errori'}`, warnings && `${warnings} ${warnings === 1 ? 'avviso' : 'avvisi'}`].filter(Boolean).join(', '));
    this.info.textContent = parts.join(' · ');
    this.info.title = [this.#engineNote, 'Impostazioni dell’Editor'].filter(Boolean).join('\n');
    this.info.classList.toggle('has-errors', errors > 0);
  }

  #caret() {
    const text = this.text;
    const pos = this.input.selectionStart;
    const line = lineOf(text, pos);
    const col = pos - text.lastIndexOf('\n', pos - 1);
    // The diagnostic under the caret, if any, is shown next to the position
    const here = this.#diagnosticAt(text, pos);
    this.position.textContent = `Riga ${line}, colonna ${col} · ${this.#lines} ${this.#lines === 1 ? 'riga' : 'righe'}`;
    this.state.textContent = here ? `${SEVERITY[here.severity ?? 1]}: ${here.message}` : this.#status;
    this.state.title = this.state.textContent;
    this.state.classList.toggle('diag', !!here);
    this.gutter.querySelector('.on')?.classList.remove('on');
    this.gutter.children[line - 1]?.classList.add('on');
    this.current.style.setProperty('--line', line - 1);
  }

  #syncScroll() {
    const { scrollTop, scrollLeft } = this.input;
    const t = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    this.code.style.transform = t;
    this.squiggles.style.transform = t;
    this.current.style.setProperty('--scroll', `${scrollTop}px`);
    this.gutter.scrollTop = scrollTop;
  }

  // ---------- Languages and highlighting ----------

  #fillLanguages() {
    const value = this.langSelect.value || this.#lang;
    this.langSelect.replaceChildren(...languages().map(l => h('option', { value: l.id }, l.label)));
    this.langSelect.value = value;
  }

  #simple(lang) {
    return { engine: 'simple', tokenize: text => tokenize(text, lang.simple ?? 'text') };
  }

  #setLanguage(id, chosen = false) {
    this.#lang = getLanguage(id).id;
    if (chosen) this.#langChosen = true;
    this.#hideCompletion();
    this.#loadHighlighter();
    this.#connect();
    this.render();
  }

  /** Simple highlighting right away; the chosen engine replaces it once loaded. */
  #loadHighlighter() {
    const lang = getLanguage(this.#lang);
    const engine = engineFor(lang);
    const key = `${lang.id}:${engine}`;
    if (key === this.#hlKey && this.#hl?.engine === engine) return;
    this.#hlKey = key;
    this.#engineNote = '';
    this.#hl = this.#simple(lang);
    if (engine === 'simple') return;
    highlighter(lang, engine)
      .then(hl => { if (this.#hlKey === key) { this.#hl = hl; this.#paint(); this.#renderInfo(); } })
      .catch(err => { if (this.#hlKey === key) { this.#engineNote = `${ENGINE_LABELS[engine]} non disponibile: ${err.message}`; this.#renderInfo(); } });
  }

  // ---------- Language server ----------

  async #connect() {
    this.#disconnect();
    const lang = getLanguage(this.#lang);
    const pending = clientFor(lang);
    if (!pending) { this.#serverNote = ''; return this.#renderInfo(); }
    const token = this.#connectToken = {};
    this.#serverNote = 'Avvio del server…';
    this.#renderInfo();
    const client = await pending;
    if (this.#connectToken !== token) return;
    if (!client.ready) {
      this.#serverNote = `Server non disponibile: ${client.error ?? 'errore'}`;
      return this.#renderInfo();
    }
    const uri = this.fileId && fs.exists(this.fileId) ? fileUri(this.fileId) : `untitled:${this.#untitled}`;
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
        this.#serverNote = `Server non disponibile: ${client.error ?? 'chiuso'}`;
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
    const text = this.text;
    const lines = text.split('\n');
    const { charWidth, lh, padLeft, padTop } = this.#metrics();
    const marks = [];
    const byLine = new Map();
    for (const d of this.#diagnostics.slice(0, 300)) {
      const sev = (d.severity ?? 1) === 1 ? 'err' : 'warn';
      const start = d.range?.start ?? { line: 0, character: 0 };
      const end = d.range?.end ?? start;
      for (let l = start.line; l <= Math.min(end.line, lines.length - 1); l++) {
        const line = lines[l] ?? '';
        const from = visualColumn(line, l === start.line ? start.character : 0);
        const to = visualColumn(line, l === end.line ? end.character : line.length);
        marks.push(h('div', {
          class: `ed-sq ${sev}`,
          style: { left: `${padLeft + from * charWidth}px`, top: `${padTop + l * lh + lh - 4}px`, width: `${Math.max(charWidth, (to - from) * charWidth)}px` },
        }));
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

  #metrics() {
    const cs = getComputedStyle(this.input);
    this.#measure ??= document.createElement('canvas').getContext('2d');
    this.#measure.font = `${cs.fontSize} ${cs.fontFamily}`;
    return {
      charWidth: this.#measure.measureText('0'.repeat(20)).width / 20,
      lh: parseFloat(cs.lineHeight), padLeft: parseFloat(cs.paddingLeft), padTop: parseFloat(cs.paddingTop),
    };
  }

  // ---------- JSON schema ----------

  #renderSchemaButton() {
    const isJson = getLanguage(this.#lang).id === 'json';
    this.schemaBtn.hidden = !isJson;
    if (!isJson) return;
    const source = this.fileId ? editorConfig.get('schemas')[this.fileId] : null;
    let label = 'nessuno';
    if (source?.type === 'file') label = fs.get(source.id)?.name ?? 'file eliminato';
    else if (source?.type === 'url') { try { label = new URL(source.url).host; } catch { label = source.url; } }
    this.schemaBtn.replaceChildren(icon('file'), h('span', {}, `Schema: ${label}`));
    this.schemaBtn.disabled = !this.fileId;
    this.schemaBtn.title = this.fileId ? (source?.type === 'url' ? source.url : 'Schema JSON del file') : 'Salva il file per associargli uno schema';
  }

  #schemaMenu() {
    if (!this.fileId) return;
    const fileId = this.fileId;
    const r = this.schemaBtn.getBoundingClientRect();
    const source = editorConfig.get('schemas')[fileId];
    openMenu(r.left, r.bottom + 2, [
      { label: 'Nessuno schema', icon: source ? 'x' : 'check', action: () => editorConfig.setEntry('schemas', fileId, undefined) },
      { label: 'Scegli un file di lilOS…', icon: 'file', action: async () => {
        const node = await pickFile(this.openWindow, { title: 'Scegli lo schema JSON', exts: ['json'], text: `Lo schema descrive le chiavi e i valori ammessi in «${this.name}».` });
        if (node && node.id !== fileId) editorConfig.setEntry('schemas', fileId, { type: 'file', id: node.id });
      } },
      { label: 'Indirizzo web…', icon: 'globe', action: () => this.#askSchemaUrl(fileId, source?.type === 'url' ? source.url : '') },
      '-',
      { label: 'Vale anche "$schema" scritto nel file', icon: 'info', disabled: true },
    ]);
  }

  #askSchemaUrl(fileId, value) {
    const input = h('input', { class: 'ctl-text ed-banner-input', type: 'url', placeholder: 'https://json.schemastore.org/package.json', spellcheck: 'false', 'aria-label': 'Indirizzo dello schema' });
    input.value = value;
    const note = h('span', { class: 'ed-banner-text' }, 'Indirizzo dello schema JSON:');
    const apply = () => {
      const url = input.value.trim();
      if (!isSchemaUrl(url)) { note.textContent = 'Serve un indirizzo http:// o https://'; input.focus(); return; }
      editorConfig.setEntry('schemas', fileId, { type: 'url', url });
      this.#closeBanner();
      this.input.focus();
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
    this.#openBanner([
      icon('globe'), note, input,
      actionButton({ label: 'Usa', primary: true, onClick: apply }),
      actionButton({ label: 'Annulla', onClick: () => { this.#closeBanner(); this.input.focus(); } }),
    ], () => { this.#closeBanner(); this.input.focus(); });
    input.focus();
    input.select();
  }

  #openBanner(children, onEscape) {
    this.banner.replaceChildren(...children);
    this.banner.hidden = false;
    this.banner.querySelector('button')?.focus();
    this.banner.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); onEscape(); } };
  }

  #closeBanner() {
    this.banner.hidden = true;
    this.banner.replaceChildren();
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
    result ??= complete(this.text, ta.selectionStart, getLanguage(this.#lang).simple ?? 'text', { manual });
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
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
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
    if (getLanguage(this.#lang).simple === 'css' && it.kind === 'pr') this.#suggest(false, ':');
  }

  /** Puts the list under the word being completed (above it if there is no room below). */
  #placeCompletion(from) {
    const ta = this.input;
    const text = this.text;
    const { charWidth, lh, padLeft, padTop } = this.#metrics();
    const lineStart = text.lastIndexOf('\n', from - 1) + 1;
    const x = padLeft + visualColumn(text.slice(lineStart), from - lineStart) * charWidth - ta.scrollLeft;
    const y = padTop + (lineOf(text, from) - 1) * lh - ta.scrollTop;
    const box = this.suggestions;
    const area = ta.getBoundingClientRect();
    const w = box.offsetWidth, hgt = box.offsetHeight;
    const below = y + lh + 2;
    const top = below + hgt > area.height && y - hgt - 2 >= 0 ? y - hgt - 2 : below;
    box.style.left = Math.max(4, Math.min(x - 30, area.width - w - 4)) + 'px';
    box.style.top = top + 'px';
  }

  #onInput(e) {
    this.#changed();
    this.#syncLater();
    if (this.#accepting) return;
    const data = typeof e.data === 'string' ? e.data : '';
    const typed = e.inputType === 'insertText' && data.length === 1;
    const triggers = this.#client?.ready ? this.#client.triggerCharacters : [];
    const lang = getLanguage(this.#lang).simple;
    // Word characters and the server's trigger characters ask; a space inside an HTML tag asks for attributes
    if (typed && (triggers.includes(data) || !/\s/.test(data) || (lang === 'html' && data === ' '))) {
      this.#suggest(this.#completion?.manual ?? false, triggers.includes(data) ? data : null);
    } else if (e.inputType === 'deleteContentBackward' && this.#completion) this.#suggest(this.#completion.manual);
    else this.#hideCompletion();
  }

  // ---------- Internals ----------

  #load(id, name, text) {
    this.fileId = id;
    this.name = name;
    this.#saved = text;
    this.#message = '';
    this.#langChosen = false;
    this.#hideCompletion();
    this.#closeBanner();
    this.input.value = text;
    this.input.setSelectionRange(0, 0);
    this.input.scrollTop = 0;
    this.input.scrollLeft = 0;
    this.#setLanguage(languageForName(name));
    this.tree.setCurrent(id);
    this.input.focus();
  }

  #displayName() {
    return this.fileId ? this.name : 'Senza titolo';
  }

  #changed() {
    this.#message = '';
    cancelAnimationFrame(this.#raf);
    this.#raf = requestAnimationFrame(() => this.render());
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
      // Leave the text with the keyboard (Tab then moves the focus on)
      ta.blur();
    }
  }

  #onFsChange(e) {
    if (e.type === 'create' && this.#lost?.id === e.node.id && !this.fileId) {
      // Put back (from the trash, or undo): the window is the file's again
      this.fileId = e.node.id;
      this.#saved = this.#lost.saved;
      this.#lost = null;
      this.name = e.node.name;
      this.#message = 'Il file è stato ripristinato';
      this.tree.setCurrent(this.fileId);
      this.#connect();
      this.render();
      return;
    }
    if (!this.fileId) return;
    if (e.type === 'remove' && e.ids.includes(this.fileId)) {
      this.#lost = { id: this.fileId, saved: this.#saved };
      this.fileId = null;
      this.#saved = '';   // nothing on disk any more: everything counts as unsaved
      this.#message = e.trashed
        ? 'Il file è nel cestino: il testo resta qui finché non lo salvi o lo ripristini'
        : 'Il file è stato eliminato: il testo resta qui finché non lo salvi';
      this.tree.setCurrent(null);
      this.#connect();
      this.render();
    } else if (e.type === 'move' && e.ids.includes(this.fileId)) {
      // Moved (itself or a folder above it): new path and URI, maybe a new name
      this.name = fs.get(this.fileId).name;
      this.#connect();
      this.render();
    } else if (e.type === 'rename' && e.node.id === this.fileId) {
      this.name = e.node.name;
      if (!this.#langChosen && languageForName(this.name) !== this.#lang) this.#setLanguage(languageForName(this.name));
      else { this.#connect(); this.render(); }   // the file URI changed
    } else if (e.type === 'rename' && e.node.type === 'folder' && fs.isInside(this.fileId, e.node.id)) {
      this.#connect();   // a folder above it: the path and the URI changed
      this.render();
    }
  }
}
