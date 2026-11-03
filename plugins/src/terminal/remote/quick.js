/**
 * The quick connection: a command line as one would type it in a terminal, or an address.
 *   ssh [-p port] [-l user] [user@]host [command…]      also -t, -4, -6… (ignored)
 *   telnet [-l user] host [port]                         telnets host [port]: over TLS
 *   rlogin [-l user] host
 *   supdup host [port]
 *   ssh://user@host:port · telnet://host:port · telnets://… · rlogin://user@host · supdup://host
 * → { protocol, values } or null.
 */
const SCHEMES = { ssh: 'ssh', telnet: 'telnet', telnets: 'telnet', rlogin: 'rlogin', supdup: 'supdup' };

/** Splits a command line in words ('…' and "…" keep spaces). */
export function words(line) {
  const out = [];
  let cur = null, quote = null;
  for (const ch of String(line)) {
    if (quote) {
      if (ch === quote) quote = null; else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur ??= '';
    } else if (/\s/.test(ch)) {
      if (cur !== null) { out.push(cur); cur = null; }
    } else cur = (cur ?? '') + ch;
  }
  if (cur !== null) out.push(cur);
  return out;
}

const port = text => {
  const n = Number(text);
  return Number.isInteger(n) && n >= 1 && n <= 65535 ? n : null;
};

/** 'user@host' → { user, host }; '[::1]' → { host: '::1' }. */
function target(text) {
  const at = text.lastIndexOf('@');
  const user = at > 0 ? text.slice(0, at) : '';
  const host = (at >= 0 ? text.slice(at + 1) : text).replace(/^\[(.*)\]$/, '$1');
  return { user, host };
}

export function parseQuick(line, protocols = ['ssh', 'telnet', 'rlogin', 'supdup']) {
  const text = String(line ?? '').trim();
  if (!text) return null;
  // An address
  const url = /^([a-z]+):\/\//i.exec(text);
  if (url) {
    const protocol = SCHEMES[url[1].toLowerCase()];
    if (!protocol || !protocols.includes(protocol)) return null;
    let u;
    try { u = new URL(text.replace(/^[a-z]+:/i, 'http:')); } catch { return null; }
    const values = { host: u.hostname.replace(/^\[(.*)\]$/, '$1') };
    if (!values.host) return null;
    if (u.port) values.port = Number(u.port);
    if (u.username) values.user = decodeURIComponent(u.username);
    if (url[1].toLowerCase() === 'telnets') values.tls = true;
    return { protocol, values };
  }
  const [cmd, ...args] = words(text);
  const name = cmd?.toLowerCase();
  const protocol = SCHEMES[name];
  if (!protocol || !protocols.includes(protocol)) return null;
  const values = {};
  if (name === 'telnets') values.tls = true;
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-p' && protocol === 'ssh') { const p = port(args[++i]); if (!p) return null; values.port = p; } else if (a === '-l') values.user = args[++i] ?? '';
    else if (/^-p\d+$/.test(a) && protocol === 'ssh') values.port = port(a.slice(2));
    else if (a.startsWith('-') && !rest.length) continue;   // options that do not matter here
    else rest.push(a);
  }
  if (!rest.length) return null;
  const t = target(rest[0]);
  if (!t.host) return null;
  values.host = t.host;
  if (t.user) values.user = t.user;
  if (protocol === 'ssh' && rest.length > 1) values.command = rest.slice(1).join(' ');
  if (protocol !== 'ssh' && rest[1] !== undefined) {
    const p = port(rest[1]);
    if (!p) return null;
    values.port = p;
  }
  return { protocol, values };
}
