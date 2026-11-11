/**
 * The executor of one program (a project, or a schema alone) inside a user's worker. Pure: it
 * knows nothing of threads, files or users. What it needs from outside comes from `host`:
 *
 *   host.call(action, args)            → Promise: an action of a package, made by the kernel as the user
 *   host.console(op, data)             → Promise | void: 'write' { console, level, text } | 'clear' { console }
 *                                        | 'read' { console, prompt, kind, secret, fallback, timeoutMs }
 *   host.ui(window, component, port, value)   a value for a Componente UI (proxy block → window)
 *   host.value(key, value)             a value passing on a port, for whoever watches (key 'schema/block.port')
 *   host.state(key, state)             a block's state changed: 'run' | 'idle' | 'error' (key 'schema/block');
 *                                      a group's too: 'run' (started) | 'idle' (key 'schema/group')
 *   host.fail(message)                 the program cannot go on (too many runs, a block too slow…)
 *   host.lang                          the user's language, for the labels
 *   host.thread?(spec, { name, exit }) a group that runs in a thread of its own: a handle { start(),
 *                                      run(schema, group), deliver(schema, block, port, value, pulse),
 *                                      stop() → Promise }, or null when no thread is free (it runs here)
 *   host.exit?(schema, block, port, value, pulse)   (inside such a thread) a value going out of the group
 *   host.unhandled?(schema, block, value)           (inside such a thread, without global catches of its own) an
 *                                      exception nobody linked: the program that made the thread handles it
 *
 * The spec (made and checked by project.js): { schemas: { <name>: { blocks, links, groups, exits? } },
 * projectLinks, limits }. A block: { id, type, v, config, ports: { <port>: { start, trigger } }, added,
 * pulses?: { in, out } }. A group: { id, name, blocks: [ids], thread }; its port «run» is reached as
 * a block's: [group, 'run']. In a group's thread, `entries`: [[block, port]] linked from outside it.
 * A block's run() and start() get b.linked(port): whether something is linked to that input of it
 * (a block may behave differently when an optional input is not used, e.g. core.value).
 *
 * How it runs (dataflow, as in OpenBack): a value arriving on an input is kept as that input's
 * value; if the input starts the block (all do, unless its `trigger` is false), the block's run()
 * is called with every input's latest value and its outputs go on along the links. Every block has
 * an output «error» (Exception): what run() throws goes there ({ message, block, type, schema, at }),
 * to the global catches (core.onError) if nothing is linked to it, else to the main console. Each block handles the values sent to it one at a time, in the order they
 * came; blocks go on independently (one waiting for the user does not stop the others).
 *
 * Pulses: a port of type pulse sends `true` and goes back to `false` at once. The input that gets a
 * pulse holds true for the run it starts, then false again (without starting the block); a pulse
 * input is not started by false (nor by null).
 *
 * Groups: the blocks of a group do not start with the program. They start when the group's «run»
 * gets a pulse: their start() (the blocks that go by themselves, as Valore), the start values of
 * their inputs, the loops, and a pulse on the links from «run» to the blocks inside. Every pulse on
 * «run» starts the group again from the beginning (its blocks stopped, their memory cleared; what
 * reached their inputs stays). With nothing linked to «run» the group never starts. A value that
 * reaches a block of a group not started stays on its input without starting it. A group with
 * `thread` runs in a worker of its own (host.thread): here its blocks are stubs that pass values on.
 */

const ERROR_PORT = 'error';
const RUN_PORT = 'run';
const YIELD_EVERY = 200;
const MIN_LOOP_MS = 10;
const GROUP_DEF = Object.freeze({
  type: 'group', role: 'group', label: { en: 'Group', it: 'Gruppo' },
  inputs: [{ name: RUN_PORT, type: 'pulse' }], outputs: [{ name: RUN_PORT, type: 'pulse' }],
});
const isOn = v => v !== false && v !== null && v !== undefined;

export class Program {
  #defs; #host; #limits; #blockLimits;
  #nodes = new Map();        // 'schema/block' → node (also 'schema/group' → the group's «run»)
  #groups = [];              // { key, schema, id, name, thread, members, nodes, node, running, gen, runLinked, remote }
  #steps = 0;
  #stopped = false;
  #runs = [];                // start times of the runs in the last 10 s
  #timers = new Set();
  #abort = new AbortController();
  #exports = new Map();      // 'schema:port' → [{ schema, block }] of core.schemaIn blocks to deliver to
  #components = new Map();   // 'window:component' → [node] proxies of that component
  #catchers = [];            // blocks with role 'catchAll' (core.onError): they get the unhandled exceptions
  #busy = 0;                 // ms spent running blocks in the current second (CPU governor)
  #busySince = 0;

