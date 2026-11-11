// Copy of modules/_shared/ipguard.js (scripts/module-libs.mjs): edit it there, then npm run sync:modules
import dns from 'node:dns';
import { BlockList, isIP } from 'node:net';

/**
 * Which addresses the Logic Studio packages may reach (the web requests of logicstudio-net, the
 * databases of logicstudio-db, -mongodb, -redis, -influxdb, -elasticsearch). Modules do not get the
 * kernel's NetGuard: the same protection is here.
 *
 *  - Never: link-local (cloud metadata), multicast, «this network».
 *  - Only when the admin allows it (the module setting `allowPrivate`): this computer (loopback),
 *    the local networks and the other non-public ranges.
 *  - A name is resolved and EVERY address it gives is checked; the connection then goes to an
 *    address checked (a `lookup` for node:net / http, or the address given to the driver), so a
 *    name cannot be pointed elsewhere between the check and the connection (DNS rebinding).
 *
 *   checkIp(ip, { allowPrivate, module })     throws when the address may not be reached
 *   guardedLookup(options)                     a `lookup` for http.request, net.connect, the drivers
 *   resolveChecked(host, options)              → [{ address, family }], every one checked
 */
const rules = list => {
  const b = new BlockList();
  for (const [address, prefix, family] of list) b.addSubnet(address, prefix, family);
  return b;
};

/** Never, not even with allowPrivate: cloud metadata (link-local), multicast, «this network». */
export const NEVER = rules([
  ['0.0.0.0', 8, 'ipv4'], ['169.254.0.0', 16, 'ipv4'], ['224.0.0.0', 4, 'ipv4'], ['255.255.255.255', 32, 'ipv4'],
  ['100.100.100.200', 32, 'ipv4'], ['192.0.0.192', 32, 'ipv4'],   // metadata of Alibaba Cloud and Oracle Cloud
  ['::', 128, 'ipv6'], ['fe80::', 10, 'ipv6'], ['ff00::', 8, 'ipv6'], ['fd00:ec2::', 64, 'ipv6'],   // fd00:ec2::254: AWS metadata over IPv6
]);

/**
 * The IPv4 address carried inside an IPv6 one (NAT64 64:ff9b::/96, 6to4 2002::/16, IPv4-compatible
 * ::/96, IPv4-translated ::ffff:0:0:0/96, Teredo 2001::/32 with the client address inverted), or null.
 */
function embeddedIpv4(ip) {
  if (isIP(ip) !== 6) return null;
  const words = expand6(ip);
  if (!words) return null;
  const v4 = (hi, lo) => [hi >> 8, hi & 255, lo >> 8, lo & 255].join('.');
  if (words[0] === 0x64 && words[1] === 0xff9b) return v4(words[6], words[7]);
  if (words[0] === 0x2002) return v4(words[1], words[2]);
  if (words[0] === 0x2001 && words[1] === 0) return v4(~words[6] & 0xffff, ~words[7] & 0xffff);
  // IPv4-compatible ::a.b.c.d and IPv4-translated ::ffff:0:a.b.c.d (not ::, ::1: their «IPv4» would start with 0)
  const compatible = words[4] === 0 && words[5] === 0;
  const translated = words[4] === 0xffff && words[5] === 0;
  if (words.slice(0, 4).every(w => w === 0) && (compatible || translated) && words[6] >= 0x100) return v4(words[6], words[7]);
  return null;
}

/** An IPv6 address as its 8 words, or null. */
function expand6(ip) {
  let s = ip.split('%')[0].toLowerCase();
  const dotted = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (dotted) {
    const p = dotted[1].split('.').map(Number);
    s = s.slice(0, -dotted[1].length) + `${((p[0] << 8) | p[1]).toString(16)}:${((p[2] << 8) | p[3]).toString(16)}`;
  }
  const [head, tail] = s.includes('::') ? s.split('::') : [s, null];
  const a = head ? head.split(':') : [];
  const b = tail ? tail.split(':') : [];
  const missing = 8 - a.length - b.length;
  if (tail === null ? a.length !== 8 : missing < 0) return null;
  const words = [...a, ...Array(tail === null ? 0 : missing).fill('0'), ...b].map(h => parseInt(h || '0', 16));
  return words.length === 8 && words.every(w => w >= 0 && w <= 0xffff) ? words : null;
}

/**
 * Not public (only with allowPrivate): this computer, the private networks, shared address space,
 * reserved and documentation ranges, and the IPv6 ranges that carry an IPv4 address inside (NAT64,
 * 6to4, Teredo, IPv4-compatible), which could reach those. An IPv4-mapped IPv6 address
 * (::ffff:127.0.0.1) is matched against the IPv4 rules by BlockList itself.
 */
