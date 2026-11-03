import { Window, h, icon, fs, messageBox } from '@lilos/sdk';
import * as system from '@lilos/system';
import { codeArea } from './code.js';
import { cookieRows, removeCookie } from './cookies.js';
import { effectiveAuth, find, knownVars, resolveText, newFolder, EXT } from './model.js';
import { store, MINE_KEY } from './store.js';
import { t } from './i18n.js';

/**
 * NetTest's smaller windows: Importa (Postman, Insomnia, OpenAPI/Swagger, HAR, cURL, .nettest),
 * Copia come codice, the cookies kept, and Pianifica (an operation of the Scheduler that runs the
 * collection in the kernel). formats/ is loaded only when one of them needs it.
 */
const formats = () => import('./formats/index.js');

export function importDialog(owner) {
  const win = new Window({ title: t('import.title'), icon: 'download', width: 640, height: 520 });
  let text = '', name = '', where = 'file', detected = null;
  const area = codeArea({ value: '', lang: 'json', label: t('import.paste'), placeholder: t('import.placeholder'), minLines: 10, onInput: v => { text = v; detect(); } });
  const info = h('p', { class: 'nx-hint' });
  const whereBox = h('div', { class: 'nx-radios' });
  const go = h('button', { type: 'button', class: 'ctl-btn primary', disabled: true, onclick: () => run() }, t('import.do'));

  async function detect() {
    const f = await formats();
    detected = text.trim() ? f.detectFormat(text) : null;
    info.replaceChildren(...(text.trim() ? [icon(detected ? 'check' : 'warning'), detected ? t('import.detected', { format: t(`import.format.${detected}`) }) : t('import.unknown')] : [t('import.hint')]));
    go.disabled = !detected;
  }

  function drawWhere() {
    whereBox.replaceChildren(...[['file', t('import.toFile')], ['mine', t('import.toMine')]].map(([v, label]) => h('label', { class: 'nx-check1' },
      h('input', { type: 'radio', name: 'where', checked: where === v, onchange: () => { where = v; } }), label)));
  }

  async function run() {
    try {
      const f = await formats();
      // The environments are in collection.environments too; a Postman environment alone has no collection
      const { collection, environments = [], warnings = [] } = f.importText(text, { name });
      if (!collection) {
        const target = store.get(owner.active?.col ?? MINE_KEY);
        target.data.environments.push(...environments);
        store.touch(target.key);
      } else if (where === 'mine') {
        const folder = { ...newFolder(collection.name || name || t('import.imported')), items: collection.items, auth: collection.auth ?? { type: 'inherit' }, scripts: collection.scripts };
        const mine = store.get(MINE_KEY).data;
        mine.items.push(folder);
        mine.variables.push(...(collection.variables ?? []).filter(v => !mine.variables.some(m => m.key === v.key)));
        mine.environments.push(...(collection.environments ?? []));
        store.touch(MINE_KEY);
      } else {
        const folder = await system.pickFile(owner.openWindow, { kind: 'folder', title: t('file.whereTo') });
        if (!folder) return;
        const entry = await store.createFile(folder.id, collection.name || name || t('import.imported'), collection);
        owner.openItem(entry.key, null);
      }
      const secrets = (collection?.environments ?? environments).flatMap(e => e.variables.filter(v => v.secret).map(v => v.key));
      const notes = [...warnings, ...(secrets.length ? [t('import.secrets', { names: [...new Set(secrets)].join(', ') })] : [])];
      if (notes.length) await messageBox(win, { icon: 'info', title: t('import.doneNotes'), text: notes.slice(0, 30).join('\n') });
      win.emit('close');
    } catch (err) {
      messageBox(win, { icon: 'error', title: t('import.failed'), text: err.message });
    }
  }

  const choose = h('button', {
    type: 'button', class: 'ctl-btn', onclick: async () => {
      const node = await system.pickFile(owner.openWindow, { title: t('import.pick'), exts: ['json', 'yaml', 'yml', 'har', 'txt', 'sh', EXT] });
      if (!node) return;
      text = await fs.read(node.id);
      name = node.name.replace(/\.(postman_collection\.json|json|yaml|yml|har|txt|sh|nettest)$/i, '');
      area.setValue(text.length > 200_000 ? `${text.slice(0, 200_000)}\n…` : text);
      detect();
    },
  }, icon('folderOpen'), t('import.pick'));
  drawWhere();
  detect();
  win.body.append(h('div', { class: 'nx nx-dialog' },
    h('p', {}, t('import.intro')),
    h('div', { class: 'nx-modes' }, choose, h('span', { class: 'nx-dim' }, t('import.orPaste'))),
    area.el, info, whereBox,
    h('div', { class: 'nx-modes' }, h('span', { class: 'nx-grow' }), h('button', { type: 'button', class: 'ctl-btn', onclick: () => win.emit('close') }, t('ui.cancel')), go)));
  owner.openWindow(win);
}