  /**
   * @param {object} spec    the checked program
   * @param {Map} defs       type → block definition (from the packages' blocks.js)
   * @param {object} host    see above
   */
  constructor(spec, defs, host) {
    this.#defs = defs;
    this.#host = host;
    this.#limits = { runsPer10s: 10000, blockMs: 30000, cpuPercent: 100, ...spec.limits };
    this.#blockLimits = Object.freeze({ signalSamples: Number.isInteger(this.#limits.signalSamples) ? this.#limits.signalSamples : 65536 });
    for (const [schema, s] of Object.entries(spec.schemas)) {
      const links = s.links ?? [];
      const groups = new Map();
      for (const g of s.groups ?? []) {
        groups.set(g.id, {
          key: `${schema}/${g.id}`, schema, id: g.id, name: g.name ?? g.id, thread: !!g.thread, members: new Set(g.blocks ?? []),
          nodes: new Set(), node: null, running: false, gen: 0, remote: null,
          runLinked: links.some(l => l.to[0] === g.id && l.to[1] === RUN_PORT),
        });
      }
      this.#groups.push(...groups.values());
      const groupOf = id => [...groups.values()].find(g => g.members.has(id)) ?? null;
      for (const b of s.blocks) {
        const def = defs.get(b.type);
        if (!def) throw new Error(`Blocco sconosciuto: ${b.type}`);
        const node = this.#node(schema, b, def);
        node.grp = groupOf(b.id);
        node.grp?.nodes.add(node);
        this.#nodes.set(node.key, node);
      }
      for (const grp of groups.values()) {
        grp.node = this.#node(schema, { id: grp.id, label: grp.name }, GROUP_DEF);
        grp.node.group = grp;
        this.#nodes.set(grp.node.key, grp.node);
        // In a thread of its own (only when something can start it): here its blocks are stubs
        if (grp.thread && grp.runLinked) this.#threaded(grp, s);
      }
      // A link inside a group that runs in a thread of its own is made there, not here
      const within = (grp, l) => (l.from[0] === grp.id || grp.members.has(l.from[0])) && grp.members.has(l.to[0]);
      for (const l of links) {
        const from = this.#nodes.get(`${schema}/${l.from[0]}`);
        const to = this.#nodes.get(`${schema}/${l.to[0]}`);
        if (!from || !to) continue;
        to.linkedIn.add(l.to[1]);
        if ([...groups.values()].some(g => g.remote && within(g, l))) continue;
        (from.links.get(l.from[1]) ?? from.links.set(l.from[1], []).get(l.from[1])).push({ node: to, port: l.to[1] });
      }
      for (const [block, port] of s.entries ?? []) this.#nodes.get(`${schema}/${block}`)?.linkedIn.add(port);
      // Inside a group's thread: the ports whose values go out of the group, to the program that made it
      for (const [block, port] of s.exits ?? []) {
        const node = this.#nodes.get(`${schema}/${block}`);
        if (node) (node.links.get(port) ?? node.links.set(port, []).get(port)).push({ exit: true });
      }
    }
    // Schema ports: an Uscita di schema delivers to the Ingressi di schema linked in the project
    const inputs = new Map();
    for (const node of this.#nodes.values()) {
      if (node.def.role === 'schemaIn') inputs.set(`${node.schema}:${node.config.port}`, node);
      if (node.def.role === 'catchAll' && !node.grp?.remote) this.#catchers.push(node);
      if (node.def.role === 'component') {
        const key = `${node.config.window}:${node.config.component}`;
        (this.#components.get(key) ?? this.#components.set(key, []).get(key)).push(node);
      }
    }
    for (const l of spec.projectLinks ?? []) {
      const target = inputs.get(`${l.to.schema}:${l.to.port}`);
      if (!target) continue;
      const key = `${l.from.schema}:${l.from.port}`;
      (this.#exports.get(key) ?? this.#exports.set(key, []).get(key)).push(target);
    }
  }

  get stopped() { return this.#stopped; }

  #node(schema, b, def) {
    const config = { ...defaultsOf(def), ...(b.config ?? {}) };
    const added = { inputs: b.added?.inputs ?? [], outputs: b.added?.outputs ?? [] };
    const pulses = b.pulses ?? {
      in: [...(def.inputs ?? []).filter(p => p.type === 'pulse').map(p => p.name), ...(def.grow?.inputs?.type === 'pulse' ? added.inputs.map(p => p.id) : [])],
      out: [...(def.outputs ?? []).filter(p => p.type === 'pulse').map(p => p.name), ...(def.grow?.outputs?.type === 'pulse' ? added.outputs.map(p => p.id) : [])],
    };
    const node = {
      key: `${schema}/${b.id}`, schema, id: b.id, def, config, label: b.label ?? null,
      ports: b.ports ?? {}, added,
      pulseIn: new Set(pulses.in ?? []), pulseOut: new Set(pulses.out ?? []), pulsed: new Set(),
      values: {}, links: new Map(), linkedIn: new Set(), memory: {}, timers: new Set(), inbox: [], pumping: false, failed: false,
      grp: null,       // the group it is in
      group: null,     // (the «run» of a group) its group
      remote: null,    // (a block of a group in a thread of its own) that thread
    };
    node.ctx = this.#context(node);
    return node;
  }

  /** A group that runs in a thread of its own: the spec of that thread, and its handle. */
  #threaded(grp, s) {
    if (typeof this.#host.thread !== 'function') return;
    const inside = id => grp.members.has(id);
    const blocks = s.blocks.filter(b => inside(b.id));
    const links = (s.links ?? []).filter(l => (l.from[0] === grp.id || inside(l.from[0])) && inside(l.to[0]));
    const exits = [], entries = [];
    for (const l of s.links ?? []) {
      if (inside(l.from[0]) && !inside(l.to[0]) && !exits.some(([b, p]) => b === l.from[0] && p === l.from[1])) exits.push([l.from[0], l.from[1]]);
      if (!inside(l.from[0]) && l.from[0] !== grp.id && inside(l.to[0])) entries.push([l.to[0], l.to[1]]);
    }
    const spec = {
      schemas: { [grp.schema]: { blocks, links, exits, entries, groups: [{ id: grp.id, name: grp.name, blocks: [...grp.members], thread: false }] } },
      projectLinks: [], limits: this.#limits,
    };
    const handle = this.#host.thread(spec, {
      name: grp.name,
      exit: (schema, block, port, value, pulse) => {
        const node = this.#nodes.get(`${schema}/${block}`);
        if (node && node.grp === grp) this.#emit(node, port, value, pulse);
      },
      unhandled: (schema, block, value) => {
        const node = this.#nodes.get(`${schema}/${block}`);
        if (node && node.grp === grp) this.#unhandled(node, value);
      },
    });
    if (!handle) {
      this.#host.console('write', { console: 'main', level: 'warning', text: `${grp.name}: nessun thread libero, il gruppo gira nel thread del programma` });
      return;
    }
    grp.remote = handle;
  }

