/**
 * SQL Server with tedious. The sockets go to the address the guard checked (`server`), while
 * `serverName` keeps the server's name for TLS (SNI and the certificate's name). With an instance
 * name (options.instance) tedious asks SQL Browser (UDP 1434) at the same address for the port.
 *
 * tedious has no pool and a connection runs one request at a time: a small pool of `poolSize`
 * connections lives here. Parameters @p1… are typed from the JS values; more statements in one
 * query are allowed (the last result set with rows is returned). BIGINT becomes a number when
 * exact, text otherwise; DECIMAL, NUMERIC and MONEY are numbers (as tedious gives them).
 */
let tedious = null;   // loaded at the first connection (lazy: a database never used costs nothing)

export const kind = 'mssql';
export const label = 'SQL Server';
export const defaultPort = 1433;

const IDLE_MS = 30_000;
const IDENTITY = 0x10;   // the identity flag of a column's metadata (TDS COLMETADATA)

export const dialect = {
  placeholder: i => `@p${i}`,
  quote: name => `[${name.replace(/]/g, ']]')}]`,
  // OFFSET … FETCH needs an ORDER BY: (SELECT NULL) when the block gives none; a limit alone is TOP
  paginate: (limit, offset) => {
    if (!offset) return limit ? { prefix: `TOP (${Math.floor(limit)}) `, suffix: '' } : { suffix: '' };
    return { suffix: ` OFFSET ${Math.floor(offset)} ROWS${limit ? ` FETCH NEXT ${Math.floor(limit)} ROWS ONLY` : ''}`, needsOrder: '(SELECT NULL)' };
  },
  returning: 'output',
  multiRow: true,
  maxParams: 2000,   // SQL Server takes at most 2100 parameters in a request
  reuseParams: true,
  brackets: true,
};

/** A value for tedious: undefined as null, big integers as numbers or text, objects and lists as JSON. */
export const param = v => {
  if (v === undefined) return null;
  if (typeof v === 'bigint') return Number.isSafeInteger(Number(v)) ? Number(v) : v.toString();
  if (v instanceof Uint8Array && !Buffer.isBuffer(v)) return Buffer.from(v);
  if (v && typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v)) return JSON.stringify(v);
  return v;
};

/** The SQL Server type of a parameter, from its JS value. */
function typed(v) {
  const T = tedious.TYPES;
  if (v === null || v === undefined) return [T.NVarChar, null];
  if (typeof v === 'boolean') return [T.Bit, v];
  if (typeof v === 'number') {
    if (Number.isInteger(v) && v >= -2147483648 && v <= 2147483647) return [T.Int, v];
    if (Number.isSafeInteger(v)) return [T.BigInt, v];
    return [T.Float, v];
  }
  if (v instanceof Date) return [T.DateTime2, v];
  if (Buffer.isBuffer(v)) return [T.VarBinary, v];
  return [T.NVarChar, String(v)];
}

/** A cell as the blocks want it: BIGINT as a number when exact. */
function cell(c) {
  const v = c.value;
  // BIGINT (IntN of 8 bytes when it can be NULL) comes as text
  if (typeof v === 'string' && /^(BigInt|IntN)$/.test(c.metadata?.type?.name ?? '') && /^-?\d+$/.test(v)) {
    const n = Number(v);
    return Number.isSafeInteger(n) ? n : v;
  }
  return v ?? null;
}

const namesOf = cols => cols.map((c, i) => c.colName || `col${i + 1}`);
const rowOf = (columns, names) => {
  const row = {};
  columns.forEach((c, i) => { row[names[i]] = cell(c); });
  return row;
};

const timeoutError = ms => Object.assign(new Error(`SQL Server non ha risposto in ${Math.max(1, Math.round(ms / 1000))} s: la query è stata annullata`), { code: 'timeout' });

/**
 * A pool of tedious connections: acquire() → a free connection (or a new one up to `size`, or a
 * wait), release(conn, bad) gives it back (a bad one is closed). Idle connections close after 30 s.
 */
