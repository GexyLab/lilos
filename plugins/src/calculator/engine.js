/**
 * The calculator's logic, without DOM: a desk calculator with immediate execution
 * (2 + 3 × 4 = gives 20). `press(key)` takes one of KEYS and changes the state; `view()`
 * gives what to show.
 *
 *   digits '0'…'9' and '.'          the number being typed (at most MAX_DIGITS digits)
 *   '+' '-' '*' '/'                 an operation: computes the pending one first
 *   '='                             the result; pressed again, repeats the last operation (5 + 3 = = → 11)
 *   '%'                             after + or −, that percent of the first number (200 + 10 % → 200 + 20);
 *                                   after × or ÷, or alone, the number divided by 100
 *   'sqr' 'sqrt' 'neg'              square, square root, change of sign of the number shown
 *   'back' 'ce' 'c'                 last digit off, number shown to 0, everything to 0
 *
 * Results keep 15 significant digits, so 0.1 + 0.2 gives 0.3. An error (division by zero,
 * root of a negative number, a result too big) stays shown until a digit, C, CE or ⌫.
 */
export const MAX_DIGITS = 16;
export const OPERATORS = ['+', '-', '*', '/'];
export const KEYS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', ...OPERATORS, '=', '%', 'sqr', 'sqrt', 'neg', 'back', 'ce', 'c'];

const tidy = x => (x === 0 ? 0 : Number.parseFloat(x.toPrecision(15)));

/** a op b, or an error code: 'divZero', 'undefined' (0 ÷ 0), 'overflow'. */
function apply(a, op, b) {
  if (op === '/' && b === 0) return { error: a === 0 ? 'undefined' : 'divZero' };
  const r = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : a / b;
  return Number.isFinite(r) ? { value: tidy(r) } : { error: 'overflow' };
}

export class Calculator {
  constructor() { this.c(); }

  /** Everything back to 0, also the operation that '=' repeats. */
  c() {
    this.acc = null;        // first number of the pending operation
    this.accLabel = null;   // how it was obtained (see `label`), for the line above
    this.op = null;         // pending operation
    this.value = 0;         // number shown
    this.text = null;       // the number as typed ('0.50'), while typing
    this.label = null;      // how the number shown was obtained: { fn, arg } or a number, or null
    this.operand = false;   // with an operation pending: the second number has been given
    this.done = false;      // the last key was '='
    this.last = null;       // { op, b } that '=' repeats
    this.expr = [];         // the line above: numbers, labels, operators and '='
    this.error = null;
  }

  press(key) {
    if (!KEYS.includes(key)) return false;
    if (this.error) {
      if (key === 'c' || key === 'ce' || key === 'back') return this.c(), true;
      if (/^[\d.]$/.test(key)) this.c();
      else return false;
    }
    if (/^[\d.]$/.test(key)) return this.#digit(key);
    if (OPERATORS.includes(key)) return this.#operator(key);
    if (key === '=') return this.#equals();
    if (key === '%') return this.#percent();
    if (key === 'sqr' || key === 'sqrt' || key === 'neg') return this.#unary(key);
    if (key === 'back') return this.#back();
    if (key === 'ce') return this.#clearEntry();
    return this.c(), true;
  }

  /** Whether a number is being typed now (so ⌫ and ± work on its digits). */
  get typing() { return this.text !== null; }

  /** What to show: `value`, `text` (as typed, if typing), `expr` (the line above), `op` (pending, without its second number), `error`. */
  view() {
    const expr = [...this.expr];
    if (!this.done && this.label !== null) expr.push(this.label);
    return { value: this.value, text: this.text, expr, op: this.op && !this.operand ? this.op : null, error: this.error };
  }

  #fail(error) {
    this.c();
    this.error = error;
    return true;
  }

  /** The number shown becomes `value`, obtained as `label`; it is the second number of the pending operation. */
  #set(value, label) {
    if (this.done) { this.expr = []; this.done = false; }
    this.value = value;
    this.text = null;
    this.label = label;
    if (this.op) this.operand = true;
    return true;
  }

  #digit(d) {
    if (this.done) {
      const last = this.last;
      this.c();
      this.last = last;   // 2 + 3 = then 7 = gives 10
    }
    if (!this.typing) {
      this.text = d === '.' ? '0.' : d;
    } else {
      if (d === '.' && this.text.includes('.')) return false;
      if (this.text.replace(/[-.]/g, '').length >= MAX_DIGITS) return false;
      if (d !== '.' && /^-?0$/.test(this.text)) this.text = this.text.slice(0, -1) + d;
      else this.text += d;
    }
    this.value = Number(this.text);
    this.label = null;
    if (this.op) this.operand = true;
    return true;
  }

  #operator(op) {
    if (this.op && this.operand) {
      const r = apply(this.acc, this.op, this.value);
      if (r.error) return this.#fail(r.error);
      this.value = r.value;
      this.label = null;
    } else if (this.op) {
      this.op = op;
      this.expr[this.expr.length - 1] = op;
      return true;
    }
    this.acc = this.value;
    this.accLabel = this.op ? null : this.label;
    this.op = op;
    this.expr = [this.accLabel ?? this.acc, op];
    this.text = null;
    this.label = null;
    this.operand = false;
    this.done = false;
    return true;
  }

  #equals() {
    let a, op, b;
    if (this.op) {
      a = this.accLabel ?? this.acc;
      op = this.op;
      b = this.operand ? this.value : this.acc;   // 5 + = gives 10
      const r = apply(this.acc, op, b);
      if (r.error) return this.#fail(r.error);
      this.expr = [a, op, this.operand ? (this.label ?? b) : b, '='];
      this.last = { op, b };
      this.value = r.value;
    } else if (this.last) {
      ({ op, b } = this.last);
      const r = apply(this.value, op, b);
      if (r.error) return this.#fail(r.error);
      this.expr = [this.label ?? this.value, op, b, '='];
      this.value = r.value;
    } else {
      this.expr = [this.label ?? this.value, '='];
    }
    this.acc = null;
    this.accLabel = null;
    this.op = null;
    this.operand = false;
    this.text = null;
    this.label = null;
    this.done = true;
    return true;
  }

  #percent() {
    const additive = this.op === '+' || this.op === '-';
    const v = tidy(additive ? this.acc * this.value / 100 : this.value / 100);
    return this.#set(v, v);
  }

  #unary(fn) {
    if (fn === 'neg' && this.typing && !this.done) {
      if (/^-?0$/.test(this.text)) return false;
      this.text = this.text.startsWith('-') ? this.text.slice(1) : `-${this.text}`;
      this.value = Number(this.text);
      return true;
    }
    const x = this.value;
    if (fn === 'sqrt' && x < 0) return this.#fail('invalid');
    const v = fn === 'sqrt' ? tidy(Math.sqrt(x)) : fn === 'sqr' ? tidy(x * x) : -x || 0;
    if (!Number.isFinite(v)) return this.#fail('overflow');
    return this.#set(v, { fn, arg: this.done ? x : (this.label ?? x) });
  }

  #back() {
    if (this.done) { this.expr = []; return true; }
    if (!this.typing) return false;
    this.text = this.text.slice(0, -1);
    if (this.text === '' || this.text === '-') this.text = '0';
    this.value = Number(this.text);
    return true;
  }

  #clearEntry() {
    if (this.done) return this.c(), true;
    this.text = '0';   // 5 + CE = gives 5
    this.value = 0;
    this.label = null;
    if (this.op) this.operand = true;
    return true;
  }
}
