import { parentPort, workerData } from 'node:worker_threads';
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
 */

const VALUE_EVERY_MS = 100;
const defs = new Map();
const programs = new Map();     // id → { program, watching, values: Map, states: Map, timer }
const pending = new Map();      // rid → { resolve, reject }
let nextRid = 1;

const post = msg => parentPort.postMessage(msg);

function request(msg) {
  const rid = nextRid++;
  return new Promise((resolve, reject) => {
    pending.set(rid, { resolve, reject });
    post({ ...msg, rid });
  });
}

async function load(files) {
  for (const { name, file } of files) {
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

function hostFor(id, lang) {
  const entry = () => programs.get(id);
  const later = (e) => { if (e && !e.timer) e.timer = setTimeout(() => flush(e, id), VALUE_EVERY_MS); };
  return {
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
  };
}

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
          program = new Program(msg.spec, defs, hostFor(msg.id, msg.lang));
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
      case 'reply': {
        const p = pending.get(msg.rid);
        if (!p) break;
        pending.delete(msg.rid);
        if (msg.ok) p.resolve(msg.value);
        else p.reject(new Error(msg.error ?? 'Errore'));
        break;
      }
      default:
        break;
    }
  } catch (err) {
    post({ t: 'log', level: 'error', text: `Worker: ${err?.stack ?? err}` });
  }
});

// A block that throws outside of run() (a timer of its own, a forgotten promise) must not end the worker
process.on('uncaughtException', err => post({ t: 'log', level: 'error', text: `Errore non gestito in un blocco: ${err?.message ?? err}` }));
process.on('unhandledRejection', err => post({ t: 'log', level: 'error', text: `Errore non gestito in un blocco: ${err?.message ?? err}` }));

post({ t: 'ready', user: workerData?.user ?? null });
