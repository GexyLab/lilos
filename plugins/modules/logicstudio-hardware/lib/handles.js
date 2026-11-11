import { randomBytes } from 'node:crypto';
import { oops } from './common.js';
import { isAdmin } from './policy.js';

/**
 * The devices the programs keep open (a serial port, a camera stream, a recording, a watch on the
 * USB bus…): handles owned by (user, program). There is no push from the kernel to a program's
 * worker, so what a device sends waits in the handle's queue and the block asks for it with a long
 * poll (hw.read): the call comes back as soon as something is there, or after waitMs.
 *
 * - A handle is only for the program that opened it (same user and same program id): another one
 *   gets «not valid» (it cannot even tell that it exists).
 * - A resource (a port, a camera…) is used by one handle at a time: the second gets an error that
 *   names the program holding it only to its own user or to an administrator.
 * - Bounded queue: past `maxItems` items or `maxBytes` the oldest go, counted in `dropped`.
 * - Closed when the block stops (hw.close), when the program ends (its abort signal), by the sweep
 *   (a signal already aborted: belt and braces), when the module stops.
 * - At most `maxPerUser` open per user.
 */

const ID = /^[A-Za-z0-9_-]{8,40}$/;
export const MAX_WAIT_MS = 20_000;
const MAX_TAKE = 200;

export class Handles {
  #map = new Map();        // id → handle
  #busy = new Map();       // resource → handle
  #maxPerUser;
  #log;

  constructor({ maxPerUser = 16, log = null } = {}) {
    this.#maxPerUser = maxPerUser;
    this.#log = log;
  }

