import { parentPort, workerData } from 'node:worker_threads';
import { createRequire } from 'node:module';

/**
 * One SQLite database (sql.js, SQLite compiled to WebAssembly) in a thread of its own, so a long
 * query never stops the kernel; lib/drivers/sqlite.js talks to it and ends the thread when a query
 * takes too long. The database lives in memory: it comes from the bytes of the lilOS file and goes
 * back to the file with «export».
 *
 * In: { id, op, … }   op: query { sql, params, maxRows } | cursor { sql, params } | next { n } |
 *     closeCursor | export | tables | columns { table } | close
 * Out: { id, ok, value } | { id, ok: false, error }
 */
const require = createRequire(import.meta.url);
const initSqlJs = require('sql.js');

const SQL = await initSqlJs();
const db = new SQL.Database(workerData?.bytes ? new Uint8Array(workerData.bytes) : undefined);
// The database lives in WebAssembly memory, which resourceLimits do not bound: it may not grow past
// the module's limit (sqliteMaxMb), and a read-only one refuses every change (query_only)
const pageSize = db.exec('PRAGMA page_size')[0].values[0][0];
const maxPages = Math.max(16, Math.floor((workerData?.maxBytes ?? (64 << 20)) / pageSize));
db.run(`PRAGMA max_page_count = ${maxPages}`);
if (workerData?.readOnly) db.run('PRAGMA query_only = ON');
/** Settings a program may not change (it would lift the limits above). */
const LOCKED = /\b(max_page_count|page_size|query_only|writable_schema|mmap_size|cache_size)\b/i;
let cursor = null;   // { stmt, fields }

const rowOf = (stmt, fields) => {
  const values = stmt.get();
  const row = {};
  fields.forEach((f, i) => { row[f] = values[i]; });
  return row;
};

/** Runs a statement (or more, when there are no parameters): the last result. */
function query(sql, params, maxRows) {
  if (LOCKED.test(sql)) throw new Error('Questa impostazione di SQLite non si cambia dai blocchi');
  let last = { rows: [], fields: [], truncated: false };
  const run = stmt => {
    const fields = stmt.getColumnNames();
    const rows = [];
    let truncated = false;
    while (stmt.step()) {
      if (rows.length >= maxRows) { truncated = true; break; }
      rows.push(rowOf(stmt, fields));
    }
    return { rows, fields, truncated };
  };
  if (params.length) {
    const stmt = db.prepare(sql);
    try { stmt.bind(params); last = run(stmt); } finally { stmt.free(); }
  } else {
    for (const stmt of db.iterateStatements(sql)) {
      try { last = run(stmt); } finally { stmt.free(); }
    }
  }
  const affected = db.getRowsModified();
  const lastId = db.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? null;
  return { ...last, affected, lastId: affected > 0 ? lastId : null };
}

const ops = {
  query: m => query(m.sql, m.params ?? [], m.maxRows ?? 10_000),
  cursor: m => {
    if (LOCKED.test(m.sql)) throw new Error('Questa impostazione di SQLite non si cambia dai blocchi');
    if (cursor) cursor.stmt.free();
    const stmt = db.prepare(m.sql);
    if (m.params?.length) stmt.bind(m.params);
    cursor = { stmt, fields: stmt.getColumnNames() };
    return true;
  },
  next: m => {
    if (!cursor) return { rows: [], done: true, fields: [] };
    const rows = [];
    let done = false;
    while (rows.length < m.n) {
      if (!cursor.stmt.step()) { done = true; break; }
      if (!cursor.fields.length) cursor.fields = cursor.stmt.getColumnNames();
      rows.push(rowOf(cursor.stmt, cursor.fields));
    }
    const fields = cursor.fields;
    if (done) { cursor.stmt.free(); cursor = null; }
    return { rows, done, fields };
  },
  closeCursor: () => { if (cursor) { cursor.stmt.free(); cursor = null; } return true; },
  export: () => {
    if (cursor) { cursor.stmt.free(); cursor = null; }   // export closes and reopens the database
    return db.export();
  },
  info: () => db.exec('SELECT sqlite_version()')[0]?.values[0][0] ?? '',
  close: () => { if (cursor) cursor.stmt.free(); db.close(); return true; },
};

parentPort.on('message', m => {
  try {
    const fn = ops[m.op];
    if (!fn) throw new Error(`Operazione sconosciuta: ${m.op}`);
    const value = fn(m);
    if (value instanceof Uint8Array) parentPort.postMessage({ id: m.id, ok: true, value }, [value.buffer]);
    else parentPort.postMessage({ id: m.id, ok: true, value });
  } catch (err) {
    let error = String(err?.message ?? err);
    if (/readonly database|query_only/i.test(error)) error = 'Il database è aperto in sola lettura';
    else if (/database or disk is full/i.test(error)) error = `Il database ha raggiunto la dimensione massima (${Math.round(maxPages * pageSize / (1 << 20))} MB, impostazione del modulo)`;
    parentPort.postMessage({ id: m.id, ok: false, error });
  }
});
parentPort.postMessage({ ready: true });
