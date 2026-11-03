import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DATA_DIR } from './runtime.js';

/**
 * The program's settings on this computer (settings.json in its data folder): they belong to the
 * computer, not to a user of lilOS.
 *   profiles      [{ id, name, kind: 'local' | 'remote', url, trusted }]   where lilOS is
 *                 local: the lilOS the program runs here; remote: a lilOS elsewhere (or one
 *                 installed by hand on this computer), opened at its address
 *   last          the id of the profile opened last
 *   local         { installed, port, pgPort, pgPassword, dir }   the lilOS run here; dir: its folder
 *                 when the installation settings chose one (else <data>/lilos)
 *   display       'window' | 'fullscreen' | 'kiosk'; monitor: id of the display, or null
 *   kioskKeys     the Windows key and Alt+Tab go to lilOS in full screen (Keyboard Lock)
 *   startAtLogin  the program starts with the computer (the kernel, without the window)
 *   stayInTray    closing the window leaves the program in the tray (else: quit)
 *   notifications lilOS's notifications become the system's when the window is not in front
 *   updates       'auto' | 'notify' | 'off': updates of the program (not of lilOS)
 *   hardware      'ask' | 'declared' | 'all': which apps use devices without being asked
 *   bounds        the window's last position and size
 *   updating      the version of the program downloaded by the updater, installed when it quits:
 *                 its first start is not a new installation (installFile.js, justInstalled)
 */
const FILE = join(DATA_DIR, 'settings.json');
const MODES = ['window', 'fullscreen', 'kiosk'];
const UPDATES = ['auto', 'notify', 'off'];
const HARDWARE = ['ask', 'declared', 'all'];

const DEFAULTS = () => ({
  profiles: [], last: null,
  local: { installed: false, port: null, pgPort: null, pgPassword: null, dir: null },
  display: 'window', monitor: null, kioskKeys: true,
  startAtLogin: false, stayInTray: true, notifications: true,
  updates: process.platform === 'darwin' ? 'notify' : 'auto',
  hardware: 'declared',
  bounds: null,
  updating: null,
});

let data = null;

function load() {
  if (data) return data;
  const base = DEFAULTS();
  try {
    const raw = JSON.parse(readFileSync(FILE, 'utf8'));
    data = { ...base, ...raw, local: { ...base.local, ...raw.local } };
  } catch {
    data = base;
  }
  if (!Array.isArray(data.profiles)) data.profiles = [];
  data.profiles = data.profiles.filter(p => p && typeof p.id === 'string' && (p.kind === 'local' || p.kind === 'remote'));
  if (!MODES.includes(data.display)) data.display = 'window';
  if (!UPDATES.includes(data.updates)) data.updates = base.updates;
  if (!HARDWARE.includes(data.hardware)) data.hardware = 'declared';
  return data;
}

function save() {
  mkdirSync(dirname(FILE), { recursive: true });
  // The local database's password is here: readable only by this account (no effect on Windows)
  writeFileSync(`${FILE}.tmp`, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  renameSync(`${FILE}.tmp`, FILE);
}

/** Back to the settings of a new installation (start from zero). */
export function reset() {
  data = DEFAULTS();
  save();
}

/** Values for this run only, never saved (the Linux session forces kiosk). */
let overrides = {};
export const override = values => { overrides = { ...overrides, ...values }; };

export const settings = () => ({ ...load(), ...overrides });

/** Changes the settings: fn(data) changes them in place. */
export function update(fn) {
  load();
  fn(data);
  save();
  return data;
}

/** What the page of lilOS may read and change (Pannello di controllo → Computer). */
export const PUBLIC_KEYS = ['display', 'monitor', 'kioskKeys', 'startAtLogin', 'stayInTray', 'notifications', 'updates', 'hardware'];

export function publicSettings() {
  const s = settings();
  return Object.fromEntries(PUBLIC_KEYS.map(k => [k, s[k]]));
}

/** Checks one value the page wants to set: the clean value, or throws. */
export function checkSetting(key, value) {
  switch (key) {
    case 'display': if (MODES.includes(value)) return value; break;
    case 'updates': if (UPDATES.includes(value)) return value; break;
    case 'hardware': if (HARDWARE.includes(value)) return value; break;
    case 'monitor': if (value === null || (Number.isInteger(value) && value >= 0)) return value; break;
    case 'kioskKeys': case 'startAtLogin': case 'stayInTray': case 'notifications':
      if (typeof value === 'boolean') return value;
      break;
    default: throw new Error(`Impostazione sconosciuta: ${key}`);
  }
  throw new Error(`Valore non valido per ${key}`);
}

export function addProfile({ name, kind, url, trusted = false }) {
  const profile = { id: randomUUID(), name: String(name).slice(0, 80), kind, url, trusted: !!trusted };
  update(d => { d.profiles.push(profile); });
  return profile;
}

export const profile = id => load().profiles.find(p => p.id === id) ?? null;
export const localProfile = () => load().profiles.find(p => p.kind === 'local') ?? null;
