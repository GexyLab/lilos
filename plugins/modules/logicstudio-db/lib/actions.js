import { Connections, makeGuard, settingsOf, password, plain, fromBlock, checkSize, withTimeout, cleanError, text } from './shared/dbcore.js';
import { bindNamed, buildSelect, buildInsert, buildUpdate, buildDelete, chunks } from './sql.js';
import { makeFiles } from './files.js';

/**
 * The actions of the SQL blocks, made in the kernel's main thread for the program's owner (the
 * engine's broker): fn(user, args, tools). The drivers (lib/drivers/*.js) are loaded when first
 * used, so a database never used costs nothing.
 *
 * A driver: { kind, label, defaultPort, open(options) → session }; a session: { info, dialect,
 * query(sql, params, { maxRows }), begin(isolation) → tx, cursor(sql, params) → { next(n), close() },
 * tables(), columns(table, schema), listen?(channel, fn) → stop, notify?(channel, payload), close() }.
 *
 * What a program holds (all in Connections, closed when it stops): connections (counted per user),
 * and inside them transactions, cursors and listenings, which close with their connection.
 */
export const KINDS = {
  postgres: 'allowPostgres', mysql: 'allowMysql', mssql: 'allowMssql', sqlite: 'allowSqlite', oracle: 'allowOracle', clickhouse: 'allowClickhouse',
};
const LABELS = { postgres: 'PostgreSQL', mysql: 'MySQL / MariaDB', mssql: 'SQL Server', sqlite: 'SQLite', oracle: 'Oracle', clickhouse: 'ClickHouse' };
const LOADERS = {
  postgres: () => import('./drivers/postgres.js'),
  mysql: () => import('./drivers/mysql.js'),
  mssql: () => import('./drivers/mssql.js'),
  sqlite: () => import('./drivers/sqlite.js'),
  oracle: () => import('./drivers/oracle.js'),
  clickhouse: () => import('./drivers/clickhouse.js'),
};
const ISOLATIONS = new Set(['', 'readUncommitted', 'readCommitted', 'repeatableRead', 'serializable', 'snapshot']);
const MAX_TX_SECONDS = 600;
const MAX_LISTEN_BUFFER = 1000;
const CHANNEL = /^[A-Za-z_][A-Za-z0-9_$]{0,62}$/;

const oops = message => new Error(message);
const isObject = v => !!v && typeof v === 'object' && !Array.isArray(v);

