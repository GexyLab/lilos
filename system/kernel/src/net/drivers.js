import { KernelError, fail } from '../errors.js';

/**
 * Network protocols for the Rete folder: a kernel module provides one as the service
 * 'netfs.<protocol>' (netfs-sftp gives 'netfs.sftp'; a module may give several). The kernel finds
 * them when it starts; without any, Rete has nothing to offer.
 *
 *   label        string | { en, it, … }   the name the user picks ('SFTP (SSH)')
 *   order?       number                   its place in the list (lower first)
 *   group?       'server' | 'cloud' | 'local'   the part of the list it is in (servers by default)
 *   fields       [field]                  what a connection asks for, in order
 *   connect(values, ctx) → session
 *       values   the fields' values (secret ones excepted)
 *       ctx.secret     { key: value } of the secret fields (password, private key…), {} if none
 *       ctx.trust      the fingerprint the user confirmed for this server (see 'untrusted' below), or
 *                      null: the same for the Terminal (knownHosts.js, by kind, host and port)
 *       ctx.saveSecret(secret)  keeps a new secret instead of the one given (a token the provider renewed)
 *       ctx.user       who connects: { id, username, role, multiUser } (multiUser: lilOS has several users)
 *       ctx.lookup     (since lilOS 1.22.0) node's dns.lookup(hostname, options, callback), giving only
 *                      addresses the kernel may connect to (guard.js): pass it to net/tls/http(s)
 *                      connect, so the name cannot point elsewhere after the kernel checked it
 *       ctx.paths      (since lilOS 1.22.0) cleanPath, joinPath, parentOf, baseName, isSafeName,
 *                      cleanName (below)
 *       ctx.tokens     (since lilOS 1.22.0) with `oauth`: the account's tokens (oauth.js), or null
 *   shares?(values, ctx) → [name]                  what a server offers to connect to (SMB shares,
 *                                                  S3 buckets, the drives of an account); ctx as connect's
 *   address(values) → string                      how the connection is shown ('sftp://ann@host/www')
 *   check?(values)                                 throws (with `net`) if the values cannot be used as they are
 *   ready?() → null | label                        why the protocol cannot be used yet (a module setting
 *                                                  missing): the page says it instead of the fields
 *   oauth?                                         (since lilOS 1.22.0) for a 'signin' field: the provider
 *                                                  and what to ask it; the kernel signs in and renews
 *                                                  the tokens (oauth.js), and makes signIn
 *   signIn?                                        for a 'signin' field without `oauth`: the provider's page
 *                                                  (OAuth 2.0 with PKCE, see signin.js)
 *     start({ values, redirectUri, state, challenge, lookup }) → url
 *     finish({ values, code, redirectUri, verifier, lookup }) → { account, secret }   account: what the field
 *                                                  shows ('ann@example.com'), secret: what connect gets
 *     manual?: true                                the sign-in may also end on a page of this computer
 *                                                  that does not open (signin.js MANUAL_REDIRECT): the
 *                                                  user pastes its address in lilOS. For providers
 *                                                  that send back only to https with a domain name
 *     onlyManual?() → true                         only that way (the provider's app has no other address)
 *   links?: { office? }                            sessions have link(path); office: the link of an
 *                                                  Office document opens it in Office for the web
 *   recycles?: true                                what is removed goes to the server's own recycle bin
 *   removeText?: label                             what removing does there, for the confirmation
 *                                                  ('they leave the album and stay in Google Photos')
 *   space?: true                                   sessions have space() → { used, total } (bytes;
 *                                                  total 0 when there is no limit)
 *   importer?: { label }                           sessions have importer: the user picks on the
 *                                                  provider's page what to copy, then the kernel copies
 *                                                  it (a folder of the session) where the user says:
 *     start() → { id, url }                        url: the provider's page (https), in a new tab
 *     poll(id) → { status: 'pending' | 'done' | 'error', count?, size?, path?, error? }
 *                                                  path: the folder with what was picked, once done
 *
 *   field: { key, type, label, required?, secret?, default?, placeholder?, hint?, when?, options?, min?, max?, button? }
 *     type      'text' | 'textarea' | 'number' | 'password' | 'select' | 'checkbox' | 'file' | 'signin'
 *               ('file': the text of a file the user picks in lilOS, such as a private key;
 *               'signin': an account the user signs in to on the provider's page, `button` its
 *               label: the value is the account, the secret what the sign-in gave, both set only
 *               by a sign-in)
 *     label     string | { en, it, … }; hint the same, a line under the field
 *     secret    kept encrypted, never sent back to the page (password and the like)
 *     when      { key: value | [values] }: shown only when those fields have those values
 *     options   for 'select': [{ value, label, disabled? }]   disabled: shown, not chosen («coming»)
 *     min, max  for 'number'
 *
 * session (paths are absolute in the connection: '/' is its root, as the user chose it):
 *   list(path) → [{ name, type: 'file' | 'folder', size, modified, link? }]   link: a symbolic link
 *                                                      (to a folder: never walked into, removed as itself)
 *       an entry may also have (cleanEntry):
 *       web?: label        no bytes of its own (a Google document): it opens on the provider's site
 *                          (link); `export` is the extension it is copied as (read with `format`),
 *                          without it it is not copied
 *       badge?: label      a short word beside the name ('archived')
 *       can?: { rename?: false, remove?: false }   what cannot be done to it
 *       removeLabel?: label   the menu's words for removing it ('Remove from album')
 *   stat(path) → entry | null
 *   read(path, { start, signal, format }) → Readable  bytes from `start`; format: an entry's `export`
 *   write(path, source, { start, signal, size? })      a file from a stream; start > 0 adds to what is
 *                                                      there (resuming), only when resume.write; size:
 *                                                      the bytes the stream brings, when known
 *   mkdir(path); rename(from, to); remove(path, { folder })   folder: an empty folder
 *   removeTree?(path)                                  a folder with everything inside it, in one go
 *   link?(path) → 'https://…'                          the page of a file or folder on the provider's site
 *   watch?(path, onChange) → stop()                    tells when what is in a folder changes; stop()
 *                                                      may return a promise: resolved once the folder is
 *                                                      no longer held open
 *   resume: { read, write }                            whether read and write can start midway
 *   onLost?(fn)                                        fn() when the connection drops by itself
 *   close()
 *
 * Errors a driver throws carry `net`, what went wrong (any other error is reported as it is):
 *   'auth' wrong credentials · 'untrusted' a server to confirm, with `trust` { kind: 'ssh' | 'tls',
 *   fingerprint, text } · 'not_found' · 'exists' · 'denied' · 'unreachable' (cannot connect) ·
 *   'lost' (the connection dropped) · 'unsupported' · 'invalid'
 */
