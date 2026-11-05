import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * The command lilos (the module terminal-cli): `lilos [options] [command …]`, a shell of lilOS in
 * this terminal or one command and out. tools/install.js puts this file next to run.js, with the
 * launchers lilos.cmd (Windows) and lilos (sh) that run it with the node of the installation.
 * Like run.js it is not replaced by updates: it only finds the cli.js of the version that runs
 * (current.json) and hands it the arguments. In a copy of the repository: npm run lilos -- …
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const CURRENT = join(HERE, 'current.json');
const cli = existsSync(CURRENT)
  ? join(HERE, 'releases', JSON.parse(readFileSync(CURRENT, 'utf8')).version, 'system', 'kernel', 'cli.js')
  : join(HERE, 'cli.js');
process.argv = [process.argv[0], cli, 'terminal-cli', 'sh', '--', ...process.argv.slice(2)];
await import(pathToFileURL(cli).href);