  /** What a block gets as its second argument. */
  #context(node) {
    const program = this;
    return Object.freeze({
      id: node.id,
      schema: node.schema,
      config: node.config,
      get added() { return { inputs: node.added.inputs.map(p => ({ ...p, value: node.values[p.id] })), outputs: node.added.outputs.map(p => ({ ...p })) }; },
      get lang() { return program.#host.lang ?? 'en'; },
      get signal() { return program.#abort.signal; },
      memory: () => node.memory,
      linked: port => node.linkedIn.has(port),
      send: (port, value) => program.#emit(node, port, value),
      setTimeout: (fn, ms) => program.#timer(node, fn, ms, false),
      setInterval: (fn, ms) => program.#timer(node, fn, ms, true),
      clearTimer: id => program.#clear(node, id),
      call: (action, args) => program.#host.call(action, args),
      console: Object.freeze({
        write: (console, text, level = 'normal') => program.#host.console('write', { console, text: String(text), level }),
        clear: console => program.#host.console('clear', { console }),
        read: (console, options = {}) => program.#host.console('read', { console, ...options }),
      }),
      exportPort: (port, value) => program.#export(node, port, value),
      ui: (port, value) => program.#host.ui(node.config.window, node.config.component, port, value),
      now: () => Date.now(),
      // what blocks may read of the limits (b.limits.signalSamples: the longest signal of logicstudio-signals)
      limits: program.#blockLimits,
    });
  }

  /** Starts the blocks out of the groups: start() of each, the start values of their inputs, the loops. */
  async start() {
    for (const grp of this.#groups) {
      for (const node of grp.nodes) node.remote = grp.remote;
      grp.remote?.start();
      this.#host.state(grp.key, 'idle');
    }
    await this.#startNodes([...this.#nodes.values()].filter(n => !n.grp && !n.group));
  }

  async #startNodes(nodes) {
    for (const node of nodes) {
      if (typeof node.def.start === 'function') await this.#guarded(node, () => node.def.start(node.ctx));
    }
    for (const node of nodes) {
      for (const [port, p] of Object.entries(node.ports)) {
        if (p && p.start !== undefined && p.start !== null) this.#enqueue(node, port, p.start);
      }
      if (node.def.execution === 'loop') this.#loop(node);
    }
  }

