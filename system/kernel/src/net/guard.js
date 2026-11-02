import { BlockList, isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { fail } from '../errors.js';

const rules = list => {
  const b = new BlockList();
  for (const [address, prefix, family] of list) b.addSubnet(address, prefix, family);
  return b;
};
/**
 * Never: this machine, link-local (cloud metadata), multicast, unspecified, reserved; and the IPv6
 * ranges that carry an IPv4 address inside (NAT64, 6to4, Teredo), which could reach those. An
 * IPv4-mapped IPv6 address (::ffff:127.0.0.1) is matched against the IPv4 rules by BlockList itself.
 */
const ALWAYS = rules([
  ['0.0.0.0', 8, 'ipv4'], ['127.0.0.0', 8, 'ipv4'], ['169.254.0.0', 16, 'ipv4'], ['224.0.0.0', 4, 'ipv4'],
  ['192.0.0.0', 24, 'ipv4'], ['198.18.0.0', 15, 'ipv4'], ['240.0.0.0', 4, 'ipv4'],
  ['::', 128, 'ipv6'], ['::1', 128, 'ipv6'], ['fe80::', 10, 'ipv6'], ['ff00::', 8, 'ipv6'],
  ['64:ff9b::', 96, 'ipv6'], ['64:ff9b:1::', 48, 'ipv6'], ['2002::', 16, 'ipv6'], ['2001::', 32, 'ipv6'],
]);
/** The local network: closed unless the admin opens it (net.allowPrivate) or lets ranges through (net.allow). */
const PRIVATE = rules([
  ['10.0.0.0', 8, 'ipv4'], ['172.16.0.0', 12, 'ipv4'], ['192.168.0.0', 16, 'ipv4'], ['100.64.0.0', 10, 'ipv4'], ['fc00::', 7, 'ipv6'],
]);

/**
 * Where users may make the kernel connect (a network connection's server). With one user (no
 * sign-in) anything: the user can reach those hosts anyway. With several users the kernel's network
 * is shared: never this machine, link-local addresses (cloud metadata) or multicast; the local
 * network only when config.json says `net: { allowPrivate: true }`, or the ranges in
 * `net.allow: ['192.168.1.50/32', …]` (a NAS). Checked when a connection is saved, tried and opened (each time:
 * a name can point elsewhere later).
 */
export class NetGuard {
  constructor(kernel) {
    const cfg = kernel.config?.net ?? {};
    this.enabled = !!kernel.multiUser;
    this.allowPrivate = cfg.allowPrivate === true;
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
    for (const ip of ips) this.checkIp(ip);
  }

  /** Throws when the kernel may not connect to this address. */
  checkIp(ip) {
    if (!this.enabled) return;
    const family = isIP(ip) === 6 ? 'ipv6' : 'ipv4';
    if (this.allow.check(ip, family)) return;
    if (ALWAYS.check(ip, family) || (!this.allowPrivate && PRIVATE.check(ip, family))) {
      fail('forbidden', 'Indirizzo non permesso per le connessioni di rete');
    }
  }
}
