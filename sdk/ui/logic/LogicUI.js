import { h } from '../../core/dom.js';
import { Emitter } from '../../core/events.js';
import { icon } from '../icons.js';
import * as controls from '../controls.js';

/**
 * A window of a Logic Studio project (.lsui) drawn with its Componenti UI, and bound to the
 * program running it. The components come from the packages (logic.allComponents()): each
 * has render(el, c) and gets everything it needs in `c` (it imports nothing).
 *
 *   const ui = new LogicUI({ window: doc.data, components, lang, texts, host, mode: 'live' });
 *   el.append(ui.el);
 *   ui.attach(live, 'Principale');     // values from the schemas, the user's actions to them
 *
 * mode: 'live' (working), 'design' (the editor: nothing reacts, the containers show where things
 * go) or 'preview' (working, not bound).
 * texts: { <text>: <translation> } the project's translations for the user's language.
 * host: what the components may ask of where the window is: { openWindow(name, values),
 *   closeWindow(), pickFile(options) → path, resourceUrl(path) → url, consoleView(id) → Node,
 *   charts } — each optional.
 *
 * Every component also has the inputs `enabled` and `visible`, handled here.
 * Events: 'action' { component, action, values } (a button with «Apri una finestra»…),
 *         'send' { component, port, value } (also when not attached: the preview)
 */
export class LogicUI extends Emitter {
  el;
  #window; #components; #lang; #texts; #host; #mode;
  #nodes = new Map();       // id → { node, def, el, listeners: Map(port → Set<fn>), last: Map(port → value) }
  #live = null; #liveOff = []; #name = '';

  constructor({ window, components, lang = 'en', texts = {}, host = {}, mode = 'live' } = {}) {
    super();
    this.#window = window;
    this.#components = components instanceof Map ? components : new Map(Object.entries(components ?? {}));
    this.#lang = lang;
    this.#texts = texts ?? {};
    this.#host = host ?? {};
    this.#mode = mode;
    this.el = h('div', { class: `lui lui-${mode}` });
    this.render();
  }

