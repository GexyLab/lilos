import { automation, pipes, fs } from '@lilos/sdk';

/**
 * The recorder of lilOS's own steps: while the user records an automation it watches the events
 * of the pipes (after, only to look) and the windows that close, and tells them as steps of the
 * actions in actions.js. Nothing is watched while nobody records.
 *
 * What happens in the same moment is one step: dragging three files into a folder is one
 * «Sposta» of three items; a setting moved by a slider is one step with its last value.
 * What lilOS does by itself is left out: the automations' own files (AUTOMATIONS folder),
 * Automata's windows, what an app opens because a file was opened.
 */
const OWNER = { trusted: true, name: 'Automata', key: 'automation.recorder' };
const AUTOMATA = 'automata';
export const AUTOMATIONS = '~/Automazioni';
const GROUP_MS = 40;
const SETTING_MS = 500;

let offs = [];
let buffer = null;   // { action, key, params, result, timer }
let ctx = { wm: null };
/** Where each node was when a step used it ({ id: path }): a fallback to find it again. */
const paths = new Map();

const inAutomations = node => {
  const folder = fs.resolve(AUTOMATIONS);
  return !!folder && !!node && (node.id === folder.id || fs.isInside(node.id, folder.id));
};
const listening = () => automation.recording && !automation.paused && !automation.quietNow;

function flush() {
  const b = buffer;
  buffer = null;
  if (!b) return;
  clearTimeout(b.timer);
  automation.record(b.action, { params: b.params, defaults: b.defaults ?? null, result: b.result ?? null });
}

/** A step now (after what was waiting). */
function step(action, params, extra = {}) {
  flush();
  automation.record(action, { params, ...extra });
}

/** A step that gathers what comes in the next moment with the same key (the items of one drag). */
function gather(action, key, add, wait = GROUP_MS) {
  if (buffer && (buffer.action !== action || buffer.key !== key)) flush();
  if (!buffer) buffer = { action, key, params: {}, result: null, defaults: null };
  add(buffer);
  clearTimeout(buffer.timer);
  buffer.timer = setTimeout(flush, wait);
}

const addItems = (ids, field = 'items') => b => {
  b.params[field] = [...new Set([...(b.params[field] ?? []), ...ids])];
};

