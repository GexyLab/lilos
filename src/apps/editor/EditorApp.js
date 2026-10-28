import { Window, h, icon, fs, selectField, actionButton } from '@lilos/sdk';
import { launch } from '../registry.js';
import { handleCommand } from '../commands.js';
import { LANGUAGES, languageFor, tokenize } from './highlight.js';
import './editor.css';

const INDENT = '  ';
const HIGHLIGHT_LIMIT = 300_000;   // characters: above this the text is shown plain, to stay responsive
const UNTITLED = 'Senza titolo.txt';

/** Text editor: one document per window, line numbers, syntax highlighting. args.file opens a file. */
export default function createEditor({ args } = {}) {
  const win = new Window({ title: 'Senza titolo', subtitle: 'Editor', icon: 'code', width: 760, height: 500, minWidth: 420, minHeight: 260 });
  const editor = new TextEditor(win);
  if (args?.file && fs.exists(args.file)) editor.open(args.file);
  else editor.render();
  // Launched again (e.g. another file opened from File): open it here, asking first if there are changes
  win.on('launch', a => { if (a?.file && fs.exists(a.file)) editor.open(a.file); });
  win.canClose = () => editor.confirmDiscard();
  return win;
}

const lineOf = (text, pos) => {
  let line = 1;
  for (let i = text.indexOf('\n'); i !== -1 && i < pos; i = text.indexOf('\n', i + 1)) line++;
  return line;
};

class TextEditor {
  fileId = null;
  name = UNTITLED;
  #saved = '';            // text as last saved (or loaded)
  #lang = 'text';
  #langChosen = false;    // the user picked a language: keep it on rename
  #lines = 0;
  #raf = 0;
  #message = '';