  get mode() { return this.#mode; }

  /** Draws the window again (its document changed). Values kept by the components are given back. */
  render(window = this.#window) {
    this.#window = window;
    const saved = new Map([...this.#nodes].map(([id, n]) => [id, n.last]));
    this.#nodes.clear();
    this.el.replaceChildren(this.#node(window.root, saved));
  }

  /** The element of a component (the editor selects it, draws its outline). */
  elementOf(id) { return this.#nodes.get(id)?.el ?? null; }

  #text(s) {
    if (typeof s !== 'string') return s;
    return Object.hasOwn(this.#texts, s) ? this.#texts[s] : s;
  }

  #node(node, saved) {
    const def = this.#components.get(node.type);
    const wrap = h('div', { class: `lui-c lui-${(node.type.split('.').pop() || 'c')}`, dataset: { id: node.id, type: node.type } });
    if (node.layout && this.#mode !== 'flow') {
      // inside an Area libera
      const { x = 0, y = 0, w, h: hh } = node.layout;
      wrap.style.cssText = `left:${x}px;top:${y}px;${w ? `width:${w}px;` : ''}${hh ? `height:${hh}px;` : ''}`;
    }
    if (!def) {
      wrap.classList.add('lui-missing');
      wrap.append(h('span', {}, icon('warning'), node.type));
      return wrap;
    }
    const entry = { node, def, el: wrap, listeners: new Map(), last: saved?.get(node.id) ?? new Map() };
    this.#nodes.set(node.id, entry);
    const self = this;
    const props = Object.freeze({ ...defaultsOf(def), ...(node.props ?? {}) });
    const c = Object.freeze({
      id: node.id, props, lang: this.#lang, design: this.#mode === 'design', mode: this.#mode,
      t: s => this.#text(s),
      h, icon, controls,
      host: this.#host,
      added: node.added ?? { inputs: [], outputs: [] },
      /** The user did something: to the schemas (and 'send' for whoever listens). */
      send(port, value) {
        if (self.#mode === 'design') return;
        self.emit('send', { component: node.id, port, value });
        self.#live?.component(self.#name, node.id, port, value);
        // A button's action, done here (it opens a window of the app, closes this one…)
        if (port === def.actionPort && props.action && props.action.kind && props.action.kind !== 'none') {
          self.emit('action', { component: node.id, action: props.action, values: {} });
        }
      },
      /** A value from the schemas on an input of the component. */
      on(port, fn) {
        const set = entry.listeners.get(port) ?? entry.listeners.set(port, new Set()).get(port);
        set.add(fn);
        if (entry.last.has(port)) fn(entry.last.get(port));
        return () => set.delete(fn);
      },
      /** A container's children, drawn into `into` (or returned). */
      children(into = null) {
        const els = (node.children ?? []).map(ch => self.#node(ch, saved));
        if (into) into.append(...els);
        return els;
      },
    });
    try {
      def.render(wrap, c);
    } catch (err) {
      wrap.classList.add('lui-missing');
      wrap.append(h('span', {}, icon('error'), `${node.type}: ${err.message}`));
    }
    // enabled / visible, for all
    const enabled = v => { wrap.classList.toggle('lui-off', v === false); wrap.inert = v === false && this.#mode !== 'design'; };
    const visible = v => { wrap.hidden = v === false && this.#mode !== 'design'; wrap.classList.toggle('lui-hidden', v === false); };
    c.on('enabled', enabled);
    c.on('visible', visible);
    if (props.enabled === false) enabled(false);
    if (props.visible === false) visible(false);
    return wrap;
  }

  /** A value for a component's input (from the engine, or the editor's preview). */
  deliver(component, port, value) {
    const entry = this.#nodes.get(component);
    if (!entry) return;
    entry.last.set(port, value);
    for (const fn of entry.listeners.get(port) ?? []) { try { fn(value); } catch { /* a component gone wrong */ } }
  }

  /** Binds to a running program: its values for this window, and the user's actions back to it. */
  attach(live, name) {
    this.detach();
    this.#live = live;
    this.#name = name;
    const prefix = `${name}:`;
    const apply = values => {
      for (const [key, value] of Object.entries(values ?? {})) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        const dot = rest.lastIndexOf('.');
        this.deliver(rest.slice(0, dot), rest.slice(dot + 1), value);
      }
    };
    const onHello = ({ ui }) => apply(ui);
    const onUi = ({ window, component, port, value }) => { if (window === name) this.deliver(component, port, value); };
    live.on('hello', onHello);
    live.on('ui', onUi);
    this.#liveOff = [() => live.off('hello', onHello), () => live.off('ui', onUi)];
    this.el.classList.add('lui-attached');
  }

  /** The last values the engine kept ({ 'window:component.port': value }), to show at once. */
  restore(values) {
    const prefix = `${this.#name}:`;
    for (const [key, value] of Object.entries(values ?? {})) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      const dot = rest.lastIndexOf('.');
      this.deliver(rest.slice(0, dot), rest.slice(dot + 1), value);
    }
  }

  detach() {
    this.#liveOff.forEach(f => f());
    this.#liveOff = [];
    this.#live = null;
    this.el.classList.remove('lui-attached');
  }

  destroy() { this.detach(); this.el.remove(); }
}

function defaultsOf(def) {
  const out = {};
  for (const p of def.props ?? []) if (p.default !== undefined) out[p.key] = p.default;
  return out;
}

/** The ports every component has besides its own: { inputs: [enabled, visible] }. */
export const COMMON_INPUTS = Object.freeze([
  { name: 'enabled', type: 'bool', label: { en: 'enabled', it: 'abilitato' } },
  { name: 'visible', type: 'bool', label: { en: 'visible', it: 'visibile' } },
]);
