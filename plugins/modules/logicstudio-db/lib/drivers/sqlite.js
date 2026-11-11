import { Worker } from 'node:worker_threads';
import { readsOnly } from '../sql.js';

/**
 * SQLite with sql.js (WebAssembly) in a thread of its own (sqlite-worker.js at the module's root:
 * the path comes from index.js, o.workerFile). The database is a file of the user's lilOS home
 * (lib/files.js), loaded in memory and written back one second after the last change, at a commit
 * and at the close; with «In memoria» there is no file. A query that takes too long ends the thread
 * (and the changes not saved yet): a new one starts from the file at the next use.
 *
 * One connection: a transaction holds it, the other statements of the program wait their turn.
 */
export const kind = 'sqlite';
export const label = 'SQLite';
export const defaultPort = 0;

const SAVE_AFTER_MS = 1000;
const ISOLATION = { serializable: 'IMMEDIATE', repeatableRead: 'IMMEDIATE', readCommitted: 'DEFERRED', readUncommitted: 'DEFERRED', snapshot: 'DEFERRED' };

export const dialect = {
  placeholder: () => '?',
  quote: name => `"${name.replace(/"/g, '""')}"`,
  paginate: (limit, offset) => ({ suffix: `${limit ? ` LIMIT ${Math.floor(limit)}` : offset ? ' LIMIT -1' : ''}${offset ? ` OFFSET ${Math.floor(offset)}` : ''}` }),
  returning: 'returning',
  multiRow: true,
  maxParams: 999,
  backticks: true,
  brackets: true,
};

/** A value for sql.js: booleans as 0/1, bytes as Uint8Array, objects as JSON text. */
const param = v => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'bigint') return Number(v);
  if (Buffer.isBuffer(v) || v instanceof Uint8Array) return new Uint8Array(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
};

/** A lock: one holder at a time (a transaction keeps it until commit or rollback). */
function makeLock() {
  let tail = Promise.resolve();
  return () => {
    let release;
    const held = new Promise(r => { release = r; });
    const ready = tail.then(() => release);
    tail = tail.then(() => held);
    return ready;
  };
}

export async function open(o) {
  const file = o.file;   // null: in memory
  let thread = null;
  let nextId = 1;
  const pending = new Map();
  let dirty = false;
  let saveTimer = null;
  let closed = false;
  let inTx = false;

  const start = () => new Promise((resolve, reject) => {
    const w = new Worker(o.workerFile, { workerData: { bytes: file?.bytes ?? null, maxBytes: o.sqliteMaxBytes, readOnly: !!file?.readOnly }, resourceLimits: { maxOldGenerationSizeMb: 512 } });
    const fail = err => {
      for (const p of pending.values()) p.reject(err);
      pending.clear();
      if (thread === w) thread = null;
    };
    w.on('message', m => {
      if (m.ready) { thread = w; resolve(w); return; }
      const p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      if (m.ok) p.resolve(m.value); else p.reject(new Error(m.error));
    });
    w.on('error', err => { fail(err); reject(err); });
    w.on('exit', () => fail(new Error('Il database SQLite si è chiuso')));
  });

  const call = async (op, data = {}, timeoutMs = o.timeoutMs) => {
    if (closed) throw new Error('Connessione chiusa');
    const w = thread ?? await start();
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        // a query that does not end: the thread goes, with what was not saved
        w.terminate().catch(() => {});
        if (thread === w) thread = null;
        dirty = false;
        reject(new Error(`SQLite non ha finito in ${Math.round(timeoutMs / 1000)} s: la query è stata fermata (le modifiche non ancora salvate sono perse)`));
      }, timeoutMs);
      pending.set(id, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } });
      w.postMessage({ id, op, ...data });
    });
  };

  const save = async () => {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!file || file.readOnly || !dirty || inTx || !thread) return;
    dirty = false;
    try {
      const bytes = await call('export', {}, Math.max(o.timeoutMs, 60_000));
      await file.save(Buffer.from(bytes));
      file.bytes = Buffer.from(bytes);   // a new thread starts from what was saved
    } catch (err) {
      dirty = true;
      throw err;
    }
  };
  const saveSoon = () => {
    if (!file || file.readOnly) return;
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => save().catch(() => {}), SAVE_AFTER_MS);
    saveTimer.unref?.();
  };

  const lock = makeLock();
  const run = async (sql, params, maxRows) => {
    const r = await call('query', { sql, params, maxRows });
    if (r.affected > 0 || !readsOnly(sql)) { if (!inTx) saveSoon(); else dirty = true; }
    return r;
  };

  await start();
  const version = await call('info');
  return {
    info: { server: `SQLite ${version}`, file: file?.shown ?? ':memory:' },
    dialect,
    param,
    async query(sql, params, { maxRows }) {
      const release = await lock();
      try { return await run(sql, params, maxRows); } finally { release(); }
    },
    async begin(isolation) {
      const release = await lock();
      try {
        await call('query', { sql: `BEGIN ${ISOLATION[isolation] ?? 'DEFERRED'}`, params: [], maxRows: 1 });
      } catch (err) { release(); throw err; }
      inTx = true;
      let done = false;
      const end = async sql => {
        if (done) return;
        done = true;
        try {
          await call('query', { sql, params: [], maxRows: 1 }).catch(err => { if (sql === 'COMMIT') throw err; });
        } finally {
          inTx = false;
          release();
        }
        if (sql === 'COMMIT' && dirty) await save();
        else if (sql === 'ROLLBACK') dirty = false;
      };
      return {
        query: (sql, params, { maxRows }) => run(sql, params, maxRows),
        commit: () => end('COMMIT'),
        rollback: () => end('ROLLBACK'),
      };
    },
    async cursor(sql, params) {
      const release = await lock();
      try { await call('cursor', { sql, params }); } catch (err) { release(); throw err; }
      let open = true;
      return {
        async next(n) {
          if (!open) return { rows: [], fields: [], done: true };
          const r = await call('next', { n });
          if (r.done) { open = false; release(); }
          return r;
        },
        async close() {
          if (!open) return;
          open = false;
          await call('closeCursor').catch(() => {});
          release();
        },
      };
    },
    async tables() {
      const r = await call('query', { sql: "SELECT 'main' AS schema, name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name", params: [], maxRows: 100_000 });
      return r.rows;
    },
    async columns(table) {
      const r = await call('query', { sql: `PRAGMA table_info(${dialect.quote(table)})`, params: [], maxRows: 10_000 });
      return r.rows.map(c => ({ name: c.name, type: c.type, nullable: !c.notnull, default: c.dflt_value, key: c.pk > 0 }));
    },
    async close() {
      if (closed) return;
      try { if (dirty && !inTx) await save(); } catch { /* closing anyway */ }
      closed = true;
      clearTimeout(saveTimer);
      const w = thread;
      thread = null;
      await w?.terminate().catch(() => {});
      await file?.close();
    },
  };
}
