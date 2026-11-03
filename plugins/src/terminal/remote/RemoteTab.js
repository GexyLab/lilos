import * as sdk from '@lilos/sdk';   // `term`: missing in older lilOS, so not imported by name
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { FindBar } from '../../shared/FindBar.js';
import { trustPrompt } from '../../shared/trustPrompt.js';
import { recordDialog } from './dialogs.js';
import { isCommand } from '../keys.js';
import { t } from '../i18n.js';
import '@xterm/xterm/css/xterm.css';

const { h, icon } = sdk;

/**
 * A tab of a remote session (SSH, Telnet, rlogin, SUPDUP): a session of the kernel shown by an
 * xterm (see lilOS's SDK term.js). The session lives in the kernel: the tab attaches to it and
 * gets its screen back when it attaches again. Closing the tab closes the session; closing the
 * window leaves it running (the kernel closes it after 10 minutes without a window).
 *
 *   new RemoteTab(owner, session, spec)   owner: the window's tabs (window.js), changed when the
 *                                         tab moves to another window; spec: how to open it again
 *                                         (Riconnetti): { host } or { protocol, values }
 *   RemoteTab.restore(owner, state)       a tab saved with the window (state()), not attached yet:
 *                                         then attach() if the session is still there, lost() if not
 *   tab.el, tab.name, tab.title, tab.closed, tab.activity, tab.owner
 *   tab.attach(), tab.show(), tab.hide(), tab.focus(), tab.replace(session), tab.dispose()
 *   tab.receive(data) keys typed in another pane (input to all panes)
 */
const THEME = {
  background: '#15171b', foreground: '#d7dae0', cursor: '#d7dae0', cursorAccent: '#15171b', selectionBackground: 'rgba(110,168,255,.35)',
  black: '#1f2228', red: '#ff6b6b', green: '#5fd38d', yellow: '#e8c35a', blue: '#6ea8ff', magenta: '#c792ea', cyan: '#59c7d6', white: '#d7dae0',
  brightBlack: '#7d8490', brightRed: '#ff8a8a', brightGreen: '#7fe3a6', brightYellow: '#f2d57e', brightBlue: '#94c0ff', brightMagenta: '#dbaef5', brightCyan: '#7fdbe6', brightWhite: '#ffffff',
};
const FONT = 'ui-monospace, "Cascadia Mono", "JetBrains Mono", Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace';
const RECORD_MAX = 8 << 20;     // a recording stops at 8 MB
/** The matches of the find bar, on the dark screen and in its scroll bar. */
const MATCHES = { matchOverviewRuler: '#e8c35a', activeMatchColorOverviewRuler: '#ff6b6b', matchBackground: '#5a4a1a', activeMatchBackground: '#2f6fde' };
const SEND = new TextEncoder();

/** What the user may send that the browser keeps for itself, for the Tasti menu: label → bytes. */
const KEYS = [
  ['Ctrl+W', '\x17'], ['Ctrl+T', '\x14'], ['Ctrl+N', '\x0e'], ['Ctrl+Q', '\x11'], ['Ctrl+Tab', '\x1b[27;5;9~'],
  ['Ctrl+Alt+Canc', '\x1b[3;7~'], ['F11', '\x1b[23~'], ['F12', '\x1b[24~'], ['Esc', '\x1b'],
];

