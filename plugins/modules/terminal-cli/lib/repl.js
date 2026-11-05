import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { complete } from '../../../src/terminal/completion.js';
import { Interrupt } from '../../../src/terminal/shell/signals.js';
import { fs, session } from './sdk.js';
import { configDir } from './client.js';
import { t, i18n } from './strings.js';

/**
 * The interactive shell of the command lilos: the line editor of the computer's terminal
 * (node:readline: arrows, history, Ctrl+A/E/U/K/W, Ctrl+L), Tab completion of the Terminal
 * (completion.js), Ctrl+C stops the command running (or drops the line), Ctrl+D or `exit` ends.
 * Lines typed while a command runs wait for it (or are its input when it reads the keyboard).
 * The history is kept in the folder of the computer's user (configDir()/history).
 */
const HISTORY_MAX = 1000;
const historyFile = () => join(configDir(), 'history');

function loadHistory() {
  try {
    return readFileSync(historyFile(), 'utf8').split('\n').filter(Boolean).slice(-HISTORY_MAX);
  } catch {
    return [];
  }
}

export class Repl {
  #rl = null;
  #queue = [];
  #reader = null;     // { resolve, reject, silent } while a command waits for a line
  #token = null;
  #pending = '';      // lines of a command not complete yet
  #running = false;
  #muted = false;
  #done = null;
  #status = 0;
  #history = loadHistory();
  tail = '';          // the output after its last newline: the prompt of a command reading a line

  constructor(cli, { color }) {
    this.cli = cli;
    this.color = color;
  }

