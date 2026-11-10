import { h, fs, kernel, messageBox, appIcon } from '@lilos/sdk';
import * as system from '@lilos/system';   // logicHost: lilOS ≥ 1.37.0
import { t } from './i18n.js';

/**
 * «Crea app»: the project becomes a package of a lilOS app in ~/App create/<id>/:
 *   lilos.json       the manifest: its windows' entry points, the modules it needs (the engine and
 *                    the packages of the blocks and components it uses)
 *   index.js         the app's code: it asks lilOS to run its project
 *   locales.json     the texts of the windows, with their translations
 *   project/         a copy of the project (.lsproj, schemi/, ui/, risorse/)
 *   <id>.lsapp       what «Esegui» opens: lilOS runs the app from this folder, without installing it
 * For now the apps made here are not installed (D88): they run from their folder, only for the
 * user who runs them, while their windows are open.
 */
const GLYPHS = ['blocks', 'window', 'chart', 'bolt', 'bell', 'calculator', 'clock', 'gauge', 'lamp', 'home', 'globe', 'terminal'];
const COLORS = [['#2da44e', 'green'], ['#3b6ef5', 'blue'], ['#6e56cf', 'violet'], ['#0f7d74', 'teal'], ['#d9822b', 'orange'], ['#e5484d', 'red']];
const ID = /^[a-z][a-z0-9-]{1,40}$/;

export async function createApp(studio) {
  const ws = studio.ws;
  if (!ws?.project) return;
  if (ws.dirty) await studio.saveAll();
  const p = ws.project.data;
  const app = { id: p.app?.id || slug(p.name), glyph: p.app?.glyph || 'blocks', color: p.app?.color || '#2da44e' };
  const preview = h('span', { class: 'ls-app-preview' });
  const showIcon = (glyph, color) => preview.replaceChildren(appIcon({ glyph, color }));
  showIcon(app.glyph, app.color);
  const res = await messageBox(studio.win, {
    icon: 'blocks', title: t('app.title', { name: p.name }), text: t('app.text'), width: 520,
    content: h('div', { class: 'ls-app-head' }, preview, h('small', { class: 'ls-hint' }, t('app.where', { folder: `~/${t('app.folder')}/` }))),
    fields: [
      { name: 'name', label: t('app.appName'), value: p.name, required: true, maxLength: 60 },
      { name: 'id', label: t('app.id'), value: app.id, required: true, pattern: ID, invalid: t('app.badId') },
      { name: 'version', label: t('app.version'), value: p.version || '1.0.0', required: true, pattern: /^\d+\.\d+\.\d+$/, invalid: t('options.versionHint') },
      { name: 'description', label: t('app.description'), value: p.description ?? '', maxLength: 200 },
      { name: 'glyph', type: 'select', label: t('app.icon'), value: app.glyph, options: GLYPHS },
      { name: 'color', type: 'select', label: t('app.color'), value: app.color, options: COLORS.map(([value, k]) => ({ value, label: t(`app.color.${k}`) })) },
    ],
    buttons: ['cancel', { value: 'create', label: t('app.create') }, { value: 'run', label: t('app.createRun'), primary: true }],
  });
  if (!res || res.button === 'cancel') return;
  const v = res.values;
  ws.project.setApp({ id: v.id, glyph: v.glyph, color: v.color });
  ws.project.setInfo({ version: v.version, description: v.description });
  await ws.save(ws.project);
  try {
    const marker = await writePackage(studio, v);
    if (res.button === 'run') {
      if (!system.logicHost?.runApp) throw new Error(t('app.needsLilos'));
      await system.logicHost.runApp(marker);
    } else {
      await messageBox(studio.win, { icon: 'blocks', title: t('app.done', { name: v.name }), text: t('app.doneText', { path: fs.path(fs.get(marker).parent) }) });
    }
  } catch (err) {
    await messageBox(studio.win, { icon: 'error', title: t('app.failed'), text: err.message });
  }
}

const slug = name => (String(name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/^(\d)/, 'app-$1').slice(0, 40) || 'app');

function folderNamed(parentId, name) {
  return fs.children(parentId).find(n => n.type === 'folder' && n.name === name)?.id ?? fs.create(parentId, { type: 'folder', name }).id;
}

