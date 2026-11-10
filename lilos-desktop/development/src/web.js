import { BrowserWindow, WebContentsView, app, session } from 'electron';
import { createReadStream, mkdirSync } from 'node:fs';
import { rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { local } from './local/index.js';
import { settings } from './store.js';
import { originOf, profileUrl } from './windows.js';

/**
 * The web engine of NetWave Browser (and of any trusted lilOS page that asks for it): web pages
 * shown in the lilOS window, each in a WebContentsView of its own. A page never runs inside lilOS:
 *   - its own renderer process, sandboxed, no preload, no Node, no bridge to lilOS;
 *   - its own session (partition), never the one of lilOS (where the kernel's cookie lives):
 *       shared    persist:netwave-<profile>-<user>   every normal window of that lilOS user
 *       private   netwave-priv-<profile>-<key>       in memory, one per private window, wiped at the end
 *   - the addresses of lilOS (every server of the program, the local kernel) are refused, so a page
 *     cannot talk to a kernel; only http and https (and about:blank) are opened;
 *   - permissions (position, camera, microphone, notifications…) are refused unless the page of lilOS
 *     says yes (it asks the user); popups become a request for a new tab; downloads land in a
 *     folder of the program until the page of lilOS takes them into its files.
 *
 * The view is drawn above the page of lilOS, where the page says (place); the page hides it when
 * something of lilOS covers it (cover returns a picture of it to show meanwhile).
 *
 * Calls (bridge.js, only from the main frame of a trusted lilOS window: the views it makes are its own):
 *   create({ private?: key, url?, keys?: [combo] }) → { id }
 *   navigate(id, url) · back(id) · forward(id) · reload(id, ignoreCache?) · stop(id) · close(id)
 *   place(id, { x, y, width, height } | null, scale?)   CSS pixels of the lilOS page; null hides it
 *   cover(id) → data URL (JPEG) | null      a picture of the page (also when hidden), then hides it
 *   focus(id) · zoom(id, factor) · mute(id, muted) · edit(id, command) · keys(id, [combo])
 *   find(id, text, { forward, next }) · stopFind(id)
 *   permission(requestId, allow, remember?) · grants(id, [{ origin, permission, allow }]) · auth(requestId, user, password)
 *   downloadRead(downloadId) → ArrayBuffer · downloadDone(downloadId) · downloadCancel(downloadId)
 *   info() → { available, version }
 * Events, to the owner page only ('web'): { id, type, … }
 *   title · favicon (data URL) · loading · nav { url, canGoBack, canGoForward } · error { code, description, url }
 *   blocked { url } (an address pages may not open: lilOS, file:, mailto:…) · hover { url } · unresponsive
 *   open { url, disposition } · focus · key { combo } · menu { x, y, link, image, selection, editable, flags }
 *   audio { audible } · found { matches, active } · permission { requestId, permission, origin, media }
 *   auth { requestId, host, realm } · download { downloadId, name, state, received, total } · gone { reason }
 */

const SCHEMES = new Set(['http:', 'https:']);
const ACCESS = new Set(['geolocation', 'media', 'notifications', 'midi', 'midiSysex', 'clipboard-read', 'idle-detection', 'storage-access', 'top-level-storage-access', 'window-management', 'speaker-selection']);
const FAVICON_MAX = 64 << 10;
const DOWNLOAD_MAX = 1024 << 20;
const ASK_TIMEOUT = 120_000;
const KEY_RE = /^[a-z0-9]{6,32}$/;
const COMBO_RE = /^(Ctrl\+)?(Alt\+)?(Shift\+)?[A-Za-z0-9]{1,12}$/;
const EDITS = new Set(['copy', 'cut', 'paste', 'selectAll', 'undo', 'redo', 'delete']);

const views = new Map();          // id → { id, view, owner, partition, keys, grants }
const owners = new WeakSet();     // lilOS pages whose reload or end is watched
const configured = new Set();     // partitions set up
const pending = new Map();        // requestId → { owner, callback, timer }
const downloads = new Map();      // downloadId → { owner, item, path, state }
let nextId = 1;
let nextRequest = 1;

const ownerOf = contents => [...views.values()].find(v => v.view.webContents === contents) ?? null;

function send(owner, data) {
  if (!owner.isDestroyed()) owner.send('lilos-host:event', 'web', data);
}

/** The origins of lilOS this program knows: pages may never reach them. */
function lilosOrigins() {
  const list = new Set();
  for (const p of settings().profiles ?? []) {
    const o = originOf(profileUrl(p));
    if (o) list.add(o);
  }
  if (local.url) {
    const o = originOf(local.url);
    list.add(o);
    // The local kernel answers on every loopback name
    const port = new URL(o).port;
    for (const host of ['localhost', '127.0.0.1', '[::1]']) list.add(`http://${host}:${port}`);
  }
  return list;
}

function allowedUrl(raw) {
  let u;
  try { u = new URL(String(raw)); } catch { return null; }
  if (u.href === 'about:blank') return u.href;
  if (!SCHEMES.has(u.protocol)) return null;
  if (lilosOrigins().has(u.origin)) return null;
  return u.href;
}

/** The lilOS user signed in in this window (their site data are theirs): asked to the kernel. */
async function userKey(profile) {
  try {
    const res = await session.fromPartition(`persist:p-${profile.id}`).fetch(`${profileUrl(profile)}/api/session`, { headers: { 'X-Lilos': '1' } });
    const body = await res.json();
    const id = body?.user?.id ?? (body?.mode === 'single' ? 'single' : null);
    return id ? String(id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) : null;
  } catch {
    return null;
  }
}

/** Rules of a NetWave session, once (they replace the ones of lilOS's windows, devices.js). */
function configure(partition) {
  const ses = session.fromPartition(partition);
  if (configured.has(partition)) return ses;
  configured.add(partition);

  ses.setPermissionRequestHandler((contents, permission, callback, details) => {
    const v = ownerOf(contents);
    if (!v) return callback(false);
    if (permission === 'clipboard-sanitized-write') return callback(true);
    if (!ACCESS.has(permission)) return callback(false);
    const origin = originOf(details.requestingUrl) ?? originOf(contents.getURL());
    const known = v.grants.get(`${origin}|${permission}`);
    if (known !== undefined) return callback(known);
    ask(v, { type: 'permission', permission, origin, media: details.mediaTypes ?? [] }, answer => {
      const allow = !!answer?.allow;
      if (answer?.remember) v.grants.set(`${origin}|${permission}`, allow);
      callback(allow);
    });
  });
  ses.setPermissionCheckHandler((contents, permission, origin) => {
    if (permission === 'clipboard-sanitized-write') return true;
    const v = contents && ownerOf(contents);
    return !!v && v.grants.get(`${originOf(origin)}|${permission}`) === true;
  });
  // Serial, HID and USB pickers are refused to every page that is not lilOS by devices.js (its rules
  // are on every session); devices and screen capture are never for web pages here
  ses.setDevicePermissionHandler(() => false);
  ses.setDisplayMediaRequestHandler((_req, callback) => callback({}));

  // No page reaches lilOS or the computer's files
  ses.webRequest.onBeforeRequest((details, callback) => {
    let u;
    try { u = new URL(details.url); } catch { return callback({ cancel: true }); }
    if (u.protocol === 'file:' || lilosOrigins().has(u.origin)) return callback({ cancel: true });
    callback({});
  });

  ses.on('will-download', (_e, item, contents) => {
    const v = contents && ownerOf(contents);
    if (!v) return item.cancel();
    const downloadId = `d${nextRequest++}`;
    const dir = join(app.getPath('temp'), 'lilos-netwave');
    const path = join(dir, `${downloadId}-${Date.now()}`);
    try { mkdirSync(dir, { recursive: true }); } catch { return item.cancel(); }
    item.setSavePath(path);
    const entry = { owner: v.owner, item, path, state: 'progressing' };
    downloads.set(downloadId, entry);
    const report = state => {
      entry.state = state;
      send(v.owner, { id: v.id, type: 'download', downloadId, name: item.getFilename(), mime: item.getMimeType(), url: item.getURL(), state, received: item.getReceivedBytes(), total: item.getTotalBytes() });
    };
    report('progressing');
    let last = 0;
    item.on('updated', (_ev, state) => {
      if (item.getReceivedBytes() > DOWNLOAD_MAX) return item.cancel();
      const now = Date.now();
      if (now - last > 250 || state !== 'progressing') { last = now; report(state); }
    });
    item.once('done', (_ev, state) => {
      report(state);   // 'completed' | 'cancelled' | 'interrupted'
      if (state !== 'completed') forgetDownload(downloadId);
    });
  });
  return ses;
}

/** Asks the owner page; no answer in time is a no. */
function ask(v, data, callback) {
  const requestId = `r${nextRequest++}`;
  const timer = setTimeout(() => answer(requestId, null), ASK_TIMEOUT);
  pending.set(requestId, { owner: v.owner, viewId: v.id, callback, timer });
  send(v.owner, { id: v.id, ...data, requestId });
}

function answer(requestId, value, owner = null) {
  const p = pending.get(requestId);
  if (!p || (owner && p.owner !== owner)) return;
  pending.delete(requestId);
  clearTimeout(p.timer);
  p.callback(value);
}

/** Combo of a key press in the format of lilOS's shortcuts (Ctrl+Alt+Shift+Key). */
function comboOf(input) {
  let key = null;
  const letter = /^Key([A-Z])$/.exec(input.code ?? '');
  const digit = /^Digit(\d)$/.exec(input.code ?? '');
  if (letter) key = letter[1];
  else if (digit) key = digit[1];
  else if (/^F\d{1,2}$|^Arrow|^Page|^(Tab|Escape|Enter|Home|End|Delete|Backspace)$/.test(input.key)) key = input.key;
  else if (input.key === '+' || input.key === '=') key = 'Equal';
  else if (input.key === '-') key = 'Minus';
  if (!key) return null;
  const mods = [];
  if (input.control || input.meta) mods.push('Ctrl');
  if (input.alt) mods.push('Alt');
  if (input.shift) mods.push('Shift');
  return [...mods, key].join('+');
}

async function faviconOf(ses, url) {
  try {
    const u = allowedUrl(url);
    if (!u || u === 'about:blank') return null;
    const res = await ses.fetch(u, { credentials: 'omit' });
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!res.ok || !/^image\/(png|x-icon|vnd\.microsoft\.icon|gif|jpeg|webp|svg\+xml)$/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > FAVICON_MAX) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

function watch(v, ses) {
  const wc = v.view.webContents;
  const emit = data => send(v.owner, { id: v.id, ...data });
  const nav = () => emit({ type: 'nav', url: wc.getURL(), canGoBack: wc.navigationHistory.canGoBack(), canGoForward: wc.navigationHistory.canGoForward() });

  wc.setWindowOpenHandler(({ url, disposition }) => {
    const ok = allowedUrl(url);
    if (ok && ok !== 'about:blank') emit({ type: 'open', url: ok, disposition });
    return { action: 'deny' };
  });
  const guard = (e, url) => { if (!allowedUrl(url)) { e.preventDefault(); emit({ type: 'blocked', url: String(url).slice(0, 2000) }); } };
  wc.on('will-navigate', guard);
  wc.on('will-redirect', guard);
  wc.on('page-title-updated', (_e, title) => emit({ type: 'title', title: String(title).slice(0, 500) }));
  wc.on('page-favicon-updated', async (_e, list) => emit({ type: 'favicon', icon: list?.length ? await faviconOf(ses, list[0]) : null }));
  wc.on('did-start-loading', () => emit({ type: 'loading', loading: true }));
  wc.on('did-stop-loading', () => { emit({ type: 'loading', loading: false }); nav(); });
  wc.on('did-navigate', nav);
  wc.on('did-navigate-in-page', (_e, _url, isMainFrame) => { if (isMainFrame) nav(); });
  wc.on('did-fail-load', (_e, code, description, url, isMainFrame) => {
    // -3: stopped by another navigation
    if (isMainFrame && code !== -3) emit({ type: 'error', code, description, url });
  });
  wc.on('render-process-gone', (_e, d) => emit({ type: 'gone', reason: d.reason }));
  wc.on('unresponsive', () => emit({ type: 'unresponsive' }));
  wc.on('audio-state-changed', e => emit({ type: 'audio', audible: !!e.audible }));
  wc.on('found-in-page', (_e, r) => emit({ type: 'found', matches: r.matches, active: r.activeMatchOrdinal, final: r.finalUpdate }));
  wc.on('focus', () => emit({ type: 'focus' }));
  wc.on('update-target-url', (_e, url) => emit({ type: 'hover', url: url ? String(url).slice(0, 2000) : '' }));
  wc.on('context-menu', (_e, p) => emit({
    type: 'menu', x: p.x, y: p.y, link: allowedUrl(p.linkURL) && p.linkURL ? p.linkURL : '', linkText: String(p.linkText ?? '').slice(0, 200),
    image: p.mediaType === 'image' && allowedUrl(p.srcURL) ? p.srcURL : '', selection: String(p.selectionText ?? '').slice(0, 2000),
    editable: !!p.isEditable, flags: p.editFlags ?? {},
  }));
  wc.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const combo = comboOf(input);
    if (combo && v.keys.has(combo)) {
      e.preventDefault();
      emit({ type: 'key', combo });
    }
  });
  wc.on('select-bluetooth-device', (e, _list, callback) => { e.preventDefault(); callback(''); });
  wc.on('login', (e, details, authInfo, callback) => {
    e.preventDefault();
    if (authInfo.isProxy) return callback();
    ask(v, { type: 'auth', host: authInfo.host, realm: authInfo.realm ?? '', url: details.url }, ans => (ans ? callback(ans.user, ans.password) : callback()));
  });
  // HTML full screen and the developer tools are not for pages shown inside lilOS
  wc.on('enter-html-full-screen', () => wc.executeJavaScript('document.exitFullscreen?.()', false).catch(() => {}));
  if (app.isPackaged) wc.on('devtools-opened', () => wc.closeDevTools());
}

