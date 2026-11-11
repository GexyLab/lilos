import { logic, messageBox, LogicConsoles, fs, storage } from '@lilos/sdk';
import { t, i18n } from './i18n.js';

/**
 * Prova and Attiva. A test runs what is in the editors now (saved or not) for a few minutes; its
 * values show on the schemas, its consoles in the panel below. Activating runs the saved project
 * as an active program of the user: it goes on with the IDE (and lilOS) closed.
 *
 * A test can get arguments, as if run from the command line (lilos logic run FILE ARGUMENTS…):
 * «Argomenti» beside Prova writes them, kept per project (app storage logicstudio.args). When a
 * block closes the program (Exit), the status bar says with which value until the next test.
 */
const ARGS_KEY = 'logicstudio.args';   // { [path of the project or schema]: 'text as typed' }

/** A command line split like a shell does: spaces apart, '…' and "…" kept whole, \ escapes. */
export function splitArgs(text) {
  const out = [];
  let cur = '', has = false, quote = null;
  const s = String(text ?? '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote === "'") { if (c === "'") quote = null; else cur += c; continue; }
    if (c === '\\' && i + 1 < s.length && (quote !== '"' || '"\\$`'.includes(s[i + 1]))) { cur += s[++i]; has = true; continue; }
    if (quote === '"') { if (c === '"') quote = null; else cur += c; continue; }
    if (c === "'" || c === '"') { quote = c; has = true; continue; }
    if (/\s/.test(c)) { if (has) { out.push(cur); cur = ''; has = false; } continue; }
    cur += c; has = true;
  }
  if (has) out.push(cur);
  return out;
}
export class Runner {
  program = null;      // the test running
  live = null;
  result = '';         // how the last test ended, when a block closed it (Exit): for the status bar
  consoles = null;
  #studio;
  #timer = null;
  #limitMin = 5;

