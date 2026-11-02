import { Emitter } from './events.js';
import { kernel, KernelError } from './kernel.js';
import { locale } from './locale.js';
import { fs } from './fs.js';

/**
 * Network connections (the Rete folder: FTP, SFTP, WebDAV… each protocol a kernel module) and the
 * transfers to and from them, which the kernel does: they go on with the app that started them
 * closed, and with lilOS closed. Only connected to the kernel (available false otherwise).
 *
 *   net.available                     the kernel has at least one protocol
 *   net.protocols                     [{ id, label, order, fields, canListShares, links, office, recycles,
 *                                     notReady }]   fields: see the kernel's net/drivers.js ({ key, type,
 *                                     label, required, secret, when, … }); links: link() works on its
 *                                     connections (office: an Office document's link opens Office for
 *                                     the web); recycles: what is removed goes to the server's own
 *                                     recycle bin; notReady: why it cannot be used yet (a label), or null
 *   net.mounts() → [mount]            mount: { id, name, protocol, address, values, auto, remembered,
 *   net.mount(id) → mount | null        trusted, state: 'off' | 'connecting' | 'on' | 'error', error }
 *   net.load()                        reads them again from the kernel
 *   net.create({ name, protocol, values, auto, remember, trust? }, secret) → mount
 *   net.update(id, { name?, values?, auto?, remember?, forget? }, secret?) → mount
 *   net.remove(id)
 *   net.connect(id, { secret?, remember?, trust?, signin? }) → mount      net.disconnect(id) → mount
 *   net.test({ protocol, values, trust? }, secret)               tries without saving
 *   net.shares({ protocol, values, trust? }, secret) → [name]    (protocols with canListShares)
 *   net.text(label) → string          a label of a protocol or field ({ en, it } or a text) in the system's language
 *   net.mountNode(id) → node id       the folder of a connection in fs
 *
 *   Protocols with a 'signin' field (an account on the provider's site, such as OneDrive):
 *   net.signIn(protocol, values, { signal }) → { signin, account }   opens the provider's page in a
 *                                     window (call it right from a click: browsers open windows only
 *                                     then), waits for the sign-in, closes the window. `signin` goes
 *                                     in create(), update(), test() and connect(): the tokens stay in
 *                                     the kernel. Rejects with code 'blocked' (the browser did not open
 *                                     the window) or 'canceled' (signal aborted).
 *   net.link(id, path) → 'https://…'  a file's or folder's page on the provider's site (protocols with links)
 *   net.openWeb(getUrl)               opens a new browser tab now and takes it to `await getUrl()`
 *                                     (closed again if that fails); call it right from a click
 *   net.putHome(id, fileId, folder, ifExists) → { path, name }   copies a file of the home into a
 *                                     folder of a connection (made if missing). ifExists 'replace' |
 *                                     'keep' | 'ask' (fails with code 'conflict', details { name })
 *
 *   Errors of a connection (KernelError): code 'secret_required' (ask the password: details.reason
 *   'missing' or 'auth'), 'untrusted' (details.trust { kind, fingerprint, text }: ask the user to
 *   confirm, then connect again with { trust: fingerprint }), 'unavailable' (no server there).
 *
 *   net.transfers                     the last snapshot of the transfers (see the kernel's net/transfers.js)
 *   net.transfer(ids, folderId) → { queue }   copies nodes of fs into a folder, one side at least
 *                                     on a connection (the kernel does it; sources stay where they are)
 *   net.children(itemId) → { items, more }     inside a folder of a queue
 *   net.cancel({ ids?, queue?, all? }) · net.resolve(id, action, all?) · net.retry({ ids?, queue? })
 *   net.dismiss({ ids?, queue?, all? }) · net.pause(queue, paused)
 *
 * Events: 'mounts' (a connection was added, changed or went), 'transfers' (snapshot),
 *         'notify' { text, level } (a queue ended and the kernel keeps no notifications).
 * The system tells it what the kernel streams: mountChanged(), transfersChanged(snapshot), notified(data).
 */
class Net extends Emitter {
  protocols = [];
  transfers = { active: false, run: null, since: null, sent: { done: 0, total: 0, rate: 0 }, received: { done: 0, total: 0, rate: 0 }, queues: [] };
  #mounts = [];
  #loading = null;

  constructor() {
    super();
    if (kernel.connected && kernel.data?.net) this.#set(kernel.data.net);
  }

  get available() { return kernel.connected && this.protocols.length > 0; }

  mounts() { return this.#mounts.map(m => ({ ...m })); }
  mount(id) { const m = this.#mounts.find(x => x.id === id); return m ? { ...m } : null; }
  mountNode(id) { return `net-${id}`; }

  text(label) {
    if (typeof label === 'string') return label;
    if (!label || typeof label !== 'object') return '';
    const code = locale.code, lang = code.split('-')[0];
    return label[code] ?? label[lang] ?? label.en ?? Object.values(label)[0] ?? '';
  }

  #set(data) {
    this.protocols = Array.isArray(data?.protocols) ? data.protocols : [];
    this.#mounts = Array.isArray(data?.mounts) ? data.mounts : [];
    this.emit('mounts');
  }

  async load() {
    if (!kernel.connected) return;
    this.#loading ??= kernel.request('GET', '/net').then(data => this.#set(data)).finally(() => { this.#loading = null; });
    return this.#loading;
  }

  #replace(mount) {
    const i = this.#mounts.findIndex(m => m.id === mount.id);
    if (i >= 0) this.#mounts[i] = mount;
    else this.#mounts.push(mount);
    this.emit('mounts');
    return { ...mount };
  }

