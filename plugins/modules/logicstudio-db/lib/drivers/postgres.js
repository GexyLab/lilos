let pg = null;   // loaded at the first connection (lazy: a database never used costs nothing)

/**
 * PostgreSQL with pg. The pool connects to the address the guard checked (host: the IP); TLS keeps
 * the server's name (servername) to check its certificate. Numbers: int8 and numeric become numbers
 * when exact, text otherwise; dates, JSON and bytes as pg gives them (plain() in the actions).
 */
export const kind = 'postgres';
export const label = 'PostgreSQL';
export const defaultPort = 5432;

const ISOLATION = { readUncommitted: 'READ UNCOMMITTED', readCommitted: 'READ COMMITTED', repeatableRead: 'REPEATABLE READ', serializable: 'SERIALIZABLE' };

/** A number from pg's text when it is exact, else the text. */
export function exactNumber(s) {
  if (s === null) return null;
  const x = Number(s);
  if (!Number.isFinite(x)) return s;
  if (Number.isInteger(x)) return Number.isSafeInteger(x) ? x : s;
  const norm = String(s).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '').replace(/^(-?)0+(?=\d)/, '$1');
  return String(x) === norm ? x : s;
}

const types = {
  getTypeParser(oid, format) {
    if (format === 'text' && (oid === 20 || oid === 1700)) return exactNumber;   // int8, numeric
    return pg.types.getTypeParser(oid, format);
  },
};

export const dialect = {
  placeholder: i => `$${i}`,
  quote: name => `"${name.replace(/"/g, '""')}"`,
  paginate: (limit, offset) => ({ suffix: `${limit ? ` LIMIT ${Math.floor(limit)}` : ''}${offset ? ` OFFSET ${Math.floor(offset)}` : ''}` }),
  returning: 'returning',
  multiRow: true,
  maxParams: 30000,
  reuseParams: true,
  dollarQuotes: true,
};

const fieldsOf = res => (res?.fields ?? []).map(f => f.name);

export async function open(o) {
  pg ??= (await import('pg')).default;
  const ssl = o.tls === 'off' ? false : { rejectUnauthorized: o.tls === 'verify', servername: o.host };
  const pool = new pg.Pool({
    host: o.address, port: o.port, database: o.database || 'postgres', user: o.user || 'postgres',
    // a function, also for no password: pg never takes PGPASSWORD or ~/.pgpass of the kernel's machine
    password: async () => o.password ?? '',
    ssl, max: o.poolSize, idleTimeoutMillis: 30_000, connectionTimeoutMillis: o.timeoutMs,
    statement_timeout: o.timeoutMs, query_timeout: o.timeoutMs + 1000, application_name: 'lilOS Logic Studio', types,
  });
  pool.on('error', () => { /* a broken idle client: the pool replaces it */ });
  const first = await pool.query('SELECT version() AS v');
  const run = async (q, sql, params, maxRows) => {
    const res = await q.query({ text: sql, values: params, rowMode: undefined });
    const last = Array.isArray(res) ? res.at(-1) : res;
    const rows = last.rows ?? [];
    return { rows: rows.slice(0, maxRows), truncated: rows.length > maxRows, fields: fieldsOf(last), affected: last.rowCount ?? 0, lastId: null };
  };
  const listeners = new Set();
  return {
    info: { server: String(first.rows[0]?.v ?? 'PostgreSQL') },
    dialect,
    query: (sql, params, { maxRows }) => run(pool, sql, params, maxRows),

    async begin(isolation) {
      const client = await pool.connect();
      try {
        await client.query(`BEGIN${ISOLATION[isolation] ? ` ISOLATION LEVEL ${ISOLATION[isolation]}` : ''}`);
      } catch (err) { client.release(true); throw err; }
      let done = false;
      const end = async (cmd) => {
        if (done) return;
        done = true;
        try { await client.query(cmd); client.release(); } catch (err) { client.release(true); throw err; }
      };
      return {
        query: (sql, params, { maxRows }) => run(client, sql, params, maxRows),
        commit: () => end('COMMIT'),
        rollback: () => end('ROLLBACK'),
      };
    },

    async cursor(sql, params) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN READ ONLY');
        await client.query({ text: `DECLARE lilos_cursor NO SCROLL CURSOR FOR ${sql}`, values: params });
      } catch (err) { await client.query('ROLLBACK').catch(() => {}); client.release(true); throw err; }
      let closed = false;
      let fields = [];
      return {
        async next(n) {
          if (closed) return { rows: [], fields, done: true };
          const res = await client.query(`FETCH FORWARD ${Math.max(1, Math.floor(n))} FROM lilos_cursor`);
          fields = fieldsOf(res);
          return { rows: res.rows, fields, done: res.rows.length < n };
        },
        async close() {
          if (closed) return;
          closed = true;
          try { await client.query('CLOSE lilos_cursor'); await client.query('COMMIT'); client.release(); } catch { client.release(true); }
        },
      };
    },

    async tables() {
      const res = await pool.query(`SELECT table_schema AS schema, table_name AS name, CASE table_type WHEN 'VIEW' THEN 'view' ELSE 'table' END AS type
        FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY 1, 2`);
      return res.rows;
    },

    async columns(table, schema) {
      const res = await pool.query(`SELECT c.column_name AS name, c.data_type AS type, c.is_nullable = 'YES' AS nullable, c.column_default AS "default",
          EXISTS (SELECT 1 FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage k
            ON k.constraint_name = tc.constraint_name AND k.table_schema = tc.table_schema AND k.table_name = tc.table_name
            WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = c.table_schema AND tc.table_name = c.table_name AND k.column_name = c.column_name) AS key
        FROM information_schema.columns c WHERE c.table_name = $1 AND c.table_schema = COALESCE($2, current_schema()) ORDER BY c.ordinal_position`, [table, schema || null]);
      return res.rows;
    },

    /** LISTEN on a channel: onMessage({ channel, payload, pid }) for each NOTIFY. → stop() */
    async listen(channel, onMessage) {
      const client = await pool.connect();
      const handler = m => onMessage({ channel: m.channel, payload: m.payload ?? '', pid: m.processId });
      client.on('notification', handler);
      try { await client.query(`LISTEN ${dialect.quote(channel)}`); } catch (err) { client.off('notification', handler); client.release(true); throw err; }
      const stop = async () => {
        if (!listeners.delete(stop)) return;
        client.off('notification', handler);
        try { await client.query(`UNLISTEN ${dialect.quote(channel)}`); client.release(); } catch { client.release(true); }
      };
      listeners.add(stop);
      return stop;
    },

    async notify(channel, payload) {
      await pool.query('SELECT pg_notify($1, $2)', [channel, payload]);
    },

    async close() {
      await Promise.all([...listeners].map(s => s().catch(() => {})));
      await pool.end().catch(() => {});
    },
  };
}
