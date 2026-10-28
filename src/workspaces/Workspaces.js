import { Emitter, fs, storage, uid, shortcuts, toast, closeMenu } from '@lilos/sdk';
import { setInstalledFilter, getApp } from '../apps/registry.js';
import { ACCENTS } from '../systemSettings.js';
import { cleanSavedWindow, LIMITS as AREA_LIMITS } from '../workareas/store.js';
import { appIds, createDesk } from './setup.js';
import { connectWorkspaceInfo } from './info.js';
import { saveWorkspaces, newWorkspace, workspaceKey, forgetWorkspace, cleanName, cleanColor, LIMITS } from './store.js';
import { WorkspaceSwitcher } from './WorkspaceSwitcher.js';

const SAVE_DELAY = 400;

/**
 * Workspaces: separate desks. Each one has its own desk folder (private in fs: the others cannot
 * see it, not even in File), its own view of the desk, workareas, open windows and installed
 * apps. Files elsewhere (Documenti, Immagini, Download…) are shared, and every node remembers
 * the workspace that made it (fs `workspace`).
 *
 * Changing workspace keeps the one left exactly as it is: its windows stay open, hidden, with
 * unsaved text and all. Windows outside every workarea are saved per workspace
 * ('lilos:ws:<id>:windows') and come back after a reload, the first time the workspace is shown.
 *
 * Deleting a workspace never deletes files: its desk becomes /Documenti/Scrivania di <nome>
 * (or goes away if empty) and its open app windows move to the current workspace (secondary
 * windows close).
 *
 * Events: 'change' (list, names, colors or apps changed) · 'switch' (id)
 */
export class Workspaces extends Emitter {
  #state;
  #booted = new Set();        // workspaces whose windows were reopened in this session
  #queue = Promise.resolve(); // switches and deletions, one after the other
  #restoring = 0;
  #saveTimer = 0;

