import { Window, h, fs, kernel, locale, logic, notifications, storage, actionButton, LogicUI, LogicConsoles, LogicConsoleView } from '@lilos/sdk';
import { onKernelEvent } from '../apps/services.js';
import { systemActions } from '../notifications/card.js';
import { notify } from '../notifications/notify.js';
import { pickFile } from '../apps/filePicker.js';
import { launch } from '../apps/registry.js';

const { t } = locale.define('lilos:logic', {
  en: { strings: {
    asks: '{name}: the console {console} asks for something',
    failed: '{name} stopped: {error}',
    consoleTitle: 'Console {name}',
    consoleAll: 'Console',
    noWindows: '{name} has no windows',
    notRunning: '{name} is not running: activate it in Logic Studio',
    gone: 'The program is not there any more',
    badApp: 'This is not an app made by Logic Studio, or its files are missing',
    consentTitle: 'Run «{name}»?',
    consentText: 'This app was made with Logic Studio and runs as you. It can:',
    consentFrom: 'From {path}. Run it only if you trust who made it.',
    capFiles: 'read and change your files',
    capNet: 'make requests on the internet',
    capNotify: 'send you notifications',
    capEvents: 'send events to your lilOS',
    run: 'Run',
    cancel: 'Cancel',
    appFailed: '{name} did not start: {error}',
  } },
});

/**
 * The windows of Logic Studio's projects, opened by lilOS without the IDE (D88): a project
 * running in the engine (an active program, or the program of an app made from a project) shows
 * its windows here, drawn with the SDK's LogicUI and bound to the program live.
 *
 *   logicHost.openMain(programId)              its main window
 *   logicHost.openWindow(programId, name)      one of its windows (a button's «Apri una finestra»)
 *   logicHost.openConsole(programId, console)  a console (or all of them together: null)
 *   logicHost.projects() → [program]           the active programs, for the apps menu (cached; 'change')
 *   logicHost.runApp(fileId)                   an app made from a project («Crea app»), run without
 *                                              installing it: its .lsapp file; the program lasts while
 *                                              its windows are open
 *
 * The consoles follow the project's option «Fuori dall'IDE»: all of them when its windows open,
 * only when a block asks for something (and closed after the answer), never, or all in the main
 * one. A question with no window of the project open becomes a notification that opens the console.
 */
class LogicHost {
  #wm = null;
  #programs = new Map();     // id → { info, live, consoles: LogicConsoles, windows: Map(name → Window), consoleWins: Map(id|'*' → Window) }
  #active = [];
  #limits = null;            // the engine's global limits (chartPoints…)
  #apps = new Map();         // program id → the app's manifest (programs of apps run here: stopped with their last window)
  #listeners = new Set();

