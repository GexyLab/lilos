import { Window, h, icon, fs, logic, messageBox, resizeHandle, storage } from '@lilos/sdk';
import { pickFile } from '@lilos/system';
import * as system from '@lilos/system';   // logicHost: lilOS ≥ 1.37.0
import { TabBar } from '../shared/TabBar.js';
import { Workspace } from './workspace.js';
import { Explorer } from './explorer.js';
import { Palette } from './palette.js';
import { SchemaEditor } from './schemaEditor.js';
import { WindowEditor } from './windowEditor.js';
import { ProjectMap } from './projectMap.js';
import { Inspector } from './inspector.js';
import { BottomPanel } from './bottom.js';
import { Runner } from './run.js';
import { Home } from './home.js';
import { openProjectOptions } from './options.js';
import { createApp } from './createApp.js';
import { t, i18n } from './i18n.js';
import './logicstudio.css';

/**
 * Logic Studio IDE: projects of Logic Studio (schemas of logic blocks, windows made of
 * Componenti UI, consoles) edited and tried here; the engine (kernel module logicstudio-engine)
 * runs them.
 *
 *   left     Progetto (the project's elements, in folders: explorer.js) · Blocchi / Componenti (palette.js)
 *   center   the tabs: Home (home.js), the project's map (projectMap.js), schemas (schemaEditor.js),
 *            windows (windowEditor.js)
 *   right    Proprietà of what is selected (inspector.js); ports are added and removed only there
 *   bottom   the consoles of the running test, Problemi (bottom.js)
 *
 * args.file: a .lsproj or .lsch to open (also from «Apri con»).
 */
export default function createMain({ args, openWindow } = {}) {
  // An app made from a project (.lsapp): lilOS runs it, the IDE does not open
  if (args?.file && isApp(args.file)) {
    system.logicHost?.runApp(args.file);
    const win = new Window({ title: t('app.name'), icon: 'blocks', width: 280, height: 120 });
    setTimeout(() => win.emit('close'), 0);
    return win;
  }
  const studio = new Studio(openWindow);
  if (args?.file && fs.exists(args.file)) studio.open(args.file);
  studio.win.on('launch', a => {
    if (a?.file && isApp(a.file)) system.logicHost?.runApp(a.file);
    else if (a?.file && fs.exists(a.file)) studio.open(a.file);
  });
  return studio.win;
}

const isApp = id => fs.get(id)?.name.toLowerCase().endsWith('.lsapp');

class Studio {
  win; openWindow; ws = null; catalog = null;
  tabs = [];            // [{ key, kind: 'home'|'map'|'schema'|'window', label, path, view, doc }]
  active = null;
  #abort = new AbortController();

