import { readFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * The packages of blocks and of Componenti UI. Each package is a kernel module that requires the
 * service 'logicstudio' and, in its init(), registers itself:
 *
 *   ctx.service('logicstudio').register({
 *     name: ctx.name, version: ctx.version, label: { en, it },
 *     blocks: join(ctx.dir, 'blocks.js'),           // optional: export const blocks = [...]
 *     components: join(ctx.dir, 'components.js'),   // optional: export const components = [...]
 *     actions: { 'lilos.notify': async (user, args, tools) => … },   // optional, see broker.js
 *   })
 *
 * blocks.js runs in each user's worker; here it is only imported to read the definitions (nothing
 * in it may run at import). components.js runs in the browser (lilOS and the apps), with what it
 * needs passed to render(): it imports nothing, so it is read here the same way.
 */

const TYPE = /^[a-z][a-z0-9]*\.[a-zA-Z][a-zA-Z0-9]{0,40}$/;
const PORT = /^[a-zA-Z][a-zA-Z0-9]{0,30}$/;
const TYPES = new Set(['number', 'bool', 'text', 'object', 'list', 'any', 'pulse', 'matrix']);
const NAMING = new Set(['letter', 'number', 'user']);
const PACK = /^[a-z][a-z0-9-]{0,40}$/;

export class Registry {
  #packs = new Map();       // name → { name, version, label, blocksFile, componentsFile, blocks: Map, components: Map, actions }
  #log;
  #version = 0;

