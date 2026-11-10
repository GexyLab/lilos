import { join } from 'node:path';

/**
 * Logic Studio, standard UI components: registers components.js with the engine, which serves it
 * to the browser (lilOS and the IDE draw the windows of the projects with it).
 */
let handle = null;

export default {
  async init(ctx) {
    ctx.provide('logicui.ui', { api: 1 });
    handle = await ctx.service('logicstudio').register({
      name: ctx.name, version: ctx.version,
      label: { en: 'Standard UI components', it: 'Componenti UI standard' },
      components: join(ctx.dir, 'components.js'),
    });
  },
  async stop() { handle?.unregister(); },
};
