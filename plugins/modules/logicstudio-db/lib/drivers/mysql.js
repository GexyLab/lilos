import net from 'node:net';

/**
 * MySQL and MariaDB with mysql2. The pool's sockets go to the address the guard checked (`stream`),
 * while `host` keeps the server's name for TLS (servername, certificate check). One statement per
 * query (multipleStatements off: no stacked statements). Big integers become numbers when exact,
 * text otherwise; DECIMAL as text (exact).
 */
let mysql = null;   // loaded at the first connection

export const kind = 'mysql';
export const label = 'MySQL / MariaDB';
export const defaultPort = 3306;

const ISOLATION = { readUncommitted: 'READ UNCOMMITTED', readCommitted: 'READ COMMITTED', repeatableRead: 'REPEATABLE READ', serializable: 'SERIALIZABLE' };

export const dialect = {
  placeholder: () => '?',
  quote: name => `\`${name.replace(/`/g, '``')}\``,
  paginate: (limit, offset) => ({ suffix: `${limit ? ` LIMIT ${Math.floor(limit)}` : offset ? ' LIMIT 18446744073709551615' : ''}${offset ? ` OFFSET ${Math.floor(offset)}` : ''}` }),
  returning: null,
  multiRow: true,
  maxParams: 30000,
  backticks: true,
  backslashEscapes: true,
};

const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:?\d{2})$/;

/**
 * A value for mysql2: objects and lists as JSON text (a list would become «a, b» otherwise); an ISO
 * date-time with its zone (how the blocks carry dates) as a date, since MySQL refuses the «T…Z» form.
 */
const param = v => {
  if (v === undefined) return null;
  if (typeof v === 'string' && ISO_TIME.test(v)) { const d = new Date(v); if (!Number.isNaN(d.getTime())) return d; }
  if (v && typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v)) return JSON.stringify(v);
  return v;
};

const fieldsOf = f => (Array.isArray(f) ? f.map(x => x.name) : []);

function shape([res, fields], maxRows) {
  if (Array.isArray(res)) {
    // more result sets (a procedure): the last one with rows
    const sets = Array.isArray(res[0]) ? res : [res];
    const rows = sets.filter(Array.isArray).at(-1) ?? [];
    return { rows: rows.slice(0, maxRows), truncated: rows.length > maxRows, fields: fieldsOf(Array.isArray(fields?.[0]) ? fields.at(-1) : fields), affected: 0, lastId: null };
  }
  return { rows: [], fields: [], affected: res?.affectedRows ?? 0, lastId: res?.insertId || null };
}

export async function open(o) {
  mysql ??= (await import('mysql2/promise')).default;
  const pool = mysql.createPool({
    host: o.host, port: o.port, user: o.user || undefined, password: o.password ?? '', database: o.database || undefined,
    stream: () => net.connect({ host: o.address, port: o.port }),
    ssl: o.tls === 'off' ? undefined : { rejectUnauthorized: o.tls === 'verify', verifyIdentity: o.tls === 'verify' },
    connectionLimit: o.poolSize, connectTimeout: o.timeoutMs, waitForConnections: true, queueLimit: 100,
    supportBigNumbers: true, bigNumberStrings: false, decimalNumbers: false, multipleStatements: false, dateStrings: false,
    namedPlaceholders: false, timezone: 'Z', charset: 'utf8mb4',
  });
  pool.on?.('error', () => {});
  let version;
  try { [[{ v: version }]] = await pool.query('SELECT VERSION() AS v'); } catch (err) { await pool.end().catch(() => {}); throw err; }
  const isMaria = /mariadb/i.test(String(version));
  const run = async (c, sql, params, maxRows) => shape(await c.query({ sql, values: params, timeout: o.timeoutMs }), maxRows);
  return {
    info: { server: `${isMaria ? 'MariaDB' : 'MySQL'} ${String(version).replace(/-MariaDB.*$/i, '')}` },
    dialect,
    param,
    query: (sql, params, { maxRows }) => run(pool, sql, params, maxRows),

    async begin(isolation) {
      const c = await pool.getConnection();
      try {
        if (ISOLATION[isolation]) await c.query(`SET TRANSACTION ISOLATION LEVEL ${ISOLATION[isolation]}`);
        await c.query('START TRANSACTION');
      } catch (err) { c.destroy(); throw err; }
      let done = false;
      const end = async cmd => {
        if (done) return;
        done = true;
        try { await c.query(cmd); c.release(); } catch (err) { c.destroy(); throw err; }
      };
      return { query: (sql, params, { maxRows }) => run(c, sql, params, maxRows), commit: () => end('COMMIT'), rollback: () => end('ROLLBACK') };
    },

    /** A cursor: the rows come as a stream from the server, read a batch at a time. */
    async cursor(sql, params) {
      const c = await pool.getConnection();
      const raw = c.connection;   // the callback connection under the promise wrapper
      let fields = [];
      const query = raw.query({ sql, values: params });
      query.on('fields', f => { fields = fieldsOf(f); });
      const stream = query.stream({ highWaterMark: 100 });
      const it = stream[Symbol.asyncIterator]();
      let open = true;
      const finish = (bad) => { if (!open) return; open = false; stream.destroy(); if (bad) c.destroy(); else c.release(); };
      return {
        async next(n) {
          const rows = [];
          if (!open) return { rows, fields, done: true };
          try {
            while (rows.length < n) {
              const r = await it.next();
              if (r.done) { finish(false); return { rows, fields, done: true }; }
              rows.push(r.value);
            }
          } catch (err) { finish(true); throw err; }
          return { rows, fields, done: false };
        },
        async close() { if (open) finish(true); },   // a stream stopped halfway: the connection goes
      };
    },

    async tables() {
      const [rows] = await pool.query(`SELECT TABLE_SCHEMA AS \`schema\`, TABLE_NAME AS name, IF(TABLE_TYPE = 'VIEW', 'view', 'table') AS type
        FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME`);
      return rows;
    },

    async columns(table, schema) {
      const [rows] = await pool.query(`SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type, IS_NULLABLE = 'YES' AS nullable, COLUMN_DEFAULT AS \`default\`, COLUMN_KEY = 'PRI' AS \`key\`
        FROM information_schema.COLUMNS WHERE TABLE_NAME = ? AND TABLE_SCHEMA = COALESCE(?, DATABASE()) ORDER BY ORDINAL_POSITION`, [table, schema || null]);
      return rows.map(r => ({ ...r, nullable: !!r.nullable, key: !!r.key }));
    },

    async close() { await pool.end().catch(() => {}); },
  };
}
