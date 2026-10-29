import { Window, h, fs, toast, storage, shortcuts, settings, apps as installed } from '@lilos/sdk';
import { BRIDGE_SOURCE } from './bridge.js';
import { coversPath } from './permissions.js';

/**
 * Windows of installed apps.
 *
 * Local apps run in an iframe with sandbox="allow-scripts" and nothing else: a page with no
 * origin of its own (no access to lilOS, its storage, cookies or DOM), no forms, popups or
 * navigation of the page; its Content-Security-Policy allows only the code lilOS puts in it, the
 * libraries of the manifest and the network origins of its 'net:' permissions. The code is read
 * from the kernel and checked against the hashes of the manifest before it runs. The app talks
 * to lilOS only through messages (bridge.js), each checked here against its permissions.
 *
 * Remote apps are their own site in an iframe: they get the same messages for title and notices.
 */
const TOKENS = ['--accent', '--accent-soft', '--text', '--dim', '--faint', '--surface', '--chrome', '--side', '--field-bg', '--hover', '--border', '--danger', '--radius-sm'];
const MAX_TEXT = 10 << 20;
const STORAGE_KEY = /^[\w.-]{1,64}$/;

const escapeAttr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Inline code must not close its <script> early
const inline = code => code.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');

function theme() {
  const css = getComputedStyle(document.documentElement);
  const vars = Object.fromEntries(TOKENS.map(t => [t, css.getPropertyValue(t).trim()]).filter(([, v]) => v));
  vars['--font'] = getComputedStyle(document.body).fontFamily;
  return vars;
}

async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return `sha256-${btoa(String.fromCharCode(...new Uint8Array(digest)))}`;
}

async function sri(text, integrity) {
  const algo = { sha256: 'SHA-256', sha384: 'SHA-384', sha512: 'SHA-512' }[integrity.slice(0, 6)];
  if (!algo) return false;
  const digest = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
  return integrity.slice(7) === btoa(String.fromCharCode(...new Uint8Array(digest)));
}

/** The current keys of the app's commands: { 'Ctrl+S': 'acme.notes.save' }. */
function commandKeys(manifest) {
  const map = {};
  for (const cmd of manifest.contributes?.commands ?? []) for (const k of shortcuts.get(cmd.id) ?? []) map[k] = cmd.id;
  return map;
}

async function documentFor(pkg, args) {
  const { manifest } = pkg;
  const code = await installed.file(pkg.id, manifest.entry);
  if (await sha256(code) !== manifest.files[manifest.entry]) throw new Error(`Il codice di ${manifest.name} non corrisponde al manifesto`);
  const scripts = [], cdn = [];
  for (const lib of manifest.libraries ?? []) {
    if (lib.cache) {
      const text = await installed.library(lib.name, lib.version);
      if (!await sri(text, lib.integrity)) throw new Error(`La libreria ${lib.name} non corrisponde al suo hash`);
      scripts.push(`<script>${inline(text)}</script>`);
    } else {
      cdn.push(lib.url);
      scripts.push(`<script src="${escapeAttr(lib.url)}" integrity="${escapeAttr(lib.integrity)}" crossorigin="anonymous"></script>`);
    }
  }
  const net = (manifest.permissions ?? []).filter(p => p.startsWith('net:')).map(p => p.slice(4));
  const csp = [
    "default-src 'none'", `script-src 'unsafe-inline' ${cdn.join(' ')}`, "style-src 'unsafe-inline'",
    'img-src data: blob:', 'font-src data:', 'media-src data: blob:', 'worker-src blob:',
    `connect-src ${net.length ? net.join(' ') : "'none'"}`, "form-action 'none'", "base-uri 'none'",
  ].join('; ');
  const info = { id: pkg.id, version: pkg.version, args: args ?? null, keys: commandKeys(manifest), theme: theme() };
  return `<!doctype html><html lang="it"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${escapeAttr(csp)}">
<style>html,body{margin:0;height:100%;background:var(--surface);color:var(--text);font:13px/1.4 var(--font,system-ui)}</style>
<script data-info="${escapeAttr(JSON.stringify(info))}">${inline(BRIDGE_SOURCE)}</script>
${scripts.join('\n')}
</head><body><script type="module">${inline(code)}</script></body></html>`;
}

/** '~/Documenti/a.txt' → the node, if visible from the current workspace. */
const resolveHome = path => (typeof path === 'string' && /^~(\/[^/]+)*$/.test(path) ? fs.resolve(path.slice(1) || '/') : null);
const splitPath = path => [path.slice(0, path.lastIndexOf('/')) || '~', path.slice(path.lastIndexOf('/') + 1)];