function getView(owner, id) {
  const v = views.get(Number(id));
  if (!v || v.owner !== owner) throw new Error('web:unknown');
  return v;
}

export async function create(owner, profile, opts = {}) {
  const win = BrowserWindow.fromWebContents(owner);
  if (!win) throw new Error('web:unknown');
  let partition;
  if (opts.private != null) {
    if (!KEY_RE.test(String(opts.private))) throw new Error('web:invalid');
    partition = `netwave-priv-${profile.id}-${opts.private}`;
  } else {
    const user = await userKey(profile);
    if (!user) throw new Error('web:signedOut');
    partition = `persist:netwave-${profile.id}-${user}`;
  }
  const ses = configure(partition);
  watchOwner(owner);
  const view = new WebContentsView({
    webPreferences: {
      partition, sandbox: true, contextIsolation: true, nodeIntegration: false, nodeIntegrationInSubFrames: false,
      webviewTag: false, spellcheck: false, safeDialogs: true, navigateOnDragDrop: false,
      devTools: !app.isPackaged, backgroundThrottling: true,
    },
  });
  view.setBackgroundColor('#ffffff');
  view.setVisible(false);
  win.contentView.addChildView(view);
  const id = nextId++;
  const v = { id, view, owner, win, partition, private: opts.private != null, keys: new Set(), grants: new Map(), shown: false, scale: 1, zoom: 1 };
  setKeys(v, opts.keys);
  views.set(id, v);
  watch(v, ses);
  if (opts.url) navigate(owner, id, opts.url);
  return { id };
}

