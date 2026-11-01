import { Emitter, kernel, notifications } from '@lilos/sdk';

/**
 * The services of installed apps (entry points of kind 'service'): they run in the kernel, also
 * with lilOS closed (see the kernel's apps/appServices.js). Here lilOS asks about them and gets
 * told when they change, through the kernel's event stream (/api/services-events): Control Panel → Avvio
 * shows them, and what a service says with lilos.ui.notify() becomes a notification.
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

const kernelListeners = [];

/**
 * Listens to an event of the kernel's stream (/api/services-events) while lilOS runs: fn(data) with
 * its JSON. The event '' is the stream opening again after the kernel restarted or the network
 * dropped (fn() with nothing): what was missed meanwhile must be read again. Call before connectServices().
 */
export function onKernelEvent(event, fn) {
  kernelListeners.push({ event, fn });
}

/**
 * Listens to the kernel while lilOS runs: changes for Control Panel, the notifications (new ones and
 * changes made in other pages), and what services say when the kernel keeps no notifications.
 */
export function connectServices() {
  if (!kernel.connected || typeof EventSource !== 'function') return;
  let source = null;
  let opened = 0;
  const open = () => {
    source = new EventSource('/api/services-events');
    source.addEventListener('change', e => {
      try { services.emit('change', JSON.parse(e.data)); } catch { /* not ours */ }
    });
    source.addEventListener('notify', e => {
      try {
        const { app, text } = JSON.parse(e.data);
        notifications.send({ app, text: String(text) }).catch(() => {});
      } catch { /* not ours */ }
    });
    source.addEventListener('notification.new', e => {
      try {
        notifications.received(JSON.parse(e.data).id);
      } catch { /* not ours */ }
    });
    source.addEventListener('notification.change', () => notifications.changed());
    for (const { event, fn } of kernelListeners) {
      if (!event) continue;
      source.addEventListener(event, e => {
        let data;
        try { data = JSON.parse(e.data); } catch { return; }
        try { fn(data); } catch (err) { console.error(`[lilos] evento del kernel ${event}:`, err); }
      });
    }
    // Back after the kernel restarted or the network dropped: what arrived meanwhile
    source.addEventListener('open', () => {
      if (!opened++) return;
      notifications.changed();
      for (const { event, fn } of kernelListeners) if (!event) fn();
    });
  };
  open();
  kernel.onLogout(() => source?.close());
}
