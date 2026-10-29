import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { MODULES_DIR } from './src/config.js';
import { scanModules } from './src/modules.js';

/** Installs the dependencies of every module that has a package.json (exact versions, from its lockfile). */
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
for (const versions of (await scanModules(MODULES_DIR)).values()) {
  for (const mod of versions) {
    if (!existsSync(join(mod.dir, 'package.json'))) continue;
    const command = existsSync(join(mod.dir, 'package-lock.json')) ? 'ci' : 'install';
    console.log(`${mod.name}_${mod.version}: npm ${command}`);
    execFileSync(npm, [command, '--omit=dev', '--no-audit', '--no-fund'], { cwd: mod.dir, stdio: 'inherit', shell: process.platform === 'win32' });
  }
}
