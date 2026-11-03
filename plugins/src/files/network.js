import { Window, h, icon, fs, openMenu, messageBox, formatBytes } from '@lilos/sdk';
import * as sdk from '@lilos/sdk';   // `net`: missing in a lilOS without the network, so not imported by name
import { pickFile, launch } from '@lilos/system';
import * as system from '@lilos/system';   // `canLinkOnDesk`: missing in older lilOS
import { fieldsForm, fieldText as text } from '../shared/fieldsForm.js';
import { trustPrompt } from '../shared/trustPrompt.js';
import { t } from './i18n.js';

/**
 * The network in the File Manager: the Rete section of the sidebar (one entry per connection,
 * with its state), the bar over the list inside a connection, reading a folder of a connection
 * when it opens (asking the password or the confirmation of a server when the kernel needs them),
 * and the window to add or change a connection: its protocol from a list, and below it the fields
 * that protocol asks for (the kernel's module describes them).
 * Everything does nothing in a lilOS without the network (sdk.net missing or no protocols).
 */
export const network = () => (sdk.net?.available ? sdk.net : null);

/** The connection of a node of fs (its own, or the one it is in), or null. */
export function mountOf(id) {
  const mountId = fs.get(id)?.net;
  return mountId ? network()?.mount(mountId) ?? null : null;
}

const STATES = { on: 'net.state.on', connecting: 'net.state.connecting', off: 'net.state.off', error: 'net.state.error' };
export const stateLabel = m => t(STATES[m.state] ?? 'net.state.off') + (m.state === 'error' && m.error ? `: ${m.error}` : '');

const PROTOCOL_BADGE = { ftp: 'FTP', ftps: 'FTPS', sftp: 'SFTP', webdav: 'DAV', smb: 'SMB', onedrive: 'OD', gdrive: 'GD', gphotos: 'GF', s3: 'S3', azblob: 'AZ', nfs: 'NFS' };
const GROUPS = ['server', 'cloud', 'local'];
const PICTURES = 'Immagini';

/** The words a node of a connection shows beside its name: a document of the provider's site, a badge. */
export function netChips(n) {
  if (!n?.net) return [];
  const text = v => network()?.text(v) ?? '';
  const out = [];
  if (n.web) out.push(h('span', { class: 'fm-chip web', title: n.exportAs ? t('net.web.copiedAs', { ext: `.${n.exportAs}` }) : t('net.web.only') }, text(n.web)));
  if (n.badge) out.push(h('span', { class: 'fm-chip' }, text(n.badge)));
  return out;
}

/** The protocol of a connection, as the kernel describes it (links, office, recycles, fields…). */
export const protocolOf = m => (m ? network()?.protocols.find(p => p.id === m.protocol) ?? null : null);

/** True if the protocol's account is one to sign in to on the provider's page (a 'signin' field). */
const signsIn = protocol => !!protocol?.fields.some(f => f.type === 'signin');
const badge = protocol => PROTOCOL_BADGE[protocol] ?? protocol.toUpperCase().slice(0, 5);

/**
 * The Rete section of the sidebar: its title opens the Rete folder, its + adds a connection; each
 * connection opens its folder, and has a menu (connect, disconnect, change, remove).
 */
