import { fail } from '../errors.js';
import { openHome, FRONT_ID } from '../api/home.js';
import { checkServiceParams } from '../apps/appServices.js';
import { homeInside } from './copy.js';
import { defineStrings } from '../strings.js';

/**
 * What an operation does, checked before it is saved (nothing in it is trusted). Places in lilOS
 * are ids of lilOS's nodes ('root' is the home), so a renamed folder is still found; `label` is
 * only for showing (the path when it was chosen).
 *
 *   { type: 'notify', text, level: 'info' | 'success' | 'warning' | 'error', open: null | { file } | { app, entry?, args? } }
 *   { type: 'service', app, entry, params }                       an app's service entry point
 *   { type: 'copy', from: place, to: place, mode: 'versions' | 'update' | 'mirror', keep, exclude: [glob] }
 *       place: { home: id, label } | { mount: <connection id>, path: '/Backup', label }
 *   { type: 'web', method, url, headers: [{ name, value } | { name, secret: true, sealed }],
 *     body: { kind: 'none' | 'text' | 'json' | 'form' | 'file', text?, file? }, expect: { status: '2xx' | 'any' | 200…599, contains? },
 *     timeoutS, saveTo: null | { folder, name, mode: 'replace' | 'dated' } }
 *   { type: 'command', lines, cwd: id | null, host: null | <saved terminal host id>, saveTo: null | { folder, name, mode: 'replace' | 'append' } }
 *   { type: 'open', app?, entry?, args?, file? }                  in the browser: an app, or a file with its app
 *   { type: 'automation', file, values? }                         in the browser: a .automata file
 *   { type: 'collection', file, environment: id | null, only: [id] | null, label, environmentLabel }
 *                                                                 NetTest: a .nettest file run by the kernel (calls/), since lilOS 1.25.0
 *
 * An operation of the system (owner '*') has no home: only notify (to the admins), service and web
 * without files. One made by an app (`app`) may only remind (as that app),
 * run that app's services and open that app.
 * Secret headers (secret: true) are sealed here (net/secrets.js) and never shown again: to keep one
 * when saving again, send { name, secret: true } without value.
 */
