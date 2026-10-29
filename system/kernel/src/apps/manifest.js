import { createHash, createPublicKey, verify } from 'node:crypto';
import { fail } from '../errors.js';
import { parsePermission, coversPath } from './permissions.js';

/**
 * The manifest of an app package (lilos.json at the root of the package).
 *
 *   {
 *     id: 'acme.notes', version: '1.2.0', kind: 'local' | 'remote', name: 'Note',
 *     icon: { glyph: 'note', color: '#f2c94c' },
 *     publisher: { id: 'acme', name: 'Acme Srl', key?: 'ed25519:<base64>' },
 *     sdk: '1',
 *     description?: 'Appunti veloci',
 *     system?: true,                          only from the official repository: runs inside lilOS, no sandbox
 *     required?: true,                        a system app that cannot be removed or hidden
 *     styles?: ['dist/index.css'],            system apps: stylesheets lilOS loads with the app
 *     entry: 'dist/index.js',                 local: one ES module, with everything it imports bundled
 *     files: { 'dist/index.js': 'sha256-<base64>', … },     every file of the package, with its hash
 *     url: 'https://notes.example.com/',      remote: the page that is the app
 *     libraries: [{ name, version, url, integrity: 'sha384-…', cache?: true }],
 *     permissions: ['fs.read:~/Documenti', 'net:https://api.example.com', …],
 *     contributes: { window: { width, height }, fileTypes: ['md'], commands: [{ id, label, keys }],
 *                    widgets: [{ id, name, width, height, resizable }], settings: [...], actions: [...] },
 *     install: [op], update: [{ from: '<1.2.0', ops: [op] }], uninstall: [op],
 *     signature?: 'ed25519:<base64>'         over the manifest without "signature" (keys sorted)
 *   }
 *
 * Operations (run for each user, the first time they find the app; paths only under '~'):
 *   { op: 'mkdir', path }   { op: 'write', path, text, ifMissing? }   { op: 'copy', from, to, ifMissing? }
 *   { op: 'desktopItem', target: 'app' }   { op: 'tag', name, color? }   { op: 'setting', key, value }
 *   { op: 'remove', path, ask? }   only in uninstall
 */
const ID = /^[a-z0-9][a-z0-9.-]{1,63}$/;
const SEMVER = /^(\d{1,6})\.(\d{1,6})\.(\d{1,6})$/;
const FILE = /^(?!.*\.\.)(?!\/)[\w.-]+(\/[\w.-]+){0,15}$/;
const HASH = /^sha256-[A-Za-z0-9+/]{43}=$/;
const SRI = /^sha(256|384|512)-[A-Za-z0-9+/]+=*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const GLYPH = /^[a-z][a-zA-Z0-9]{1,30}$/;
const EXT = /^[a-z0-9]{0,10}$/;
const KEY = /^[\w.-]{1,64}$/;
const HOME_PATH = /^~(\/[^/\0]{1,255}){1,16}$/;
const MAX = { files: 1000, ops: 100, text: 64 << 10, commands: 30, widgets: 10, permissions: 50, libraries: 30 };

const str = (v, max = 200) => typeof v === 'string' && v.trim() && v.length <= max;
const list = (v, max) => (v === undefined ? [] : Array.isArray(v) && v.length <= max ? v : fail('invalid', 'Elenco troppo lungo o non valido nel manifesto'));

export const parseVersion = v => SEMVER.exec(v)?.slice(1).map(Number) ?? null;
export function compareVersions(a, b) {
  const pa = parseVersion(a), pb = parseVersion(b);
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
}

/** '<1.2.0', '<=1.2.0', '1.2.0' (exact): does `version` match? */
function matchesFrom(range, version) {
  const m = /^(<=?|=)?(\d+\.\d+\.\d+)$/.exec(range);
  if (!m) return false;
  const c = compareVersions(version, m[2]);
  return m[1] === '<' ? c < 0 : m[1] === '<=' ? c <= 0 : c === 0;
}

