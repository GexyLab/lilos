import { join } from 'node:path';
import { makeActions } from './lib/actions.js';

/**
 * Logic Studio, the SQL database blocks: registers blocks.js with the engine (logicstudio-engine),
 * which loads it in the worker of each user, and the actions those blocks ask for (lib/actions.js),
 * made here in the kernel's main thread for the program's owner: PostgreSQL, MySQL / MariaDB, SQL
 * Server, SQLite (a file of the user's home, in a thread of its own: sqlite-worker.js), Oracle and
 * ClickHouse. The settings are read at each operation: an admin's change counts at once.
 */
let handle = null;
let db = null;

export default {
  async init(ctx) {
    ctx.provide('logicblock.db', { api: 1 });
    db = makeActions({
      config: () => ctx.config ?? {}, dataDir: ctx.dataDir, module: ctx.name,
      fs: () => ctx.service('fs'), workerFile: join(ctx.dir, 'sqlite-worker.js'),
    });
    handle = await ctx.service('logicstudio').register({
      name: ctx.name, version: ctx.version,
      label: { en: 'Database blocks (SQL)', it: 'Blocchi database (SQL)' },
      blocks: join(ctx.dir, 'blocks.js'),
      docs: join(ctx.dir, 'docs'),   // the documentation (docs/<lang>/…), shown in the IDE
      actions: db.actions,
    });
  },
  async stop() {
    handle?.unregister();
    await db?.closeAll();
  },
};