  constructor(studio) { this.#studio = studio; }

  statusText() {
    if (!this.program) return '';
    const s = Math.floor((Date.now() - (this.program.started ?? Date.now())) / 1000);
    return t('run.testing', { time: `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` });
  }

  /** Runs the project (or the schema alone) as it is in the editors. */
  async test() {
    const studio = this.#studio;
    if (!studio.ws || this.program) return;
    studio.bottom.setProblems([]);
    let documents;
    try {
      documents = await studio.ws.documents();
    } catch (err) {
      studio.bottom.setProblems([{ message: err.message }]);
      return;
    }
    const problems = this.#check(documents);
    if (problems.some(p => p.level !== 'warning')) { studio.bottom.setProblems(problems); return; }
    this.result = '';
    try {
      const status = await logic.status().catch(() => null);
      this.#limitMin = status?.limits?.testMinutes ?? 5;
      const args = splitArgs(this.argsText());
      this.program = await logic.start({ kind: 'test', name: studio.ws.name, documents, lang: i18n.lang, watch: true, ...(args.length && { args }) });
    } catch (err) {
      studio.bottom.setProblems([...problems, { message: err.message, where: err.details?.where ?? null }]);
      return;
    }
    if (problems.length) studio.bottom.setProblems(problems);
    this.live = logic.live(this.program.id);
    this.consoles = new LogicConsoles(this.live);
    this.live.on('status', ({ status, error }) => {
      if (status === 'running') return;
      if (status === 'failed' && error) studio.bottom.setProblems([{ message: error }]);
      this.#ended();
    });
    this.live.on('finished', ({ value }) => {
      const json = JSON.stringify(value) ?? 'null';
      this.result = t('run.closed', { value: json.length > 60 ? `${json.slice(0, 59)}…` : json });
    });
    this.live.on('gone', () => this.#ended());
    this.live.on('error', ({ message }) => studio.bottom.setProblems([{ message }]));
    studio.bottom.attach(this.consoles);
    this.attachAll();
    this.#timer = setInterval(() => { studio.renderToolbar(); studio.renderStatus(); }, 1000);
    studio.renderToolbar();
  }

  /** The arguments of the tests of this project (or schema alone), as typed. */
  argsText() {
    const path = this.#argsPath();
    const all = storage.get(ARGS_KEY, {}) ?? {};
    return path && typeof all[path] === 'string' ? all[path] : '';
  }

  #argsPath() {
    const ws = this.#studio.ws;
    const file = ws?.projectFile ?? ws?.single;
    try { return file ? fs.path(file) : null; } catch { return null; }
  }

  /** «Argomenti»: the command line of the tests, written in a box. */
  async editArgs() {
    const studio = this.#studio;
    const path = this.#argsPath();
    if (!path) return;
    const res = await messageBox(studio.win, {
      icon: 'info', title: t('args.title'), text: t('args.text'),
      fields: [{ name: 'args', label: t('args.label'), value: this.argsText(), placeholder: t('args.placeholder'), maxLength: 4000 }],
      buttons: ['cancel', { value: 'ok', label: t('args.save'), primary: true }],
      width: 520,
    });
    if (res?.button !== 'ok') return;
    const all = { ...(storage.get(ARGS_KEY, {}) ?? {}) };
    const text = String(res.values.args ?? '').trim();
    if (text) all[path] = text; else delete all[path];
    // the 50 projects used last, not more
    const keys = Object.keys(all);
    for (const k of keys.slice(0, Math.max(0, keys.length - 50))) delete all[k];
    try { storage.set(ARGS_KEY, all); } catch { /* not saved: only this session */ }
    studio.renderToolbar();
  }

  /** The schemas open in tabs show the running test. */
  attachAll() {
    for (const tab of this.#studio.tabs) this.attachTab(tab);
  }

  attachTab(tab) {
    if (!this.live) return;
    if (tab.kind === 'schema') tab.view.canvas.attach(this.live, tab.label);
    if (tab.kind === 'window') tab.view.attach?.(this.live, tab.label);
  }

  async stop() {
    if (!this.program) return;
    const id = this.program.id;
    this.#ended();
    await logic.stop(id).catch(() => {});
  }

  #ended() {
    if (!this.program) return;
    clearInterval(this.#timer);
    for (const tab of this.#studio.tabs) {
      if (tab.kind === 'schema') tab.view.canvas.detach();
      if (tab.kind === 'window') tab.view.detach?.();
    }
    this.live?.close();
    this.program = null;
    this.live = null;
    // The consoles stay readable until the next test
    this.#studio.renderToolbar();
    this.#studio.renderStatus();
  }

  /** Runs the saved project as an active program (it goes on with lilOS closed). */
  async activate() {
    const studio = this.#studio;
    const ws = studio.ws;
    if (!ws) return;
    if (ws.dirty) {
      const res = await messageBox(studio.win, {
        icon: 'warning', title: t('run.saveFirst'), text: t('run.saveFirstText'),
        buttons: ['cancel', { value: 'save', label: t('close.saveAll'), primary: true }],
      });
      if (res !== 'save') return;
      await studio.saveAll();
    }
    const file = ws.projectFile ?? ws.single;
    const path = fs.path(file);
    try {
      const mine = await logic.programs();
      const same = mine.filter(p => p.kind === 'active' && p.source?.path === path);
      if (same.length) {
        const res = await messageBox(studio.win, {
          icon: 'power', title: t('run.alreadyActive', { name: ws.name }), text: t('run.alreadyActiveText'),
          buttons: ['cancel', { value: 'replace', label: t('run.replace'), primary: true }],
        });
        if (res !== 'replace') return;
        for (const p of same) await logic.forget(p.id);
      }
      const documents = await ws.documents();
      const p = await logic.start({ kind: 'active', name: ws.name, documents, source: { path }, lang: i18n.lang });
      await messageBox(studio.win, { icon: 'power', title: t('run.activated', { name: p.name }), text: t('run.activatedText') });
      studio.home.refresh();
    } catch (err) {
      studio.bottom.setProblems([{ message: err.message, where: err.details?.where ?? null }]);
    }
  }

  /** What the IDE sees before asking the engine: blocks without a package, objects of components gone. */
  #check(documents) {
    const studio = this.#studio;
    const out = [];
    for (const [name, s] of Object.entries(documents.schemas)) {
      for (const b of s.blocks ?? []) {
        const def = studio.blockDef(b.type);
        if (!def) { out.push({ message: t('problems.missingBlock', { block: b.label ?? b.id, type: b.type }), where: { schema: name, block: b.id } }); continue; }
        if (def.role === 'component') {
          const win = documents.windows[b.config?.window];
          if (!win) out.push({ message: t('problems.noWindow', { block: b.id, window: b.config?.window ?? '' }), where: { schema: name, block: b.id } });
          else if (!JSON.stringify(win.root).includes(`"id":"${b.config.component}"`)) out.push({ message: t('problems.noComponent', { block: b.id, component: b.config?.component ?? '' }), where: { schema: name, block: b.id } });
        }
        if ((def.role === 'schemaIn' || def.role === 'schemaOut') && !String(b.config?.port ?? '').trim()) out.push({ message: t('problems.noPortName'), where: { schema: name, block: b.id } });
      }
    }
    if (documents.project && Object.keys(documents.windows).length && !documents.project.main) out.push({ level: 'warning', message: t('problems.noMain') });
    return out;
  }
}