function checkOps(ops, permissions, where, files) {
  for (const o of list(ops, MAX.ops)) {
    const bad = msg => fail('invalid', `Operazione "${o?.op}" in ${where}: ${msg}`);
    if (!o || typeof o !== 'object') bad('non valida');
    const homePath = p => (typeof p === 'string' && HOME_PATH.test(p) && !p.split('/').includes('..')) || bad(`percorso non valido ${String(p).slice(0, 60)}`);
    const writable = p => coversPath(permissions, p) || bad(`serve il permesso fs.write per ${p}`);
    switch (o.op) {
      case 'mkdir': homePath(o.path); writable(o.path); break;
      case 'write':
        homePath(o.path); writable(o.path);
        if (typeof o.text !== 'string' || o.text.length > MAX.text) bad('testo mancante o troppo lungo');
        break;
      case 'copy':
        homePath(o.to); writable(o.to);
        if (!files[o.from]) bad(`il file ${String(o.from).slice(0, 60)} non è nel pacchetto`);
        break;
      case 'desktopItem':
        if (!permissions.includes('desktop.items')) bad('serve il permesso desktop.items');
        if (o.target !== 'app') bad('per ora target può essere solo "app"');
        break;
      case 'tag':
        if (!permissions.includes('tags.write')) bad('serve il permesso tags.write');
        if (!str(o.name, 40) || (o.color !== undefined && !HEX.test(o.color))) bad('nome o colore non valido');
        break;
      case 'setting':
        if (!KEY.test(o.key ?? '') || JSON.stringify(o.value ?? null).length > 4096) bad('chiave o valore non valido');
        break;
      case 'remove':
        if (where !== 'uninstall') bad('solo nella disinstallazione');
        homePath(o.path); writable(o.path);
        if (o.ask !== undefined && !str(o.ask, 200)) bad('domanda non valida');
        break;
      default: bad('sconosciuta');
    }
  }
}

/** Validates a manifest (untrusted JSON). Returns it cleaned of unknown fields. */
export function checkManifest(raw) {
  const m = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : fail('invalid', 'Manifesto non valido');
  const bad = msg => fail('invalid', `Manifesto: ${msg}`);
  if (!ID.test(m.id ?? '')) bad('id non valido (lettere minuscole, cifre, punto e trattino)');
  if (!parseVersion(m.version)) bad('versione non valida (x.y.z)');
  if (m.kind !== 'local' && m.kind !== 'remote') bad('kind deve essere "local" o "remote"');
  if (!str(m.name, 40)) bad('nome mancante');
  if (!m.publisher || !KEY.test(m.publisher.id ?? '') || !str(m.publisher.name, 80)) bad('editore mancante');
  if (m.publisher.key !== undefined && !/^ed25519:[A-Za-z0-9+/]{43}=$/.test(m.publisher.key)) bad('chiave dell’editore non valida');
  if (String(m.sdk) !== '1') bad('versione dell’SDK non supportata');
  if (m.icon !== undefined && (!GLYPH.test(m.icon?.glyph ?? '') || !HEX.test(m.icon?.color ?? ''))) bad('icona non valida');
  if (m.system !== undefined && m.system !== true) bad('system può essere solo true');
  if (m.required !== undefined && (m.required !== true || !m.system)) bad('required vale solo per le app di sistema');
  if (m.description !== undefined && !str(m.description, 300)) bad('descrizione non valida');

  const files = m.files ?? {};
  if (typeof files !== 'object' || Array.isArray(files) || Object.keys(files).length > MAX.files) bad('elenco dei file non valido');
  for (const [path, hash] of Object.entries(files)) {
    if (!FILE.test(path) || path === 'lilos.json') bad(`percorso non valido: ${path.slice(0, 60)}`);
    if (!HASH.test(hash)) bad(`hash non valido per ${path.slice(0, 60)}`);
  }
  if (m.kind === 'local') {
    if (!files[m.entry]) bad('entry deve essere uno dei file del pacchetto');
    for (const css of list(m.styles, 10)) if (!m.system || !files[css] || !css.endsWith('.css')) bad('styles: solo file .css del pacchetto, nelle app di sistema');
  } else {
    let url;
    try { url = new URL(m.url); } catch { bad('url non valido'); }
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) bad('url deve essere https');
  }

  const permissions = list(m.permissions, MAX.permissions);
  for (const p of permissions) if (!parsePermission(p)) bad(`permesso sconosciuto: ${String(p).slice(0, 60)}`);
  if (!m.system && permissions.some(p => parsePermission(p).level === 'reserved')) bad('chiede permessi riservati alle app di sistema');

  for (const lib of list(m.libraries, MAX.libraries)) {
    if (!lib || !KEY.test(lib.name ?? '') || !parseVersion(lib.version) || !SRI.test(lib.integrity ?? '')) bad('libreria non valida');
    let url;
    try { url = new URL(lib.url); } catch { bad(`url della libreria ${lib.name} non valido`); }
    if (url.protocol !== 'https:') bad(`la libreria ${lib.name} deve arrivare da https`);
  }

  const c = m.contributes ?? {};
  if (typeof c !== 'object' || Array.isArray(c)) bad('contributes non valido');
  if (c.window !== undefined && !(c.window.width >= 200 && c.window.width <= 4000 && c.window.height >= 150 && c.window.height <= 4000)) bad('dimensioni della finestra non valide');
  for (const ext of list(c.fileTypes, 50)) if (typeof ext !== 'string' || !EXT.test(ext)) bad('tipo di file non valido');
  for (const cmd of list(c.commands, MAX.commands)) {
    if (!KEY.test(cmd?.id ?? '') || !cmd.id.startsWith(`${m.id}.`) || !str(cmd.label, 60)) bad('comando non valido (l’id inizia con l’id dell’app)');
    if (cmd.keys !== undefined && (!Array.isArray(cmd.keys) || cmd.keys.length > 3 || cmd.keys.some(k => !str(k, 40)))) bad(`tasti non validi per ${cmd.id}`);
  }
  if (list(c.commands, MAX.commands).some(cmd => cmd.keys?.length) && !permissions.includes('ui.shortcuts')) bad('le scorciatoie richiedono il permesso ui.shortcuts');
  for (const w of list(c.widgets, MAX.widgets)) {
    if (!KEY.test(w?.id ?? '') || !str(w.name, 40) || !(w.width >= 80 && w.width <= 1200 && w.height >= 60 && w.height <= 1200)) bad('widget non valido');
  }
  if (list(c.widgets, MAX.widgets).length && !permissions.includes('desktop.widget')) bad('i widget richiedono il permesso desktop.widget');

  checkOps(m.install, permissions, 'install', files);
  checkOps(m.uninstall, permissions, 'uninstall', files);
  for (const step of list(m.update, 20)) {
    if (!step || typeof step.from !== 'string' || !/^(<=?|=)?\d+\.\d+\.\d+$/.test(step.from)) bad('update: "from" non valido');
    checkOps(step.ops, permissions, 'update', files);
  }
  if (m.signature !== undefined && !/^ed25519:[A-Za-z0-9+/]{86}==$/.test(m.signature)) bad('firma non valida');
  if (JSON.stringify(m).length > 256 << 10) bad('troppo grande');
  return m;
}

