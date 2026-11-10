/**
 * From the documents of a project (or of one schema alone) to the spec a worker runs, checked
 * against the catalog and the limits. Throws { code: 'invalid', message } on the first problem.
 *
 *   documents: { project: <.lsproj> | null, schemas: { <name>: <.lsch> }, windows: { <name>: <.lsui> } }
 *
 * .lsproj  { format: 'lilos-lsproj/1', name, schemas: { <name>: path }, windows: { <name>: path },
 *            main, links: [{ from: 'schema:port', to: 'schema:port' }], consoles, options, entrypoints, … }
 * .lsch    { format: 'lilos-lsch/1', name, blocks: [{ id, type, v, config, ports, added, x, y, label }],
 *            links: [{ from: [block, port], to: [block, port] }], consoles? (a schema alone), view, notes }
 * .lsui    { format: 'lilos-lsui/1', title, size, root: { id?, type, v, props, children } }
 *
 * The links between schemas go from an Uscita di schema to an Ingresso di schema (ports named in
 * their config). A Componente UI is reached through its object in a schema (core.component, config
 * { window, component }): one object per component; its ports are the component's.
 */

export const FORMATS = { project: 'lilos-lsproj/1', schema: 'lilos-lsch/1', window: 'lilos-lsui/1' };
const NAME = /^[^\x00-\x1f/\\:]{1,80}$/;
const ID = /^[\w-]{1,40}$/;
const PORT = /^[a-zA-Z][a-zA-Z0-9]{0,30}$/;
const MAX_CONFIG = 64 * 1024;
const LEVELS = ['all', 'onInput', 'hidden', 'main'];

const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);

export class ProjectError extends Error {
  constructor(message, where = null) { super(message); this.code = 'invalid'; this.where = where; }
}
const bad = (message, where) => { throw new ProjectError(message, where); };

/**
 * @param {object} documents
 * @param {Registry} registry
 * @param {object} limits    maxBlocks, maxLinks, maxSchemas, maxWindows, maxComponents, maxProjectLinks, maxAddedPorts, maxConsoles
 */