export function sideSection(browser, { active, reteFolder }) {
  const net = network();
  if (!net) return [];
  const add = h('button', { class: 'fm-side-add', type: 'button', title: t('net.add'), 'aria-label': t('net.add'), onclick: () => connectDialog(browser) }, icon('plus'));
  const title = reteFolder
    ? h('button', { class: 'fm-side-title', type: 'button', onclick: () => browser.go(reteFolder) }, t('net.section'))
    : h('span', {}, t('net.section'));
  const entries = net.mounts().sort((a, b) => a.name.localeCompare(b.name)).map(m => {
    const node = net.mountNode(m.id);
    const on = active === node;
    const btn = h('button', {
      class: on ? 'fm-place fm-mount on' : 'fm-place fm-mount', type: 'button', 'aria-current': on ? 'true' : null,
      title: `${m.address} · ${stateLabel(m)}`, onclick: () => browser.go(node),
    }, h('span', { class: `fm-dot ${m.state}`, 'aria-hidden': 'true' }), h('span', { class: 'fm-mount-name' }, m.name), h('span', { class: 'fm-proto' }, badge(m.protocol)));
    btn.dataset.folder = node;
    btn.addEventListener('contextmenu', e => {
      e.preventDefault();
      mountMenu(browser, m, e.clientX, e.clientY);
    });
    return btn;
  });
  return [
    h('section', { class: 'fm-side-net', 'aria-label': t('net.section') },
      h('h6', { class: 'fm-side-head' }, title, add),
      ...(entries.length ? entries : [h('p', { class: 'fm-side-none' }, t('net.none'))])),
  ];
}

/** The menu of a connection: in the sidebar and on its folder. */
export function mountMenu(browser, m, x, y) {
  const net = network();
  if (!net) return;
  const node = net.mountNode(m.id);
  openMenu(x, y, [
    { label: t('net.menu.open'), icon: 'open', action: () => browser.go(net.mountNode(m.id)) },
    m.state === 'on'
      ? { label: t('net.menu.disconnect'), icon: 'x', action: () => net.disconnect(m.id).catch(err => browser.netError(err)) }
      : { label: t('net.menu.connect'), icon: 'globe', action: () => browser.go(net.mountNode(m.id)) },
    { label: t('net.menu.edit'), icon: 'pencil', action: () => connectDialog(browser, m) },
    system.canLinkOnDesk?.([node]) && { label: t('menu.deskLink'), icon: 'link', action: () => browser.addDeskLinks([node]) },
    '-',
    { label: t('net.menu.remove'), icon: 'trash', danger: true, action: () => removeMount(browser, m) },
  ].filter(Boolean));
}

async function removeMount(browser, m) {
  const answer = await messageBox(browser.win, { icon: 'warning', title: t('net.remove.title', { name: m.name }), text: t('net.remove.text'), buttons: ['continue', 'cancel'] });
  if (answer === 'continue') network()?.remove(m.id).catch(err => browser.netError(err));
}

/** The bar over the list inside a connection: where it is connected, and Disconnetti. */
export function mountBar(browser, folderId) {
  const m = mountOf(folderId);
  if (!m) return null;
  const disconnect = h('button', { class: 'ctl-btn', type: 'button', onclick: () => network().disconnect(m.id).catch(err => browser.netError(err)) }, icon('x'), t('net.menu.disconnect'));
  const protocol = protocolOf(m);
  const web = m.state === 'on' && protocol?.links && sdk.net.openWeb
    ? h('button', { class: 'ctl-btn', type: 'button', onclick: () => openInBrowser(browser, folderId) }, icon('globe'), t('net.web.open'))
    : null;
  const importer = m.state === 'on' && protocol?.importer && sdk.net.imports
    ? h('button', { class: 'ctl-btn', type: 'button', onclick: () => importDialog(browser, m) }, icon('download'), network().text(protocol.importer.label))
    : null;
  // The account's space, read when the bar is drawn (a moment later)
  const space = h('span', { class: 'fm-mountbar-space' });
  if (m.state === 'on' && protocol?.space && sdk.net.space) {
    sdk.net.space(m.id).then(s => {
      if (!s) return;
      space.textContent = s.total ? t('net.space.of', { used: formatBytes(s.used), total: formatBytes(s.total) }) : t('net.space.used', { used: formatBytes(s.used) });
    }, () => {});
  }
  return h('div', { class: `fm-mountbar ${m.state}` },
    icon(m.state === 'on' ? 'lock' : 'globe'),
    h('span', { class: 'fm-mountbar-text' }, m.state === 'on' ? t('net.bar.on') : stateLabel(m), ' ', h('code', {}, m.address)),
    h('span', { class: 'fm-sp' }),
    space,
    importer,
    web,
    m.state === 'on' ? disconnect : null);
}