function makePool(create, size, waitMs) {
  const idle = [];   // { conn, timer }
  const waiters = [];
  let count = 0;
  let closed = false;
  const destroy = conn => { try { conn.close(); } catch { /* already closed */ } };
  const wakeOne = value => { const w = waiters.shift(); if (!w) return false; clearTimeout(w.timer); w.resolve(value); return true; };

  async function acquire() {
    if (closed) throw new Error('Connessione chiusa');
    while (idle.length) {
      const { conn, timer } = idle.pop();
      clearTimeout(timer);
      if (!conn.lilosDead) return conn;
      count--;
    }
    if (count < size) {
      count++;
      try { return await create(); } catch (err) { count--; wakeOne(null); throw err; }
    }
    const got = await new Promise((resolve, reject) => {
      const w = { resolve, timer: setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); reject(new Error(`Tutte le ${size} connessioni a SQL Server sono occupate da ${Math.round(waitMs / 1000)} s`)); }, waitMs) };
      waiters.push(w);
    });
    return got ?? acquire();
  }

  function release(conn, bad = false) {
    if (bad || closed || conn.lilosDead) {
      destroy(conn);
      count--;
      wakeOne(null);
      return;
    }
    if (wakeOne(conn)) return;
    const entry = { conn, timer: setTimeout(() => { const i = idle.indexOf(entry); if (i >= 0) { idle.splice(i, 1); count--; destroy(conn); } }, IDLE_MS) };
    entry.timer.unref?.();
    idle.push(entry);
  }

  async function end() {
    closed = true;
    for (const w of waiters.splice(0)) { clearTimeout(w.timer); w.resolve(null); }
    for (const { conn, timer } of idle.splice(0)) { clearTimeout(timer); destroy(conn); }
  }

  return { acquire, release, end };
}

/** Runs a request on a connection and waits for its callback. */
const call = (conn, fn) => new Promise((resolve, reject) => fn(err => (err ? reject(err) : resolve())));

/**
 * One request: the result sets (each capped at maxRows + 1 rows), the counts of the statements
 * without rows, the identity of the inserted rows. A request that takes longer than timeoutMs is
 * cancelled (the connection stays usable).
 */
function exec(conn, sql, params, maxRows, timeoutMs) {
  return new Promise((resolve, reject) => {
    const sets = [];
    let cur = null;   // the result set whose rows are coming
    let changed = 0;
    let hadCount = false;
    let timedOut = false;
    const req = new tedious.Request(sql, err => {
      clearTimeout(timer);
      if (timedOut || err?.code === 'ETIMEOUT') return reject(timeoutError(timeoutMs));
      if (err) return reject(err);
      const withRows = sets.filter(s => s.rows.length);
      const set = withRows.at(-1) ?? sets.at(-1) ?? null;
      const rows = set ? set.rows.slice(0, maxRows) : [];
      const id = set?.identity;
      const lastId = id && rows.length && /\binsert\b/i.test(sql) ? rows.at(-1)[id] ?? null : null;
      resolve({
        rows, fields: set?.names ?? [], truncated: !!set && set.rows.length > maxRows,
        affected: hadCount ? changed : set?.count ?? rows.length, lastId,
      });
    });
    req.on('columnMetadata', cols => {
      const list = Array.isArray(cols) ? cols : Object.values(cols);
      const names = namesOf(list);
      const idCol = list.findIndex(c => (c.flags & IDENTITY) !== 0);
      cur = { names, rows: [], count: null, identity: idCol >= 0 ? names[idCol] : null, open: true };
      sets.push(cur);
    });
    req.on('row', columns => { if (cur && cur.rows.length <= maxRows) cur.rows.push(rowOf(columns, cur.names)); });
    const done = rowCount => {
      if (rowCount === undefined || rowCount === null) return;
      if (cur?.open) { cur.count = rowCount; cur.open = false; return; }
      // a statement with no rows (INSERT, UPDATE, DELETE…); OUTPUT rows count as their set
      changed += rowCount;
      hadCount = true;
    };
    req.on('doneInProc', done);
    req.on('done', done);
    params.forEach((v, i) => { const [type, value] = typed(v); req.addParameter(`p${i + 1}`, type, value); });
    const timer = setTimeout(() => { timedOut = true; conn.cancel(); }, timeoutMs);
    if (params.length) conn.execSql(req); else conn.execSqlBatch(req);
  });
}

