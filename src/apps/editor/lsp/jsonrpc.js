/**
 * Minimal JSON-RPC 2.0 connection, the wire format of the Language Server Protocol.
 * Transport-agnostic: give it a send(message) function and feed it with receive(message).
 * Used by the Editor (client side) and by the built-in servers in Web Workers.
 */
export class Connection {
  #nextId = 1;
  #pending = new Map();
  #requestHandlers = new Map();
  #notificationHandlers = new Map();

  constructor(send) {
    this.send = send;
  }

  request(method, params) {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.send({ jsonrpc: '2.0', id, method, params });
    });
  }

  notify(method, params) {
    this.send({ jsonrpc: '2.0', method, params });
  }

  onRequest(method, handler) { this.#requestHandlers.set(method, handler); }
  onNotification(method, handler) { this.#notificationHandlers.set(method, handler); }

  /** Rejects every pending request (the other side went away). */
  close(reason = 'Connessione chiusa') {
    for (const { reject } of this.#pending.values()) reject(new Error(reason));
    this.#pending.clear();
  }

  async receive(msg) {
    if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0') return;
    // Response to one of our requests
    if ('id' in msg && !('method' in msg)) {
      const pending = this.#pending.get(msg.id);
      if (!pending) return;
      this.#pending.delete(msg.id);
      if (msg.error) pending.reject(Object.assign(new Error(msg.error.message ?? 'Errore del server'), { code: msg.error.code }));
      else pending.resolve(msg.result ?? null);
      return;
    }
    // Request from the other side: answer it
    if ('id' in msg) {
      const handler = this.#requestHandlers.get(msg.method);
      if (!handler) return this.send({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `Metodo non gestito: ${msg.method}` } });
      try {
        this.send({ jsonrpc: '2.0', id: msg.id, result: (await handler(msg.params)) ?? null });
      } catch (err) {
        this.send({ jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: String(err?.message ?? err) } });
      }
      return;
    }
    this.#notificationHandlers.get(msg.method)?.(msg.params);
  }
}
