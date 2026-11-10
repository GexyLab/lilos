import { fs, uid } from '@lilos/sdk';
import { t } from './i18n.js';

/**
 * .nwsession files: a session of NetWave, all the tabs of one window. JSON, readable with the Editor:
 *   { format: 'netwave-session', version: 1, id, name, savedAt, autosave, active, tabs: [{ url, title, pinned? }] }
 * Only addresses and titles: never cookies, passwords, form data or permissions.
 * `id` stays the same when the file is moved or renamed: history knows the session by it.
 */
export const FORMAT = 'netwave-session';
export const EXT = 'nwsession';
const FOLDER = 'Sessioni NetWave';
const TEXT_MAX = 2 << 20;
const TABS_MAX = 500;
const SCHEME = /^(https?:\/\/|about:blank$)/i;

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

export function parseSession(text) {
  let raw;
  try { raw = JSON.parse(String(text).slice(0, TEXT_MAX)); } catch { raw = null; }
  if (!raw || typeof raw !== 'object' || raw.format !== FORMAT || raw.version !== 1 || !Array.isArray(raw.tabs)) throw new Error(t('session.invalid'));
  const tabs = raw.tabs.slice(0, TABS_MAX)
    .filter(x => x && typeof x.url === 'string' && SCHEME.test(x.url))
    .map(x => ({ url: x.url.slice(0, 4000), title: str(x.title, 300), ...(x.pinned === true && { pinned: true }) }));
  const active = Number.isInteger(raw.active) && raw.active >= 0 && raw.active < tabs.length ? raw.active : 0;
  return {
    id: /^[A-Za-z0-9_-]{4,40}$/.test(raw.id ?? '') ? raw.id : uid(),
    name: str(raw.name, 120).trim(),
    savedAt: str(raw.savedAt, 40),
    autosave: raw.autosave === true,
    active, tabs,
  };
}

export const sessionText = s => `${JSON.stringify({
  format: FORMAT, version: 1, id: s.id, name: s.name, savedAt: new Date().toISOString(),
  autosave: !!s.autosave, active: s.active ?? 0, tabs: s.tabs,
}, null, 2)}\n`;

/** The name of a session from its file (without .nwsession). */
export const nameOfFile = node => node?.name?.replace(/\.nwsession$/i, '') ?? '';

/** Documenti › Sessioni NetWave, made when missing (null without Documenti). */
export function defaultFolder() {
  const docs = fs.resolve('~/Documenti');
  if (docs?.type !== 'folder') return null;
  const found = fs.children(docs.id).find(n => n.type === 'folder' && n.name.toLowerCase() === FOLDER.toLowerCase());
  return found ?? fs.create(docs.id, { type: 'folder', name: FOLDER });
}

export async function readSession(id) {
  const node = fs.get(id);
  if (node?.type !== 'file') throw new Error(t('session.missing'));
  const s = parseSession(await fs.read(id));
  return { ...s, name: s.name || nameOfFile(node) };
}

/** Writes a session in a new file of `folderId` (the name made unique). */
export async function createSession(folderId, session) {
  const clean = fs.cleanName(session.name, { portable: true }) || t('session.untitled');
  const node = fs.create(folderId, { type: 'file', name: fs.uniqueName(folderId, `${clean}.${EXT}`) });
  await fs.write(node.id, sessionText(session));
  return node;
}

export async function writeSession(id, session) {
  if (!fs.exists(id)) throw new Error(t('session.missing'));
  await fs.write(id, sessionText(session));
}