/** A lilOS page that reloads, goes elsewhere or closes takes its views (and what they asked) with it. */
function watchOwner(owner) {
  if (owners.has(owner)) return;
  owners.add(owner);
  owner.on('did-start-navigation', d => { if (d.isMainFrame && !d.isSameDocument) forgetOwner(owner); });
  owner.on('render-process-gone', () => forgetOwner(owner));
  owner.once('destroyed', () => forgetOwner(owner));
}

function setKeys(v, keys) {
  v.keys = new Set((Array.isArray(keys) ? keys : []).filter(k => typeof k === 'string' && COMBO_RE.test(k)).slice(0, 80));
}

export function navigate(owner, id, url) {
  const v = getView(owner, id);
  const ok = allowedUrl(url);
  if (!ok) throw new Error('web:blocked');
  v.view.webContents.loadURL(ok).catch(() => {});   // failures come as 'error' events
}

export function place(owner, id, rect, scale = 1) {
  const v = getView(owner, id);
  if (!rect) {
    v.view.setVisible(false);
    v.shown = false;
    return;
  }
  const z = owner.getZoomFactor();
  const n = x => Math.round(Number(x) * z);
  const bounds = { x: n(rect.x), y: n(rect.y), width: Math.max(1, n(rect.width)), height: Math.max(1, n(rect.height)) };
  if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)) throw new Error('web:invalid');
  v.view.setBounds(bounds);
  const s = Math.min(4, Math.max(0.25, Number(scale) || 1));
  if (s !== v.scale) { v.scale = s; applyZoom(v); }
  if (!v.shown) { v.view.setVisible(true); v.shown = true; }
}

