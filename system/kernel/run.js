import { spawn } from 'node:child_process';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Runs the kernel and starts it again when it asks to (exit code 75: modules installed, updated
 * or removed, another version of lilOS). Any other exit ends here too. `npm run kernel` uses this.
 *
 * In a copy of the repository it runs src/main.js next to it. In an installed lilOS (current.json
 * next to it: see src/apps/systemPackage.js) it runs the version current.json names, from
 * releases/<version>. A version on trial (just installed) must come up within TRIAL_MS: if it
 * stops or hangs before, run.js goes back to the previous version and writes why in current.json
 * (`failed`: lilOS tells the admins); if it comes up, `updated` (lilOS asks the admins whether to
 * delete the previous one). Updates of lilOS do not replace this file: keep it small and plain.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const CURRENT = join(HERE, 'current.json');
const RESTART = 75;
const TRIAL_MS = 5 * 60_000;
const LOG_LINES = 40;
let child;
let stopping = false;   // Ctrl+C or the system: no going back, just stop

const readCurrent = () => JSON.parse(readFileSync(CURRENT, 'utf8'));

function writeCurrent(value) {
  writeFileSync(`${CURRENT}.tmp`, JSON.stringify(value, null, 2));
  renameSync(`${CURRENT}.tmp`, CURRENT);
}

function start() {
  const current = existsSync(CURRENT) ? readCurrent() : null;
  const main = current ? join(HERE, 'releases', current.version, 'system', 'kernel', 'src', 'main.js') : join(HERE, 'src', 'main.js');
  const trial = !!current?.trial;
  const log = [];
  let ready = false, reason = null, timer = null;
  const output = trial ? 'pipe' : 'inherit';
  // Its arguments go to the kernel (--accept-license: lilOS without UI, src/license.js)
  child = spawn(process.execPath, [main, ...process.argv.slice(2)], { stdio: ['inherit', output, output, 'ipc'], env: { ...process.env, LILOS_SUPERVISED: '1' } });
  if (trial) {
    // Shown as usual, and the last lines kept to say why it did not start
    for (const [from, to] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
      from.on('data', chunk => {
        to.write(chunk);
        if (ready) return;
        log.push(...String(chunk).split(/\r?\n/).filter(Boolean));
        log.splice(0, Math.max(0, log.length - LOG_LINES));
      });
    }
    timer = setTimeout(() => {
      reason = `non ha risposto entro ${TRIAL_MS / 60_000} minuti`;
      child.kill();
    }, TRIAL_MS);
  }
  child.on('message', msg => {
    if (msg?.lilos !== 'ready' || ready) return;
    ready = true;
    clearTimeout(timer);
    if (!trial) return;
    const { trial: _, failed, ...rest } = readCurrent();
    writeCurrent({ ...rest, ...(rest.previous && { updated: { from: rest.previous, at: Date.now() } }) });
    console.log(`[run] lilOS ${rest.version} è partito`);
  });
  child.on('exit', (code, signal) => {
    clearTimeout(timer);
    if (stopping) process.exit(code ?? 0);
    if (trial && !ready) return rollback(current, reason ?? `si è fermato prima di partire (${signal ?? `codice ${code}`})`, log);
    if (code === RESTART) start();
    else process.exit(code ?? 0);
  });
}

/** The version on trial did not come up: back to the one before it, and why written down. */
function rollback(current, reason, log) {
  const { previous } = current;
  if (!previous || !existsSync(join(HERE, 'releases', previous, 'system.json'))) {
    console.error(`[run] lilOS ${current.version} ${reason}, e non c'è una versione precedente a cui tornare`);
    process.exit(1);
  }
  console.error(`[run] lilOS ${current.version} ${reason}: torno alla ${previous}`);
  writeCurrent({ version: previous, previous: null, failed: { version: current.version, at: Date.now(), reason, log } });
  start();
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  stopping = true;
  child?.kill(signal);
});
start();
