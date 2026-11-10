import { h, icon, LogicCanvas, LogicSchema, LOGIC_FORMATS, actionButton } from '@lilos/sdk';
import { t, i18n } from './i18n.js';

/**
 * The map of the project: each schema a box with its ports (its Ingressi and Uscite di schema),
 * each window a box that says which schemas hold the objects of its components. Linking an
 * output of a schema to an input of another makes a link of the project (in the .lsproj).
 * Drawn with the SDK's LogicCanvas on a document made here (MapDoc): what the canvas changes on
 * it goes to the project.
 */
class MapDoc extends LogicSchema {
  constructor(map) {
    super({ format: LOGIC_FORMATS.schema, name: 'map', blocks: [], links: [], notes: [], view: { x: 0, y: 0, zoom: 1 } });
    this.map = map;
  }
  connect(from, to) {
    const a = this.map.portOf(from), b = this.map.portOf(to);
    if (!a || !b || a.schema === b.schema) return false;
    return this.map.project.link(`${a.schema}:${a.port}`, `${b.schema}:${b.port}`);
  }
  disconnect(links) {
    for (const l of links) {
      const a = this.map.portOf(l.from), b = this.map.portOf(l.to);
      if (a && b) this.map.project.unlink(`${a.schema}:${a.port}`, `${b.schema}:${b.port}`);
    }
  }
  place(positions) {
    this.map.project.edit('mapMove', data => {
      data.map ??= {};
      for (const [id, [x, y]] of Object.entries(positions)) data.map[this.map.keyOf(id)] = [Math.round(x), Math.round(y)];
    });
  }
  removeBlocks() { /* the map removes nothing: elements go from the Progetto panel */ }
  duplicate() { return []; }
  setView(view) { this.map.view = view; }
  addBlock() { return null; }
}

export class ProjectMap {
  el; canvas; view = null;
  #studio; #doc; #defs = []; #ports = new Map();   // 'blockId.port' → { schema, port }

