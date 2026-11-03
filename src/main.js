import '@lilos/sdk/styles.css';
import './styles/boot.css';
import { boot } from './boot/boot.js';

// Sign in and load the user's data from the kernel first: the SDK reads it as soon as it is imported
const started = await boot(document.getElementById('app'));
try {
  await import('./system.js');
} finally {
  started();
}
