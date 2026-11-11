import { join } from 'node:path';
import { Connections, makeGuard, settingsOf } from './lib/shared/dbcore.js';
import { KINDS, makeActions } from './lib/es.js';

/**
 * Logic Studio, the Elasticsearch blocks (Elasticsearch 7/8, OpenSearch 1/2): registers blocks.js
 * with the engine (logicstudio-engine), which loads it in the worker of each user, and the actions
 * they ask for (es.*, lib/es.js), made here in the kernel's main thread with the module's own
 * address checks (lib/shared/dbcore.js). The settings (allowPrivate, timeoutSeconds, maxRows,
 * maxResultKb, maxConnections, perMinute, allowElasticsearch, allowOpensearch) are read at each
 * operation: an admin's change counts at once.
 */
let handle = null;
let conns = null;

export default {
  async init(ctx) {
    const settings = () => settingsOf(ctx.config ?? {}, KINDS);
    const guard = makeGuard({ module: ctx.name, dataDir: ctx.dataDir, settings });
    conns = new Connections(settings);
    ctx.provide('logicblock.es', { api: 1 });
    handle = await ctx.service('logicstudio').register({
      name: ctx.name, version: ctx.version,
      label: { en: 'Elasticsearch blocks', it: 'Blocchi Elasticsearch' },
      blocks: join(ctx.dir, 'blocks.js'),
      docs: join(ctx.dir, 'docs'),   // the documentation (docs/<lang>/…), shown in the IDE
      actions: makeActions({ settings, guard, conns }),
    });
  },
  async stop() {
    handle?.unregister();
    handle = null;
    await conns?.closeAll();
    conns = null;
  },
};
