import { stripVTControlCharacters } from 'node:util';
import { Reader, Writer } from '../../../src/terminal/shell/streams.js';

/**
 * Standard input and output of the computer for the Terminal's shell. Colors (the escape codes of
 * ls, grep, the prompt) only when the output is a terminal and --no-color was not given, as most
 * commands do; otherwise the plain text, ready for files and pipes of the computer.
 */
export class StreamWriter extends Writer {
  constructor(stream, { color }) {
    super();
    this.stream = stream;
    this.color = color;
  }

  write(text) {
    const s = String(text);
    if (!s) return;
    this.stream.write(this.color ? s : stripVTControlCharacters(s));
  }
}

/** The computer's stdin as it comes (a pipe, a file, or the keyboard of a command run once). */
export class StdinReader extends Reader {
  #chunks = null;

  async pull() {
    this.#chunks ??= process.stdin.setEncoding('utf8')[Symbol.asyncIterator]();
    const { value, done } = await this.#chunks.next();
    return done ? null : value;
  }
}

/** The keyboard of the interactive shell: lines from repl.js, which knows what is typed ahead. */
export class LineReader extends Reader {
  silent = false;

  constructor(repl) {
    super();
    this.repl = repl;
  }

  pull() { return this.repl.readInput(this); }
}