const strip = text => text.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()][0-9A-Za-z]|\x1b[=>78DEHM]|[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
const copy = text => { if (text) navigator.clipboard?.writeText(text).catch(() => {}); };

/** 'ssh' → 'SSH': the badge of a protocol. */
export const badge = protocol => h('span', { class: `tm-proto tm-p-${/^[a-z0-9-]+$/.test(protocol) ? protocol : 'x'}` },
  ({ ssh: 'SSH', telnet: 'TELNET', rlogin: 'RLOGIN', supdup: 'SUPDUP' })[protocol] ?? String(protocol).toUpperCase().slice(0, 8));

export class RemoteTab {
  remote = true;
  #owner;
  #port = null;
  #term;
  #fit;
  #search;
  #screen;
  #status;
  #overlay = null;
  #find = null;       // the find bar (FindBar), made the first time it opens
  #abort = new AbortController();
  #record = null;     // { path, colors, chunks: [], size, timer, saving }
  #observer;
  #decoder = new TextDecoder();
  #trusting = null;   // the message box asking for a server key

  constructor(owner, session, spec) {
    this.#owner = owner;
    this.session = session;
    this.spec = spec;
    this.activity = false;
    this.#term = new Terminal({
      fontFamily: FONT, fontSize: 13, lineHeight: 1.1, scrollback: 10_000, theme: THEME, allowProposedApi: true,
      cursorBlink: true, macOptionIsMeta: true, rightClickSelectsWord: false,
    });
    this.#fit = new FitAddon();
    this.#search = new SearchAddon();
    this.#term.loadAddon(this.#fit);
    this.#term.loadAddon(this.#search);
    this.#term.loadAddon(new Unicode11Addon());
    this.#term.unicode.activeVersion = '11';
    this.#screen = h('div', { class: 'tm-xscreen', 'aria-label': t('remote.screen') });
    this.#status = h('div', { class: 'tm-status' });
    this.el = h('div', { class: 'tm-pane tm-remote', role: 'tabpanel' }, this.#screen, this.#status);
    // lilOS's own shortcuts must not get the keys of the terminal (Delete, Ctrl+A…), Terminal's do
    this.el.addEventListener('keydown', e => { if (!isCommand(e)) e.stopPropagation(); });
    this.#term.open(this.#screen);
    this.#term.attachCustomKeyEventHandler(e => this.#key(e));
    this.#term.onData(data => { this.#send(SEND.encode(data)); this.#owner.typed?.(this, data); });
    this.#term.onBinary(data => { this.#send(Uint8Array.from(data, c => c.charCodeAt(0) & 255)); this.#owner.typed?.(this, data); });
    this.#term.onResize(({ cols, rows }) => { this.#control({ t: 'resize', cols, rows }); this.#drawStatus(); });
    this.#term.onTitleChange(() => owner.tabChanged(this));
    this.#term.onSelectionChange(() => copy(this.#term.getSelection()));   // selecting copies, as in many terminals
    this.#observer = new ResizeObserver(() => { if (!this.el.hidden) this.#refit(); });
    this.#observer.observe(this.#screen);
    this.#drawStatus();
  }

  static restore(owner, s) {
    const str = v => (typeof v === 'string' ? v.slice(0, 200) : '');
    const session = { id: s.session, name: str(s.name) || str(s.address), protocol: str(s.protocol) || 'ssh', address: str(s.address), secure: s.secure === true, state: 'new', info: null };
    const spec = s.spec && typeof s.spec === 'object' ? s.spec : null;
    return new RemoteTab(owner, session, spec);
  }

  get owner() { return this.#owner; }
  set owner(owner) { this.#owner = owner; }

  get name() { return this.session.name; }
  get title() { return this.#term.title || this.session.title || ''; }
  get closed() { return this.session.state === 'closed'; }
  get subtitle() { return this.session.address; }

  #refit() {
    try { this.#fit.fit(); } catch { /* not laid out yet */ }
  }

  show() {
    this.el.hidden = false;
    this.activity = false;
    requestAnimationFrame(() => { this.#refit(); this.#term.focus(); });
  }

  hide() { this.el.hidden = true; }
  focus() { this.#term.focus(); }
  reflow() { if (!this.el.hidden) requestAnimationFrame(() => this.#refit()); }

  /** For the window's saved state: the session (attached again if still there) and how to open it again. */
  state() {
    const s = this.session;
    return { kind: 'remote', session: s.id, spec: this.spec, name: s.name, protocol: s.protocol, address: s.address, secure: !!s.secure };
  }

  /** Keys typed in another pane. */
  receive(data) { this.#send(SEND.encode(String(data))); }

  /** Its session is not in the kernel any more (a window coming back after it closed). */
  lost() {
    this.session = { ...this.session, state: 'closed' };
    this.#drawStatus();
    this.#showClosed();
    this.#owner.tabChanged(this);
  }

  // ---------- The channel with the kernel ----------

  async attach() {
    this.#detach();
    this.#hideOverlay();
    this.#refit();
    const port = sdk.term.attach(this.session.id, { cols: this.#term.cols, rows: this.#term.rows });
    this.#port = port;
    this.#term.reset();   // the kernel sends the screen again
    port.onmessage = e => (this.#port === port ? this.#receive(e.data) : null);
  }

  #detach() {
    const port = this.#port;
    this.#port = null;
    if (!port) return;
    try { port.postMessage(JSON.stringify({ t: 'detach' })); } catch { /* gone */ }
    port.close();
  }

  #send(bytes) {
    if (!this.#port || this.closed) return;
    this.#port.postMessage(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  }

  #control(msg) {
    this.#port?.postMessage(JSON.stringify(msg));
  }

  #receive(data) {
    if (typeof data !== 'string') {
      const bytes = new Uint8Array(data);
      this.#term.write(bytes);
      this.#recordData(bytes);
      if (this.el.hidden && !this.activity) { this.activity = true; this.#owner.tabChanged(this); }
      return;
    }
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    if (msg.t === 'state' && msg.session) {
      this.session = msg.session;
      this.#drawStatus();
      if (this.closed) this.#showClosed();
      this.#owner.tabChanged(this);
    } else if (msg.t === 'trust' && msg.trust) {
      this.#confirm(msg.trust);
    } else if (msg.t === 'taken') {
      this.#port = null;
      this.#showOverlay(t('remote.taken'), [[t('remote.takeBack'), () => this.attach().catch(err => this.#owner.error(err)), true]]);
    } else if (msg.t === 'gone' && this.#port) {
      // The channel closed by itself (lilOS lost the kernel for a moment): attach again if the session is there
      this.#port = null;
      if (!this.closed) this.#showOverlay(t('remote.lostLink'), [[t('remote.attachAgain'), () => this.attach().catch(err => this.#owner.error(err)), true]]);
    }
  }

  /** A server key to confirm: the first time, or (a strong warning) changed since. */
  async #confirm(trust) {
    this.#trusting?.close();
    this.#trusting = trustPrompt(this.#owner.win, trust, { t });
    const ok = await this.#trusting;
    this.#trusting = null;
    this.#control({ t: 'trust', ok });
    this.#term.focus();
  }

  // ---------- Keys ----------

  #key(e) {
    if (isCommand(e)) return false;   // Terminal's shortcut: not for the server
    if (e.type !== 'keydown') return true;
    const k = e.key.toLowerCase();
    if (e.ctrlKey && e.shiftKey && !e.altKey) {
      if (k === 'c') { copy(this.#term.getSelection()); e.preventDefault(); return false; }
      if (k === 'v') return false;   // the browser pastes (the paste event reaches the terminal)
      if (k === 'f') { e.preventDefault(); this.openFind(); return false; }
    }
    return true;
  }

  // ---------- Status bar ----------

  #drawStatus() {
    const s = this.session;
    const lock = s.secure
      ? h('span', { class: 'tm-safe' }, icon('lock'), t('remote.secure'))
      : h('span', { class: 'tm-unsafe', title: t('remote.insecureHint') }, icon('lockOpen'), t('remote.insecure'));
    const sep = () => h('span', { class: 'tm-sep' }, '|');
    const parts = [lock, h('code', { title: s.address }, s.address)];
    if (s.info?.key) parts.push(sep(), h('span', { title: s.info.cipher ? t('remote.cipher', { cipher: s.info.cipher }) : '' }, s.info.key.replace(/^(\S+ SHA256:.{6}).*(.{3})$/, '$1…$2')));
    if (s.info?.tls) parts.push(sep(), h('span', {}, s.info.tls));
    parts.push(sep(), h('span', {}, s.state === 'on' ? `${this.#term.cols} × ${this.#term.rows}` : t(`remote.state.${s.state}`)));
    const recording = !!this.#record;
    this.#status.replaceChildren(
      ...parts,
      h('span', { class: 'tm-sp' }),
      h('button', { type: 'button', class: 'tm-iconbtn', title: t('remote.find'), 'aria-label': t('remote.find'), onclick: () => this.openFind() }, icon('search')),
      h('button', { type: 'button', class: 'tm-iconbtn', title: t(recording ? 'remote.recordStop' : 'remote.record'), 'aria-label': t(recording ? 'remote.recordStop' : 'remote.record'), 'aria-pressed': recording ? 'true' : 'false', onclick: () => this.#toggleRecord() }, icon(recording ? 'pause' : 'save')),
      h('button', { type: 'button', class: 'ctl-btn', 'aria-haspopup': 'menu', onclick: e => this.#keysMenu(e.currentTarget) }, icon('keyboard'), t('remote.keys')),
    );
  }

  #keysMenu(anchor) {
    const s = this.session;
    const r = anchor.getBoundingClientRect();
    const items = [
      { label: t('remote.keys.send'), disabled: true, action: () => {} },
      ...KEYS.map(([label, seq]) => ({ label, action: () => { this.#send(SEND.encode(seq)); this.#term.focus(); } })),
      ...((s.signals ?? []).length ? ['-', ...s.signals.map(name => ({ label: t(`remote.signal.${name}`), action: () => this.#control({ t: 'signal', name }) }))] : []),
      '-',
      { label: t('remote.keys.copy'), shortcut: 'Ctrl+Maiusc+C', action: () => copy(this.#term.getSelection()) },
      { label: t('remote.keys.paste'), disabled: true, action: () => {} },
      { label: t('remote.keys.clear'), action: () => this.#term.clear() },
      this.closed ? { label: t('remote.reconnect'), action: () => this.#owner.reconnect(this) } : { label: t('remote.keys.disconnect'), action: () => this.#owner.closeSession(this) },
    ];
    sdk.openMenu(r.left, r.top, items, { placement: 'above' });
  }

  // ---------- Find ----------

  /** The find bar over the screen (Ctrl+Shift+F): the text of the screen and of what scrolled away. */
  openFind() {
    if (!this.#find) {
      const bar = this.#find = new FindBar({ t, signal: this.#abort.signal, replace: false, floating: true, className: 'tm-findbar' });
      const go = back => {
        const q = bar.query;
        if (!q.find) { this.#search.clearDecorations(); return bar.results(); }
        const options = { caseSensitive: q.matchCase, wholeWord: q.wholeWord, regex: q.regex, decorations: MATCHES };
        try {
          if (back) this.#search.findPrevious(q.find, options); else this.#search.findNext(q.find, options);
        } catch (err) {
          this.#search.clearDecorations();
          bar.results({ error: err.message });
        }
      };
      this.#search.onDidChangeResults(r => bar.results({ total: r.resultCount, index: r.resultIndex }));
      // A new query, or an option changed: the addon counts again only for a term it has not cached
      bar.on('query', () => { this.#search.clearDecorations(); go(false); });
      bar.on('next', () => go(false));
      bar.on('previous', () => go(true));
      bar.on('close', () => { this.#search.clearDecorations(); bar.close(); this.#term.focus(); });
      this.#screen.append(bar.el);
    }
    this.#find.open();
  }

  // ---------- Overlays ----------

  #showOverlay(text, actions) {
    this.#hideOverlay();
    this.#overlay = h('div', { class: 'tm-overlay', role: 'status' }, icon('warning'), h('span', {}, text),
      ...actions.map(([label, run, primary]) => h('button', { type: 'button', class: `ctl-btn${primary ? ' primary' : ''}`, onclick: run }, label)));
    this.#screen.append(this.#overlay);
  }

  #hideOverlay() {
    this.#overlay?.remove();
    this.#overlay = null;
  }

  #showClosed() {
    this.#stopRecord();
    this.#trusting?.close();
    this.#showOverlay(this.session.reason ? t('remote.closedWhy', { reason: this.session.reason }) : t('remote.closed'), [
      [t('remote.closeTab'), () => this.#owner.closeTab(this)],
      ...(this.spec ? [[t('remote.reconnect'), () => this.#owner.reconnect(this), true]] : []),
    ]);
  }

  /** The same tab, on a new session (Riconnetti). */
  async replace(session) {
    this.session = session;
    this.#term.reset();
    this.#drawStatus();
    await this.attach();
  }

  // ---------- Recording ----------

  async #toggleRecord() {
    if (this.#record) return this.#stopRecord();
    const choice = await recordDialog(this.#owner, this.name);
    if (!choice) return this.#term.focus();
    this.#record = { ...choice, chunks: [], size: 0, timer: setInterval(() => this.#saveRecord(), 2000), saving: false };
    this.#drawStatus();
    await this.#saveRecord();
    this.#term.focus();
  }

  #recordData(bytes) {
    const r = this.#record;
    if (!r) return;
    const text = this.#decoder.decode(bytes, { stream: true });
    const piece = r.colors ? text : strip(text.replace(/\r\n/g, '\n').replace(/\r(?!\n)/g, ''));
    r.chunks.push(piece);
    r.size += piece.length;
    if (r.size > RECORD_MAX) {
      sdk.notifications?.send?.({ text: t('remote.record.full', { path: r.path }), level: 'warning' });
      this.#stopRecord();
    }
  }

  async #saveRecord() {
    const r = this.#record;
    if (!r || r.saving) return;
    r.saving = true;
    try {
      const text = r.chunks.join('');
      const node = r.node && sdk.fs.get(r.node);
      if (node) await sdk.fs.write(node.id, text);
      else {
        r.node = sdk.fs.create(r.folder, { type: 'file', name: r.name }).id;
        await sdk.fs.write(r.node, text);
      }
    } catch (err) {
      this.#owner.error(t('remote.record.failed', { error: err.message }));
      clearInterval(r.timer);
      this.#record = null;
      this.#drawStatus();
    }
    r.saving = false;
  }

  #stopRecord() {
    const r = this.#record;
    if (!r) return;
    clearInterval(r.timer);
    r.saving = false;
    this.#saveRecord().then(() => sdk.notifications?.send?.({ text: t('remote.record.saved', { path: r.path }), level: 'success' }));
    this.#record = null;
    this.#drawStatus();
  }

  /** The window goes: the session stays in the kernel. */
  dispose() {
    this.#stopRecord();
    this.#trusting?.close();
    this.#abort.abort();
    this.#detach();
    this.#observer.disconnect();
    this.#term.dispose();
  }
}