const APP = /^[a-z0-9][a-z0-9.-]{1,63}$/;
const ENTRY = /^[a-z][a-zA-Z0-9]{0,30}$/;
const HEADER = /^[A-Za-z0-9!#$%&'*+.^_`|~-]{1,64}$/;
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']);
const LEVELS = new Set(['info', 'success', 'warning', 'error']);
const FILE_NAME = /^[^/\\\0:*?"<>|]{1,200}$/;
const MAX_LABEL = 300;
const MAX_TEXT = 300;
const MAX_ARGS = 4096;
const MAX_BODY = 1 << 20;
const MAX_LINES = 8 << 10;
const MAX_GLOBS = 50;
const KINDS = ['notify', 'service', 'copy', 'web', 'command', 'open', 'automation', 'collection'];

const { t } = defineStrings('lilos:kernel.schedule.what', { en: { strings: {
  'args.tooLong': 'Parameters: too long (4 KB at most)',
  'values.tooLong': 'Values: too long (4 KB at most)',
  noHome: 'An operation of the system has no home: no files of lilOS',
  item: 'Item not valid',
  gone: 'The file or folder is no longer there',
  needFolder: 'A folder is needed',
  needFile: 'A file is needed',
  'from.place': 'What to copy: place not valid',
  'from.mountGone': 'What to copy: the connection is no longer there',
  'from.path': 'What to copy: path not valid',
  'to.place': 'Where to copy: place not valid',
  'to.mountGone': 'Where to copy: the connection is no longer there',
  'to.path': 'Where to copy: path not valid',
  noMounts: 'An operation of the system does not use network connections',
  excludes: 'Exclusions not valid',
  saveTo: 'Where to save: not valid',
  fileName: 'File name not valid',
  appMissing: 'The app is not installed',
  noService: 'Service not found',
  noEntry: 'Entry point not found',
  action: 'Action not valid',
  appOwn: 'An app schedules only reminders, its own services and its own opening',
  noText: 'The reminder has no text',
  appSelf: 'An app opens only itself',
  appToOpen: 'App to open not valid',
  entry: 'Entry point not valid',
  service: 'Service not valid',
  appServices: 'An app schedules only its own services',
  noRuntime: 'No kernel module runs the services (services-isolate)',
  systemCopy: 'An operation of the system has no folders to copy',
  intoItself: 'A folder cannot be copied into itself',
  method: 'Method not allowed',
  url: 'Address not valid',
  httpOnly: 'Only http and https addresses',
  credentials: 'Credentials go in a secret header, not in the address',
  header: 'Header not valid: {name}',
  value: 'Value not valid: {name}',
  secretAgain: 'With a new address, the secret value of {name} must be entered again',
  secretMissing: 'The secret value of {name} is missing',
  bodyTooBig: 'Request body too large',
  json: 'The body is not valid JSON',
  noBody: '{method} has no body',
  noCommand: 'No command',
  commandsTooLong: 'Commands too long (8 KB at most)',
  systemCommands: 'An operation of the system does not run commands: commands run as a user',
  hostGone: 'The saved host is no longer there',
  sshOnly: 'Scheduled commands go only to SSH hosts',
  systemCollections: 'An operation of the system has no collections: the requests go out as a user',
  needNettest: 'A .nettest file is needed',
  systemNoApps: 'The system does not open apps: a user is needed',
  needAutomata: 'A .automata file is needed',
  notAutomation: 'The file is not a readable automation',
  automationInput: 'Only automations that do not work on chosen files can be scheduled',
} } });

const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const label = v => (typeof v === 'string' ? v.slice(0, MAX_LABEL) : '');
/** what: 'args' or 'values' (the key of its message). */
const smallJson = (v, what) => {
  const text = JSON.stringify(v ?? null) ?? 'null';
  if (text.length > MAX_ARGS) fail('invalid', t(`${what}.tooLong`));
  return JSON.parse(text);
};

/** A node of the owner's home: { id, node } of the type wanted ('root' is the home itself). */
async function homeNode(kernel, principal, id, type) {
  if (!principal) fail('invalid', t('noHome'));
  if (typeof id !== 'string' || (id !== 'root' && !FRONT_ID.test(id))) fail('invalid', t('item'));
  const view = await openHome(kernel, principal);
  const node = await view.fs.stat(principal, view.toBack(id, { parent: true }));
  if (!node) fail('not_found', t('gone'));
  const kind = node.type === 'app' && node.meta?.link ? 'link' : node.type;
  if (type && kind !== type) fail('invalid', type === 'folder' ? t('needFolder') : t('needFile'));
  return node;
}

/** what: 'from' or 'to' (the key of its messages). */
async function place(kernel, principal, raw, what) {
  if (!plain(raw)) fail('invalid', t(`${what}.place`));
  if (raw.home !== undefined) {
    await homeNode(kernel, principal, raw.home, 'folder');
    return { home: raw.home, label: label(raw.label) };
  }
  if (typeof raw.mount === 'string') {
    if (!principal) fail('invalid', t('noMounts'));
    const mounts = await kernel.network.list(principal);
    if (!mounts.some(m => m.id === raw.mount)) fail('not_found', t(`${what}.mountGone`));
    const path = typeof raw.path === 'string' && raw.path.startsWith('/') && raw.path.length <= 4096 && !raw.path.split('/').includes('..') ? raw.path : fail('invalid', t(`${what}.path`));
    return { mount: raw.mount, path, label: label(raw.label) };
  }
  fail('invalid', t(`${what}.place`));
}

const globs = v => {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > MAX_GLOBS || v.some(g => typeof g !== 'string' || !g || g.length > 100 || g.includes('/'))) fail('invalid', t('excludes'));
  return [...new Set(v.map(g => g.replace(/\*+/g, '*')))];
};

async function saveTo(kernel, principal, raw, modes) {
  if (raw === undefined || raw === null) return null;
  if (!plain(raw)) fail('invalid', t('saveTo'));
  await homeNode(kernel, principal, raw.folder, 'folder');
  if (typeof raw.name !== 'string' || !FILE_NAME.test(raw.name) || raw.name.startsWith('.')) fail('invalid', t('fileName'));
  return { folder: raw.folder, name: raw.name, mode: modes.includes(raw.mode) ? raw.mode : modes[0], label: label(raw.label) };
}

async function appEntry(kernel, app, entry, kind) {
  const state = await kernel.installer.state(app) ?? fail('not_found', t('appMissing'));
  const pkg = (await kernel.installer.list()).find(p => p.id === app);
  const eps = pkg?.manifest?.entrypoints ?? { main: { kind: 'window' } };
  const ep = eps[entry] ?? (entry === 'main' ? { kind: 'window' } : null);
  if (!ep || ep.kind !== kind) fail('invalid', kind === 'service' ? t('noService') : t('noEntry'));
  return state;
}

/**
 * Checks `what` for an operation of `owner` ('*' or a user id, `ownerPrincipal` its principal)
 * made by `app` (or by a person: null); `old`: the `what` it replaces (for the secrets kept).
 * Returns it as it is saved.
 */
export async function checkWhat(kernel, { what, old = null, owner, app = null, ownerPrincipal }) {
  if (!plain(what) || !KINDS.includes(what.type)) fail('invalid', t('action'));
  const system = owner === '*';
  const p = ownerPrincipal;
  const type = what.type;
  if (app && !['notify', 'service', 'open'].includes(type)) fail('forbidden', t('appOwn'));

  if (type === 'notify') {
    const text = typeof what.text === 'string' ? what.text.replace(/\s+/g, ' ').trim() : '';
    if (!text) fail('invalid', t('noText'));
    let open = null;
    if (plain(what.open) && what.open.file !== undefined) {
      if (app) fail('forbidden', t('appSelf'));
      await homeNode(kernel, p, what.open.file);
      open = { file: what.open.file, label: label(what.open.label) };
    } else if (plain(what.open) && what.open.app !== undefined) {
      if (!APP.test(what.open.app ?? '') || (app && what.open.app !== app)) fail('invalid', t('appToOpen'));
      const entry = what.open.entry ?? 'main';
      if (!ENTRY.test(entry)) fail('invalid', t('entry'));
      await appEntry(kernel, what.open.app, entry, 'window');
      open = { app: what.open.app, entry, args: smallJson(what.open.args, 'args') };
    }
    return { type, text: text.slice(0, MAX_TEXT), level: LEVELS.has(what.level) ? what.level : 'info', open };
  }

  if (type === 'service') {
    if (!APP.test(what.app ?? '') || !ENTRY.test(what.entry ?? '')) fail('invalid', t('service'));
    if (app && what.app !== app) fail('forbidden', t('appServices'));
    const service = (await kernel.appServices.catalog()).find(s => s.app === what.app && s.entry === what.entry) ?? fail('not_found', t('noService'));
    if (!kernel.appServices.available) fail('unavailable', t('noRuntime'));
    return { type, app: what.app, entry: what.entry, params: checkServiceParams(service.params, what.params ?? {}) };
  }

  if (type === 'copy') {
    if (system) fail('invalid', t('systemCopy'));
    const from = await place(kernel, p, what.from, 'from');
    const to = await place(kernel, p, what.to, 'to');
    if (from.home && to.home && (from.home === to.home || await homeInside(kernel, p, to.home, from.home))) fail('invalid', t('intoItself'));
    if (from.mount && from.mount === to.mount && (to.path === from.path || to.path.startsWith(`${from.path.replace(/\/$/, '')}/`))) fail('invalid', t('intoItself'));
    const mode = ['versions', 'update', 'mirror'].includes(what.mode) ? what.mode : 'update';
    const keep = Number.isInteger(what.keep) && what.keep >= 1 && what.keep <= 100 ? what.keep : 7;
    return { type, from, to, mode, keep, exclude: globs(what.exclude) };
  }

  if (type === 'web') {
    const method = String(what.method ?? 'GET').toUpperCase();
    if (!METHODS.has(method)) fail('invalid', t('method'));
    let url;
    try { url = new URL(String(what.url)); } catch { fail('invalid', t('url')); }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') fail('invalid', t('httpOnly'));
    if (url.username || url.password) fail('invalid', t('credentials'));
    const headers = [];
    for (const h of Array.isArray(what.headers) ? what.headers.slice(0, 30) : []) {
      if (!plain(h) || !HEADER.test(h.name ?? '') || /^(host|content-length|connection|transfer-encoding)$/i.test(h.name)) fail('invalid', t('header', { name: String(h?.name ?? '').slice(0, 40) }));
      if (h.secret) {
        let sealed = null;
        if (typeof h.value === 'string' && h.value) {
          if (h.value.length > 4096 || /[\r\n]/.test(h.value)) fail('invalid', t('value', { name: h.name }));
          sealed = await kernel.settingSecrets.seal(h.value);
        } else {
          // Kept only for the same site: a new address could be anybody's (the secret would go there)
          const sameOrigin = old?.type === 'web' && (() => { try { return new URL(old.url).origin === url.origin; } catch { return false; } })();
          sealed = sameOrigin ? old.headers.find(x => x.secret && x.name.toLowerCase() === h.name.toLowerCase())?.sealed ?? null : null;
          if (!sealed) fail('invalid', old?.type === 'web' && !sameOrigin ? t('secretAgain', { name: h.name }) : t('secretMissing', { name: h.name }));
        }
        headers.push({ name: h.name, secret: true, sealed });
      } else {
        const value = String(h.value ?? '');
        if (value.length > 4096 || /[\r\n]/.test(value)) fail('invalid', t('value', { name: h.name }));
        headers.push({ name: h.name, value });
      }
    }
    const b = plain(what.body) ? what.body : { kind: 'none' };
    let body = { kind: 'none' };
    if (['text', 'json', 'form'].includes(b.kind)) {
      const text = String(b.text ?? '');
      if (text.length > MAX_BODY) fail('too_large', t('bodyTooBig'));
      if (b.kind === 'json') { try { JSON.parse(text); } catch { fail('invalid', t('json')); } }
      body = { kind: b.kind, text };
    } else if (b.kind === 'file') {
      await homeNode(kernel, p, b.file, 'file');
      body = { kind: 'file', file: b.file, label: label(b.label) };
    }
    if (body.kind !== 'none' && (method === 'GET' || method === 'HEAD')) fail('invalid', t('noBody', { method }));
    const e = plain(what.expect) ? what.expect : {};
    const status = e.status === 'any' ? 'any' : Number.isInteger(e.status) && e.status >= 100 && e.status <= 599 ? e.status : '2xx';
    const contains = typeof e.contains === 'string' && e.contains ? e.contains.slice(0, 500) : null;
    const timeoutS = Number.isInteger(what.timeoutS) && what.timeoutS >= 1 && what.timeoutS <= 300 ? what.timeoutS : 30;
    return { type, method, url: url.href, headers, body, expect: { status, contains }, timeoutS, saveTo: await saveTo(kernel, p, what.saveTo, ['replace', 'dated']) };
  }

  if (type === 'command') {
    const lines = typeof what.lines === 'string' ? what.lines.replace(/\r\n?/g, '\n') : '';
    if (!lines.trim()) fail('invalid', t('noCommand'));
    if (lines.length > MAX_LINES) fail('too_large', t('commandsTooLong'));
    if (system) fail('invalid', t('systemCommands'));
    let host = null;
    if (what.host !== undefined && what.host !== null) {
      const { hosts } = await kernel.terminals.list(p);
      const found = hosts.find(h => h.id === what.host) ?? fail('not_found', t('hostGone'));
      if (found.protocol !== 'ssh') fail('invalid', t('sshOnly'));
      host = what.host;
    }
    let cwd = null;
    if (!host && what.cwd !== undefined && what.cwd !== null) {
      await homeNode(kernel, p, what.cwd, 'folder');
      cwd = what.cwd;
    }
    return { type, lines, cwd, cwdLabel: label(what.cwdLabel), host, hostLabel: label(what.hostLabel), saveTo: await saveTo(kernel, p, what.saveTo, ['replace', 'append']) };
  }

  if (type === 'collection') {
    if (system) fail('invalid', t('systemCollections'));
    const node = await homeNode(kernel, p, what.file, 'file');
    if (!/\.nettest$/i.test(node.name)) fail('invalid', t('needNettest'));
    const id = v => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : null);
    const only = Array.isArray(what.only) ? what.only.slice(0, 200).map(id).filter(Boolean) : null;
    return { type, file: what.file, label: label(what.label), environment: id(what.environment), environmentLabel: label(what.environmentLabel), only: only?.length ? only : null };
  }

  if (system) fail('invalid', t('systemNoApps'));
  if (type === 'open') {
    if (what.file !== undefined) {
      if (app) fail('forbidden', t('appSelf'));
      await homeNode(kernel, p, what.file);
      return { type, file: what.file, label: label(what.label) };
    }
    if (!APP.test(what.app ?? '') || (app && what.app !== app)) fail('invalid', t('appToOpen'));
    const entry = what.entry ?? 'main';
    if (!ENTRY.test(entry)) fail('invalid', t('entry'));
    await appEntry(kernel, what.app, entry, 'window');
    return { type, app: what.app, entry, args: smallJson(what.args, 'args'), label: label(what.label) };
  }

  // automation
  const node = await homeNode(kernel, p, what.file, 'file');
  if (!/\.automata$/i.test(node.name)) fail('invalid', t('needAutomata'));
  // Nobody chooses files at that time: only automations that work on nothing (as Automata's own start at a time)
  let doc = null;
  try { doc = JSON.parse((await kernel.service('fs').read(p, node.id)).toString('utf8')); } catch { fail('invalid', t('notAutomation')); }
  if ((doc?.input ?? 'none') !== 'none') fail('invalid', t('automationInput'));
  return { type, file: what.file, label: label(what.label), values: smallJson(what.values ?? {}, 'values') };
}

/** `what` as the pages see it: secret headers without their value. */
export function publicWhat(what) {
  if (what?.type !== 'web') return what;
  return { ...what, headers: what.headers.map(h => (h.secret ? { name: h.name, secret: true, set: !!h.sealed } : h)) };
}
