import { h } from '../../core/dom.js';
import { Emitter } from '../../core/events.js';

/**
 * The consoles of a running program (Logic Studio): what the blocks Scrivi in console write and
 * the questions of Leggi da console.
 *
 *   const store = new LogicConsoles(live);          // live: logic.live(id)
 *   const view = new LogicConsoleView(store, { console: 'main', labels });   el.append(view.el)
 *   view.show(null)                                  // every console together, each line with its console
 *
 * LogicConsoles keeps the lines (from 'hello' and the 'console' events) and tells 'change'
 * { console } and 'ask' { console, ask } / 'done' { console }; answer(console, value) answers the
 * question shown, cancel(console) takes it back (Esc).
 */
export class LogicConsoles extends Emitter {
  #live;
  #list = new Map();   // id → { id, name, color, main, lines: [], ask }
  #off = [];

  constructor(live) {
    super();
    this.#live = live;
    const onHello = ({ consoles }) => {
      this.#list.clear();
      for (const c of consoles ?? []) this.#list.set(c.id, { ...c, lines: c.lines ?? [], ask: c.ask ?? null });
      this.emit('change', { console: null });
      for (const c of this.#list.values()) if (c.ask) this.emit('ask', { console: c.id, ask: c.ask });
    };
    const onConsole = msg => {
      const c = this.#list.get(msg.console);
      if (!c) return;
      if (msg.event === 'line') { c.lines.push(msg.line); if (c.lines.length > 2000) c.lines.splice(0, c.lines.length - 2000); }
      else if (msg.event === 'clear') c.lines = [];
      else if (msg.event === 'ask') { c.ask = msg.ask; this.emit('ask', { console: c.id, ask: msg.ask }); }
      else if (msg.event === 'done') { if (c.ask?.id === msg.id) c.ask = null; this.emit('done', { console: c.id }); }
      this.emit('change', { console: c.id });
    };
    live.on('hello', onHello);
    live.on('console', onConsole);
    this.#off = [() => live.off('hello', onHello), () => live.off('console', onConsole)];
  }

  list() { return [...this.#list.values()]; }
  get(id) { return this.#list.get(id) ?? null; }
  /** The consoles waiting for an answer. */
  asking() { return this.list().filter(c => c.ask); }

  answer(id, value) {
    const c = this.#list.get(id);
    if (c?.ask) this.#live.answer(id, c.ask.id, String(value));
  }

  cancel(id) {
    const c = this.#list.get(id);
    if (c?.ask) this.#live.cancel(id, c.ask.id);
  }

  destroy() { this.#off.forEach(f => f()); this.#off = []; }
}

const TIME = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** One console (or all of them together), with the line where a question is answered. */
export class LogicConsoleView {
  el; #lines; #input; #field; #question; #hint;
  #store; #console; #labels; #off;

  constructor(store, { console = 'main', labels = {} } = {}) {
    this.#store = store;
    this.#console = console;
    this.#labels = { hint: 'Invio manda · Esc annulla', kinds: { text: 'testo', number: 'numero', bool: 'sì/no', key: 'un tasto' }, ...labels };
    this.#lines = h('div', { class: 'lgcon-lines', role: 'log', 'aria-live': 'polite' });
    this.#field = h('input', { type: 'text', autocomplete: 'off', spellcheck: false, 'aria-label': 'Risposta' });
    this.#question = h('span', { class: 'q' });
    this.#hint = h('span', { class: 'h' });
    this.#input = h('div', { class: 'lgcon-in', hidden: true }, this.#question, this.#field, this.#hint);
    this.el = h('div', { class: 'lgcon lgc-scope' }, this.#lines, this.#input);
    this.#field.addEventListener('keydown', e => {
      const c = this.#asking();
      if (!c) return;
      if (e.key === 'Enter') { store.answer(c.id, this.#field.value); this.#field.value = ''; e.preventDefault(); }
      else if (e.key === 'Escape') { store.cancel(c.id); this.#field.value = ''; e.preventDefault(); }
      else if (c.ask.kind === 'key' && e.key.length === 1) { store.answer(c.id, e.key); e.preventDefault(); }
    });
    const onChange = ({ console: id }) => { if (id === null || this.#console === null || id === this.#console) this.render(); };
    store.on('change', onChange);
    store.on('ask', onChange);
    store.on('done', onChange);
    this.#off = () => { store.off('change', onChange); store.off('ask', onChange); store.off('done', onChange); };
    this.render();
  }

  /** Which console: an id, or null for all together. */
  show(id) { this.#console = id; this.render(); }
  focus() { if (!this.#input.hidden) this.#field.focus(); }
  destroy() { this.#off(); this.el.remove(); }

  #asking() {
    if (this.#console !== null) { const c = this.#store.get(this.#console); return c?.ask ? c : null; }
    return this.#store.asking()[0] ?? null;
  }

  render() {
    const all = this.#console === null;
    const list = all ? this.#store.list() : [this.#store.get(this.#console)].filter(Boolean);
    const lines = all
      ? list.flatMap(c => c.lines.map(l => ({ l, c }))).sort((a, b) => a.l.at - b.l.at)
      : (list[0]?.lines ?? []).map(l => ({ l, c: list[0] }));
    const atBottom = this.#lines.scrollHeight - this.#lines.scrollTop - this.#lines.clientHeight < 24;
    this.#lines.replaceChildren(...lines.slice(-1000).map(({ l, c }) => h('div', { class: `lgcon-line ${l.level}` },
      h('span', { class: 't' }, TIME.format(l.at)),
      all && !c.main ? h('span', { class: 'src', style: `background:${c.color || '#6b7280'}` }, c.name) : null,
      l.text)));
    if (atBottom) this.#lines.scrollTop = this.#lines.scrollHeight;
    const c = this.#asking();
    this.#input.hidden = !c;
    if (c) {
      this.#question.textContent = `${all && !c.main ? `[${c.name}] ` : ''}${c.ask.prompt || ''} ›`;
      this.#field.type = c.ask.secret ? 'password' : 'text';
      this.#field.placeholder = c.ask.fallback !== null && c.ask.fallback !== undefined ? String(c.ask.fallback) : '';
      this.#hint.textContent = `${this.#labels.hint} · ${this.#labels.kinds[c.ask.kind] ?? c.ask.kind}`;
    }
  }
}
