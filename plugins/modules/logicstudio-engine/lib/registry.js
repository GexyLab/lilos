import { readFile, readdir, stat } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * The packages of blocks and of Componenti UI. Each package is a kernel module that requires the
 * service 'logicstudio' and, in its init(), registers itself:
 *
 *   ctx.service('logicstudio').register({
 *     name: ctx.name, version: ctx.version, label: { en, it },
 *     blocks: join(ctx.dir, 'blocks.js'),           // optional: export const blocks = [...]
 *     components: join(ctx.dir, 'components.js'),   // optional: export const components = [...]
 *     actions: { 'lilos.notify': async (user, args, tools) => … },   // optional: run in the kernel as the program's user (supervisor.js #action)
 *     docs: join(ctx.dir, 'docs'),                  // optional: docs/<lang>/index.md and docs/<lang>/<type>.md (Markdown)
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

  async register({ name, version, label, blocks, components, actions, docs } = {}) {
    if (!PACK.test(name ?? '')) throw new Error(`Pacchetto di Logic Studio senza nome valido: ${name}`);
    if (docs !== undefined && docs !== null && !isAbsolute(docs)) throw new Error(`${name}: la cartella della documentazione deve essere un percorso assoluto`);
    const pack = { name, version: String(version ?? '0.0.0'), label: cleanLabel(label, name), blocksFile: null, componentsFile: null, blocks: new Map(), components: new Map(), actions: new Map(), upgrades: new Map(), docsDir: docs ?? null };
    if (blocks) {
      if (!isAbsolute(blocks)) throw new Error(`${name}: il file dei blocchi deve essere un percorso assoluto`);
      const mod = await import(`${pathToFileURL(blocks).href}?v=${encodeURIComponent(pack.version)}`);
      for (const def of mod.blocks ?? []) {
        const problem = checkBlock(def);
        if (problem) { this.#log.warn(`${name}: blocco ${def?.type ?? '?'} scartato: ${problem}`); continue; }
        if (this.blockDef(def.type)) { this.#log.warn(`${name}: blocco ${def.type} già dato da un altro pacchetto: scartato`); continue; }
        pack.blocks.set(def.type, describeBlock(def, name));
        if (typeof def.upgrade === 'function') pack.upgrades.set(def.type, def.upgrade);
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

  /** upgrade(config, from, added) of a block's definition (its settings saved by an older version), or null. */
  upgrade(type) {
    for (const p of this.#packs.values()) if (p.upgrades.has(type)) return p.upgrades.get(type);
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
        blocks: [...p.blocks.values()], components: [...p.components.values()], hasComponents: !!p.componentsFile, hasDocs: !!p.docsDir,
      })),
    };
  }

  /**
   * A page of a package's documentation, in `lang` or else in English, else in Italian:
   * { pack, page, lang, markdown } or null. `extra` is a folder for a name that is not a package
   * (the engine's own pages). Names are checked here: never a path from outside.
   */
  async doc(packName, page, lang, extra = null) {
    const dir = extra?.name === packName ? extra.dir : this.#packs.get(packName)?.docsDir;
    if (!dir || !DOC_PAGE.test(page ?? '') || !LANG.test(lang ?? '')) return null;
    for (const l of [...new Set([lang, lang.split('-')[0], 'en', 'it'])]) {
      try {
        const file = join(dir, l, `${page}.md`);
        if ((await stat(file)).size > MAX_DOC) continue;
        return { pack: packName, page, lang: l, markdown: await readFile(file, 'utf8') };
      } catch { /* not in this language */ }
    }
    return null;
  }

  /**
   * The pages of every package's documentation in `lang` (or the fallback language), with their
   * titles (the first «# » line): [{ pack, label, pages: [{ page, title }] }]. Read once per
   * package version and language.
   */
  async docIndex(lang, extra = []) {
    const out = [];
    const sources = [...extra.map(e => ({ name: e.name, version: e.version, label: e.label, docsDir: e.dir })), ...this.#packs.values()];
    for (const p of sources) {
      if (!p.docsDir || !LANG.test(lang ?? '')) continue;
      const key = `${p.name}@${p.version}:${lang}`;
      if (!this.#docIndex.has(key)) this.#docIndex.set(key, readPages(p.docsDir, lang));
      out.push({ pack: p.name, label: p.label, pages: await this.#docIndex.get(key) });
    }
    return out;
  }

  #docIndex = new Map();
}

const DOC_PAGE = /^(?:index|[a-z][a-z0-9-]{0,40}|[a-z][a-z0-9]*\.[a-zA-Z][a-zA-Z0-9]{0,40})$/;
const LANG = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/;
const MAX_DOC = 512 * 1024;

/** The pages of a docs/ folder: those in `lang`, plus those only in the fallback languages. */
async function readPages(dir, lang) {
  const pages = new Map();
  for (const l of [...new Set([lang, lang.split('-')[0], 'en', 'it'])]) {
    let names;
    try { names = (await readdir(join(dir, l))).filter(f => f.endsWith('.md') && DOC_PAGE.test(f.slice(0, -3))); } catch { continue; }
    for (const f of names) {
      const page = f.slice(0, -3);
      if (pages.has(page)) continue;
      const text = await readFile(join(dir, l, f), 'utf8').catch(() => '');
      const title = /^#\s+(.+)$/m.exec(text)?.[1]?.trim() ?? page;
      pages.set(page, { page, title: title.slice(0, 120) });
    }
  }
  return [...pages.values()].sort((a, b) => (a.page < b.page ? -1 : 1));
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
    grow: def.grow ? JSON.parse(JSON.stringify(def.grow)) : null, role: def.role ?? null, showError: def.showError === true,
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
