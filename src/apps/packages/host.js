import { Window, h, shortcuts, settings } from '@lilos/sdk';
import { BRIDGE_SOURCE, lilosApi } from './bridge.js';
import { appCode, libraryCode, entrypoints, escapeAttr, inline, netOrigins } from './code.js';
import { isIsolated } from './isolation.js';
import { hostMethods, invoke, transferOf } from './methods.js';
import { handleCommand } from '../commands.js';

/**
 * Windows of installed apps. The code is read from the kernel and checked against the hashes of
 * the manifest before it runs, whatever the way it runs (isolation.js):
 *
 * Isolated: an iframe with sandbox="allow-scripts" and nothing else: a page with no origin of its
 * own (no access to lilOS, its storage, cookies or DOM), no forms, popups or navigation of the
 * page; its Content-Security-Policy allows only the code lilOS puts in it, the libraries of the
 * manifest and the network origins of its 'net:' permissions. The app talks to lilOS only through
 * messages (bridge.js), each checked against its permissions (methods.js).
 *
 * Not isolated (sdk '2' only): the app's module runs in lilOS's page and draws in a Shadow DOM
 * inside the window, which keeps its styles and lilOS's apart. It gets the same `lilos`, called
 * directly; nothing stops it from going around it.
 *
 * Remote apps are their own site in an iframe: they get the same messages for title and notices.
 */
const TOKENS = ['--accent', '--accent-soft', '--text', '--dim', '--faint', '--surface', '--chrome', '--side', '--field-bg', '--hover', '--border', '--danger', '--radius-sm'];
const SHADOW_CSS = ':host{all:initial;display:block;height:100%;overflow:auto;box-sizing:border-box;background:var(--surface);color:var(--text);font:13px/1.4 var(--font)}';

function theme() {
  const css = getComputedStyle(document.documentElement);
  const vars = Object.fromEntries(TOKENS.map(t => [t, css.getPropertyValue(t).trim()]).filter(([, v]) => v));
  vars['--font'] = getComputedStyle(document.body).fontFamily;
  return vars;
}

/** Calls fn when theme or accent change; returns the functions that stop it. */
const watchTheme = fn => ['theme', 'accent'].map(key => settings.watch(key, () => requestAnimationFrame(fn)));

/** The current keys of the app's commands: { 'Ctrl+S': 'acme.notes.save' }. */
function commandKeys(manifest) {
  const map = {};
  for (const cmd of manifest.contributes?.commands ?? []) for (const k of shortcuts.get(cmd.id) ?? []) map[k] = cmd.id;
  return map;
}

// ---------- Isolated: a sandbox ----------

async function documentFor(pkg, args, entry) {
  const { manifest } = pkg;
  const ep = entrypoints(manifest)[entry];
  const code = await appCode(pkg, ep.file ?? manifest.entry);
  const scripts = [], cdn = [];
  for (const lib of manifest.libraries ?? []) {
    if (lib.cache) {
      scripts.push(`<script>${inline(await libraryCode(lib))}</script>`);
    } else {
      cdn.push(lib.url);
      scripts.push(`<script src="${escapeAttr(lib.url)}" integrity="${escapeAttr(lib.integrity)}" crossorigin="anonymous"></script>`);
    }
  }
  const net = netOrigins(manifest);
  const csp = [
    "default-src 'none'", `script-src 'unsafe-inline' blob: 'wasm-unsafe-eval' ${cdn.join(' ')}`, "style-src 'unsafe-inline'",
    'img-src data: blob:', 'font-src data:', 'media-src data: blob:', 'worker-src blob:',
    `connect-src ${net.length ? net.join(' ') : "'none'"}`, "form-action 'none'", "base-uri 'none'",
  ].join('; ');
  const info = { id: pkg.id, version: pkg.version, entry, args: args ?? null, keys: commandKeys(manifest), theme: theme() };
  // sdk '1': the module is the app; sdk '2': the entry point is one of its exports
  const run = String(manifest.sdk) === '2'
    ? `<script type="module">
(async () => {
  const mod = await import(URL.createObjectURL(new Blob([${inline(JSON.stringify(code))}], { type: 'text/javascript' })));
  const run = mod[${JSON.stringify(entry)}];
  if (typeof run !== 'function') throw new Error('Il codice non esporta ' + ${JSON.stringify(entry)});
  await run({ lilos, root: document.body, args: lilos.app.args });
})().catch(err => parent.postMessage({ lilos: 1, id: 0, method: 'app.failed', params: [String(err && err.message || err)] }, '*'));
</script>`
    : `<script type="module">${inline(code)}</script>`;
  return `<!doctype html><html lang="it"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${escapeAttr(csp)}">
<style>html,body{margin:0;height:100%;background:var(--surface);color:var(--text);font:13px/1.4 var(--font,system-ui)}</style>
<script data-info="${escapeAttr(JSON.stringify(info))}">${inline(BRIDGE_SOURCE)}</script>
${scripts.join('\n')}
${run}
</head><body></body></html>`;
}

