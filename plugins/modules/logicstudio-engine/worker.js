import { parentPort, workerData, Worker } from 'node:worker_threads';
import { Program } from './lib/runtime.js';

/**
 * One user's worker: runs all of that user's programs (tests and active ones). It talks only with
 * the kernel's main thread (index.js), which does for it everything that touches the user's data
 * or the outside (actions of the packages, consoles, windows), checked and counted as the user.
 *
 * In:  load { files }   start { id, spec, limits, lang }   stop { id, reason }   input { id, schema, block, port, value }
 *      component { id, window, component, port, value }   watch { id, on }   snapshot { id, rid }   reply { rid, ok, value, error }
 * Out: ready   started { id }   failed { id, message }   stopped { id }   call { rid, id, action, args }
 *      console { id, op, data, rid? }   ui { id, window, component, port, value }   values { id, values }
 *      states { id, states }   snapshot { rid, values }
 *
 * The same file is also the thread of a group that runs apart (workerData.thread): a worker of this
 * worker, with one program (the group's blocks) whose host sends everything up here, where the
 * program of that group answers as for its own blocks.
 *
 * Group thread, in:  init { spec, files, lang }   run { schema, group }   deliver { schema, block, port, value, pulse }
 *                    stop   reply { rid, ok, value, error }
 *                    out: ready   exit { schema, block, port, value, pulse }   values { values }   states { states }
 *                    call { rid, action, args }   console { op, data, rid? }   ui { window, component, port, value }
 *                    fail { message }   log { level, text }   stopped   unhandled { schema, block, value }
 */

const VALUE_EVERY_MS = 100;
const STOP_WAIT_MS = 3000;
const defs = new Map();
const programs = new Map();     // id → { program, watching, values: Map, states: Map, timer }
const pending = new Map();      // rid → { resolve, reject }
let nextRid = 1;
let files = [];                 // the packages' blocks.js loaded: a group's thread loads them too
let threads = 0;                // groups' threads running now (all programs of this user)

const post = msg => parentPort.postMessage(msg);

function request(msg) {
  const rid = nextRid++;
  return new Promise((resolve, reject) => {
    pending.set(rid, { resolve, reject });
    post({ ...msg, rid });
  });
}

function answered(msg) {
  const p = pending.get(msg.rid);
  if (!p) return;
  pending.delete(msg.rid);
  if (msg.ok) p.resolve(msg.value);
  else p.reject(new Error(msg.error ?? 'Errore'));
}

async function load(list) {
  files = list;
  for (const { name, file } of list) {
    try {
      const mod = await import(file);
      for (const def of mod.blocks ?? []) if (def?.type && !defs.has(def.type)) defs.set(def.type, def);
    } catch (err) {
      post({ t: 'log', level: 'warn', text: `Pacchetto ${name}: i blocchi non si caricano: ${err.message}` });
    }
  }
}

function flush(entry, id) {
  entry.timer = null;
  if (entry.values.size) { post({ t: 'values', id, values: Object.fromEntries(entry.values) }); entry.values.clear(); }
  if (entry.states.size) { post({ t: 'states', id, states: Object.fromEntries(entry.states) }); entry.states.clear(); }
}

function hostFor(id, lang, limits) {
  const entry = () => programs.get(id);
  const later = (e) => { if (e && !e.timer) e.timer = setTimeout(() => flush(e, id), VALUE_EVERY_MS); };
  const host = {
    lang,
    call: (action, args) => request({ t: 'call', id, action, args }),
    console(op, data) {
      if (op === 'read') return request({ t: 'console', id, op, data });
      post({ t: 'console', id, op, data });
      return Promise.resolve();
    },
    ui: (window, component, port, value) => post({ t: 'ui', id, window, component, port, value }),
    value(key, value) {
      const e = entry();
      if (!e?.watching) return;
      e.values.set(key, value);
      later(e);
    },
    state(key, state) {
      const e = entry();
      if (!e?.watching) return;
      e.states.set(key, state);
      later(e);
    },
    fail: message => post({ t: 'failed', id, message }),
    thread: (spec, cb) => groupThread(spec, cb, host, limits),
  };
  return host;
}

