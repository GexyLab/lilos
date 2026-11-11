import net from 'node:net';
import tls from 'node:tls';

/**
 * Oracle with oracledb in thin mode (pure JavaScript, no Oracle Client: initOracleClient is never
 * called). The pool connects to the address the guard checked; the service comes from
 * options.serviceName (or the database), or options.sid for the old SID form.
 *
 * TLS (tcps): oracledb thin always checks the certificate's chain (rejectUnauthorized is fixed on)
 * and checks the name against the host it connects to, so it cannot connect to the checked IP and
 * check the certificate against the server's name, nor accept an untrusted certificate for «on».
 * Here the TLS is made by this driver instead: a tunnel on 127.0.0.1 (a random port, only for this
 * connection) where every socket opens a TLS connection to the checked address with the server's
 * name (SNI and, for «verify», the certificate's name and chain), and oracledb speaks plain TCP to
 * the tunnel. Without TLS the tunnel is plain TCP: oracledb always talks only to the tunnel.
 *
 * Redirects: oracledb follows a listener's REDIRECT (TNS packet type 5) to an address the server
 * chooses, out of the guard's checks. The tunnel reads the server's packets until the session is
 * accepted and closes the connection on a REDIRECT: RAC/shared servers that redirect cannot be used.
 *
 * Positional binds :1, :2… (bound by position of appearance), autoCommit outside transactions,
 * one row per INSERT. NUMBER becomes a number when exact, text otherwise; CLOB text, BLOB bytes,
 * DATE and TIMESTAMP dates. Column names as the server gives them (upper-case when unquoted).
 */
let oracledb = null;   // loaded at the first connection (lazy: a database never used costs nothing)

export const kind = 'oracle';
export const label = 'Oracle';
export const defaultPort = 1521;

const SERVICE = /^[A-Za-z0-9_.$#-]{1,128}$/;

/**
 * A quoted name. Oracle keeps a name written without quotes in upper case, so a name all in
 * lower case (items, customer_id) is the upper-case one, as in SQL; other names stay as written.
 */
const quote = name => `"${(/^[a-z0-9_$#]+$/.test(name) ? name.toUpperCase() : name).replace(/"/g, '""')}"`;

export const dialect = {
  placeholder: i => `:${i}`,
  quote,
  paginate: (limit, offset) => ({ suffix: `${offset ? ` OFFSET ${Math.floor(offset)} ROWS` : ''}${limit ? ` FETCH NEXT ${Math.floor(limit)} ROWS ONLY` : ''}` }),
  returning: null,
  multiRow: false,
  maxParams: 1000,   // an IN list takes at most 1000 values
};

/** A value for oracledb: booleans as 1/0 (BOOLEAN exists only from 23ai), objects and lists as JSON. */
export const param = v => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'bigint') return Number.isSafeInteger(Number(v)) ? Number(v) : v.toString();
  if (v instanceof Uint8Array && !Buffer.isBuffer(v)) return Buffer.from(v);
  if (typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v)) return JSON.stringify(v);
  return v;
};

/** Digits and the position of the point of a number's text: '0.50', '.5' and '5e-1' are the same. */
function canon(t) {
  const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(String(t).trim());
  if (!m) return null;
  let digits = `${m[2]}${m[3] ?? ''}`;
  let point = m[2].length + Number(m[4] ?? 0);
  const lead = /^0*/.exec(digits)[0].length;
  digits = digits.slice(lead).replace(/0+$/, '');
  point -= lead;
  return digits ? `${m[1] === '-' ? '-' : ''}${digits}e${point}` : '0';
}

/** A NUMBER from its text: a number when exact, else the text. */
export function exactNumber(s) {
  if (s === null || s === undefined) return null;
  const x = Number(s);
  if (!Number.isFinite(x)) return s;
  if (Number.isInteger(x) && !Number.isSafeInteger(x)) return s;
  return canon(String(x)) === canon(s) ? x : s;
}