/**
 * Importing from a connection whose provider has an importer (Google Photos): where the copies go
 * (a folder of lilOS, ~/Immagini/Google Foto by default), the provider's page in a new tab to pick,
 * then the copy, which the kernel does (Trasferimento dati shows it).
 */
export function importDialog(browser, m) {
  const net = network();
  const protocol = protocolOf(m);
  if (!net?.imports || !protocol?.importer) return;
  const win = new Window({ title: net.text(protocol.importer.label).replace(/…$/, ''), icon: 'download', width: 440, height: 380, minWidth: 340, minHeight: 300 });
  // The system's Immagini folder (its name is the same in every language), or the home
  const defaultParent = () => fs.resolve(`~/${PICTURES}`)?.id ?? fs.root;
  let folder = null;   // the chosen folder (null: ~/Immagini/Google Foto, made when needed)
  const where = h('code', { class: 'fm-net-where' });
  const showWhere = () => { where.textContent = folder ? fs.path(folder) : `~/${PICTURES}/${net.text(protocol.label)}`; };
  const change = h('button', { class: 'ctl-btn', type: 'button' }, t('net.import.change'));
  const pick = h('button', { class: 'ctl-btn primary', type: 'button' }, icon('globe'), t('net.import.pick'));
  const go = h('button', { class: 'ctl-btn primary', type: 'button', disabled: true }, icon('download'), t('net.import.go'));
  const status = h('p', { class: 'fm-net-status', role: 'status' });
  const say = (msg, bad = false) => { status.textContent = msg; status.classList.toggle('bad', bad); };
  let done = null, waiting = null;

  change.addEventListener('click', async () => {
    const node = await pickFile(browser.openWindow, { kind: 'folder', title: t('net.import.where') });
    if (node) { folder = node.id; showWhere(); }
  });
  pick.addEventListener('click', () => {
    waiting?.abort();
    const controller = waiting = new AbortController();
    let importId = null;
    done = null;
    go.disabled = true;
    say(t('net.import.opening'));
    net.openWeb(async () => {
      const started = await net.imports.start(m.id);
      importId = started.id;
      return started.url;
    }).then(async () => {
      say(t('net.import.waiting'));
      for (;;) {
        if (controller.signal.aborted) return;
        const s = await net.imports.status(m.id, importId, { wait: true });
        if (controller.signal.aborted) return;
        if (s.status === 'pending') continue;
        if (s.status === 'error') return say(s.error ?? t('net.import.failed'), true);
        if (!s.count) return say(t('net.import.none'), true);
        done = s;
        go.disabled = false;
        return say(t('net.import.picked', { count: s.count }));
      }
    }).catch(err => {
      if (err.code === 'secret_required') { askSignIn(browser, m); return say(''); }
      say(err.message, true);
    });
  });
  go.addEventListener('click', async () => {
    if (!done) return;
    go.disabled = true;
    try {
      let target = folder;
      if (!target) {
        // ~/Immagini/Google Foto: made if missing
        const parent = defaultParent();
        const name = net.text(protocol.label);
        target = fs.children(parent).find(n => n.type === 'folder' && n.name === name)?.id ?? fs.create(parent, { type: 'folder', name }).id;
      }
      await net.imports.copy(m.id, done.path, target);
      win.emit('close');
      browser.go(target);
    } catch (err) {
      go.disabled = false;
      say(err.message, true);
    }
  });
  win.on('destroy', () => waiting?.abort());
  showWhere();
  win.body.append(h('div', { class: 'fm-net-dialog' },
    h('div', { class: 'fm-net-body' },
      h('div', { class: 'sh-field' }, h('label', {}, t('net.import.where')), h('div', { class: 'sh-field-pick' }, where, change)),
      h('div', { class: 'sh-field' }, h('label', {}, t('net.import.step')), h('div', {}, pick), h('small', { class: 'sh-field-hint' }, t('net.import.hint'))),
      status),
    h('div', { class: 'fm-net-foot' }, h('span', { class: 'fm-sp' }),
      h('button', { class: 'ctl-btn', type: 'button', onclick: () => win.emit('close') }, t('net.cancel')), go)));
  browser.openWindow(win);
}