/**
 * A group's thread, made by this (the user's) worker: a handle for the program of the group, or
 * null when this user has all the threads they may have (limits.threads) — it runs in the program.
 */
function groupThread(spec, cb, host, limits = {}) {
  const max = Number.isInteger(limits.threads) ? limits.threads : 4;
  if (threads >= max) return null;
  threads++;
  let worker = null, ready = false, ended = false, stopped = null;
  const queue = [];
  const send = msg => { if (ended) return; if (ready) worker.postMessage(msg); else queue.push(msg); };
  const release = () => { if (!ended) { ended = true; threads--; } };
  const reply = (rid, p) => p.then(value => ({ ok: true, value }), err => ({ ok: false, error: String(err?.message ?? err) }))
    .then(r => { if (!ended) worker.postMessage({ t: 'reply', rid, ...r }); });
  return {
    start() {
      if (worker || ended) return;
      const mb = Math.max(16, Number(limits.threadMemoryMb) || 64);
      worker = new Worker(new URL(import.meta.url), {
        workerData: { thread: true },
        resourceLimits: { maxOldGenerationSizeMb: mb, maxYoungGenerationSizeMb: Math.max(4, Math.round(mb / 8)), stackSizeMb: 4 },
        env: {}, stdout: false, stderr: false,
      });
      worker.on('message', msg => {
        switch (msg.t) {
          case 'ready': ready = true; for (const m of queue.splice(0)) worker.postMessage(m); break;
          case 'exit': cb.exit(msg.schema, msg.block, msg.port, msg.value, msg.pulse); break;
          case 'unhandled': cb.unhandled?.(msg.schema, msg.block, msg.value); break;
          case 'values': for (const [k, v] of Object.entries(msg.values)) host.value(k, v); break;
          case 'states': for (const [k, v] of Object.entries(msg.states)) host.state(k, v); break;
          case 'ui': host.ui(msg.window, msg.component, msg.port, msg.value); break;
          case 'call': reply(msg.rid, host.call(msg.action, msg.args)); break;
          case 'console':
            if (msg.rid) reply(msg.rid, Promise.resolve(host.console(msg.op, msg.data)));
            else host.console(msg.op, msg.data);
            break;
          case 'fail': host.fail(`${cb.name}: ${msg.message}`); break;
          case 'log': post({ t: 'log', level: msg.level, text: `${cb.name}: ${msg.text}` }); break;
          case 'stopped': stopped?.(); break;
          default: break;
        }
      });
      const gone = err => {
        if (ended) return;
        release();
        host.fail(err?.code === 'ERR_WORKER_OUT_OF_MEMORY' ? `${cb.name}: memoria finita nel thread del gruppo` : `${cb.name}: il thread del gruppo si è fermato (${err?.message ?? err})`);
      };
      worker.on('error', gone);
      worker.on('exit', code => { if (!ended && code !== 0) gone(new Error(`uscito con codice ${code}`)); else release(); });
      worker.postMessage({ t: 'init', spec, files, lang: host.lang });
    },
    run: (schema, group) => send({ t: 'run', schema, group }),
    deliver: (schema, block, port, value, pulse) => send({ t: 'deliver', schema, block, port, value, pulse }),
    async stop() {
      if (!worker) { release(); return; }
      if (ended) return;
      if (ready) {
        await new Promise(resolve => {
          const timer = setTimeout(resolve, STOP_WAIT_MS);
          stopped = () => { clearTimeout(timer); resolve(); };
          worker.postMessage({ t: 'stop' });
        });
      }
      release();
      await worker.terminate().catch(() => {});
    },
  };
}

// ---------------------------------------------------------------------------- a group's thread