/** How a column is fetched: NUMBER as text then exact numbers, CLOB as text, BLOB as bytes. */
function fetchTypeHandler(meta) {
  const t = meta.dbType;
  if (t === oracledb.DB_TYPE_NUMBER) return { type: oracledb.STRING, converter: exactNumber };
  if (t === oracledb.DB_TYPE_CLOB || t === oracledb.DB_TYPE_NCLOB) return { type: oracledb.STRING };
  if (t === oracledb.DB_TYPE_BLOB) return { type: oracledb.BUFFER };
  return undefined;
}

const timeoutError = ms => Object.assign(new Error(`Oracle non ha risposto in ${Math.max(1, Math.round(ms / 1000))} s: la query è stata annullata`), { code: 'timeout' });
const isTimeout = err => /NJS-123|DPI-1067|call timeout/i.test(String(err?.message ?? ''));

const TNS_ACCEPT = 2, TNS_REFUSE = 4, TNS_REDIRECT = 5;

/**
 * The server's side of the tunnel: its packets are read (2-byte length, as before the session is
 * accepted) until ACCEPT or REFUSE; a REDIRECT closes the connection. Then everything passes.
 */
function redirectGuard(onRedirect) {
  let buf = Buffer.alloc(0);
  let open = false;
  return chunk => {
    if (open) return chunk;
    buf = Buffer.concat([buf, chunk]);
    let at = 0;
    while (buf.length - at >= 5) {
      const type = buf[at + 4];
      if (type === TNS_REDIRECT) { onRedirect(); return null; }
      if (type === TNS_ACCEPT || type === TNS_REFUSE) { open = true; break; }
      const len = buf.readUInt16BE(at);
      if (len < 8 || buf.length - at < len) break;
      at += len;
    }
    if (open) { const out = buf; buf = null; return out; }
    // not accepted yet: what is complete goes on, the rest waits
    const out = buf.subarray(0, at);
    buf = buf.subarray(at);
    return out.length ? out : Buffer.alloc(0);
  };
}