export function makeActions({ config, dataDir, module, fs, workerFile }) {
  const settings = () => settingsOf(config(), KINDS);
  const sqliteMax = () => { const mb = Number(config().sqliteMaxMb); return Math.round((Number.isFinite(mb) && mb >= 1 && mb <= 1024 ? mb : 1024) * (1 << 20)); };
  const conns = new Connections(settings);
  const guard = makeGuard({ module, dataDir, settings });
  const files = makeFiles(fs, { maxBytes: sqliteMax });
  const drivers = new Map();
  const driver = async kind => {
    if (!LOADERS[kind]) throw oops(`Database sconosciuto: ${String(kind).slice(0, 40)}`);
    if (!drivers.has(kind)) drivers.set(kind, LOADERS[kind]().catch(err => { drivers.delete(kind); throw oops(`Il driver di ${LABELS[kind]} non si carica: ${err.message}`); }));
    return drivers.get(kind);
  };

  const rowsLimit = (asked, s) => Math.max(1, Math.min(s.maxRows, Number(asked) > 0 ? Math.floor(Number(asked)) : s.maxRows));
  const params = (session, list) => list.map(v => (session.param ? session.param(fromBlock(v)) : fromBlock(v)));

  /** The values of the named parameters: { nome: valore } from the block. */
  const valuesOf = v => (isObject(v) ? v : {});

  /** What runs a statement for a handle: a connection, or a transaction inside one. */
  const runner = (tools, handle) => {
    const entry = conns.get(tools, handle);
    if (entry.role === 'cursor' || entry.role === 'listen') throw oops('Questa non è una connessione né una transazione');
    return { entry, run: entry.tx ?? entry.session, session: entry.session };
  };

  /** A result for the blocks: plain values, limits checked. */
  const result = (res, s) => {
    const rows = plain(res.rows ?? []);
    const out = {
      rows, first: rows[0] ?? null, value: rows[0] ? Object.values(rows[0])[0] ?? null : null,
      fields: res.fields ?? [], affected: Number(res.affected) || 0, lastId: plain(res.lastId ?? null), truncated: !!res.truncated,
    };
    return checkSize(out, s.maxBytes);
  };

  /** Runs fn with the time limit, errors cleaned. */
  const timed = async (s, fn, secrets = []) => {
    try { return await withTimeout(Promise.resolve().then(fn), s.timeoutMs); } catch (err) { throw cleanError(err, secrets); }
  };

  /** Closes a connection's transactions, cursors and listenings, then the driver's session. */
  const closer = (tools, children, session) => async () => {
    for (const h of [...children]) await conns.close(tools, h).catch(() => {});
    children.clear();
    await session.close?.();
  };

  /** A sub-entry (transaction, cursor, listening) of a connection: closed with it. */
  const child = (user, tools, parent, entry) => {
    const handle = conns.add(user, tools, { kind: parent.kind, name: parent.name, session: parent.session, ...entry }, null);
    parent.children.add(handle);
    const close = entry.close;
    const own = conns.get(tools, handle);
    own.close = async () => { parent.children.delete(handle); await close?.(); };
    return handle;
  };

  const actions = {
    async 'db.connect'(user, args, tools) {
      const s = settings();
      const kind = String(args?.kind ?? '');
      if (!LOADERS[kind]) throw oops(`Database sconosciuto: ${kind.slice(0, 40)}`);
      if (!s.allowed.has(kind)) throw oops(`L'amministratore non permette i database ${LABELS[kind]} (impostazioni del modulo ${module})`);
      conns.count(user);
      const c = isObject(args.config) ? args.config : {};
      const d = await driver(kind);
      const release = conns.reserve(user);
      let pw = '';
      try {
        pw = await password(tools, args.password, c.password);
        const options = {
          kind, database: text(c.database).trim(), user: text(c.user).trim(), password: pw, tls: ['off', 'on', 'verify'].includes(c.tls) ? c.tls : 'verify',
          poolSize: Math.max(1, Math.min(10, Number(c.poolSize) || 4)), timeoutMs: s.timeoutMs, options: c, readOnly: c.readOnly === true, workerFile,
        };
        let name;
        if (kind === 'sqlite') {
          const file = c.memory === true ? null : await files.open(user, tools, text(c.file), { readOnly: options.readOnly });
          options.file = file;
          name = file ? file.shown : ':memory:';
        } else {
          const host = text(c.host).trim();
          const port = Number(c.port) || d.defaultPort;
          const t = await guard.target(host, port);
          Object.assign(options, { host: t.host, address: t.address, port });
          name = `${t.host}:${port}${options.database ? `/${options.database}` : ''}`;
        }
        let late = false;
        const opening = d.open(options);
        opening.then(sess => { if (late) sess.close?.().catch?.(() => {}); }, () => {});
        let session;
        try {
          session = await withTimeout(opening, s.timeoutMs, `${LABELS[kind]} non ha risposto in ${Math.round(s.timeoutMs / 1000)} s`, () => { late = true; });
        } catch (err) {
          await options.file?.close?.().catch(() => {});
          throw err;
        }
        const children = new Set();
        const handle = conns.add(user, tools, { kind, name, session, children, close: closer(tools, children, session) }, release);
        return { connection: handle, info: plain({ kind, label: LABELS[kind], name, ...session.info }) };
      } catch (err) {
        release();
        throw cleanError(err, [pw]);
      }
    },

    async 'db.close'(user, args, tools) {
      return { closed: await conns.close(tools, args?.connection) };
    },

    async 'db.query'(user, args, tools) {
      const s = settings();
      conns.count(user);
      const { run, session } = runner(tools, args?.connection);
      const sql = text(args.sql).trim();
      if (!sql) throw oops('Manca la query SQL');
      if (sql.length > 100_000) throw oops('Query troppo lunga (al massimo 100.000 caratteri)');
      const bound = bindNamed(sql, valuesOf(args.values), session.dialect);
      const maxRows = rowsLimit(args.maxRows, s);
      return result(await timed(s, () => run.query(bound.sql, params(session, bound.params), { maxRows })), s);
    },

    async 'db.select'(user, args, tools) {
      const s = settings();
      conns.count(user);
      const { run, session } = runner(tools, args?.connection);
      const maxRows = rowsLimit(args.limit, s);
      const offset = Math.max(0, Math.floor(Number(args.offset) || 0));
      const q = buildSelect({ table: args.table, columns: args.columns, where: valuesOf(args.where), order: args.order, limit: maxRows + 1, offset }, session.dialect);
      const res = await timed(s, () => run.query(q.sql, params(session, q.params), { maxRows: maxRows + 1 }));
      const rows = res.rows ?? [];
      return result({ ...res, rows: rows.slice(0, maxRows), truncated: rows.length > maxRows || res.truncated }, s);
    },

    async 'db.insert'(user, args, tools) {
      const s = settings();
      conns.count(user);
      const { entry, run, session } = runner(tools, args?.connection);
      const rows = Array.isArray(args.rows) ? args.rows : [args.rows];
      if (!rows.length || rows.some(r => !isObject(r))) throw oops('Serve una riga { colonna: valore } o una lista di righe');
      if (rows.length > s.maxRows) throw oops(`Troppe righe in una volta (al massimo ${s.maxRows})`);
      const returning = args.returning !== false && !!session.dialect.returning;
      const groups = chunks(rows, session.dialect);
      return result(await timed(s, async () => {
        // more statements: together in a transaction (unless already in one, or the database has none: ClickHouse)
        const tx = groups.length > 1 && !entry.tx && session.dialect.transactions !== false ? await session.begin('') : null;
        const target = tx ?? run;
        const out = { rows: [], affected: 0, lastId: null, fields: [] };
        try {
          for (const g of groups) {
            const q = buildInsert({ table: args.table, rows: g, returning }, session.dialect);
            const r = await target.query(q.sql, params(session, q.params), { maxRows: s.maxRows });
            out.rows.push(...(r.rows ?? []));
            out.affected += Number(r.affected) || 0;
            out.lastId = r.lastId ?? out.lastId;
            out.fields = r.fields?.length ? r.fields : out.fields;
          }
          await tx?.commit();
        } catch (err) {
          await tx?.rollback().catch(() => {});
          throw err;
        }
        return out;
      }), s);
    },

    async 'db.update'(user, args, tools) {
      const s = settings();
      conns.count(user);
      const { run, session } = runner(tools, args?.connection);
      const q = buildUpdate({ table: args.table, set: valuesOf(args.set), where: valuesOf(args.where), all: args.all === true }, session.dialect);
      return result(await timed(s, () => run.query(q.sql, params(session, q.params), { maxRows: 1 })), s);
    },

    async 'db.delete'(user, args, tools) {
      const s = settings();
      conns.count(user);
      const { run, session } = runner(tools, args?.connection);
      const q = buildDelete({ table: args.table, where: valuesOf(args.where), all: args.all === true }, session.dialect);
      return result(await timed(s, () => run.query(q.sql, params(session, q.params), { maxRows: 1 })), s);
    },

    async 'db.begin'(user, args, tools) {
      const s = settings();
      conns.count(user);
      const parent = conns.get(tools, args?.connection);
      if (parent.role) throw oops('Una transazione si apre su una connessione (non dentro un\'altra transazione)');
      const isolation = ISOLATIONS.has(args.isolation ?? '') ? args.isolation ?? '' : '';
      const tx = await timed(s, () => parent.session.begin(isolation));
      const seconds = Math.max(1, Math.min(MAX_TX_SECONDS, Number(args.timeoutSeconds) || 60));
      let timer = null;
      const handle = child(user, tools, parent, { role: 'tx', tx, close: async () => { clearTimeout(timer); await tx.rollback().catch(() => {}); } });
      // a transaction left open is rolled back
      timer = setTimeout(() => conns.close(tools, handle).catch(() => {}), seconds * 1000);
      timer.unref?.();
      return { transaction: handle };
    },

    async 'db.commit'(user, args, tools) {
      const s = settings();
      const entry = conns.get(tools, args?.transaction);
      if (entry.role !== 'tx') throw oops('Serve una transazione (l\'uscita «transazione» di Transazione)');
      await timed(s, () => entry.tx.commit());
      await conns.close(tools, args.transaction);
      return { done: true };
    },

    async 'db.rollback'(user, args, tools) {
      const entry = conns.get(tools, args?.transaction);
      if (entry.role !== 'tx') throw oops('Serve una transazione (l\'uscita «transazione» di Transazione)');
      await conns.close(tools, args.transaction);   // close() rolls back
      return { done: true };
    },

    async 'db.cursorOpen'(user, args, tools) {
      const s = settings();
      conns.count(user);
      const parent = conns.get(tools, args?.connection);
      if (parent.role) throw oops('Scorri righe usa una connessione (non una transazione)');
      const sql = text(args.sql).trim();
      if (!sql) throw oops('Manca la query SQL');
      const bound = bindNamed(sql, valuesOf(args.values), parent.session.dialect);
      const cursor = await timed(s, () => parent.session.cursor(bound.sql, params(parent.session, bound.params)));
      const state = { cursor, count: 0 };
      return { cursor: child(user, tools, parent, { role: 'cursor', state, close: () => cursor.close() }) };
    },

    async 'db.cursorNext'(user, args, tools) {
      const s = settings();
      conns.count(user);
      const entry = conns.get(tools, args?.cursor);
      if (entry.role !== 'cursor') throw oops('Serve un cursore aperto');
      const n = Math.max(1, Math.min(1000, Math.floor(Number(args.n) || 1)));
      const st = entry.state;
      if (st.count >= s.maxRows) { await conns.close(tools, args.cursor); return { rows: [], done: true, index: st.count, truncated: true }; }
      const res = await timed(s, () => st.cursor.next(Math.min(n, s.maxRows - st.count)));
      const rows = plain(res.rows ?? []);
      const index = st.count;
      st.count += rows.length;
      if (res.done) await conns.close(tools, args.cursor);
      return checkSize({ rows, index, done: !!res.done, fields: res.fields ?? [] }, s.maxBytes);
    },

    async 'db.cursorClose'(user, args, tools) {
      return { closed: await conns.close(tools, args?.cursor) };
    },

    async 'db.tables'(user, args, tools) {
      const s = settings();
      conns.count(user);
      const { session } = runner(tools, args?.connection);
      if (args.table) {
        const parts = String(args.table).split('.');
        const table = parts.pop();
        return checkSize({ columns: plain(await timed(s, () => session.columns(table, parts.pop() ?? null))) }, s.maxBytes);
      }
      return checkSize({ tables: plain(await timed(s, () => session.tables())).slice(0, s.maxRows) }, s.maxBytes);
    },

    async 'db.listen'(user, args, tools) {
      const s = settings();
      conns.count(user);
      const parent = conns.get(tools, args?.connection);
      if (parent.role || typeof parent.session.listen !== 'function') throw oops('Ascolta (LISTEN) funziona solo con le connessioni PostgreSQL');
      const channel = text(args.channel).trim();
      if (!CHANNEL.test(channel)) throw oops(`Canale non valido: «${channel.slice(0, 64)}» (lettere, cifre e _)`);
      const state = { queue: [], dropped: 0, waiter: null, closed: false };
      const stop = await timed(s, () => parent.session.listen(channel, m => {
        state.queue.push(m);
        if (state.queue.length > MAX_LISTEN_BUFFER) { state.queue.shift(); state.dropped++; }
        state.waiter?.();
      }));
      const handle = child(user, tools, parent, { role: 'listen', state, close: async () => { state.closed = true; state.waiter?.(); await stop(); } });
      return { subscription: handle };
    },

    async 'db.next'(user, args, tools) {
      const entry = conns.get(tools, args?.subscription);
      if (entry.role !== 'listen') throw oops('Serve un ascolto aperto');
      const st = entry.state;
      if (!st.queue.length && !st.closed) {
        const waitMs = Math.max(0, Math.min(25_000, Number(args.waitMs) || 20_000));
        await new Promise(resolve => {
          const timer = setTimeout(done, waitMs);
          const onAbort = () => done();
          function done() { clearTimeout(timer); st.waiter = null; tools.signal?.removeEventListener?.('abort', onAbort); resolve(); }
          st.waiter = done;
          tools.signal?.addEventListener?.('abort', onAbort, { once: true });
        });
      }
      const messages = st.queue.splice(0, 100);
      const dropped = st.dropped;
      st.dropped = 0;
      return { messages, dropped, closed: st.closed };
    },

    async 'db.unlisten'(user, args, tools) {
      return { closed: await conns.close(tools, args?.subscription) };
    },

    async 'db.notify'(user, args, tools) {
      const s = settings();
      conns.count(user);
      const { session } = runner(tools, args?.connection);
      if (typeof session.notify !== 'function') throw oops('Notifica (NOTIFY) funziona solo con le connessioni PostgreSQL');
      const channel = text(args.channel).trim();
      if (!CHANNEL.test(channel)) throw oops(`Canale non valido: «${channel.slice(0, 64)}» (lettere, cifre e _)`);
      const payload = text(args.payload);
      if (Buffer.byteLength(payload) > 7999) throw oops('Messaggio troppo lungo (PostgreSQL ne accetta al massimo 8000 byte)');
      await timed(s, () => session.notify(channel, payload));
      return { done: true };
    },
  };

  return { actions, closeAll: () => conns.closeAll(), conns };
}
