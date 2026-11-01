import { Emitter } from './events.js';
import { kernel } from './kernel.js';
import { locale } from './locale.js';
import { fs } from './fs.js';

/**
 * Network connections (the Rete folder: FTP, SFTP, WebDAV… each protocol a kernel module) and the
 * transfers to and from them, which the kernel does: they go on with the app that started them
 * closed, and with lilOS closed. Only connected to the kernel (available false otherwise).
 *
 *   net.available                     the kernel has at least one protocol
 *   net.protocols                     [{ id, label, order, fields, canListShares }]   fields: see the
 *                                     kernel's net/drivers.js ({ key, type, label, required, secret, when, … })
 *   net.mounts() → [mount]            mount: { id, name, protocol, address, values, auto, remembered,
 *   net.mount(id) → mount | null        trusted, state: 'off' | 'connecting' | 'on' | 'error', error }
 *   net.load()                        reads them again from the kernel
 *   net.create({ name, protocol, values, auto, remember, trust? }, secret) → mount
 *   net.update(id, { name?, values?, auto?, remember?, forget? }, secret?) → mount
 *   net.remove(id)
 *   net.connect(id, { secret?, remember?, trust? }) → mount      net.disconnect(id) → mount
 *   net.test({ protocol, values, trust? }, secret)               tries without saving
 *   net.shares({ protocol, values, trust? }, secret) → [name]    (protocols with canListShares)
 *   net.text(label) → string          a label of a protocol or field ({ en, it } or a text) in the system's language
 *   net.mountNode(id) → node id       the folder of a connection in fs
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

  async connect(id, { secret = null, remember, trust } = {}) {
    try {
      return this.#replace(await kernel.request('POST', `/net/mounts/${id}/connect`, { secret, remember, trust }));
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