/** Answers the messages of one sandboxed window. Returns the function that stops it. */
function connectBridge(win, frame, pkg, handles) {
  const methods = hostMethods({ pkg, win, handles });
  // A local app's origin is opaque ('*' is the only way to reach it); a remote app gets messages only at its own
  const targetOrigin = pkg.manifest.kind === 'remote' ? new URL(pkg.manifest.url).origin : '*';
  const post = (msg, transfer = []) => frame.contentWindow?.postMessage({ lilos: 1, ...msg }, targetOrigin, transfer);
  const onMessage = async e => {
    // Only this window's frame; its origin is opaque ('null'), so the source is what identifies it
    if (e.source !== frame.contentWindow || e.data?.lilos !== 1 || typeof e.data.method !== 'string') return;
    if (targetOrigin !== '*' && e.origin !== targetOrigin) return;
    const { id, method, params } = e.data;
    try {
      const result = (await invoke(methods, method, params)) ?? null;
      post({ id, result }, transferOf(result));
    } catch (err) {
      post({ id, error: err.message });
    }
  };
  addEventListener('message', onMessage);
  const offKeys = shortcuts.on('change', () => post({ event: 'keys', data: commandKeys(pkg.manifest) }));
  const offTheme = watchTheme(() => post({ event: 'theme', data: theme() }));
  win.on('grant', ids => ids.forEach(id => handles.add(id)));
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

// ---------- Not isolated: in lilOS's page ----------

const pageLibraries = new Map();   // 'name@version' → Promise (loaded once, as classic scripts)
const pageModules = new Map();     // 'id@version/file' → Promise<module>

function loadPageLibraries(manifest) {
  return Promise.all((manifest.libraries ?? []).map(lib => {
    const key = `${lib.name}@${lib.version}`;
    if (!pageLibraries.has(key)) {
      pageLibraries.set(key, libraryCode(lib).then(text => new Promise((resolve, reject) => {
        const s = h('script', { src: URL.createObjectURL(new Blob([text], { type: 'text/javascript' })) });
        s.onload = resolve;
        s.onerror = () => reject(new Error(`Libreria ${lib.name} non caricata`));
        document.head.append(s);
      })));
      pageLibraries.get(key).catch(() => pageLibraries.delete(key));
    }
    return pageLibraries.get(key);
  }));
}

function pageModule(pkg, file) {
  const key = `${pkg.id}@${pkg.version}/${file}`;
  if (!pageModules.has(key)) {
    pageModules.set(key, appCode(pkg, file).then(code => import(/* @vite-ignore */ URL.createObjectURL(new Blob([code], { type: 'text/javascript' })))));
    pageModules.get(key).catch(() => pageModules.delete(key));
  }
  return pageModules.get(key);
}

async function mountInPage(win, pkg, entry, args, handles) {
  const { manifest } = pkg;
  const ep = entrypoints(manifest)[entry];
  await loadPageLibraries(manifest);
  const mod = await pageModule(pkg, ep.file ?? manifest.entry);
  const run = mod[entry];
  if (typeof run !== 'function') throw new Error(`Il codice di ${manifest.name} non esporta ${entry}`);

  const host = h('div', { class: 'pkg-host' });
  const root = host.attachShadow({ mode: 'open' });
  root.append(h('style', {}, SHADOW_CSS));
  win.body.append(host);

  const methods = hostMethods({ pkg, win, handles });
  const info = { id: pkg.id, version: pkg.version, entry, args: args ?? null };
  const { api, emit } = lilosApi((method, ...params) => Promise.resolve().then(() => invoke(methods, method, params)), info);
  // The keyboard reaches lilOS's page: shortcuts go to the active window of the app
  const offs = (manifest.contributes?.commands ?? []).map(cmd => handleCommand(cmd.id, { isActive: () => win.active, run: () => emit('command', cmd.id) }));
  offs.push(...watchTheme(() => emit('theme', theme())));
  win.on('grant', ids => ids.forEach(id => handles.add(id)));
  win.on('launch', a => {
    if (a?.file) handles.add(a.file);
    emit('launch', a ?? null);
  });
  let dispose = null;
  win.on('destroy', () => {
    offs.forEach(off => off?.());
    try { dispose?.(); } catch (err) { console.error(`[lilos] ${pkg.id}:`, err); }
  });
  const out = await run({ lilos: api, root, args: args ?? null });
  if (typeof out === 'function') dispose = out;
}

/**
 * The module of an installed app, as the launcher expects it: default({ args, entry, files }) → Window.
 * The app may read and write args.file and the `files` the user handed it.
 */
export function packageModule(pkg) {
  return {
    default: async ({ args, entry = 'main', files = [] }) => {
      const { manifest } = pkg;
      const ep = entrypoints(manifest)[entry];
      if (ep?.kind !== 'window') throw new Error(`${manifest.name} non ha la finestra ${entry}`);
      const size = ep.window ?? manifest.contributes?.window ?? {};
      const title = entry === 'main' ? manifest.name : ep.label ?? manifest.name;
      const win = new Window({ title, icon: manifest.icon?.glyph ?? 'help', width: size.width ?? 720, height: size.height ?? 480 });
      win.body.classList.add('pkg-body');
      const handles = new Set([...(args?.file ? [args.file] : []), ...files]);
      win.getState = () => (args?.file ? { file: args.file } : null);
      if (manifest.kind === 'local' && !isIsolated(pkg)) {
        await mountInPage(win, pkg, entry, args, handles);
        return win;
      }
      let frame;
      if (manifest.kind === 'remote') {
        if (new URL(manifest.url).origin === location.origin) throw new Error('Un’app remota non può avere l’indirizzo di lilOS');
        frame = h('iframe', { class: 'pkg-frame', src: manifest.url, sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups', referrerpolicy: 'no-referrer', allow: '' });
      } else {
        frame = h('iframe', { class: 'pkg-frame', sandbox: 'allow-scripts', referrerpolicy: 'no-referrer', allow: '' });
        frame.srcdoc = await documentFor(pkg, args, entry);
      }
      win.body.append(frame);
      const stop = connectBridge(win, frame, pkg, handles);
      win.on('destroy', stop);
      return win;
    },
  };
}
