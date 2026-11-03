import { Window, h, fs, openMenu, messageBox } from '@lilos/sdk';
import * as system from '@lilos/system';   // the links of lilOS: missing in older lilOS
import { pickFile } from '@lilos/system';
import { network, readRemote, connectDialog } from './network.js';
import { t } from './i18n.js';

/**
 * "Nuovo collegamento": a window to write where a link points and its name, then make it in a
 * folder (the desk, from its Nuovo menu, or the folder shown in the File Manager). Where it points:
 *
 *   a path of lilOS         ~/Documenti/Note.txt, /home/ann/Documenti, Documenti/Progetti
 *   an address with the protocol, as a connection of Rete shows it:
 *                           sftp://ann@server:22/var/www, ftp://, ftps://, smb://nas/Foto/2024,
 *                           webdav://… and webdavs://… (WebDAV over http and https), and any
 *                           protocol a module of the kernel adds (nfs://… with its module)
 *   a web page              http://… or https://… (unless a WebDAV connection has that address)
 *
 * Separators are always / (a backslash is refused: the module of a protocol that wants it turns
 * them while talking to the server). An address goes through the connection of Rete that has that
 * server, port, user and folder; with none, "Connetti a un server" opens filled in and the link is
 * made once connected. What the link points to must be there: it is checked (read from the server)
 * before the link is made, and its kind (file or folder) comes from what is found.
 */

/** Schemes that are WebDAV, and whether over TLS. */
const DAV = { webdav: 'http', dav: 'http', webdavs: 'https', davs: 'https' };
const WEB = new Set(['http', 'https']);

/** A text that cannot be used: the message says why. */
class Invalid extends Error {}

/**
 * What was written: { local: path } or { url: { scheme, user, host, port, segs, folder } } (segs:
 * the path's names, decoded; folder: it ended with /). Throws Invalid.
 */
export function parseAddress(text) {
  const value = text.trim();
  if (!value) throw new Invalid(t('newLink.error.empty'));
  if (value.includes('\\')) throw new Invalid(t('newLink.error.backslash'));
  const m = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)/i.exec(value);
  if (!m) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith('~')) throw new Invalid(t('newLink.error.slashes'));
    return { local: value };
  }
  const [, scheme, authority, rawPath] = m;
  const at = authority.lastIndexOf('@');
  const user = at >= 0 ? authority.slice(0, at) : '';
  if (user.includes(':')) throw new Invalid(t('newLink.error.password'));
  const hostPort = at >= 0 ? authority.slice(at + 1) : authority;
  const hp = /^(\[[0-9a-f:.]+\]|[^:[\]]+)(?::(\d{1,5}))?$/i.exec(hostPort);
  if (!hp) throw new Invalid(t('newLink.error.host'));
  let segs;
  try {
    segs = rawPath.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    throw new Invalid(t('newLink.error.path'));
  }
  if (segs.some(s => s === '.' || s === '..' || s.includes('/'))) throw new Invalid(t('newLink.error.path'));
  return {
    url: {
      scheme: scheme.toLowerCase(), user: decodeURIComponent(user), host: hp[1].toLowerCase(),
      port: hp[2] ? Number(hp[2]) : null, segs, folder: rawPath.endsWith('/'),
    },
  };
}

/** The protocol of lilOS a scheme is ('webdav' for the WebDAV ones and for http/https), and the http scheme for WebDAV. */
const protocolOf = scheme => (DAV[scheme] || WEB.has(scheme) ? { id: 'webdav', http: DAV[scheme] ?? scheme } : { id: scheme, http: null });

/** The port a URL means: its own, or the protocol's default. */
function portOf(url, protocol) {
  if (url.port) return url.port;
  const { id, http } = protocolOf(url.scheme);
  if (id === 'webdav') return http === 'https' ? 443 : 80;
  return protocol?.fields?.find(f => f.key === 'port')?.default ?? null;
}

/**
 * The connection of Rete that reaches an address, and the path inside it: { mount, path } (the
 * one whose folder goes deepest), or null. A connection's own address (as Rete shows it) is read
 * the same way: same protocol (and http or https for WebDAV), server, port and user (when written).
 */
