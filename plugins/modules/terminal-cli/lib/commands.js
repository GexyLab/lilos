import { commands as terminal } from '../../../src/terminal/commands/index.js';
import { appstoreCommand } from './appstore.js';
import { licenseCommand } from './eula.js';
import { logicCommand } from './logic.js';

/**
 * The commands of the command lilos: the Terminal's, plus its own (appstore, license, logic), which talk
 * to the kernel and exist only here. Its own win over the Terminal's with the same name.
 */
const own = new Map([appstoreCommand, licenseCommand, logicCommand].map(c => [c.name, c]));

export const commands = {
  get: name => own.get(name) ?? terminal.get(name),
  has: name => own.has(name) || terminal.has(name),
  names: () => [...new Set([...terminal.names(), ...own.keys()])],
  values: () => [...terminal.values().filter(c => !own.has(c.name)), ...own.values()],
};
