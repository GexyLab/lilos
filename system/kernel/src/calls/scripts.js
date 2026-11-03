import { fail } from '../errors.js';
import { logger } from '../log.js';
import { SANDBOX_CODE } from './sandbox.js';

/**
 * NetTest's scripts (before a request, after its response) run in the 'runtime' service of the
 * kernel (the services-isolate module): a process of its own and a V8 isolate, with a memory limit
 * and a time limit for each script, no network, no files. Its `lilos` can do nothing: every call
 * it makes is refused here. One sandbox per user, started when a script first needs it and
 * stopped after IDLE without scripts. Without the runtime (the module is not installed) a request
 * with scripts fails with a word on what is missing; requests without scripts never need it.
 */
const log = logger('nettest');
const IDLE = 2 * 60_000;
const LIMITS = { memoryMb: 96, cpuMs: 5000 };
const TIMEOUT = 15_000;

export class Scripts {
  #kernel;
  #boxes = new Map();   // user id → { ready: Promise<handle>, timer }

  constructor(kernel) {
    this.#kernel = kernel;
  }

  get available() {
    return this.#kernel.services.has('runtime');
  }

  #box(principal) {
    let box = this.#boxes.get(principal.id);
    if (!box) {
      box = { timer: null };
      box.ready = this.#kernel.service('runtime').start({
        key: `nettest-scripts:${principal.id}`,
        code: SANDBOX_CODE,
        info: { id: 'nettest-scripts', version: '1.0.0', entry: 'main', args: {}, user: { id: principal.id, username: principal.username, name: principal.name } },
        limits: LIMITS,
      }, {
        call: async () => { throw new Error('Gli script di NetTest non usano lilOS'); },
        log: () => {},
        exit: reason => {
          if (this.#boxes.get(principal.id) === box) this.#boxes.delete(principal.id);
          log.warn(`Script di NetTest fermati: ${reason}`);
        },
      });
      box.ready.catch(() => { if (this.#boxes.get(principal.id) === box) this.#boxes.delete(principal.id); });
      this.#boxes.set(principal.id, box);
    }
    clearTimeout(box.timer);
    box.timer = setTimeout(() => this.#stop(principal.id, box), IDLE);
    box.timer.unref?.();
    return box.ready;
  }

  async #stop(userId, box) {
    if (this.#boxes.get(userId) === box) this.#boxes.delete(userId);
    try { await (await box.ready).stop(); } catch { /* gone already */ }
  }

  /** Runs one script (see sandbox.js for `data` and the answer). */
  async run(principal, data, { signal } = {}) {
    if (!this.available) fail('unavailable', 'Gli script hanno bisogno del modulo services-isolate (Pannello di controllo → Moduli)');
    let handle;
    try {
      handle = await this.#box(principal);
    } catch (err) {
      fail('unavailable', `Gli script non partono: ${err.message}`);
    }
    try {
      return await handle.request(data, { kind: 'kernel' }, { timeoutMs: TIMEOUT, signal });
    } catch (err) {
      // A script that ran out of time or memory may have left the sandbox unusable: the next one gets a new one
      const box = this.#boxes.get(principal.id);
      if (box) this.#stop(principal.id, box);
      return { logs: [], tests: [], error: /timed out|Script execution/i.test(err.message) ? 'Lo script ha superato il tempo (5 secondi)' : err.message };
    }
  }

  async stop() {
    await Promise.all([...this.#boxes].map(([id, box]) => this.#stop(id, box)));
  }
}