/**
 * Opens the page of a file or folder of a connection on the provider's site (OneDrive's, or Office
 * for the web for an Office document) in a new browser tab. Call it right from a click.
 */
export function openInBrowser(browser, id) {
  const m = mountOf(id);
  if (!m || !sdk.net?.openWeb) return;
  sdk.net.openWeb(() => sdk.net.link(m.id, fs.netPath(id)))
    .catch(err => (err.code === 'secret_required' ? askSignIn(browser, m) : browser.netError(err)));
}

/**
 * Reads a folder of a connection (it is being opened). When the kernel needs the password or the
 * user's confirmation of the server it asks, then reads again. Resolves true once read.
 */
export async function readRemote(browser, id) {
  const net = network();
  if (!net || !fs.isRemote?.(id)) return true;
  for (;;) {
    try {
      await fs.refresh(id);
      return true;
    } catch (err) {
      const m = mountOf(id);
      if (!m || !fs.exists(id)) return false;
      if (err.code === 'secret_required') {
        const ok = err.details?.reason === 'signin' || signsIn(protocolOf(m)) ? await askSignIn(browser, m) : await askSecret(browser, m, err.details?.reason === 'auth');
        if (!ok) return false;
        continue;
      }
      if (err.code === 'untrusted') {
        if (!await confirmTrust(browser, m.id, m.name, err.details?.trust)) return false;
        continue;
      }
      if (await browser.netError(err, { retry: true, title: t('net.error.read', { name: m.name }) }) !== 'retry') return false;
    }
  }
}

/** Asks the user to confirm a server (its key or certificate), then connects with it. Resolves true if confirmed. */
async function confirmTrust(browser, mountId, name, trust) {
  if (!await trustPrompt(browser.win, trust, { t, name })) return false;
  try {
    await network().connect(mountId, { trust: trust.fingerprint });
    return true;
  } catch (err) {
    if (err.code === 'secret_required' || err.code === 'untrusted') return true;   // the next attempt asks
    await browser.netError(err);
    return false;
  }
}

// ---------- Fields of a protocol ----------

/**
 * The fields of a protocol in a form (the shared fieldsForm, see its options), with what only the
 * File Manager has: the sign-in to an account ('signin' fields) and the list of shares of a server.
 * Returns the form, and signin(): the sign-in made in this window (its id for the kernel), or null.
 *   initial   values of a connection being changed (its secret fields stay empty: "unchanged"), or to start from
 *   editing   the values are a saved connection's
 *   only      'secret': only the secret fields (asking the password again)
 *   onShares  (button, pick) lists the shares of the server under the button; pick(name) chooses one
 */
function protocolFields(browser, protocol, { initial = {}, editing = false, only = null, onShares = null, onChange = null } = {}) {
  const signin = { id: null };   // a sign-in made in this window: the kernel keeps what it gave
  const form = fieldsForm(protocol.fields, {
    t, values: initial, editing, only, onChange,
    pickFile: options => pickFile(browser.openWindow, options),
    signin: (f, { values, changed }) => signInRow(protocol, f, values, signin, changed),
    extra: (f, { set }) => {
      if (f.key !== 'share' || !onShares) return null;
      const list = h('button', { class: 'ctl-btn', type: 'button' }, t('net.shares.list'));
      list.addEventListener('click', () => onShares(list, set));
      return list;
    },
  });
  return { ...form, signin: () => signin.id };
}

