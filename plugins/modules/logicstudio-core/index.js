import { join } from 'node:path';

/**
 * Logic Studio, base blocks: registers blocks.js with the engine (logicstudio-engine), which loads
 * it in the worker of each user. The blocks need nothing from the kernel: no actions.
 */
let handle = null;

export default {
  async init(ctx) {
    ctx.provide('logicblock.core', { api: 1 });
    handle = await ctx.service('logicstudio').register({
      name: ctx.name, version: ctx.version,
      label: { en: 'Base blocks', it: 'Blocchi di base' },
      blocks: join(ctx.dir, 'blocks.js'),
    });
  },
  async stop() { handle?.unregister(); },
};
