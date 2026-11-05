import { ApiError } from './client.js';
import { t } from './strings.js';

/**
 * `lilos.home` (what src/terminal/kernel/kfs.js needs) over the kernel's HTTP API, the same routes
 * lilOS's page uses: the tree (GET /api/fs/tree, reloaded before each line typed), its changes
 * (POST /api/fs/sync) and the contents (GET/PUT /api/fs/content/:id). Ids are the page's ones.
 */
export function httpHome(client) {
  const path = id => `/api/fs/content/${encodeURIComponent(id)}`;
  return {
    // A kernel older than lilOS 1.34.0 has no /api/fs/tree: said plainly
    load: () => client.get('/api/fs/tree').catch(err => {
      throw err instanceof ApiError && err.status === 404 ? new Error(t('cli.oldKernel')) : err;
    }),
    sync: changes => client.post('/api/fs/sync', changes),
    async read(id) {
      return { base64: (await client.request('GET', `${path(id)}?raw=1`, { raw: true })).toString('base64') };
    },
    async write(id, data = {}) {
      const body = typeof data.base64 === 'string' ? Buffer.from(data.base64, 'base64') : Buffer.from(String(data.text ?? ''), 'utf8');
      await client.request('PUT', path(id), { body });
    },
  };
}