/** Answers the messages of one app window. Returns the function that stops it. */
function connectBridge(win, frame, pkg, handles) {
  const perms = pkg.manifest.permissions ?? [];
  const fail = msg => { throw new Error(msg); };
  const target = (ref, write) => {
    if (handles.has(ref)) return fs.get(ref) ?? fail('Il file non esiste più');
    if (!coversPath(perms, ref, { write })) fail(`Permesso negato: ${ref}`);
    return resolveHome(ref);
  };
  const methods = {
    'window.setTitle': text => win.setTitle(String(text).slice(0, 100)),
    'ui.toast': text => toast(String(text).slice(0, 200)),
    'clipboard.write': text => navigator.clipboard.writeText(String(text).slice(0, MAX_TEXT)),
    'files.read': async ref => {
      const node = target(ref, false) ?? fail('Il file non esiste');
      if (node.type !== 'file') fail('Non è un file');
      return fs.read(node.id);
    },
    'files.write': async (ref, text) => {
      if (String(text).length > MAX_TEXT) fail('Testo troppo lungo');
      let node = target(ref, true);
      if (!node) {
        const [dir, name] = splitPath(ref);
        const parent = resolveHome(dir) ?? fail('La cartella non esiste');
        node = fs.create(parent.id, { type: 'file', name });
      }
      if (node.type !== 'file') fail('Non è un file');
      await fs.write(node.id, text);
    },
    'files.list': path => {
      if (!coversPath(perms, path, { write: false })) fail(`Permesso negato: ${path}`);
      const node = resolveHome(path) ?? fail('La cartella non esiste');
      return fs.children(node.id).map(n => ({ name: n.name, type: n.type, size: n.size ?? 0, modified: n.modified }));
    },
    'files.mkdir': path => {
      if (!coversPath(perms, path, { write: true })) fail(`Permesso negato: ${path}`);
      if (resolveHome(path)) return;
      const [dir, name] = splitPath(path);
      fs.create((resolveHome(dir) ?? fail('La cartella non esiste')).id, { type: 'folder', name });
    },
    'storage.get': key => (STORAGE_KEY.test(key) ? storage.get(`app:${pkg.id}:${key}`, null) : fail('Chiave non valida')),
    'storage.set': (key, value) => {
      if (!STORAGE_KEY.test(key)) fail('Chiave non valida');
      if ((JSON.stringify(value) ?? '').length > 256 << 10) fail('Valore troppo grande');
      storage.set(`app:${pkg.id}:${key}`, value);
    },
  };
  // A local app's origin is opaque ('*' is the only way to reach it); a remote app gets messages only at its own
  const targetOrigin = pkg.manifest.kind === 'remote' ? new URL(pkg.manifest.url).origin : '*';
  const post = msg => frame.contentWindow?.postMessage({ lilos: 1, ...msg }, targetOrigin);
  const onMessage = async e => {
    // Only this window's frame; its origin is opaque ('null'), so the source is what identifies it
    if (e.source !== frame.contentWindow || e.data?.lilos !== 1 || typeof e.data.method !== 'string') return;
    if (targetOrigin !== '*' && e.origin !== targetOrigin) return;
    const { id, method, params } = e.data;
    const run = Object.hasOwn(methods, method) ? methods[method] : null;
    try {
      if (!run) fail(`Funzione sconosciuta: ${method}`);
      post({ id, result: await run(...(Array.isArray(params) ? params : [])) ?? null });
    } catch (err) {
      post({ id, error: err.message });
    }
  };
  addEventListener('message', onMessage);
  const offKeys = shortcuts.on('change', () => post({ event: 'keys', data: commandKeys(pkg.manifest) }));
  const offTheme = [settings.watch('theme', () => requestAnimationFrame(() => post({ event: 'theme', data: theme() }))),
    settings.watch('accent', () => requestAnimationFrame(() => post({ event: 'theme', data: theme() })))];
  win.on('launch', args => {
    if (args?.file) handles.add(args.file);
    post({ event: 'launch', data: args ?? null });
  });
  return () => {
    removeEventListener('message', onMessage);
    offKeys?.();
    offTheme.forEach(off => off?.());
  };
}

/** The module of an installed app, as the launcher expects it: default({ args }) → Window. */
export function packageModule(pkg) {
  return {
    default: async ({ args }) => {
      const { manifest } = pkg;
      const size = manifest.contributes?.window ?? {};
      const win = new Window({ title: manifest.name, icon: manifest.icon?.glyph ?? 'help', width: size.width ?? 720, height: size.height ?? 480 });
      win.body.classList.add('pkg-body');
      const handles = new Set(args?.file ? [args.file] : []);
      let frame;
      if (manifest.kind === 'remote') {
        if (new URL(manifest.url).origin === location.origin) throw new Error('Un’app remota non può avere l’indirizzo di lilOS');
        frame = h('iframe', { class: 'pkg-frame', src: manifest.url, sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups', referrerpolicy: 'no-referrer', allow: '' });
      } else {
        frame = h('iframe', { class: 'pkg-frame', sandbox: 'allow-scripts', referrerpolicy: 'no-referrer', allow: '' });
        frame.srcdoc = await documentFor(pkg, args);
      }
      win.body.append(frame);
      const stop = connectBridge(win, frame, pkg, handles);
      win.on('destroy', stop);
      win.getState = () => (args?.file ? { file: args.file } : null);
      return win;
    },
  };
}

