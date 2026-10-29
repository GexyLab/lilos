import '@lilos/sdk/styles.css';
import './styles/boot.css';
import { boot } from './boot/boot.js';

// Sign in and load the user's data from the kernel first: the SDK reads it as soon as it is imported
await boot(document.getElementById('app'));
await import('./system.js');
