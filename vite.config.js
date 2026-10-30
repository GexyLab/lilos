import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const sdk = path => fileURLToPath(new URL(`./sdk/${path}`, import.meta.url));

export default defineConfig({
  resolve: {
    // The SDK lives in the repo: map its package entry points (see sdk/package.json "exports")
    alias: [
      { find: /^@lilos\/sdk$/, replacement: sdk('index.js') },
      { find: /^@lilos\/sdk\/kernel$/, replacement: sdk('core/kernel.js') },
      { find: /^@lilos\/sdk\/styles\.css$/, replacement: sdk('styles/index.css') },
    ],
  },
  // The kernel (npm run kernel) answers on /api: same origin for the browser, so its cookie works
  server: {
    proxy: { '/api': { target: 'http://127.0.0.1:8790', changeOrigin: false } },
  },
  preview: {
    proxy: { '/api': { target: 'http://127.0.0.1:8790', changeOrigin: false } },
  },
});