/** The tunnel (see above): → { port, error() (the last failure), close() }. TLS unless o.tls is 'off'. */
async function tlsTunnel(o) {
  const verify = o.tls === 'verify';
  const name = net.isIP(o.host) ? undefined : o.host;
  const sockets = new Set();
  let lastError = null;
  const server = net.createServer({ pauseOnConnect: true }, local => {
    if (sockets.size >= (o.poolSize + 4) * 2) { local.destroy(); return; }
    const plain = o.tls === 'off';
    const remote = plain ? net.connect({ host: o.address, port: o.port }) : tls.connect({
      host: o.address, port: o.port, servername: name, rejectUnauthorized: verify,
      checkServerIdentity: (_, cert) => (verify ? tls.checkServerIdentity(o.host, cert) : undefined),
    });
    sockets.add(local);
    sockets.add(remote);
    const end = () => { local.destroy(); remote.destroy(); sockets.delete(local); sockets.delete(remote); };
    const check = redirectGuard(() => {
      lastError = Object.assign(new Error('Il server Oracle ha chiesto di collegarsi a un altro indirizzo (redirect): non è permesso'), { redirect: true });
      end();
    });
    remote.once(plain ? 'connect' : 'secureConnect', () => {
      lastError = null;
      local.pipe(remote);
      remote.on('data', chunk => { const out = check(chunk); if (out?.length) local.write(out); });
      remote.on('end', () => local.end());
      local.resume();
    });
    remote.on('error', err => { lastError = err; end(); });
    local.on('error', end);
    local.on('close', end);
    remote.on('close', end);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  server.unref();
  return {
    port: server.address().port,
    error: () => lastError,
    close() { server.close(); for (const s of sockets) s.destroy(); sockets.clear(); },
  };
}

export async function open(o) {
  oracledb ??= (await import('oracledb')).default;
  const opt = o.options ?? {};
  const sid = typeof opt.sid === 'string' && opt.sid.trim() ? opt.sid.trim() : '';
  const service = String(opt.serviceName || o.database || '').trim();
  if (!sid && !service) throw new Error('Manca il servizio di Oracle (nome del servizio, per esempio FREEPDB1, o il database)');
  if (!SERVICE.test(sid || service)) throw new Error(`Nome del servizio non valido: «${String(sid || service).slice(0, 80)}» (lettere, cifre, . _ $ # -)`);

  const tunnel = await tlsTunnel(o);   // always: also without TLS (redirects, see above)
  const host = '127.0.0.1';
  const port = tunnel.port;
  const connectString = `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${host})(PORT=${port}))(CONNECT_DATA=${sid ? `(SID=${sid})` : `(SERVICE_NAME=${service})`}))`;
  const seconds = Math.max(1, Math.ceil(o.timeoutMs / 1000));
  let pool;
  let first;
  try {
    pool = await oracledb.createPool({
      user: o.user || undefined, password: o.password ?? '', connectString,
      poolMin: 0, poolMax: o.poolSize, poolIncrement: 1, poolTimeout: 30, queueTimeout: o.timeoutMs,
      connectTimeout: seconds, transportConnectTimeout: seconds, stmtCacheSize: 30,
      driverName: 'lilOS Logic Studio',
    });
    first = await pool.getConnection();
  } catch (err) {
    await pool?.close(0).catch(() => {});
    const tlsErr = tunnel?.error();
    tunnel?.close();
    if (tlsErr?.redirect) throw tlsErr;
    if (tlsErr) throw new Error(`${o.tls === 'off' ? 'La connessione' : 'La connessione TLS'} a Oracle non è riuscita: ${tlsErr.message}`);
    throw err;
  }
  const version = first.oracleServerVersionString;
  await first.close().catch(() => {});

  /** A connection of the pool with the time limit on every call. */
  const take = async () => {
    const conn = await pool.getConnection();
    conn.callTimeout = o.timeoutMs;
    return conn;
  };
  const give = async (conn, err) => {
    const drop = !!err && (isTimeout(err) || !conn.isHealthy?.());
    try { await conn.close({ drop }); } catch { if (!drop) await conn.close({ drop: true }).catch(() => {}); }
  };

  const exec = async (conn, sql, params, maxRows, autoCommit) => {
    let res;
    try {
      res = await conn.execute(sql, params, { outFormat: oracledb.OUT_FORMAT_OBJECT, autoCommit, maxRows: maxRows + 1, fetchTypeHandler });
    } catch (err) { throw isTimeout(err) ? timeoutError(o.timeoutMs) : err; }
    const rows = res.rows ?? [];
    return {
      rows: rows.slice(0, maxRows), truncated: rows.length > maxRows, fields: (res.metaData ?? []).map(m => m.name),
      affected: res.rowsAffected ?? rows.length, lastId: null,
    };
  };

  const run = async (sql, params, maxRows) => {
    const conn = await take();
    try {
      const res = await exec(conn, sql, params, maxRows, true);
      await give(conn);
      return res;
    } catch (err) { await give(conn, err); throw err; }
  };

  const ISOLATION = { repeatableRead: 'SERIALIZABLE', serializable: 'SERIALIZABLE', snapshot: 'SERIALIZABLE' };   // Oracle: READ COMMITTED (default) or SERIALIZABLE

  return {
    info: { server: `Oracle ${version ?? ''}`.trim() },
    dialect,
    param,
    query: (sql, params, { maxRows }) => run(sql, params, maxRows),

    async begin(isolation) {
      const conn = await take();
      try {
        if (ISOLATION[isolation]) await conn.execute(`SET TRANSACTION ISOLATION LEVEL ${ISOLATION[isolation]}`);
      } catch (err) { await give(conn, err); throw err; }
      let done = false;
      const end = async commit => {
        if (done) return;
        done = true;
        try {
          if (commit) await conn.commit(); else await conn.rollback();
          await give(conn);
        } catch (err) { await give(conn, err); throw err; }
      };
      return {
        async query(sql, params, { maxRows }) {
          if (done) throw new Error('La transazione è già chiusa');
          return exec(conn, sql, params, maxRows, false);
        },
        commit: () => end(true),
        rollback: () => end(false),
      };
    },

    /** A cursor: a result set read a batch at a time (getRows). */
    async cursor(sql, params) {
      const conn = await take();
      let rs = null;
      let fields = [];
      try {
        const res = await conn.execute(sql, params, { outFormat: oracledb.OUT_FORMAT_OBJECT, resultSet: true, fetchTypeHandler, autoCommit: true });
        rs = res.resultSet ?? null;
        fields = (res.metaData ?? []).map(m => m.name);
      } catch (err) { await give(conn, err); throw isTimeout(err) ? timeoutError(o.timeoutMs) : err; }
      let open = true;
      const finish = async err => {
        if (!open) return;
        open = false;
        await rs?.close().catch(() => {});
        await give(conn, err);
      };
      return {
        async next(n) {
          n = Math.max(1, Math.floor(n));
          if (!open || !rs) { await finish(); return { rows: [], fields, done: true }; }
          let rows;
          try { rows = await rs.getRows(n); } catch (err) { await finish(err); throw isTimeout(err) ? timeoutError(o.timeoutMs) : err; }
          const done = rows.length < n;
          if (done) await finish();
          return { rows, fields, done };
        },
        close: () => finish(),
      };
    },

    async tables() {
      const res = await run(`SELECT USER AS "schema", table_name AS "name", 'table' AS "type" FROM user_tables WHERE dropped = 'NO' AND nested = 'NO' AND secondary = 'N'
        UNION ALL SELECT USER, view_name, 'view' FROM user_views ORDER BY 2`, [], 100_000);
      return res.rows;
    },

    async columns(table, schema) {
      const sql = `SELECT c.column_name AS "name",
          c.data_type || CASE
            WHEN c.data_type IN ('VARCHAR2', 'NVARCHAR2', 'CHAR', 'NCHAR') THEN '(' || c.char_length || ')'
            WHEN c.data_type = 'RAW' THEN '(' || c.data_length || ')'
            WHEN c.data_type = 'NUMBER' AND c.data_precision IS NOT NULL THEN '(' || c.data_precision || ',' || c.data_scale || ')'
            ELSE '' END AS "type",
          CASE c.nullable WHEN 'Y' THEN 1 ELSE 0 END AS "nullable", c.data_default AS "default",
          CASE WHEN EXISTS (SELECT 1 FROM all_constraints k JOIN all_cons_columns kc ON kc.owner = k.owner AND kc.constraint_name = k.constraint_name
            WHERE k.constraint_type = 'P' AND k.owner = c.owner AND k.table_name = c.table_name AND kc.column_name = c.column_name) THEN 1 ELSE 0 END AS "key"
        FROM all_tab_columns c WHERE c.table_name = :1 AND c.owner = NVL(:2, USER) ORDER BY c.column_id`;
      let res = await run(sql, [table, schema || null], 10_000);
      // a name written in lower case is the upper-case one (as Oracle does for names without quotes)
      if (!res.rows.length && (/[a-z]/.test(table) || /[a-z]/.test(schema ?? ''))) res = await run(sql, [table.toUpperCase(), schema ? schema.toUpperCase() : null], 10_000);
      return res.rows.map(r => ({ ...r, nullable: !!r.nullable, key: !!r.key, default: typeof r.default === 'string' ? r.default.trim() : r.default ?? null }));
    },

    async close() {
      await pool.close(0).catch(() => {});
      tunnel?.close();
    },
  };
}
