import { oops } from './common.js';

/**
 * Who may use which device classes. Administrators always may; everyone else only what an
 * administrator allowed: for everyone (defaultAllow) or for them (users[id], which wins over the
 * default either way). Nothing allowed out of the box. Kept in <dataDir>/policy.json:
 *
 *   { defaultAllow: { serial: false, … }, users: { <userId>: { camera: true, … } } }
 */

export const CLASSES = Object.freeze(['serial', 'usb', 'hid', 'camera', 'audio', 'midi', 'system', 'gpio']);

/** The classes as the error messages say them. */
export const CLASS_NAMES = Object.freeze({
  serial: 'le porte seriali',
  usb: 'i dispositivi USB',
  hid: 'i dispositivi HID',
  camera: 'la webcam',
  audio: "l'audio (microfono, altoparlanti, voce)",
  midi: 'i dispositivi MIDI',
  system: 'le informazioni di sistema e le stampanti',
  gpio: 'GPIO e I²C',
});

const USER_ID = /^[\w-]{1,64}$/;
const MAX_USERS = 10000;

const classes = raw => {
  const out = {};
  for (const c of CLASSES) if (typeof raw?.[c] === 'boolean') out[c] = raw[c];
  return out;
};

/** The policy as stored: only known classes, booleans, valid user ids. */
export function cleanPolicy(raw) {
  const defaultAllow = Object.fromEntries(CLASSES.map(c => [c, raw?.defaultAllow?.[c] === true]));
  const users = {};
  const given = raw?.users && typeof raw.users === 'object' && !Array.isArray(raw.users) ? raw.users : {};
  for (const [id, v] of Object.entries(given).slice(0, MAX_USERS)) {
    if (!USER_ID.test(id)) continue;
    const c = classes(v);
    if (Object.keys(c).length) users[id] = c;
  }
  return { defaultAllow, users };
}

/** A policy sent by an administrator (PUT /admin/policy): refused when not valid. */
export function checkPolicy(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw oops('Politica non valida: serve un oggetto { defaultAllow, users }');
  for (const [k, v] of Object.entries(raw.defaultAllow ?? {})) {
    if (!CLASSES.includes(k) || typeof v !== 'boolean') throw oops(`Politica non valida: defaultAllow.${k}`);
  }
  const users = raw.users ?? {};
  if (typeof users !== 'object' || Array.isArray(users)) throw oops('Politica non valida: users');
  if (Object.keys(users).length > MAX_USERS) throw oops(`Politica non valida: al massimo ${MAX_USERS} utenti`);
  for (const [id, v] of Object.entries(users)) {
    if (!USER_ID.test(id)) throw oops(`Politica non valida: utente ${id.slice(0, 40)}`);
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw oops(`Politica non valida: users.${id}`);
    for (const [k, b] of Object.entries(v)) if (!CLASSES.includes(k) || typeof b !== 'boolean') throw oops(`Politica non valida: users.${id}.${k}`);
  }
  return cleanPolicy(raw);
}

export const isAdmin = user => user?.role === 'admin';

export function allowed(policy, user, cls) {
  if (!CLASSES.includes(cls)) return false;
  if (isAdmin(user)) return true;
  const mine = policy?.users?.[user?.id]?.[cls];
  if (typeof mine === 'boolean') return mine;
  return policy?.defaultAllow?.[cls] === true;
}

export const denied = cls => oops(`Non hai il permesso di usare ${CLASS_NAMES[cls] ?? cls}: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware)`);
