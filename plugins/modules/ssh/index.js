import { term } from './term.js';
import { sftp } from './sftp.js';

/**
 * SSH for lilOS: the remote terminals (service 'term.ssh', term.js) and the SFTP connections of the
 * Rete folder ('netfs.sftp', sftp.js), on the same connection and sign-in (connect.js) and one copy
 * of ssh2. It replaces the modules term-ssh and netfs-sftp (module.json `replaces`); the saved
 * hosts and connections stay as they are.
 */
export default {
  async init(ctx) {
    ctx.provide('term.ssh', term);
    ctx.provide('netfs.sftp', sftp);
  },
};