export const DRIVER_PREFIX = 'netfs.';
export const FIELD_TYPES = new Set(['text', 'textarea', 'number', 'password', 'select', 'checkbox', 'file', 'signin']);
const KEY = /^[a-z][a-zA-Z0-9]{0,30}$/;

/**
 * The protocols the active modules provide: Map id → driver. Drivers with a malformed description
 * are left out. One with `oauth` is bound to its provider's app (oauth.js OAuthApps.bind).
 */
export function findDrivers(services, log, oauth = null) {
  const drivers = new Map();
  for (const [name, impl] of services) {
    if (!name.startsWith(DRIVER_PREFIX)) continue;
    const id = name.slice(DRIVER_PREFIX.length);
    try {
      if (!/^[a-z][a-z0-9-]{0,30}$/.test(id)) throw new Error('nome non valido');
      if (typeof impl?.connect !== 'function' || typeof impl.address !== 'function') throw new Error('mancano connect() o address()');
      if (!Array.isArray(impl.fields) || impl.fields.some(f => !KEY.test(f?.key ?? '') || !FIELD_TYPES.has(f.type))) throw new Error('campi non validi');
      if (impl.oauth) {
        if (!oauth) throw new Error('oauth senza il kernel che lo gestisce');
        drivers.set(id, oauth.bind(id, impl));
        continue;
      }
      if (impl.fields.some(f => f.type === 'signin') && (typeof impl.signIn?.start !== 'function' || typeof impl.signIn.finish !== 'function')) throw new Error('un campo signin senza signIn.start() e signIn.finish()');
      drivers.set(id, impl);
    } catch (err) {
      log.warn(`Protocollo ${name} ignorato: ${err.message}`);
    }
  }
  return drivers;
}

/** Why a protocol cannot be used yet (its ready()), or null. */
export function notReady(d) {
  try {
    return d.ready?.() ?? null;
  } catch {
    return 'Protocollo non pronto';
  }
}

/** True if the protocol's sign-in can only end by pasting the address (signIn.onlyManual()). */
export function onlyManual(d) {
  try {
    return !!d.signIn?.manual && d.signIn.onlyManual?.() === true;
  } catch {
    return false;
  }
}

