import { Kernel } from './kernel.js';
import { logger } from './log.js';

const log = logger('kernel');

try {
  const kernel = await Kernel.start();
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
  log.error('Avvio non riuscito', err);
  process.exit(1);
}
