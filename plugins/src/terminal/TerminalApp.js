import { Window, h, fs, storage, session } from '@lilos/sdk';
import * as sdk from '@lilos/sdk';   // `automation`: missing in older lilOS, so not imported by name
import { TerminalWindow } from './window.js';
import { Shell, quote } from './shell/Shell.js';
import { commands } from './commands/index.js';
import { Reader, FnWriter } from './shell/streams.js';
import { Incomplete, ParseError, ExitSignal, Interrupt, Token } from './shell/signals.js';
import { columns } from './commands/files.js';
import { AnsiRenderer } from './ansi.js';
import { complete, commonPrefix } from './completion.js';
import { isCommand } from './keys.js';
import { i18n, t } from './i18n.js';
import './terminal.css';

const HISTORY_KEY = 'terminal.history';
const HISTORY_MAX = 1000;
const SCROLLBACK = 400_000;   // characters of output kept
const RC = '.bashrc';
/** Longest command line recorded for Automata (a longer one would be cut: it is not recorded). */
const COMMAND_MAX = 4000;
/** Characters of the error output kept while Automata runs a line (the reason it failed). */
const ERROR_TAIL = 2000;

/** Recording and replaying what the user does (Automata): null in a lilOS without it. */
const automation = () => sdk.automation ?? null;

/** Path shown for a folder: '~' for the home (and a folder that went), '~/Documenti/Note' inside it. */
const tildePath = id => fs.tildePath(id) ?? '~';

/**
 * Terminale: tabs of bash-like shells over lilOS's files (this file) and of remote sessions (SSH,
 * Telnet, rlogin, SUPDUP: remote/RemoteTab.js) in panes side by side, with the saved hosts in a
 * side panel (window.js). args.cwd (a folder id) opens it there; args.file a .term file
 * (termFile.js); { files, action: 'terminal.sshHere' } (the menu of a folder of an SFTP
 * connection) opens SSH in that folder; args.layout is a window coming back (its getState()).
 * Every Terminal window is a main window of the app: tabs detached into a window of their own
 * come back with lilOS too.
 */
export default function createTerminal({ args, openWindow } = {}) {
  return makeWindow(args, openWindow);
}

export { filePreview } from './preview.js';

function makeWindow(args, openWindow) {
  const size = args?.size;
  const win = new Window({ title: t('ui.title'), icon: 'terminal', width: size?.w ?? 760, height: size?.h ?? 460, minWidth: 360, minHeight: 200 });
  const tabs = new TerminalWindow(win, args, {
    openWindow,
    makeShell: (owner, a) => new LocalShell(owner, a),
    makeWindow: (a, at) => {
      const other = makeWindow(a, openWindow);
      openWindow(other, null, { main: true, at });
      return other.terminal;
    },
  });
  win.terminal = tabs;
  win.getState = () => tabs.state();
  win.on('launch', a => tabs.launched(a));
  // Automata: a command line run again in this window (in the shell tab shown, or the first one)
  automation()?.handle('terminal.run', params => {
    let shell = tabs.current && !tabs.current.remote ? tabs.current : tabs.firstLocal();
    if (!shell) tabs.add(shell = new LocalShell(tabs, {}));
    tabs.select(shell);
    return shell.replay(params);
  }, { window: win, file: () => null });
  return win;
}

/** Bytes a terminal sends for the keys of the line editor (they go to the other panes, see receive()). */
const BYTES = {
  enter: '\r', complete: '\t', interrupt: '\x03', eof: '\x04', clear: '\x0c', home: '\x1b[H', end: '\x1b[F',
  killBefore: '\x15', killAfter: '\x0b', deleteWord: '\x17', backspace: '\x7f', delete: '\x1b[3~',
  left: '\x1b[D', right: '\x1b[C', wordLeft: '\x1b[1;5D', wordRight: '\x1b[1;5C', up: '\x1b[A', down: '\x1b[B', escape: '\x1b',
};
/** What the line editor does with the bytes another pane sends (longest first). */
const SEQUENCES = [
  ...Object.entries(BYTES).map(([op, bytes]) => [bytes, op]),
  ['\n', 'enter'], ['\x01', 'home'], ['\x05', 'end'], ['\x08', 'backspace'], ['\x1bOH', 'home'], ['\x1bOF', 'end'],
  ['\x1b[1~', 'home'], ['\x1b[4~', 'end'], ['\x1bOA', 'up'], ['\x1bOB', 'down'], ['\x1bOC', 'right'], ['\x1bOD', 'left'],
].sort((a, b) => b[0].length - a[0].length);

