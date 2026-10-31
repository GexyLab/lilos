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
 *     sdk: '1' | '2',                         '1': the app's code runs at the top of the module, only in a sandbox;
 *                                             '2': each entry point is an exported function (see entrypoints)
 *     description?: 'Appunti veloci',
 *     category?: 'productivity',              where the AppStore lists it (CATEGORIES; 'other' when missing)
 *     system?: true,                         only from the official repository: runs inside lilOS, no sandbox
 *     required?: true,                        a system app that cannot be removed or hidden
 *     styles?: ['dist/index.css'],            system apps: stylesheets lilOS loads with the app
 *     entry: 'dist/index.js',                 local: one ES module, with everything it imports bundled
 *     entrypoints?: {                         sdk '2', local apps: the parts of the app others may start
 *       main: { kind: 'window' },             what the user opens (implied when missing)
 *       vault: { kind: 'background', file?: 'dist/vault.js', label?: 'Cassaforte' },   in the browser, on demand
 *       sync: { kind: 'service', label?: 'Sincronizza' },   in the kernel, also with lilOS closed (needs 'background')
 *       unlock: { kind: 'window', window?: { width, height } },
 *       today: { kind: 'window', params?: { view: { type: 'choice', label: 'Vista', options: [{ value, label }] } } },
 *     },                                      each one is the export with its name of `file` (`entry` by default);
 *                                             sdk '1' may only describe `main` (its params)
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
 *
 * Params of an entry point: what it accepts as args, so lilOS can ask for it (Sistema → Avvio).
 *   { name: { type, label, description?, default?, …by type } }, at most 10
 *   'text' { maxLength? }   'number' { min?, max? }   'boolean'   'choice' { options: [{ value, label }] }
 *   'file' (the id of a file the user chose: the app may read and write it)   'folder' (a folder the user chose)
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
const ENTRY = /^[a-z][a-zA-Z0-9]{0,30}$/;
const PARAM = /^[a-zA-Z][a-zA-Z0-9_]{0,30}$/;
const MAX = { files: 1000, ops: 100, text: 64 << 10, commands: 30, widgets: 10, permissions: 50, libraries: 30, entrypoints: 20, params: 10, options: 50 };
const PARAM_TYPES = ['text', 'number', 'boolean', 'choice', 'file', 'folder'];
export const CATEGORIES = ['system', 'productivity', 'media', 'development', 'other'];
const windowSize = w => w?.width >= 200 && w.width <= 4000 && w.height >= 150 && w.height <= 4000;

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

/** Checks the params of an entry point (see above); `wrong(msg)` throws. */
function checkParams(params, wrong) {
  if (!params || typeof params !== 'object' || Array.isArray(params) || Object.keys(params).length > MAX.params) wrong('params non validi (al massimo 10)');
  for (const [name, p] of Object.entries(params)) {
    const off = msg => wrong(`parametro ${name.slice(0, 40)}: ${msg}`);
    if (!PARAM.test(name) || !p || typeof p !== 'object' || Array.isArray(p)) off('nome o forma non validi');
    if (!PARAM_TYPES.includes(p.type)) off(`type deve essere uno di ${PARAM_TYPES.join(', ')}`);
    if (!str(p.label, 60)) off('etichetta mancante o troppo lunga');
    if (p.description !== undefined && !str(p.description, 200)) off('descrizione non valida');
    const num = v => v === undefined || (typeof v === 'number' && Number.isFinite(v));
    if (p.type === 'text' && (p.maxLength !== undefined && !(Number.isInteger(p.maxLength) && p.maxLength >= 1 && p.maxLength <= 2000))) off('maxLength tra 1 e 2000');
    if (p.type === 'number' && (!num(p.min) || !num(p.max) || (p.min !== undefined && p.max !== undefined && p.min > p.max))) off('min e max non validi');
    if (p.type === 'choice') {
      const options = Array.isArray(p.options) && p.options.length >= 1 && p.options.length <= MAX.options ? p.options : off('options: da 1 a 50 scelte');
      for (const o of options) {
        if (!o || !((typeof o.value === 'string' && o.value.length <= 100) || num(o.value)) || o.value === undefined || !str(o.label, 60)) off('scelta non valida ({ value, label })');
      }
    }
    if (p.default !== undefined) {
      const ok = {
        text: v => typeof v === 'string' && v.length <= (p.maxLength ?? 2000),
        number: v => num(v) && !(p.min > v) && !(p.max < v),
        boolean: v => typeof v === 'boolean',
        choice: v => p.options.some(o => o.value === v),
      }[p.type];
      if (!ok?.(p.default)) off('valore predefinito non valido (file e cartelle non ne hanno)');
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
  if (String(m.sdk) !== '1' && String(m.sdk) !== '2') bad('versione dell’SDK non supportata');
  if (m.icon !== undefined && (!GLYPH.test(m.icon?.glyph ?? '') || !HEX.test(m.icon?.color ?? ''))) bad('icona non valida');
  if (m.system !== undefined && m.system !== true) bad('system può essere solo true');
  if (m.required !== undefined && (m.required !== true || !m.system)) bad('required vale solo per le app di sistema');
  if (m.description !== undefined && !str(m.description, 300)) bad('descrizione non valida');
  if (m.category !== undefined && !CATEGORIES.includes(m.category)) bad(`categoria non valida (${CATEGORIES.join(', ')})`);

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

  if (m.entrypoints !== undefined) {
    const e = m.entrypoints;
    if (m.kind !== 'local') bad('entrypoints: solo nelle app locali');
    if (!e || typeof e !== 'object' || Array.isArray(e) || Object.keys(e).length > MAX.entrypoints) bad('entrypoints non validi');
    if (String(m.sdk) !== '2' && Object.keys(e).some(name => name !== 'main')) bad('entrypoints: con sdk "1" solo main (per i suoi params)');
    for (const [name, ep] of Object.entries(e)) {
      const wrong = msg => bad(`punto d’ingresso ${name.slice(0, 40)}: ${msg}`);
      if (!ENTRY.test(name) || !ep || typeof ep !== 'object' || Array.isArray(ep)) wrong('nome o forma non validi');
      if (!['window', 'background', 'service'].includes(ep.kind)) wrong('kind deve essere "window", "background" o "service"');
      if (ep.file !== undefined && (!files[ep.file] || !/\.m?js$/.test(ep.file))) wrong('file non nel pacchetto o non .js');
      if (ep.label !== undefined && !str(ep.label, 60)) wrong('etichetta non valida');
      if (ep.window !== undefined && (ep.kind !== 'window' || !windowSize(ep.window))) wrong('dimensioni della finestra non valide');
      if (ep.params !== undefined) checkParams(ep.params, wrong);
    }
    if (e.main && e.main.kind !== 'window') bad('il punto d’ingresso main deve essere una finestra');
  }

  const permissions = list(m.permissions, MAX.permissions);
  if (Object.values(m.entrypoints ?? {}).some(ep => ep?.kind === 'service') && !permissions.includes('background')) bad('i punti d’ingresso service richiedono il permesso background');
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
  if (c.window !== undefined && !windowSize(c.window)) bad('dimensioni della finestra non valide');
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
