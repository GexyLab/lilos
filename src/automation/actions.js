import { automation, fs, settings } from '@lilos/sdk';
import { launch, isInstalled } from '../apps/registry.js';
import { openFile, fileApps } from '../apps/open.js';

/**
 * lilOS's own actions for automations (the SDK's automation.js): what the user does to files,
 * folders, windows, workspaces, settings and the desk. The recorder (recorder.js) turns the
 * events of the pipes into these steps; run() does them again.
 *
 *   lilos.create    { folder, name, kind }      → the new node
 *   lilos.rename    { item, name }
 *   lilos.move      { items, to }
 *   lilos.copy      { items, to }                → the copies
 *   lilos.trash     { items }                    lilos.restore { items }
 *   lilos.delete    { items }  (asks first)      lilos.emptyTrash {}  (asks first)
 *   lilos.tags      { item, tags }
 *   lilos.open      { item, app }                lilos.launch { app, entry }
 *   lilos.close     { app, file }                a window of the app (the one showing the file)
 *   lilos.workspace { to }                       lilos.setting { key, value }
 *   lilos.place     { places: [{ id, x, y }] }   lilos.arrange {}   (the desk)
 */
let ctx = { wm: null, desktop: null, workspaces: null };

const item = (label = 'Elemento') => ({ type: 'file', label, subject: true });
const items = (label = 'Elementi') => ({ type: 'files', label, subject: true });
const folder = label => ({ type: 'folder', label });
const exists = id => (fs.exists(id) ? id : (() => { throw new Error('L’elemento non esiste più'); })());
const listOf = v => (Array.isArray(v) ? v : v ? [v] : []);

/** A copy of a file, or of a folder with everything inside. */
async function copyTree(id, to) {
  const node = fs.get(exists(id));
  if (node.type === 'file') return (await fs.copy(id, to)).id;
  const made = fs.create(to, { type: 'folder', name: fs.uniqueName(to, node.name) });
  for (const child of fs.children(id)) if (child.type !== 'app') await copyTree(child.id, made.id);
  return made.id;
}

export const SYSTEM_ACTIONS = {
  'lilos.create': {
    label: 'Crea', result: 'file',
    params: { folder: folder('Nella cartella'), name: { type: 'text', label: 'Nome', maxLength: 255 }, kind: { type: 'choice', label: 'Tipo', options: [{ value: 'file', label: 'File' }, { value: 'folder', label: 'Cartella' }] } },
    run: p => fs.create(exists(p.folder), { type: p.kind === 'folder' ? 'folder' : 'file', name: fs.uniqueName(p.folder, String(p.name || 'Nuovo')) }).id,
  },
  'lilos.rename': {
    label: 'Rinomina',
    params: { item: item(), name: { type: 'text', label: 'Nuovo nome', maxLength: 255 } },
    run: p => { fs.rename(exists(p.item), String(p.name)); return p.item; },
  },
  'lilos.move': {
    label: 'Sposta',
    params: { items: items(), to: folder('Nella cartella') },
    run: p => { listOf(p.items).forEach(id => fs.move(exists(id), exists(p.to))); return listOf(p.items); },
  },
  'lilos.copy': {
    label: 'Copia', result: 'file',
    params: { items: items(), to: folder('Nella cartella') },
    run: async p => { const out = []; for (const id of listOf(p.items)) out.push(await copyTree(id, exists(p.to))); return out; },
  },
  'lilos.trash': {
    label: 'Sposta nel Cestino',
    params: { items: items() },
    run: p => { fs.trash(listOf(p.items).filter(id => fs.exists(id))); return null; },
  },
  'lilos.restore': {
    label: 'Ripristina dal Cestino',
    params: { items: items() },
    run: p => { fs.untrash(listOf(p.items).filter(id => fs.isTrashed(id))); return listOf(p.items); },
  },
  'lilos.delete': {
    label: 'Elimina definitivamente', confirm: true,
    params: { items: items() },
    run: p => {
      // From the trash it is purged; elsewhere removed for good
      fs.purge(listOf(p.items).filter(id => fs.isTrashed(id)));
      listOf(p.items).filter(id => fs.exists(id)).forEach(id => fs.remove(id));
      return null;
    },
  },
  'lilos.emptyTrash': {
    label: 'Svuota il Cestino', confirm: true, params: {},
    run: () => { fs.purgeTrash(); return null; },
  },
  'lilos.tags': {
    label: 'Tag',
    params: { item: item(), tags: { type: 'tags', label: 'Tag' } },
    run: p => { fs.setTags(exists(p.item), listOf(p.tags)); return p.item; },
  },
  'lilos.open': {
    label: 'Apri',
    params: { item: item('File'), app: { type: 'value', label: 'Con l’app' } },
    run: async p => {
      const node = fs.get(exists(p.item));
      if (node.type === 'folder') launch('files', { folder: node.id });
      else if (typeof p.app === 'string' && isInstalled(p.app) && fileApps().some(a => a.id === p.app)) launch(p.app, { file: node.id });
      else await openFile(node);
      return node.id;
    },
  },
  'lilos.launch': {
    label: 'Apri l’app',
    params: { app: { type: 'value', label: 'App' }, entry: { type: 'value', label: 'Finestra' } },
    run: p => {
      if (typeof p.app !== 'string' || !isInstalled(p.app)) throw new Error('L’app non è installata');
      launch(p.app, undefined, typeof p.entry === 'string' ? p.entry : 'main');
      return null;
    },
  },
  'lilos.close': {
    label: 'Chiudi la finestra',
    params: { app: { type: 'value', label: 'App' }, file: { type: 'file', label: 'Che mostra' } },
    run: p => {
      const { wm } = ctx;
      const win = (p.file && automation.windowFor(p.app, p.file)) ?? wm?.windowsOfApp(p.app).at(-1) ?? null;
      if (win) wm.close(win);
      return null;
    },
  },
  'lilos.workspace': {
    label: 'Vai al workspace',
    params: { to: { type: 'value', label: 'Workspace' } },
    run: p => {
      if (!ctx.workspaces?.get(p.to)) throw new Error('Il workspace non c’è più');
      ctx.workspaces.switchTo(p.to);
      return null;
    },
  },
  'lilos.setting': {
    label: 'Impostazione',
    params: { key: { type: 'value', label: 'Impostazione' }, value: { type: 'value', label: 'Valore' } },
    run: p => { settings.set(String(p.key), p.value); return null; },
  },
  'lilos.place': {
    label: 'Sposta sulla scrivania',
    params: { places: { type: 'places', label: 'Posizioni' } },
    run: p => { ctx.desktop?.place(listOf(p.places)); return null; },
  },
  'lilos.arrange': {
    label: 'Riordina le icone', params: {},
    run: () => { ctx.desktop?.arrange(); return null; },
  },
};

/** Defines lilOS's actions; ctx: { wm, desktop, workspaces }, what some of them act on. */
export function defineSystemActions(context) {
  ctx = context;
  for (const [id, def] of Object.entries(SYSTEM_ACTIONS)) automation.define(id, def);
}
