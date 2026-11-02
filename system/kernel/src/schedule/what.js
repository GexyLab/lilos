import { fail } from '../errors.js';
import { openHome, FRONT_ID } from '../api/home.js';
import { checkServiceParams } from '../apps/appServices.js';

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
 *
 * An operation of the system (owner '*') has no home: only notify (to the admins), service, web
 * without files, command on an SSH host. One made by an app (`app`) may only remind (as that app),
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
const KINDS = ['notify', 'service', 'copy', 'web', 'command', 'open', 'automation'];

const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const label = v => (typeof v === 'string' ? v.slice(0, MAX_LABEL) : '');
const smallJson = (v, what) => {
  const text = JSON.stringify(v ?? null) ?? 'null';
  if (text.length > MAX_ARGS) fail('invalid', `${what}: troppo lungo (al massimo 4 KB)`);
  return JSON.parse(text);
};

/** A node of the owner's home: { id, node } of the type wanted ('root' is the home itself). */
async function homeNode(kernel, principal, id, type) {
  if (!principal) fail('invalid', 'Un’operazione del sistema non ha una home: niente file di lilOS');
  if (typeof id !== 'string' || (id !== 'root' && !FRONT_ID.test(id))) fail('invalid', 'Elemento non valido');
  const view = await openHome(kernel, principal);
  const node = await view.fs.stat(principal, view.toBack(id, { parent: true }));
  if (!node) fail('not_found', 'Il file o la cartella non c’è più');
  const kind = node.type === 'app' && node.meta?.link ? 'link' : node.type;
  if (type && kind !== type) fail('invalid', type === 'folder' ? 'Serve una cartella' : 'Serve un file');
  return node;
}

async function place(kernel, principal, raw, what) {
  if (!plain(raw)) fail('invalid', `${what}: posto non valido`);
  if (raw.home !== undefined) {
    await homeNode(kernel, principal, raw.home, 'folder');
    return { home: raw.home, label: label(raw.label) };
  }
  if (typeof raw.mount === 'string') {
    if (!principal) fail('invalid', 'Un’operazione del sistema non usa le connessioni di rete');
    const mounts = await kernel.network.list(principal);
    if (!mounts.some(m => m.id === raw.mount)) fail('not_found', `${what}: la connessione non c’è più`);
    const path = typeof raw.path === 'string' && raw.path.startsWith('/') && raw.path.length <= 4096 && !raw.path.split('/').includes('..') ? raw.path : fail('invalid', `${what}: percorso non valido`);
    return { mount: raw.mount, path, label: label(raw.label) };
  }
  fail('invalid', `${what}: posto non valido`);
}

const globs = v => {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > MAX_GLOBS || v.some(g => typeof g !== 'string' || !g || g.length > 100 || g.includes('/'))) fail('invalid', 'Esclusioni non valide');
  return [...new Set(v)];
};

async function saveTo(kernel, principal, raw, modes) {
  if (raw === undefined || raw === null) return null;
  if (!plain(raw)) fail('invalid', 'Dove salvare: non valido');
  await homeNode(kernel, principal, raw.folder, 'folder');
  if (typeof raw.name !== 'string' || !FILE_NAME.test(raw.name) || raw.name.startsWith('.')) fail('invalid', 'Nome del file non valido');
  return { folder: raw.folder, name: raw.name, mode: modes.includes(raw.mode) ? raw.mode : modes[0], label: label(raw.label) };
}

async function appEntry(kernel, app, entry, kind) {
  const state = await kernel.installer.state(app) ?? fail('not_found', 'L’app non è installata');
  const pkg = (await kernel.installer.list()).find(p => p.id === app);
  const eps = pkg?.manifest?.entrypoints ?? { main: { kind: 'window' } };
  const ep = eps[entry] ?? (entry === 'main' ? { kind: 'window' } : null);
  if (!ep || ep.kind !== kind) fail('invalid', kind === 'service' ? 'Servizio inesistente' : 'Punto d’ingresso inesistente');
  return state;
}

/**
 * Checks `what` for an operation of `owner` ('*' or a user id, `ownerPrincipal` its principal)
 * made by `app` (or by a person: null); `old`: the `what` it replaces (for the secrets kept).
 * Returns it as it is saved.
 */
