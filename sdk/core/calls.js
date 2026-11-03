import { Emitter } from './events.js';
import { kernel, KernelError } from './kernel.js';

/**
 * Network requests made by lilOS's kernel for the user (NetTest): HTTP and GraphQL with variables,
 * secrets, auth, scripts and checks; collection runs; live sessions (WebSocket, SSE, TCP, TLS, UDP,
 * and the protocols of kernel modules: gRPC, MQTT). No CORS: the kernel connects, where its network
 * rules let it (with sign-in, the admin decides about this machine and the local network). Only
 * connected to the kernel (available false otherwise). The kernel's calls/ says what each takes.
 *
 *   calls.available
 *   calls.info() → { protocols: [{ id, label, live, invoke, describe }], scripts, sessions, multiUser }
 *   calls.send({ request, chain, environment: { values, secrets }, collection: { values }, globals: { values } }, { signal })
 *       → { result, vars, secret, renewed }   secrets: { name: sealed } (seal()); they are opened only
 *         in the kernel, and written •••• in what comes back. renewed: { oldSealed: tokens } OAuth
 *         tokens the kernel renewed (keep the new ones)
 *   calls.run({ collection, only?, environment, globals, data?, iterations?, delayMs?, stopOnError? }) → { id, total }
 *   calls.progress(id, { after, wait }) → { results, next, done, summary, total }     calls.cancelRun(id)
 *   calls.seal(value) → sealed                 a secret for a .nettest file: only this user, on this lilOS, opens it
 *   calls.trust({ host, port, fingerprint })   the user confirmed a server's certificate (result.error.trust)
 *   calls.describe({ request, environment… }) → what the server offers (gRPC reflection)
 *   calls.token(settings) → tokens             OAuth 2.0 client credentials or password: { sealed, expires, scope, preview, refresh }
 *   calls.signIn(settings, { signal, askAddress }) → tokens   OAuth 2.0 authorization code + PKCE: the provider's
 *       page in a window (opened now: call it from a click), back to lilOS; with settings.redirectUri the
 *       window goes there instead and askAddress(error) asks the user for the address it ended at
 *   calls.sessions() → [session]   calls.openSession({ request, environment… }) → session   calls.closeSession(id)
 *   calls.attach(id) → MessagePort   the session's messages, JSON strings both ways (the kernel's calls/sessions.js);
 *       '{"t":"gone","code":…}' when the channel closes; port.detach() closes it (the session goes on)
 *
 * Events: 'sessions' (a session opened, changed or went), 'runs' ({ id }: a run ended), also from
 * other pages of the same user. The system tells it with changed(what, data).
 */
class Calls extends Emitter {
  get available() { return kernel.connected; }

  #need() {
    if (!kernel.connected) throw new KernelError(0, 'offline', 'Le richieste di rete le fa il kernel di lilOS, che non è collegato');
  }

  info() { this.#need(); return kernel.request('GET', '/calls'); }
  send(body, { signal } = {}) { this.#need(); return kernel.request('POST', '/calls/send', body, { signal }); }
  run(body) { this.#need(); return kernel.request('POST', '/calls/runs', body); }

  progress(id, { after = 0, wait = false } = {}) {
    if (!/^[a-f0-9]{16}$/.test(String(id))) throw new Error('Esecuzione non valida');
    return kernel.request('GET', `/calls/runs/${id}?after=${Math.max(0, Number(after) || 0)}${wait ? '&wait=1' : ''}`);
  }

  cancelRun(id) { return kernel.request('DELETE', `/calls/runs/${encodeURIComponent(id)}`); }
  async seal(value) { this.#need(); return (await kernel.request('POST', '/calls/seal', { value: String(value) })).sealed; }
  trust({ host, port, fingerprint }) { return kernel.request('POST', '/calls/trust', { host, port, fingerprint }); }
  describe(body) { this.#need(); return kernel.request('POST', '/calls/describe', body); }
  token(settings) { this.#need(); return kernel.request('POST', '/calls/oauth/token', { settings }); }

  signIn(settings, { signal, askAddress = null } = {}) {
    const manual = typeof settings?.redirectUri === 'string' && settings.redirectUri.trim() !== '';
    // Opened now, while the click still counts; it goes to the provider's page once the kernel gives it
    const win = window.open('about:blank', manual ? '_blank' : `lilos-oauth-${Date.now()}`, manual ? '' : 'popup,width=520,height=700');
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
        this.#need();
        const started = await Promise.race([stopped, kernel.request('POST', '/calls/oauth/signin', { settings })]);
        id = started.id;
        // The provider's page (any address a collection names) gets no handle on lilOS's own
        try { win.opener = null; } catch { /* closed */ }
        win.location.href = started.url;
        if (manual) {
          if (typeof askAddress !== 'function') throw new Error('askAddress mancante');
          for (let error = null; ;) {
            const address = await Promise.race([stopped, askAddress(error)]);
            if (!address) throw new KernelError(0, 'canceled', 'Accesso annullato');
            try {
              const s = await kernel.request('POST', `/calls/oauth/signin/${id}/paste`, { url: address });
              if (s.status === 'done') return s.tokens;
              if (s.status === 'error') throw new KernelError(0, 'failed', s.error ?? 'Accesso non riuscito');
            } catch (err) {
              if (err.code !== 'invalid') throw err;
              error = err.message;   // not the right address: asked again
            }
          }
        }
        for (;;) {
          const s = await Promise.race([stopped, kernel.request('GET', `/calls/oauth/signin/${id}?wait=1`)]);
          if (s.status === 'done') return s.tokens;
          if (s.status === 'error') throw new KernelError(0, 'failed', s.error ?? 'Accesso non riuscito');
        }
      } catch (err) {
        if (id) kernel.request('DELETE', `/calls/oauth/signin/${id}`).catch(() => {});
        throw err;
      } finally {
        if (!manual) try { win.close(); } catch { /* closed already */ }
      }
    })();
  }

  sessions() { this.#need(); return kernel.request('GET', '/calls/sessions'); }
  openSession(body) { this.#need(); return kernel.request('POST', '/calls/sessions', body); }
  closeSession(id) { return kernel.request('DELETE', `/calls/sessions/${encodeURIComponent(id)}`); }

  attach(id) {
    if (!/^[a-f0-9]{16}$/.test(String(id))) throw new Error('Sessione non valida');
    return kernel.channel(`/calls/sessions/${id}/socket`, { maxText: 16 << 20, maxBytes: 0 });
  }

  /** The kernel said something changed ('sessions' | 'runs'). */
  changed(what, data) {
    this.emit(what === 'runs' ? 'runs' : 'sessions', data ?? {});
  }
}

export const calls = new Calls();