export async function open(o) {
  if (!tedious) { const m = await import('tedious'); tedious = m.default ?? m; }
  const opt = o.options ?? {};
  const instance = typeof opt.instance === 'string' && opt.instance.trim() ? opt.instance.trim() : null;
  const config = {
    server: o.address,
    authentication: { type: 'default', options: { userName: o.user || undefined, password: o.password ?? '' } },
    options: {
      serverName: o.host,   // TLS: SNI and the name the certificate must have
      encrypt: o.tls !== 'off',
      trustServerCertificate: o.tls !== 'verify',
      ...(instance ? { instanceName: instance } : { port: o.port }),
      database: o.database || undefined,
      connectTimeout: o.timeoutMs,
      requestTimeout: o.timeoutMs,
      cancelTimeout: 5000,
      rowCollectionOnRequestCompletion: false,
      useColumnNames: false,
      useUTC: true,
      appName: 'lilOS Logic Studio',
    },
  };
  const create = () => new Promise((resolve, reject) => {
    const conn = new tedious.Connection(config);
    conn.on('error', () => { conn.lilosDead = true; });
    conn.on('end', () => { conn.lilosDead = true; });
    conn.connect(err => (err ? reject(err) : resolve(conn)));
  });
  const pool = makePool(create, o.poolSize, o.timeoutMs);
  const fatal = (conn, err) => conn.lilosDead || (err && err.name === 'ConnectionError');

  /** A request on a pooled connection. */
  const run = async (sql, params, maxRows) => {
    const conn = await pool.acquire();
    try {
      const res = await exec(conn, sql, params, maxRows, o.timeoutMs);
      pool.release(conn);
      return res;
    } catch (err) { pool.release(conn, fatal(conn, err)); throw err; }
  };

  let version;
  try {
    version = (await run('SELECT @@VERSION AS v', [], 1)).rows[0]?.v;
  } catch (err) { await pool.end(); throw err; }

  const ISO = () => ({
    readUncommitted: tedious.ISOLATION_LEVEL.READ_UNCOMMITTED, readCommitted: tedious.ISOLATION_LEVEL.READ_COMMITTED,
    repeatableRead: tedious.ISOLATION_LEVEL.REPEATABLE_READ, serializable: tedious.ISOLATION_LEVEL.SERIALIZABLE, snapshot: tedious.ISOLATION_LEVEL.SNAPSHOT,
  });

  return {
    info: { server: String(version ?? 'SQL Server').split('\n')[0].replace(/\s+/g, ' ').trim() },
    dialect,
    param,
    query: (sql, params, { maxRows }) => run(sql, params, maxRows),

    async begin(isolation) {
      const conn = await pool.acquire();
      const level = ISO()[isolation];
      try {
        await call(conn, cb => conn.beginTransaction(cb, '', level ?? tedious.ISOLATION_LEVEL.READ_COMMITTED));
      } catch (err) { pool.release(conn, true); throw err; }
      let done = false;
      const end = async commit => {
        if (done) return;
        done = true;
        try {
          if (commit) await call(conn, cb => conn.commitTransaction(cb));
          else {
            // a transaction the server already ended (an error with XACT_ABORT) has nothing to roll back
            try { await call(conn, cb => conn.rollbackTransaction(cb)); } catch (err) { if (conn.lilosDead || !/no corresponding BEGIN TRANSACTION/i.test(err.message)) throw err; }
          }
          // the isolation level stays on the session: back to the default for the pool
          if (level !== undefined && level !== tedious.ISOLATION_LEVEL.READ_COMMITTED) await exec(conn, 'SET TRANSACTION ISOLATION LEVEL READ COMMITTED', [], 1, o.timeoutMs);
          pool.release(conn);
        } catch (err) { pool.release(conn, true); throw err; }
      };
      return {
        async query(sql, params, { maxRows }) {
          if (done) throw new Error('La transazione è già chiusa');
          return exec(conn, sql, params, maxRows, o.timeoutMs);
        },
        commit: () => end(true),
        rollback: () => end(false),
      };
    },

    /** A cursor: the rows come from the server as a stream, paused between the batches. */
    async cursor(sql, params) {
      const conn = await pool.acquire();
      let fields = [];
      let names = [];
      const buf = [];
      let want = 1;
      let finished = false;
      let failure = null;
      let closed = false;
      let wake = null;
      let released = false;
      const notify = () => { const w = wake; wake = null; w?.(); };
      const giveBack = bad => { if (released) return; released = true; pool.release(conn, bad || fatal(conn)); };
      const req = new tedious.Request(sql, err => {
        finished = true;
        if (err && !closed) failure = err;
        giveBack(!!err && !closed && fatal(conn, err));
        notify();
      });
      req.on('columnMetadata', cols => { names = namesOf(Array.isArray(cols) ? cols : Object.values(cols)); fields = names; });
      req.on('row', columns => {
        buf.push(rowOf(columns, names));
        if (buf.length >= want) req.pause();
        notify();
      });
      params.forEach((v, i) => { const [type, value] = typed(v); req.addParameter(`p${i + 1}`, type, value); });
      req.setTimeout?.(0);   // a cursor read slowly is not a request that hangs (next() has its own limit)
      if (params.length) conn.execSql(req); else conn.execSqlBatch(req);

      const stop = async () => {
        if (closed) return;
        closed = true;
        if (finished) return;
        const ended = new Promise(r => { const prev = wake; wake = () => { prev?.(); r(); }; });
        conn.cancel();
        req.resume();
        await Promise.race([ended, new Promise(r => setTimeout(r, 5000).unref?.())]);
        if (!finished) { released = false; giveBack(true); }
      };

      return {
        async next(n) {
          n = Math.max(1, Math.floor(n));
          if (closed) return { rows: [], fields, done: true };
          if (buf.length < n && !finished && !failure) {
            want = n;
            req.resume();
            let timer;
            try {
              await Promise.race([
                (async () => { while (buf.length < n && !finished && !failure) await new Promise(r => { wake = r; }); })(),
                new Promise((_, reject) => { timer = setTimeout(() => reject(timeoutError(o.timeoutMs)), o.timeoutMs); }),
              ]);
            } catch (err) { await stop(); throw err; } finally { clearTimeout(timer); }
          }
          if (failure) { const err = failure; failure = null; closed = true; throw err; }
          const rows = buf.splice(0, n);
          const done = finished && !buf.length;
          if (done) closed = true;
          return { rows, fields, done };
        },
        close: stop,
      };
    },

    async tables() {
      const res = await run(`SELECT TABLE_SCHEMA AS [schema], TABLE_NAME AS name, CASE TABLE_TYPE WHEN 'VIEW' THEN 'view' ELSE 'table' END AS type
        FROM INFORMATION_SCHEMA.TABLES ORDER BY TABLE_SCHEMA, TABLE_NAME`, [], 100_000);
      return res.rows;
    },

    async columns(table, schema) {
      const res = await run(`SELECT c.COLUMN_NAME AS name,
          c.DATA_TYPE + CASE
            WHEN c.CHARACTER_MAXIMUM_LENGTH = -1 THEN '(max)'
            WHEN c.CHARACTER_MAXIMUM_LENGTH IS NOT NULL THEN '(' + CAST(c.CHARACTER_MAXIMUM_LENGTH AS varchar(12)) + ')'
            WHEN c.DATA_TYPE IN ('decimal', 'numeric') THEN '(' + CAST(c.NUMERIC_PRECISION AS varchar(4)) + ',' + CAST(c.NUMERIC_SCALE AS varchar(4)) + ')'
            ELSE '' END AS type,
          CASE c.IS_NULLABLE WHEN 'YES' THEN 1 ELSE 0 END AS nullable, c.COLUMN_DEFAULT AS [default],
          CASE WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
              ON k.CONSTRAINT_NAME = tc.CONSTRAINT_NAME AND k.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
            WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY' AND k.TABLE_SCHEMA = c.TABLE_SCHEMA AND k.TABLE_NAME = c.TABLE_NAME AND k.COLUMN_NAME = c.COLUMN_NAME)
            THEN 1 ELSE 0 END AS [key]
        FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_NAME = @p1 AND c.TABLE_SCHEMA = COALESCE(@p2, SCHEMA_NAME()) ORDER BY c.ORDINAL_POSITION`, [table, schema || null], 10_000);
      return res.rows.map(r => ({ ...r, nullable: !!r.nullable, key: !!r.key }));
    },

    async close() { await pool.end(); },
  };
}