export const updateOps = (manifest, fromVersion) => (manifest.update ?? []).filter(s => matchesFrom(s.from, fromVersion)).flatMap(s => s.ops);

export const sha256 = buffer => `sha256-${createHash('sha256').update(buffer).digest('base64')}`;

/** Same text for the same manifest whatever the order of its keys (what is signed). */
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).filter(k => value[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const SPKI_ED25519 = Buffer.from('302a300506032b6570032100', 'hex');

/** True if `signature` is the manifest signed with the Ed25519 key `key` ('ed25519:<base64>'). */
export function verifySignature(manifest, key) {
  if (!manifest.signature || !key) return false;
  try {
    const { signature, ...rest } = manifest;
    const publicKey = createPublicKey({ key: Buffer.concat([SPKI_ED25519, Buffer.from(key.slice(8), 'base64')]), format: 'der', type: 'spki' });
    return verify(null, Buffer.from(canonical(rest)), publicKey, Buffer.from(signature.slice(8), 'base64'));
  } catch {
    return false;
  }
}

/** Checks that the hash of every downloaded file is the one in the manifest. */
export function checkFiles(manifest, files) {
  for (const [path, hash] of Object.entries(manifest.files ?? {})) {
    const data = files.get(path) ?? fail('invalid', `Manca il file ${path}`);
    if (sha256(data) !== hash) fail('invalid', `Il file ${path} è diverso da quello del manifesto (hash)`);
  }
}

/** Checks a library against its SRI hash ('sha384-…'). */
export function checkIntegrity(data, integrity) {
  const [algo, expected] = [integrity.slice(0, 6), integrity.slice(7)];
  return createHash(algo).update(data).digest('base64') === expected;
}