async function copyFolder(fromId, toParentId, name) {
  const to = fs.create(toParentId, { type: 'folder', name });
  for (const n of fs.children(fromId)) {
    if (n.type === 'folder') await copyFolder(n.id, to.id, n.name);
    else if (n.type === 'file') await fs.copy(n.id, to.id);
  }
  return to.id;
}

/** The modules the project needs: the engine, and the packages of the blocks and components it uses. */
async function dependencies(studio, documents) {
  const types = new Set();
  for (const s of Object.values(documents.schemas)) for (const b of s.blocks ?? []) types.add(b.type);
  const walk = n => { if (n?.type) types.add(n.type); (n?.children ?? []).forEach(walk); };
  for (const w of Object.values(documents.windows)) walk(w.root);
  const out = [{ module: 'logicstudio-engine', reason: 'Runs the project of the app' }];
  for (const p of studio.catalog?.packages ?? []) {
    if (p.blocks.some(b => types.has(b.type)) || p.components.some(c => types.has(c.type))) out.push({ module: p.name, version: `>=${p.version}`, reason: 'Blocks or components of the project' });
  }
  return out;
}

async function writePackage(studio, v) {
  const ws = studio.ws;
  const documents = await ws.documents();
  const project = ws.project.data;
  const base = folderNamed(fs.root, t('app.folder'));
  // Made again: the old package goes
  const old = fs.children(base).find(n => n.type === 'folder' && n.name === v.id);
  if (old) fs.trash([old.id]);
  const folder = fs.create(base, { type: 'folder', name: v.id }).id;
  const projFolder = fs.create(folder, { type: 'folder', name: 'project' }).id;
  const projName = fs.get(ws.projectFile).name;
  for (const g of ws.groups) if (g.folder) await copyFolder(g.folder, projFolder, fs.get(g.folder).name);
  await fs.copy(ws.projectFile, projFolder, { name: projName });

  const entrypoints = { main: { kind: 'window' } };
  const fileTypes = [];
  for (const [win, e] of Object.entries(project.entrypoints ?? {})) {
    if (win === project.main || !e?.kind || e.kind === 'none') continue;
    entrypoints[`w${Object.keys(entrypoints).length}`] = { kind: 'window', label: e.label || win, logicWindow: win, logicKind: e.kind };
    if (e.kind === 'file') fileTypes.push(...(e.ext ?? []));
  }
  const manifest = {
    id: v.id, version: v.version, kind: 'local', name: v.name, description: v.description || v.name,
    category: 'other', icon: { glyph: v.glyph, color: v.color },
    publisher: { id: 'local', name: kernel.user?.name ?? 'lilOS' },
    sdk: '2', lilos: '>=1.37.0', entrypoints,
    dependencies: await dependencies(studio, documents),
    permissions: [],
    ...(fileTypes.length && { contributes: { fileTypes: [...new Set(fileTypes)] } }),
    logicstudio: { project: `project/${projName}`, runs: 'open' },
  };
  const write = async (name, text) => { const n = fs.create(folder, { type: 'file', name }); await fs.write(n.id, text); return n.id; };
  await write('lilos.json', `${JSON.stringify(manifest, null, 2)}\n`);
  await write('index.js', APP_CODE);
  await write('locales.json', `${JSON.stringify(localesOf(project, v), null, 2)}\n`);
  return write(`${v.id}.lsapp`, `${JSON.stringify({ format: 'lilos-lsapp/1', manifest: 'lilos.json', project: `project/${projName}` }, null, 2)}\n`);
}

/** English required, then the project's own translations of the texts of its windows. */
function localesOf(project, v) {
  const out = { en: { strings: { '@name': v.name, '@description': v.description || v.name } } };
  for (const [lang, table] of Object.entries(project.texts ?? {})) {
    out[lang] ??= { strings: {} };
    Object.assign(out[lang].strings, table);
  }
  return out;
}

const APP_CODE = `/**
 * An app made with Logic Studio IDE from a project (folder project/). lilOS runs its project in
 * the Logic Studio engine and opens its windows: each entry point is one of its windows.
 * Made by «Crea app»: change the project in Logic Studio and make the app again.
 */
export default function main({ lilos, entry = 'main', args } = {}) {
  return lilos?.logic?.runApp?.({ entry, args });
}
`;
