import { Kernel } from './kernel.js';
import { logger } from './log.js';

const log = logger('kernel');

try {
  const kernel = await Kernel.start();
  // Up: run.js keeps a version of lilOS just installed only after this (see run.js)
  process.send?.({ lilos: 'ready' });
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    log.info('Arresto…');
    await kernel.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} catch (err) {
  // The license not accepted (lilOS without UI): already said why, and run.js does not start it again
  if (err?.exitCode === 3) process.exit(3);
  log.error('Avvio non riuscito', err);
  process.exit(1);
}
