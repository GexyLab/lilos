import { automation, fs, settings, locale } from '@lilos/sdk';
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

const { t } = locale.define('lilos:automation.actions', {
  en: { strings: {
    item: 'Item', items: 'Items', itemGone: 'The item no longer exists',
    create: 'Create', inFolder: 'In the folder', name: 'Name', kind: 'Type', file: 'File', folder: 'Folder', newName: 'New',
    rename: 'Rename', newNameLabel: 'New name', move: 'Move', copy: 'Copy',
    trash: 'Move to the Trash', restore: 'Restore from the Trash', delete: 'Delete permanently', emptyTrash: 'Empty the Trash',
    tags: 'Tags', open: 'Open', withApp: 'With the app', launch: 'Open the app', app: 'App', window: 'Window',
    notInstalled: 'The app is not installed', close: 'Close the window', showing: 'Showing',
    workspace: 'Go to the workspace', workspaceLabel: 'Workspace', workspaceGone: 'The workspace is gone',
    setting: 'Setting', value: 'Value', place: 'Move on the desktop', places: 'Positions', arrange: 'Arrange the icons',
  } },
});

const item = (label = t('item')) => ({ type: 'file', label, subject: true });
const items = (label = t('items')) => ({ type: 'files', label, subject: true });
const folder = label => ({ type: 'folder', label });
const exists = id => (fs.exists(id) ? id : (() => { throw new Error(t('itemGone')); })());
const listOf = v => (Array.isArray(v) ? v : v ? [v] : []);

/** A copy of a file, or of a folder with everything inside. */
async function copyTree(id, to) {
  const node = fs.get(exists(id));
  if (node.type === 'file') return (await fs.copy(id, to)).id;
  const made = fs.create(to, { type: 'folder', name: fs.uniqueName(to, node.name) });
  for (const child of fs.children(id)) if (child.type !== 'app') await copyTree(child.id, made.id);
  return made.id;
}

/** lilOS's actions, with their labels in the system's language. */
export const systemActions = () => ({
  'lilos.create': {
    label: t('create'), result: 'file',
    params: { folder: folder(t('inFolder')), name: { type: 'text', label: t('name'), maxLength: 255 }, kind: { type: 'choice', label: t('kind'), options: [{ value: 'file', label: t('file') }, { value: 'folder', label: t('folder') }] } },
    run: p => fs.create(exists(p.folder), { type: p.kind === 'folder' ? 'folder' : 'file', name: fs.uniqueName(p.folder, String(p.name || t('newName'))) }).id,
  },
  'lilos.rename': {
    label: t('rename'),
    params: { item: item(), name: { type: 'text', label: t('newNameLabel'), maxLength: 255 } },
    run: p => { fs.rename(exists(p.item), String(p.name)); return p.item; },
  },
  'lilos.move': {
    label: t('move'),
    params: { items: items(), to: folder(t('inFolder')) },
    run: p => { listOf(p.items).forEach(id => fs.move(exists(id), exists(p.to))); return listOf(p.items); },
  },
  'lilos.copy': {
    label: t('copy'), result: 'file',
    params: { items: items(), to: folder(t('inFolder')) },
    run: async p => { const out = []; for (const id of listOf(p.items)) out.push(await copyTree(id, exists(p.to))); return out; },
  },
  'lilos.trash': {
    label: t('trash'),
    params: { items: items() },
    run: p => { fs.trash(listOf(p.items).filter(id => fs.exists(id))); return null; },
  },
  'lilos.restore': {
    label: t('restore'),
    params: { items: items() },
    run: p => { fs.untrash(listOf(p.items).filter(id => fs.isTrashed(id))); return listOf(p.items); },
  },
  'lilos.delete': {
    label: t('delete'), confirm: true,
    params: { items: items() },
    run: p => {
      // From the trash it is purged; elsewhere removed for good
      fs.purge(listOf(p.items).filter(id => fs.isTrashed(id)));
      listOf(p.items).filter(id => fs.exists(id)).forEach(id => fs.remove(id));
      return null;
    },
  },
  'lilos.emptyTrash': {
    label: t('emptyTrash'), confirm: true, params: {},
    run: () => { fs.purgeTrash(); return null; },
  },
  'lilos.tags': {
    label: t('tags'),
    params: { item: item(), tags: { type: 'tags', label: t('tags') } },
    run: p => { fs.setTags(exists(p.item), listOf(p.tags)); return p.item; },
  },
  'lilos.open': {
    label: t('open'),
    params: { item: item(t('file')), app: { type: 'value', label: t('withApp') } },
    run: async p => {
      const node = fs.get(exists(p.item));
      if (node.type === 'folder') launch('files', { folder: node.id });
      else if (typeof p.app === 'string' && isInstalled(p.app) && fileApps().some(a => a.id === p.app)) launch(p.app, { file: node.id });
      else await openFile(node);
      return node.id;
    },
  },
  'lilos.launch': {
    label: t('launch'),
    params: { app: { type: 'value', label: t('app') }, entry: { type: 'value', label: t('window') } },
    run: p => {
      if (typeof p.app !== 'string' || !isInstalled(p.app)) throw new Error(t('notInstalled'));
      launch(p.app, undefined, typeof p.entry === 'string' ? p.entry : 'main');
      return null;
    },
  },
  'lilos.close': {
    label: t('close'),
    params: { app: { type: 'value', label: t('app') }, file: { type: 'file', label: t('showing') } },
    run: p => {
      const { wm } = ctx;
      const win = (p.file && automation.windowFor(p.app, p.file)) ?? wm?.windowsOfApp(p.app).at(-1) ?? null;
      if (win) wm.close(win);
      return null;
    },
  },
  'lilos.workspace': {
    label: t('workspace'),
    params: { to: { type: 'value', label: t('workspaceLabel') } },
    run: p => {
      if (!ctx.workspaces?.get(p.to)) throw new Error(t('workspaceGone'));
      ctx.workspaces.switchTo(p.to);
      return null;
    },
  },
  'lilos.setting': {
    label: t('setting'),
    params: { key: { type: 'value', label: t('setting') }, value: { type: 'value', label: t('value') } },
    run: p => { settings.set(String(p.key), p.value); return null; },
  },
  'lilos.place': {
    label: t('place'),
    params: { places: { type: 'places', label: t('places') } },
    run: p => { ctx.desktop?.place(listOf(p.places)); return null; },
  },
  'lilos.arrange': {
    label: t('arrange'), params: {},
    run: () => { ctx.desktop?.arrange(); return null; },
  },
});

/** Defines lilOS's actions (again when the language changes); ctx: { wm, desktop, workspaces }, what some of them act on. */
export function defineSystemActions(context) {
  ctx = context;
  const define = () => { for (const [id, def] of Object.entries(systemActions())) automation.define(id, def); };
  define();
  locale.on('change', define);
}
