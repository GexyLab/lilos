/**
 * The consoles of one program: lines kept in memory (the last `keep` of each), and the questions
 * of the «Leggi da console» blocks, one at a time per console (the others wait in line).
 *
 * Whoever shows them (the IDE's panel, lilOS's console windows) listens: on(event) with
 *   'line'  { console, line }           line: { at, level, text }
 *   'clear' { console }
 *   'ask'   { console, ask }            ask: { id, prompt, kind, secret, fallback } (the first in line)
 *   'done'  { console, id, answer }     a question answered or cancelled
 */

const KINDS = new Set(['text', 'number', 'bool', 'key']);
const YES = new Set(['sì', 'si', 's', 'yes', 'y', 'true', '1', 'vero', 'on']);
const NO = new Set(['no', 'n', 'false', '0', 'falso', 'off']);
const MAX_LINE = 4000;

export class Consoles {
  #list = new Map();     // id → { id, name, color, keep, lines: [], asks: [], second: 0, dropped: 0 }
  #listeners = new Set();
  #options;
  #nextAsk = 1;

  /**
   * @param {object} settings   spec.consoles: { list, outside, … }
   * @param {object} options    { perSecond, hidden: bool (no one will see them: questions get their fallback), log(line, console) }
   */
  constructor(settings, options) {
    this.settings = settings;
    this.#options = options;
    for (const c of settings.list) this.#list.set(c.id, { ...c, lines: [], asks: [], second: 0, count: 0, dropped: 0 });
  }

  on(fn) { this.#listeners.add(fn); return () => this.#listeners.delete(fn); }
  #tell(event, data) { for (const fn of this.#listeners) { try { fn(event, data); } catch { /* a listener gone wrong */ } } }

  /** A console by id; an unknown one is the main one (its console was removed from the project). */
  #get(id) { return this.#list.get(id) ?? this.#list.get('main'); }

  /** Everything, for a panel that just opened. */
  state() {
    return [...this.#list.values()].map(c => ({
      id: c.id, name: c.name, color: c.color, main: c.main, lines: c.lines.slice(),
      ask: c.asks[0] ? publicAsk(c.asks[0]) : null, waiting: c.asks.length,
    }));
  }

  write(id, text, level = 'normal') {
    const c = this.#get(id);
    // More than perSecond lines a second: counted, said once in a while
    const now = Date.now(), second = Math.floor(now / 1000);
    if (c.second !== second) {
      if (c.dropped) this.#push(c, { at: now, level: 'warning', text: `… ${c.dropped} righe non mostrate (troppe al secondo)` });
      c.second = second; c.count = 0; c.dropped = 0;
    }
    if (++c.count > this.#options.perSecond) { c.dropped++; return; }
    this.#push(c, { at: now, level: ['info', 'warning', 'error'].includes(level) ? level : 'normal', text: String(text).slice(0, MAX_LINE) });
  }

  #push(c, line) {
    c.lines.push(line);
    if (c.lines.length > c.keep) c.lines.splice(0, c.lines.length - c.keep);
    this.#tell('line', { console: c.id, line });
    this.#options.log?.(line, c);
  }

  clear(id) {
    const c = this.#get(id);
    c.lines.length = 0;
    this.#tell('clear', { console: c.id });
  }

  /**
   * A question. Resolves { value } or { cancelled: true }. With the consoles hidden (no one would
   * see it) it gets its fallback at once, or is cancelled.
   */
  read(id, { prompt = '', kind = 'text', secret = false, retry = true, fallback = null, timeoutMs = 0 } = {}) {
    const c = this.#get(id);
    const ask = { id: this.#nextAsk++, prompt: String(prompt).slice(0, 500), kind: KINDS.has(kind) ? kind : 'text', secret: !!secret, retry: retry !== false, fallback: fallback === undefined ? null : fallback, timer: null };
    if (this.#options.hidden) {
      const parsed = ask.fallback !== null ? parse(ask.kind, String(ask.fallback)) : null;
      return Promise.resolve(parsed ? { value: parsed.value } : { cancelled: true });
    }
    return new Promise(resolve => {
      ask.resolve = resolve;
      c.asks.push(ask);
      if (timeoutMs > 0) ask.timer = setTimeout(() => this.#finish(c, ask, { cancelled: true, reason: 'timeout' }), timeoutMs);
      if (c.asks[0] === ask) this.#show(c, ask);
    });
  }

  #show(c, ask) {
    if (ask.prompt) this.#push(c, { at: Date.now(), level: 'ask', text: ask.prompt });
    this.#tell('ask', { console: c.id, ask: publicAsk(ask) });
  }

  /**
   * An answer typed in a console (any open copy of it: the first one counts). Returns 'ok',
   * 'again' (not valid, asked again) or 'stale' (that question was already answered).
   */
  answer(id, askId, raw) {
    const c = this.#list.get(id);
    const ask = c?.asks[0];
    if (!ask || ask.id !== askId) return 'stale';
    const shown = ask.secret ? '•'.repeat(Math.min(12, String(raw ?? '').length)) : String(raw ?? '');
    this.#push(c, { at: Date.now(), level: 'answer', text: shown });
    const parsed = parse(ask.kind, String(raw ?? ''));
    if (!parsed) {
      const msg = { number: 'Serve un numero.', bool: 'Serve sì o no.', key: 'Serve un tasto.', text: 'Risposta non valida.' }[ask.kind];
      if (ask.retry) {
        this.#push(c, { at: Date.now(), level: 'warning', text: `${msg} Riprova.` });
        this.#show(c, ask);
        return 'again';
      }
      this.#finish(c, ask, { cancelled: true, reason: 'invalid' });
      return 'ok';
    }
    this.#finish(c, ask, { value: parsed.value });
    return 'ok';
  }

  /** Esc in a console, or the program stopping: the question goes out of «annullato». */
  cancel(id, askId) {
    const c = this.#list.get(id);
    const ask = c?.asks.find(a => a.id === askId);
    if (ask) this.#finish(c, ask, { cancelled: true, reason: 'cancel' });
  }

  close() {
    for (const c of this.#list.values()) for (const ask of [...c.asks]) this.#finish(c, ask, { cancelled: true, reason: 'stop' });
    this.#listeners.clear();
  }

  #finish(c, ask, answer) {
    const i = c.asks.indexOf(ask);
    if (i < 0) return;
    c.asks.splice(i, 1);
    clearTimeout(ask.timer);
    ask.resolve(answer);
    this.#tell('done', { console: c.id, id: ask.id, answer: answer.cancelled ? { cancelled: true } : { ok: true } });
    if (i === 0 && c.asks[0]) this.#show(c, c.asks[0]);
  }
}

const publicAsk = a => ({ id: a.id, prompt: a.prompt, kind: a.kind, secret: a.secret, fallback: a.fallback });

/** An answer as its kind: { value } or null when it is not one. */
export function parse(kind, raw) {
  const s = raw.trim();
  switch (kind) {
    case 'number': {
      if (!/^[-+]?(\d+([.,]\d*)?|[.,]\d+)([eE][-+]?\d+)?$/.test(s)) return null;
      return { value: Number(s.replace(',', '.')) };
    }
    case 'bool': {
      const l = s.toLowerCase();
      return YES.has(l) ? { value: true } : NO.has(l) ? { value: false } : null;
    }
    case 'key': return raw.length ? { value: [...raw][0] } : null;
    default: return { value: raw };
  }
}
