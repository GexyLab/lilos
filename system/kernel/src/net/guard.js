import { BlockList, isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { fail } from '../errors.js';

const rules = list => {
  const b = new BlockList();
  for (const [address, prefix, family] of list) b.addSubnet(address, prefix, family);
  return b;
};
/** Never: this machine, link-local (cloud metadata), multicast, unspecified. */
const ALWAYS = rules([
  ['0.0.0.0', 8, 'ipv4'], ['127.0.0.0', 8, 'ipv4'], ['169.254.0.0', 16, 'ipv4'], ['224.0.0.0', 4, 'ipv4'],
  ['::', 128, 'ipv6'], ['::1', 128, 'ipv6'], ['fe80::', 10, 'ipv6'], ['ff00::', 8, 'ipv6'],
]);
/** The local network: allowed unless the admin says otherwise (a NAS is the usual server). */
const PRIVATE = rules([
  ['10.0.0.0', 8, 'ipv4'], ['172.16.0.0', 12, 'ipv4'], ['192.168.0.0', 16, 'ipv4'], ['100.64.0.0', 10, 'ipv4'], ['fc00::', 7, 'ipv6'],
]);

/**
 * Where users may make the kernel connect (a network connection's server). With one user (no
 * sign-in) anything: the user can reach those hosts anyway. With several users the kernel's network
 * is shared: never this machine, link-local addresses (cloud metadata) or multicast; the local
 * network unless config.json says `net: { allowPrivate: false }`; `net.allow: ['10.1.0.0/16', …]`
 * lets ranges through all the same. Checked when a connection is saved, tried and opened (each time:
 * a name can point elsewhere later).
 */
export class NetGuard {
  constructor(kernel) {
    const cfg = kernel.config?.net ?? {};
    this.enabled = !!kernel.multiUser;
    this.allowPrivate = cfg.allowPrivate !== false;
    this.allow = new BlockList();
    for (const range of Array.isArray(cfg.allow) ? cfg.allow : []) {
      const [address, prefix] = String(range).split('/');
      try { this.allow.addSubnet(address, Number(prefix), isIP(address) === 6 ? 'ipv6' : 'ipv4'); } catch { /* not a range: ignored */ }
    }
  }

  static hostOf(values) {
    if (values?.host) return String(values.host);
    try { return new URL(values?.url).hostname.replace(/^\[|\]$/g, ''); } catch { return ''; }
  }

  async check(values) {
    if (!this.enabled) return;
    const host = NetGuard.hostOf(values);
    if (!host) return;
    const ips = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map(a => a.address);
    for (let ip of ips) {
      ip = ip.replace(/^::ffff:/i, '');
      const family = isIP(ip) === 6 ? 'ipv6' : 'ipv4';
      if (this.allow.check(ip, family)) continue;
      if (ALWAYS.check(ip, family) || (!this.allowPrivate && PRIVATE.check(ip, family))) {
        fail('forbidden', 'Indirizzo non permesso per le connessioni di rete');
      }
    }
  }
}