  constructor({ state, canvas, desktop, wm, launcher, workareas, taskbar }) {
    super();
    Object.assign(this, { canvas, desktop, wm, launcher, workareas, taskbar });
    this.#state = state;
    setInstalledFilter(id => this.get(this.#state.current)?.apps.includes(id) ?? true);
    connectWorkspaceInfo(this);
    wm.setWorkspace(state.current);
    this.#booted.add(state.current);   // its workareas reopen their windows by themselves at start-up
    this.#queue = this.#restoreWindows(state.current).catch(err => console.error('[lilos] workspace:', err));

    const group = 'Workspace';
    shortcuts.register({ id: 'workspaces.next', label: 'Passa al workspace successivo', group, keys: ['Ctrl+Alt+ArrowRight'], whenEditing: true, when: () => this.list().length > 1, run: () => this.step(1) });
    shortcuts.register({ id: 'workspaces.previous', label: 'Passa al workspace precedente', group, keys: ['Ctrl+Alt+ArrowLeft'], whenEditing: true, when: () => this.list().length > 1, run: () => this.step(-1) });

    this.switcher = new WorkspaceSwitcher(taskbar, this);
    wm.on('open', () => this.#saveSoon());
    wm.on('close', () => this.#saveSoon());
    canvas.on('change', () => this.#saveSoon());
    addEventListener('pagehide', () => this.#saveWindows());
  }

  // ---------- Queries ----------

  /** Live workspaces, in order (copies). */
  list() {
    return structuredClone(this.#state.list.filter(w => !w.removed));
  }

  /** A live workspace (the stored object: do not change it), or null. */
  get(id) {
    return this.#state.list.find(w => w.id === id && !w.removed) ?? null;
  }

  get currentId() { return this.#state.current; }
  get current() { return structuredClone(this.get(this.#state.current)); }

  /** { id, name, color, removed, current } for any workspace ever made here, or null if unknown. */
  describe(id) {
    const w = this.#state.list.find(x => x.id === id);
    return w ? { id: w.id, name: w.name, color: w.color, removed: !!w.removed, current: w.id === this.#state.current } : null;
  }

  /** How many files, folders and shortcuts a workspace made, on its desk and elsewhere. */
  ownedCount(id) {
    return fs.ownedCount(id);
  }

  // ---------- Switching ----------

  /** Shows another workspace. Resolves when its windows are back. */
  switchTo(id) {
    return this.#enqueue(() => this.#switch(id));
  }

  /** Next (1) or previous (-1) workspace, wrapping around. */
  step(dir) {
    const list = this.list();
    const i = list.findIndex(w => w.id === this.#state.current);
    if (list.length > 1) this.switchTo(list[(i + dir + list.length) % list.length].id);
  }

  // ---------- Creating and editing ----------

  /** New workspace with an empty desk and every app installed; returns its id (null if over the limit). */
  create({ name, color } = {}) {
    const live = this.list();
    if (live.length >= LIMITS.MAX_WORKSPACES) {
      toast(`Al massimo ${LIMITS.MAX_WORKSPACES} workspace`);
      return null;
    }
    const id = uid();
    const ws = newWorkspace({
      id, name: cleanName(name) || this.#freeName(), color: color ?? this.#freeColor(),
      desk: createDesk(id), apps: appIds(),
    });
    this.#state.list.splice(live.length, 0, ws);   // after the live ones, before the removed ones
    this.#save();
    return id;
  }

  rename(id, name) {
    const ws = this.get(id);
    const clean = cleanName(name);
    if (!ws || !clean || clean === ws.name) return;
    ws.name = clean;
    this.#save();
  }

  setColor(id, color) {
    const ws = this.get(id);
    if (!ws || cleanColor(color) !== color) return;
    ws.color = color;
    this.#save();
  }

  /** True if the app is installed in the workspace (the current one by default); system apps always. */
  isInstalled(appId, id = this.#state.current) {
    return getApp(appId)?.system === true || !!this.get(id)?.apps.includes(appId);
  }

  /**
   * Installs or removes an app in a workspace. Removing it from the current one closes its windows
   * there (each may ask first, if it has unsaved changes). System apps cannot be removed.
   */
  setInstalled(appId, on, id = this.#state.current) {
    const ws = this.get(id);
    const app = getApp(appId);
    if (!ws || !app || app.system) return;
    if (on === ws.apps.includes(appId)) return;
    ws.apps = on ? [...ws.apps, appId] : ws.apps.filter(a => a !== appId);
    this.#save();
    if (!on) this.wm.windowsOf(id).filter(w => this.wm.appOf(w) === appId).forEach(w => this.wm.requestClose(w));
  }

  /**
   * Deletes a workspace (never the last one). Its files are kept: the desk moves into Documenti
   * as "Scrivania di <nome>" (removed if empty) and the files it made elsewhere stay where they
   * are, still marked as its. Its windows move to the current workspace. If it is the current one,
   * the next one is shown first. Resolves with the path of the old desk, '' if it was empty, or
   * null if nothing was deleted.
   */
  remove(id) {
    return this.#enqueue(async () => {
      const ws = this.get(id);
      const others = this.list().filter(w => w.id !== id);
      if (!ws || !others.length) return null;
      if (id === this.#state.current) await this.#switch(others[0].id);

      // App windows come here; secondary ones (pickers, workarea properties…) belonged to what is going away
      this.wm.windowsOf(id).filter(win => !this.wm.appOf(win)).forEach(win => this.wm.close(win));
      this.wm.adopt(id);
      const docs = fs.children(fs.root).find(n => n.name === 'Documenti' && n.system && !n.private) ?? fs.get(fs.root);
      // Shared first, so it can be seen from here: then it is kept, or removed if empty
      fs.share(ws.desk, docs.id, `Scrivania di ${ws.name}`);
      let kept = '';
      if (fs.children(ws.desk).length) kept = fs.path(ws.desk);
      else fs.remove(ws.desk);
      // What it trashed from its desk can now be seen (and restored) from every workspace
      fs.unscopeTrash(id);
      forgetWorkspace(id);
      this.#booted.delete(id);
      // Kept as a name only: the files it made still say whose they are
      const i = this.#state.list.indexOf(ws);
      this.#state.list.splice(i, 1);
      this.#state.list.push({ id: ws.id, name: ws.name, color: ws.color, created: ws.created, removed: Date.now() });
      this.#save();
      toast(kept ? `Workspace «${ws.name}» eliminato. La sua scrivania ora è ${kept}` : `Workspace «${ws.name}» eliminato`, { timeout: 6000 });
      return kept;
    });
  }

  // ---------- Internals ----------

  #enqueue(task) {
    const run = this.#queue.then(task);
    this.#queue = run.catch(err => console.error('[lilos] workspace:', err));
    return run;
  }

  async #switch(id) {
    const target = this.get(id);
    if (!target || id === this.#state.current) return;
    // Leave the current workspace as it is, saved: menus close and inline renames are confirmed
    closeMenu();
    this.taskbar.startMenu?.close();
    document.activeElement?.blur?.();
    clearTimeout(this.#saveTimer);
    this.#saveWindows();
    this.workareas.flush();
    this.desktop.save();

    this.#state.current = id;
    saveWorkspaces(this.#state);
    fs.setWorkspace(id);
    this.wm.setWorkspace(id);
    this.canvas.useCamera(workspaceKey(id, 'camera'));
    this.desktop.load(target.desk, workspaceKey(id, 'desktop-layout'));
    const reopen = !this.#booted.has(id);
    this.#booted.add(id);
    const areas = this.workareas.load(workspaceKey(id, 'workareas'), { reopen });
    this.emit('switch', id);
    toast(`Workspace «${target.name}»`, { timeout: 1800 });
    await areas;
    if (reopen) await this.#restoreWindows(id);
  }

  /** Reopens the windows saved outside every workarea of a workspace (once per session). */
  async #restoreWindows(id) {
    const saved = storage.get(workspaceKey(id, 'windows'), []);
    const list = Array.isArray(saved) ? saved.slice(0, AREA_LIMITS.MAX_WINDOWS).map(cleanSavedWindow).filter(Boolean) : [];
    if (!list.length) return;
    this.#restoring++;
    try {
      for (const w of list) await this.launcher.restore(w, { workspace: id });
    } finally {
      this.#restoring--;
      this.#saveSoon();
    }
  }

  /** The app windows of the current workspace that no workarea holds, as they are now. */
  #saveWindows() {
    if (this.#restoring) return;
    const windows = this.wm.windows
      .filter(win => this.wm.appOf(win) && !this.workareas.windowWorkarea(win))
      .slice(0, AREA_LIMITS.MAX_WINDOWS)
      .map(win => {
        let state = null;
        try { state = win.getState?.() ?? null; } catch (err) { console.warn('[lilos] stato della finestra non salvato:', err); }
        const g = this.wm.geometry(win);
        return cleanSavedWindow({ app: this.wm.appOf(win), state, rect: { x: g.x, y: g.y, w: g.w, h: g.h, minimized: g.minimized } });
      })
      .filter(Boolean);
    storage.set(workspaceKey(this.#state.current, 'windows'), windows);
  }

  #saveSoon() {
    clearTimeout(this.#saveTimer);
    this.#saveTimer = setTimeout(() => this.#saveWindows(), SAVE_DELAY);
  }

  #save() {
    saveWorkspaces(this.#state);
    this.emit('change');
  }

  #freeName() {
    const taken = new Set(this.list().map(w => w.name.toLowerCase()));
    for (let n = this.list().length + 1; ; n++) if (!taken.has(`workspace ${n}`)) return `Workspace ${n}`;
  }

  #freeColor() {
    const used = new Set(this.list().map(w => w.color));
    return (ACCENTS.find(a => !used.has(a.value)) ?? ACCENTS[this.list().length % ACCENTS.length]).value;
  }
}
