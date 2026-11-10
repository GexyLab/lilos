import { join } from 'node:path';
import { makeActions } from './lib/request.js';

/**
 * Logic Studio, the network blocks: registers blocks.js with the engine (logicstudio-engine), which
 * loads it in the worker of each user, and the action they ask for (net.request, lib/request.js),
 * made here in the kernel's main thread with the module's own address checks. The settings
 * (allowPrivate, timeoutSeconds, maxResponseKb) are read at each request: an admin's change counts
 * at once.
 */
let handle = null;

export default {
  async init(ctx) {
    ctx.provide('logicblock.net', { api: 1 });
    handle = await ctx.service('logicstudio').register({
      name: ctx.name, version: ctx.version,
      label: { en: 'Network blocks', it: 'Blocchi di rete' },
      blocks: join(ctx.dir, 'blocks.js'),
      actions: makeActions(() => ctx.config ?? {}),
    });
  },
  async stop() { handle?.unregister(); },
};