  constructor(win) {
    this.win = win;
    const { signal } = win;

    const tool = (glyph, label, onclick) => h('button', { class: 'ed-btn', type: 'button', title: label, 'aria-label': label, onclick }, icon(glyph));
    this.revealBtn = tool('folder', 'Mostra nella cartella', () => this.reveal());
    this.langSelect = selectField({
      value: 'text', label: 'Linguaggio',
      options: Object.entries(LANGUAGES).map(([value, l]) => ({ value, label: l.label })),
      onChange: v => { this.#lang = v; this.#langChosen = true; this.#paint(); },
    });
    this.langSelect.classList.add('ed-lang');
    this.banner = h('div', { class: 'ed-banner', role: 'alertdialog', hidden: true });

    this.gutter = h('div', { class: 'ed-gutter', 'aria-hidden': 'true' });
    this.current = h('div', { class: 'ed-current', 'aria-hidden': 'true' });
    this.code = h('pre', { class: 'ed-hl', 'aria-hidden': 'true' });
    this.input = h('textarea', {
      class: 'ed-input', wrap: 'off', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': 'Testo del documento',
    });
    this.position = h('span');
    this.state = h('span', { class: 'ed-state' });

    win.body.append(
      h('div', { class: 'ed-toolbar' },
        tool('filePlus', 'Nuovo documento', () => this.newDocument()),
        tool('save', 'Salva', () => this.save()),
        this.revealBtn,
        h('span', { class: 'ed-grow' }),
        this.langSelect),
      this.banner,
      h('div', { class: 'ed' }, this.gutter, h('div', { class: 'ed-area' }, this.current, this.code, this.input)),
      h('div', { class: 'ed-status' }, this.position, this.state));

    this.input.addEventListener('input', () => this.#changed(), { signal });
    this.input.addEventListener('keydown', e => this.#onKey(e), { signal });
    this.input.addEventListener('scroll', () => this.#syncScroll(), { signal });
    for (const type of ['keyup', 'pointerup', 'select', 'focus']) this.input.addEventListener(type, () => this.#caret(), { signal });
    // Leaving with unsaved changes (reload, closing the tab): let the browser ask
    addEventListener('beforeunload', e => { if (this.dirty) e.preventDefault(); }, { signal });

    const offFs = fs.on('change', e => this.#onFsChange(e));
    const detach = [
      handleCommand('editor.save', { isActive: () => win.active, run: () => this.save() }),
      handleCommand('editor.new', { isActive: () => win.active, run: () => this.newDocument() }),
    ];
    win.on('destroy', () => { offFs(); detach.forEach(d => d()); cancelAnimationFrame(this.#raf); });
  }

  get dirty() { return this.input.value !== this.#saved; }
  get text() { return this.input.value; }

  // ---------- Documents ----------

  async open(id) {
    if (id === this.fileId) return;
    const node = fs.get(id);
    if (!node || node.type !== 'file') return;
    if (!(await this.confirmDiscard(`prima di aprire «${node.name}»`))) return;
    const text = await fs.read(id);
    this.#load(id, node.name, text);
  }

  async newDocument() {
    if (!(await this.confirmDiscard())) return;
    this.#load(null, UNTITLED, '');
  }

  /** Saves to the open file; a new document is created in /Documenti. */
  async save() {
    if (!this.fileId || !fs.exists(this.fileId)) {
      const docs = fs.resolve('/Documenti') ?? fs.get(fs.root);
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
        this.banner.hidden = true;
        this.banner.replaceChildren();
        if (choice === 'save') resolve(await this.save());
        else resolve(choice === 'discard');
        if (choice === 'cancel') this.input.focus();
      };
      this.banner.replaceChildren(
        icon('help'),
        h('span', { class: 'ed-banner-text' }, `Le modifiche a «${this.#displayName()}» non sono salvate${context ? ` (${context})` : ''}.`),
        actionButton({ label: 'Salva', primary: true, onClick: () => done('save') }),
        actionButton({ label: 'Non salvare', danger: true, onClick: () => done('discard') }),
        actionButton({ label: 'Annulla', onClick: () => done('cancel') }));
      this.banner.hidden = false;
      this.banner.querySelector('button')?.focus();
      this.banner.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); done('cancel'); } };
    });
  }

  // ---------- Rendering ----------

  render() {
    const node = this.fileId && fs.get(this.fileId);
    this.win.setTitle(`${this.#displayName()}${this.dirty ? ' •' : ''}`, 'Editor');
    this.revealBtn.disabled = !node;
    this.langSelect.value = this.#lang;
    this.state.textContent = this.#message
      || (this.dirty ? 'Modificato' : node ? `Salvato · ${fs.path(node.id)}` : 'Nuovo documento');
    this.state.classList.toggle('dirty', this.dirty);
    this.#paint();
  }

  /** Highlighted copy, line numbers, current line. */
  #paint() {
    const text = this.text;
    const tokens = text.length > HIGHLIGHT_LIMIT ? [[null, text]] : tokenize(text, this.#lang);
    // Text nodes only: file contents never become HTML
    const frag = document.createDocumentFragment();
    for (const [cls, part] of tokens) frag.append(cls ? h('span', { class: `tk-${cls}` }, part) : part);
    frag.append('\n ');   // a trailing newline needs a line to exist below it
    this.code.replaceChildren(frag);

    const lines = text.split('\n').length;
    if (lines !== this.#lines) {
      this.#lines = lines;
      this.gutter.replaceChildren(...Array.from({ length: lines }, (_, i) => h('div', {}, String(i + 1))));
    }
    this.#caret();
    this.#syncScroll();
  }

  #caret() {
    const text = this.text;
    const pos = this.input.selectionStart;
    const line = lineOf(text, pos);
    const col = pos - text.lastIndexOf('\n', pos - 1);
    this.position.textContent = `Riga ${line}, colonna ${col} · ${this.#lines} ${this.#lines === 1 ? 'riga' : 'righe'}`;
    this.gutter.querySelector('.on')?.classList.remove('on');
    this.gutter.children[line - 1]?.classList.add('on');
    this.current.style.setProperty('--line', line - 1);
  }

  #syncScroll() {
    const { scrollTop, scrollLeft } = this.input;
    this.code.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    this.current.style.setProperty('--scroll', `${scrollTop}px`);
    this.gutter.scrollTop = scrollTop;
  }

  // ---------- Internals ----------

  #load(id, name, text) {
    this.fileId = id;
    this.name = name;
    this.#saved = text;
    this.#message = '';
    this.#langChosen = false;
    this.#lang = languageFor(name);
    this.input.value = text;
    this.input.setSelectionRange(0, 0);
    this.input.scrollTop = 0;
    this.input.scrollLeft = 0;
    this.render();
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
    }
  }

  #onKey(e) {
    const ta = this.input;
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
    if (!this.fileId) return;
    if (e.type === 'remove' && e.ids.includes(this.fileId)) {
      this.fileId = null;
      this.#saved = '';   // nothing on disk any more: everything counts as unsaved
      this.#message = 'Il file è stato eliminato: il testo resta qui finché non lo salvi';
      this.render();
    } else if (e.type === 'rename' && e.node.id === this.fileId) {
      this.name = e.node.name;
      if (!this.#langChosen) this.#lang = languageFor(this.name);
      this.render();
    }
  }
}