  get size() { return this.#map.size; }

  /** The handle that holds `resource`, or null. */
  holder(resource) { return this.#busy.get(resource) ?? null; }

  /** Throws when `resource` is held by another handle. */
  checkFree(user, resource, label) {
    const h = this.#busy.get(resource);
    if (!h || h.closed) return;
    if (h.owner === user.id) throw oops(`«${label}» è già in uso nel programma «${h.programName}»: chiudilo prima di aprirlo di nuovo`);
    if (isAdmin(user)) throw oops(`«${label}» è già in uso nel programma «${h.programName}» dell'utente ${h.ownerName}`);
    throw oops(`«${label}» è già in uso da un altro programma`);
  }

  /**
   * A new handle. spec: { cls, kind, resource?, label, maxItems?, maxBytes?, close: async () => {} }.
   * The caller opens the device after this (so a busy resource is refused before touching it) and
   * calls drop(h) if opening fails.
   */
  create(user, tools, spec) {
    const signal = tools?.signal ?? null;
    const programId = String(tools?.program?.id ?? '');
    if (!programId) throw oops('Serve un programma in esecuzione');
    if (signal?.aborted) throw oops('Il programma non è in esecuzione');
    const mine = [...this.#map.values()].filter(h => h.owner === user.id && !h.closed).length;
    if (mine >= this.#maxPerUser) throw oops(`Hai già ${mine} dispositivi aperti: al massimo ${this.#maxPerUser} (chiudine qualcuno)`);
    if (spec.resource) this.checkFree(user, spec.resource, spec.label ?? spec.resource);
    const h = {
      id: randomBytes(12).toString('base64url'), owner: user.id, ownerName: user.username ?? user.id,
      program: programId, programName: String(tools?.program?.name ?? programId).slice(0, 80), signal,
      cls: spec.cls, kind: spec.kind, resource: spec.resource ?? null, label: spec.label ?? spec.kind,
      queue: [], bytes: 0, dropped: 0, maxItems: spec.maxItems ?? 1000, maxBytes: spec.maxBytes ?? (1 << 20),
      waiter: null, closed: false, reason: null, closeFn: spec.close ?? null, data: {}, opened: Date.now(),
    };
    this.#map.set(h.id, h);
    if (h.resource) this.#busy.set(h.resource, h);
    if (signal) {
      h.onAbort = () => { this.close(h.id, 'Il programma si è fermato').catch(() => {}); };
      signal.addEventListener('abort', h.onAbort, { once: true });
    }
    return h;
  }

  /** The handle `id` of this program, of the kind wanted; else the error the program sees. */
  get(user, tools, id, kinds = null) {
    const h = typeof id === 'string' && ID.test(id) ? this.#map.get(id) : null;
    const programId = String(tools?.program?.id ?? '');
    if (!h || h.owner !== user.id || h.program !== programId || (kinds && !kinds.includes(h.kind))) {
      throw oops('Il dispositivo non è aperto (o è già stato chiuso)');
    }
    return h;
  }

  /** Something for the program: queued (the oldest go past the limits), the waiting read wakes. */
  push(h, item, size = 64) {
    if (h.closed) return;
    h.queue.push({ item, size });
    h.bytes += size;
    while (h.queue.length > h.maxItems || (h.bytes > h.maxBytes && h.queue.length > 1)) {
      const old = h.queue.shift();
      h.bytes -= old.size;
      h.dropped++;
    }
    this.#wake(h);
  }

  #wake(h) {
    const w = h.waiter;
    if (w) { h.waiter = null; w(); }
  }

  /**
   * What is queued: { items, dropped, closed, reason }. Waits up to waitMs for something when the
   * queue is empty (a long poll), less if the program stops. One read at a time per handle: a new
   * one ends the one waiting (it gets nothing).
   */
  async take(h, waitMs = 0, signal = null, max = MAX_TAKE) {
    const wait = Math.max(0, Math.min(MAX_WAIT_MS, Number(waitMs) || 0));
    if (!h.queue.length && !h.closed && wait > 0 && !signal?.aborted) {
      this.#wake(h);
      await new Promise(resolve => {
        const done = () => { clearTimeout(t); signal?.removeEventListener?.('abort', done); if (h.waiter === done) h.waiter = null; resolve(); };
        const t = setTimeout(done, wait);
        h.waiter = done;
        signal?.addEventListener?.('abort', done, { once: true });
      });
    }
    const batch = h.queue.splice(0, max);
    for (const q of batch) h.bytes -= q.size;
    const dropped = h.dropped;
    h.dropped = 0;
    return { items: batch.map(q => q.item), dropped, closed: h.closed && !h.queue.length, reason: h.closed && !h.queue.length ? h.reason : null };
  }

  /**
   * Closes a handle: the device is released (its close function), the resource is free, a waiting
   * read gets closed: true. Still readable until then by the program that owns it (the last items).
   */
  async close(id, reason = null) {
    const h = this.#map.get(id);
    if (!h || h.closed) return false;
    h.closed = true;
    h.reason = reason;
    if (h.resource && this.#busy.get(h.resource) === h) this.#busy.delete(h.resource);
    if (h.signal && h.onAbort) h.signal.removeEventListener('abort', h.onAbort);
    // Kept for a while so the program reads what was left and that it was closed
    setTimeout(() => { if (this.#map.get(id) === h) this.#map.delete(id); }, h.signal?.aborted ? 0 : 30_000).unref?.();
    this.#wake(h);
    if (h.closeFn) {
      try { await Promise.race([Promise.resolve().then(h.closeFn), new Promise(r => setTimeout(r, 5000).unref?.())]); } catch (err) { this.#log?.warn?.(`Hardware: chiusura di ${h.label}: ${err?.message ?? err}`); }
    }
    return true;
  }

  /** Forgets a handle whose device could not be opened (nothing to release). */
  drop(h) {
    h.closed = true;
    if (h.resource && this.#busy.get(h.resource) === h) this.#busy.delete(h.resource);
    if (h.signal && h.onAbort) h.signal.removeEventListener('abort', h.onAbort);
    this.#map.delete(h.id);
  }

  /** The handles of programs that ended (their signal aborted) or closed long ago. */
  async sweep() {
    for (const h of [...this.#map.values()]) {
      if (!h.closed && h.signal?.aborted) await this.close(h.id, 'Il programma si è fermato');
    }
  }

  async closeAll(reason = 'Il modulo Hardware si è fermato') {
    await Promise.all([...this.#map.values()].filter(h => !h.closed).map(h => this.close(h.id, reason)));
    this.#map.clear();
    this.#busy.clear();
  }

  /** Open handles (for /status and the tests). */
  list(filter = () => true) {
    return [...this.#map.values()].filter(h => !h.closed && filter(h));
  }
}
