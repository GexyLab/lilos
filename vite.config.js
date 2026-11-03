import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SOURCES, writeHostShims } from './scripts/host-shims.mjs';

const sdk = path => fileURLToPath(new URL(`./sdk/${path}`, import.meta.url));

/** The kernel's port: LILOS_KERNEL_PORT, else the one in system/kernel/config.json, else 8790 (as the kernel does). */
const kernelPort = (() => {
  try {
    return process.env.LILOS_KERNEL_PORT ?? JSON.parse(readFileSync(new URL('./system/kernel/config.json', import.meta.url), 'utf8')).port ?? 8790;
  } catch {
    return 8790;
  }
})();
const api = { '/api': { target: `http://127.0.0.1:${kernelPort}`, changeOrigin: false, ws: true } };

/**
 * Keeps public/host/sdk.js and system.js in step with the SDK while the dev server runs: predev
 * writes them only at start-up, so a new export would stay out of system apps until a restart.
 */
const hostShims = {
  name: 'lilos-host-shims',
  configureServer(server) {
    server.watcher.add(SOURCES);
    server.watcher.on('change', file => {
      if (!SOURCES.includes(resolve(file))) return;
      try {
        writeHostShims();
        server.config.logger.info('public/host: sdk.js, system.js rewritten', { timestamp: true });
      } catch (err) {
        server.config.logger.error(`public/host: ${err.message}`, { timestamp: true });
      }
    });
  },
};

export default defineConfig({
  plugins: [hostShims],
  resolve: {
    // The SDK lives in the repo: map its package entry points (see sdk/package.json "exports")
    alias: [
      { find: /^@lilos\/sdk$/, replacement: sdk('index.js') },
      { find: /^@lilos\/sdk\/kernel$/, replacement: sdk('core/kernel.js') },
      { find: /^@lilos\/sdk\/styles\.css$/, replacement: sdk('styles/index.css') },
    ],
  },
  // The kernel (npm run kernel, on kernelPort) answers on /api: same origin for the browser, so its cookie works
  // (ws: the WebSockets of the remote terminals go through too)
  server: {
    proxy: api,
  },
  preview: {
    proxy: api,
  },
});
