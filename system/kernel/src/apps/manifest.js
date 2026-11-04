import { createHash, createPublicKey, verify } from 'node:crypto';
import { fail } from '../errors.js';
import { parsePermission, coversPath } from './permissions.js';
// The translations engine of the SDK: the same checks as lilOS's (it has no imports)
import { parseLocales } from '../../../../sdk/core/i18n.js';
import { defineStrings } from '../strings.js';

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
 *     locales?: 'locales.json',               local apps: the translations file (the SDK's i18n.js); the
 *                                             manifest's texts are in English, '@' keys translate them
 *     entry: 'dist/index.js',                 local: one ES module, with everything it imports bundled
 *     entrypoints?: {                         sdk '2', local apps: the parts of the app others may start
 *       main: { kind: 'window' },             what the user opens (implied when missing)
 *       vault: { kind: 'background', file?: 'dist/vault.js', label?: 'Cassaforte' },   in the browser, on demand
 *       sync: { kind: 'service', label?: 'Sincronizza' },   in the kernel, also with lilOS closed (needs 'background')
 *       unlock: { kind: 'window', window?: { width, height } },
 *       today: { kind: 'window', params?: { view: { type: 'choice', label: 'Vista', options: [{ value, label }] } } },
 *     },                                      each one is the export with its name of `file` (`entry` by default);
 *                                             sdk '1' may only describe `main` (its params) and services
 *     files: { 'dist/index.js': 'sha256-<base64>', … },     every file of the package, with its hash
 *     url: 'https://notes.example.com/',      remote: the page that is the app
 *     libraries: [{ name, version, url, integrity: 'sha384-…', cache?: true }],
 *     permissions: ['fs.read:~/Documenti', 'net:https://api.example.com', …],
 *     contributes: { window: { width, height }, fileTypes: ['md'], commands: [{ id, label, keys }],
 *                    widgets: [{ id, name, width, height, resizable, fileType? }], settings: [...],
 *                    (fileType: files of that type, one of fileTypes, show on the desk as the widget)
 *                    pipes: [pipe], events: [event], actions: [action], menus: [menu], badge: { glyph, label },
 *                    automation: [automation] },
 *     install: [op], update: [{ from: '<1.2.0', ops: [op] }], uninstall: [op],
 *     lilos?: '>=1.8.0' | '>=1.8.0 <2.0.0',   the versions of lilOS the app works with (one or two bounds):
 *                                             not installed elsewhere, and lilOS is not updated past them
 *     dependencies?: [dependency],            kernel modules and apps it needs (see checkDependencies)
 *     restartOnUpdate?: true | '<2.0.0',     updating to this version needs lilOS to restart (always, or
 *                                             only from the versions in the range, like update's `from`)
 *     signature?: 'ed25519:<base64>'         over the manifest without "signature" (keys sorted)
 *   }
 *
 * Operations (run for each user, the first time they find the app; paths only under '~'):
 *   { op: 'mkdir', path }   { op: 'write', path, text, ifMissing? }   { op: 'copy', from, to, ifMissing? }
 *   { op: 'desktopItem', target: 'app' }   { op: 'tag', name, color? }   { op: 'setting', key, value }
 *   { op: 'remove', path, ask? }   only in uninstall
 *
 * Pipes (sdk '2', local apps): events of the system the app handles even when it is not running:
 * lilOS starts the background entry point when the event comes and gives it to the handler the
 * entry point subscribed (lilos.pipes.subscribe). Needs 'pipe:<event>', or 'pipe.own:<event>' when
 * `where` is { meta: 'own' } (only the files the app marked). Protected events: system apps only.
 *   { event: 'file.read', stage: 'before' | 'after', entry: 'vault', position?: 'first' | 'middle' | 'last', where? }
 *
 * Events: the app's own events ('<app id>.<one word>'), in the catalog from the moment the app is
 * installed, so other apps may subscribe to them (also in their manifest) before it ever runs.
 * The app runs them with lilos.pipes.run; its own pipes on them need no permission.
 *   { name: 'acme.notes.saved', label: 'Note saved', description?, edit?: { before?: [field], after?: [field] }, stop?: true }
 *
 * Actions (needs 'ui.menus'): entries of the menu of files and folders, that start an entry point
 * with { files: [ids] } (the app may read and write them). `when`: which items they are for.
 *   { id: '<app id>.encrypt', label: 'Encrypt…', entry: 'encrypt', on: 'file' | 'folder' | 'item',
 *     glyph?, when?: { meta?: 'own' | 'none', ext?: ['txt'], notExt?: ['zip'] }, many?: true,
 *     menu?: '<app id>.compress' }   many: also for a selection; menu: in that submenu of the app
 * Submenus of the actions: menus: [{ id: '<app id>.compress', label: 'Compress', glyph? }]
 *
 * Badge: a sign on the icon of the items the app has data on (node.apps[id]): { glyph: 'lock', label }.
 *
 * Automation: what the app lets the user record and do again (the Automata app, the SDK's
 * automation.js). The app tells what the user did with lilos automation.record(id, …); doing it
 * again is a window of the app (target 'window', automation.handle) or one of its entry points
 * (entry), called with { automation: { action, params }, files }.
 *   { id: '<app id>.resize', label: 'Resize', target?: 'window', entry?: 'work', result?: 'file',
 *     confirm?: true, description?, params?: { name: { type, label, description?, subject?, …by type } } }
 *   types: those of entry points' params, plus 'files' (several) and 'secret' (never saved: always asked)
 *
 * Params of an entry point: what it accepts as args, so lilOS can ask for it (Control Panel → Avvio).
 *   { name: { type, label, description?, default?, …by type } }, at most 10
 *   'text' { maxLength? }   'number' { min?, max? }   'boolean'   'choice' { options: [{ value, label }] }
 *   'file' (the id of a file the user chose: the app may read and write it)   'folder' (a folder the user chose)
 */
const { t } = defineStrings('lilos:kernel.manifest', { en: { strings: {
  list: 'List too long or not valid in the manifest',
  invalid: 'Manifest not valid',
  id: 'Manifest: id not valid (lowercase letters, digits, dot and hyphen)',
  version: 'Manifest: version not valid (x.y.z)',
  kind: 'Manifest: kind must be "local" or "remote"',
  name: 'Manifest: name missing',
  publisher: 'Manifest: publisher missing',
  publisherKey: 'Manifest: publisher key not valid',
  sdk: 'Manifest: SDK version not supported',
  lilos: 'Manifest: lilos: versions of lilOS such as ">=1.8.0" or ">=1.8.0 <2.0.0"',
  icon: 'Manifest: icon not valid',
  system: 'Manifest: system can only be true',
  required: 'Manifest: required applies only to system apps',
  description: 'Manifest: description not valid',
  category: 'Manifest: category not valid ({categories})',
  files: 'Manifest: list of files not valid',
  path: 'Manifest: path not valid: {path}',
  hash: 'Manifest: hash not valid for {path}',
  entry: 'Manifest: entry must be one of the files of the package',
  styles: 'Manifest: styles: only .css files of the package, in system apps',
  locales: 'Manifest: locales: a .json file of the package',
  localesLocal: 'Manifest: locales: only for local apps',
  url: 'Manifest: url not valid',
  https: 'Manifest: url must be https',
  entrypointsLocal: 'Manifest: entrypoints: only in local apps',
  entrypoints: 'Manifest: entrypoints not valid',
  entrypointsSdk1: 'Manifest: entrypoints: with sdk "1" only main (for its params) and the services',
  mainWindow: 'Manifest: the main entry point must be a window',
  serviceBackground: 'Manifest: service entry points need the background permission',
  permission: 'Manifest: unknown permission: {permission}',
  reserved: 'Manifest: it asks for permissions reserved to system apps',
  library: 'Manifest: library not valid',
  libraryUrl: 'Manifest: url of the library {name} not valid',
  libraryHttps: 'Manifest: the library {name} must come from https',
  contributes: 'Manifest: contributes not valid',
  window: 'Manifest: window size not valid',
  fileType: 'Manifest: file type not valid',
  command: 'Manifest: command not valid (the id starts with the id of the app)',
  keys: 'Manifest: keys not valid for {id}',
  shortcuts: 'Manifest: shortcuts need the ui.shortcuts permission',
  widget: 'Manifest: widget not valid',
  widgetFileType: "Manifest: widget {id}: fileType must be one of the app's fileTypes",
  widgetSameType: 'Manifest: two widgets with the same fileType',
  widgets: 'Manifest: widgets need the desktop.widget permission',
  menu: 'Manifest: menu not valid (the id starts with the id of the app, one per menu)',
  menuLabel: 'Manifest: menu {id}: label missing or too long',
  menuGlyph: 'Manifest: menu {id}: glyph not valid',
  actionsMenus: 'Manifest: actions need the ui.menus permission',
  badge: 'Manifest: badge not valid ({ glyph, label })',
  updateFrom: 'Manifest: update: "from" not valid',
  restartOnUpdate: 'Manifest: restartOnUpdate: true or a range of versions such as "<2.0.0"',
  signature: 'Manifest: signature not valid',
  tooLarge: 'Manifest: too large',
  'entry.shape': 'Manifest: entry point {entry}: name or shape not valid',
  'entry.kind': 'Manifest: entry point {entry}: kind must be "window", "background" or "service"',
  'entry.file': 'Manifest: entry point {entry}: file not in the package or not .js',
  'entry.label': 'Manifest: entry point {entry}: label not valid',
  'entry.window': 'Manifest: entry point {entry}: window size not valid',
  'entry.params': 'Manifest: entry point {entry}: params not valid (at most 10)',
  'entry.param.shape': 'Manifest: entry point {entry}: parameter {param}: name or shape not valid',
  'entry.param.type': 'Manifest: entry point {entry}: parameter {param}: type must be one of {types}',
  'entry.param.subject': 'Manifest: entry point {entry}: parameter {param}: subject can only be true',
  'entry.param.label': 'Manifest: entry point {entry}: parameter {param}: label missing or too long',
  'entry.param.description': 'Manifest: entry point {entry}: parameter {param}: description not valid',
  'entry.param.maxLength': 'Manifest: entry point {entry}: parameter {param}: maxLength between 1 and 2000',
  'entry.param.minMax': 'Manifest: entry point {entry}: parameter {param}: min and max not valid',
  'entry.param.options': 'Manifest: entry point {entry}: parameter {param}: options: from 1 to 50 choices',
  'entry.param.option': 'Manifest: entry point {entry}: parameter {param}: choice not valid ({ value, label })',
  'entry.param.default': 'Manifest: entry point {entry}: parameter {param}: default value not valid (files, folders and secrets have none)',
  'event.name': 'Manifest: event {event}: name not valid (<app id>.<one word>)',
  'event.twice': 'Manifest: event {event}: declared twice',
  'event.label': 'Manifest: event {event}: label missing or too long',
  'event.description': 'Manifest: event {event}: description not valid',
  'event.stop': 'Manifest: event {event}: stop can only be true',
  'event.edit': 'Manifest: event {event}: edit not valid ({ before, after })',
  'event.fields': 'Manifest: event {event}: edit.{stage}: up to {max} field names',
  'pipe.event': 'Manifest: pipe {event}: event not valid',
  'pipe.stage': 'Manifest: pipe {event}: stage must be "before" or "after"',
  'pipe.entry': 'Manifest: pipe {event}: entry must be a background entry point',
  'pipe.position': 'Manifest: pipe {event}: position not valid',
  'pipe.where': 'Manifest: pipe {event}: where not valid',
  'pipe.whereMeta': 'Manifest: pipe {event}: where.meta: only "own"',
  'pipe.whereType': 'Manifest: pipe {event}: where.type not valid',
  'pipe.whereList': 'Manifest: pipe {event}: where.{key}: a list of texts',
  'pipe.whereUnknown': 'Manifest: pipe {event}: where.{key} is not used',
  'pipe.permission': 'Manifest: pipe {event}: the permission pipe:{name} is needed',
  'pipe.permissionOwn': 'Manifest: pipe {event}: the permission pipe:{name} or pipe.own:{name} is needed',
  'pipe.protected': 'Manifest: pipe {event}: event reserved to system apps',
  'action.id': 'Manifest: action {id}: id not valid (it starts with the id of the app)',
  'action.label': 'Manifest: action {id}: label missing or too long',
  'action.entry': 'Manifest: action {id}: entry is not an entry point of the app',
  'action.service': 'Manifest: action {id}: an action does not start a service',
  'action.on': 'Manifest: action {id}: on must be "file", "folder" or "item"',
  'action.glyph': 'Manifest: action {id}: glyph not valid',
  'action.many': 'Manifest: action {id}: many can only be true',
  'action.menu': 'Manifest: action {id}: menu is not one of the menus of the app (contributes.menus)',
  'action.when': 'Manifest: action {id}: when not valid',
  'action.whenMeta': 'Manifest: action {id}: when.meta: "own" or "none"',
  'action.whenExt': 'Manifest: action {id}: when.ext not valid',
  'action.whenNotExt': 'Manifest: action {id}: when.notExt not valid',
  'action.whenNet': 'Manifest: action {id}: when.net: the protocols of the network connections, for example ["sftp"]',
  'automation.id': 'Manifest: automation {id}: id not valid (<app id>.<one word>)',
  'automation.twice': 'Manifest: automation {id}: declared twice',
  'automation.label': 'Manifest: automation {id}: label missing or too long',
  'automation.description': 'Manifest: automation {id}: description not valid',
  'automation.target': 'Manifest: automation {id}: target can only be "window"',
  'automation.entry': 'Manifest: automation {id}: entry: a window or background entry point of the app, without target',
  'automation.needs': 'Manifest: automation {id}: target "window" or entry is needed',
  'automation.result': 'Manifest: automation {id}: result can only be "file"',
  'automation.confirm': 'Manifest: automation {id}: confirm can only be true',
  'automation.params': 'Manifest: automation {id}: params not valid (at most 10)',
  'automation.param.shape': 'Manifest: automation {id}: parameter {param}: name or shape not valid',
  'automation.param.type': 'Manifest: automation {id}: parameter {param}: type must be one of {types}',
  'automation.param.subject': 'Manifest: automation {id}: parameter {param}: subject can only be true',
  'automation.param.label': 'Manifest: automation {id}: parameter {param}: label missing or too long',
  'automation.param.description': 'Manifest: automation {id}: parameter {param}: description not valid',
  'automation.param.maxLength': 'Manifest: automation {id}: parameter {param}: maxLength between 1 and 2000',
  'automation.param.minMax': 'Manifest: automation {id}: parameter {param}: min and max not valid',
  'automation.param.options': 'Manifest: automation {id}: parameter {param}: options: from 1 to 50 choices',
  'automation.param.option': 'Manifest: automation {id}: parameter {param}: choice not valid ({ value, label })',
  'automation.param.default': 'Manifest: automation {id}: parameter {param}: default value not valid (files, folders and secrets have none)',
  'op.bad': 'Operation "{op}" in {where}: not valid',
  'op.path': 'Operation "{op}" in {where}: path not valid {path}',
  'op.permission': 'Operation "{op}" in {where}: the fs.write permission is needed for {path}',
  'op.text': 'Operation "{op}" in {where}: text missing or too long',
  'op.file': 'Operation "{op}" in {where}: the file {file} is not in the package',
  'op.desktopItems': 'Operation "{op}" in {where}: the desktop.items permission is needed',
  'op.target': 'Operation "{op}" in {where}: for now target can only be "app"',
  'op.tags': 'Operation "{op}" in {where}: the tags.write permission is needed',
  'op.tag': 'Operation "{op}" in {where}: name or color not valid',
  'op.setting': 'Operation "{op}" in {where}: key or value not valid',
  'op.uninstallOnly': 'Operation "{op}" in {where}: only in the uninstall',
  'op.ask': 'Operation "{op}" in {where}: question not valid',
  'op.unknown': 'Operation "{op}" in {where}: unknown',
  'dep.list': 'Manifest: dependencies: a list, at most 30',
  'dep.entry': 'Manifest: dependencies: entry not valid',
  'dep.oneOf': 'Manifest: dependencies: each entry has "module" or "app"',
  'dep.module': 'Manifest: dependencies: module not valid: {name}',
  'dep.self': 'Manifest: dependencies: a package does not depend on itself',
  'dep.twice': 'Manifest: dependencies: {key} named twice',
  'dep.version': 'Manifest: dependencies: {key}: version such as ">=1.0.0" or ">=1.0.0 <2.0.0"',
  'dep.repo': 'Manifest: dependencies: {key}: repo must be the https:// address of a repository',
  'dep.optional': 'Manifest: dependencies: {key}: optional can only be true',
  'dep.reason': 'Manifest: dependencies: {key}: reason not valid',
  'dep.app': 'Manifest: dependencies: app not valid: {name}',
  'moduleDep.list': 'module.json: dependencies: a list, at most 30',
  'moduleDep.entry': 'module.json: dependencies: entry not valid',
  'moduleDep.oneOf': 'module.json: dependencies: each entry has "module" or "app"',
  'moduleDep.module': 'module.json: dependencies: module not valid: {name}',
  'moduleDep.self': 'module.json: dependencies: a package does not depend on itself',
  'moduleDep.twice': 'module.json: dependencies: {key} named twice',
  'moduleDep.version': 'module.json: dependencies: {key}: version such as ">=1.0.0" or ">=1.0.0 <2.0.0"',
  'moduleDep.repo': 'module.json: dependencies: {key}: repo must be the https:// address of a repository',
  'moduleDep.optional': 'module.json: dependencies: {key}: optional can only be true',
  'moduleDep.reason': 'module.json: dependencies: {key}: reason not valid',
  'moduleDep.modulesOnly': 'module.json: dependencies: a module depends only on modules',
  fileMissing: 'File {path} missing',
  fileHash: 'The file {path} differs from the one in the manifest (hash)',
} } });
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
const MAX = { files: 1000, ops: 100, text: 64 << 10, commands: 30, widgets: 10, permissions: 50, libraries: 30, entrypoints: 20, params: 10, options: 50, pipes: 30, actions: 20, menus: 10, events: 20, fields: 20, automation: 30 };
const EVENT = /^[a-z0-9][a-z0-9.-]{0,63}\.[a-z][a-zA-Z0-9]{0,40}$/;
const EVENT_WORD = /^[a-z][a-zA-Z0-9]{0,40}$/;
const FIELD = /^(?!__proto__$|constructor$|prototype$)\w{1,40}$/;
/** Events only lilOS and system apps subscribe to (the SDK's pipeCatalog.js). */
const PROTECTED = ['system.ready', 'session.', 'apps.', 'permissions.', 'settings.system', 'pipes.'];
export const isProtectedEvent = name => PROTECTED.some(p => (p.endsWith('.') ? name.startsWith(p) : name === p));
const PARAM_TYPES = ['text', 'number', 'boolean', 'choice', 'file', 'folder'];
const AUTOMATION_TYPES = [...PARAM_TYPES, 'files', 'secret'];
export const CATEGORIES = ['system', 'productivity', 'media', 'development', 'other'];
const windowSize = w => w?.width >= 200 && w.width <= 4000 && w.height >= 150 && w.height <= 4000;

const str = (v, max = 200) => typeof v === 'string' && v.trim() && v.length <= max;
const list = (v, max) => (v === undefined ? [] : Array.isArray(v) && v.length <= max ? v : fail('invalid', t('list')));

export const parseVersion = v => SEMVER.exec(v)?.slice(1).map(Number) ?? null;
export function compareVersions(a, b) {
  const pa = parseVersion(a), pb = parseVersion(b);
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
}

/** The app SDK versions this kernel runs (manifest `sdk`). */
export const SDK_VERSIONS = ['1', '2'];

/** '>=1.8.0', '<2.0.0', '>=1.8.0 <2.0.0' (each bound >=, >, <=, < or = and a version): does `version` match all? */
export const LILOS_RANGE = /^(>=|<=|>|<|=)?\d{1,6}\.\d{1,6}\.\d{1,6}( (>=|<=|>|<|=)?\d{1,6}\.\d{1,6}\.\d{1,6})?$/;
export function inRange(range, version) {
  return range.split(' ').every(bound => {
    const [, op = '=', v] = /^(>=|<=|>|<|=)?(.+)$/.exec(bound);
    const c = compareVersions(version, v);
    return { '>=': c >= 0, '>': c > 0, '<=': c <= 0, '<': c < 0, '=': c === 0 }[op];
  });
}

/**
 * What a package needs (lilos.json and module.json "dependencies"), installed with it after the admin
 * says yes (apps/dependencies.js):
 *   { module: 'arduino', version?: '>=1.0.0', repo?: 'https://github.com/…', optional?: true, reason?: 'Compiles the sketches' }
 *   { app: 'acme.notes', … the same }           apps only: a module needs modules
 * version: as `lilos` (one or two bounds); repo: the repository it comes from (its catalog.json lists
 * it), the official one when missing; optional: the package works without it, the admin chooses.
 * The reason is in English, '@dependencies.<module or app>.reason' translates it (locales).
 */
const MODULE_NAME = /^[a-z][a-z0-9-]{0,40}$/;
export const dependencyKey = d => (d.module !== undefined ? `module:${d.module}` : `app:${d.app}`);

export function checkDependencies(raw, { self, apps = true } = {}) {
  if (raw === undefined) return [];
  // An app's lilos.json, or (apps: false) a module's module.json
  const bad = (key, params) => fail('invalid', t(`${apps ? 'dep' : 'moduleDep'}.${key}`, params));
  if (!Array.isArray(raw) || raw.length > 30) bad('list');
  const seen = new Set();
  for (const d of raw) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) bad('entry');
    if ((d.module === undefined) === (d.app === undefined)) bad('oneOf');
    if (d.app !== undefined && !apps) bad('modulesOnly');
    if (d.module !== undefined && !MODULE_NAME.test(d.module)) bad('module', { name: String(d.module).slice(0, 40) });
    if (d.app !== undefined && !ID.test(d.app)) bad('app', { name: String(d.app).slice(0, 60) });
    const key = dependencyKey(d);
    if (key === self) bad('self');
    if (seen.has(key)) bad('twice', { key });
    seen.add(key);
    if (d.version !== undefined && !(typeof d.version === 'string' && LILOS_RANGE.test(d.version))) bad('version', { key });
    if (d.repo !== undefined) {
      let url = null;
      try { url = new URL(d.repo); } catch { /* below */ }
      if (url?.protocol !== 'https:' || url.username || url.password || d.repo.length > 300) bad('repo', { key });
    }
    if (d.optional !== undefined && d.optional !== true) bad('optional', { key });
    if (d.reason !== undefined && !str(d.reason, 200)) bad('reason', { key });
  }
  return raw;
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
    const bad = (key, params) => fail('invalid', t(`op.${key}`, { op: String(o?.op), where, ...params }));
    if (!o || typeof o !== 'object') bad('bad');
    const homePath = p => (typeof p === 'string' && HOME_PATH.test(p) && !p.split('/').includes('..')) || bad('path', { path: String(p).slice(0, 60) });
    const writable = p => coversPath(permissions, p) || bad('permission', { path: p });
    switch (o.op) {
      case 'mkdir': homePath(o.path); writable(o.path); break;
      case 'write':
        homePath(o.path); writable(o.path);
        if (typeof o.text !== 'string' || o.text.length > MAX.text) bad('text');
        break;
      case 'copy':
        homePath(o.to); writable(o.to);
        if (!files[o.from]) bad('file', { file: String(o.from).slice(0, 60) });
        break;
      case 'desktopItem':
        if (!permissions.includes('desktop.items')) bad('desktopItems');
        if (o.target !== 'app') bad('target');
        break;
      case 'tag':
        if (!permissions.includes('tags.write')) bad('tags');
        if (!str(o.name, 40) || (o.color !== undefined && !HEX.test(o.color))) bad('tag');
        break;
      case 'setting':
        if (!KEY.test(o.key ?? '') || JSON.stringify(o.value ?? null).length > 4096) bad('setting');
        break;
      case 'remove':
        if (where !== 'uninstall') bad('uninstallOnly');
        homePath(o.path); writable(o.path);
        if (o.ask !== undefined && !str(o.ask, 200)) bad('ask');
        break;
      default: bad('unknown');
    }
  }
}