/**
 * A 'signin' field: the account signed in to, or the button that opens the provider's page in a
 * window (lilOS waits for it there, with Annulla). Signing in again here changes the account.
 */
function signInRow(protocol, f, values, signin, changed) {
  const row = h('div', { class: 'sh-field' });
  const status = h('small', { class: 'fm-net-wait', role: 'status' });
  const paste = pasteBox(status);
  let controller = null, buttons = [];
  const go = () => {
    controller?.abort();
    controller = new AbortController();
    const others = Object.fromEntries(Object.entries(values).filter(([k]) => k !== f.key));
    const manual = !!sdk.net.signInByHand?.(protocol);
    const asked = sdk.net.signIn(protocol.id, others, { signal: controller.signal, ...(manual && { manual: true, askAddress: paste.ask(controller.signal) }) });
    for (const b of buttons) b.disabled = true;
    cancel.hidden = false;
    status.classList.remove('bad');
    status.textContent = manual ? '' : t('net.signin.waiting');
    asked.then(({ signin: id, account }) => {
      signin.id = id;
      values[f.key] = account;
      draw();
      changed();
    }, err => {
      for (const b of buttons) b.disabled = false;
      cancel.hidden = true;
      paste.el.hidden = true;
      status.textContent = err.code === 'canceled' ? '' : err.code === 'blocked' ? t('net.signin.blocked') : err.message;
      status.classList.toggle('bad', err.code !== 'canceled');
    });
  };
  const cancel = h('button', { class: 'ctl-btn', type: 'button', hidden: true, onclick: () => controller?.abort() }, t('net.cancel'));
  // Drawn again in place once signed in: the account instead of the button
  const draw = () => {
    cancel.hidden = true;
    const label = h('label', {}, text(f.label), f.required ? h('span', { class: 'sh-field-req', 'aria-hidden': 'true' }, ' *') : null);
    if (values[f.key]) {
      const other = h('button', { class: 'ctl-btn', type: 'button', onclick: go }, t('net.signin.other'));
      buttons = [other];
      return row.replaceChildren(label,
        h('div', { class: 'fm-net-account' }, icon(signin.id ? 'check' : 'user'), h('span', { class: 'fm-net-who' }, values[f.key]), other, cancel),
        paste.el, status);
    }
    const button = h('button', { class: 'ctl-btn primary fm-signin', type: 'button', onclick: go }, icon('user'), text(f.button) || t('net.signin.button'));
    buttons = [button];
    row.replaceChildren(...[label, h('div', { class: 'sh-field-pick' }, button, cancel), f.hint ? h('small', { class: 'sh-field-hint' }, text(f.hint)) : null, paste.el, status].filter(Boolean));
  };
  draw();
  return row;
}

/**
 * The box of a sign-in by hand: the provider's page is in a new tab; at the end the browser shows
 * a page that does not open, and its address is pasted here. ask(signal) is the askAddress the
 * SDK's net.signIn wants: it shows the box (with the error of the last address, if any) and
 * resolves with what is pasted, or null when the sign-in is canceled.
 */
function pasteBox(status) {
  const input = h('input', { class: 'ctl-text', type: 'text', spellcheck: 'false', autocomplete: 'off', placeholder: 'http://127.0.0.1:53682/?state=…&code=…', 'aria-label': t('net.signin.paste.label') });
  const go = h('button', { class: 'ctl-btn primary', type: 'button' }, t('net.signin.paste.go'));
  const el = h('div', { class: 'fm-net-paste', hidden: true },
    h('small', {}, t('net.signin.paste.text')),
    h('div', { class: 'sh-field-pick' }, input, go));
  const ask = signal => error => new Promise(resolve => {
    el.hidden = false;
    status.textContent = error ?? '';
    status.classList.toggle('bad', !!error);
    input.value = '';
    requestAnimationFrame(() => input.focus());
    const finish = value => { go.onclick = null; input.onkeydown = null; resolve(value); };
    go.onclick = () => finish(input.value.trim() || null);
    input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); finish(input.value.trim() || null); } };
    signal.addEventListener('abort', () => finish(null), { once: true });
  });
  return { el, ask };
}