function applyZoom(v) {
  v.view.webContents.setZoomFactor(Math.min(5, Math.max(0.25, v.zoom * v.scale)));
}

export async function cover(owner, id) {
  const v = getView(owner, id);
  // A hidden view is captured as well (with what it shows now): the page keeps its picture up to date while covered
  let picture = null;
  try {
    const image = await v.view.webContents.capturePage();
    if (!image.isEmpty()) picture = `data:image/jpeg;base64,${image.toJPEG(82).toString('base64')}`;
  } catch { /* no picture: the page shows its own background */ }
  const hadFocus = v.view.webContents.isFocused();
  v.view.setVisible(false);
  v.shown = false;
  if (hadFocus && !owner.isDestroyed()) owner.focus();
  return picture;
}

export function close(owner, id) {
  const v = getView(owner, id);
  destroy(v);
}

function destroy(v) {
  views.delete(v.id);
  for (const [rid, p] of [...pending]) if (p.viewId === v.id) answer(rid, null);
  try { if (!v.win.isDestroyed()) v.win.contentView.removeChildView(v.view); } catch { /* window gone */ }
  if (!v.view.webContents.isDestroyed()) v.view.webContents.close({ waitForBeforeUnload: false });
  // The last view of a private window: its data go
  if (v.private && ![...views.values()].some(o => o.partition === v.partition)) {
    const ses = session.fromPartition(v.partition);
    ses.clearStorageData().catch(() => {});
    ses.clearCache().catch(() => {});
    ses.clearAuthCache().catch(() => {});
  }
}