function threadMain() {
  let program = null;
  const values = new Map(), states = new Map();
  let timer = null;
  const flushThread = () => {
    timer = null;
    if (values.size) { post({ t: 'values', values: Object.fromEntries(values) }); values.clear(); }
    if (states.size) { post({ t: 'states', states: Object.fromEntries(states) }); states.clear(); }
  };
  const later = () => { if (!timer) timer = setTimeout(flushThread, VALUE_EVERY_MS); };
  const hostOf = lang => ({
    lang,
    call: (action, args) => request({ t: 'call', action, args }),
    console(op, data) {
      if (op === 'read') return request({ t: 'console', op, data });
      post({ t: 'console', op, data });
      return Promise.resolve();
    },
    ui: (window, component, port, value) => post({ t: 'ui', window, component, port, value }),
    value: (key, value) => { values.set(key, value); later(); },
    state: (key, state) => { states.set(key, state); later(); },
    fail: message => post({ t: 'fail', message }),
    exit: (schema, block, port, value, pulse) => post({ t: 'exit', schema, block, port, value, pulse }),
    unhandled: (schema, block, value) => post({ t: 'unhandled', schema, block, value }),
  });
  parentPort.on('message', async msg => {
    try {
      switch (msg.t) {
        case 'init':
          await load(msg.files ?? []);
          program = new Program(msg.spec, defs, hostOf(msg.lang));
          await program.start();
          post({ t: 'ready' });
          break;
        case 'run': await program?.runGroup(msg.schema, msg.group); break;
        case 'deliver': program?.deliver(msg.schema, msg.block, msg.port, msg.value, msg.pulse); break;
        case 'stop':
          await program?.stop();
          clearTimeout(timer);
          flushThread();
          post({ t: 'stopped' });
          break;
        case 'reply': answered(msg); break;
        default: break;
      }
    } catch (err) {
      post({ t: msg.t === 'init' ? 'fail' : 'log', level: 'error', message: err?.message ?? String(err), text: `Thread: ${err?.stack ?? err}` });
    }
  });
}

// ---------------------------------------------------------------------------- the user's worker

function userMain() {
  parentPort.on('message', async msg => {
    try {
      switch (msg.t) {
        case 'load':
          await load(msg.files);
          post({ t: 'loaded' });
          break;
        case 'start': {
          if (programs.has(msg.id)) break;
          let program;
          try {
            program = new Program(msg.spec, defs, hostFor(msg.id, msg.lang, msg.spec?.limits));
          } catch (err) {
            post({ t: 'failed', id: msg.id, message: err.message });
            break;
          }
          programs.set(msg.id, { program, watching: !!msg.watch, values: new Map(), states: new Map(), timer: null });
          post({ t: 'started', id: msg.id });
          await program.start();
          break;
        }
        case 'stop': {
          const e = programs.get(msg.id);
          if (!e) { post({ t: 'stopped', id: msg.id }); break; }
          programs.delete(msg.id);
          clearTimeout(e.timer);
          await e.program.stop(msg.reason ?? null);
          post({ t: 'stopped', id: msg.id });
          break;
        }
        case 'input':
          programs.get(msg.id)?.program.input(msg.schema, msg.block, msg.port, msg.value);
          break;
        case 'component':
          programs.get(msg.id)?.program.component(msg.window, msg.component, msg.port, msg.value);
          break;
        case 'watch': {
          const e = programs.get(msg.id);
          if (e) e.watching = !!msg.on;
          break;
        }
        case 'snapshot':
          post({ t: 'snapshot', rid: msg.rid, values: programs.get(msg.id)?.program.snapshot() ?? {} });
          break;
        case 'reply':
          answered(msg);
          break;
        default:
          break;
      }
    } catch (err) {
      post({ t: 'log', level: 'error', text: `Worker: ${err?.stack ?? err}` });
    }
  });
}

// A block that throws outside of run() (a timer of its own, a forgotten promise) must not end the worker
process.on('uncaughtException', err => post({ t: 'log', level: 'error', text: `Errore non gestito in un blocco: ${err?.message ?? err}` }));
process.on('unhandledRejection', err => post({ t: 'log', level: 'error', text: `Errore non gestito in un blocco: ${err?.message ?? err}` }));

if (workerData?.thread) threadMain();
else {
  userMain();
  post({ t: 'ready', user: workerData?.user ?? null });
}