export function matchConnection(url) {
  const net = network();
  if (!net) return null;
  const want = protocolOf(url.scheme);
  const protocol = net.protocols.find(p => p.id === want.id);
  let best = null;
  for (const m of net.mounts()) {
    if (m.protocol !== want.id) continue;
    let base;
    try { base = parseAddress(m.address).url; } catch { continue; }
    if (!base) continue;
    if (want.http && protocolOf(base.scheme).http !== want.http) continue;
    if (base.host !== url.host || portOf(base, protocol) !== portOf(url, protocol)) continue;
    // SMB writes the domain before the user (DOMINIO;ann): the user is what comes after
    const userOf = u => u.split(';').pop().toLowerCase();
    if (url.user && userOf(base.user) !== userOf(url.user)) continue;
    const same = (a, b) => (m.protocol === 'smb' ? a.toLowerCase() === b.toLowerCase() : a === b);
    if (base.segs.length > url.segs.length || !base.segs.every((s, i) => same(s, url.segs[i]))) continue;
    if (!best || base.segs.length > best.depth) best = { mount: m, path: `/${url.segs.slice(base.segs.length).join('/')}`, depth: base.segs.length };
  }
  return best && { mount: best.mount, path: best.path };
}

/** The values of a new connection to an address, for "Connetti a un server": { protocol, values, name }. */
function connectionFor(url) {
  const { id, http } = protocolOf(url.scheme);
  const host = url.host.includes(':') && !url.host.startsWith('[') ? `[${url.host}]` : url.host;
  const values = {};
  if (id === 'webdav') {
    // The folder written (the folder that holds it, for a file): the server's WebDAV root is not known
    const folder = url.folder ? url.segs : url.segs.slice(0, -1);
    values.url = `${http}://${host}${url.port ? `:${url.port}` : ''}/${folder.map(encodeURIComponent).join('/')}${folder.length ? '/' : ''}`;
  } else {
    values.host = url.host;
    if (url.port) values.port = url.port;
    if (id === 'smb' && url.segs.length) values.share = url.segs[0];
    values.path = '/';
  }
  if (url.user) values.user = url.user.split(';').pop();
  return { protocol: id, values, name: url.host };
}

/** The name a link gets from where it points, until the user writes one. */
function nameFor(parsed) {
  if (parsed.local) return parsed.local.replace(/\/+$/, '').split('/').pop().replace(/^~$/, '') || '';
  const { url } = parsed;
  return url.segs.at(-1) ?? url.host;
}

/**
 * The window. folder: where the link is made. openWindow: the app's (dialogs over it). onMade(id):
 * after the link is made.
 */
