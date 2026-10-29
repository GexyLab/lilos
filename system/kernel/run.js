import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * Runs the kernel and starts it again when it asks to (exit code 75: modules installed, updated
 * or removed). Any other exit ends here too. `npm run kernel` uses this.
 */
const MAIN = fileURLToPath(new URL('./src/main.js', import.meta.url));
const RESTART = 75;
let child;

function start() {
  child = spawn(process.execPath, [MAIN], { stdio: 'inherit', env: { ...process.env, LILOS_SUPERVISED: '1' } });
  child.on('exit', code => {
    if (code === RESTART) start();
    else process.exit(code ?? 0);
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child?.kill(signal));
start();