export function buildSpec(documents, registry, limits) {
  const project = documents.project ?? null;
  if (project !== null) {
    if (!plain(project) || project.format !== FORMATS.project) bad('Il file del progetto non è un progetto di Logic Studio (.lsproj)');
  }
  const schemaDocs = plain(documents.schemas) ? documents.schemas : {};
  const windowDocs = plain(documents.windows) ? documents.windows : {};
  const schemaNames = Object.keys(schemaDocs);
  if (!schemaNames.length) bad('Non c\'è nessuno schema da far girare');
  if (schemaNames.length > limits.maxSchemas) bad(`Troppi schemi: al massimo ${limits.maxSchemas} per progetto`);
  if (Object.keys(windowDocs).length > limits.maxWindows) bad(`Troppe finestre: al massimo ${limits.maxWindows} per progetto`);

  // Windows: their components, by id
  const windows = {};
  for (const [name, doc] of Object.entries(windowDocs)) {
    if (!NAME.test(name)) bad(`Nome di finestra non valido: ${name}`);
    if (!plain(doc) || doc.format !== FORMATS.window) bad(`La finestra ${name} non è un file .lsui`, { window: name });
    const components = {};
    let count = 0;
    const walk = (node, depth) => {
      if (!plain(node)) bad(`La finestra ${name} ha una componente non valida`, { window: name });
      if (depth > 32) bad(`La finestra ${name} ha contenitori troppo annidati`, { window: name });
      if (++count > limits.maxComponents) bad(`Troppe componenti nella finestra ${name}: al massimo ${limits.maxComponents}`, { window: name });
      if (node.id !== undefined) {
        if (!ID.test(String(node.id))) bad(`Id di componente non valido: ${node.id}`, { window: name });
        if (components[node.id]) bad(`Due componenti con lo stesso id (${node.id}) nella finestra ${name}`, { window: name });
        components[node.id] = { type: String(node.type ?? ''), added: cleanAdded(node.added, null, limits, `${name}/${node.id}`) };
      }
      for (const child of Array.isArray(node.children) ? node.children : []) walk(child, depth + 1);
    };
    if (doc.root !== undefined) walk(doc.root, 0);
    windows[name] = { components };
  }

  // Schemas
  const schemas = {};
  const proxies = new Map();   // 'window:component' → 'schema/block'
  for (const name of schemaNames) {
    if (!NAME.test(name)) bad(`Nome di schema non valido: ${name}`);
    const doc = schemaDocs[name];
    if (!plain(doc) || doc.format !== FORMATS.schema) bad(`Lo schema ${name} non è un file .lsch`, { schema: name });
    const blocks = Array.isArray(doc.blocks) ? doc.blocks : [];
    const links = Array.isArray(doc.links) ? doc.links : [];
    if (blocks.length > limits.maxBlocks) bad(`Troppi blocchi nello schema ${name}: al massimo ${limits.maxBlocks}`, { schema: name });
    if (links.length > limits.maxLinks) bad(`Troppi collegamenti nello schema ${name}: al massimo ${limits.maxLinks}`, { schema: name });
    const byId = new Map();
    const outBlocks = [];
    for (const raw of blocks) {
      if (!plain(raw) || !ID.test(String(raw.id ?? ''))) bad(`Lo schema ${name} ha un blocco senza id valido`, { schema: name });
      if (byId.has(raw.id)) bad(`Due blocchi con lo stesso id (${raw.id}) nello schema ${name}`, { schema: name, block: raw.id });
      const def = registry.blockDef(String(raw.type ?? ''));
      if (!def) bad(`Il blocco ${raw.label ?? raw.id} (${raw.type}) non c'è: manca il suo pacchetto`, { schema: name, block: raw.id });
      const config = plain(raw.config) ? raw.config : {};
      if (JSON.stringify(config).length > MAX_CONFIG) bad(`Le impostazioni del blocco ${raw.id} sono troppo grandi`, { schema: name, block: raw.id });
      const added = cleanAdded(raw.added, def.grow ?? {}, limits, `${name}/${raw.id}`);
      let inputs = new Set([...def.inputs.map(p => p.name), ...added.inputs.map(p => p.id)]);
      let outputs = new Set([...def.outputs.map(p => p.name), ...added.outputs.map(p => p.id), 'error']);
      if (def.role === 'component') {
        const key = `${config.window}:${config.component}`;
        const win = windows[config.window];
        const comp = win?.components[config.component];
        if (!comp) bad(`Il blocco ${raw.id} rappresenta una componente che non c'è (${config.window} › ${config.component})`, { schema: name, block: raw.id });
        if (proxies.has(key)) bad(`La componente ${config.window} › ${config.component} ha già il suo oggetto in ${proxies.get(key)}`, { schema: name, block: raw.id });
        proxies.set(key, `${name}/${raw.id}`);
        const cdef = registry.componentDef(comp.type);
        if (!cdef) bad(`La componente ${config.component} (${comp.type}) non c'è: manca il suo pacchetto`, { window: config.window });
        inputs = new Set([...cdef.inputs.map(p => p.name), ...comp.added.inputs.map(p => p.id)]);
        outputs = new Set([...cdef.outputs.map(p => p.name), ...comp.added.outputs.map(p => p.id), 'error']);
      }
      const ports = {};
      for (const [port, p] of Object.entries(plain(raw.ports) ? raw.ports : {})) {
        if (!inputs.has(port) || !plain(p)) continue;
        ports[port] = { ...(p.start !== undefined && { start: p.start }), ...(p.trigger === false && { trigger: false }) };
      }
      for (const p of def.inputs) if (p.trigger === false && !ports[p.name]) ports[p.name] = { trigger: false };
      byId.set(raw.id, { inputs, outputs });
      outBlocks.push({ id: raw.id, type: def.type, v: def.version, config, ports, added });
    }
    const outLinks = [];
    for (const l of links) {
      const [fb, fp] = Array.isArray(l?.from) ? l.from : [];
      const [tb, tp] = Array.isArray(l?.to) ? l.to : [];
      const from = byId.get(fb), to = byId.get(tb);
      if (!from || !to) bad(`Lo schema ${name} ha un collegamento verso un blocco che non c'è`, { schema: name });
      if (!from.outputs.has(fp)) bad(`Lo schema ${name}: il blocco ${fb} non ha l'uscita ${fp}`, { schema: name, block: fb });
      if (!to.inputs.has(tp)) bad(`Lo schema ${name}: il blocco ${tb} non ha l'ingresso ${tp}`, { schema: name, block: tb });
      outLinks.push({ from: [fb, fp], to: [tb, tp] });
    }
    schemas[name] = { blocks: outBlocks, links: outLinks };
  }

  // Links between schemas: 'schema:port' → 'schema:port', from an output port to an input port
  const exported = new Map(), imported = new Map();
  for (const [name, s] of Object.entries(schemas)) {
    for (const b of s.blocks) {
      const role = registry.blockDef(b.type).role;
      if (role === 'schemaOut') exported.set(`${name}:${b.config.port}`, true);
      if (role === 'schemaIn') imported.set(`${name}:${b.config.port}`, true);
    }
  }
  const projectLinks = [];
  const rawLinks = Array.isArray(project?.links) ? project.links : [];
  if (rawLinks.length > limits.maxProjectLinks) bad(`Troppi collegamenti tra gli schemi: al massimo ${limits.maxProjectLinks}`);
  for (const l of rawLinks) {
    const from = splitRef(l?.from), to = splitRef(l?.to);
    if (!from || !to) bad('Il progetto ha un collegamento non valido tra gli schemi');
    if (!exported.has(`${from.schema}:${from.port}`)) bad(`Collegamento del progetto: lo schema ${from.schema} non ha l'uscita «${from.port}»`, { schema: from.schema });
    if (!imported.has(`${to.schema}:${to.port}`)) bad(`Collegamento del progetto: lo schema ${to.schema} non ha l'ingresso «${to.port}»`, { schema: to.schema });
    projectLinks.push({ from, to });
  }

  return { schemas, projectLinks, windows, consoles: consolesOf(project ?? schemaDocs[schemaNames[0]], limits), options: optionsOf(project) };
}