export function newLinkWindow({ folder, openWindow, onMade = null }) {
  const win = new Window({ title: t('newLink.title'), icon: 'link', width: 520, height: 290, minWidth: 380, minHeight: 260 });
  // What network.js asks of the File Manager, for this window: its dialogs and messages over it
  const host = {
    win, openWindow,
    netError: (err, { retry = false, title = t('net.error.title') } = {}) => messageBox(win, { icon: 'error', title, text: err?.message ?? String(err), buttons: retry ? ['retry', 'cancel'] : ['ok'] }),
    go: () => {},
  };
  const address = h('input', { class: 'ctl-text', type: 'text', id: 'fm-link-address', spellcheck: 'false', autocomplete: 'off', placeholder: t('newLink.address.placeholder') });
  const name = h('input', { class: 'ctl-text', type: 'text', id: 'fm-link-name', spellcheck: 'false', autocomplete: 'off' });
  const status = h('p', { class: 'fm-net-status', role: 'status' });
  const browse = h('button', { class: 'ctl-btn', type: 'button' }, t('newLink.browse'));
  const cancel = h('button', { class: 'ctl-btn', type: 'button', onclick: () => win.emit('close') }, t('net.cancel'));
  const make = h('button', { class: 'ctl-btn primary', type: 'button' }, t('newLink.make'));
  let named = false;   // the user wrote a name: the address does not change it any more
  let busy = false;

  const say = (msg, bad = false) => { status.textContent = msg; status.classList.toggle('bad', bad); };
  address.addEventListener('input', () => {
    say('');
    if (named) return;
    try { name.value = nameFor(parseAddress(address.value)); } catch { name.value = ''; }
  });
  name.addEventListener('input', () => { named = !!name.value.trim(); });
  for (const input of [address, name]) {
    input.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); create(); }
      if (e.key === 'Escape') { e.preventDefault(); win.emit('close'); }
    });
  }

  browse.addEventListener('click', () => {
    const r = browse.getBoundingClientRect();
    const pick = async kind => {
      const node = await pickFile(openWindow, { kind, title: t(kind === 'folder' ? 'newLink.pickFolder' : 'newLink.pickFile') });
      if (!node) return;
      address.value = fs.path(node.id);
      address.dispatchEvent(new Event('input'));
      address.focus();
    };
    openMenu(r.left, r.bottom, [
      { label: t('newLink.browseFile'), icon: 'file', action: () => pick('file') },
      { label: t('newLink.browseFolder'), icon: 'folder', action: () => pick('folder') },
    ]);
  });

  /** Where the link points ({ link } ready for fs), or null after saying why. */
  async function target(parsed) {
    if (parsed.local) {
      const node = fs.resolve(parsed.local);
      if (!node) return void say(t('newLink.error.noPath', { path: parsed.local }), true);
      const link = system.linkTo(node.id);
      return link ? { link } : void say(t('newLink.error.notLinkable'), true);
    }
    const { url } = parsed;
    let found = matchConnection(url);
    if (!found && WEB.has(url.scheme)) return { link: { url: address.value.trim(), kind: 'web' } };
    const net = network();
    const { id } = protocolOf(url.scheme);
    if (!net?.protocols.some(p => p.id === id)) return void say(t('newLink.error.protocol', { protocol: url.scheme }), true);
    if (!found) {
      // No connection to that server yet: make one (filled in), then go on with it
      const mount = await new Promise(resolve => connectDialog(host, null, { initial: connectionFor(url), onConnected: resolve, onClosed: () => resolve(null) }));
      if (!mount) return void say(t('newLink.error.noConnection'), true);
      found = matchConnection(url);
      if (!found) return void say(t('newLink.error.otherFolder', { name: mount.name }), true);
    }
    say(t('newLink.checking'));
    const where = await system.locateLink({ mount: found.mount.id, path: found.path }, { win, read: folderId => readRemote(host, folderId) });
    if (where.stop) return void say('');
    if (where.missing) return void say(t('newLink.error.noRemote', { path: found.path, name: found.mount.name }), true);
    // The path as the server has it (the case of its names), and what it is
    const node = where.node;
    return { link: { mount: found.mount.id, path: fs.netPath(node.id) ?? found.path, kind: node.type === 'folder' ? 'folder' : 'file' } };
  }

  async function create() {
    if (busy) return;
    let parsed;
    try {
      parsed = parseAddress(address.value);
    } catch (err) {
      if (!(err instanceof Invalid)) throw err;
      say(err.message, true);
      return address.focus();
    }
    if (!name.value.trim()) name.value = nameFor(parsed);
    if (!name.value.trim()) return say(t('newLink.error.noName'), true), name.focus();
    busy = make.disabled = true;
    try {
      const found = await target(parsed);
      if (!found) return;
      if (!fs.exists(folder)) return say(t('newLink.error.folderGone'), true);
      const node = fs.create(folder, { type: 'link', name: name.value.trim(), link: found.link });
      onMade?.(node.id);
      win.emit('close');
    } catch (err) {
      say(err.message, true);
    } finally {
      busy = make.disabled = false;
    }
  }
  make.addEventListener('click', create);

  win.body.append(h('div', { class: 'fm-net-dialog' },
    h('div', { class: 'fm-net-body' },
      h('div', { class: 'sh-field' },
        h('label', { for: 'fm-link-address' }, t('newLink.address')),
        h('div', { class: 'sh-field-pick' }, address, browse),
        h('small', { class: 'sh-field-hint' }, t('newLink.address.hint'))),
      h('div', { class: 'sh-field' }, h('label', { for: 'fm-link-name' }, t('newLink.name')), name),
      status),
    h('div', { class: 'fm-net-foot' }, h('span', { class: 'fm-sp' }), cancel, make)));
  requestAnimationFrame(() => address.focus());
  return win;
}