  /** The lines typed, oldest first (the builtin history), and history -c. */
  get historyList() { return [...this.#history]; }

  clearHistory() {
    this.#history = [];
    if (this.#rl) this.#rl.history = [];
    try { writeFileSync(historyFile(), '', { mode: 0o600 }); } catch { /* a convenience */ }
  }

  /** Runs until `exit` or Ctrl+D: the exit status. */
  run() {
    return new Promise(resolve => {
      this.#done = resolve;
      this.#open();
      this.#begin();
    });
  }

  async #begin() {
    const shell = this.cli.shell;
    if (this.color) shell.setVar('PS1', '\\[\\e[1;32m\\]\\u@\\h\\[\\e[0m\\]:\\[\\e[1;34m\\]\\w\\[\\e[0m\\]\\$ ');
    if (shell.resolve('~/.bashrc')?.type === 'file') await this.#execute('source ~/.bashrc', { record: false });
    else this.#prompt();
  }

  #open() {
    const rl = createInterface({
      input: process.stdin, output: process.stdout, terminal: true,
      history: [...this.#history].reverse(), historySize: HISTORY_MAX, removeHistoryDuplicates: true,
      completer: (line, done) => this.#complete(line, done),
    });
    // read -s: what is typed is not shown
    const write = rl._writeToOutput.bind(rl);
    rl._writeToOutput = text => { if (!this.#muted) write(text); };
    rl.on('line', line => this.#line(line));
    rl.on('SIGINT', () => this.#interrupt());
    rl.on('close', () => this.#closed(rl));
    this.#rl = rl;
  }

  /** The prompt of the shell (PS1, or PS2 inside a command not complete yet), as Terminale draws it. */
  #promptText(name) {
    const shell = this.cli.shell;
    const ps = shell.getVar(name) ?? '$ ';
    const user = session.user?.username || shell.getVar('USER') || t('shell.defaultUser');
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    // '~' for the home, '~/Documenti/Note' inside it (the page's fs.tildePath, which kfs.js lacks)
    const tilde = id => (id === fs.root || !fs.get(id) ? '~' : `~/${fs.ancestors(id).slice(1).map(n => n.name).join('/')}`);
    return ps.replace(/\\([uhHwW$nte\\[\]dA@])/g, (_, c) => ({
      u: user, h: shell.getVar('HOSTNAME') ?? 'lilos', H: shell.getVar('HOSTNAME') ?? 'lilos',
      w: tilde(shell.cwd), W: shell.cwd === fs.root ? '~' : fs.get(shell.cwd)?.name ?? '~',
      $: '$', n: '\n', e: '\x1b', '\\': '\\', '[': '', ']': '',
      t: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`, A: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      d: i18n.date(now, { weekday: 'short', day: 'numeric', month: 'short' }), '@': i18n.date(now, { timeStyle: 'medium' }),
    })[c]);
  }

  #prompt() {
    this.#rl.setPrompt(this.#promptText(this.#pending ? 'PS2' : 'PS1'));
    this.#rl.prompt();
  }

  #line(line) {
    if (this.#reader) {
      const r = this.#reader;
      this.#reader = null;
      if (r.silent) { this.#muted = false; process.stdout.write('\n'); }
      r.resolve(`${line}\n`);
      return;
    }
    if (this.#running) { this.#queue.push(line); return; }
    this.#submit(line);
  }

  #submit(line) {
    const source = this.#pending ? `${this.#pending}\n${line}` : line;
    this.#execute(source, { record: true });
  }

  async #execute(source, { record }) {
    if (!source.trim()) {
      this.#pending = '';
      this.#prompt();
      return;
    }
    this.#running = true;
    this.#rl.setPrompt('');
    let result;
    try {
      await this.cli.refresh();
      result = await this.cli.run(source, { onStart: token => { this.#token = token; } });
    } catch (err) {
      // The kernel went away (or refused) between two lines: said, and the shell goes on
      process.stderr.write(`lilos: ${err.message}\n`);
      result = { status: 1 };
    }
    this.#token = null;
    this.#running = false;
    if (result.exit !== undefined) return this.#finish(result.exit);
    this.#pending = result.incomplete ? source : '';
    if (!result.incomplete) this.#status = result.status;
    if (record && !result.incomplete) this.#remember(source);
    // Output without a final newline: the prompt on a line of its own
    if (this.tail) { process.stdout.write('\n'); this.tail = ''; }
    if (!this.#rl) this.#open();   // Ctrl+D ended a command's input: a new line editor
    if (this.#queue.length) return this.#submit(this.#queue.shift());
    this.#prompt();
  }

  #remember(source) {
    const entry = source.trim();
    if (!entry || source.startsWith(' ') || this.#history.at(-1) === entry) return;
    this.#history = [...this.#history.filter(h => h !== entry), entry].slice(-HISTORY_MAX);
    try {
      mkdirSync(configDir(), { recursive: true, mode: 0o700 });
      if (this.#history.length >= HISTORY_MAX) writeFileSync(historyFile(), `${this.#history.join('\n')}\n`, { mode: 0o600 });
      else appendFileSync(historyFile(), `${entry.replace(/\n/g, ' ')}\n`, { mode: 0o600 });
    } catch { /* the history is a convenience */ }
  }

  /** A command reads a line from the keyboard: typed ahead, or waiting for Enter. */
  readInput(reader) {
    if (this.#queue.length) return Promise.resolve(`${this.#queue.shift()}\n`);
    if (!this.#rl) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      const off = this.#token?.onAbort(() => { this.#reader = null; this.#muted = false; reject(new Interrupt()); });
      this.#reader = {
        silent: reader.silent,
        resolve: v => { off?.(); resolve(v); },
        reject: e => { off?.(); reject(e); },
      };
      // What the command wrote last is the line's prompt: drawn again by the line editor, which
      // keeps it when the line is redrawn (backspace, arrows)
      this.#rl.setPrompt(this.tail);
      if (this.tail) process.stdout.write('\r\x1b[2K');
      this.tail = '';
      this.#rl.prompt(true);
      this.#muted = !!reader.silent;
    });
  }

  #interrupt() {
    if (this.#running) {
      process.stdout.write('^C\n');
      this.#token?.abort();
      return;
    }
    process.stdout.write('^C\n');
    this.#pending = '';
    this.#rl.write(null, { ctrl: true, name: 'u' });
    this.#prompt();
  }

  /** Ctrl+D: the end of a command's input while it reads, else the end of the shell. */
  #closed(rl) {
    if (this.#rl !== rl) return;
    this.#rl = null;
    if (this.#reader) {
      const r = this.#reader;
      this.#reader = null;
      this.#muted = false;
      process.stdout.write('\n');
      r.resolve(null);
      return;
    }
    if (this.#running) return;
    process.stdout.write('\n');
    this.#finish(this.#status);
  }

  #finish(code) {
    const rl = this.#rl;
    this.#rl = null;
    rl?.close();
    this.#done?.(code);
    this.#done = null;
  }

  #complete(line, done) {
    try {
      const { start, items } = complete(this.cli.shell, line, line.length);
      const values = items.map(i => i.value);
      // One file found: a space after it, as Terminale does (a folder keeps its /)
      if (items.length === 1 && !items[0].value.endsWith('/')) values[0] += ' ';
      done(null, [values, line.slice(start)]);
    } catch {
      done(null, [[], line]);
    }
  }
}