/** The where of a pipe: { meta: 'own', ext: [..], type, app: [..] }; `wrong(key, params)` throws (keys pipe.where…). */
function checkWhere(w, wrong) {
  if (!w || typeof w !== 'object' || Array.isArray(w)) wrong('where');
  for (const [k, v] of Object.entries(w)) {
    if (k === 'meta') { if (v !== 'own') wrong('whereMeta'); }
    else if (k === 'type') { if (!['file', 'folder', 'app'].includes(v)) wrong('whereType'); }
    else if (k === 'ext' || k === 'app') { if (!Array.isArray(v) || v.length > 50 || v.some(x => typeof x !== 'string' || x.length > 64)) wrong('whereList', { key: k }); }
    else wrong('whereUnknown', { key: k.slice(0, 30) });
  }
}

/**
 * Checks the params of an entry point (see above); `wrong(key, params)` throws (keys params, param.…
 * of entry. and automation.). types: the ones allowed.
 */
function checkParams(params, wrong, types = PARAM_TYPES) {
  if (!params || typeof params !== 'object' || Array.isArray(params) || Object.keys(params).length > MAX.params) wrong('params');
  for (const [name, p] of Object.entries(params)) {
    const off = (key, more) => wrong(`param.${key}`, { param: name.slice(0, 40), ...more });
    if (!PARAM.test(name) || !p || typeof p !== 'object' || Array.isArray(p)) off('shape');
    if (!types.includes(p.type)) off('type', { types: types.join(', ') });
    if (p.subject !== undefined && p.subject !== true) off('subject');
    if (!str(p.label, 60)) off('label');
    if (p.description !== undefined && !str(p.description, 200)) off('description');
    const num = v => v === undefined || (typeof v === 'number' && Number.isFinite(v));
    if (p.type === 'text' && (p.maxLength !== undefined && !(Number.isInteger(p.maxLength) && p.maxLength >= 1 && p.maxLength <= 2000))) off('maxLength');
    if (p.type === 'number' && (!num(p.min) || !num(p.max) || (p.min !== undefined && p.max !== undefined && p.min > p.max))) off('minMax');
    if (p.type === 'choice') {
      const options = Array.isArray(p.options) && p.options.length >= 1 && p.options.length <= MAX.options ? p.options : off('options');
      for (const o of options) {
        if (!o || !((typeof o.value === 'string' && o.value.length <= 100) || num(o.value)) || o.value === undefined || !str(o.label, 60)) off('option');
      }
    }
    if (p.default !== undefined) {
      const ok = {
        text: v => typeof v === 'string' && v.length <= (p.maxLength ?? 2000),
        number: v => num(v) && !(p.min > v) && !(p.max < v),
        boolean: v => typeof v === 'boolean',
        choice: v => p.options.some(o => o.value === v),
      }[p.type];
      if (!ok?.(p.default)) off('default');
    }
  }
}

