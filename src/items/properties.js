import { Window, h, fs, net, tags, fileType, actionButton, locale } from '@lilos/sdk';
import { describeWorkspace } from '../workspaces/info.js';
import { appFor, extensionOf } from '../apps/open.js';
import { showAppProperties } from '../apps/appProperties.js';
import { itemBadges } from '../desktop/itemIcons.js';
import { getApp } from '../apps/registry.js';

/**
 * "Proprietà…" of a file or folder: what it is, where, how big, when, whose, its tags, (files)
 * the app that opens it, and what installed apps say of it (their signs: "Cifrato con FileCrypt"). Read only; it follows changes while open and closes when the item goes.
 * A desktop shortcut to an app shows the app's properties (appProperties.js); a link, where it points.
 * One window per item (key `props:<id>`). The facts themselves are nodeFacts(): the File Manager
 * shows the same ones in its information panel.
 */
let wm = null;

/** Set by the system at start-up. */
export function connectProperties(windowManager) {
  wm = windowManager;
}

const i18n = locale.define('lilos:properties', {
  en: { strings: {
    title: 'Properties',
    'type': 'Type', 'app': 'App', 'linkTarget': 'Original', 'linkState': 'State', 'contents': 'Contents', 'size': 'Size',
    'opensWith': 'Opens with', 'deleted': 'Deleted', 'origin': 'Original location', 'location': 'Location', 'created': 'Created', 'modified': 'Modified',
    'workspace': 'Workspace', 'tags': 'Tags', 'apps': 'Apps', appData: 'Data of {id}',
    folder: 'Folder', linkFolder: 'Link to a folder', linkWeb: 'Link to a web page', linkFile: 'Link to a file', appLink: 'Link to an app',
    typeExt: '{type} (.{ext})', system: 'System {type}',
    appMissing: '{id} (not installed)', broken: 'Broken: the original was not found the last time',
    notFound: 'Not found', mountGone: 'Connection removed', ask: 'Ask every time',
    files: { one: '{count} file', other: '{count} files' }, folders: { one: '{count} folder', other: '{count} folders' },
    shared: 'Shared by all workspaces', none: 'None', orphan: 'The app is not installed', remove: 'Remove',
  } },
  it: { strings: {
    title: 'Proprietà',
    'type': 'Tipo', 'app': 'App', 'linkTarget': 'Originale', 'linkState': 'Stato', 'contents': 'Contenuto', 'size': 'Dimensione',
    'opensWith': 'Si apre con', 'deleted': 'Eliminato', 'origin': 'Posizione originale', 'location': 'Posizione', 'created': 'Creato', 'modified': 'Modificato',
    'workspace': 'Workspace', 'tags': 'Tag', 'apps': 'App', appData: 'Dati di {id}',
    folder: 'Cartella', linkFolder: 'Collegamento a una cartella', linkWeb: 'Collegamento a una pagina web', linkFile: 'Collegamento a un file', appLink: 'Collegamento a un’app',
    typeExt: '{type} (.{ext})', system: '{type} di sistema',
    appMissing: '{id} (non installata)', broken: 'Rotto: l’originale non è stato trovato l’ultima volta',
    notFound: 'Non trovato', mountGone: 'Connessione rimossa', ask: 'Chiedi ogni volta',
    files: { one: '{count} file', other: '{count} file' }, folders: { one: '{count} cartella', other: '{count} cartelle' },
    shared: 'Condiviso da tutti i workspace', none: 'Nessuno', orphan: 'L’app non è installata', remove: 'Rimuovi',
  } },
});
const { t } = i18n;

