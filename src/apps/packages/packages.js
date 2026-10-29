import { apps as installed, fs, storage, tags, toast, h } from '@lilos/sdk';
import { registerApp, unregisterApp, getApp } from '../registry.js';
import { registerAppCommands } from '../commands.js';
import { packageModule } from './host.js';

/**
 * Installed apps (the SDK's `apps`, from /system/app) in lilOS's registry, kept in step while
 * lilOS runs: installed, updated and removed apps appear, change and go without reloading.
 *
 * Each user, the first time they meet an app (or a new version of it), gets what its manifest
 * asks to do in their home ("install", and "update" for the versions they skipped): it only
 * creates what is missing, never overwrites. What it made is written down per user
 * ('app-setup': { [id]: { version, made: [entry], uninstall: [op] } }): when the app is gone it
 * is taken away again, except what the user changed or filled, which goes to the trash.
 */
const SETUP_KEY = 'app-setup';
const commandsOff = new Map();
let deskOf = () => null;

/**
 * A system app (from the official repository) runs inside lilOS: its module is imported from the
 * kernel, at a path with its version, so its chunks and workers load next to it; it shares
 * lilOS's SDK and system modules through /host/sdk.js and /host/system.js.
 */
function loadSystemApp(pkg) {
  const base = `/api/apps/${encodeURIComponent(pkg.id)}/v/${pkg.version}/`;
  for (const link of document.querySelectorAll(`link[data-app="${CSS.escape(pkg.id)}"]`)) {
    if (!link.href.includes(base)) link.remove();   // an older version's
  }
  for (const css of pkg.manifest.styles ?? []) {
    if (!document.querySelector(`link[data-app="${CSS.escape(pkg.id)}"][href="${base}${css}"]`)) {
      document.head.append(h('link', { rel: 'stylesheet', href: base + css, dataset: { app: pkg.id } }));
    }
  }
  return import(/* @vite-ignore */ base + pkg.manifest.entry);
}

const entry = pkg => ({
  id: pkg.id,
  name: pkg.manifest.name,
  glyph: pkg.manifest.icon?.glyph ?? 'help',
  color: pkg.manifest.icon?.color ?? '#5f6673',
  system: pkg.required === true,   // never hidden
  trusted: pkg.system === true,    // runs without a sandbox
  package: pkg,
  ...(pkg.manifest.contributes?.fileTypes?.length && { opens: pkg.manifest.contributes.fileTypes }),
  commands: (pkg.manifest.contributes?.commands ?? []).map(c => ({ id: c.id, label: c.label, keys: c.keys ?? [] })),
  load: pkg.system === true && pkg.kind === 'local' ? () => loadSystemApp(pkg) : async () => packageModule(pkg),
});

function add(pkg) {
  commandsOff.get(pkg.id)?.();
  const app = entry(pkg);
  registerApp(app);
  commandsOff.set(pkg.id, registerAppCommands([app]));
}

function remove(id) {
  document.querySelectorAll(`link[data-app="${CSS.escape(id)}"]`).forEach(link => link.remove());
  commandsOff.get(id)?.();
  commandsOff.delete(id);
  unregisterApp(id);
}

/** Before the workspaces load: every installed app in the registry. */
export function registerPackages() {
  installed.list().forEach(add);
}

/** After the system is up: changes while running, and the per-user setup. `desk()`: the current desk folder id. */
export function connectPackages({ desk }) {
  deskOf = desk;
  installed.on('change', ({ id, app }) => {
    if (app) add(app);
    else remove(id);
    setupUser().catch(err => console.error('[lilos] app:', err));
  });
  return setupUser();
}

// ---------- Per-user setup ----------

const resolveHome = path => fs.resolve(path.slice(1) || '/');
const parentOf = path => path.slice(0, path.lastIndexOf('/')) || '~';
const nameOf = path => path.slice(path.lastIndexOf('/') + 1);

