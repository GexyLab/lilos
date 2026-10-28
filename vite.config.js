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
  // Editor dependencies loaded on demand (some only inside workers): prepared up front, so the
  // dev server does not discover them one at a time and reload the page each time
  optimizeDeps: {
    include: [
      '@shikijs/core', '@shikijs/engine-javascript', '@shikijs/themes/github-light', '@shikijs/themes/github-dark', 'web-tree-sitter',
      ...['markdown', 'javascript', 'typescript', 'css', 'html', 'xml', 'json', 'python', 'shellscript', 'yaml'].map(l => `@shikijs/langs/${l}`),
      'vscode-json-languageservice', 'vscode-css-languageservice', 'vscode-html-languageservice',
      'vscode-languageserver-textdocument',
    ],
  },
  // Language servers run in module workers (they import code-split chunks)
  worker: { format: 'es' },
});
