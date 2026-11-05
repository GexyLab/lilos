/**
 * '@lilos/sdk' for the Terminal's shell in the command lilos (build.json): the same as when the
 * shell runs in the kernel for the Scheduler (src/terminal/kernel/sdk.js: fs over the user's home,
 * session, tags to read, locale), with `lilos.home` made of the kernel's HTTP API (home.js) instead
 * of the services' API. Only the tags' changes say something of their own: they need lilOS's page.
 */
import { tags as base } from '../../../src/terminal/kernel/sdk.js';
import { t } from './strings.js';

export * from '../../../src/terminal/kernel/sdk.js';

const noPage = () => { throw new Error(t('cli.needsUi')); };

export const tags = {
  list: () => base.list(),
  get: id => base.get(id),
  byName: name => base.byName(name),
  create: noPage,
  rename: noPage,
  setColor: noPage,
  remove: noPage,
  on: () => () => {},
};