// ---------- Windows ----------

/**
 * Connetti a un server (m: a connection to change, or none for a new one): the protocol from a
 * list, its fields, the name of the folder in Rete, remember the password, connect at sign-in.
 * Prova tries without saving; the main button saves and connects (and opens the folder). A
 * server lilOS does not know yet is confirmed in a message box (trustPrompt), then tried again.
 *   initial      a new connection filled in: { protocol, values, name } (Nuovo collegamento)
 *   onConnected  (mount) once connected, in place of opening its folder; onClosed: closed before
 */
export function connectDialog(browser, m = null, { initial = null, onConnected = null, onClosed = null } = {}) {
  const net = network();
  if (!net) return;
  const win = new Window({ title: m ? t('net.edit.title', { name: m.name }) : t('net.connect.title'), icon: 'globe', width: 460, height: 660, minWidth: 360, minHeight: 360 });
  let protocol = net.protocols.find(p => p.id === (m?.protocol ?? initial?.protocol)) ?? net.protocols[0];
  let connected = false;
  let fields = null, trust = null;
  // The protocols in their groups (servers, cloud, local network), in their order
  const option = p => h('option', { value: p.id, selected: p.id === protocol.id }, text(p.label));
  const groups = GROUPS.map(g => [g, net.protocols.filter(p => (p.group ?? 'server') === g)]).filter(([, list]) => list.length);
  const select = h('select', { class: 'ctl-select', id: 'fm-net-protocol', disabled: !!m },
    ...(groups.length > 1 ? groups.map(([g, list]) => h('optgroup', { label: t(`net.group.${g}`) }, ...list.map(option))) : net.protocols.map(option)));
  const name = h('input', { class: 'ctl-text', type: 'text', id: 'fm-net-name', spellcheck: 'false', value: m?.name ?? initial?.name ?? '' });
  const nameHint = h('small', { class: 'sh-field-hint' });
  const remember = h('input', { type: 'checkbox', checked: m ? m.remembered : true });
  const rememberText = h('span', {}, t('net.remember'));
  const auto = h('input', { type: 'checkbox', checked: !!m?.auto });
  const holder = h('div');
  const status = h('p', { class: 'fm-net-status', role: 'status' });
  const test = h('button', { class: 'ctl-btn', type: 'button' }, t('net.test'));
  const cancel = h('button', { class: 'ctl-btn', type: 'button', onclick: () => win.emit('close') }, t('net.cancel'));
  const save = h('button', { class: 'ctl-btn primary', type: 'button' }, m ? t('net.save') : t('net.connect.go'));
  let named = !!m;   // the user wrote a name: the server's does not replace it

  const hint = () => { nameHint.textContent = name.value.trim() ? t('net.name.hint', { path: `~/Rete/${name.value.trim()}` }) : ''; };
  // Until the user names it, the folder in Rete is called after the server, or the provider for an account to sign in to
  const defaultName = () => {
    if (named) return;
    name.value = fields.values().host ?? (signsIn(protocol) ? text(protocol.label) : '');
    hint();
  };
  const say = (msg, bad = false) => { status.textContent = msg; status.classList.toggle('bad', bad); };
  const draw = () => {
    trust = null;
    // Not usable yet (a module setting missing): why, instead of the fields
    const why = protocol.notReady;
    test.disabled = save.disabled = !!why;
    if (why) {
      fields = protocolFields(browser, { ...protocol, fields: [] });
      holder.replaceChildren(h('div', { class: 'fm-net-note' }, h('b', {}, t('net.notReady.title', { name: text(protocol.label) })), h('span', {}, text(why)),
        h('div', {}, h('button', { class: 'ctl-btn', type: 'button', onclick: () => launch('settings', { tab: protocol.id }) }, icon('gear'), t('net.notReady.settings')))));
      return;
    }
    rememberText.textContent = t(signsIn(protocol) ? 'net.remember.signin' : 'net.remember');
    fields = protocolFields(browser, protocol, {
      initial: m?.values ?? (protocol.id === initial?.protocol ? initial.values : {}),
      editing: !!m,
      onShares: protocol.canListShares ? listShares : null,
      onChange: () => {
        defaultName();
        trust = null;   // another server: confirmed again
      },
    });
    defaultName();
    holder.replaceChildren(fields.el);
  };
  /** What the kernel gets: the configuration, and the secrets apart (files of the fields read now). */
  const config = async () => {
    const { values, secret } = await fields.read();
    return [{ protocol: protocol.id, values, ...(trust && { trust: trust.fingerprint }), ...(fields.signin() && { signin: fields.signin() }) }, secret];
  };
  /** A server lilOS does not know: true when the user confirms it (it goes with the next tries). */
  const confirm = async tr => {
    if (!await trustPrompt(win, tr, { t, name: name.value.trim() || tr?.host })) return false;
    trust = tr;
    return true;
  };

  async function listShares(button, pick) {
    button.disabled = true;
    try {
      for (;;) {
        try {
          const shares = await net.shares(...await config());
          const r = button.getBoundingClientRect();
          if (!shares.length) return say(t('net.shares.none'));
          return void openMenu(r.left, r.bottom, shares.map(s => ({ label: s, icon: 'folder', action: () => pick(s) })));
        } catch (err) {
          if (err.code === 'untrusted' && await confirm(err.details?.trust)) continue;
          return say(err.code === 'untrusted' ? '' : err.message, true);
        }
      }
    } finally { button.disabled = false; }
  }

  select.addEventListener('change', () => { protocol = net.protocols.find(p => p.id === select.value); draw(); });
  name.addEventListener('input', () => { named = !!name.value.trim(); hint(); });

  test.addEventListener('click', async () => {
    const missing = fields.missing(!m);
    if (missing.length) return say(t('net.missing', { fields: missing.join(', ') }), true);
    say(t('net.testing'));
    for (;;) {
      try {
        await net.test(...await config());
        return say(t('net.test.ok'));
      } catch (err) {
        if (err.code === 'untrusted' && await confirm(err.details?.trust)) continue;
        return say(err.code === 'untrusted' ? '' : err.message, true);
      }
    }
  });

  save.addEventListener('click', async () => {
    const missing = fields.missing(!m || !m.remembered);
    if (!name.value.trim()) missing.unshift(t('net.name'));
    if (missing.length) return say(t('net.missing', { fields: missing.join(', ') }), true);
    save.disabled = true;
    say(t('net.connecting'));
    try {
      const [values, secret] = await config();
      const body = { name: name.value.trim(), ...values, auto: auto.checked, remember: remember.checked };
      const saved = m ? await net.update(m.id, body, secret) : await net.create(body, secret);
      m = saved;
      for (;;) {
        try {
          await net.connect(saved.id, trust ? { trust: trust.fingerprint } : {});
          break;
        } catch (err) {
          if (err.code === 'untrusted' && await confirm(err.details?.trust)) continue;
          return say(err.code === 'untrusted' ? '' : err.message, true);
        }
      }
      connected = true;
      win.emit('close');
      if (onConnected) onConnected(saved);
      else browser.go(net.mountNode(saved.id));
    } catch (err) {
      say(err.message, true);
    } finally {
      save.disabled = false;
    }
  });

  if (onClosed) win.on('destroy', () => { if (!connected) onClosed(); });
  draw();
  hint();
  win.body.append(h('div', { class: 'fm-net-dialog' },
    h('div', { class: 'fm-net-body' },
      h('div', { class: 'sh-field' }, h('label', { for: 'fm-net-protocol' }, t('net.protocol')), select),
      holder,
      h('div', { class: 'sh-field' }, h('label', { for: 'fm-net-name' }, t('net.name')), name, nameHint),
      h('label', { class: 'sh-field-check' }, remember, rememberText),
      h('label', { class: 'sh-field-check' }, auto, t('net.auto')),
      status),
    h('div', { class: 'fm-net-foot' }, test, h('span', { class: 'fm-sp' }), cancel, save)));
  browser.openWindow(win);
  requestAnimationFrame(() => fields.focus());
}