  constructor(log) { this.#log = log; }

  /** Changes every time a package comes or goes: the catalog's ETag. */
  get version() { return this.#version; }

  async register({ name, version, label, blocks, components, actions } = {}) {
    if (!PACK.test(name ?? '')) throw new Error(`Pacchetto di Logic Studio senza nome valido: ${name}`);
    const pack = { name, version: String(version ?? '0.0.0'), label: cleanLabel(label, name), blocksFile: null, componentsFile: null, blocks: new Map(), components: new Map(), actions: new Map() };
    if (blocks) {
      if (!isAbsolute(blocks)) throw new Error(`${name}: il file dei blocchi deve essere un percorso assoluto`);
      const mod = await import(`${pathToFileURL(blocks).href}?v=${encodeURIComponent(pack.version)}`);
      for (const def of mod.blocks ?? []) {
        const problem = checkBlock(def);
        if (problem) { this.#log.warn(`${name}: blocco ${def?.type ?? '?'} scartato: ${problem}`); continue; }
        if (this.blockDef(def.type)) { this.#log.warn(`${name}: blocco ${def.type} già dato da un altro pacchetto: scartato`); continue; }
        pack.blocks.set(def.type, describeBlock(def, name));
      }
      pack.blocksFile = blocks;
    }
    if (components) {
      if (!isAbsolute(components)) throw new Error(`${name}: il file delle componenti deve essere un percorso assoluto`);
      const mod = await import(`${pathToFileURL(components).href}?v=${encodeURIComponent(pack.version)}`);
      for (const def of mod.components ?? []) {
        const problem = checkComponent(def);
        if (problem) { this.#log.warn(`${name}: componente ${def?.type ?? '?'} scartata: ${problem}`); continue; }
        pack.components.set(def.type, describeComponent(def, name));
      }
      pack.componentsFile = components;
      pack.componentsCode = await readFile(components, 'utf8');
    }
    for (const [key, fn] of Object.entries(actions ?? {})) {
      if (/^[a-z][a-z0-9]*\.[a-zA-Z][\w.]{0,60}$/.test(key) && typeof fn === 'function') pack.actions.set(key, fn);
    }
    this.#packs.set(name, pack);
    this.#version++;
    this.#log.info(`Logic Studio: pacchetto ${name} ${pack.version} (${pack.blocks.size} blocchi, ${pack.components.size} componenti)`);
    return { unregister: () => { if (this.#packs.get(name) === pack) { this.#packs.delete(name); this.#version++; } } };
  }

  packs() { return [...this.#packs.values()]; }
  pack(name) { return this.#packs.get(name) ?? null; }

  blockDef(type) {
    for (const p of this.#packs.values()) if (p.blocks.has(type)) return p.blocks.get(type);
    return null;
  }

  componentDef(type) {
    for (const p of this.#packs.values()) if (p.components.has(type)) return p.components.get(type);
    return null;
  }

  action(key) {
    for (const p of this.#packs.values()) if (p.actions.has(key)) return p.actions.get(key);
    return null;
  }

  /** What a worker loads: the blocks.js files. */
  blockFiles() {
    return [...this.#packs.values()].filter(p => p.blocksFile).map(p => ({ name: p.name, version: p.version, file: pathToFileURL(p.blocksFile).href }));
  }

  /** The catalog for the IDE and lilOS: every definition without its code. */
  catalog() {
    return {
      version: this.#version,
      packages: this.packs().map(p => ({
        name: p.name, version: p.version, label: p.label,
        blocks: [...p.blocks.values()], components: [...p.components.values()], hasComponents: !!p.componentsFile,
      })),
    };
  }
}

const cleanLabel = (label, fallback) => (label && typeof label === 'object' ? { en: String(label.en ?? fallback), ...(label.it && { it: String(label.it) }) } : { en: String(label ?? fallback) });

function checkPorts(list) {
  if (list === undefined) return null;
  if (!Array.isArray(list)) return 'porte non valide';
  const seen = new Set();
  for (const p of list) {
    if (!PORT.test(p?.name ?? '') || p.name === 'error') return `porta non valida: ${p?.name}`;
    if (seen.has(p.name)) return `porta ripetuta: ${p.name}`;
    if (p.type !== undefined && !TYPES.has(p.type)) return `tipo non valido: ${p.type}`;
    seen.add(p.name);
  }
  return null;
}

function checkGrow(grow) {
  if (grow === undefined) return null;
  for (const [side, g] of Object.entries(grow ?? {})) {
    if (side !== 'inputs' && side !== 'outputs') return `grow.${side} non valido`;
    if (!Number.isInteger(g?.max) || g.max < 1 || g.max > 64) return `grow.${side}.max non valido`;
    if (g.type !== undefined && !TYPES.has(g.type)) return `grow.${side}.type non valido`;
    if (g.name !== undefined && !NAMING.has(g.name)) return `grow.${side}.name non valido`;
  }
  return null;
}

export function checkBlock(def) {
  if (!def || typeof def !== 'object') return 'non è un oggetto';
  if (!TYPE.test(def.type ?? '')) return 'tipo non valido (pacchetto.nome)';
  if (!Number.isInteger(def.version) || def.version < 1) return 'versione non valida';
  return checkPorts(def.inputs) ?? checkPorts(def.outputs) ?? checkGrow(def.grow)
    ?? (def.execution === 'loop' && typeof def.step !== 'function' ? 'un blocco «loop» deve avere step()' : null);
}

export function checkComponent(def) {
  if (!def || typeof def !== 'object') return 'non è un oggetto';
  if (!TYPE.test(def.type ?? '')) return 'tipo non valido (pacchetto.nome)';
  if (!Number.isInteger(def.version) || def.version < 1) return 'versione non valida';
  if (typeof def.render !== 'function') return 'manca render()';
  return checkPorts(def.inputs) ?? checkPorts(def.outputs) ?? checkGrow(def.grow);
}

const plainList = (list) => (Array.isArray(list) ? list.map(x => JSON.parse(JSON.stringify(x))) : []);

/** A block's definition as the IDE sees it: data only. */
function describeBlock(def, pack) {
  return {
    pack, type: def.type, version: def.version, category: String(def.category ?? 'other'), icon: def.icon ?? 'blocks',
    label: cleanLabel(def.label, def.type), description: def.description ? cleanLabel(def.description, '') : null,
    inputs: plainList(def.inputs), outputs: plainList(def.outputs), config: plainList(def.config),
    grow: def.grow ? JSON.parse(JSON.stringify(def.grow)) : null, role: def.role ?? null,
    execution: def.execution === 'loop' ? 'loop' : 'run', upgradable: typeof def.upgrade === 'function',
  };
}

/** A component's definition: ports seen from the schema (inputs = the schema sets, outputs = the user does). */
function describeComponent(def, pack) {
  return {
    pack, type: def.type, version: def.version, category: String(def.category ?? 'other'), icon: def.icon ?? 'window',
    label: cleanLabel(def.label, def.type), container: def.container === true,
    inputs: plainList(def.inputs), outputs: plainList(def.outputs), props: plainList(def.props),
    grow: def.grow ? JSON.parse(JSON.stringify(def.grow)) : null, size: def.size ?? null,
  };
}
