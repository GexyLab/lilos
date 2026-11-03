import { BrokenPipe } from './signals.js';

/**
 * Standard input and output of commands. A Reader gives text in chunks (null at the end); a
 * Writer takes text. Pipes connect a writer to a reader with a bounded buffer, so `yes | head`
 * neither fills the memory nor runs forever: when the reader closes, the writer gets BrokenPipe.
 */
export class Reader {
  #buffer = '';
  #ended = false;

  /** Next chunk of text, or null at the end. Subclasses implement it. */
  async pull() { return null; }

  async read() {
    if (this.#buffer) {
      const chunk = this.#buffer;
      this.#buffer = '';
      return chunk;
    }
    if (this.#ended) return null;
    const chunk = await this.pull();
    if (chunk == null) this.#ended = true;
    return chunk;
  }

  /** Everything up to the end. */
  async readAll() {
    let text = '';
    for (let chunk; (chunk = await this.read()) != null;) text += chunk;
    return text;
  }

  /**
   * One line without its newline (or up to `delim`), or null at the end (a last line without
   * newline is a line).
   */
  async readLine(delim = '\n') {
    for (;;) {
      const nl = this.#buffer.indexOf(delim);
      if (nl >= 0) {
        const line = this.#buffer.slice(0, nl);
        this.#buffer = this.#buffer.slice(nl + delim.length);
        return line;
      }
      if (this.#ended) break;
      const chunk = await this.pull();
      if (chunk == null) { this.#ended = true; break; }
      this.#buffer += chunk;
    }
    if (!this.#buffer) return null;
    const line = this.#buffer;
    this.#buffer = '';
    return line;
  }

  /** Lines one at a time. */
  async *lines() {
    for (let line; (line = await this.readLine()) != null;) yield line;
  }

  /** The reader is not wanted any more (a pipe then breaks for its writer). */
  close() {}
}

export class StringReader extends Reader {
  #text;
  constructor(text) { super(); this.#text = String(text); }
  async pull() {
    const text = this.#text;
    this.#text = null;
    return text || null;
  }
}

export class EmptyReader extends Reader {}

export class Writer {
  write() {}
  /** Called once the command is done with it (a file is saved, a pipe ends). */
  async close() {}
}

export class NullWriter extends Writer {}

/** Collects what is written (command substitution, xargs input…). */
export class StringWriter extends Writer {
  text = '';
  write(text) { this.text += text; }
}

/** Calls fn for every write (the terminal). */
export class FnWriter extends Writer {
  constructor(fn) { super(); this.fn = fn; }
  write(text) { return this.fn(String(text)); }
}

const HIGH_WATER = 64 << 10;

/** A pipe: write to .writer, read from .reader. */
export function pipe() {
  const chunks = [];
  let size = 0, ended = false, broken = false;
  let wakeReader = null, wakeWriters = [];
  const wake = () => { wakeReader?.(); wakeReader = null; };
  const drain = () => { const w = wakeWriters; wakeWriters = []; w.forEach(f => f()); };

  class PipeWriter extends Writer {
    async write(text) {
      if (broken) throw new BrokenPipe();
      text = String(text);
      if (!text) return;
      chunks.push(text);
      size += text.length;
      wake();
      if (size > HIGH_WATER) await new Promise(r => wakeWriters.push(r));
      if (broken) throw new BrokenPipe();
    }
    async close() { ended = true; wake(); }
  }
  class PipeReader extends Reader {
    async pull() {
      while (!chunks.length) {
        if (ended || broken) return null;
        await new Promise(r => { wakeReader = r; });
      }
      const text = chunks.splice(0).join('');
      size = 0;
      drain();
      return text;
    }
    close() { broken = true; chunks.length = 0; size = 0; drain(); }
  }
  return { writer: new PipeWriter(), reader: new PipeReader() };
}
