import { join } from 'node:path';
import { makeActions } from './lib/redis.js';

/**
 * Logic Studio, the Redis blocks: registers blocks.js with the engine (logicstudio-engine), which
 * loads it in the worker of each user, and the actions they ask for (redis.*, lib/redis.js), made
 * here in the kernel's main thread with the module's own address checks and limits. The settings
 * are read at each call: an admin's change counts at once. The connections of a program close when
 * it stops, and all of them when this module stops.
 */
let handle = null;
let made = null;

export default {
  async init(ctx) {
    ctx.provide('logicblock.redis', { api: 1 });
    made = makeActions({ config: () => ctx.config ?? {}, module: ctx.name, dataDir: ctx.dataDir });
    handle = await ctx.service('logicstudio').register({
      name: ctx.name, version: ctx.version,
      label: { en: 'Redis blocks', it: 'Blocchi Redis' },
      blocks: join(ctx.dir, 'blocks.js'),
      docs: join(ctx.dir, 'docs'),   // the documentation (docs/<lang>/…), shown in the IDE
      actions: made.actions,
    });
  },
  async stop() {
    handle?.unregister();
    handle = null;
    await made?.conns.closeAll();
    made = null;
  },
};