const GROUPS = new Set(['server', 'cloud', 'local']);

/** How the page sees a protocol (what the dialog needs to draw its fields). */
export const protocolInfo = (id, d) => ({
  id, label: d.label, order: Number.isFinite(d.order) ? d.order : 100, canListShares: typeof d.shares === 'function',
  group: GROUPS.has(d.group) ? d.group : 'server',
  links: !!d.links, office: !!d.links?.office, recycles: d.recycles === true, notReady: notReady(d),
  space: d.space === true, importer: d.importer ? { label: cleanLabel(d.importer.label) } : null,
  removeText: cleanLabel(d.removeText),
  signIn: d.signIn ? { manual: d.signIn.manual === true, onlyManual: onlyManual(d) } : null,
  fields: d.fields.map(f => ({
    key: f.key, type: f.type, label: f.label, required: !!f.required, secret: !!f.secret || f.type === 'signin',
    ...(f.button !== undefined && { button: f.button }),
    ...(f.default !== undefined && { default: f.default }),
    ...(f.placeholder !== undefined && { placeholder: f.placeholder }),
    ...(f.hint !== undefined && { hint: f.hint }),
    ...(f.when && { when: f.when }),
    ...(f.options && { options: f.options }),
    ...(f.min !== undefined && { min: f.min }),
    ...(f.max !== undefined && { max: f.max }),
  })),
});

const TEXT_MAX = { text: 1024, password: 4096, textarea: 64 << 10, file: 64 << 10 };

/**
 * The fields of a connection as the page sent them → { values, secret }, checked against the
 * driver. Throws 'invalid'. 'signin' fields are left out: only a sign-in sets them (network.js).
 */
export function checkFields(driver, raw, rawSecret = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('invalid', 'Valori della connessione non validi');
  const values = {}, secret = {};
  for (const f of driver.fields) {
    if (f.type === 'signin') continue;
    const v = f.secret ? rawSecret?.[f.key] : raw[f.key];
    if (v === undefined || v === null || v === '') {
      if (f.default !== undefined && !f.secret) values[f.key] = f.default;
      continue;
    }
    let value;
    if (f.type === 'checkbox') value = v === true;
    else if (f.type === 'number') {
      value = Number(v);
      if (!Number.isInteger(value) || (f.min !== undefined && value < f.min) || (f.max !== undefined && value > f.max)) fail('invalid', `Valore non valido: ${f.key}`);
    } else if (f.type === 'select') {
      if (!f.options?.some(o => o.value === v && !o.disabled)) fail('invalid', `Valore non valido: ${f.key}`);
      value = v;
    } else {
      if (typeof v !== 'string' || v.length > TEXT_MAX[f.type]) fail('invalid', `Valore non valido: ${f.key}`);
      value = f.type === 'text' ? v.trim() : v;
    }
    (f.secret ? secret : values)[f.key] = value;
  }
  return { values, secret };
}

/** True if a field is shown with these values (its `when`). */
export function fieldShown(f, values) {
  if (!f.when) return true;
  return Object.entries(f.when).every(([k, want]) => (Array.isArray(want) ? want.includes(values[k]) : values[k] === want));
}

/** The required fields (shown ones) that have no value: their keys. A 'signin' field needs both its account and its secret. */
export function missingFields(driver, values, secret) {
  const empty = v => v === undefined || v === '';
  return driver.fields.filter(f => f.required && fieldShown(f, values) && (
    f.type === 'signin' ? empty(values[f.key]) || !secret[f.key] : f.secret ? !secret[f.key] : empty(values[f.key]))).map(f => f.key);
}

/** The 'signin' fields of a driver. */
export const signInFields = driver => driver.fields.filter(f => f.type === 'signin');

/**
 * A path in a connection, made safe: absolute, '/' between parts, no '.', '..' or empty parts,
 * no control characters. Throws 'invalid'.
 */
export function cleanPath(path) {
  if (typeof path !== 'string' || path.length > 4096 || /[\0-\x1f]/.test(path)) fail('invalid', 'Percorso non valido');
  const parts = path.split('/').filter(Boolean);
  if (parts.some(p => p === '.' || p === '..' || p.length > 255)) fail('invalid', 'Percorso non valido');
  return `/${parts.join('/')}`;
}

export const joinPath = (dir, name) => (dir === '/' ? `/${name}` : `${dir}/${name}`);

/**
 * A name that came from a server and may be used: one part, not '.' or '..', no '/', control
 * characters or text-direction overrides (they would make 'exe.txt' look like 'txt.exe').
 * Others are left out of listings, transfers and new names.
 */
