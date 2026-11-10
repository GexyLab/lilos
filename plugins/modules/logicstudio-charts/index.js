import { join } from 'node:path';

/**
 * Logic Studio, charts: registers components.js with the engine, which serves it to the browser
 * (lilOS and the IDE draw the windows of the projects with it). The drawing is the SDK's chart
 * library (sdk/ui/charts.js), given to the components by LogicUI.
 */
let handle = null;

export default {
  async init(ctx) {
    ctx.provide('logicui.charts', { api: 1 });
    handle = await ctx.service('logicstudio').register({
      name: ctx.name, version: ctx.version,
      label: { en: 'Charts', it: 'Grafici' },
      components: join(ctx.dir, 'components.js'),
    });
  },
  async stop() { handle?.unregister(); },
};