export async function checkWhat(kernel, { what, old = null, owner, app = null, ownerPrincipal }) {
  if (!plain(what) || !KINDS.includes(what.type)) fail('invalid', 'Azione non valida');
  const system = owner === '*';
  const p = ownerPrincipal;
  const t = what.type;
  if (app && !['notify', 'service', 'open'].includes(t)) fail('forbidden', 'Un’app pianifica solo promemoria, i propri servizi e la propria apertura');

  if (t === 'notify') {
    const text = typeof what.text === 'string' ? what.text.replace(/\s+/g, ' ').trim() : '';
    if (!text) fail('invalid', 'Il promemoria non ha testo');
    let open = null;
    if (plain(what.open) && what.open.file !== undefined) {
      if (app) fail('forbidden', 'Un’app apre solo se stessa');
      await homeNode(kernel, p, what.open.file);
      open = { file: what.open.file, label: label(what.open.label) };
    } else if (plain(what.open) && what.open.app !== undefined) {
      if (!APP.test(what.open.app ?? '') || (app && what.open.app !== app)) fail('invalid', 'App da aprire non valida');
      const entry = what.open.entry ?? 'main';
      if (!ENTRY.test(entry)) fail('invalid', 'Punto d’ingresso non valido');
      await appEntry(kernel, what.open.app, entry, 'window');
      open = { app: what.open.app, entry, args: smallJson(what.open.args, 'Parametri') };
    }
    return { type: t, text: text.slice(0, MAX_TEXT), level: LEVELS.has(what.level) ? what.level : 'info', open };
  }

  if (t === 'service') {
    if (!APP.test(what.app ?? '') || !ENTRY.test(what.entry ?? '')) fail('invalid', 'Servizio non valido');
    if (app && what.app !== app) fail('forbidden', 'Un’app pianifica solo i propri servizi');
    const service = (await kernel.appServices.catalog()).find(s => s.app === what.app && s.entry === what.entry) ?? fail('not_found', 'Servizio inesistente');
    if (!kernel.appServices.available) fail('unavailable', 'Nessun modulo del kernel fa girare i servizi (services-isolate)');
    return { type: t, app: what.app, entry: what.entry, params: checkServiceParams(service.params, what.params ?? {}) };
  }

  if (t === 'copy') {
    if (system) fail('invalid', 'Un’operazione del sistema non ha cartelle da copiare');
    const from = await place(kernel, p, what.from, 'Da copiare');
    const to = await place(kernel, p, what.to, 'Dove copiare');
    if (from.home && to.home && from.home === to.home) fail('invalid', 'Una cartella non si copia in se stessa');
    if (from.mount && from.mount === to.mount && (to.path === from.path || to.path.startsWith(`${from.path.replace(/\/$/, '')}/`))) fail('invalid', 'Una cartella non si copia dentro se stessa');
    const mode = ['versions', 'update', 'mirror'].includes(what.mode) ? what.mode : 'update';
    const keep = Number.isInteger(what.keep) && what.keep >= 1 && what.keep <= 100 ? what.keep : 7;
    return { type: t, from, to, mode, keep, exclude: globs(what.exclude) };
  }

  if (t === 'web') {
    const method = String(what.method ?? 'GET').toUpperCase();
    if (!METHODS.has(method)) fail('invalid', 'Metodo non permesso');
    let url;
    try { url = new URL(String(what.url)); } catch { fail('invalid', 'Indirizzo non valido'); }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') fail('invalid', 'Solo indirizzi http e https');
    if (url.username || url.password) fail('invalid', 'Le credenziali vanno in un’intestazione segreta, non nell’indirizzo');
    const headers = [];
    for (const h of Array.isArray(what.headers) ? what.headers.slice(0, 30) : []) {
      if (!plain(h) || !HEADER.test(h.name ?? '') || /^(host|content-length|connection|transfer-encoding)$/i.test(h.name)) fail('invalid', `Intestazione non valida: ${String(h?.name ?? '').slice(0, 40)}`);
      if (h.secret) {
        let sealed = null;
        if (typeof h.value === 'string' && h.value) {
          if (h.value.length > 4096 || /[\r\n]/.test(h.value)) fail('invalid', `Valore non valido: ${h.name}`);
          sealed = await kernel.settingSecrets.seal(h.value);
        } else {
          sealed = old?.type === 'web' ? old.headers.find(x => x.secret && x.name.toLowerCase() === h.name.toLowerCase())?.sealed ?? null : null;
          if (!sealed) fail('invalid', `Manca il valore segreto di ${h.name}`);
        }
        headers.push({ name: h.name, secret: true, sealed });
      } else {
        const value = String(h.value ?? '');
        if (value.length > 4096 || /[\r\n]/.test(value)) fail('invalid', `Valore non valido: ${h.name}`);
        headers.push({ name: h.name, value });
      }
    }
    const b = plain(what.body) ? what.body : { kind: 'none' };
    let body = { kind: 'none' };
    if (['text', 'json', 'form'].includes(b.kind)) {
      const text = String(b.text ?? '');
      if (text.length > MAX_BODY) fail('too_large', 'Corpo della richiesta troppo grande');
      if (b.kind === 'json') { try { JSON.parse(text); } catch { fail('invalid', 'Il corpo non è JSON valido'); } }
      body = { kind: b.kind, text };
    } else if (b.kind === 'file') {
      await homeNode(kernel, p, b.file, 'file');
      body = { kind: 'file', file: b.file, label: label(b.label) };
    }
    if (body.kind !== 'none' && (method === 'GET' || method === 'HEAD')) fail('invalid', `${method} non ha corpo`);
    const e = plain(what.expect) ? what.expect : {};
    const status = e.status === 'any' ? 'any' : Number.isInteger(e.status) && e.status >= 100 && e.status <= 599 ? e.status : '2xx';
    const contains = typeof e.contains === 'string' && e.contains ? e.contains.slice(0, 500) : null;
    const timeoutS = Number.isInteger(what.timeoutS) && what.timeoutS >= 1 && what.timeoutS <= 300 ? what.timeoutS : 30;
    return { type: t, method, url: url.href, headers, body, expect: { status, contains }, timeoutS, saveTo: await saveTo(kernel, p, what.saveTo, ['replace', 'dated']) };
  }

  if (t === 'command') {
    const lines = typeof what.lines === 'string' ? what.lines.replace(/\r\n?/g, '\n') : '';
    if (!lines.trim()) fail('invalid', 'Nessun comando');
    if (lines.length > MAX_LINES) fail('too_large', 'Comandi troppo lunghi (al massimo 8 KB)');
    let host = null;
    if (what.host !== undefined && what.host !== null) {
      if (!p) fail('invalid', 'Gli host salvati sono di un utente');
      const hosts = await kernel.terminals.list(p);
      const found = hosts.find(h => h.id === what.host) ?? fail('not_found', 'L’host salvato non c’è più');
      if (found.protocol !== 'ssh') fail('invalid', 'I comandi pianificati vanno solo su host SSH');
      host = what.host;
    } else if (system) fail('invalid', 'Un’operazione del sistema esegue comandi solo su un host SSH');
    let cwd = null;
    if (!host && what.cwd !== undefined && what.cwd !== null) {
      await homeNode(kernel, p, what.cwd, 'folder');
      cwd = what.cwd;
    }
    return { type: t, lines, cwd, cwdLabel: label(what.cwdLabel), host, hostLabel: label(what.hostLabel), saveTo: await saveTo(kernel, p, what.saveTo, ['replace', 'append']) };
  }

  if (system) fail('invalid', 'Il sistema non apre app: serve un utente');
  if (t === 'open') {
    if (what.file !== undefined) {
      if (app) fail('forbidden', 'Un’app apre solo se stessa');
      await homeNode(kernel, p, what.file);
      return { type: t, file: what.file, label: label(what.label) };
    }
    if (!APP.test(what.app ?? '') || (app && what.app !== app)) fail('invalid', 'App da aprire non valida');
    const entry = what.entry ?? 'main';
    if (!ENTRY.test(entry)) fail('invalid', 'Punto d’ingresso non valido');
    await appEntry(kernel, what.app, entry, 'window');
    return { type: t, app: what.app, entry, args: smallJson(what.args, 'Parametri'), label: label(what.label) };
  }

  // automation
  const node = await homeNode(kernel, p, what.file, 'file');
  if (!/\.automata$/i.test(node.name)) fail('invalid', 'Serve un file .automata');
  return { type: t, file: what.file, label: label(what.label), values: smallJson(what.values ?? {}, 'Valori') };
}

/** `what` as the pages see it: secret headers without their value. */
export function publicWhat(what) {
  if (what?.type !== 'web') return what;
  return { ...what, headers: what.headers.map(h => (h.secret ? { name: h.name, secret: true, set: !!h.sealed } : h)) };
}
