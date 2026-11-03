import { Emitter } from './events.js';
import { fs } from './fs.js';

/**
 * The program lilOS (lilos-desktop): lilOS in its own window on Windows, macOS and Linux instead
 * of a browser, with the computer at hand. In a browser `native` is false and every call fails:
 * show the related commands only when it is true.
 *
 *   host.native                   true inside the program
 *   host.trusted                  true when the program trusts this lilOS (its own, or a server
 *                                 marked as trusted): only then the calls marked (T) work.
 *                                 False until the program has answered (a moment after the start)
 *   host.info() → { program, os, osVersion, arch, electron, chrome, node, runtime, lilos, profile, gpu }
 *       os: 'win32' | 'darwin' | 'linux'; profile: { id, name, kind: 'local' | 'remote', trusted,
 *       thisComputer } (thisComputer: the kernel runs on this computer, so its paths are the computer's)
 *   host.openOnComputer(id) (T)   opens a file of lilOS with the computer's program for its type;
 *                                 when that program saves, the content comes back to lilOS
 *                                 (event 'saved' { id, name }). Programs and scripts are refused
 *   host.exportToComputer(ids) → { saved: [path] } | null   the computer's save dialog (one file) or
 *                                 folder dialog (several); null: the user cancelled
 *   host.openPath(path) (T) / host.reveal(path) (T)   a file of the computer (only with a kernel on
 *                                 this computer): with its program / in the computer's file manager
 *   host.pickFolder() (T) → path | null   the computer's dialog to choose a folder
 *   host.devices.list() (T) → { serial, usb, hid, cameras, microphones, speakers, gpu, gpuFeatures,
 *                           printers, displays, drives }   what the computer has: the devices the
 *                           page may see (all of them unless the program's rule is 'ask')
 *   host.devices.eject(id) (T)    ejects a removable drive
 *   host.settings.get() / set(key, value) (T: set)   the program's settings on this computer: display
 *       ('window' | 'fullscreen' | 'kiosk'), monitor, kioskKeys, startAtLogin, stayInTray,
 *       notifications, updates ('auto' | 'notify' | 'off'), hardware ('ask' | 'declared' | 'all')
 *   host.displays() → [{ id, label, primary, width, height, scale }]
 *   host.servers.list() / add({ name, url, trusted }) / remove(id) / open(id) (T)
 *   host.local.status() / restart() / stop() / openInBrowser() (T)   the lilOS run by the program
 *   host.updates.check() → { status, version, error } / install()   updates of the program
 *   host.badge(count)             the number on the program's icon (lilOS sets it)
 *   host.focus()                  brings the window in front
 *
 * Events (on): 'drives' [drive], 'settings' {…}, 'display' mode, 'saved' { id, name },
 * 'open' { path } (a lilos:// link), 'open-settings' (the program's menu), 'choose' (the system
 * answers it with devices.choose(id, deviceId | null)).
 */
const bridge = typeof window !== 'undefined' ? window.lilosHost ?? null : null;
const MAX_OPEN = 512 << 20;
// Events of this page only (not of the program)
const LOCAL_EVENTS = new Set(['saved', 'save-failed']);

class Host extends Emitter {
  #opened = new Map();     // token → node id
  #trusted = false;
  #listening = new Set();

