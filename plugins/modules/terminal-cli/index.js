import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * terminal-cli: the command lilos, the Terminal of lilOS in a terminal of the computer.
 *
 *   lilos [options] [command …]      (the launcher next to run.js, see system/kernel/lilos.mjs)
 *   node system/kernel/cli.js terminal-cli sh -- [options] [command …]
 *
 * The kernel loads the module and gives it nothing to do: it runs as a command of cli.js, as a
 * client of the kernel that is on (its HTTP API, like lilOS's page). The shell and its commands are
 * the Terminal's (plugins/src/terminal), bundled with the command's own into cli.js, which is
 * imported only when the command runs: the kernel does not load the shell.
 */
const HERE = dirname(fileURLToPath(import.meta.url));

export default {
  async init() {},

  commands: {
    async sh(options) {
      const { main } = await import(pathToFileURL(join(HERE, 'cli.js')).href);
      return main(options);
    },
  },
};