/** The lilOS page reloaded or went: its views go with it. */
export function forgetOwner(owner) {
  for (const v of [...views.values()]) if (v.owner === owner) destroy(v);
  for (const [rid, p] of [...pending]) if (p.owner === owner) answer(rid, null);
  for (const [did, d] of [...downloads]) if (d.owner === owner) { if (d.state === 'progressing') d.item.cancel(); forgetDownload(did); }
}

function forgetDownload(downloadId) {
  const d = downloads.get(downloadId);
  if (!d) return;
  downloads.delete(downloadId);
  rm(d.path, { force: true }).catch(() => {});
}

async function readDownload(owner, downloadId) {
  const d = downloads.get(String(downloadId));
  if (!d || d.owner !== owner || d.state !== 'completed') throw new Error('web:unknown');
  const { size } = await stat(d.path);
  if (size > DOWNLOAD_MAX) throw new Error('web:tooBig');
  const chunks = [];
  for await (const chunk of createReadStream(d.path)) chunks.push(chunk);
  const buf = Buffer.concat(chunks);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/** Every call of window.lilosHost.web, for bridge.js: (contents, profile, ...args). */
export const WEB_HANDLERS = {
  'web.info': () => ({ available: true, version: 1 }),
  'web.create': (c, p, opts) => create(c, p, opts ?? {}),
  'web.navigate': (c, _p, id, url) => navigate(c, id, url),
  'web.back': (c, _p, id) => { const h = getView(c, id).view.webContents.navigationHistory; if (h.canGoBack()) h.goBack(); },
  'web.forward': (c, _p, id) => { const h = getView(c, id).view.webContents.navigationHistory; if (h.canGoForward()) h.goForward(); },
  'web.reload': (c, _p, id, hard) => { const wc = getView(c, id).view.webContents; if (hard) wc.reloadIgnoringCache(); else wc.reload(); },
  'web.stop': (c, _p, id) => getView(c, id).view.webContents.stop(),
  'web.close': (c, _p, id) => close(c, id),
  'web.place': (c, _p, id, rect, scale) => place(c, id, rect && typeof rect === 'object' ? rect : null, scale),
  'web.cover': (c, _p, id) => cover(c, id),
  'web.focus': (c, _p, id) => { const v = getView(c, id); if (v.shown) v.view.webContents.focus(); },
  'web.zoom': (c, _p, id, factor) => { const v = getView(c, id); v.zoom = Math.min(5, Math.max(0.25, Number(factor) || 1)); applyZoom(v); },
  'web.mute': (c, _p, id, muted) => getView(c, id).view.webContents.setAudioMuted(!!muted),
  'web.edit': (c, _p, id, command) => { if (EDITS.has(command)) getView(c, id).view.webContents[command](); },
  'web.keys': (c, _p, id, keys) => setKeys(getView(c, id), keys),
  'web.find': (c, _p, id, text, opts) => { const s = String(text ?? '').slice(0, 500); if (s) getView(c, id).view.webContents.findInPage(s, { forward: opts?.forward !== false, findNext: !!opts?.next }); },
  'web.stopFind': (c, _p, id) => getView(c, id).view.webContents.stopFindInPage('clearSelection'),
  'web.grants': (c, _p, id, list) => {
    const v = getView(c, id);
    for (const g of Array.isArray(list) ? list.slice(0, 500) : []) {
      if (typeof g?.origin === 'string' && ACCESS.has(g.permission)) v.grants.set(`${g.origin}|${g.permission}`, !!g.allow);
    }
  },
  'web.permission': (c, _p, requestId, allow, remember) => answer(String(requestId), { allow: !!allow, remember: !!remember }, c),
  'web.auth': (c, _p, requestId, user, password) => answer(String(requestId), user == null ? null : { user: String(user), password: String(password ?? '') }, c),
  'web.downloadRead': (c, _p, downloadId) => readDownload(c, downloadId),
  'web.downloadDone': (c, _p, downloadId) => { const d = downloads.get(String(downloadId)); if (d?.owner === c) forgetDownload(String(downloadId)); },
  'web.downloadCancel': (c, _p, downloadId) => { const d = downloads.get(String(downloadId)); if (d?.owner === c) { if (d.state === 'progressing') d.item.cancel(); forgetDownload(String(downloadId)); } },
};

/** Leftovers of downloads never taken (the program closed meanwhile). */
export function cleanDownloads() {
  rm(join(app.getPath('temp'), 'lilos-netwave'), { recursive: true, force: true }).catch(() => {});
}