  connect({ wm }) {
    this.#wm = wm;
    if (!kernel.connected) return;
    onKernelEvent('logicstudio.ask', data => this.#asked(data));
    onKernelEvent('logicstudio.failed', ({ name, error }) => notify(t('failed', { name, error }), { level: 'error' }));
    onKernelEvent('', () => this.refresh());
    systemActions.set('logicstudio.console', args => this.openConsole(args?.id, args?.console ?? null));
    systemActions.set('logicstudio.main', args => this.openMain(args?.id));
    this.refresh();
  }

  /** The active programs of the user, for the apps menu. */
  projects() { return this.#active; }

  on(fn) { this.#listeners.add(fn); return () => this.#listeners.delete(fn); }

  async refresh() {
    try {
      this.#limits ??= (await logic.status()).limits;
      this.#active = (await logic.programs()).filter(p => p.kind === 'active' && p.status === 'running' && p.windows.length);
    } catch {
      this.#active = [];
    }
    this.#listeners.forEach(fn => fn());
  }

  /** The program's state here: its documents, its live connection, its consoles. */
  async #program(id) {
    let p = this.#programs.get(id);
    if (p) return p;
    const info = await logic.windows(id);
    if (info.status !== 'running' && info.status !== 'starting') throw new Error(t('notRunning', { name: info.name }));
    const live = logic.live(id);
    p = { info, live, consoles: new LogicConsoles(live), windows: new Map(), consoleWins: new Map(), ui: await logic.ui(id).catch(() => ({})) };
    this.#programs.set(id, p);
    const mode = info.consoles?.outside ?? 'onInput';
    p.consoles.on('ask', ({ console }) => {
      if (mode === 'onInput') this.openConsole(id, console);
      else if (mode === 'main') this.openConsole(id, null);
      else if (mode === 'all') this.openConsole(id, console);
    });
    p.consoles.on('done', ({ console }) => {
      if (mode === 'onInput' && info.consoles?.closeAfterAnswer !== false) p.consoleWins.get(console)?.emit('close');
    });
    live.on('status', ({ status }) => { if (status === 'stopped' || status === 'failed') this.#ended(id); });
    live.on('gone', () => this.#ended(id));
    return p;
  }

  /** The program stopped: its windows close, its connection goes. */
  #ended(id) {
    const p = this.#programs.get(id);
    if (!p) return;
    this.#programs.delete(id);
    for (const w of [...p.windows.values(), ...p.consoleWins.values()]) w.emit('close');
    p.consoles.destroy();
    p.live.close();
    this.refresh();
  }

  /** The last window of a program closed (consoles apart): nothing to keep open. */
  #maybeRelease(id) {
    const p = this.#programs.get(id);
    // An app run from its folder ends with its last window
    if (p && !p.windows.size && this.#apps.has(id)) {
      this.#apps.delete(id);
      for (const w of p.consoleWins.values()) w.emit('close');
      logic.stop(id).then(() => logic.forget(id)).catch(() => {});
      return;
    }
    if (!p || p.windows.size || p.consoleWins.size) return;
    this.#programs.delete(id);
    p.consoles.destroy();
    p.live.close();
  }

  async openMain(id) {
    try {
      const p = await this.#program(id);
      if (!p.info.main) { notify(t('noWindows', { name: p.info.name }), { level: 'warning' }); return; }
      await this.openWindow(id, p.info.main);
    } catch (err) {
      notify(err.message || t('gone'), { level: 'warning' });
    }
  }

  async openWindow(id, name, values = null) {
    const p = await this.#program(id);
    const doc = p.info.windows[name];
    if (!doc) return;
    const open = p.windows.get(name);
    if (open) { this.#wm.focus?.(open); open.emit('launch'); return; }
    const first = !p.windows.size;
    const size = doc.size ?? { w: 480, h: 360 };
    const win = new Window({ title: doc.title || name, subtitle: p.info.name, icon: 'blocks', width: size.w, height: size.h + 30, resizable: size.resizable !== false });
    const texts = p.info.texts?.[locale.code] ?? p.info.texts?.[locale.code?.split('-')[0]] ?? {};
    const ui = new LogicUI({ window: doc, components: await logic.allComponents(), lang: locale.code, texts, host: this.#hostFor(id, win), mode: 'live' });
    ui.attach(p.live, name);
    if (p.info.options?.keepValues !== false) ui.restore(p.ui);
    ui.on('action', ({ action }) => {
      if (action.kind === 'open' && action.window) this.openWindow(id, action.window);
      if (action.kind === 'close') win.emit('close');
    });
    win.body.append(h('div', { class: 'logic-win' }, ui.el));
    win.on('destroy', () => { ui.destroy(); (win.logicUrls ?? []).forEach(u => URL.revokeObjectURL(u)); p.windows.delete(name); this.#maybeRelease(id); });
    p.windows.set(name, win);
    this.#wm.open(win, { key: `logic:${id}:${name}` });
    // «Mostrale tutte»: every console with the first window; «Tutte nella principale», at the start
    const mode = p.info.consoles?.outside;
    if (first && mode === 'all') for (const c of p.consoles.list()) this.openConsole(id, c.id);
    if (first && mode === 'main' && p.info.consoles?.mainOpens !== 'onInput') this.openConsole(id, null);
  }

  /** A console of the program in its window (null: all of them together, «Tutte nella principale»). */
  async openConsole(id, console = null) {
    let p;
    try { p = await this.#program(id); } catch (err) { notify(err.message || t('gone'), { level: 'warning' }); return; }
    const key = console ?? '*';
    const open = p.consoleWins.get(key);
    if (open) { this.#wm.focus?.(open); return; }
    const c = console ? p.consoles.get(console) : null;
    const win = new Window({ title: console ? t('consoleTitle', { name: c?.name ?? console }) : t('consoleAll'), subtitle: p.info.name, icon: 'terminal', width: 560, height: 320 });
    const view = new LogicConsoleView(p.consoles, { console });
    win.body.append(view.el);
    win.on('destroy', () => { view.destroy(); p.consoleWins.delete(key); this.#maybeRelease(id); });
    p.consoleWins.set(key, win);
    this.#wm.open(win, { key: `logic:${id}:console:${key}` });
    setTimeout(() => view.focus(), 50);
  }

  /**
   * Runs an app made from a project without installing it: <folder>/<id>.lsapp says where its
   * manifest (lilos.json) and its project are. Only for the user who runs it; it lasts while its
   * windows are open.
   */
  async runApp(fileId) {
    let manifest = null;
    try {
      const node = fs.get(fileId);
      const marker = JSON.parse(await fs.read(fileId));
      if (marker?.format !== 'lilos-lsapp/1') throw new Error(t('badApp'));
      const at = rel => {
        let id = node.parent;
        for (const part of String(rel).split('/').filter(Boolean)) {
          id = fs.children(id).find(n => n.name === part)?.id;
          if (!id) throw new Error(t('badApp'));
        }
        return id;
      };
      manifest = JSON.parse(await fs.read(at(marker.manifest ?? 'lilos.json')));
      const projFile = at(marker.project);
      const project = JSON.parse(await fs.read(projFile));
      const inProject = rel => {
        let id = fs.get(projFile).parent;
        for (const part of String(rel).split('/').filter(Boolean)) {
          id = fs.children(id).find(n => n.name === part)?.id;
          if (!id) throw new Error(t('badApp'));
        }
        return id;
      };
      const read = async map => Object.fromEntries(await Promise.all(Object.entries(map ?? {}).map(async ([name, rel]) => [name, JSON.parse(await fs.read(inProject(rel)))])));
      const documents = { project, schemas: await read(project.schemas), windows: await read(project.windows) };
      if (!(await this.#consent(manifest, documents, fs.path(fileId)))) return null;
      const program = await logic.start({ kind: 'app', name: manifest.name ?? project.name, documents, source: { path: fs.path(projFile) }, lang: locale.code });
      this.#apps.set(program.id, manifest);
      await this.openMain(program.id);
      return program;
    } catch (err) {
      notify(t('appFailed', { name: manifest?.name ?? fs.get(fileId)?.name ?? '', error: err.message }), { level: 'error' });
      return null;
    }
  }

  /**
   * What an app may do as the user who runs it (its blocks that use files, the network…): asked
   * once for that package as it is now; a changed package asks again.
   */
  async #consent(manifest, documents, path) {
    const types = new Set(Object.values(documents.schemas).flatMap(s => (s.blocks ?? []).map(b => String(b.type))));
    const caps = [];
    if ([...types].some(t => /^lilos\.(file|folder|exists)/.test(t))) caps.push('capFiles');
    if ([...types].some(t => t.startsWith('net.'))) caps.push('capNet');
    if (types.has('lilos.notify')) caps.push('capNotify');
    if (types.has('lilos.event')) caps.push('capEvents');
    if (!caps.length) return true;
    const bytes = new TextEncoder().encode(JSON.stringify([path, documents]));
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
    const granted = storage.get('logicstudio.consents', []) ?? [];
    if (granted.includes(digest)) return true;
    const ok = await new Promise(resolve => {
      const win = new Window({ title: t('consentTitle', { name: manifest.name ?? '' }), icon: 'shield', width: 440, height: 300, resizable: false });
      let answered = false;
      const answer = v => { answered = true; resolve(v); win.emit('close'); };
      win.body.append(h('div', { class: 'logic-consent' },
        h('p', {}, t('consentText')),
        h('ul', {}, ...caps.map(c => h('li', {}, t(c)))),
        h('p', { class: 'hint' }, t('consentFrom', { path })),
        h('div', { class: 'acts' }, actionButton({ label: t('cancel'), onClick: () => answer(false) }), actionButton({ label: t('run'), primary: true, onClick: () => answer(true) }))));
      win.on('destroy', () => { if (!answered) resolve(false); });
      this.#wm.open(win, { key: `logic:consent:${digest.slice(0, 12)}` });
    });
    if (ok) storage.set('logicstudio.consents', [digest, ...granted.filter(d => d !== digest)].slice(0, 200));
    return ok;
  }

  /** What the components of a window may ask of lilOS. */
  #hostFor(id, win) {
    const p = this.#programs.get(id);
    const folder = () => {
      const path = p?.info.source?.path;
      const node = path ? fs.resolve(path) : null;
      return node ? node.parent : null;
    };
    return {
      chartPoints: this.#limits?.chartPoints,
      openWindow: name => this.openWindow(id, name),
      closeWindow: () => win.emit('close'),
      consoleView: consoleId => new LogicConsoleView(p.consoles, { console: consoleId }).el,
      resourceUrl: async path => {
        let at = folder();
        for (const part of String(path).split('/').filter(Boolean)) at = at ? fs.children(at).find(n => n.name === part)?.id : null;
        if (!at || fs.get(at)?.type !== 'file') return null;
        const url = URL.createObjectURL(await fs.readBlob(at));
        (win.logicUrls ??= []).push(url);
        return url;
      },
      pickFile: async ({ kind = 'file', exts = null } = {}) => {
        const node = await pickFile((w, key) => this.#wm.open(w, { key, owner: win }), { kind, exts });
        return node ? fs.path(node.id ?? node) : null;
      },
    };
  }

  /** The engine says a program asks for something and no one watches it: a notification. */
  async #asked({ id, name, console }) {
    const p = this.#programs.get(id);
    if (p) { this.openConsole(id, console); return; }
    let info = null;
    try { info = await logic.windows(id); } catch { return; }
    const mode = info.consoles?.outside;
    if (mode === 'hidden' || info.consoles?.notify === false) return;
    const c = info.consoles?.list?.find(x => x.id === console);
    notifications.send({ text: t('asks', { name, console: c?.name ?? console }), level: 'info', action: { entry: 'logicstudio.console', args: { id, console: mode === 'main' ? null : console } } }).catch(() => {});
  }
}

export const logicHost = new LogicHost();

/** Logic Studio, if installed: the IDE opens the programs' windows from its Home through here too. */
export function openLogicStudio() { launch('logicstudio'); }
