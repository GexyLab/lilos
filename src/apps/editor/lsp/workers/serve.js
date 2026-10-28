import { TextDocument } from 'vscode-languageserver-textdocument';
import { Connection } from '../jsonrpc.js';

/**
 * A minimal Language Server running in a Web Worker, around one of VS Code's language services.
 * Speaks LSP over postMessage: initialize, document sync (full or incremental), completion,
 * diagnostics (validated a moment after each change), configuration, shutdown.
 *
 *   serve({ capabilities, complete(doc, position), validate?(doc), configure?(settings) })
 */
export function serve({ capabilities = {}, complete, validate, configure }) {
  const conn = new Connection(msg => postMessage(msg));
  self.onmessage = e => conn.receive(e.data);
  const docs = new Map();
  const timers = new Map();

  const publish = uri => {
    clearTimeout(timers.get(uri));
    if (!validate) return;
    timers.set(uri, setTimeout(async () => {
      const doc = docs.get(uri);
      if (!doc) return;
      try {
        const diagnostics = await validate(doc);
        if (docs.get(uri) === doc) conn.notify('textDocument/publishDiagnostics', { uri, version: doc.version, diagnostics });
      } catch (err) {
        conn.notify('window/logMessage', { type: 1, message: `Validazione non riuscita: ${err?.message ?? err}` });
      }
    }, 250));
  };

  conn.onRequest('initialize', () => ({ capabilities: { textDocumentSync: 2, ...capabilities } }));
  conn.onNotification('initialized', () => {});
  conn.onNotification('textDocument/didOpen', ({ textDocument: t }) => {
    docs.set(t.uri, TextDocument.create(t.uri, t.languageId, t.version, t.text));
    publish(t.uri);
  });
  conn.onNotification('textDocument/didChange', ({ textDocument: t, contentChanges }) => {
    const doc = docs.get(t.uri);
    if (!doc) return;
    docs.set(t.uri, TextDocument.update(doc, contentChanges, t.version));
    publish(t.uri);
  });
  conn.onNotification('textDocument/didClose', ({ textDocument: t }) => {
    docs.delete(t.uri);
    clearTimeout(timers.get(t.uri));
    conn.notify('textDocument/publishDiagnostics', { uri: t.uri, diagnostics: [] });
  });
  conn.onRequest('textDocument/completion', async ({ textDocument, position }) => {
    const doc = docs.get(textDocument.uri);
    return doc ? (await complete(doc, position)) ?? null : null;
  });
  conn.onNotification('workspace/didChangeConfiguration', async ({ settings }) => {
    await configure?.(settings);
    for (const uri of docs.keys()) publish(uri);
  });
  conn.onRequest('shutdown', () => null);
  conn.onNotification('exit', () => self.close());
  return conn;
}
