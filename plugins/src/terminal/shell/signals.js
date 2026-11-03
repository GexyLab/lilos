/**
 * What unwinds the interpreter: control flow (break, continue, return, exit), Ctrl+C, a closed pipe.
 * They are thrown and caught by the construct they belong to (a loop, a function, the shell).
 */
export class BreakSignal { constructor(levels = 1) { this.levels = levels; } }
export class ContinueSignal { constructor(levels = 1) { this.levels = levels; } }
export class ReturnSignal { constructor(code) { this.code = code; } }
export class ExitSignal { constructor(code) { this.code = code; } }

/** Ctrl+C (or kill): the job stops with status 130. */
export class Interrupt { code = 130; }

/** Writing to a pipe nobody reads any more (`yes | head`): the writer stops with status 141. */
export class BrokenPipe { code = 141; }

/** The source ends in the middle of a construct (open quote, `if` without `fi`…): more lines are needed. */
export class Incomplete extends Error {}

/** Syntax error. */
export class ParseError extends Error {}

/** An error of the shell that ends the command with a message and a status (`cd: x: non esiste`). */
export class ShellError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.code = code;
  }
}

/**
 * Cancellation of a job: Ctrl+C aborts the foreground one, `kill` any. Subshells and pipelines
 * share the token of their job.
 */
export class Token {
  aborted = false;
  #listeners = new Set();

  abort() {
    if (this.aborted) return;
    this.aborted = true;
    for (const fn of this.#listeners) fn();
    this.#listeners.clear();
  }

  /** Calls fn once when aborted; returns the function that stops listening. */
  onAbort(fn) {
    if (this.aborted) { fn(); return () => {}; }
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  check() {
    if (this.aborted) throw new Interrupt();
  }
}