export const PRIVATE = rules([
  ['127.0.0.0', 8, 'ipv4'], ['10.0.0.0', 8, 'ipv4'], ['172.16.0.0', 12, 'ipv4'], ['192.168.0.0', 16, 'ipv4'],
  ['100.64.0.0', 10, 'ipv4'], ['192.0.0.0', 24, 'ipv4'], ['192.0.2.0', 24, 'ipv4'], ['198.18.0.0', 15, 'ipv4'],
  ['198.51.100.0', 24, 'ipv4'], ['203.0.113.0', 24, 'ipv4'], ['192.88.99.0', 24, 'ipv4'], ['240.0.0.0', 4, 'ipv4'],
  ['::1', 128, 'ipv6'], ['fc00::', 7, 'ipv6'], ['fec0::', 10, 'ipv6'], ['64:ff9b::', 96, 'ipv6'], ['64:ff9b:1::', 48, 'ipv6'],
  ['2002::', 16, 'ipv6'], ['2001::', 32, 'ipv6'], ['2001:db8::', 32, 'ipv6'], ['::', 96, 'ipv6'], ['::ffff:0:0:0', 96, 'ipv6'],
  ['100::', 64, 'ipv6'],
]);

/** This computer: loopback (also as IPv4-mapped IPv6). */
const LOOPBACK = rules([['127.0.0.0', 8, 'ipv4'], ['::1', 128, 'ipv6']]);
export const isLoopback = ip => { const f = isIP(ip); return !!f && LOOPBACK.check(ip, f === 6 ? 'ipv6' : 'ipv4'); };

const oops = (message, code) => Object.assign(new Error(message), code && { code });

/** Throws when a connection may not go to this address. `module`: whose setting allows the private ones. */
export function checkIp(ip, { allowPrivate = false, module = 'logicstudio-net' } = {}) {
  const family = isIP(ip);
  if (!family) throw oops(`Indirizzo non valido: ${ip}`, 'forbidden');
  const kind = family === 6 ? 'ipv6' : 'ipv4';
  const inner = embeddedIpv4(ip);
  if (NEVER.check(ip, kind) || (inner && NEVER.check(inner, 'ipv4'))) throw oops(`Indirizzo non permesso: ${ip}`, 'forbidden');
  if (!allowPrivate && PRIVATE.check(ip, kind)) {
    throw oops(`Indirizzo non permesso: ${ip} è di questo computer o della rete locale (l'amministratore può permetterlo nelle impostazioni del modulo ${module})`, 'forbidden');
  }
}

/** A `lookup` for http.request / net.connect: resolves the name and checks every address it gives. */
export function guardedLookup(options) {
  return (host, opts, callback) => {
    if (typeof opts === 'function') [callback, opts] = [opts, {}];
    const o = typeof opts === 'number' ? { family: opts } : opts ?? {};
    dns.lookup(host, { ...o, all: true }, (err, list) => {
      if (err) return callback(err);
      if (!list.length) return callback(Object.assign(new Error(`Nessun indirizzo per ${host}`), { code: 'ENOTFOUND' }));
      try {
        for (const a of list) {
          checkIp(a.address, options);
          options.extra?.(a.address);
        }
      } catch (refused) {
        return callback(refused);
      }
      if (o.all) callback(null, list);
      else callback(null, list[0].address, list[0].family);
    });
  };
}

/** The addresses of a name (or the IP itself), every one checked: [{ address, family }]. */
export async function resolveChecked(host, options = {}) {
  const name = String(host ?? '').trim().replace(/^\[(.*)\]$/, '$1');
  if (!name) throw oops('Manca il server');
  if (name.length > 253 || /[\0-\x20\x7f/\\@]/.test(name)) throw oops(`Nome del server non valido: ${name.slice(0, 80)}`);
  const list = isIP(name) ? [{ address: name, family: isIP(name) }] : await dns.promises.lookup(name, { all: true, order: 'ipv4first' }).catch(err => {
    throw oops(err.code === 'ENOTFOUND' ? `Server sconosciuto: ${name}` : `Server non raggiungibile: ${name} (${err.code ?? err.message})`, 'unreachable');
  });
  if (!list.length) throw oops(`Nessun indirizzo per ${name}`, 'unreachable');
  for (const a of list) {
    checkIp(a.address, options);
    options.extra?.(a.address);
  }
  return list;
}
