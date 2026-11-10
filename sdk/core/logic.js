import { Emitter } from './events.js';
import { kernel } from './kernel.js';

/**
 * Logic Studio: the client of the engine (kernel module logicstudio-engine). Needs the kernel and
 * the module installed (available / installed()).
 *
 *   logic.catalog() → { version, packages: [{ name, version, label, blocks, components, hasComponents }] }
 *   logic.status() → { limits, quota, active, tests, net, log, admin }
 *   logic.programs({ all }) → [program]          mine (an admin: everyone's with all)
 *   logic.start({ kind: 'test'|'active', name, documents, source, lang, watch }) → program
 *   logic.stop(id) / forget(id) / program(id)
 *   logic.ui(id) → { 'window:component.port': value }   the last values its windows got
 *   logic.windows(id) → { name, main, windows, texts, entrypoints, consoles, options }   to open them
 *   logic.consoles(id) → [{ id, name, color, main, lines, ask, waiting }]
 *   logic.live(id) → LiveProgram                  the program live (WebSocket)
 *   logic.components(pack) → [component]          a package's Componenti UI, with render() (browser code)
 *   logic.logs({ program }) → [entry]
 *   logic.admin.users() / admin.setQuota(user, quota | null)
 *
 *   program  { id, owner, user, kind, name, source, status, error, started, stopped, consoles, windows, options }
 *            status 'starting' | 'running' | 'stopped' | 'failed' | 'waiting'
 *
 * Events: 'ask' { id, name, console } a program with no one watching asks for something;
 *         'failed' { id, name, error } an active program stopped on an error. The system tells
 *         it what the kernel streams (received(event, data)).
 */
const MODULE = 'logicstudio-engine';

/** A running program, live: what it does, and the way to talk to it. */
export class LiveProgram extends Emitter {
  #port;
  #closed = false;

  /**
   * Events: 'hello' { program, consoles, ui }; 'status' { status, error, reason }; 'values' { values }
   * ('schema/block.port' → value); 'states' { states } ('schema/block' → 'run'|'idle'|'error');
   * 'ui' { window, component, port, value }; 'console' { event: 'line'|'clear'|'ask'|'done', console, … };
   * 'answered' { ask, result }; 'error' { message }; 'gone' (the connection closed).
   */
  constructor(port) {
    super();
    this.#port = port;
    port.onmessage = e => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.t === 'gone') { this.#closed = true; this.emit('gone', msg); return; }
      if (msg.t.startsWith('console.')) { const { t, ...rest } = msg; this.emit('console', { event: t.slice(8), ...rest }); return; }
      const { t, ...rest } = msg;
      this.emit(t, rest);
    };
  }

  get closed() { return this.#closed; }

  #send(msg) { if (!this.#closed) this.#port.postMessage(JSON.stringify(msg)); }

  /** A value on an input of a block (the IDE's test panel). */
  input(schema, block, port, value) { this.#send({ t: 'input', schema, block, port, value }); }
  /** The user acted on a Componente UI. */
  component(window, component, port, value) { this.#send({ t: 'component', window, component, port, value }); }
  answer(console, ask, value) { this.#send({ t: 'answer', console, ask, value }); }
  cancel(console, ask) { this.#send({ t: 'cancel', console, ask }); }

  close() {
    if (this.#closed) return;
    this.#closed = true;
    this.#port.detach?.();
    this.#port.close?.();
  }
}

class Logic extends Emitter {
  #catalog = null;
  #components = new Map();   // 'pack@version' → Promise<[component]>
  #api = null;

  get available() { return kernel.connected; }

  get #m() { return (this.#api ??= kernel.module(MODULE)); }

  /** A request with a query (kernel.module() takes paths only): /modules/<engine><path>?<query>. */
  #withQuery(method, path, query) {
    const q = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
    return q ? kernel.request(method, `/modules/${MODULE}${path}?${q}`) : this.#m.request(method, path);
  }

  /** Whether the engine answers (installed and started). */
  async installed() {
    try { await this.status(); return true; } catch { return false; }
  }

  async catalog({ fresh = false } = {}) {
    if (!this.#catalog || fresh) this.#catalog = await this.#m.request('GET', '/catalog');
    return this.#catalog;
  }

  status() { return this.#m.request('GET', '/status'); }
  programs({ all = false } = {}) { return this.#withQuery('GET', '/programs', { all: all ? '1' : null }); }
  start(options) { return this.#m.request('POST', '/programs', options); }
  program(id) { return this.#m.request('GET', `/programs/${encodeURIComponent(id)}`); }
  stop(id) { return this.#m.request('DELETE', `/programs/${encodeURIComponent(id)}`); }
  forget(id) { return this.#withQuery('DELETE', `/programs/${encodeURIComponent(id)}`, { forget: '1' }); }
  ui(id) { return this.#m.request('GET', `/programs/${encodeURIComponent(id)}/ui`); }
  /** What opening its windows needs: { id, name, main, windows: { name: .lsui }, texts, entrypoints, consoles, options }. */
  windows(id) { return this.#m.request('GET', `/programs/${encodeURIComponent(id)}/windows`); }
  consoles(id) { return this.#m.request('GET', `/programs/${encodeURIComponent(id)}/consoles`); }
  logs({ program } = {}) { return this.#withQuery('GET', '/logs', { program }); }

  live(id) { return new LiveProgram(this.#m.channel(`/live/${id}`)); }

  admin = Object.freeze({
    users: () => this.#m.request('GET', '/admin/users'),
    setQuota: (user, quota) => this.#m.request('PUT', `/admin/quotas/${encodeURIComponent(user)}`, quota),
  });

  /**
   * The Componenti UI of a package, with their browser code: render(el, c) and the rest. The
   * engine serves the package's components.js; it imports nothing (what it needs comes in `c`).
   */
  async components(pack) {
    const cat = await this.catalog();
    const p = cat.packages.find(x => x.name === pack);
    if (!p?.hasComponents) return [];
    const key = `${p.name}@${p.version}`;
    if (!this.#components.has(key)) {
      const url = `/api/modules/${MODULE}/components/${encodeURIComponent(p.name)}?v=${encodeURIComponent(p.version)}`;
      this.#components.set(key, import(/* @vite-ignore */ url).then(m => {
        // A package's own styles (CSS text), once in the page
        if (typeof m.styles === 'string' && !document.querySelector(`style[data-logic-pack="${p.name}"]`)) {
          document.head.append(Object.assign(document.createElement('style'), { textContent: m.styles, dataset: { logicPack: p.name } }));
        }
        return Array.isArray(m.components) ? m.components : [];
      }).catch(err => {
        this.#components.delete(key);
        throw err;
      }));
    }
    return this.#components.get(key);
  }

  /** Every component of every package, by type. */
  async allComponents() {
    const cat = await this.catalog();
    const out = new Map();
    for (const p of cat.packages.filter(x => x.hasComponents)) {
      for (const c of await this.components(p.name).catch(() => [])) out.set(c.type, c);
    }
    return out;
  }

  /** What the kernel streams for this module ('logicstudio.ask' | 'logicstudio.failed'). */
  received(event, data) {
    if (event === 'logicstudio.ask') this.emit('ask', data);
    else if (event === 'logicstudio.failed') this.emit('failed', data);
  }
}

export const logic = new Logic();
