import { fork } from 'node:child_process';
import { join } from 'node:path';

/**
 * The 'runtime' service of the kernel (services.js): runs the services of installed apps.
 *
 * Each service gets a Node process of its own (runner.js), started with Node's permission model:
 * it may read only this module's folder, and starts no programs, workers or other files. Inside it
 * the app's code runs in a V8 isolate (isolated-vm) with a memory limit and a time limit for every
 * run of its code: it has no require, process, network or files, only `lilos`, whose calls come
 * here and go to the kernel (host.call), which checks them. A crash, a loop or memory running out
 * ends that process only.
 *
 * Needs isolated-vm 6.2 (Node 22 to 25); `npm install` in this folder (the kernel does it when it
 * installs the module).
 */
const REQUEST_TIMEOUT = 60_000;
const children = new Set();

function start(ctx, { key, code, info, limits }, host) {
  return new Promise((resolve, reject) => {
    const child = fork(join(ctx.dir, 'runner.js'), [], {
      execArgv: ['--permission', `--allow-fs-read=${ctx.dir}`, '--allow-addons', '--disable-warning=SecurityWarning'],
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      env: { SystemRoot: process.env.SystemRoot ?? '' },
      windowsHide: true,
    });
    children.add(child);
    const pending = new Map();
    let next = 1;
    let started = false;
    let stopping = false;
    let reason = null;

    const lines = level => chunk => String(chunk).split(/\r?\n/).filter(Boolean).forEach(text => host.log(level, text));
    child.stdout.on('data', lines('info'));
    child.stderr.on('data', lines('error'));

    child.on('message', async m => {
      if (!m || typeof m !== 'object') return;
      if (m.type === 'ready') {
        started = true;
        resolve(handle);
      } else if (m.type === 'failed') {
        reason = m.error;
      } else if (m.type === 'answer') {
        const p = pending.get(m.id);
        if (!p) return;
        pending.delete(m.id);
        clearTimeout(p.timer);
        if (m.error) p.reject(new Error(m.error));
        else p.resolve(m.result);
      } else if (m.type === 'call') {
        try {
          const result = await host.call(m.method, m.params);
          if (child.connected) child.send({ type: 'reply', id: m.id, result: result ?? null });
        } catch (err) {
          if (child.connected) child.send({ type: 'reply', id: m.id, error: err.message });
        }
      } else if (m.type === 'log') {
        host.log(m.level, m.text);
      } else if (m.type === 'exit') {
        reason = m.reason;
      }
    });

    child.on('exit', (code, signal) => {
      children.delete(child);
      for (const p of pending.values()) {
        clearTimeout(p.timer);
        p.reject(new Error('Il servizio si è fermato'));
      }
      pending.clear();
      const why = reason ?? `processo terminato (${signal ?? `codice ${code}`})`;
      if (!started) reject(new Error(why));
      else if (!stopping) host.exit(why);
    });
    child.on('error', err => {
      reason ??= err.message;
      ctx.log.error(`${key}: ${err.message}`);
    });

    const handle = {
      request(data, from) {
        if (!child.connected) return Promise.reject(new Error('Il servizio si è fermato'));
        return new Promise((ok, ko) => {
          const id = next++;
          const timer = setTimeout(() => {
            pending.delete(id);
            ko(new Error('Il servizio non ha risposto in 60 secondi'));
          }, REQUEST_TIMEOUT);
          pending.set(id, { resolve: ok, reject: ko, timer });
          child.send({ type: 'request', id, data, from });
        });
      },
      stop() {
        stopping = true;
        return new Promise(done => {
          if (child.exitCode !== null || child.signalCode !== null) return done();
          const force = setTimeout(() => child.kill(), 2000);
          child.once('exit', () => { clearTimeout(force); done(); });
          if (child.connected) child.send({ type: 'stop' });
          else child.kill();
        });
      },
    };

    child.send({ type: 'start', code, info, limits });
  });
}

export default {
  async init(ctx) {
    ctx.provide('runtime', { start: (spec, host) => start(ctx, spec, host) });
  },
  async stop() {
    for (const child of children) child.kill();
  },
};
