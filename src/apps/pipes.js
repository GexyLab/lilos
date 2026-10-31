import { pipes, fs, apps as installed } from '@lilos/sdk';
import { apps, getApp, registry } from './registry.js';
import * as background from './packages/background.js';

/**
 * Installed apps in the pipes (the SDK's pipes.js).
 *
 *   manifest   contributes.pipes: lilOS subscribes for the app as soon as it is installed. When the
 *              event comes, it starts the background entry point and hands the event to the handler
 *              that entry point subscribed with lilos.pipes.subscribe (it does so when it starts).
 *   code       lilos.pipes.subscribe from a running window or background entry point: it lasts
 *              while that part of the app runs. Subscribing again to an event of its manifest only
 *              gives the manifest's subscription its handler (one place in the chain, not two).
 *
 * Permissions: 'pipe:<event>', or 'pipe.own:<event>' when `where` is { meta: 'own' }. Protected
 * events: system apps only; the before stage of a synchronous event: nobody but lilOS.
 * A file the app marked (node.apps[id]) that comes in an event's data is handed to that part of
 * the app (it may read and write it); other files only come as data.
 *
 * Also here, lilOS's own guard: a file whose content belongs to an app (node.apps[id].content)
 * is not read, written or opened as it is when that app is not installed.
 */
const WAKE = 15_000;   // how long a woken entry point has to subscribe

/** Running parts of apps: 'appId#entry' (or a window's key) → target. */
const targets = new Map();
const manifestOff = new Map();   // appId → functions taking its manifest subscriptions away

/** A function that waits for a target to subscribe `slot`. */
const waiting = new Map();   // 'key|slot' → [resolve]

const slotOf = (event, stage) => `${event}/${stage}`;
const pkgOf = id => getApp(id)?.package ?? null;

/** Throws if the app may not subscribe to this event this way. */
export function checkPipe(pkg, event, { stage = 'after', where = null } = {}) {
  const def = pipes.describe(event);
  if (!def) throw new Error(`Evento sconosciuto: ${String(event).slice(0, 60)}`);
  if (def.owner === pkg.id) return;
  const perms = pkg.manifest.permissions ?? [];
  const own = where?.meta === 'own';
  if (!perms.includes(`pipe:${event}`) && !(own && perms.includes(`pipe.own:${event}`))) {
    throw new Error(`Permesso negato: pipe:${event}${own ? ` (o pipe.own:${event})` : ''}`);
  }
  if (def.protected && !pkg.system) throw new Error(`L’evento ${event} è riservato al sistema`);
  if (def.sync && stage === 'before') throw new Error(`${event} è un’operazione immediata: si può solo osservare (stage "after")`);
}

const owner = (pkg, entry, key) => ({ key, app: pkg.id, entry, name: getApp(pkg.id)?.name ?? pkg.id, trusted: pkg.system === true });

/**
 * A running part of an app that can take pipe calls:
 *   { key, pkg, entry, handles: Set, deliver(subId, data, ctx) → Promise }
 * Returns its methods for `lilos.pipes` and close() for when it stops.
 */
export function pipeTarget({ key, pkg, entry, handles, deliver }) {
  const target = { key, pkg, entry, handles, deliver, subs: new Map(), offs: new Map() };
  targets.set(key, target);
  // The node in the data is checked in lilOS's own tree, not believed (an app's event carries what it wants)
  const grant = data => {
    if (typeof data?.node?.id === 'string' && fs.appMeta(data.node.id, pkg.id)) handles.add(data.node.id);
  };
  const call = sub => async (data, ctx) => {
    grant(data);
    return target.deliver(sub, data, ctx);
  };
  return {
    target,
    subscribe(event, opts) {
      const stage = opts?.stage ?? 'after';
      const where = opts?.where ?? null;
      const sub = `s${Math.random().toString(36).slice(2, 10)}`;
      const slot = slotOf(event, stage);
      // An event of the manifest (checked when the app was registered): its subscription now has
      // its handler, with the manifest's where whatever this call says
      if (manifestPipes(pkg).some(p => p.entry === entry && slotOf(p.event, p.stage) === slot) && manifestOff.has(pkg.id) && !target.subs.has(slot)) {
        target.subs.set(slot, sub);
        (waiting.get(`${key}|${slot}`) ?? []).forEach(resolve => resolve());
        waiting.delete(`${key}|${slot}`);
        return sub;
      }
      checkPipe(pkg, event, { stage, where });
      // The key stays the same from one run to the next: the user's order of the chain keeps it
      const off = pipes.subscribe(event, { stage, position: opts?.position ?? 'middle', where }, call(sub), owner(pkg, entry, `${pkg.id}#${entry}:${slot}`));
      target.offs.set(sub, off);
      changed();
      return sub;
    },
    unsubscribe(sub) {
      target.offs.get(sub)?.();
      target.offs.delete(sub);
      for (const [slot, s] of target.subs) if (s === sub) target.subs.delete(slot);
      changed();
    },
    close() {
      target.offs.forEach(off => off());
      target.offs.clear();
      target.subs.clear();
      if (targets.get(key) === target) targets.delete(key);
      changed();
    },
  };
}

