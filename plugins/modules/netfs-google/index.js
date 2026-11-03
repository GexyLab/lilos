import { bind } from './google.js';
import { drive } from './drive.js';
import { photos } from './photos.js';

/**
 * Google for the Rete folder: Google Drive (service 'netfs.gdrive', drive.js) and Google Photos
 * ('netfs.gphotos', photos.js), see the kernel's net/drivers.js. Both sign in through the kernel
 * with the project each lilOS installation makes on Google Cloud (Control Panel → Google project).
 * It replaces the modules netfs-gdrive and netfs-gphotos (module.json `replaces`: the kernel carries
 * their settings over, the project to the Google project); the connections stay as they are.
 */
export { cleanRoot } from './drive.js';

export default {
  async init(ctx) {
    bind(ctx);
    ctx.provide('netfs.gdrive', drive);
    ctx.provide('netfs.gphotos', photos);
  },
};