  /** A pulse on a group's «run»: its blocks start (again, from the beginning). */
  async runGroup(schema, id) {
    const grp = this.#groups.find(g => g.schema === schema && g.id === id);
    if (!grp || this.#stopped) return false;
    if (grp.remote) { grp.remote.run(schema, id); return true; }
    if (grp.running) await this.#haltGroup(grp);
    if (this.#stopped) return false;
    grp.running = true;
    grp.gen++;
    this.#host.state(grp.key, 'run');
    await this.#startNodes([...grp.nodes]);
    this.#emit(grp.node, RUN_PORT, true, true);
    return true;
  }

  /** Stops a group's blocks (before it starts again): timers, queued values, stop(), memory. */
  async #haltGroup(grp) {
    grp.running = false;
    grp.gen++;
    for (const node of grp.nodes) {
      for (const t of node.timers) { clearTimeout(t.handle); clearInterval(t.handle); this.#timers.delete(t); }
      node.timers.clear();
      node.inbox.length = 0;
    }
    for (const node of grp.nodes) {
      if (typeof node.def.stop === 'function') {
        try { await withTimeout(Promise.resolve(node.def.stop(node.ctx)), 2000); } catch { /* starting again anyway */ }
      }
      node.memory = {};
      node.failed = false;
    }
  }

  /** Stops everything: timers, loops, pending reads (they get «annullato»), stop() of the blocks, the groups' threads. */
  async stop(reason = null) {
    if (this.#stopped) return;
    this.#stopped = true;
    this.#abort.abort(reason);
    for (const t of this.#timers) clearTimeout(t.handle);
    this.#timers.clear();
    for (const node of this.#nodes.values()) node.inbox.length = 0;
    await Promise.all(this.#groups.filter(g => g.remote).map(g => Promise.resolve(g.remote.stop()).catch(() => {})));
    for (const node of this.#nodes.values()) {
      if (node.remote || node.group) continue;
      if (typeof node.def.stop === 'function') {
        try { await withTimeout(Promise.resolve(node.def.stop(node.ctx)), 2000); } catch { /* stopping anyway */ }
      }
    }
  }

  /** A value from outside: the IDE's test panel, or a Componente UI the user changed. */
  input(schema, block, port, value) {
    const node = this.#nodes.get(`${schema}/${block}`);
    if (!node) return false;
    if (node.def.role === 'component' || node.def.role === 'schemaIn') this.#emit(node, port, value);
    else this.#enqueue(node, port, value, (node.pulseIn.has(port) || !!node.group) && isOn(value));
    return true;
  }

  /** (Inside a group's thread) a value that reached one of its blocks from outside of the group. */
  deliver(schema, block, port, value, pulse = false) {
    const node = this.#nodes.get(`${schema}/${block}`);
    if (!node || node.group) return false;
    this.#enqueue(node, port, value, !!pulse);
    return true;
  }

  /** The user acted on a Componente UI of an open window: its proxy blocks send it on. */
  component(window, component, port, value) {
    const nodes = this.#components.get(`${window}:${component}`) ?? [];
    for (const node of nodes) this.#emit(node, port, value);
    return nodes.length > 0;
  }

  /** The latest value of every input (for the IDE when it attaches to a running program). */
  snapshot() {
    const out = {};
    for (const node of this.#nodes.values()) {
      for (const [port, value] of Object.entries(node.values)) out[`${node.key}.${port}`] = value;
    }
    return out;
  }

  #emit(node, port, value, pulse = null) {
    if (this.#stopped || value === undefined) return;
    // A pulse: true on the links, then the port is false again
    const isPulse = pulse ?? (node.pulseOut.has(port) && isOn(value));
    if (isPulse) value = true;
    this.#host.value(`${node.key}.${port}`, value);
    const targets = node.links.get(port);
    if (!targets) {
      if (port === ERROR_PORT) this.#unhandled(node, value);
    } else {
      for (const t of targets) {
        if (t.exit) this.#host.exit?.(node.schema, node.id, port, value, isPulse);
        else this.#enqueue(t.node, t.port, value, isPulse);
      }
    }
    if (isPulse) this.#host.value(`${node.key}.${port}`, false);
  }

  /**
   * An exception nobody linked: to the global catches (core.onError) of its schema, or of the
   * program, if there are; else (or when they ask for it too) a line in the main console. A
   * global catch never gets its own exceptions (no loops). In a group's thread without catches of
   * its own, the program that made the thread handles it.
   */
  #unhandled(node, value) {
    const catchers = this.#catchers.filter(c => c !== node && (c.config.scope === 'program' || c.schema === node.schema));
    if (!catchers.length && typeof this.#host.unhandled === 'function') { this.#host.unhandled(node.schema, node.id, value); return; }
    for (const c of catchers) { this.#emit(c, 'exception', value); this.#emit(c, 'message', messageOf(value)); }
    if (!catchers.length || catchers.some(c => c.config.console)) {
      this.#host.console('write', { console: 'main', level: 'error', text: `${labelOf(node)}: ${messageOf(value)}` });
    }
  }

  #export(node, port, value) {
    for (const target of this.#exports.get(`${node.schema}:${port}`) ?? []) this.#emit(target, 'value', value);
  }

  #enqueue(node, port, value, pulse = false) {
    if (this.#stopped) return;
    node.inbox.push({ port, value, pulse });
    if (!node.pumping) this.#pump(node);
  }

  /** The inputs that got a pulse are false again (after the run it started). */
  #unpulse(node) {
    for (const port of node.pulsed) {
      node.values[port] = false;
      this.#host.value(`${node.key}.${port}`, false);
    }
    node.pulsed.clear();
  }

  /** A block's values, one at a time: the input takes it, and if it starts the block, run(). */
  async #pump(node) {
    node.pumping = true;
    try {
      await null;   // after the sender has finished sending (all its outputs are queued)
      while (node.inbox.length && !this.#stopped) {
        const { port, value, pulse } = node.inbox.shift();
        // A block of a group in a thread of its own: the value goes to that thread
        if (node.remote) { node.remote.deliver(node.schema, node.id, port, value, pulse); continue; }
        // The «run» of a group
        if (node.group) {
          if (isOn(value)) await this.runGroup(node.schema, node.id);
          continue;
        }
        node.values[port] = value;
        this.#host.value(`${node.key}.${port}`, value);
        if (pulse) node.pulsed.add(port);
        if (node.def.role === 'component') {
          this.#host.ui(node.config.window, node.config.component, port, value);
          node.pulsed.clear();
          continue;
        }
        // Its group has not started: the value stays on the input, the block does not start
        if (node.grp && !node.grp.running) { this.#unpulse(node); continue; }
        if (node.pulseIn.has(port) && !isOn(value)) continue;
        if (node.ports[port]?.trigger === false || typeof node.def.run !== 'function') continue;
        if (!this.#count()) return;
        await this.#run(node, port);
        this.#unpulse(node);
        if (++this.#steps % YIELD_EVERY === 0) await this.#breathe();
      }
    } finally {
      node.pumping = false;
    }
  }

  /** At most runsPer10s runs in 10 s: more means a loop that never ends (a cycle of links). */
  #count() {
    const now = Date.now();
    while (this.#runs.length && now - this.#runs[0] > 10_000) this.#runs.shift();
    if (this.#runs.length >= this.#limits.runsPer10s) {
      this.#host.fail(`Troppe esecuzioni: più di ${this.#limits.runsPer10s} in 10 secondi (un ciclo di collegamenti?)`);
      this.stop('runs');
      return false;
    }
    this.#runs.push(now);
    return true;
  }

  async #run(node, trigger) {
    const inputs = { ...node.values };
    const gen = node.grp?.gen;
    this.#host.state(node.key, 'run');
    const started = performance.now();
    const result = await this.#guarded(node, () => node.def.run(inputs, Object.assign(Object.create(node.ctx), { trigger })));
    this.#account(performance.now() - started);
    if (this.#stopped) return;
    // Its group started again meanwhile: what it gives back belongs to the run before
    if (node.grp && node.grp.gen !== gen) return;
    if (result && typeof result === 'object') {
      for (const [port, value] of Object.entries(result)) {
        if (value !== undefined) this.#emit(node, port, value);
      }
    }
    this.#host.state(node.key, node.failed ? 'error' : 'idle');
  }

  /** Runs fn of a block: a slow one is cut after blockMs; what it throws goes to its «error». */
  async #guarded(node, fn) {
    try {
      const value = await withTimeout(Promise.resolve().then(fn), this.#limits.blockMs, `${labelOf(node)} ha impiegato più di ${Math.round(this.#limits.blockMs / 1000)} s`);
      node.failed = false;
      return value;
    } catch (err) {
      if (this.#stopped) return undefined;
      node.failed = true;
      this.#emit(node, ERROR_PORT, { message: messageOf(err), block: node.id, type: node.def.type, schema: node.schema, at: Date.now() });
      return undefined;
    }
  }

  /** A loop block: step() again and again, each after the wait it asks for (until its group starts again). */
  #loop(node) {
    const gen = node.grp?.gen;
    const gone = () => this.#stopped || (node.grp && node.grp.gen !== gen);
    const next = async () => {
      if (gone()) return;
      if (!this.#count()) return;
      const started = performance.now();
      const res = await this.#guarded(node, () => node.def.step({ ...node.values }, node.ctx));
      this.#account(performance.now() - started);
      if (gone()) return;
      for (const [port, value] of Object.entries(res?.outputs ?? {})) if (value !== undefined) this.#emit(node, port, value);
      if (res?.done) return;
      this.#timer(node, next, Math.max(MIN_LOOP_MS, Number(res?.wait) || MIN_LOOP_MS), false);
    };
    this.#timer(node, next, 0, false);
  }

  #timer(node, fn, ms, repeat) {
    if (this.#stopped) return null;
    const t = { handle: null };
    const fire = async () => {
      if (!repeat) { this.#timers.delete(t); node.timers.delete(t); }
      try { await fn(); } catch (err) { this.#emit(node, ERROR_PORT, { message: messageOf(err), block: node.id, type: node.def.type, schema: node.schema, at: Date.now() }); }
    };
    const wait = Math.max(0, Number(ms) || 0);
    t.handle = repeat ? setInterval(fire, Math.max(MIN_LOOP_MS, wait)) : setTimeout(fire, wait);
    this.#timers.add(t);
    node.timers.add(t);
    return t;
  }

  #clear(node, t) {
    if (!t || !node.timers.has(t)) return;
    clearTimeout(t.handle);
    clearInterval(t.handle);
    node.timers.delete(t);
    this.#timers.delete(t);
  }

  /** CPU governor: when blocks ran more than cpuPercent of this second, wait for the rest of it. */
  #account(ms) {
    const now = Date.now();
    if (now - this.#busySince >= 1000) { this.#busySince = now; this.#busy = 0; }
    this.#busy += ms;
  }

  async #breathe() {
    const budget = 10 * this.#limits.cpuPercent;   // ms in a second
    const elapsed = Date.now() - this.#busySince;
    if (this.#busy >= budget && elapsed < 1000) await sleep(1000 - elapsed);
    else await sleep(0);
  }
}

/** A block definition's config defaults. */
export function defaultsOf(def) {
  const out = {};
  for (const c of def.config ?? []) if (c.default !== undefined) out[c.key] = c.default;
  return out;
}

const labelOf = node => node.label ?? (typeof node.def.label === 'object' ? node.def.label.it ?? node.def.label.en : node.def.label) ?? node.def.type;
export const messageOf = v => (v instanceof Error ? v.message : typeof v === 'object' && v ? String(v.message ?? JSON.stringify(v)) : String(v));
const sleep = ms => new Promise(r => setTimeout(r, ms));

function withTimeout(promise, ms, message = 'Tempo scaduto') {
  let t;
  return Promise.race([promise, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(message)), ms); })]).finally(() => clearTimeout(t));
}
