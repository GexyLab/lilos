import { Window, h, fs, tags, session, fileType } from '@lilos/sdk';
import { describeWorkspace } from '../workspaces/info.js';
import { appFor, extensionOf } from '../apps/open.js';
import { showAppProperties } from '../apps/appProperties.js';

/**
 * "Proprietà…" of a file or folder: what it is, where, how big, when, whose, its tags and (files)
 * the app that opens it. Read only; it follows changes while open and closes when the item goes.
 * A desktop shortcut to an app shows the app's properties (appProperties.js).
 * One window per item (key `props:<id>`).
 */
let wm = null;

/** Set by the system at start-up. */
export function connectProperties(windowManager) {
  wm = windowManager;
}

const dateLabel = t => (t ? new Date(t).toLocaleString(session.locale, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const count = (n, one, many) => (n === 1 ? `1 ${one}` : `${n.toLocaleString(session.locale)} ${many}`);

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} byte`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024, i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toLocaleString(session.locale, { maximumFractionDigits: 1 })} ${units[i]}`;
}

/** Files, folders and bytes inside a folder (what the current workspace can see). */
function contentOf(id) {
  const out = { files: 0, folders: 0, bytes: 0 };
  const walk = parent => fs.children(parent).forEach(n => {
    if (n.type === 'folder') { out.folders++; walk(n.id); } else if (n.type === 'file') { out.files++; out.bytes += n.size ?? 0; }
  });
  walk(id);
  return out;
}

function rows(node) {
  const row = (label, value) => [h('dt', {}, label), h('dd', {}, value)];
  const owner = describeWorkspace(node.workspace);
  const type = node.type === 'folder' ? 'Cartella' : `${fileType(node.name).label}${extensionOf(node) ? ` (.${extensionOf(node)})` : ''}`;
  const out = [...row('Tipo', node.system ? `${type} di sistema` : type), ...row('Posizione', fs.path(node.parent))];
  if (node.type === 'folder') {
    const c = contentOf(node.id);
    out.push(...row('Contenuto', `${count(c.files, 'file', 'file')}, ${count(c.folders, 'cartella', 'cartelle')}`), ...row('Dimensione', formatBytes(c.bytes)));
  } else {
    out.push(...row('Dimensione', formatBytes(node.size ?? 0)), ...row('Si apre con', appFor(extensionOf(node))?.name ?? 'Chiedi ogni volta'));
  }
  out.push(...row('Creato', dateLabel(node.created)), ...row('Modificato', dateLabel(node.modified)));
  out.push(...row('Workspace', owner ? owner.name : 'Condiviso da tutti i workspace'));
  const names = (node.tags ?? []).map(t => tags.get(t)).filter(Boolean);
  out.push(...row('Tag', names.length ? h('span', { class: 'props-tags' }, ...names.map(t => h('span', { class: 'props-tag' }, h('i', { style: { background: t.color } }), t.name))) : 'Nessuno'));
  return out;
}

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
    title: node.name, subtitle: 'Proprietà', icon: node.type === 'folder' ? 'folder' : 'file',
    width: 420, height: 400, minWidth: 340, minHeight: 240, controls: { minimize: false },
  });
  const list = h('dl', { class: 'props-list' });
  const name = h('h2', { class: 'props-name' });
  win.body.append(h('div', { class: 'props' }, name, list));

  const render = () => {
    const n = fs.get(id);
    if (!n) return wm.close(win);
    win.setTitle(n.name, 'Proprietà');
    name.textContent = n.name;
    list.replaceChildren(...rows(n));
  };
  render();
  const offs = [fs.on('change', render), fs.on('scope', render), tags.on('change', render)];
  win.on('destroy', () => offs.forEach(off => off?.()));
  return wm.open(win, { key });
}