/**
 * Asks to sign in again to the account of a connection (the provider no longer takes the one it
 * had), then connects with the new sign-in: a message box over the File Manager with the button
 * that opens the provider's page. Resolves true once connected, false if the user gave up.
 */
export async function askSignIn(browser, m) {
  const net = network();
  const protocol = net?.protocols.find(p => p.id === m.protocol);
  if (!protocol || !net.signIn) return false;
  const field = protocol.fields.find(f => f.type === 'signin');
  const status = h('p', { class: 'fm-net-status', role: 'status' });
  const paste = pasteBox(status);
  const go = h('button', { class: 'ctl-btn primary', type: 'button' }, icon('user'), text(field?.button) || t('net.signin.button'));
  let controller = null;
  const box = messageBox(browser.win, {
    icon: 'info',
    title: t('net.signin.again.title', { name: m.name }),
    text: t('net.signin.again.text', { account: m.values?.[field?.key] ?? m.address }),
    content: h('div', { class: 'fm-net-signin' }, h('div', {}, go), paste.el, status),
    buttons: [{ value: 'cancel', label: t('net.later') }],
  });
  go.addEventListener('click', () => {
    controller?.abort();
    controller = new AbortController();
    const manual = !!net.signInByHand?.(protocol);
    const asked = net.signIn(protocol.id, m.values, { signal: controller.signal, ...(manual && { manual: true, askAddress: paste.ask(controller.signal) }) });
    go.disabled = true;
    status.classList.remove('bad');
    status.textContent = manual ? '' : t('net.signin.waiting');
    asked.then(({ signin }) => net.connect(m.id, { signin, remember: m.remembered }))
      .then(() => box.close('connected'), err => {
        go.disabled = false;
        paste.el.hidden = true;
        if (err.code === 'canceled') { status.textContent = ''; return; }
        status.textContent = err.code === 'blocked' ? t('net.signin.blocked') : err.message;
        status.classList.add('bad');
      });
  });
  go.focus();
  const answer = await box;
  controller?.abort();
  return answer === 'connected';
}