function start() {
  if (offs.length) return;
  paths.clear();
  const on = (event, fn) => {
    offs.push(pipes.subscribe(event, { stage: 'after', position: 'last' }, data => {
      if (!listening()) return;
      try { fn(data); } catch (err) { console.warn('[lilos] automation:', err); }
    }, OWNER));
  };
  on('file.create', ({ node }) => {
    if (inAutomations(node)) return;
    step('lilos.create', { folder: node.parent, name: node.name, kind: node.type === 'folder' ? 'folder' : 'file' }, { result: node.id });
  });
  on('file.rename', ({ node, from }) => {
    if (inAutomations(node)) return;
    step('lilos.rename', { item: node.id, name: node.name }, { defaults: { name: from } });
  });
  on('file.move', ({ node }) => {
    if (inAutomations(node)) return;
    gather('lilos.move', node.parent, b => { addItems([node.id])(b); b.params.to = node.parent; });
  });
  on('file.copy', ({ node, source }) => {
    if (inAutomations(node)) return;
    gather('lilos.copy', node.parent, b => {
      addItems([source.id])(b);
      b.params.to = node.parent;
      b.result = [...(b.result ?? []), node.id];
    });
  });
  on('trash.put', ({ ids }) => gather('lilos.trash', '', addItems(ids)));
  on('trash.restore', ({ ids }) => gather('lilos.restore', '', addItems(ids)));
  on('file.remove', ({ node }) => gather('lilos.delete', '', addItems([node.id])));
  on('trash.purge', ({ ids }) => {
    // Everything the trash showed: emptying it; otherwise those items, deleted for good
    if (!fs.trashed().length) step('lilos.emptyTrash', {});
    else if (Array.isArray(ids)) gather('lilos.delete', '', addItems(ids));
  });
  on('tags.assign', ({ node, tags }) => step('lilos.tags', { item: node.id, tags }));
  on('file.open', ({ node, app }) => {
    if (inAutomations(node) || app === AUTOMATA) return;
    step('lilos.open', { item: node.id, app: app ?? null });
  });
  on('app.launch', ({ id, entry, args }) => {
    if (id === AUTOMATA) return;
    // A file opened (file.open told it already), or a folder in the File Manager
    if (args?.file || args?.files) return;
    if (id === 'files' && typeof args?.folder === 'string' && fs.exists(args.folder)) return step('lilos.open', { item: args.folder, app: 'files' });
    step('lilos.launch', { app: id, entry: entry ?? 'main' });
  });
  on('workspace.switch', ({ from, to }) => step('lilos.workspace', { to }, { defaults: { to: from } }));
  on('settings.change', ({ key, value }) => gather('lilos.setting', key, b => { b.params = { key, value }; }, SETTING_MS));
  on('desk.place', ({ reason, items }) => {
    if (reason === 'place') return;
    if (reason === 'arrange') return step('lilos.arrange', {});
    gather('lilos.place', '', b => {
      const list = (b.params.places ?? []).filter(p => !items.some(i => i.node.id === p.id));
      b.params.places = [...list, ...items.map(i => ({ id: i.node.id, x: i.x, y: i.y }))];
    });
  });
  // Windows closed by the user (directly: the pipe does not say which window it was). The window
  // manager forgets a window's app before telling it closed: kept here from when it opened
  const appOf = new WeakMap();
  ctx.wm?.all().forEach(w => appOf.set(w, ctx.wm.appOf(w)));
  const offOpen = ctx.wm?.on('open', win => appOf.set(win, ctx.wm.appOf(win)));
  if (offOpen) offs.push(offOpen);
  const offClose = ctx.wm?.on('close', win => {
    if (!listening()) return;
    const app = appOf.get(win) ?? ctx.wm.appOf(win);
    if (!app || app === AUTOMATA) return;
    step('lilos.close', { app, file: automation.fileOfWindow(win) });
  });
  if (offClose) offs.push(offClose);
  // Where the nodes of each step are now
  offs.push(automation.on('step', s => {
    for (const id of nodesOf(s)) if (!paths.has(id)) paths.set(id, pathOf(id));
  }));
}

function stop() {
  flush();
  offs.forEach(off => off());
  offs = [];
}

/** Where a node is, or was before it went to the trash. */
function pathOf(id) {
  if (fs.exists(id)) return fs.path(id);
  const node = fs.isTrashed(id) ? fs.trashed().find(n => n.id === id) : null;
  return node && fs.exists(node.trashed.from) ? `${fs.path(node.trashed.from)}/${node.name}` : '';
}

/** The ids of the nodes a step mentions (params of file types, its file and its result). */
export function nodesOf(s) {
  const def = automation.describe(s.action);
  const out = [];
  for (const [name, p] of Object.entries(def?.params ?? {})) {
    const v = s.params?.[name];
    if (p.type === 'file' || p.type === 'folder') { if (typeof v === 'string') out.push(v); }
    else if (p.type === 'files') { if (Array.isArray(v)) out.push(...v); }
    else if (p.type === 'places') { if (Array.isArray(v)) out.push(...v.map(x => x?.id)); }
  }
  if (typeof s.file === 'string') out.push(s.file);
  return out.filter(x => typeof x === 'string');
}

/** The path a node had when a step of this recording used it, or null. */
export const recordedPath = id => paths.get(id) ?? null;

/** Before a recording ends: what was still gathering becomes a step. */
export const flushRecorder = flush;

export function connectRecorder(context) {
  ctx = context;
  automation.on('change', ({ recording, paused }) => {
    if (!recording) stop();
    else start();
    if (paused) flush();
  });
}
