import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { JsonStore, readJson, removeJson, userFile, writeJson } from '../jsonFile.js';

/**
 * The servers whose key or certificate each user confirmed, for the Rete folder and the Terminal
 * alike: confirmed once (an SFTP connection), it counts for an SSH terminal to the same server too.
 * In DATA_DIR/net/known-<user>.json:
 *
 *   { version: 1, hosts: { '<kind>:<host>:<port>': { fingerprint, at } } }
 *     kind   'ssh' (the server's host key) | 'tls' (its certificate)
 *     host   in lower case; port: the one connected to (the protocol's usual one when not given)
 *
 * Before lilOS 1.22.0 each connection of the Rete folder kept its own (`trust`) and the Terminal
 * its own (`known`, by protocol): migrate() brings both here, once.
 */
export const TRUST_KINDS = ['ssh', 'tls'];

/** The kind of a fingerprint: an SSH key's is 'SHA256:<base64>', a certificate's 'AB:CD:…' (hex). */
export const kindOfFingerprint = fingerprint => (/^SHA256:/.test(String(fingerprint ?? '')) ? 'ssh' : 'tls');

const URL_PORTS = { 'https:': 443, 'http:': 80, 'ftps:': 990, 'ftp:': 21 };

/**
 * The server of a connection: { host, port } from its values (host and port, or the address of a
 * `url`), `port` the protocol's usual one when the values have none. null without a host.
 */
export function serverOf(values, port = null) {
  let host = typeof values?.host === 'string' ? values.host.trim() : '';
  let found = values?.port;
  if (!host && typeof values?.url === 'string') {
    try {
      const url = new URL(values.url);
      host = url.hostname.replace(/^\[|\]$/g, '');
      found ??= url.port ? Number(url.port) : URL_PORTS[url.protocol];
    } catch { /* no server, then */ }
  }
  if (!host) return null;
  const p = Number(found ?? port);
  return { host: host.toLowerCase(), port: Number.isInteger(p) && p > 0 ? p : null };
}

const keyOf = (kind, { host, port }) => `${kind}:${host}:${port ?? ''}`;

export class KnownHosts {
  #dir;
  #stores = new Map();    // user id → JsonStore

  constructor(dir) {
    this.#dir = dir;
  }

  #store(userId) {
    let store = this.#stores.get(userId);
    if (!store) {
      store = new JsonStore(userFile(this.#dir, userId, 'known-'), { clean: cleanKnown, invalid: 'empty' });
      this.#stores.set(userId, store);
    }
    return store;
  }

  /** Reads the user's file (then peek() answers at once). */
  async load(userId) {
    await this.#store(userId).read();
  }

  /** The fingerprint confirmed for this server, of this kind (or of any kind: null), without waiting; null if none or not loaded. */
  peek(userId, kind, server) {
    const hosts = this.#store(userId).current?.hosts;
    if (!hosts || !server) return null;
    const found = (kind ? [kind] : TRUST_KINDS).map(k => hosts[keyOf(k, server)]).filter(Boolean).sort((a, b) => b.at - a.at)[0];
    return found?.fingerprint ?? null;
  }

  /** The fingerprint confirmed for this server: of this kind, or (kind null) the last confirmed of any. */
  async get(userId, kind, server) {
    await this.load(userId);
    return this.peek(userId, kind, server);
  }

  /** The user confirmed this fingerprint for this server. */
  async set(userId, kind, server, fingerprint) {
    if (!server || !TRUST_KINDS.includes(kind) || typeof fingerprint !== 'string' || !fingerprint || fingerprint.length > 200) return;
    await this.#store(userId).change(data => { data.hosts[keyOf(kind, server)] = { fingerprint, at: Date.now() }; });
  }

  /** The user's servers go (the user was deleted). */
  async forget(userId) {
    this.#stores.delete(userId);
    await removeJson(userFile(this.#dir, userId, 'known-'));
  }

  /**
   * Once, before the users' files are used: the server keys the Terminal kept (termDir/<user>.json
   * `known`: '<protocol>:<host>:<port>' → fingerprint, port '' for the usual one: termPort(protocol))
   * and the fingerprints of the Rete connections (netDir/<user>.json, `trust` of each) come here;
   * those files lose them. What is here already stays.
   */
  static async migrate({ netDir, termDir, termPort = () => null }) {
    const moved = new Map();   // the user's file name → { key: { fingerprint, at } }
    const add = (file, kind, server, fingerprint) => {
      if (!server || typeof fingerprint !== 'string' || !fingerprint) return;
      const hosts = moved.get(file) ?? {};
      hosts[keyOf(kind, server)] ??= { fingerprint, at: 0 };
      moved.set(file, hosts);
    };
    const users = async dir => (await readdir(dir).catch(() => [])).filter(n => /^[a-f0-9]{32}\.json$/.test(n));
    for (const name of await users(termDir)) {
      const data = await readJson(join(termDir, name)).catch(() => null);
      if (!data?.known || typeof data.known !== 'object') continue;
      for (const [k, fingerprint] of Object.entries(data.known)) {
        const first = k.indexOf(':'), last = k.lastIndexOf(':');
        if (first < 1 || last <= first) continue;
        const protocol = k.slice(0, first);
        const server = serverOf({ host: k.slice(first + 1, last), port: k.slice(last + 1) ? Number(k.slice(last + 1)) : undefined }, termPort(protocol));
        add(name, kindOfFingerprint(fingerprint), server, fingerprint);
      }
      delete data.known;
      await writeJson(join(termDir, name), data, { pretty: true });
    }
    for (const name of await users(netDir)) {
      const list = await readJson(join(netDir, name)).catch(() => null);
      if (!Array.isArray(list) || !list.some(r => r && 'trust' in r)) continue;
      for (const r of list) {
        if (!r || !('trust' in r)) continue;
        if (typeof r.trust === 'string') add(name, kindOfFingerprint(r.trust), serverOf(r.values), r.trust);
        delete r.trust;
      }
      await writeJson(join(netDir, name), list, { pretty: true });
    }
    for (const [name, hosts] of moved) {
      const file = join(netDir, `known-${name}`);
      const data = cleanKnown(await readJson(file).catch(() => null));
      for (const [k, v] of Object.entries(hosts)) data.hosts[k] ??= v;
      await writeJson(file, data);
    }
    return moved.size;
  }
}

function cleanKnown(raw) {
  const hosts = {};
  for (const [k, v] of Object.entries(raw?.hosts && typeof raw.hosts === 'object' ? raw.hosts : {})) {
    if (/^(ssh|tls):/.test(k) && typeof v?.fingerprint === 'string') hosts[k] = { fingerprint: v.fingerprint, at: Number(v.at) || 0 };
  }
  return { version: 1, hosts };
}
