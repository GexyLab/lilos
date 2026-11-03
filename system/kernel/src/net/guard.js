import { BlockList, isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import dns from 'node:dns';
import { fail } from '../errors.js';
import { editConfig } from '../config.js';

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
  ['::', 96, 'ipv6'], ['::ffff:0:0:0', 96, 'ipv6'], ['fec0::', 10, 'ipv6'], ['192.88.99.0', 24, 'ipv4'],
]);
/** What not even the admin's ranges (net.allow) open: cloud metadata, multicast, «this network». */
const NEVER = rules([['169.254.0.0', 16, 'ipv4'], ['fe80::', 10, 'ipv6'], ['224.0.0.0', 4, 'ipv4'], ['ff00::', 8, 'ipv6'], ['0.0.0.0', 8, 'ipv4']]);
/** This machine: closed unless the admin opens it (net.allowLocal, since lilOS 1.25.0). */
const LOCAL = rules([['127.0.0.0', 8, 'ipv4'], ['::1', 128, 'ipv6']]);
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
 *
 * The exceptions are the admin's (Control Panel → System → Network, since lilOS 1.25.0: GET and PUT
 * /api/net/rules): `net.allowLocal: true` opens this machine too (127.0.0.1, ::1: the kernel's own
 * services, a database, a test server), `allowPrivate` the local network, `allow` some ranges. They
 * apply at once and are saved in config.json.
 */
export class NetGuard {
  #kernel;

  constructor(kernel) {
    this.#kernel = kernel;
    this.#apply(kernel.config?.net ?? {});
  }

  /** The rules apply with users that sign in (read each time: users may come after the start). */
  get enabled() { return !!this.#kernel.multiUser; }

  #apply(cfg) {
    this.allowPrivate = cfg.allowPrivate === true;
    this.allowLocal = cfg.allowLocal === true;
    this.ranges = [];
    this.allow = new BlockList();
    for (const range of Array.isArray(cfg.allow) ? cfg.allow : []) {
      const clean = cleanRange(range);
      if (!clean) continue;   // not a range: ignored
      const [address, prefix] = clean.split('/');
      this.allow.addSubnet(address, Number(prefix), isIP(address) === 6 ? 'ipv6' : 'ipv4');
      this.ranges.push(clean);
    }
  }

  /** The rules as the Control Panel shows them. */
  rules() {
    return { multiUser: this.enabled, allowLocal: this.allowLocal, allowPrivate: this.allowPrivate, allow: [...this.ranges] };
  }

  /** The admin changes them: { allowLocal?, allowPrivate?, allow? }. Saved in config.json, used at once. */
  async setRules(raw) {
    const next = { allowLocal: this.allowLocal, allowPrivate: this.allowPrivate, allow: this.ranges };
    if (raw.allowLocal !== undefined) next.allowLocal = raw.allowLocal === true;
    if (raw.allowPrivate !== undefined) next.allowPrivate = raw.allowPrivate === true;
    if (raw.allow !== undefined) {
      if (!Array.isArray(raw.allow) || raw.allow.length > 100) fail('invalid', 'Intervalli non validi (al massimo 100)');
      next.allow = [...new Set(raw.allow.map(r => cleanRange(r) ?? fail('invalid', `Intervallo non valido: ${String(r).slice(0, 60)} (scrivi per esempio 192.168.1.50/32)`)))];
    }
    await editConfig(cfg => {
      cfg.net = { ...(cfg.net ?? {}), ...next };
      return cfg;
    });
    this.#apply(next);
    return this.rules();
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

  /**
   * A `lookup` for net/http/tls connect: resolves the name and checks every address it gives, so
   * the connection goes to an address checked a moment ago. check() alone leaves a gap: between it
   * and the connection, the name can be made to point elsewhere (DNS rebinding, a short TTL).
   */
  lookup = (host, options, callback) => {
    if (typeof options === 'function') [callback, options] = [options, {}];
    const opts = typeof options === 'number' ? { family: options } : options ?? {};
    dns.lookup(host, { ...opts, all: true }, (err, list) => {
      if (err) return callback(err);
      if (!list.length) return callback(Object.assign(new Error(`Nessun indirizzo per ${host}`), { code: 'ENOTFOUND' }));
      try {
        for (const a of list) this.checkIp(a.address);
      } catch (refused) {
        return callback(refused);
      }
      if (opts.all) callback(null, list);
      else callback(null, list[0].address, list[0].family);
    });
  };

  /** Throws when the kernel may not connect to this address. */
  checkIp(ip) {
    if (!this.enabled) return;
    const family = isIP(ip) === 6 ? 'ipv6' : 'ipv4';
    if (this.allow.check(ip, family) && !NEVER.check(ip, family)) return;
    if (this.allowLocal && LOCAL.check(ip, family)) return;
    if (ALWAYS.check(ip, family) || (!this.allowPrivate && PRIVATE.check(ip, family))) {
      fail('forbidden', 'Indirizzo non permesso per le connessioni di rete');
    }
  }
}

/** '192.168.1.50/32' as it is when it is a range ('192.168.1.50' is /32, '::1' /128), otherwise null. */
function cleanRange(raw) {
  const [address, bits, ...rest] = String(raw ?? '').trim().split('/');
  const family = isIP(address);
  if (!family || rest.length) return null;
  const max = family === 6 ? 128 : 32;
  const prefix = bits === undefined || bits === '' ? max : Number(bits);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > max) return null;
  try { new BlockList().addSubnet(address, prefix, family === 6 ? 'ipv6' : 'ipv4'); } catch { return null; }
  return `${address}/${prefix}`;
}
