import { KernelError, fail } from '../errors.js';

/**
 * Network protocols for the Rete folder: a kernel module provides one as the service
 * 'netfs.<protocol>' (netfs-sftp gives 'netfs.sftp'; a module may give several). The kernel finds
 * them when it starts; without any, Rete has nothing to offer.
 *
 *   label        string | { en, it, … }   the name the user picks ('SFTP (SSH)')
 *   order?       number                   its place in the list (lower first)
 *   fields       [field]                  what a connection asks for, in order
 *   connect(values, { secret, trust, signal }) → session
 *       values   the fields' values (secret ones excepted)
 *       secret   { key: value } of the secret fields (password, private key…), {} if none
 *       trust    the fingerprint the user confirmed for this server (see 'untrusted' below), or null
 *   shares?(values, { secret, trust }) → [name]    what a server offers to connect to (SMB shares)
 *   address(values) → string                      how the connection is shown ('sftp://ann@host/www')
 *   check?(values)                                 throws (with `net`) if the values cannot be used as they are
 *
 *   field: { key, type, label, required?, secret?, default?, placeholder?, hint?, when?, options?, min?, max? }
 *     type      'text' | 'textarea' | 'number' | 'password' | 'select' | 'checkbox' | 'file'
 *               ('file': the text of a file the user picks in lilOS, such as a private key)
 *     label     string | { en, it, … }; hint the same, a line under the field
 *     secret    kept encrypted, never sent back to the page (password and the like)
 *     when      { key: value | [values] }: shown only when those fields have those values
 *     options   for 'select': [{ value, label }]
 *     min, max  for 'number'
 *
 * session (paths are absolute in the connection: '/' is its root, as the user chose it):
 *   list(path) → [{ name, type: 'file' | 'folder', size, modified, link? }]   link: a symbolic link
 *                                                      (to a folder: never walked into, removed as itself)
 *   stat(path) → entry | null
 *   read(path, { start, signal }) → Readable          bytes from `start`
 *   write(path, source, { start, signal, size? })      a file from a stream; start > 0 adds to what is
 *                                                      there (resuming), only when resume.write; size:
 *                                                      the bytes the stream brings, when known
 *   mkdir(path); rename(from, to); remove(path, { folder })   folder: an empty folder
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
export const FIELD_TYPES = new Set(['text', 'textarea', 'number', 'password', 'select', 'checkbox', 'file']);
const KEY = /^[a-z][a-zA-Z0-9]{0,30}$/;

/** The protocols the active modules provide: Map id → driver. Drivers with a malformed description are left out. */
export function findDrivers(services, log) {
  const drivers = new Map();
  for (const [name, impl] of services) {
    if (!name.startsWith(DRIVER_PREFIX)) continue;
    const id = name.slice(DRIVER_PREFIX.length);
    try {
      if (!/^[a-z][a-z0-9-]{0,30}$/.test(id)) throw new Error('nome non valido');
      if (typeof impl?.connect !== 'function' || typeof impl.address !== 'function') throw new Error('mancano connect() o address()');
      if (!Array.isArray(impl.fields) || impl.fields.some(f => !KEY.test(f?.key ?? '') || !FIELD_TYPES.has(f.type))) throw new Error('campi non validi');
      drivers.set(id, impl);
    } catch (err) {
      log.warn(`Protocollo ${name} ignorato: ${err.message}`);
    }
  }
  return drivers;
}

/** How the page sees a protocol (what the dialog needs to draw its fields). */
export const protocolInfo = (id, d) => ({
  id, label: d.label, order: Number.isFinite(d.order) ? d.order : 100, canListShares: typeof d.shares === 'function',
  fields: d.fields.map(f => ({
    key: f.key, type: f.type, label: f.label, required: !!f.required, secret: !!f.secret,
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

/** The fields of a connection as the page sent them → { values, secret }, checked against the driver. Throws 'invalid'. */
export function checkFields(driver, raw, rawSecret = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('invalid', 'Valori della connessione non validi');
  const values = {}, secret = {};
  for (const f of driver.fields) {
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
      if (!f.options?.some(o => o.value === v)) fail('invalid', `Valore non valido: ${f.key}`);
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

/** The required fields (shown ones) that have no value: their keys. */
export function missingFields(driver, values, secret) {
  return driver.fields.filter(f => f.required && fieldShown(f, values) && (f.secret ? !secret[f.key] : values[f.key] === undefined || values[f.key] === '')).map(f => f.key);
}

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