const dateLabel = time => (time ? i18n.date(time, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const plural = (key, n) => t(key, { n, count: i18n.number(n) });

/** Where a link points, as text: the path in the home, or the connection and the path on it. */
function linkPlace(link) {
  if (link.kind === 'web') return link.url;
  if (link.home) return fs.exists(link.home) ? fs.path(link.home) : t('notFound');
  return `${net.mount?.(link.mount)?.name ?? t('mountGone')}: ${link.path}`;
}

/** 'Testo (.txt)', 'Cartella', 'Collegamento a una cartella'…, in the system's language. */
function typeOf(node) {
  if (node.type === 'link') return t({ folder: 'linkFolder', web: 'linkWeb' }[node.link?.kind] ?? 'linkFile');
  if (node.type === 'folder') return t('folder');
  if (node.type === 'app') return t('appLink');
  const ext = extensionOf(node);
  return ext ? t('typeExt', { type: fileType(node.name).label, ext }) : fileType(node.name).label;
}

/**
 * The facts of a file, a folder, a link or an app's icon, in the system's language, for a
 * properties window or an information panel to show as they like:
 *   [{ key, label, value (text), ...what the key adds }], in the order to show them. Keys:
 *   type                     'Testo (.txt)', '… di sistema'
 *   app                      (an app's icon) the app's name; app: its id
 *   linkTarget, linkState    (a link) where it points (mono: true); 'Rotto…' when it is
 *   contents                 (a folder) '3 file, 2 cartelle'; files, folders, items
 *   size                     '1,2 KB'; bytes (a folder: its files, at any depth)
 *   opensWith                (a file) the app, or 'Chiedi ogni volta'; app: its id or null
 *   deleted, origin          (an item of fs.trashed()) when, and the folder it was in (mono)
 *   location                 the folder it is in (mono: true); path: the item's own path
 *   created, modified        dates as text; time: the milliseconds
 *   workspace                its name, or 'Condiviso da tutti i workspace'; workspace: describeWorkspace() or null
 *   tags                     names, or 'Nessuno'; tags: [{ id, name, color, visible }]
 *   apps                     the signs installed apps put on it (itemBadges); badges
 *   appData                  one per app that has data on it and is not installed; app: its id (it can be
 *                            taken away: fs.setAppMeta(id, app, null))
 */
export function nodeFacts(node) {
  const out = [];
  const fact = (key, value, extra = {}) => out.push({ key, label: t(key), value, ...extra });
  const type = typeOf(node);
  fact('type', node.system ? t('system', { type }) : type);
  if (node.type === 'app') fact('app', getApp(node.app)?.name ?? t('appMissing', { id: node.app }), { app: node.app });
  if (node.type === 'link') {
    fact('linkTarget', linkPlace(node.link), { mono: true });
    if (node.link.broken) fact('linkState', t('broken'));
  } else if (node.type === 'folder') {
    const use = fs.usage(node.id) ?? { items: node.inside ?? 0, files: 0, folders: 0, bytes: node.bytes ?? 0 };
    fact('contents', `${plural('files', use.files)}, ${plural('folders', use.folders)}`, { files: use.files, folders: use.folders, items: use.items });
    fact('size', locale.formatBytes(use.bytes), { bytes: use.bytes });
  } else if (node.type === 'file') {
    const app = appFor(extensionOf(node));
    fact('size', locale.formatBytes(node.size ?? 0), { bytes: node.size ?? 0 });
    fact('opensWith', app?.name ?? t('ask'), { app: app?.id ?? null });
  }
  if (node.trashed) {
    fact('deleted', dateLabel(node.trashed.at), { time: node.trashed.at });
    fact('origin', fs.exists(node.trashed.from) ? fs.path(node.trashed.from) : t('notFound'), { mono: true });
  } else {
    fact('location', fs.path(node.parent), { mono: true, path: fs.path(node.id) });
  }
  fact('created', dateLabel(node.created), { time: node.created ?? null });
  fact('modified', dateLabel(node.modified), { time: node.modified ?? null });
  const owner = describeWorkspace(node.workspace);
  fact('workspace', owner ? owner.name : t('shared'), { workspace: owner ?? null });
  const list = (node.tags ?? []).map(id => tags.get(id)).filter(Boolean).map(tag => ({ id: tag.id, name: tag.name, color: tag.color, visible: tag.visible !== false }));
  fact('tags', list.length ? list.map(tag => tag.name).join(', ') : t('none'), { tags: list });
  const badges = itemBadges(node);
  if (badges.length) fact('apps', badges.map(b => b.label).join(', '), { badges });
  // Data of an app that is gone: it can be taken away (the content stays as it is stored: an
  // encrypted file stays unreadable, but lilOS no longer refuses to open it)
  for (const id of Object.keys(node.apps ?? {}).filter(id => !getApp(id))) {
    out.push({ key: 'appData', label: t('appData', { id }), value: t('orphan'), app: id });
  }
  return out;
}

/** The value of a fact as the window shows it: tags with their colour, a button for an app's data. */
function factValue(node, f) {
  if (f.key === 'tags' && f.tags.length) {
    return h('span', { class: 'props-tags' }, ...f.tags.map(tag => h('span', { class: 'props-tag' }, h('i', { style: { background: tag.color } }), tag.name)));
  }
  if (f.key === 'appData') {
    return h('span', { class: 'props-orphan' }, `${f.value} `, actionButton({ label: t('remove'), onClick: () => fs.setAppMeta(node.id, f.app, null) }));
  }
  return f.value;
}

const rows = node => nodeFacts(node).flatMap(f => [h('dt', {}, f.label), h('dd', {}, factValue(node, f))]);

export function showProperties(id) {
  const node = fs.get(id);
  if (!node || !wm) return null;
  if (node.type === 'app') return showAppProperties(node.app);
  const key = `props:${id}`;
  const open = wm.get(key);
  if (open) {
    wm.show(open);
    return open;
  }

  const win = new Window({
    title: node.name, subtitle: t('title'), icon: node.type === 'link' ? 'link' : node.type === 'folder' ? 'folder' : 'file',
    width: 420, height: 400, minWidth: 340, minHeight: 240, controls: { minimize: false },
  });
  const list = h('dl', { class: 'props-list' });
  const name = h('h2', { class: 'props-name' });
  win.body.append(h('div', { class: 'props' }, name, list));

  const render = () => {
    const n = fs.get(id);
    if (!n) return wm.close(win);
    win.setTitle(n.name, t('title'));
    name.textContent = n.name;
    list.replaceChildren(...rows(n));
  };
  render();
  const offs = [fs.on('change', render), fs.on('scope', render), tags.on('change', render), locale.on('change', render)];
  win.on('destroy', () => offs.forEach(off => off?.()));
  return wm.open(win, { key });
}