  constructor(openWindow) {
    this.openWindow = openWindow;
    this.win = new Window({ title: t('app.name'), icon: 'blocks', width: 1240, height: 760, minWidth: 760, minHeight: 480 });
    this.win.getState = () => ({ file: this.ws ? this.ws.projectFile ?? this.ws.single : null });
    this.win.canClose = () => this.canClose();
    this.win.on('destroy', () => { this.#abort.abort(); this.runner?.stop(); });

    this.tabBar = new TabBar({ t, signal: this.#abort.signal, label: t('tabs.label'), newButton: false, reorder: true });
    this.tabBar.on('select', key => this.show(key));
    this.tabBar.on('close', key => this.closeTab(key));
    this.tabBar.on('move', ({ key, index }) => { const i = this.tabs.findIndex(x => x.key === key); const [tab] = this.tabs.splice(i, 1); this.tabs.splice(index, 0, tab); this.renderTabs(); });

    this.toolbar = h('div', { class: 'ls-tbar' });
    this.center = h('div', { class: 'ls-center' });
    this.explorer = new Explorer(this);
    this.palette = new Palette(this);
    this.inspector = new Inspector(this);
    this.bottom = new BottomPanel(this);
    this.runner = new Runner(this);
    this.status = h('div', { class: 'ls-sbar' });

    this.leftTabs = h('div', { class: 'ls-ltabs', role: 'tablist' });
    this.leftBody = h('div', { class: 'ls-lbody' });
    this.left = h('div', { class: 'ls-left' }, this.leftTabs, this.leftBody);
    this.right = h('div', { class: 'ls-right' }, this.inspector.el);
    const sizes = storage.get('logicstudio.panels', { left: 220, right: 280 });
    this.left.style.width = `${sizes.left}px`;
    this.right.style.width = `${sizes.right}px`;
    const grip = (panel, side, invert) => resizeHandle({
      get: () => panel.offsetWidth, min: 170, max: 480, reset: side === 'left' ? 220 : 280, invert, host: panel, label: t('left.resize'),
      set: (px, final) => { panel.style.width = `${px}px`; if (final) storage.set('logicstudio.panels', { ...storage.get('logicstudio.panels', {}), [side]: px }); },
    });
    const leftGrip = grip(this.left, 'left', false);
    const rightGrip = grip(this.right, 'right', true);
    this.main = h('div', { class: 'ls-main' }, this.center, this.bottom.el);
    this.win.body.append(h('div', { class: 'ls lgc-scope' },
      this.tabBar.el, this.toolbar,
      h('div', { class: 'ls-work' }, this.left, leftGrip, this.main, rightGrip, this.right),
      this.status));
    this.leftTab = 'project';
    this.home = new Home(this);
    this.explorer.render();
    this.bottom.render();
    this.tabs.push({ key: 'home', kind: 'home', label: t('tabs.home'), view: this.home });
    this.show('home');
    this.#keys();
    this.loadCatalog();
  }

  // ------------------------------------------------------------------ catalog and status

  async loadCatalog() {
    try {
      this.catalog = await logic.catalog({ fresh: true });
      this.limits = (await logic.status()).limits;
      this.components = await logic.allComponents();
      this.engineError = null;
    } catch (err) {
      this.catalog = { packages: [] };
      this.components = new Map();
      this.engineError = err.message;
    }
    for (const tab of this.tabs) tab.view?.setCatalog?.(this.catalog);
    this.palette.render();
    this.renderStatus();
  }

  blockDef(type) {
    for (const p of this.catalog?.packages ?? []) { const b = p.blocks.find(x => x.type === type); if (b) return b; }
    return null;
  }

  componentDef(type) {
    for (const p of this.catalog?.packages ?? []) { const c = p.components.find(x => x.type === type); if (c) return c; }
    return null;
  }

  label(obj) { return obj?.label?.[i18n.lang] ?? obj?.label?.en ?? obj?.type ?? ''; }

  renderStatus() {
    const tab = this.current;
    const parts = [];
    if (this.engineError) parts.push(h('span', { class: 'ls-eng off' }, t('status.noEngine')));
    else parts.push(h('span', { class: 'ls-eng' }, t('status.engine', { n: (this.catalog?.packages ?? []).length })));
    if (tab?.view?.statusText) parts.push(h('span', {}, tab.view.statusText()));
    if (this.runner.program) parts.push(h('span', { class: 'ls-run-st' }, this.runner.statusText()));
    parts.push(h('span', { class: 'sp' }));
    if (this.ws) parts.push(h('span', {}, this.ws.project ? t('status.project', { name: this.ws.name }) : t('status.single')));
    this.status.replaceChildren(...parts);
  }

  // ------------------------------------------------------------------ project

  /** Opens a project (.lsproj) or a schema alone (.lsch); a .lsui opens its project if it is in one. */
  async open(fileId) {
    if (!(await this.canClose())) return;
    let target = fileId;
    const node = fs.get(fileId);
    if (node?.name.toLowerCase().endsWith('.lsui')) {
      const proj = findProjectAbove(node.parent);
      if (!proj) { await messageBox(this.win, { icon: 'warning', title: t('open.uiAlone'), text: t('open.uiAloneText') }); return; }
      target = proj;
    }
    try {
      const ws = await Workspace.open(target);
      this.setWorkspace(ws);
      if (node?.name.toLowerCase().endsWith('.lsui')) this.openElement('windows', ws.relative(fileId));
      else if (ws.single) this.openElement('schemas', fs.get(ws.single).name);
      else this.openMap();
      recent.add(target);
    } catch (err) {
      await messageBox(this.win, { icon: 'error', title: t('open.failed'), text: err.message });
    }
  }

  setWorkspace(ws) {
    this.runner.stop();
    for (const tab of this.tabs.filter(x => x.kind !== 'home')) tab.view?.destroy?.();
    this.tabs = this.tabs.filter(x => x.kind === 'home');
    this.ws = ws;
    ws.on('dirty', () => { this.renderTabs(); this.renderToolbar(); });
    ws.on('change', () => { this.explorer.render(); this.inspector.render(); });
    ws.project?.on('change', () => this.bottom.render());
    this.win.setTitle(t('app.name'), ws.name);
    this.explorer.render();
    this.bottom.render();
    this.renderTabs();
  }

  async newProject() {
    const res = await messageBox(this.win, {
      icon: 'blocks', title: t('new.title'), text: t('new.text', { folder: t('new.folder') }),
      fields: [{ name: 'name', label: t('new.name'), value: t('new.default'), required: true, maxLength: 80 }],
      buttons: ['cancel', { value: 'ok', label: t('new.create'), primary: true }],
    });
    if (res?.button !== 'ok') return;
    const base = ensureFolder(fs.root, t('new.folder'));
    const file = await Workspace.create(base, res.values.name);
    await this.open(file);
  }

  async openProjectPicker() {
    const file = await pickFile(this.openWindow, { title: t('open.pick'), exts: ['lsproj', 'lsch'] });
    if (file) await this.open(file.id ?? file);
  }

  /** Opens an element of the project in its tab. kind 'schemas' | 'windows', path relative to the project. */
  async openElement(kind, path) {
    const key = `${kind}:${path}`;
    if (this.tabs.some(x => x.key === key)) { this.show(key); return; }
    try {
      const doc = await this.ws.doc(path);
      const name = this.ws.single ? doc.data.name : this.ws.nameOf(kind, path) ?? path;
      const view = kind === 'schemas' ? new SchemaEditor(this, doc, name) : new WindowEditor(this, doc, name);
      this.tabs.push({ key, kind: kind === 'schemas' ? 'schema' : 'window', label: name, path, view, doc });
      doc.on('change', () => this.renderTabs());
      this.runner.attachTab(this.tabs.at(-1));
      this.show(key);
    } catch (err) {
      await messageBox(this.win, { icon: 'error', title: t('open.failed'), text: err.message });
    }
  }

  openMap() {
    if (!this.ws?.project) return;
    if (!this.tabs.some(x => x.key === 'map')) this.tabs.splice(1, 0, { key: 'map', kind: 'map', label: t('tabs.map', { name: this.ws.name }), view: new ProjectMap(this) });
    this.show('map');
  }

  get current() { return this.tabs.find(x => x.key === this.active) ?? null; }

  show(key) {
    const tab = this.tabs.find(x => x.key === key);
    if (!tab) return;
    this.current?.view?.hide?.();
    this.active = key;
    this.center.replaceChildren(tab.view.el);
    tab.view.show?.();
    this.renderTabs();
    this.renderToolbar();
    this.renderLeft();
    this.inspector.render();
    this.renderStatus();
  }

  async closeTab(key) {
    const tab = this.tabs.find(x => x.key === key);
    if (!tab || tab.kind === 'home') return;
    if (tab.doc?.dirty) {
      const res = await messageBox(this.win, {
        icon: 'warning', title: t('close.unsaved', { name: tab.label }), text: t('close.unsavedText'),
        buttons: ['cancel', { value: 'discard', label: t('close.discard'), danger: true }, { value: 'save', label: t('common.save'), primary: true }],
      });
      if (!res || res === 'cancel') return;
      if (res === 'save') await this.ws.save(tab.doc);
    }
    tab.view.destroy?.();
    const i = this.tabs.indexOf(tab);
    this.tabs.splice(i, 1);
    if (this.active === key) this.show(this.tabs[Math.max(0, i - 1)].key);
    else this.renderTabs();
  }

  renderTabs() {
    this.tabBar.render(this.tabs.map(x => ({
      key: x.key, label: x.label, icon: { home: 'home', map: 'grid', schema: 'blocks', window: 'window' }[x.kind],
      dirty: x.kind === 'map' ? !!this.ws?.project?.dirty : !!x.doc?.dirty,
      closeLabel: x.kind === 'home' ? null : undefined, class: x.kind === 'home' ? 'ls-home-tab' : '',
    })), this.active);
  }

  // ------------------------------------------------------------------ toolbar

  renderToolbar() {
    const tab = this.current;
    const doc = tab?.doc ?? (tab?.kind === 'map' ? this.ws?.project : null);
    const b = (glyph, label, onClick, { disabled = false, cls = '', title = null } = {}) => h('button', { class: `ls-tb ${cls}`, type: 'button', disabled, title: title ?? label, onclick: onClick }, glyph ? icon(glyph) : null, label ? h('span', {}, label) : null);
    const items = [];
    if (this.ws) {
      items.push(b('save', t('tb.save'), () => this.saveAll(), { disabled: !this.ws.dirty, title: `${t('tb.save')} (Ctrl+S)` }));
      items.push(h('span', { class: 'sep' }));
      items.push(b('undo', null, () => doc?.history.undo(), { disabled: !doc?.history.canUndo, title: t('tb.undo') }));
      items.push(b('redo', null, () => doc?.history.redo(), { disabled: !doc?.history.canRedo, title: t('tb.redo') }));
      items.push(h('span', { class: 'sep' }));
      if (this.runner.program) {
        items.push(b('play', this.runner.statusText(), null, { cls: 'run', disabled: true }));
        items.push(b('stop', t('tb.stop'), () => this.runner.stop(), { cls: 'stop' }));
      } else {
        items.push(b('play', t('tb.test'), () => this.runner.test(), { cls: 'test', title: `${t('tb.test')} (F5)` }));
      }
      items.push(b('power', t('tb.activate'), () => this.runner.activate(), { title: t('tb.activateHint') }));
      items.push(h('span', { class: 'sep' }));
      if (tab?.view?.toolbar) items.push(...tab.view.toolbar(b));
      this.current?.view?.setLimits?.(this.limits ?? {});
      items.push(h('span', { class: 'sp' }));
      if (this.ws.project) {
        items.push(b('grid', t('tb.map'), () => this.openMap()));
        items.push(b('box', t('tb.createApp'), () => createApp(this), { title: t('tb.createAppHint') }));
        items.push(b('gear', t('tb.options'), () => openProjectOptions(this)));
      }
    } else {
      items.push(b('plus', t('home.new'), () => this.newProject()));
      items.push(b('open', t('home.open'), () => this.openProjectPicker()));
    }
    this.toolbar.replaceChildren(...items);
    doc?.history && !doc._lsHistory && (doc._lsHistory = true, doc.history.on('change', () => this.renderToolbar()));
  }

  renderLeft() {
    const tab = this.current;
    const second = tab?.kind === 'window' ? 'components' : 'blocks';
    if (this.leftTab !== 'project') this.leftTab = second;
    const tabBtn = (key, label) => h('button', { type: 'button', role: 'tab', class: this.leftTab === key ? 'on' : '', 'aria-selected': String(this.leftTab === key), onclick: () => { this.leftTab = key; this.renderLeft(); } }, label);
    this.leftTabs.replaceChildren(tabBtn('project', t('left.project')), tabBtn(second, second === 'components' ? t('left.components') : t('left.blocks')));
    this.leftBody.replaceChildren(this.leftTab === 'project' ? this.explorer.el : this.palette.el);
    if (this.leftTab !== 'project') this.palette.render();
  }

  // ------------------------------------------------------------------ saving, closing

  async saveAll() {
    if (!this.ws) return;
    try {
      await this.ws.saveAll();
    } catch (err) {
      await messageBox(this.win, { icon: 'error', title: t('save.failed'), text: err.message });
    }
    this.renderTabs();
    this.renderToolbar();
  }

  async canClose() {
    if (!this.ws?.dirty) return true;
    const res = await messageBox(this.win, {
      icon: 'warning', title: t('close.project', { name: this.ws.name }), text: t('close.unsavedText'),
      buttons: ['cancel', { value: 'discard', label: t('close.discard'), danger: true }, { value: 'save', label: t('close.saveAll'), primary: true }],
    });
    if (!res || res === 'cancel') return false;
    if (res === 'save') await this.saveAll();
    return true;
  }

  #keys() {
    this.win.el.addEventListener('keydown', e => {
      const mod = e.ctrlKey || e.metaKey;
      const editing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '');
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); this.saveAll(); return; }
      if (e.key === 'F5') { e.preventDefault(); this.runner.program ? this.runner.stop() : this.runner.test(); return; }
      if (editing) return;
      const doc = this.current?.doc ?? (this.current?.kind === 'map' ? this.ws?.project : null);
      if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); doc?.history.undo(); }
      else if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); doc?.history.redo(); }
    }, { signal: this.#abort.signal });
  }
}

/** The .lsproj of the nearest folder above (a window opened alone belongs to its project). */
function findProjectAbove(folderId) {
  for (let id = folderId; id; id = fs.get(id)?.parent) {
    const proj = fs.children(id).find(n => n.type === 'file' && n.name.toLowerCase().endsWith('.lsproj'));
    if (proj) return proj.id;
    if (id === fs.root) break;
  }
  return null;
}

function ensureFolder(parentId, name) {
  return fs.children(parentId).find(n => n.type === 'folder' && n.name.toLowerCase() === name.toLowerCase())?.id
    ?? fs.create(parentId, { type: 'folder', name }).id;
}

/** The projects opened lately (this user): ids of their files. */
export const recent = {
  list: () => (storage.get('logicstudio.recent', []) ?? []).filter(id => typeof id === 'string' && fs.exists(id)),
  add(id) { storage.set('logicstudio.recent', [id, ...this.list().filter(x => x !== id)].slice(0, 10)); },
};

