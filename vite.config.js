import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const sdk = path => fileURLToPath(new URL(`./sdk/${path}`, import.meta.url));

export default defineConfig({
  resolve: {
    // The SDK lives in the repo: map its package entry points (see sdk/package.json "exports")
    alias: [
      { find: /^@lilos\/sdk$/, replacement: sdk('index.js') },
      { find: /^@lilos\/sdk\/styles\.css$/, replacement: sdk('styles/index.css') },
    ],
  },
});
