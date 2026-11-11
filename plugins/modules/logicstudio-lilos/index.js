import { join } from 'node:path';
import { makeActions } from './lib/actions.js';

/**
 * Logic Studio, the lilOS blocks: registers blocks.js with the engine (logicstudio-engine), which
 * loads it in the worker of each user, and the actions those blocks ask for (lib/actions.js), made
 * here in the kernel's main thread as the program's owner. The services are asked for when used:
 * the kernel wraps fs with its quota guards after every module started.
 */
let handle = null;

export default {
  async init(ctx) {
    ctx.provide('logicblock.lilos', { api: 1 });
    handle = await ctx.service('logicstudio').register({
      name: ctx.name, version: ctx.version,
      label: { en: 'lilOS blocks', it: 'Blocchi di lilOS' },
      blocks: join(ctx.dir, 'blocks.js'),
      docs: join(ctx.dir, 'docs'),   // the documentation (docs/<lang>/…), shown in the IDE
      actions: makeActions({ fs: () => ctx.service('fs'), notifications: () => ctx.service('notifications') }),
    });
  },
  async stop() { handle?.unregister(); },
};