/** Keyboard input of the commands that read the terminal (read, cat without files…). */
class TerminalReader extends Reader {
  silent = false;
  constructor(term) { super(); this.term = term; }
  pull() { return this.term.readInput(this); }
}

/**
 * One shell. Everything shown is one stream of output; the line being typed is a live span at its
 * end, fed by a hidden textarea (so selection and copying of the output work as on any page).
 */
class LocalShell {
  remote = false;
  text = '';            // the line being typed
  cursor = 0;
  pending = '';         // lines of a command not complete yet (if without fi…)
  running = false;
  queue = [];           // lines entered while a command runs (or pasted), not used yet
  reader = null;        // { resolve, reject, reader } while a command waits for a line
  #out = '';
  #frame = 0;
  #historyAt = -1;
  #draft = '';
  #tabs = 0;
  #charWidth = 0;
  #token = null;

  #listeners = new AbortController();

  constructor(owner, args) {
    this.owner = owner;
    this.#quiet = args?.quiet === true;
    this.ansi = new AnsiRenderer();
    const { signal } = this.#listeners;

    this.edit = h('span', { class: 'tm-edit' });
    this.output = h('div', { class: 'tm-out', role: 'log', 'aria-live': 'polite' }, this.edit);
    this.input = h('textarea', {
      class: 'tm-input', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off',
      rows: '1', 'aria-label': t('ui.commandLine'),
    });
    this.screen = h('div', { class: 'tm-screen' }, this.output, this.input);
    this.el = h('div', { class: 'tm-pane tm-local', role: 'tabpanel' }, this.screen);

    this.input.addEventListener('keydown', e => this.#onKey(e), { signal });
    this.input.addEventListener('input', e => this.#onInput(e), { signal });
    this.input.addEventListener('paste', e => this.#onPaste(e), { signal });
    this.input.addEventListener('focus', () => this.screen.classList.add('focused'), { signal });
    this.input.addEventListener('blur', () => this.screen.classList.remove('focused'), { signal });
    // A click focuses the line, unless it selected some text to copy
    this.screen.addEventListener('mouseup', () => { if (!String(getSelection()).length) this.focus(); }, { signal });
    this.resizes = new ResizeObserver(() => { this.#charWidth = 0; });
    this.resizes.observe(this.screen);

    this.history = loadHistory();
    const out = new FnWriter(t => this.write(t));
    this.host = {
      stdin: new TerminalReader(this),
      stdout: out,
      stderr: out,
      clear: () => this.clear(),
      columns: () => this.columns(),
      history: {
        list: () => [...this.history],
        clear: () => { this.history = []; saveHistory([]); },
      },
    };
    // ssh, telnet…: tabs of the window the shell is in now (commands/remote.js)
    Object.defineProperty(this.host, 'remote', { get: () => this.owner.remote, enumerable: true });
    this.shell = new Shell({ host: this.host, commands });
    if (args?.cwd && fs.get(args.cwd)?.type === 'folder') this.shell.cwd = args.cwd;
    this.shell.setVar('PS1', '\\[\\e[1;32m\\]\\u@\\h\\[\\e[0m\\]:\\[\\e[1;34m\\]\\w\\[\\e[0m\\]\\$ ');

    // A command to run first (a .term file)
    if (typeof args?.run === 'string' && args.run.trim()) this.queue.push(args.run);

    this.#updateTitle();
    /** Settles once the shell is ready for commands (~/.bashrc run). */
    this.ready = this.#start();
  }

  #quiet = false;

  get name() { return tildePath(this.shell.cwd); }
  get subtitle() { return tildePath(this.shell.cwd); }
  get closed() { return false; }
  activity = false;

  show() {
    this.el.hidden = false;
    requestAnimationFrame(() => { this.scrollToEnd(); this.focus(); });
  }

  hide() { this.el.hidden = true; }

  /** Moved to another pane or window: it shows the end again. */
  reflow() { if (!this.el.hidden) this.scrollToEnd(); }

  /** For the window's saved state. */
  state() { return { kind: 'local', cwd: this.shell.cwd }; }

  /**
   * Bytes typed in another pane (input to all panes): characters go in the line, the keys of the
   * line editor do what they do here, other escape sequences are left out.
   */
  receive(data) {
    const s = String(data);
    let text = '';
    const flush = () => { if (text) { this.#insert(text); text = ''; } };
    for (let i = 0; i < s.length;) {
      const seq = SEQUENCES.find(([bytes]) => s.startsWith(bytes, i));
      // ESC alone is a key only at the end (otherwise it starts a sequence)
      if (seq && !(seq[0] === '\x1b' && i + 1 < s.length)) {
        flush();
        this.#do(seq[1]);
        i += seq[0].length;
        continue;
      }
      const c = s.charCodeAt(i);
      if (c === 0x1b) {
        flush();
        i += /^\x1b(?:\[[0-9;?]*[ -/]*[@-~]|O.|.)?/.exec(s.slice(i))[0].length;
      } else if (c < 0x20 || c === 0x7f) {
        flush();
        i++;
      } else text += s[i++];
    }
    flush();
  }

  /** The tab or the window closes: the shell stops. */
  dispose() {
    this.#listeners.abort();
    this.resizes.disconnect();
    cancelAnimationFrame(this.#frame);
    this.#token?.abort();
    for (const job of this.shell.jobs.list) job.token.abort();
    this.reader?.reject(new Interrupt());
  }

  async #start() {
    if (!this.#quiet) this.write(`\x1b[2m${t('ui.welcome')}\x1b[0m\n`);
    if (this.shell.resolve(`~/${RC}`)?.type === 'file') {
      await this.#execute(`source ~/${RC}`, { record: false });
    } else {
      this.prompt();
      this.#drain();
    }
    requestAnimationFrame(() => { if (!this.el.hidden) this.focus(); });
  }

  focus() { this.input.focus({ preventScroll: true }); }

  // ---------- Output ----------

  write(text) {
    this.#out += text;
    if (this.#out.length > 1 << 18) this.flush();
    else if (!this.#frame) this.#frame = requestAnimationFrame(() => this.flush());
  }

  flush() {
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    if (!this.#out) return;
    const text = this.#out;
    this.#out = '';
    const stick = this.#atBottom();
    this.ansi.write(text, this.output, this.edit, () => this.clear());
    this.#trim();
    if (stick) this.scrollToEnd();
  }

  #trim() {
    let total = this.output.textContent.length;
    while (total > SCROLLBACK && this.output.firstChild !== this.edit) {
      total -= this.output.firstChild.textContent.length;
      this.output.firstChild.remove();
    }
  }

  #atBottom() { return this.screen.scrollHeight - this.screen.scrollTop - this.screen.clientHeight < 40; }
  scrollToEnd() { this.screen.scrollTop = this.screen.scrollHeight; }

  clear() {
    this.#out = '';
    while (this.output.firstChild !== this.edit) this.output.firstChild.remove();
    this.screen.scrollTop = 0;
  }

  /** How many characters fit in a line (for ls's columns). */
  columns() {
    if (!this.#charWidth) {
      const probe = h('span', { class: 'tm-probe' }, 'MMMMMMMMMM');
      this.screen.append(probe);
      this.#charWidth = probe.getBoundingClientRect().width / 10 || 8;
      probe.remove();
    }
    return Math.max(20, Math.floor((this.screen.clientWidth - 24) / this.#charWidth));
  }

  // ---------- Prompt and line ----------

  promptText(name = 'PS1') {
    const ps = this.shell.getVar(name) ?? '$ ';
    const user = session.user?.username || this.shell.getVar('USER') || t('shell.defaultUser');
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return ps.replace(/\\([uhHwW$nte\\[\]dA@])/g, (_, c) => ({
      u: user, h: this.shell.getVar('HOSTNAME') ?? 'lilos', H: this.shell.getVar('HOSTNAME') ?? 'lilos',
      w: tildePath(this.shell.cwd), W: this.shell.cwd === fs.root ? '~' : fs.get(this.shell.cwd)?.name ?? '~',
      $: '$', n: '\n', e: '\x1b', '\\': '\\', '[': '', ']': '',
      t: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`, A: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      d: i18n.date(now, { weekday: 'short', day: 'numeric', month: 'short' }), '@': i18n.date(now, { timeStyle: 'medium' }),
    })[c]);
  }

  prompt() {
    for (const line of this.shell.reapJobs()) this.write(line);
    // Colors left on by a command do not leak into the prompt
    this.flush();
    this.ansi.reset();
    this.write(this.promptText(this.pending ? 'PS2' : 'PS1'));
    this.flush();
    this.renderLine();
    this.scrollToEnd();
  }

  renderLine() {
    const silent = this.reader?.reader.silent;
    const text = silent ? '' : this.text;
    const at = silent ? 0 : this.cursor;
    const cursor = h('span', { class: 'tm-cursor' }, text[at] ?? ' ');
    this.edit.replaceChildren(text.slice(0, at), cursor, text.slice(at + 1));
    this.edit.hidden = this.running && !this.reader && !this.text;
  }

  setLine(text, cursor = text.length) {
    this.text = text;
    this.cursor = Math.max(0, Math.min(cursor, text.length));
    this.#tabs = 0;
    this.renderLine();
  }

  /** The line as typed goes into the output (it stays on screen), the edit span empties. */
  #commitLine(text) {
    this.write((this.reader?.reader.silent ? '' : text) + '\n');
    this.setLine('');
    this.flush();
  }

  // ---------- Input ----------

  #onInput(e) {
    if (e.isComposing) return;
    const value = this.input.value;
    this.input.value = '';
    if (!value) return;
    const lines = value.replace(/\r\n?/g, '\n').split('\n');
    this.owner.typed?.(this, lines.join('\r'));
    this.#insert(lines[0]);
    if (lines.length > 1) this.#feed(lines.slice(1));
  }

  #onPaste(e) {
    const text = e.clipboardData?.getData('text/plain');
    if (text == null) return;
    e.preventDefault();
    this.owner.typed?.(this, text.replace(/\r\n?/g, '\n').replace(/\n/g, '\r'));
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    this.#insert(lines[0]);
    if (lines.length > 1) this.#feed(lines.slice(1));
  }

  #insert(s) {
    if (!s) return;
    this.setLine(this.text.slice(0, this.cursor) + s + this.text.slice(this.cursor), this.cursor + s.length);
    this.scrollToEnd();
  }

  /** Pasted lines: the current one is entered, the others follow it in order; the last stays typed. */
  #feed(rest) {
    const last = rest.pop();
    this.#enter();
    for (const line of rest) this.queue.push(line);
    if (last) {
      if (this.running || this.queue.length) this.#tail = last;
      else this.#insert(last);
    }
    this.#drain();
  }

  #tail = '';

  #onKey(e) {
    if (isCommand(e)) return;   // Terminal's shortcuts go on to lilOS
    const ctrl = e.ctrlKey && !e.altKey && !e.metaKey;
    const key = e.ctrlKey && e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key !== 'Tab') this.#tabs = 0;
    if (e.isComposing) return;
    const op = this.#keyOp(key, ctrl);
    if (!op) return;
    if (op === 'interrupt' && String(getSelection()).length) return;   // Ctrl+C copies the selected output
    e.preventDefault();
    e.stopPropagation();
    if (BYTES[op]) this.owner.typed?.(this, BYTES[op]);
    this.#do(op);
  }

  #keyOp(key, ctrl) {
    if (key === 'Enter') return 'enter';
    if (key === 'Tab') return 'complete';
    if (ctrl) {
      const op = { c: 'interrupt', d: 'eof', l: 'clear', a: 'home', e: 'end', u: 'killBefore', k: 'killAfter', w: 'deleteWord', Backspace: 'deleteWord', ArrowLeft: 'wordLeft', ArrowRight: 'wordRight' }[key];
      if (op) return op;
    }
    return {
      Backspace: 'backspace', Delete: 'delete', ArrowLeft: 'left', ArrowRight: 'right', Home: 'home', End: 'end',
      ArrowUp: 'up', ArrowDown: 'down', PageUp: 'pageUp', PageDown: 'pageDown', Escape: 'escape',
    }[key] ?? null;
  }

  /** One key of the line editor, typed here or in another pane. */
  #do(op) {
    switch (op) {
      case 'enter': return this.#enter();
      case 'complete': return this.#complete();
      case 'interrupt': return this.#interrupt();
      case 'eof':
        if (this.reader) { this.#commitLine(this.text); this.#resolveRead(null); }
        else if (!this.running && !this.text && !this.pending) this.#exit();
        else if (this.text) this.setLine(this.text.slice(0, this.cursor) + this.text.slice(this.cursor + 1), this.cursor);
        return;
      case 'clear':
        this.clear();
        if (!this.running) this.prompt();
        return;
      case 'home': return this.setLine(this.text, 0);
      case 'end': return this.setLine(this.text, this.text.length);
      case 'killBefore': return this.setLine(this.text.slice(this.cursor), 0);
      case 'killAfter': return this.setLine(this.text.slice(0, this.cursor));
      case 'deleteWord': {
        const before = this.text.slice(0, this.cursor).replace(/\S+\s*$/, '');
        return this.setLine(before + this.text.slice(this.cursor), before.length);
      }
      case 'backspace':
        if (this.cursor > 0) this.setLine(this.text.slice(0, this.cursor - 1) + this.text.slice(this.cursor), this.cursor - 1);
        return;
      case 'delete': return this.setLine(this.text.slice(0, this.cursor) + this.text.slice(this.cursor + 1), this.cursor);
      case 'left': return this.setLine(this.text, this.cursor - 1);
      case 'right': return this.setLine(this.text, this.cursor + 1);
      case 'wordLeft': return this.setLine(this.text, this.text.slice(0, this.cursor).replace(/\S+\s*$/, '').length);
      case 'wordRight': {
        const m = /^\s*\S+/.exec(this.text.slice(this.cursor));
        return this.setLine(this.text, this.cursor + (m ? m[0].length : this.text.length));
      }
      case 'up': return this.#historyStep(-1);
      case 'down': return this.#historyStep(1);
      case 'pageUp': this.screen.scrollTop -= this.screen.clientHeight * 0.9; return;
      case 'pageDown': this.screen.scrollTop += this.screen.clientHeight * 0.9; return;
    }
  }

  #historyStep(dir) {
    if (this.reader) return;
    if (this.#historyAt < 0) { this.#draft = this.text; this.#historyAt = this.history.length; }
    const next = this.#historyAt + dir;
    if (next < 0 || next > this.history.length) return;
    this.#historyAt = next;
    this.setLine(next === this.history.length ? this.#draft : this.history[next]);
  }

  #complete() {
    if (this.reader) return;
    const { start, end, items } = complete(this.shell, this.text, this.cursor);
    this.#tabs++;
    if (!items.length) return;
    const replace = value => this.setLine(this.text.slice(0, start) + value + this.text.slice(end), start + value.length);
    if (items.length === 1) {
      const only = items[0];
      replace(only.value + (only.folder || /[}/]$/.test(only.value) ? '' : ' '));
      return;
    }
    const prefix = commonPrefix(items.map(i => i.value));
    const current = this.text.slice(start, end);
    if (prefix.length > current.length) { replace(prefix); this.#tabs = 1; return; }
    if (this.#tabs < 2) return;
    // Second Tab: show the candidates, then the prompt and the line again
    const line = this.text, cursor = this.cursor;
    this.#commitLine(line);
    this.write(columns(items.map(i => ({ text: i.label, plain: i.label })), this.columns()));
    this.prompt();
    this.setLine(line, cursor);
    this.#tabs = 0;
  }

  #interrupt() {
    if (this.running) {
      this.write('^C');
      if (this.reader) this.#commitLine('');
      else this.write('\n');
      this.queue = [];
      this.#tail = '';
      this.#token?.abort();
      return;
    }
    this.write(this.text + '^C\n');
    this.pending = '';
    this.queue = [];
    this.setLine('');
    this.shell.status = 130;
    this.prompt();
  }

  // ---------- Running ----------

  #enter() {
    const line = this.text;
    this.#historyAt = -1;
    if (this.reader) {
      this.#commitLine(line);
      this.#resolveRead(line + '\n');
      return;
    }
    if (this.running) {
      // Typed ahead: used by the next read, or run after the command
      this.queue.push(line);
      this.setLine('');
      return;
    }
    this.#commitLine(line);
    this.#submit(line);
  }

  /** Runs what is queued, one line at a time, while nothing is running. */
  #drain() {
    while (!this.running && this.queue.length) {
      const line = this.queue.shift();
      this.write(line + '\n');
      this.#submit(line);
    }
    if (!this.running && !this.queue.length && this.#tail) {
      this.#insert(this.#tail);
      this.#tail = '';
    }
  }

  #submit(line) {
    const source = this.pending ? `${this.pending}\n${line}` : line;
    this.#execute(source, { record: true });
  }

  /**
   * Runs source text. record: typed by the user (history, Automata); replay: run by Automata (a
   * construct left open is an error, not more lines to ask for). Resolves with { status, error }:
   * the exit status and, with replay, the end of what went to stderr.
   */
  async #execute(source, { record, replay = false }) {
    if (!source.trim()) {
      this.pending = '';
      this.prompt();
      return { status: 0, error: '' };
    }
    const folder = this.shell.cwd;   // where the line runs (recorded with it)
    this.running = true;
    this.renderLine();
    this.#token = new Token();
    this.shell.token = this.#token;
    this.host.stdin = new TerminalReader(this);
    // Run by Automata: the error output is kept too, to say why it failed
    let error = '';
    const io = replay ? { ...this.host, stderr: new FnWriter(text => { error = (error + text).slice(-ERROR_TAIL); this.write(text); }) } : this.host;
    let incomplete = false;
    try {
      // What the line does (files moved, copied, deleted…) is part of it: lilOS does not record it apart
      const run = () => this.shell.run(source, io);
      await (automation()?.quiet(run) ?? run());
    } catch (err) {
      if (err instanceof Incomplete && !replay) incomplete = true;
      else if (err instanceof Incomplete) { io.stderr.write(`bash: ${err.message || t('parse.unexpectedEndOfFile')}\n`); this.shell.status = 2; }
      else if (err instanceof ParseError) { io.stderr.write(`bash: ${err.message}\n`); this.shell.status = 2; }
      else if (err instanceof ExitSignal) { this.flush(); this.#exit(); return { status: err.code ?? 0, error }; }
      else if (err instanceof Interrupt) this.shell.status = 130;
      else { io.stderr.write(`bash: ${err?.message ?? err}\n`); this.shell.status = 1; }
    }
    const status = this.shell.status;
    this.pending = incomplete ? source : '';
    if (record && !incomplete) this.#remember(source);
    // Automata: the line once it ran fine (a failed one would only fail again), but not `automata` itself
    if (record && !incomplete && status === 0 && automation()?.recording && !/^\s*automata(\s|$)/.test(source)) {
      // The quiet of the run ends a moment after it (a timer): told after that
      await new Promise(r => setTimeout(r));
      if (source.length > COMMAND_MAX) automation()?.missed('terminal', t('automation.tooLong'));
      else automation()?.record('terminal.run', { params: { command: source, folder } });
    }
    this.running = false;
    this.reader = null;
    this.#updateTitle();
    this.flush();
    // Output without a final newline: the prompt starts on a line of its own
    if (!/\n$/.test(this.edit.previousSibling?.textContent ?? '\n')) this.write('\n');
    this.prompt();
    this.#drain();
    return { status, error };
  }

  /**
   * Automata runs a recorded line in this shell: in the folder it ran in (gone there first, like a
   * cd typed by hand), shown as if typed. Resolves once it is over; throws if its status is not 0.
   */
  async replay({ command = '', folder = null } = {}) {
    await this.ready;
    if (!command.trim()) throw new Error(t('automation.noCommand'));
    if (this.running || this.pending) throw new Error(t('automation.busy'));
    if (folder && fs.get(folder)?.type !== 'folder') throw new Error(t('automation.noFolder'));
    // What the user was typing comes back afterwards
    const typed = { text: this.text, cursor: this.cursor };
    this.setLine('');
    if (folder && folder !== this.shell.cwd) {
      const path = tildePath(folder);
      this.write(`cd ${path.startsWith('~/') ? `~/${quote(path.slice(2))}` : quote(path)}\n`);
      this.shell.cwd = folder;
      this.#updateTitle();
      this.prompt();
    }
    this.#commitLine(command);
    const { status, error } = await this.#execute(command, { record: false, replay: true });
    if (typed.text && !this.running && !this.text) this.setLine(typed.text, typed.cursor);
    if (status !== 0) {
      const reason = error.replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n').at(-1);
      throw new Error(reason || t('automation.status', { status }));
    }
  }

  #remember(source) {
    const entry = source.trim();
    if (!entry || source.startsWith(' ') || this.history.at(-1) === entry) return;
    this.history = [...loadHistory().filter(h => h !== entry), entry].slice(-HISTORY_MAX);
    saveHistory(this.history);
  }

  /** A command reads a line from the keyboard: from what was typed ahead, or waiting for Enter. */
  readInput(reader) {
    if (this.queue.length) {
      const line = this.queue.shift();
      this.write((reader.silent ? '' : line) + '\n');
      return Promise.resolve(line + '\n');
    }
    this.flush();
    return new Promise((resolve, reject) => {
      const off = this.#token?.onAbort(() => { this.reader = null; reject(new Interrupt()); });
      this.reader = {
        reader,
        resolve: v => { off?.(); resolve(v); },
        reject: e => { off?.(); reject(e); },
      };
      this.renderLine();
      this.scrollToEnd();
    });
  }

  #resolveRead(value) {
    const r = this.reader;
    this.reader = null;
    this.renderLine();
    r?.resolve(value);
  }

  changeDir(id) {
    this.shell.cwd = id;
    this.#updateTitle();
    if (!this.running) {
      this.write(`\ncd ${tildePath(id)}\n`);
      this.prompt();
    }
  }

  #updateTitle() {
    this.owner.tabChanged(this);
  }

  #exit() {
    this.running = true;
    this.renderLine();
    this.owner.closeTab(this);
  }
}

function loadHistory() {
  const list = storage.get(HISTORY_KEY, []);
  return Array.isArray(list) ? list.filter(x => typeof x === 'string').slice(-HISTORY_MAX) : [];
}

const saveHistory = list => storage.set(HISTORY_KEY, list);

