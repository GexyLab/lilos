import { Emitter, kernel, toast } from '@lilos/sdk';

/**
 * The services of installed apps (entry points of kind 'service'): they run in the kernel, also
 * with lilOS closed (see the kernel's apps/appServices.js). Here lilOS asks about them and gets
 * told when they change, through the kernel's event stream (/api/services-events): Sistema → Avvio
 * shows them, and what a service says with lilos.ui.notify() becomes a message.
 *
 *   list() → { available, enabled, admin, services: [{ app, entry, label, name, glyph, color, params,
 *              startup: 'none' | 'login' | 'system', values, system, canControl,
 *              status: 'off' | 'starting' | 'on' | 'error', since, error }] }
 *   start / stop / restart(app, entry)
 *   setStartup(app, entry, when, params?)   when: 'none' | 'login' | 'system' (admins)
 *   setEnabled(on)                          the user's services start when they come in
 *   log(app, entry) → [{ at, level, text }]
 *   call(app, entry, data, from?)           what its lilos.handle() returns
 *
 * Events: 'change' { app, entry } — a service changed (state or choices).
 */
const path = (app, entry) => `/services/${encodeURIComponent(app)}/${encodeURIComponent(entry)}`;

class Services extends Emitter {
  list() {
    return kernel.request('GET', '/services');
  }

  async #control(app, entry, action) {
    const out = await kernel.request('POST', `${path(app, entry)}/${action}`, {});
    this.emit('change', { app, entry });
    return out;
  }

  start(app, entry) { return this.#control(app, entry, 'start'); }
  stop(app, entry) { return this.#control(app, entry, 'stop'); }
  restart(app, entry) { return this.#control(app, entry, 'restart'); }

  async setStartup(app, entry, when, params) {
    const out = await kernel.request('PUT', `${path(app, entry)}/startup`, { when, ...(params !== undefined && { params }) });
    this.emit('change', { app, entry });
    return out;
  }

  async setEnabled(enabled) {
    const out = await kernel.request('PUT', '/services-options', { enabled });
    this.emit('change', {});
    return out;
  }

  async log(app, entry) {
    return (await kernel.request('GET', `${path(app, entry)}/log`)).lines;
  }

  async call(app, entry, data = null, from = null) {
    return (await kernel.request('POST', `${path(app, entry)}/call`, { data, from })).result;
  }
}

export const services = new Services();

/** Listens to the kernel while lilOS runs: changes for Sistema, messages of the services as toasts. */
export function connectServices() {
  if (!kernel.connected || typeof EventSource !== 'function') return;
  let source = null;
  const open = () => {
    source = new EventSource('/api/services-events');
    source.addEventListener('change', e => {
      try { services.emit('change', JSON.parse(e.data)); } catch { /* not ours */ }
    });
    source.addEventListener('notify', e => {
      try {
        const { app, text } = JSON.parse(e.data);
        toast(`${app}: ${String(text).slice(0, 200)}`, { timeout: 6000 });
      } catch { /* not ours */ }
    });
  };
  open();
  kernel.onLogout(() => source?.close());
}
