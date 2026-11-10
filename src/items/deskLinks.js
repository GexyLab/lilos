import { fs, net, messageBox, locale, host } from '@lilos/sdk';
import { launch, isInstalled } from '../apps/registry.js';
import { openFile } from '../apps/open.js';
import { DESK_NAME } from '../systemFs.js';

const { t } = locale.define('lilos:deskLinks', {
  en: { strings: {
    noDesk: 'The desktop is not there',
    notFolder: '«{name}» is no longer a folder.', notFile: '«{name}» is no longer a file.',
    broken: 'The link «{name}» cannot find the original',
    trashed: 'The original is in the trash: restore it to use the link again.',
    deleted: 'The original was deleted, or it is in a workspace that cannot be seen from here.',
    mountGone: 'The network connection where the original was is no longer there.',
    pathGone: '«{path}» is no longer on «{mount}».',
    unreachable: 'Cannot reach «{name}»',
  } },
});

/**
 * Links (fs nodes of type 'link'): "Aggiungi un collegamento al desktop" makes one on the desk of
 * the current workspace for a file or a folder, in the home or on a network connection. Opening
 * one finds what it points to: by id in the home (it follows moves and renames), by path on a
 * connection (read from the server, folder by folder). When that is not there any more — deleted
 * or in the trash, the connection or the path gone — a message box says so and the link is marked
 * broken (fs.update { broken }); found again, the mark goes. A server that cannot be reached is
 * said, but marks nothing: the target may well be there. A link to a web page ({ url, kind: 'web' },
 * made with Nuovo → Collegamento) opens it in a new tab of the browser.
 */

/** Where a link to this node points ({ home } or { mount, path }, with kind), or null if it cannot have one. A link's is its own. */
export function linkTo(id) {
  const node = fs.get(id);
  if (!node || id === fs.root) return null;
  if (node.type === 'link') {
    const { broken, ...link } = node.link;
    return link;
  }
  if (node.type !== 'file' && node.type !== 'folder') return null;
  return { ...fs.netRef(id), kind: node.type };
}

/** The desk folder of the current workspace (each workspace sees only its own), or null. */
const deskFolder = () => fs.children(fs.root).find(n => n.system && n.type === 'folder' && n.name === DESK_NAME)?.id ?? null;

/** True if some of these can get a link on the desk (files and folders, links). */
export function canLinkOnDesk(ids) {
  return !!deskFolder() && ids.some(id => linkTo(id));
}

/** Makes a link on the desk to each of these that can have one, named as it. Returns the ids of the new links. */
export function addDeskLinks(ids) {
  const desk = deskFolder();
  if (!desk) throw new Error(t('noDesk'));
  const made = [];
  for (const id of ids) {
    const link = linkTo(id);
    if (link) made.push(fs.create(desk, { type: 'link', name: fs.get(id).name, link }).id);
  }
  return made;
}

/**
 * Opens a web page of a link: in NetWave Browser when it is installed and the lilOS program shows
 * its pages (host.web), else in a new tab of the browser. Never with access to lilOS's page.
 */
export function openWebLink(url) {
  if (!/^https?:\/\//i.test(url)) return;
  const outside = () => window.open(url, '_blank', 'noopener,noreferrer');
  // In a browser the tab opens right away (later it would be a blocked popup)
  if (!host.native || !isInstalled('netwave')) return void outside();
  host.web.available().then(ok => (ok ? launch('netwave', { url }) : outside()), outside);
}

/**
 * Opens what a link points to: a folder in the File Manager (in a window of its own with
 * `newWindow`), a file with its app, a web page in the browser. Resolves with the node, or null.
 */
export async function openLink(node, { newWindow = false, ...options } = {}) {
  if (node?.link?.kind === 'web') return void openWebLink(node.link.url);
  const target = await findLinkTarget(node, options);
  if (target?.type === 'folder') launch('files', { folder: target.id }, 'main', { newWindow });
  else if (target) openFile(target);
  return target;
}

/**
 * The node a link points to, or null (the user was told why). `win`: the window the message boxes
 * go over (null: the whole page). `read(id)`: reads a folder of a connection, resolving true once
 * read and false when it gave up (having said why), the File Manager's asks for the password; by
 * default a connection that wants a password or the confirmation of its server hands the link to
 * the File Manager, which asks.
 */
export async function findLinkTarget(node, { win = null, read = null } = {}) {
  const link = node?.type === 'link' ? node.link : null;
  if (!link || link.kind === 'web') return null;
  const found = await locateLink(link, { win, read, linkNode: node });
  if (found.stop) return null;
  const missing = found.missing ?? (found.node.type !== link.kind
    ? t(link.kind === 'folder' ? 'notFolder' : 'notFile', { name: found.node.name }) : null);
  if (missing) {
    if (fs.exists(node.id)) fs.update(node.id, { broken: true });
    await messageBox(win, { icon: 'error', title: t('broken', { name: node.name }), text: missing });
    return null;
  }
  if (link.broken && fs.exists(node.id)) fs.update(node.id, { broken: false });
  return found.node;
}

/**
 * Looks for what a link ({ home } or { mount, path }) points to, saying nothing: { node },
 * { missing: why } or { stop } (a server not reached; the user was told, or gave up). Used to check
 * a link before making it (kind may be missing then). read: as for findLinkTarget; without it and
 * without linkNode, a connection that wants a password stops.
 */
export async function locateLink(link, { win = null, read = null, linkNode = null } = {}) {
  return link.home ? inHome(link) : onServer(linkNode, link, win, read);
}

/** The target of a link in the home: { node } or { missing: why }. */
function inHome(link) {
  const node = fs.get(link.home);
  if (node) return { node };
  if (fs.isTrashed?.(link.home)) return { missing: t('trashed') };
  return { missing: t('deleted') };
}

/** The target of a link on a connection, read from the server: { node }, { missing: why } or { stop } (not reached). */
async function onServer(linkNode, link, win, read) {
  const mount = net.available ? net.mount(link.mount) : null;
  if (!mount) return { missing: t('mountGone') };
  let id = net.mountNode(mount.id);
  if (!fs.exists(id)) return { missing: t('mountGone') };
  read ??= folder => readFolder(folder, mount, linkNode, win);
  for (const part of link.path.split('/').filter(Boolean)) {
    if (!await read(id)) return { stop: true };
    // The name as written; else in other case (servers like SMB do not tell them apart)
    const kids = fs.children(id);
    const child = kids.find(n => n.name === part) ?? kids.find(n => n.name.toLowerCase() === part.toLowerCase());
    if (!child) return { missing: t('pathGone', { path: link.path, mount: mount.name }) };
    id = child.id;
  }
  return { node: fs.get(id) };
}

/** Reads a folder of a connection for a link opened outside the File Manager. Resolves true once read. */
async function readFolder(id, mount, linkNode, win) {
  for (;;) {
    try {
      await fs.refresh(id);
      return true;
    } catch (err) {
      // A password to type, a server to confirm: the File Manager asks, then opens the link
      if (err.code === 'secret_required' || err.code === 'untrusted') {
        if (linkNode) launch('files', { folder: net.mountNode(mount.id), link: linkNode.id });
        return false;
      }
      const answer = await messageBox(win, { icon: 'error', title: t('unreachable', { name: mount.name }), text: err.message ?? String(err), buttons: ['retry', 'cancel'] });
      if (answer !== 'retry') return false;
    }
  }
}