/** The pipes the app's manifest declares, kept to those of background entry points. */
const manifestPipes = pkg => (Array.isArray(pkg?.manifest?.contributes?.pipes) ? pkg.manifest.contributes.pipes : []);

/** Subscribes an installed app's manifest pipes (again, for a new version). */
function registerManifest(app) {
  manifestOff.get(app.id)?.forEach(off => off());
  manifestOff.delete(app.id);
  const pkg = app?.package;
  if (!pkg || pkg.manifest.kind !== 'local') return;
  const offs = [];
  for (const p of manifestPipes(pkg)) {
    try {
      checkPipe(pkg, p.event, p);
      const key = `${app.id}#${p.entry}`;
      const slot = slotOf(p.event, p.stage);
      offs.push(pipes.subscribe(p.event, { stage: p.stage, position: p.position ?? 'middle', where: p.where ?? null }, async (data, ctx) => {
        const target = await wake(getApp(app.id), p.entry, key, slot);
        if (typeof data?.node?.id === 'string' && fs.appMeta(data.node.id, app.id)) target.handles.add(data.node.id);
        return target.deliver(target.subs.get(slot), data, ctx);
      }, owner(pkg, p.entry, key)));
    } catch (err) {
      console.warn(`[lilos] ${app.id}: pipe ${p.event} non attiva:`, err.message);
    }
  }
  if (offs.length) manifestOff.set(app.id, offs);
  changed();
}

/** Starts the entry point if needed; resolves once it has subscribed `slot`. */
async function wake(app, entry, key, slot) {
  if (!app) throw new Error('L’app non è più installata');
  await background.start(app, entry);
  const target = targets.get(key);
  if (target?.subs.has(slot)) return target;
  await new Promise((resolve, reject) => {
    const wait = `${key}|${slot}`;
    const timer = setTimeout(() => {
      waiting.set(wait, (waiting.get(wait) ?? []).filter(fn => fn !== done));
      reject(new Error(`${app.name} non gestisce ${slot.replace('/', ' ')} (manca lilos.pipes.subscribe)`));
    }, WAKE);
    const done = () => { clearTimeout(timer); resolve(); };
    waiting.set(wait, [...(waiting.get(wait) ?? []), done]);
  });
  return targets.get(key);
}

let notifying = 0;
function changed() {
  clearTimeout(notifying);
  notifying = setTimeout(() => pipes.notify('pipes.change', {}), 50);
}

/**
 * Files whose content is an app's: without the app, or with its pipes not working (a permission
 * not granted, a manifest that lost them), they are not opened, read or written as they are.
 */
function guard() {
  const handles = (id, event, stage) => pipes.chain(event, stage).some(s => s.app === id);
  const ready = id => !!getApp(id) && handles(id, 'file.read', 'after') && handles(id, 'file.write', 'before');
  const missing = node => Object.entries(node?.apps ?? {}).find(([id, v]) => v?.content === true && !ready(id))?.[0];
  const where = data => !!missing(data?.node);
  const stop = data => {
    const id = missing(data.node);
    const name = installed.list().find(p => p.id === id)?.manifest?.name ?? id;
    return { stop: { error: `Per aprire «${data.node.name}» serve l’app ${name}: installala dall’AppStore` } };
  };
  const lilos = { key: 'lilos:content', name: 'lilOS', trusted: true };
  for (const event of ['file.open', 'file.read', 'file.write']) pipes.subscribe(event, { stage: 'before', position: 'first', where }, stop, lilos);
}

/** At start-up, after the installed apps are in the registry. */
export function connectPipes() {
  guard();
  apps.forEach(registerManifest);
  registry.on('change', ({ id, app }) => {
    if (app) registerManifest(app);
    else {
      manifestOff.get(id)?.forEach(off => off());
      manifestOff.delete(id);
      pipes.forgetApp(id);
      changed();
    }
  });
}

/** The pipes of an app (Proprietà, Control Panel): [{ event, stage, entry, where, from: 'manifest' | 'code' }]. */
export function appPipes(id) {
  const pkg = pkgOf(id);
  const out = manifestPipes(pkg).map(p => ({ event: p.event, stage: p.stage, entry: p.entry, where: p.where ?? null, from: 'manifest' }));
  for (const event of pipes.catalog()) {
    for (const stage of ['before', 'after']) {
      for (const s of pipes.chain(event.name, stage)) {
        if (s.app === id && s.key.includes(':')) out.push({ event: event.name, stage, entry: s.entry, where: s.where, from: 'code' });
      }
    }
  }
  return out;
}