export const isSafeName = name => isUsableName(name) && !/[\u202a-\u202e\u2066-\u2069]/.test(name);

/** A name that is no danger as part of a path: removing it is fine (showing it may not be). */
export const isUsableName = name => typeof name === 'string' && name.length > 0 && name.length <= 255
  && name !== '.' && name !== '..' && !/[/\0-\x1f\x7f]/.test(name);

/**
 * A label a driver gives (a text, or { en, it, … }), kept short and plain for the page; null if it
 * is not one.
 */
export function cleanLabel(v, max = 120) {
  const plain = s => typeof s === 'string' && s.length > 0 && s.length <= max && !/[\0-\x1f‪-‮⁦-⁩]/.test(s);
  if (plain(v)) return v;
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const out = {};
  for (const [lang, s] of Object.entries(v).slice(0, 12)) if (/^[a-z]{2}(-[A-Z]{2})?$/.test(lang) && plain(s)) out[lang] = s;
  return Object.keys(out).length ? out : null;
}

/**
 * An entry of a driver's list or stat as the kernel passes it on: the known keys only, checked
 * (the name is checked by whoever uses it).
 */
export function cleanEntry(e) {
  if (!e || typeof e !== 'object') return null;
  const out = { name: e.name, type: e.type === 'folder' ? 'folder' : 'file', size: Number(e.size) || 0, modified: Number(e.modified) || 0 };
  if (e.link) out.link = true;
  const web = cleanLabel(e.web === true ? 'web' : e.web, 60);
  if (web && out.type === 'file') {
    out.web = web;
    if (typeof e.export === 'string' && /^[a-z0-9]{1,10}$/.test(e.export)) out.export = e.export;
  }
  const badge = cleanLabel(e.badge, 40);
  if (badge) out.badge = badge;
  if (e.can && typeof e.can === 'object') {
    const can = {};
    if (e.can.rename === false) can.rename = false;
    if (e.can.remove === false) can.remove = false;
    if (Object.keys(can).length) out.can = can;
  }
  const removeLabel = cleanLabel(e.removeLabel, 60);
  if (removeLabel) out.removeLabel = removeLabel;
  return out;
}

export const parentOf = path => path.slice(0, path.lastIndexOf('/')) || '/';
export const baseName = path => path.slice(path.lastIndexOf('/') + 1);

/** A name for a file or folder on a server: a safe one (isSafeName). Throws 'invalid'. */
export function cleanName(name) {
  if (!isSafeName(name)) fail('invalid', 'Nome non valido');
  return name;
}

const MESSAGES = {
  auth: 'Utente o password non validi',
  not_found: 'Non esiste sul server',
  exists: 'Esiste già sul server',
  denied: 'Il server non lo permette',
  unreachable: 'Server non raggiungibile',
  lost: 'Connessione persa',
  unsupported: 'Il server non lo supporta',
  invalid: 'Richiesta non valida per il server',
};

/** A driver's error as the kernel reports it (KernelError), with the server's message when it gave one. */
export function netFail(err, what = '') {
  if (err instanceof KernelError) throw err;
  if (err?.name === 'AbortError') throw err;
  const prefix = what ? `${what}: ` : '';
  const text = String(err?.message ?? err ?? '').slice(0, 300);
  switch (err?.net) {
    case 'auth': return fail('secret_required', `${prefix}${MESSAGES.auth}`, { details: { reason: 'auth' } });
    case 'untrusted': return fail('untrusted', `${prefix}${text || 'Server da confermare'}`, { details: { trust: err.trust } });
    case 'not_found': return fail('not_found', `${prefix}${MESSAGES.not_found}`);
    case 'exists': return fail('conflict', `${prefix}${MESSAGES.exists}`);
    case 'denied': return fail('forbidden', `${prefix}${MESSAGES.denied}${text ? ` (${text})` : ''}`);
    case 'unreachable': case 'lost': return fail('unavailable', `${prefix}${MESSAGES[err.net]}${text ? ` (${text})` : ''}`);
    case 'unsupported': case 'invalid': return fail('invalid', `${prefix}${MESSAGES[err.net]}${text ? ` (${text})` : ''}`);
    default: return fail('unavailable', `${prefix}${text || 'Errore del server'}`);
  }
}

/** True for errors after which a new connection may help (the connection itself failed). */
export const isConnectionError = err => err?.net === 'lost' || err?.net === 'unreachable';
