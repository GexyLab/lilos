import { Emitter } from './events.js';
import { fs } from './fs.js';
import { locale } from './locale.js';

const { t } = locale.define('lilos:sdk.host', {
  en: { strings: {
    needProgram: 'This needs the lilOS program (it does not work in the browser)',
    onlyFiles: 'Only files open on the computer',
    tooBig: 'The file is too large to open on the computer (more than 512 MB)',
    noFiles: 'No files to export',
  } },
});

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
 *   host.quit() (T)               the program quits: the lilOS it runs (kernel and database) stops with it
 *   host.badge(count)             the number on the program's icon (lilOS sets it)
 *   host.focus()                  brings the window in front
 *   host.web (T)                  web pages shown by the program over the page of lilOS, each in a
 *                                 process and a session of its own (NetWave Browser):
 *       host.web.available() → Promise<boolean>   the program has the engine and trusts this lilOS
 *       host.web.open({ private?, url?, keys? }) → Promise<WebPage>
 *           private: a key (6-32 a-z0-9) for a session in memory shared by the pages with the same
 *           key, wiped when the last closes; without it the pages share the signed-in user's session.
 *           keys: combos (as in shortcuts) that come back as 'key' events instead of reaching the page
 *       WebPage: navigate(url) back() forward() reload(hard?) stop() close() focus()
 *           place({ x, y, width, height } | null, scale?)   where to draw it, in CSS pixels of this
 *               page (getBoundingClientRect); scale: the zoom of the desk. null hides it
 *           cover() → data URL | null   a picture of it, then hides it (something of lilOS is above)
 *           zoom(factor) mute(on) edit('copy' | 'cut' | 'paste' | 'selectAll' | 'undo' | 'redo' | 'delete')
 *           setKeys([combo]) find(text, { forward, next }) stopFind() grants([{ origin, permission, allow }])
 *           permission(requestId, allow, remember?) auth(requestId, user | null, password)
 *           download.read(downloadId) → ArrayBuffer, download.done(id), download.cancel(id)
 *           events: 'title' 'favicon' 'loading' 'nav' 'error' 'blocked' 'open' 'focus' 'key' 'menu' 'hover'
 *           'audio' 'found' 'permission' 'auth' 'download' 'gone' 'unresponsive' (see lilos-desktop/development/src/web.js)
 *
 * Events (on): 'drives' [drive], 'settings' {…}, 'display' mode, 'saved' { id, name }, 'web' (WebPage's),
 * 'open' { path } (a lilos:// link), 'open-settings' (the program's menu), 'choose' (the system
 * answers it with devices.choose(id, deviceId | null)).
 */
const bridge = typeof window !== 'undefined' ? window.lilosHost ?? null : null;

/** A web page of host.web: its calls, and its events from the program. */
class WebPage extends Emitter {
  #api;
  #closed = false;
  constructor(api, id) {
    super();
    this.#api = api;
    this.id = id;
    this.download = {
      read: downloadId => api.downloadRead(downloadId),
      done: downloadId => api.downloadDone(downloadId),
      cancel: downloadId => api.downloadCancel(downloadId),
    };
  }
  get closed() { return this.#closed; }
  #call(name, ...args) { return this.#closed ? Promise.resolve(null) : this.#api[name](this.id, ...args); }
  navigate(url) { return this.#call('navigate', url); }
  back() { return this.#call('back'); }
  forward() { return this.#call('forward'); }
  reload(hard = false) { return this.#call('reload', !!hard); }
  stop() { return this.#call('stop'); }
  focus() { return this.#call('focus'); }
  place(rect, scale = 1) { return this.#call('place', rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null, scale); }
  cover() { return this.#call('cover'); }
  zoom(factor) { return this.#call('zoom', factor); }
  mute(on) { return this.#call('mute', !!on); }
  edit(command) { return this.#call('edit', command); }
  setKeys(keys) { return this.#call('keys', keys); }
  find(text, opts = {}) { return this.#call('find', text, opts); }
  stopFind() { return this.#call('stopFind'); }
  grants(list) { return this.#call('grants', list); }
  permission(requestId, allow, remember = false) { return this.#api.permission(requestId, !!allow, !!remember); }
  auth(requestId, user, password = '') { return this.#api.auth(requestId, user, password); }
  close() {
    if (this.#closed) return Promise.resolve();
    this.#closed = true;
    pages.delete(this.id);
    return this.#api.close(this.id).catch(() => {});
  }
}

/** Open WebPages by id: the program's 'web' events go to theirs. */
const pages = new Map();
let routing = false;
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
    if (!bridge) throw new Error(t('needProgram'));
    return bridge;
  }

  info() { return this.#need().info(); }
  badge(count) { return bridge?.badge(Math.max(0, Number(count) || 0)); }
  focus() { return bridge?.focus(); }
  quit() { return this.#need().quit(); }

  async openOnComputer(id) {
    const node = fs.get(id);
    if (!node || node.type !== 'file') throw new Error(t('onlyFiles'));
    if ((node.size ?? 0) > MAX_OPEN) throw new Error(t('tooBig'));
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
    if (!list.length) throw new Error(t('noFiles'));
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

  web = {
    available: async () => {
      if (!bridge?.web) return false;
      try {
        const [info, web] = await Promise.all([bridge.info(), bridge.web.info()]);
        return !!info.profile?.trusted && !!web?.available;
      } catch {
        return false;
      }
    },
    open: async (opts = {}) => {
      const api = this.#need().web;
      if (!api) throw new Error(t('needProgram'));
      if (!routing) {
        routing = true;
        bridge.on('web', e => pages.get(e?.id)?.emit(e.type, e));
      }
      const { id } = await api.create({ private: opts.private ?? undefined, url: opts.url ?? undefined, keys: opts.keys ?? [] });
      const page = new WebPage(api, id);
      pages.set(id, page);
      return page;
    },
  };
}

export const host = new Host();