/** Validates a manifest (untrusted JSON). Returns it cleaned of unknown fields. */
export function checkManifest(raw) {
  const m = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : fail('invalid', t('invalid'));
  const bad = (key, params) => fail('invalid', t(key, params));
  if (!ID.test(m.id ?? '')) bad('id');
  if (!parseVersion(m.version)) bad('version');
  if (m.kind !== 'local' && m.kind !== 'remote') bad('kind');
  if (!str(m.name, 40)) bad('name');
  if (!m.publisher || !KEY.test(m.publisher.id ?? '') || !str(m.publisher.name, 80)) bad('publisher');
  if (m.publisher.key !== undefined && !/^ed25519:[A-Za-z0-9+/]{43}=$/.test(m.publisher.key)) bad('publisherKey');
  if (!SDK_VERSIONS.includes(String(m.sdk))) bad('sdk');
  if (m.lilos !== undefined && !(typeof m.lilos === 'string' && LILOS_RANGE.test(m.lilos))) bad('lilos');
  checkDependencies(m.dependencies, { self: `app:${m.id}` });
  if (m.icon !== undefined && (!GLYPH.test(m.icon?.glyph ?? '') || !HEX.test(m.icon?.color ?? ''))) bad('icon');
  if (m.system !== undefined && m.system !== true) bad('system');
  if (m.required !== undefined && (m.required !== true || !m.system)) bad('required');
  if (m.description !== undefined && !str(m.description, 300)) bad('description');
  if (m.category !== undefined && !CATEGORIES.includes(m.category)) bad('category', { categories: CATEGORIES.join(', ') });

  const files = m.files ?? {};
  if (typeof files !== 'object' || Array.isArray(files) || Object.keys(files).length > MAX.files) bad('files');
  for (const [path, hash] of Object.entries(files)) {
    if (!FILE.test(path) || path === 'lilos.json') bad('path', { path: path.slice(0, 60) });
    if (!HASH.test(hash)) bad('hash', { path: path.slice(0, 60) });
  }
  if (m.kind === 'local') {
    if (!files[m.entry]) bad('entry');
    for (const css of list(m.styles, 10)) if (!m.system || !files[css] || !css.endsWith('.css')) bad('styles');
    if (m.locales !== undefined && (typeof m.locales !== 'string' || !files[m.locales] || !m.locales.endsWith('.json'))) bad('locales');
  } else {
    if (m.locales !== undefined) bad('localesLocal');
    let url;
    try { url = new URL(m.url); } catch { bad('url'); }
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) bad('https');
  }

  if (m.entrypoints !== undefined) {
    const e = m.entrypoints;
    if (m.kind !== 'local') bad('entrypointsLocal');
    if (!e || typeof e !== 'object' || Array.isArray(e) || Object.keys(e).length > MAX.entrypoints) bad('entrypoints');
    if (String(m.sdk) !== '2' && Object.entries(e).some(([name, ep]) => name !== 'main' && ep?.kind !== 'service')) bad('entrypointsSdk1');
    for (const [name, ep] of Object.entries(e)) {
      const wrong = (key, params) => bad(`entry.${key}`, { entry: name.slice(0, 40), ...params });
      if (!ENTRY.test(name) || !ep || typeof ep !== 'object' || Array.isArray(ep)) wrong('shape');
      if (!['window', 'background', 'service'].includes(ep.kind)) wrong('kind');
      if (ep.file !== undefined && (!files[ep.file] || !/\.m?js$/.test(ep.file))) wrong('file');
      if (ep.label !== undefined && !str(ep.label, 60)) wrong('label');
      if (ep.window !== undefined && (ep.kind !== 'window' || !windowSize(ep.window))) wrong('window');
      if (ep.params !== undefined) checkParams(ep.params, wrong);
    }
    if (e.main && e.main.kind !== 'window') bad('mainWindow');
  }

  const permissions = list(m.permissions, MAX.permissions);
  if (Object.values(m.entrypoints ?? {}).some(ep => ep?.kind === 'service') && !permissions.includes('background')) bad('serviceBackground');
  for (const p of permissions) if (!parsePermission(p)) bad('permission', { permission: String(p).slice(0, 60) });
  if (!m.system && permissions.some(p => parsePermission(p).level === 'reserved')) bad('reserved');

  for (const lib of list(m.libraries, MAX.libraries)) {
    if (!lib || !KEY.test(lib.name ?? '') || !parseVersion(lib.version) || !SRI.test(lib.integrity ?? '')) bad('library');
    let url;
    try { url = new URL(lib.url); } catch { bad('libraryUrl', { name: lib.name }); }
    if (url.protocol !== 'https:') bad('libraryHttps', { name: lib.name });
  }

  const c = m.contributes ?? {};
  if (typeof c !== 'object' || Array.isArray(c)) bad('contributes');
  if (c.window !== undefined && !windowSize(c.window)) bad('window');
  for (const ext of list(c.fileTypes, 50)) if (typeof ext !== 'string' || !EXT.test(ext)) bad('fileType');
  for (const cmd of list(c.commands, MAX.commands)) {
    if (!KEY.test(cmd?.id ?? '') || !cmd.id.startsWith(`${m.id}.`) || !str(cmd.label, 60)) bad('command');
    if (cmd.keys !== undefined && (!Array.isArray(cmd.keys) || cmd.keys.length > 3 || cmd.keys.some(k => !str(k, 40)))) bad('keys', { id: cmd.id });
  }
  if (list(c.commands, MAX.commands).some(cmd => cmd.keys?.length) && !permissions.includes('ui.shortcuts')) bad('shortcuts');
  for (const w of list(c.widgets, MAX.widgets)) {
    if (!KEY.test(w?.id ?? '') || !str(w.name, 40) || !(w.width >= 80 && w.width <= 1200 && w.height >= 60 && w.height <= 1200)) bad('widget');
    if (w.fileType !== undefined && (typeof w.fileType !== 'string' || !w.fileType || !EXT.test(w.fileType) || !list(c.fileTypes, 50).includes(w.fileType))) bad('widgetFileType', { id: w.id });
  }
  const widgetTypes = list(c.widgets, MAX.widgets).map(w => w.fileType).filter(Boolean);
  if (new Set(widgetTypes).size < widgetTypes.length) bad('widgetSameType');
  if (list(c.widgets, MAX.widgets).length && !permissions.includes('desktop.widget')) bad('widgets');
  const eps = m.entrypoints ?? {};
  const ownEvents = new Set();
  for (const e of list(c.events, MAX.events)) {
    const wrong = (key, params) => bad(`event.${key}`, { event: String(e?.name).slice(0, 60), ...params });
    if (!e || typeof e !== 'object' || typeof e.name !== 'string' || !EVENT.test(e.name) || !e.name.startsWith(`${m.id}.`) || !EVENT_WORD.test(e.name.slice(m.id.length + 1))) {
      wrong('name');
    }
    if (ownEvents.has(e.name)) wrong('twice');
    ownEvents.add(e.name);
    if (!str(e.label, 80)) wrong('label');
    if (e.description !== undefined && !str(e.description, 300)) wrong('description');
    if (e.stop !== undefined && e.stop !== true) wrong('stop');
    if (e.edit !== undefined) {
      if (!e.edit || typeof e.edit !== 'object' || Array.isArray(e.edit) || Object.keys(e.edit).some(k => k !== 'before' && k !== 'after')) wrong('edit');
      for (const stage of ['before', 'after']) {
        const fields = e.edit[stage];
        if (fields !== undefined && (!Array.isArray(fields) || fields.length > MAX.fields || fields.some(f => typeof f !== 'string' || !FIELD.test(f)))) wrong('fields', { stage, max: MAX.fields });
      }
    }
  }
  for (const p of list(c.pipes, MAX.pipes)) {
    const wrong = (key, params) => bad(`pipe.${key}`, { event: String(p?.event).slice(0, 60), ...params });
    if (!p || typeof p !== 'object' || !EVENT.test(p.event ?? '')) wrong('event');
    if (p.stage !== 'before' && p.stage !== 'after') wrong('stage');
    if (!Object.hasOwn(eps, p.entry) || eps[p.entry]?.kind !== 'background') wrong('entry');
    if (p.position !== undefined && !['first', 'middle', 'last'].includes(p.position)) wrong('position');
    const own = p.where?.meta === 'own';
    if (p.where !== undefined) checkWhere(p.where, wrong);
    if (!ownEvents.has(p.event) && !permissions.includes(`pipe:${p.event}`) && !(own && permissions.includes(`pipe.own:${p.event}`))) wrong(own ? 'permissionOwn' : 'permission', { name: p.event });
    if (isProtectedEvent(p.event) && !m.system) wrong('protected');
  }
  const menus = new Set();
  for (const menu of list(c.menus, MAX.menus)) {
    if (!menu || !KEY.test(menu.id ?? '') || !menu.id.startsWith(`${m.id}.`) || menus.has(menu.id)) bad('menu');
    if (!str(menu.label, 60)) bad('menuLabel', { id: menu.id });
    if (menu.glyph !== undefined && !GLYPH.test(menu.glyph)) bad('menuGlyph', { id: menu.id });
    menus.add(menu.id);
  }
  const extList = v => Array.isArray(v) && v.length <= 50 && v.every(e => typeof e === 'string' && EXT.test(e));
  for (const a of list(c.actions, MAX.actions)) {
    const wrong = key => bad(`action.${key}`, { id: String(a?.id).slice(0, 60) });
    if (!a || !KEY.test(a.id ?? '') || !a.id.startsWith(`${m.id}.`)) wrong('id');
    if (!str(a.label, 60)) wrong('label');
    if (a.entry !== 'main' && !Object.hasOwn(eps, a.entry)) wrong('entry');
    if (eps[a.entry]?.kind === 'service') wrong('service');
    if (!['file', 'folder', 'item'].includes(a.on)) wrong('on');
    if (a.glyph !== undefined && !GLYPH.test(a.glyph)) wrong('glyph');
    if (a.many !== undefined && a.many !== true) wrong('many');
    if (a.menu !== undefined && !menus.has(a.menu)) wrong('menu');
    if (a.when !== undefined) {
      if (!a.when || typeof a.when !== 'object' || Array.isArray(a.when) || Object.keys(a.when).some(k => !['meta', 'ext', 'notExt', 'net'].includes(k))) wrong('when');
      if (a.when.meta !== undefined && a.when.meta !== 'own' && a.when.meta !== 'none') wrong('whenMeta');
      if (a.when.ext !== undefined && !extList(a.when.ext)) wrong('whenExt');
      if (a.when.notExt !== undefined && !extList(a.when.notExt)) wrong('whenNotExt');
      if (a.when.net !== undefined && !(Array.isArray(a.when.net) && a.when.net.length <= 20 && a.when.net.every(p => typeof p === 'string' && /^[a-z][a-z0-9-]{0,30}$/.test(p)))) wrong('whenNet');
    }
  }
  if (list(c.actions, MAX.actions).length && !permissions.includes('ui.menus')) bad('actionsMenus');
  const automationIds = new Set();
  for (const a of list(c.automation, MAX.automation)) {
    const wrong = (key, params) => bad(`automation.${key}`, { id: String(a?.id).slice(0, 60), ...params });
    if (!a || typeof a !== 'object' || !KEY.test(a.id ?? '') || !a.id.startsWith(`${m.id}.`) || !EVENT_WORD.test(a.id.slice(m.id.length + 1))) wrong('id');
    if (automationIds.has(a.id)) wrong('twice');
    automationIds.add(a.id);
    if (!str(a.label, 60)) wrong('label');
    if (a.description !== undefined && !str(a.description, 300)) wrong('description');
    if (a.target !== undefined && a.target !== 'window') wrong('target');
    if (a.entry !== undefined && (a.target === 'window' || !(a.entry === 'main' || Object.hasOwn(eps, a.entry)) || eps[a.entry]?.kind === 'service')) wrong('entry');
    if (a.target === undefined && a.entry === undefined) wrong('needs');
    if (a.result !== undefined && a.result !== 'file') wrong('result');
    if (a.confirm !== undefined && a.confirm !== true) wrong('confirm');
    if (a.params !== undefined) checkParams(a.params, wrong, AUTOMATION_TYPES);
  }
  if (c.badge !== undefined && (!c.badge || !GLYPH.test(c.badge.glyph ?? '') || !str(c.badge.label, 40))) bad('badge');

  checkOps(m.install, permissions, 'install', files);
  checkOps(m.uninstall, permissions, 'uninstall', files);
  for (const step of list(m.update, 20)) {
    if (!step || typeof step.from !== 'string' || !/^(<=?|=)?\d+\.\d+\.\d+$/.test(step.from)) bad('updateFrom');
    checkOps(step.ops, permissions, 'update', files);
  }
  if (m.restartOnUpdate !== undefined && m.restartOnUpdate !== true && !(typeof m.restartOnUpdate === 'string' && /^(<=?|=)?\d+\.\d+\.\d+$/.test(m.restartOnUpdate))) {
    bad('restartOnUpdate');
  }
  if (m.signature !== undefined && !/^ed25519:[A-Za-z0-9+/]{86}==$/.test(m.signature)) bad('signature');
  if (JSON.stringify(m).length > 256 << 10) bad('tooLarge');
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
    const data = files.get(path) ?? fail('invalid', t('fileMissing', { path }));
    if (sha256(data) !== hash) fail('invalid', t('fileHash', { path }));
  }
  if (manifest.locales) {
    try {
      parseLocales(files.get(manifest.locales).toString('utf8'));
    } catch (err) {
      fail('invalid', err.message);
    }
  }
}

/** Checks a library against its SRI hash ('sha384-…'). */
export function checkIntegrity(data, integrity) {
  const [algo, expected] = [integrity.slice(0, 6), integrity.slice(7)];
  return createHash(algo).update(data).digest('base64') === expected;
}