  constructor() {
    super();
    if (!bridge) return;
    bridge.on('file-changed', e => this.#saveBack(e));
    bridge.info().then(i => { this.#trusted = !!i.profile?.trusted; }, () => {});
  }

  get native() { return !!bridge; }
  get trusted() { return this.#trusted; }

  /** Events of the program reach this emitter from the first subscriber on. */
  on(type, fn) {
    if (bridge && !this.#listening.has(type) && !LOCAL_EVENTS.has(type)) {
      this.#listening.add(type);
      bridge.on(type, data => this.emit(type, data));
    }
    return super.on(type, fn);
  }

  #need() {
    if (!bridge) throw new Error('Serve il programma lilOS (non funziona nel browser)');
    return bridge;
  }

  info() { return this.#need().info(); }
  badge(count) { return bridge?.badge(Math.max(0, Number(count) || 0)); }
  focus() { return bridge?.focus(); }

  async openOnComputer(id) {
    const node = fs.get(id);
    if (!node || node.type !== 'file') throw new Error('Si aprono sul computer solo i file');
    if ((node.size ?? 0) > MAX_OPEN) throw new Error('Il file è troppo grande per aprirlo sul computer (più di 512 MB)');
    const blob = await fs.readBlob(id);
    const { token } = await this.#need().files.openOnComputer({ name: node.name, data: await blob.arrayBuffer() });
    this.#opened.set(token, id);
    return { token };
  }

  /** The computer's program saved a file opened with openOnComputer: the same content in lilOS. */
  async #saveBack({ token, name, data }) {
    const id = this.#opened.get(token);
    if (!id || !fs.exists(id)) return;
    try {
      await fs.write(id, new Blob([data]));
      this.emit('saved', { id, name });
    } catch (err) {
      this.emit('save-failed', { id, name, error: err.message });
    }
  }

  async exportToComputer(ids) {
    const list = (Array.isArray(ids) ? ids : [ids]).map(id => fs.get(id)).filter(n => n?.type === 'file');
    if (!list.length) throw new Error('Nessun file da esportare');
    const files = [];
    for (const node of list) files.push({ name: node.name, data: await (await fs.readBlob(node.id)).arrayBuffer() });
    return this.#need().files.exportToComputer(files);
  }

  openPath(path) { return this.#need().files.openPath(path); }
  reveal(path) { return this.#need().files.reveal(path); }
  pickFolder() { return this.#need().files.pickFolder(); }

  devices = {
    /** The program's part (GPU, printers, displays, drives) and the page's (Web Serial, WebUSB, WebHID, media). */
    list: async () => {
      const main = await this.#need().devices.list();
      const nav = typeof navigator !== 'undefined' ? navigator : {};
      const safe = async fn => { try { return await fn(); } catch { return []; } };
      const [serial, usb, hid, media] = await Promise.all([
        safe(() => nav.serial?.getPorts() ?? []),
        safe(() => nav.usb?.getDevices() ?? []),
        safe(() => nav.hid?.getDevices() ?? []),
        safe(() => nav.mediaDevices?.enumerateDevices() ?? []),
      ]);
      const ids = (v, p) => ({ vendorId: v ?? null, productId: p ?? null });
      return {
        ...main,
        serial: serial.map(p => ({ ...ids(p.getInfo?.().usbVendorId, p.getInfo?.().usbProductId) })),
        usb: usb.map(d => ({ name: d.productName || d.manufacturerName || null, manufacturer: d.manufacturerName || null, serialNumber: d.serialNumber || null, ...ids(d.vendorId, d.productId) })),
        hid: hid.map(d => ({ name: d.productName || null, ...ids(d.vendorId, d.productId) })),
        cameras: media.filter(m => m.kind === 'videoinput').map(m => ({ id: m.deviceId, name: m.label || null })),
        microphones: media.filter(m => m.kind === 'audioinput' && m.deviceId !== 'default' && m.deviceId !== 'communications').map(m => ({ id: m.deviceId, name: m.label || null })),
        speakers: media.filter(m => m.kind === 'audiooutput' && m.deviceId !== 'default' && m.deviceId !== 'communications').map(m => ({ id: m.deviceId, name: m.label || null })),
      };
    },
    eject: id => this.#need().devices.eject(id),
    choose: (id, deviceId) => this.#need().devices.choose(id, deviceId),
  };

  settings = {
    get: () => this.#need().settings.get(),
    set: (key, value) => this.#need().settings.set(key, value),
  };

  displays() { return this.#need().window.displays(); }

  servers = {
    list: () => this.#need().servers.list(),
    add: server => this.#need().servers.add(server),
    remove: id => this.#need().servers.remove(id),
    open: id => this.#need().servers.open(id),
  };

  local = {
    status: () => this.#need().local.status(),
    restart: () => this.#need().local.restart(),
    stop: () => this.#need().local.stop(),
    openInBrowser: () => this.#need().local.openInBrowser(),
  };

  updates = {
    check: () => this.#need().updates.check(),
    install: () => this.#need().updates.install(),
  };
}

export const host = new Host();