function splitRef(ref) {
  if (typeof ref !== 'string') return null;
  const i = ref.indexOf(':');
  if (i < 1 || i === ref.length - 1) return null;
  return { schema: ref.slice(0, i), port: ref.slice(i + 1) };
}

/** The added ports of a block or component: { inputs: [{ id, name }], outputs: [...] }, checked against grow. */
function cleanAdded(raw, grow, limits, where) {
  const out = { inputs: [], outputs: [] };
  if (!plain(raw)) return out;
  for (const side of ['inputs', 'outputs']) {
    const list = Array.isArray(raw[side]) ? raw[side] : [];
    if (!list.length) continue;
    const max = Math.min(limits.maxAddedPorts, grow?.[side]?.max ?? (grow === null ? limits.maxAddedPorts : 0));
    if (list.length > max) bad(`${where}: troppe porte aggiunte (al massimo ${max})`);
    const seen = new Set();
    for (const p of list) {
      if (!plain(p) || !/^x\d{1,3}$/.test(String(p.id ?? '')) || seen.has(p.id)) bad(`${where}: porta aggiunta non valida`);
      seen.add(p.id);
      out[side].push({ id: p.id, name: String(p.name ?? p.id).slice(0, 60) });
    }
  }
  return out;
}

/** The consoles: of the project, or of a schema alone. The main one is always there. */
function consolesOf(doc, limits) {
  const raw = plain(doc?.consoles) ? doc.consoles : {};
  const list = [];
  const seen = new Set();
  for (const c of Array.isArray(raw.list) ? raw.list : []) {
    if (!plain(c) || !ID.test(String(c.id ?? '')) || seen.has(c.id)) continue;
    seen.add(c.id);
    list.push({ id: c.id, name: String(c.name ?? c.id).slice(0, 60), color: typeof c.color === 'string' ? c.color.slice(0, 20) : null, keep: clamp(c.keep, 100, 10000, 1000), main: c.id === 'main' });
  }
  if (!seen.has('main')) list.unshift({ id: 'main', name: 'Principale', color: null, keep: 1000, main: true });
  if (list.length > limits.maxConsoles) bad(`Troppe console: al massimo ${limits.maxConsoles}`);
  return {
    list,
    outside: LEVELS.includes(raw.outside) ? raw.outside : 'onInput',
    closeAfterAnswer: raw.closeAfterAnswer !== false,
    notify: raw.notify !== false,
    copyToLog: raw.copyToLog === 'all' || raw.copyToLog === 'none' ? raw.copyToLog : 'warnings',
    hiddenNoFallback: raw.hiddenNoFallback === 'fallback' ? 'fallback' : 'cancel',
    mainOpens: raw.mainOpens === 'onInput' ? 'onInput' : 'start',
  };
}

/** Round-3 decision 8, an option of the project (its app): what the open windows share. */
function optionsOf(project) {
  const o = plain(project?.options) ? project.options : {};
  return { keepValues: o.keepValues !== false, syncCopies: o.syncCopies !== false };
}

const clamp = (v, min, max, d) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Math.round(Number(v)))) : d);

/** Which blocks of the spec are of what type (for the worker's catalog check). */
export const typesOf = spec => [...new Set(Object.values(spec.schemas).flatMap(s => s.blocks.map(b => b.type)))];
