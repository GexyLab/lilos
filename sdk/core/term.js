import { Emitter } from './events.js';
import { kernel } from './kernel.js';
import { locale } from './locale.js';

/**
 * Remote terminals (SSH, Telnet, rlogin, SUPDUP… each protocol a kernel module): the hosts the user
 * saved and the sessions open in the kernel. A session goes on with no window showing it and
 * closes after 10 minutes without one; a page that attaches again gets its screen back. Only
 * connected to the kernel (available false otherwise).
 *
 *   term.available                    the kernel has at least one protocol
 *   term.load() → { protocols, encodings, hosts, sessions }
 *       protocol { id, label, order, port, secure (null: it depends on the values), fields }
 *                fields as for the Rete protocols (net.js)
 *       host     { id, name, folder, protocol, address, values, settings, remembered, secure, available, used }
 *       settings { term ('xterm-256color'), encoding ('utf-8' | 'iso-8859-1' | 'iso-8859-15' | 'cp437'), backspace ('del' | 'bs') }
 *       session  { id, host, name, protocol, address, secure, state, reason, title, created, attached,
 *                  closesAt, info, signals }   state 'new' | 'connecting' | 'on' | 'closed'
 *   term.saveHost(id | null, { name, folder, protocol, values, settings, remember? , forget? }, secret?) → host
 *   term.removeHost(id)
 *   term.open({ host } | { protocol, values, settings? } | { mount, path? }) → session
 *       mount: SSH to the server of an SFTP connection of the Rete folder (path: a folder in it)
 *   term.close(id)                    closes the session
 *   term.attach(id, { cols, rows }) → MessagePort     the session's screen and keys:
 *       from the port   ArrayBuffer: bytes for the screen (UTF-8, xterm) · string: JSON, see below
 *       to the port     ArrayBuffer / typed array: what the user typed · string: JSON, see below
 *       JSON from the kernel: { t: 'state', session } · { t: 'trust', trust: { kind, fingerprint, text,
 *         host, changed?, previous? } } a server key to confirm · { t: 'taken' } another page took it ·
 *         { t: 'gone', code } the channel closed (lilOS adds this one)
 *       JSON to the kernel: { t: 'resize', cols, rows } · { t: 'trust', ok } · { t: 'signal', name } ·
 *         { t: 'detach' } lilOS closes the channel (the session goes on)
 *   term.text(label) → string          as net.text()
 *
 * Events: 'hosts' (the saved hosts changed), 'sessions' (a session started, changed or went),
 * also from other pages of the same user. The system tells it with changed(what).
 */
class Term extends Emitter {
  protocols = [];

  get available() { return kernel.connected && this.protocols.length > 0; }

  async load() {
    if (!kernel.connected) return { protocols: [], encodings: [], hosts: [], sessions: [] };
    const data = await kernel.request('GET', '/term');
    this.protocols = Array.isArray(data?.protocols) ? data.protocols : [];
    return data;
  }

  saveHost(id, config, secret = {}) {
    return id ? kernel.request('PUT', `/term/hosts/${id}`, { ...config, secret }) : kernel.request('POST', '/term/hosts', { ...config, secret });
  }

  removeHost(id) { return kernel.request('DELETE', `/term/hosts/${id}`); }
  open(spec) { return kernel.request('POST', '/term/sessions', spec); }
  close(id) { return kernel.request('DELETE', `/term/sessions/${id}`); }

  /** The channel of a session (see above): a WebSocket to the kernel behind a MessagePort. */
  attach(id, { cols, rows } = {}) {
    if (!/^[a-f0-9]{16}$/.test(String(id))) throw new Error('Sessione non valida');
    const query = new URLSearchParams();
    if (Number.isInteger(cols)) query.set('cols', String(cols));
    if (Number.isInteger(rows)) query.set('rows', String(rows));
    const url = new URL(`/api/term/sessions/${id}/socket?${query}`, location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';
    const { port1, port2 } = new MessageChannel();
    const waiting = [];
    socket.onopen = () => waiting.splice(0).forEach(m => socket.send(m));
    socket.onmessage = e => port1.postMessage(e.data);
    socket.onclose = e => {
      port1.postMessage(JSON.stringify({ t: 'gone', code: e.code }));
      port1.close();
    };
    port1.onmessage = e => {
      let data = e.data;
      if (typeof data === 'string') {
        if (data.length > 4096) return;
        try { if (JSON.parse(data)?.t === 'detach') return socket.close(1000); } catch { return; }
      } else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        if (data.byteLength > 64 << 10) return;
      } else return;
      if (socket.readyState === WebSocket.OPEN) socket.send(data);
      else if (socket.readyState === WebSocket.CONNECTING) waiting.push(data);
    };
    port2.detach = () => socket.close(1000);   // for lilOS: the window that held it closed
    return port2;
  }

  text(label) {
    if (typeof label === 'string') return label;
    if (!label || typeof label !== 'object') return '';
    const code = locale.code, lang = code.split('-')[0];
    return label[code] ?? label[lang] ?? label.en ?? Object.values(label)[0] ?? '';
  }

  /** The kernel said something changed ('hosts' | 'sessions'). */
  changed(what) {
    this.emit(what === 'hosts' ? 'hosts' : 'sessions');
  }
}

export const term = new Term();