  constructor(studio) {
    this.#studio = studio;
    this.#doc = new MapDoc(this);
    this.canvas = new LogicCanvas({ schema: this.#doc, catalog: { packages: [] }, lang: i18n.lang, labels: { error: t('port.error') } });
    this.el = h('div', { class: 'ls-editor ls-map' }, this.canvas.el);
    this.canvas.on('select', () => studio.inspector.render());
    this.canvas.on('open', ({ id }) => {
      const [kind, ...rest] = id.split('__');
      const name = this.#nameOf(id);
      const path = studio.ws.project.data[kind === 's' ? 'schemas' : 'windows'][name];
      if (path && rest) studio.openElement(kind === 's' ? 'schemas' : 'windows', path);
    });
    this.project.on('change', () => this.rebuild());
    studio.ws.on('change', () => this.rebuild());
    this.rebuild().then(() => requestAnimationFrame(() => this.canvas.fit()));
  }

  get project() { return this.#studio.ws.project; }

  portOf([block, port]) { return this.#ports.get(`${block}.${port}`) ?? null; }
  /** Where a box's position is kept in the project: 'schema:<name>' | 'window:<name>'. */
  keyOf(id) { return `${id.startsWith('s__') ? 'schema' : 'window'}:${this.#names.get(id)}`; }
  #nameOf(id) { return this.#names.get(id); }
  #names = new Map();

  /** The boxes and links from the project and its schemas (loaded to read their ports). */
  async rebuild() {
    const ws = this.#studio.ws;
    const data = this.project.data;
    const blocks = [], links = [], defs = [];
    this.#ports.clear();
    this.#names.clear();
    const pos = data.map ?? {};
    let i = 0;
    const schemaPorts = {};
    for (const [name, path] of Object.entries(data.schemas)) {
      const doc = await ws.doc(path).catch(() => null);
      const ports = doc ? doc.schemaPorts(type => this.#studio.blockDef(type)) : { inputs: [], outputs: [] };
      schemaPorts[name] = ports;
      const id = `s__${i++}`;
      this.#names.set(id, name);
      const type = `map.s${i}`;
      defs.push({
        type, version: 1, category: 'schema', icon: 'blocks', label: { en: name },
        inputs: ports.inputs.map((p, k) => ({ name: `i${k}`, label: p.name, type: p.type })),
        outputs: ports.outputs.map((p, k) => ({ name: `o${k}`, label: p.name, type: p.type })),
      });
      ports.inputs.forEach((p, k) => this.#ports.set(`${id}.i${k}`, { schema: name, port: p.name }));
      ports.outputs.forEach((p, k) => this.#ports.set(`${id}.o${k}`, { schema: name, port: p.name }));
      const [x, y] = pos[`schema:${name}`] ?? [40 + (i - 1) % 3 * 280, 40 + Math.floor((i - 1) / 3) * 220];
      blocks.push({ id, type, v: 1, x, y, config: {}, ports: {} });
    }
    for (const [name, path] of Object.entries(data.windows)) {
      const win = await ws.doc(path).catch(() => null);
      const id = `w__${i++}`;
      this.#names.set(id, name);
      const holders = new Set();
      for (const [sname, spath] of Object.entries(data.schemas)) {
        const s = ws.loaded(spath);
        if (s?.componentObjects(type => this.#studio.blockDef(type)).some(o => o.window === name)) holders.add(sname);
      }
      const type = `map.w${i}`;
      defs.push({ type, version: 1, category: 'ui', icon: 'window', label: { en: `${name}${data.main === name ? ' ★' : ''}` }, inputs: [], outputs: [],
        config: [{ key: 'info', type: 'text' }] });
      const [x, y] = pos[`window:${name}`] ?? [40 + (i - 1) % 3 * 280, 300 + Math.floor((i - 1) / 3) * 160];
      const count = win ? win.components(tp => this.#studio.componentDef(tp)).length : 0;
      blocks.push({ id, type, v: 1, x, y, config: { info: holders.size ? t('map.objectsIn', { list: [...holders].join(', '), n: count }) : t('map.noObjects', { n: count }) }, ports: {} });
    }
    const idOf = (schema, port, side) => {
      for (const [key, v] of this.#ports) if (v.schema === schema && v.port === port && key.split('.')[1][0] === side) return key.split('.');
      return null;
    };
    for (const l of data.links) {
      const [fs, fp] = l.from.split(/:(.*)/s), [ts, tp] = l.to.split(/:(.*)/s);
      const from = idOf(fs, fp, 'o'), to = idOf(ts, tp, 'i');
      if (from && to) links.push({ from, to });
    }
    this.#defs = defs;
    this.canvas.setCatalog({ packages: [{ name: 'map', blocks: defs }] });
    this.#doc.data = { ...this.#doc.data, blocks, links };
    this.canvas.refresh(true);
    this.#studio.inspector.render();
  }

  setCatalog() { this.rebuild(); }
  destroy() { this.canvas.destroy(); }

  statusText() { return t('status.map', { schemas: Object.keys(this.project.data.schemas).length, windows: Object.keys(this.project.data.windows).length, links: this.project.data.links.length }); }

  toolbar(b) {
    return [b('fit', t('tb.fit'), () => this.canvas.fit())];
  }

  /** Proprietà for the map: the project, or the selected box. */
  inspector() {
    const data = this.project.data;
    const sel = this.canvas.selection.blocks;
    const out = [];
    if (sel.length === 1) {
      const name = this.#nameOf(sel[0]);
      const kind = sel[0].startsWith('s__') ? 'schemas' : 'windows';
      out.push(h('div', { class: 'ls-insp-h' }, icon(kind === 'schemas' ? 'blocks' : 'window'), h('b', {}, name)));
      out.push(h('p', { class: 'ls-hint' }, data[kind][name]));
      out.push(h('div', { class: 'ls-insp-acts' }, actionButton({ label: t('explorer.open'), icon: icon('open'), onClick: () => this.#studio.openElement(kind, data[kind][name]) })));
      return out;
    }
    out.push(h('h5', { class: 'ls-sec' }, t('map.project')));
    out.push(h('div', { class: 'ls-field ro' }, h('span', {}, t('inspector.name')), h('b', {}, data.name)));
    out.push(h('div', { class: 'ls-field ro' }, h('span', {}, t('map.main')), h('b', {}, data.main ?? '—')));
    out.push(h('h5', { class: 'ls-sec' }, t('map.links')));
    if (!data.links.length) out.push(h('p', { class: 'ls-hint' }, t('map.noLinks')));
    for (const l of data.links) {
      out.push(h('div', { class: 'ls-port-line' }, h('span', {}, `${l.from.replace(':', ' › ')}  →  ${l.to.replace(':', ' › ')}`),
        h('button', { type: 'button', class: 'ls-link-btn danger', onclick: () => this.project.unlink(l.from, l.to) }, t('inspector.unlink'))));
    }
    out.push(h('p', { class: 'ls-hint' }, t('map.hint')));
    return out;
  }
}
