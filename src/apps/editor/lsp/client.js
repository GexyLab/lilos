import { Emitter } from '@lilos/sdk';
import { Connection } from './jsonrpc.js';

/**
 * Language Server Protocol client over a transport:
 *   workerTransport(worker)   built-in servers running in a Web Worker (postMessage)
 *   socketTransport(url)      external servers behind a WebSocket bridge (one JSON-RPC message per frame;
 *                             frames with "Content-Length" headers are accepted too)
 *
 * Status ('status' event): 'starting' → 'ready' | 'error' (with `error` set) | 'closed'.
 * Events: 'diagnostics' { uri, diagnostics }, 'log' message.
 */
export class LanguageClient extends Emitter {
  status = 'starting';
  error = null;
  capabilities = {};

  constructor(name, transport, { requests = {} } = {}) {
    super();
    this.name = name;
    this.transport = transport;
    this.conn = new Connection(msg => transport.send(msg));
    transport.onMessage(msg => this.conn.receive(msg));
    transport.onClose(reason => this.#fail(reason ?? 'Il server si è chiuso'));

    this.conn.onNotification('textDocument/publishDiagnostics', p => this.emit('diagnostics', p));
    this.conn.onNotification('window/logMessage', p => this.emit('log', p?.message));
    this.conn.onNotification('window/showMessage', p => this.emit('log', p?.message));
    // Requests servers commonly send; answer them politely
    this.conn.onRequest('workspace/configuration', p => (p?.items ?? []).map(() => null));
    this.conn.onRequest('client/registerCapability', () => null);
    this.conn.onRequest('window/workDoneProgress/create', () => null);
    for (const [method, handler] of Object.entries(requests)) this.conn.onRequest(method, handler);
  }

  async start() {
    try {
      await this.transport.ready;
      const result = await this.conn.request('initialize', {
        processId: null,
        clientInfo: { name: 'lilOS Editor' },
        rootUri: 'file:///lilos',
        workspaceFolders: [{ uri: 'file:///lilos', name: 'lilOS' }],
        capabilities: {
          textDocument: {
            synchronization: { dynamicRegistration: false },
            completion: { completionItem: { snippetSupport: true, documentationFormat: ['plaintext'] }, contextSupport: true },
            publishDiagnostics: { relatedInformation: false },
          },
          workspace: { configuration: true, workspaceFolders: true },
        },
      });
      this.capabilities = result?.capabilities ?? {};
      this.conn.notify('initialized', {});
      this.#setStatus('ready');
    } catch (err) {
      this.#fail(err?.message ?? String(err));
    }
    return this;
  }

  get ready() { return this.status === 'ready'; }

  open(uri, languageId, version, text) { this.conn.notify('textDocument/didOpen', { textDocument: { uri, languageId, version, text } }); }
  /** Full-text change: valid for servers with full or incremental sync. */
  change(uri, version, text) { this.conn.notify('textDocument/didChange', { textDocument: { uri, version }, contentChanges: [{ text }] }); }
  close(uri) { this.conn.notify('textDocument/didClose', { textDocument: { uri } }); }
  configure(settings) { this.conn.notify('workspace/didChangeConfiguration', { settings }); }

  /** Completion items at a position ({ line, character }), [] if the server has none. */
  async completion(uri, position, trigger) {
    if (!this.ready || !this.capabilities.completionProvider) return [];
    const context = trigger ? { triggerKind: 2, triggerCharacter: trigger } : { triggerKind: 1 };
    const result = await this.conn.request('textDocument/completion', { textDocument: { uri }, position, context });
    return Array.isArray(result) ? result : result?.items ?? [];
  }

  get triggerCharacters() {
    return this.capabilities.completionProvider?.triggerCharacters ?? [];
  }

  async stop() {
    if (this.status === 'closed') return;
    try {
      if (this.ready) {
        await Promise.race([this.conn.request('shutdown'), new Promise(r => setTimeout(r, 500))]);
        this.conn.notify('exit');
      }
    } catch { /* already gone */ }
    this.transport.close();
    this.conn.close();
    this.#setStatus('closed');
  }

  #fail(reason) {
    if (this.status === 'closed') return;
    this.error = reason;
    this.conn.close(reason);
    this.#setStatus('error');
  }

  #setStatus(status) {
    this.status = status;
    this.emit('status', status);
  }
}

export function workerTransport(worker) {
  const listeners = { message: null, close: null };
  worker.onmessage = e => listeners.message?.(e.data);
  worker.onerror = e => { e.preventDefault?.(); listeners.close?.(`Errore nel server: ${e.message ?? 'sconosciuto'}`); };
  return {
    ready: Promise.resolve(),
    send: msg => worker.postMessage(msg),
    onMessage: fn => { listeners.message = fn; },
    onClose: fn => { listeners.close = fn; },
    close: () => worker.terminate(),
  };
}

export function socketTransport(url) {
  const ws = new WebSocket(url);
  const queue = [];
  const listeners = { message: null, close: null };
  const ready = new Promise((resolve, reject) => {
    ws.onopen = () => { queue.splice(0).forEach(m => ws.send(m)); resolve(); };
    ws.onerror = () => reject(new Error(`Impossibile collegarsi a ${url}`));
  });
  ready.catch(() => {});
  ws.onmessage = e => {
    if (typeof e.data !== 'string') return;
    // Some bridges forward the stdio framing: skip the headers
    const body = e.data.startsWith('Content-Length') ? e.data.slice(e.data.indexOf('\r\n\r\n') + 4) : e.data;
    try { listeners.message?.(JSON.parse(body)); } catch { /* not JSON: ignored */ }
  };
  ws.onclose = e => listeners.close?.(`Connessione chiusa (${e.code})`);
  return {
    ready,
    send: msg => { const data = JSON.stringify(msg); if (ws.readyState === WebSocket.OPEN) ws.send(data); else queue.push(data); },
    onMessage: fn => { listeners.message = fn; },
    onClose: fn => { listeners.close = fn; },
    close: () => ws.close(),
  };
}