/** The request with its variables put in (the secret ones stay {{name}}) and its auth resolved. */
function resolvedRequest(col, item) {
  const c = store.get(col).data;
  const vars = knownVars(c, store.env(col), store.globals);
  const r = s => resolveText(s, vars);
  const deep = v => (typeof v === 'string' ? r(v) : Array.isArray(v) ? v.map(deep) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : v);
  const auth = find(c, item.id) ? effectiveAuth(c, item.id).auth : item.auth?.type === 'inherit' ? { type: 'none' } : item.auth;
  return deep({ ...structuredClone(item), auth: structuredClone(auth ?? { type: 'none' }), headers: item.headers.filter(x => x.enabled !== false && x.key) });
}

export async function codeDialog(owner, col, item) {
  const f = await formats();
  const win = new Window({ title: t('code.title', { name: item.name || item.url }), icon: 'code', width: 720, height: 520 });
  let lang = store.codeLanguage ?? 'curl';
  const request = resolvedRequest(col, item);
  const area = codeArea({ readOnly: true, lang: 'text', label: t('code.title', { name: '' }), minLines: 14 });
  const draw = () => {
    try { area.setValue(f.toCode(lang, request)); } catch (err) { area.setValue(`// ${err.message}`); }
    area.setLang({ fetch: 'javascript', node: 'javascript', python: 'python', php: 'text' }[lang] ?? 'text');
  };
  const sel = h('select', { class: 'ctl-select', onchange: e => { lang = e.target.value; store.codeLanguage = lang; draw(); } }, ...f.LANGUAGES.map(l => h('option', { value: l.id, selected: l.id === lang }, l.label)));
  const copy = h('button', { type: 'button', class: 'ctl-btn primary', onclick: async () => { await navigator.clipboard?.writeText(area.value); copy.replaceChildren(icon('check'), t('code.copied')); setTimeout(() => copy.replaceChildren(icon('code'), t('code.copy')), 1500); } }, icon('code'), t('code.copy'));
  draw();
  win.body.append(h('div', { class: 'nx nx-dialog' }, h('div', { class: 'nx-modes' }, sel, h('span', { class: 'nx-grow' }), copy), area.el, h('p', { class: 'nx-hint' }, icon('lock'), t('code.secrets'))));
  owner.openWindow(win);
}

export function cookiesDialog(owner) {
  const win = new Window({ title: t('cookies.title'), icon: 'list', width: 680, height: 440 });
  const box = h('div', { class: 'nx nx-dialog' });
  const draw = () => {
    const rows = cookieRows();
    const byDomain = Object.groupBy ? Object.groupBy(rows, r => r.domain) : rows.reduce((a, r) => ((a[r.domain] ??= []).push(r), a), {});
    box.replaceChildren(h('p', { class: 'nx-hint' }, t('cookies.hint')),
      ...(rows.length ? Object.entries(byDomain).map(([domain, list]) => h('details', { open: true, class: 'nx-cookies' },
        h('summary', {}, h('b', {}, domain), h('span', { class: 'nx-dim' }, ` · ${list.length}`), h('button', { type: 'button', class: 'nx-icon', title: t('cookies.removeAll'), onclick: () => { removeCookie(domain); draw(); } }, icon('trash'))),
        h('table', { class: 'nx-table' }, h('tbody', {}, ...list.map(c => h('tr', {}, h('th', {}, c.name), h('td', { class: 'mono' }, c.value.slice(0, 200)), h('td', { class: 'nx-dim' }, c.path),
          h('td', { class: 'nx-dim' }, c.expires ? new Date(c.expires).toLocaleString() : t('res.cookie.session')),
          h('td', {}, h('button', { type: 'button', class: 'nx-icon', title: t('cookies.remove'), onclick: () => { removeCookie(domain, c.key); draw(); } }, icon('x'))))))))) : [h('p', { class: 'nx-dim' }, t('cookies.none'))]));
  };
  const off = store.on('cookies', draw);
  win.on('destroy', off);
  draw();
  win.body.append(box);
  owner.openWindow(win, 'nettest-cookies');
}

/** Pianifica: the Scheduler's editor with an operation «Collezione» of this file (only a saved file can run with lilOS closed). */
export async function scheduleCollection(owner, col, id = null) {
  const entry = store.get(col);
  if (!entry) return;
  if (!system.isInstalled('scheduler')) return messageBox(owner.win, { icon: 'warning', text: t('schedule.noScheduler') });
  if (!entry.file) {
    await messageBox(owner.win, { icon: 'info', title: t('schedule.needFile'), text: t('schedule.needFileText') });
    return owner.saveAs(col);
  }
  if (entry.dirty) await owner.save(col);
  const env = store.env(col);
  const item = id ? find(entry.data, id)?.item : null;
  system.launch('scheduler', {
    name: item ? `${store.nameOf(entry)} · ${item.name}` : store.nameOf(entry),
    what: { type: 'collection', file: entry.file, label: fs.tildePath(entry.file), environment: env?.id ?? null, environmentLabel: env?.name ?? '', only: item ? [item.id] : null },
  }, 'create');
}


