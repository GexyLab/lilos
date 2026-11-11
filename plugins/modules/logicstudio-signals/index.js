import { join } from 'node:path';

/**
 * Logic Studio, signal theory: registers blocks.js (with its maths in lib/dsp.js) with the engine
 * (logicstudio-engine), which loads it in the worker of each user. The blocks need nothing from the
 * kernel: no actions.
 */
let handle = null;

export default {
  async init(ctx) {
    ctx.provide('logicblock.signals', { api: 1 });
    handle = await ctx.service('logicstudio').register({
      name: ctx.name, version: ctx.version,
      label: { en: 'Signals', it: 'Segnali' },
      blocks: join(ctx.dir, 'blocks.js'),
      docs: join(ctx.dir, 'docs'),   // the documentation (docs/<lang>/…), shown in the IDE
    });
  },
  async stop() { handle?.unregister(); },
};