/**
 * Asks the password (the secret fields of the protocol) of a connection in a message box, and
 * connects with it before the box closes. wrong: the last one was not right. Resolves true once
 * connected (or when the next step is to confirm the server), false if the user gave up.
 */
async function askSecret(browser, m, wrong = false) {
  const net = network();
  const protocol = net?.protocols.find(p => p.id === m.protocol);
  if (!protocol) return false;
  const fields = protocolFields(browser, protocol, { initial: m.values, only: 'secret' });
  const box = messageBox(browser.win, {
    icon: wrong ? 'warning' : 'info',
    title: t('net.password.title', { name: m.name }),
    text: [wrong && t('net.password.wrong'), t('net.password.text', { address: m.address })].filter(Boolean).join('\n\n'),
    content: fields.el,
    fields: [{ name: 'remember', type: 'checkbox', label: t('net.remember'), value: m.remembered }],
    buttons: ['cancel', { value: 'connect', label: t('net.connect.go'), primary: true }],
    validate: async ({ remember }) => {
      try {
        await net.connect(m.id, { secret: await fields.secret(), remember });
      } catch (err) {
        if (err.code !== 'untrusted') return err.message;   // untrusted: reading again asks to confirm the server
      }
      return true;
    },
  });
  fields.focus();   // the password, not the checkbox under it
  const { button } = await box;
  return button === 'connect';
}
