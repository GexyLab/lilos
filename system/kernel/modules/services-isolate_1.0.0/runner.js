import ivm from 'isolated-vm';

/**
 * One service, in a process of its own (started by index.js with Node's permission model: it
 * reads only this module's folder, runs no programs and opens no files). The code of the app runs
 * in a V8 isolate inside it: no require, no process, no network, no files. What it may do goes
 * through `lilos`, whose calls come back to the kernel (index.js → host.call), which checks them.
 *
 * Messages with index.js (IPC):
 *   in    { type: 'start', code, info, limits }   { type: 'request', id, data, from }
 *         { type: 'reply', id, result | error }   { type: 'stop' }
 *   out   { type: 'ready' }   { type: 'failed', error }   { type: 'answer', id, result | error }
 *         { type: 'call', id, method, params }    { type: 'log', level, text }   { type: 'exit', reason }
 */
const MAX_TIMERS = 1000;
const send = msg => process.send?.(msg);
const exit = reason => {
  send({ type: 'exit', reason });
  setTimeout(() => process.exit(1), 50);
};

// The service's lilos and the few globals it gets, built inside the isolate
const BOOT = `
'use strict';
const info = JSON.parse(_info);
delete globalThis._info;
const call = async (method, params) => JSON.parse(await _call.apply(undefined, [method, JSON.stringify(params)], { result: { promise: true } }));
const text = args => args.map(a => {
  if (typeof a === 'string') return a;
  if (a instanceof Error) return a.stack || a.message;
  try { return JSON.stringify(a); } catch { return String(a); }
}).join(' ');
const log = level => (...args) => _log.applyIgnored(undefined, [level, text(args)]);
globalThis.console = Object.freeze({ log: log('info'), info: log('info'), debug: log('info'), warn: log('warn'), error: log('error') });

const timers = new Map();
let nextTimer = 1;
const timer = repeat => (fn, ms, ...args) => {
  if (typeof fn !== 'function') throw new TypeError('Serve una funzione');
  const id = nextTimer++;
  timers.set(id, { fn, args, repeat });
  _timer.applyIgnored(undefined, [id, Math.max(0, Number(ms) || 0), repeat]);
  return id;
};
const clear = id => { if (timers.delete(id)) _clear.applyIgnored(undefined, [id]); };
globalThis.setTimeout = timer(false);
globalThis.setInterval = timer(true);
globalThis.clearTimeout = clear;
globalThis.clearInterval = clear;
globalThis.__fire = id => {
  const t = timers.get(id);
  if (!t) return;
  if (!t.repeat) timers.delete(id);
  try {
    const out = t.fn(...t.args);
    if (out && typeof out.then === 'function') out.then(null, err => console.error('Errore in un timer:', err));
  } catch (err) {
    console.error('Errore in un timer:', err);
  }
};

let handler = null;
const lilos = Object.freeze({
  app: Object.freeze({ id: info.id, version: info.version, entry: info.entry, args: info.args, user: info.user }),
  handle(fn) {
    if (typeof fn !== 'function') throw new TypeError('lilos.handle vuole una funzione');
    handler = fn;
  },
  storage: Object.freeze({ get: key => call('storage.get', [key]), set: (key, value) => call('storage.set', [key, value]) }),
  files: Object.freeze({
    read: path => call('files.read', [path]),
    write: (path, text) => call('files.write', [path, text]),
    list: path => call('files.list', [path]),
    mkdir: path => call('files.mkdir', [path]),
  }),
  net: Object.freeze({ fetch: (url, options) => call('net.fetch', [url, options ?? {}]) }),
  ui: Object.freeze({ notify: text => call('ui.notify', [text]) }),
});
globalThis.__start = fn => fn({ lilos, args: info.args });
globalThis.__request = async (data, from) => {
  if (!handler) throw new Error('Il servizio non risponde: non ha chiamato lilos.handle()');
  return JSON.stringify((await handler(JSON.parse(data), JSON.parse(from))) ?? null);
};
`;

let isolate = null;
let memoryMb = 128;
let cpuMs = 10_000;
const calls = new Map();
const timers = new Map();
let nextCall = 1;
let fire = null;
let request = null;

/** A failure of the isolate: out of memory ends the service. */
const check = err => {
  if (isolate?.isDisposed) exit(`memoria esaurita (al massimo ${memoryMb} MB)`);
  return err;
};

async function start({ code, info, limits }) {
  cpuMs = limits?.cpuMs ?? cpuMs;
  memoryMb = limits?.memoryMb ?? memoryMb;
  isolate = new ivm.Isolate({ memoryLimit: memoryMb });
  const context = await isolate.createContext();
  const jail = context.global;
  await jail.set('_info', JSON.stringify(info));
  await jail.set('_call', new ivm.Reference((method, params) => new Promise((resolve, reject) => {
    const id = nextCall++;
    calls.set(id, { resolve, reject });
    send({ type: 'call', id, method, params: JSON.parse(params) });
  })));
  await jail.set('_log', new ivm.Reference((level, text) => send({ type: 'log', level, text })));
  await jail.set('_timer', new ivm.Reference((id, ms, repeat) => {
    if (timers.size >= MAX_TIMERS) return;
    const run = () => {
      if (!repeat) timers.delete(id);
      if (isolate.isDisposed) return;
      fire?.apply(undefined, [id], { timeout: cpuMs }).catch(err => {
        check(err);
        send({ type: 'log', level: 'error', text: `Timer: ${err.message}` });
      });
    };
    timers.set(id, repeat ? setInterval(run, Math.max(10, ms)) : setTimeout(run, ms));
  }));
  await jail.set('_clear', new ivm.Reference(id => {
    clearTimeout(timers.get(id));
    clearInterval(timers.get(id));
    timers.delete(id);
  }));
  await context.eval(BOOT, { timeout: cpuMs });
  fire = await jail.get('__fire', { reference: true });
  request = await jail.get('__request', { reference: true });

  const mod = await isolate.compileModule(code, { filename: `${info.id}/${info.entry}.js` });
  await mod.instantiate(context, spec => { throw new Error(`import non permesso: ${spec}`); });
  await mod.evaluate({ timeout: cpuMs });
  const main = await mod.namespace.get(info.entry, { reference: true });
  if (main.typeof !== 'function') throw new Error(`Il codice non esporta la funzione ${info.entry}`);
  const begin = await jail.get('__start', { reference: true });
  await begin.apply(undefined, [main.derefInto()], { result: { promise: true }, timeout: cpuMs });
}

process.on('message', async m => {
  if (!m || typeof m !== 'object') return;
  if (m.type === 'start') {
    try {
      await start(m);
      send({ type: 'ready' });
    } catch (err) {
      check(err);
      send({ type: 'failed', error: err.message });
      setTimeout(() => process.exit(1), 50);
    }
  } else if (m.type === 'request') {
    try {
      const out = await request.apply(undefined, [JSON.stringify(m.data ?? null), JSON.stringify(m.from ?? null)], { result: { promise: true }, timeout: cpuMs });
      send({ type: 'answer', id: m.id, result: JSON.parse(out) });
    } catch (err) {
      check(err);
      send({ type: 'answer', id: m.id, error: err.message });
    }
  } else if (m.type === 'reply') {
    const c = calls.get(m.id);
    if (!c) return;
    calls.delete(m.id);
    if (m.error) c.reject(new Error(m.error));
    else c.resolve(JSON.stringify(m.result ?? null));
  } else if (m.type === 'stop') {
    process.exit(0);
  }
});

// The kernel went away: so does the service
process.on('disconnect', () => process.exit(0));
