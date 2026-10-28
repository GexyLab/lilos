import { Emitter, fs } from '@lilos/sdk';
import { editorConfig, isSchemaUrl } from '../lang/config.js';
import { LanguageClient, workerTransport, socketTransport } from './client.js';

/**
 * Which language server serves which language, shared by all Editor windows:
 * an external server (WebSocket, from the settings) wins over the built-in one (Web Worker).
 * Servers start on first use and stop when the settings no longer use them.
 *
 * Also: document URIs of lilOS files, and JSON schemas (settings → 'json.schemas', content
 * served to the servers through 'lilos/schemaContent').
 *
 * Events: 'changed' — servers were started/stopped by a settings change: editors reconnect.
 */
export const servers = new Emitter();

const BUILTIN_WORKERS = {
  json: () => new Worker(new URL('./workers/json.worker.js', import.meta.url), { type: 'module', name: 'lilos-json' }),
  css: () => new Worker(new URL('./workers/css.worker.js', import.meta.url), { type: 'module', name: 'lilos-css' }),
  html: () => new Worker(new URL('./workers/html.worker.js', import.meta.url), { type: 'module', name: 'lilos-html' }),
};

const clients = new Map();   // key → LanguageClient (its `started` promise resolves once initialized)

/** 'file:///lilos/Documenti/a.json' for a lilOS file. */
export const fileUri = id => 'file:///lilos' + fs.path(id).split('/').map(encodeURIComponent).join('/');

function serverKey(lang) {
  const external = editorConfig.get('external').find(s => s.lang === lang.id);
  if (external) return { key: `ws:${external.url}`, label: `Server esterno (${external.url})`, make: () => socketTransport(external.url) };
  if (lang.server && editorConfig.get('builtin')[lang.server]) {
    return { key: `builtin:${lang.server}`, label: `Server ${lang.server.toUpperCase()} (nel browser)`, make: () => workerTransport(BUILTIN_WORKERS[lang.server]()) };
  }
  return null;
}

/** The started client for a language, or null if no server is configured for it. */
export function clientFor(lang) {
  const spec = serverKey(lang);
  if (!spec) return null;
  const existing = clients.get(spec.key);
  // A server that failed (or closed) is created again on the next attempt
  if (existing && existing.status !== 'error' && existing.status !== 'closed') return existing.started;
  const client = new LanguageClient(spec.label, spec.make(), { requests: { 'lilos/schemaContent': ({ uri }) => schemaContent(uri) } });
  client.started = client.start().then(c => { if (c.ready) c.configure(settingsFor()); return c; });
  clients.set(spec.key, client);
  return client.started;
}

// ---------- JSON schemas ----------

/** URI of a schema source: a lilOS file or a web address. */
export function schemaUri(source) {
  if (source?.type === 'file' && fs.exists(source.id)) return fileUri(source.id);
  if (source?.type === 'url' && isSchemaUrl(source.url)) return source.url;
  return null;
}

function settingsFor() {
  const schemas = [];
  for (const [fileId, source] of Object.entries(editorConfig.get('schemas'))) {
    const uri = schemaUri(source);
    if (uri && fs.exists(fileId)) schemas.push({ uri, fileMatch: [fileUri(fileId)] });
  }
  return { json: { schemas } };
}

/** Content of a schema asked by a server: lilOS files are read, web addresses downloaded. */
async function schemaContent(uri) {
  if (uri.startsWith('file:///lilos/')) {
    const path = decodeURIComponent(uri.slice('file:///lilos'.length));
    const node = fs.resolve(path);
    if (!node || node.type !== 'file') throw new Error(`Schema non trovato: ${path}`);
    return fs.read(node.id);
  }
  if (!isSchemaUrl(uri)) throw new Error(`Indirizzo dello schema non valido: ${uri}`);
  // No cookies to other sites; the server must allow cross-origin requests (CORS)
  const res = await fetch(uri, { credentials: 'omit' });
  if (!res.ok) throw new Error(`Impossibile scaricare lo schema (${res.status})`);
  return res.text();
}

function pushSchemas() {
  for (const client of clients.values()) if (client.ready) client.configure(settingsFor());
}

// ---------- Settings and file changes ----------

editorConfig.on('change', async section => {
  if (section === 'schemas') return pushSchemas();
  if (section !== 'builtin' && section !== 'external') return;
  // Stop the servers no longer configured, then let the editors reconnect
  const wanted = new Set();
  for (const s of editorConfig.get('external')) wanted.add(`ws:${s.url}`);
  for (const [k, on] of Object.entries(editorConfig.get('builtin'))) if (on) wanted.add(`builtin:${k}`);
  for (const [key, client] of clients) {
    if (wanted.has(key)) continue;
    clients.delete(key);
    client.started.then(c => c.stop()).catch(() => {});
  }
  servers.emit('changed');
});

// Schema files renamed, moved or edited: their URIs or content changed
fs.on('change', e => {
  const used = new Set(Object.values(editorConfig.get('schemas')).filter(s => s.type === 'file').map(s => s.id));
  const files = new Set(Object.keys(editorConfig.get('schemas')));
  if (used.has(e.node.id) || files.has(e.node.id) || e.ids?.some(id => used.has(id) || files.has(id))) pushSchemas();
});