  async create(config, secret = {}) {
    return this.#replace(await kernel.request('POST', '/net/mounts', { ...config, secret }));
  }

  async update(id, config, secret = {}) {
    return this.#replace(await kernel.request('PUT', `/net/mounts/${id}`, { ...config, secret }));
  }

  async remove(id) {
    await kernel.request('DELETE', `/net/mounts/${id}`);
    this.#mounts = this.#mounts.filter(m => m.id !== id);
    this.emit('mounts');
  }

  async connect(id, { secret = null, remember, trust, signin } = {}) {
    try {
      return this.#replace(await kernel.request('POST', `/net/mounts/${id}/connect`, { secret, remember, trust, signin }));
    } finally {
      this.load().catch(() => {});   // its state, whatever happened
    }
  }

  async disconnect(id) {
    return this.#replace(await kernel.request('POST', `/net/mounts/${id}/disconnect`, {}));
  }

  async test(config, secret = {}) {
    await kernel.request('POST', '/net/test', { ...config, secret });
  }

  async shares(config, secret = {}) {
    return (await kernel.request('POST', '/net/shares', { ...config, secret })).shares;
  }

  signIn(protocol, values = {}, { signal } = {}) {
    // Opened now, while the click still counts; it goes to the provider's page once the kernel gives it
    const win = window.open('about:blank', `lilos-signin-${Date.now()}`, 'popup,width=520,height=700');
    return (async () => {
      if (!win) throw new KernelError(0, 'blocked', 'Il browser ha bloccato la finestra di accesso');
      let id = null;
      const stopped = new Promise((_, reject) => {
        const stop = () => reject(new KernelError(0, 'canceled', 'Accesso annullato'));
        if (signal?.aborted) stop();
        signal?.addEventListener('abort', stop, { once: true });
      });
      stopped.catch(() => {});
      try {
        const started = await Promise.race([stopped, kernel.request('POST', '/net/signin', { protocol, values, redirectUri: `${location.origin}/api/net/signin/callback` })]);
        id = started.id;
        win.location.href = started.url;
        for (;;) {
          const s = await Promise.race([stopped, kernel.request('GET', `/net/signin/${id}?wait=1`)]);
          if (s.status === 'done') return { signin: id, account: s.account };
          if (s.status === 'error') throw new KernelError(0, 'invalid', s.error ?? 'Accesso non riuscito');
        }
      } catch (err) {
        if (id) kernel.request('DELETE', `/net/signin/${id}`).catch(() => {});
        throw err;
      } finally {
        try { win.close(); } catch { /* closed already */ }
      }
    })();
  }

  async link(id, path) {
    return (await kernel.request('GET', `/net/mounts/${encodeURIComponent(id)}/link?path=${encodeURIComponent(path)}`)).url;
  }

  openWeb(getUrl) {
    const tab = window.open('about:blank', '_blank');
    return (async () => {
      try {
        const url = await getUrl();
        if (!/^https:\/\//.test(url)) throw new Error('Indirizzo non valido');
        if (!tab) { window.open(url, '_blank', 'noopener'); return; }
        tab.opener = null;
        tab.location.href = url;
      } catch (err) {
        try { tab?.close(); } catch { /* closed already */ }
        throw err;
      }
    })();
  }

  async putHome(id, fileId, folder = '/', ifExists = 'ask') {
    await kernel.flush('fs');   // the file must be in the kernel with what was just written
    return kernel.request('POST', `/net/mounts/${encodeURIComponent(id)}/put-home`, { home: fileId, folder, ifExists });
  }

  // ---------- Transfers ----------

  async transfer(ids, folderId) {
    const sources = ids.map(id => fs.netRef(id));
    const target = fs.netRef(folderId);
    await kernel.flush('fs');   // what was just made in the home must be in the kernel
    return kernel.request('POST', '/net/transfers', { sources, target, workspace: fs.workspace });
  }

  async loadTransfers() {
    if (!kernel.connected) return this.transfers;
    this.transfersChanged(await kernel.request('GET', '/net/transfers'));
    return this.transfers;
  }

  children(itemId) { return kernel.request('GET', `/net/transfers/items/${itemId}`); }
  cancel(what) { return kernel.request('POST', '/net/transfers/cancel', what); }
  resolve(id, action, all = false) { return kernel.request('POST', '/net/transfers/resolve', { id, action, all }); }
  retry(what) { return kernel.request('POST', '/net/transfers/retry', what); }
  dismiss(what) { return kernel.request('POST', '/net/transfers/dismiss', what); }
  pause(queue, paused) { return kernel.request('POST', '/net/transfers/pause', { queue, paused }); }

  // ---------- What the kernel streams (the system calls these) ----------

  mountChanged() { this.load().catch(() => {}); }

  transfersChanged(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.queues)) return;
    this.transfers = snapshot;
    this.emit('transfers', snapshot);
  }

  notified(data) { this.emit('notify', data); }
}

export const net = new Net();
