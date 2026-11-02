import { Emitter, fs, shortcuts, splitName } from '@lilos/sdk';
import { launch, isInstalled } from '../apps/registry.js';
import { notify } from '../notifications/notify.js';
import { checkDocument } from './document.js';

/**
 * The user's automations: every .automata file in their home, read and kept here so that they
 * can start from the menu of files and folders («Automazioni»), from their shortcut, or from the
 * Terminal (the Automata app's `automata` command). Starting one opens Automata's `run` window.
 *
 *   library.list() → [{ id, name, path, input, launch, steps }]   id: the file's node id
 *   library.get(idOrName) · library.menuEntries(ids) · library.start(id, items) · library.record(items)
 *
 * Events: 'change' — automations added, changed or removed
 */
export const AUTOMATA = 'automata';
export const EXT = 'automata';
const RESCAN_MS = 300;

const isAutomation = node => node?.type === 'file' && splitName(node.name)[1].toLowerCase() === EXT;

class Library extends Emitter {
  #entries = new Map();   // node id → entry
  #offKeys = [];
  #timer = null;
  #scanning = null;
  #selection = () => [];

  /** ctx.selection: () → ids of what the user selected where they are (for a shortcut). */
  connect({ selection }) {
    this.#selection = selection ?? this.#selection;
    fs.on('change', e => { if (isAutomation(e.node) || e.type === 'remove' || e.type === 'move') this.refresh(); });
    fs.on('trash', () => this.refresh());
    this.refresh();
  }

  list() {
    return [...this.#entries.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }

  /** An automation by its file's id, or by its Terminal command or name. */
  get(key) {
    if (this.#entries.has(key)) return this.#entries.get(key);
    const k = String(key ?? '').toLowerCase();
    return this.list().find(e => e.launch.command === k) ?? this.list().find(e => e.name.toLowerCase() === k) ?? null;
  }

  /** Reads them all again, a moment later (many changes at once make one scan). */
  refresh() {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => { this.#scanning = this.#scan(); }, RESCAN_MS);
  }

  /** Resolves when the scan in progress (if any) is over. */
  ready() {
    return this.#scanning ?? Promise.resolve();
  }

  async #scan() {
    const found = [];
    // The whole home, but not the network connections (their folders are read from far away)
    const walk = id => fs.children(id).forEach(n => {
      if (n.type === 'folder' && !n.net) walk(n.id);
      else if (isAutomation(n)) found.push(n);
    });
    walk(fs.root);
    const next = new Map();
    for (const node of found.slice(0, 500)) {
      try {
        const doc = checkDocument(await fs.read(node.id));
        next.set(node.id, { id: node.id, path: fs.path(node.id), name: doc.name, description: doc.description, input: doc.input, launch: doc.launch, steps: doc.steps.length });
      } catch {
        // Not readable or not an automation: left out
      }
    }
    this.#entries = next;
    this.#registerShortcuts();
    this.emit('change');
  }

  #registerShortcuts() {
    this.#offKeys.forEach(off => off());
    this.#offKeys = [];
    for (const e of this.list()) {
      const combo = e.launch.shortcut;
      // A file may come from anyone: only Ctrl or Alt combos that are valid and nobody else uses
      if (!combo || !/^(Ctrl|Alt)\+/.test(combo) || shortcuts.validate(combo) || shortcuts.owner(combo, `automation.${e.id}`)) continue;
      try {
        this.#offKeys.push(shortcuts.register({
          id: `automation.${e.id}`, label: e.name, group: 'Automazioni', keys: [e.launch.shortcut],
          run: () => this.start(e.id, e.input === 'none' ? [] : this.#selection()),
        }));
      } catch (err) {
        console.warn('[lilos] scorciatoia dell’automazione:', err.message);
      }
    }
  }

  /** Opens Automata to run an automation on these items. */
  start(id, items = []) {
    if (!isInstalled(AUTOMATA)) return notify('Per eseguire un’automazione serve l’app Automata', { level: 'warning' });
    launch(AUTOMATA, { automation: id, items: items.filter(x => fs.exists(x)) }, 'run');
  }

  /** Opens Automata's recorder, starting from these items (they become what it works on). */
  record(items = []) {
    if (!isInstalled(AUTOMATA)) return notify('Per registrare un’automazione serve l’app Automata', { level: 'warning' });
    launch(AUTOMATA, { items: items.filter(x => fs.exists(x)) }, 'recorder');
  }

  /** Whether an automation fits these nodes (the menu of files and folders). */
  #fits(e, nodes) {
    if (!e.launch.menu) return false;
    if (e.input === 'folder') return nodes.length === 1 && nodes[0].type === 'folder';
    if (e.input !== 'files') return false;
    return nodes.every(n => n.type === 'file' && (!e.launch.ext.length || e.launch.ext.includes(splitName(n.name)[1].toLowerCase())));
  }

  /** The «Automazioni» submenu for these node ids (openMenu items), or []. */
  menuEntries(ids) {
    if (!isInstalled(AUTOMATA)) return [];
    const nodes = ids.map(id => fs.get(id)).filter(n => n && n.type !== 'app');
    if (!nodes.length || nodes.some(n => fs.isTrashed(n.id))) return [];
    const items = this.list().filter(e => this.#fits(e, nodes)).map(e => ({
      label: e.name, icon: 'automation', shortcut: e.launch.shortcut ? shortcuts.label(`automation.${e.id}`) : undefined,
      action: () => this.start(e.id, nodes.map(n => n.id)),
    }));
    return [{
      label: 'Automazioni', icon: 'automation',
      items: [...items, ...(items.length ? ['-'] : []), { label: 'Registra partendo da qui', icon: 'record', action: () => this.record(nodes.map(n => n.id)) }],
    }];
  }
}

export const library = new Library();