/** Runs operations; returns what they made. Never overwrites what exists. */
async function run(pkg, ops) {
  const made = [];
  for (const o of ops) {
    try {
      if (o.op === 'mkdir') {
        // Every missing folder of the path
        let path = '~';
        for (const part of o.path.slice(2).split('/')) {
          const next = `${path}/${part}`;
          if (!resolveHome(next)) {
            const node = fs.create(resolveHome(path).id, { type: 'folder', name: part });
            made.push({ kind: 'node', id: node.id, modified: node.modified });
          }
          path = next;
        }
      } else if (o.op === 'write' || o.op === 'copy') {
        const path = o.op === 'write' ? o.path : o.to;
        const parent = resolveHome(parentOf(path));
        if (resolveHome(path) || !parent) continue;
        const text = o.op === 'write' ? o.text : await installed.file(pkg.id, o.from);
        const node = fs.create(parent.id, { type: 'file', name: nameOf(path) });
        await fs.write(node.id, text);
        made.push({ kind: 'node', id: node.id, modified: fs.get(node.id).modified });
      } else if (o.op === 'desktopItem' && o.target === 'app') {
        const desk = deskOf();
        if (!desk || fs.children(desk).some(n => n.type === 'app' && n.app === pkg.id)) continue;
        const node = fs.create(desk, { type: 'app', name: pkg.manifest.name, app: pkg.id });
        made.push({ kind: 'node', id: node.id, modified: node.modified });
      } else if (o.op === 'tag') {
        if (tags.byName(o.name)) continue;
        const tag = tags.create({ name: o.name, ...(o.color && { color: o.color }) });
        made.push({ kind: 'tag', id: tag.id });
      } else if (o.op === 'setting') {
        const key = `app:${pkg.id}:${o.key}`;
        if (storage.get(key) !== undefined) continue;
        storage.set(key, o.value);
        made.push({ kind: 'setting', key });
      }
    } catch (err) {
      console.warn(`[lilos] ${pkg.id}: operazione ${o.op} non eseguita:`, err.message);
    }
  }
  return made;
}

/** Takes away what an app made for this user; what the user changed or filled goes to the trash. */
function undo(record, id) {
  const trash = [];
  for (const m of [...record.made].reverse()) {
    if (m.kind === 'node') {
      const node = fs.get(m.id);
      if (!node) continue;
      const touched = node.type === 'folder' ? fs.children(node.id).length > 0 : node.modified !== m.modified;
      if (touched) trash.push(node.id);
      else fs.remove(node.id);
    } else if (m.kind === 'tag' && tags.get(m.id) && !fs.tagged(m.id).length) {
      tags.remove(m.id);
    } else if (m.kind === 'setting') {
      storage.remove(m.key);
    }
  }
  // Explicit 'remove' operations of the manifest: to the trash, so nothing is lost by mistake
  for (const o of record.uninstall ?? []) {
    const node = o.op === 'remove' && resolveHome(o.path);
    if (node) trash.push(node.id);
  }
  if (trash.length) {
    fs.trash(trash);
    toast(`Rimossa ${record.name ?? id}: ${trash.length} elementi modificati sono nel Cestino`, { timeout: 6000 });
  }
  for (const key of storage.keys()) if (key.startsWith(`app:${id}:`)) storage.remove(key);
}

let running = Promise.resolve();

function setupUser() {
  running = running.then(async () => {
    const records = storage.get(SETUP_KEY, {});
    const done = records && typeof records === 'object' && !Array.isArray(records) ? records : {};
    const list = installed.list();
    for (const pkg of list) {
      const record = done[pkg.id];
      if (record?.version === pkg.version) continue;
      const { manifest } = pkg;
      const updates = record ? (manifest.update ?? []).filter(s => matchesFrom(s.from, record.version)).flatMap(s => s.ops) : [];
      const made = await run(pkg, [...updates, ...(manifest.install ?? [])]);
      done[pkg.id] = { version: pkg.version, name: manifest.name, made: [...(record?.made ?? []), ...made], uninstall: manifest.uninstall ?? [] };
      storage.set(SETUP_KEY, done);
    }
    for (const id of Object.keys(done)) {
      if (list.some(p => p.id === id)) continue;
      undo(done[id], id);
      delete done[id];
      storage.set(SETUP_KEY, done);
    }
  });
  return running;
}

function matchesFrom(range, version) {
  const m = /^(<=?|=)?(\d+)\.(\d+)\.(\d+)$/.exec(range);
  const v = /^(\d+)\.(\d+)\.(\d+)$/.exec(version ?? '');
  if (!m || !v) return false;
  const c = (+v[1] - +m[2]) || (+v[2] - +m[3]) || (+v[3] - +m[4]);
  return m[1] === '<' ? c < 0 : m[1] === '<=' ? c <= 0 : c === 0;
}
