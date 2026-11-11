/**
 * The SQL database blocks of Logic Studio, loaded by the engine in each user's worker (and read in
 * the kernel's main thread for the catalog: nothing here runs at import). Every operation is an
 * action made by the kernel (lib/actions.js): the worker never holds a socket nor a password.
 * Block format: see logicstudio-core/blocks.js.
 *
 * A connection block (one per database) sends a handle on «connessione»; the other blocks get it on
 * their input «connessione» and use it. A «Transazione» sends its own handle, used the same way by
 * the blocks that must run inside it.
 */

const L = (en, it) => ({ en, it });
const PULSE = true;
const text = v => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const isObject = v => !!v && typeof v === 'object' && !Array.isArray(v);
const addedTrigger = b => b.added.inputs.some(p => p.id === b.trigger);
/** The added inputs with a value: { name: value }. */
const addedValues = b => Object.fromEntries(b.added.inputs.filter(p => p.value !== undefined).map(p => [p.name, p.value]));

const TLS = [
  { value: 'off', label: L('No (not encrypted)', 'No (non cifrata)') },
  { value: 'on', label: L('Encrypted, certificate not checked', 'Cifrata, certificato non controllato') },
  { value: 'verify', label: L('Encrypted and checked', 'Cifrata e controllata') },
];

// ---- connection blocks

const connectionPorts = {
  inputs: [
    { name: 'connect', type: 'pulse', label: L('connect', 'connetti') },
    { name: 'close', type: 'pulse', label: L('close', 'chiudi'), hidden: true },
    { name: 'password', type: 'text', label: L('password', 'password'), hidden: true, trigger: false },
  ],
  outputs: [
    { name: 'connection', type: 'object', label: L('connection', 'connessione') },
    { name: 'connected', type: 'bool', label: L('connected', 'connesso') },
    { name: 'info', type: 'object', label: L('server', 'server'), hidden: true },
  ],
};

const field = {
  host: { key: 'host', type: 'text', default: '', label: L('Server (name or address)', 'Server (nome o indirizzo)') },
  port: p => ({ key: 'port', type: 'number', default: p, min: 1, max: 65535, label: L('Port', 'Porta') }),
  database: { key: 'database', type: 'text', default: '', label: L('Database', 'Database') },
  user: { key: 'user', type: 'text', default: '', label: L('User', 'Utente') },
  password: { key: 'password', type: 'secret', default: '', label: L('Password', 'Password') },
  tls: d => ({ key: 'tls', type: 'select', default: d, options: TLS, label: L('Encrypted connection (TLS)', 'Connessione cifrata (TLS)') }),
  pool: { key: 'poolSize', type: 'number', default: 4, min: 1, max: 10, label: L('Connections in the pool', 'Connessioni nel pool') },
  atStart: { key: 'atStart', type: 'checkbox', default: true, label: L('Connect at start', 'Connetti all\'avvio') },
};

async function connect(inputs, b, kind) {
  const m = b.memory();
  if (m.connection) { const old = m.connection; m.connection = null; await b.call('db.close', { connection: old }).catch(() => {}); }
  const r = await b.call('db.connect', { kind, config: b.config, password: typeof inputs.password === 'string' ? inputs.password : undefined });
  m.connection = r.connection;
  return { connection: r.connection, connected: true, info: r.info };
}

const connection = (type, kind, label, icon, description, config) => ({
  type, version: 1, category: 'db', icon, label, description, ...connectionPorts, config: [...config, field.atStart],
  async start(b) {
    if (b.config.atStart === false) return;
    const out = await connect({}, b, kind);
    for (const [port, value] of Object.entries(out)) b.send(port, value);
  },
  async run(inputs, b) {
    if (b.trigger === 'password') return undefined;
    if (b.trigger === 'close') {
      const m = b.memory();
      if (m.connection) { const old = m.connection; m.connection = null; await b.call('db.close', { connection: old }); }
      return { connected: false };
    }
    return connect(inputs, b, kind);
  },
  async stop(b) {
    const m = b.memory();
    if (m.connection) { const old = m.connection; m.connection = null; await b.call('db.close', { connection: old }).catch(() => {}); }
  },
});

// ---- common ports of the operations

const runIn = { name: 'run', type: 'pulse', label: L('run', 'esegui') };
const connIn = { name: 'connection', type: 'object', label: L('connection', 'connessione'), trigger: false };
const tableField = { key: 'table', type: 'text', default: '', label: L('Table (schema.table for a schema)', 'Tabella (schema.tabella per uno schema)') };
const allField = { key: 'all', type: 'checkbox', default: false, label: L('All the rows (when there is no condition)', 'Tutte le righe (quando non c\'è una condizione)') };
const conditions = { inputs: { type: 'any', max: 16, name: 'user', label: L('condition (column)', 'condizione (colonna)') } };
const tableOf = (inputs, b) => text(inputs.table === undefined || inputs.table === null || inputs.table === '' ? b.config.table : inputs.table).trim();
const tableIn = { name: 'table', type: 'text', label: L('table', 'tabella'), hidden: true, trigger: false };
/** WHERE: the object on «condizioni» plus the added inputs (column = value). */
const whereOf = (inputs, b) => ({ ...(isObject(inputs.where) ? inputs.where : {}), ...addedValues(b) });
const whereIn = { name: 'where', type: 'object', label: L('conditions', 'condizioni'), hidden: true, trigger: false };

export const blocks = [
  connection('db.postgres', 'postgres', L('SQL · PostgreSQL (connect)', 'SQL · PostgreSQL (connect)'), 'database',
    L('A connection to a PostgreSQL server; its output «connection» goes to the other database blocks', 'Una connessione a un server PostgreSQL; la sua uscita «connessione» va agli altri blocchi database'),
    [field.host, field.port(5432), field.database, field.user, field.password, field.tls('off'), field.pool]),
  connection('db.mysql', 'mysql', L('SQL · MySQL · MariaDB (connect)', 'SQL · MySQL · MariaDB (connect)'), 'database',
    L('A connection to a MySQL or MariaDB server', 'Una connessione a un server MySQL o MariaDB'),
    [field.host, field.port(3306), field.database, field.user, field.password, field.tls('off'), field.pool]),
  connection('db.mssql', 'mssql', L('SQL · SQL Server (connect)', 'SQL · SQL Server (connect)'), 'database',
    L('A connection to Microsoft SQL Server or Azure SQL', 'Una connessione a Microsoft SQL Server o Azure SQL'),
    [field.host, field.port(1433), { key: 'instance', type: 'text', default: '', label: L('Instance (empty: the port)', 'Istanza (vuota: la porta)') },
      field.database, field.user, field.password, field.tls('on'), field.pool]),
  connection('db.sqlite', 'sqlite', L('SQL · SQLite (open)', 'SQL · SQLite (open)'), 'database',
    L('A SQLite database in a file of your home (made when missing), or in memory', 'Un database SQLite in un file della tua home (creato se manca), oppure in memoria'),
    [{ key: 'file', type: 'text', default: '~/Documenti/dati.sqlite', label: L('File (~/…)', 'File (~/…)') },
      { key: 'memory', type: 'checkbox', default: false, label: L('In memory (no file)', 'In memoria (senza file)') },
      { key: 'readOnly', type: 'checkbox', default: false, label: L('Read only', 'Sola lettura') }]),
  connection('db.oracle', 'oracle', L('SQL · Oracle (connect)', 'SQL · Oracle (connect)'), 'database',
    L('A connection to an Oracle Database server (12c or later)', 'Una connessione a un server Oracle Database (12c o successivo)'),
    [field.host, field.port(1521), { key: 'serviceName', type: 'text', default: 'FREEPDB1', label: L('Service name', 'Nome del servizio') },
      field.user, field.password, field.tls('off'), field.pool]),
  connection('db.clickhouse', 'clickhouse', L('SQL · ClickHouse (connect)', 'SQL · ClickHouse (connect)'), 'database',
    L('A connection to a ClickHouse server (its HTTP interface)', 'Una connessione a un server ClickHouse (la sua interfaccia HTTP)'),
    [field.host, field.port(8123), field.database, { ...field.user, default: 'default' }, field.password, field.tls('off')]),

  {
    type: 'db.query', version: 1, category: 'db', icon: 'code', label: L('SQL · Query (query)', 'SQL · Query (query)'),
    description: L('Runs the SQL of the settings (or of the input «SQL»); write :name for a parameter and add an input with that name', 'Esegue l\'SQL delle impostazioni (o dell\'ingresso «SQL»); scrivi :nome per un parametro e aggiungi un ingresso con quel nome'),
    inputs: [runIn, connIn, { name: 'sql', type: 'text', label: L('SQL', 'SQL'), hidden: true, trigger: false }],
    outputs: [
      { name: 'rows', type: 'list', label: L('rows', 'righe') },
      { name: 'first', type: 'object', label: L('first row', 'prima riga') },
      { name: 'value', type: 'any', label: L('value', 'valore'), hidden: true },
      { name: 'affected', type: 'number', label: L('rows changed', 'righe modificate') },
      { name: 'lastId', type: 'any', label: L('last id', 'ultimo id'), hidden: true },
      { name: 'fields', type: 'list', label: L('columns', 'colonne'), hidden: true },
      { name: 'truncated', type: 'bool', label: L('cut', 'troncato'), hidden: true },
    ],
    config: [
      { key: 'sql', type: 'code', default: 'SELECT * FROM tabella WHERE id = :id', label: L('SQL', 'SQL') },
      { key: 'maxRows', type: 'number', default: 0, min: 0, max: 1000000, label: L('Rows, at most (0 = the module\'s limit)', 'Righe al massimo (0 = il limite del modulo)') },
    ],
    grow: { inputs: { type: 'any', max: 32, name: 'user', label: L('parameter', 'parametro') } },
    async run(inputs, b) {
      if (addedTrigger(b)) return undefined;
      const sql = text(inputs.sql === undefined || inputs.sql === null || inputs.sql === '' ? b.config.sql : inputs.sql);
      return b.call('db.query', { connection: inputs.connection, sql, values: addedValues(b), maxRows: b.config.maxRows });
    },
  },

  {
    type: 'db.select', version: 1, category: 'db', icon: 'search', label: L('SQL · Read table (SELECT)', 'SQL · Leggi tabella (SELECT)'),
    description: L('Reads rows of a table without writing SQL; each added input is a condition column = value', 'Legge le righe di una tabella senza scrivere SQL; ogni ingresso aggiunto è una condizione colonna = valore'),
    inputs: [runIn, connIn, tableIn, whereIn],
    outputs: [
      { name: 'rows', type: 'list', label: L('rows', 'righe') },
      { name: 'first', type: 'object', label: L('first row', 'prima riga') },
      { name: 'truncated', type: 'bool', label: L('more rows', 'altre righe'), hidden: true },
    ],
    config: [
      tableField,
      { key: 'columns', type: 'text', default: '*', label: L('Columns (a, b, c or *)', 'Colonne (a, b, c oppure *)') },
      { key: 'order', type: 'text', default: '', label: L('Order (column or column DESC)', 'Ordine (colonna oppure colonna DESC)') },
      { key: 'limit', type: 'number', default: 100, min: 0, max: 1000000, label: L('Rows, at most (0 = the module\'s limit)', 'Righe al massimo (0 = il limite del modulo)') },
      { key: 'offset', type: 'number', default: 0, min: 0, label: L('Skip rows', 'Salta righe') },
    ],
    grow: conditions,
    async run(inputs, b) {
      if (addedTrigger(b)) return undefined;
      const r = await b.call('db.select', {
        connection: inputs.connection, table: tableOf(inputs, b), columns: b.config.columns, order: b.config.order,
        where: whereOf(inputs, b), limit: b.config.limit, offset: b.config.offset,
      });
      return { rows: r.rows, first: r.first, truncated: r.truncated };
    },
  },

  {
    type: 'db.insert', version: 1, category: 'db', icon: 'plus', label: L('SQL · Insert (INSERT)', 'SQL · Inserisci (INSERT)'),
    description: L('Inserts a row (an object) or a list of rows; without «row», the added inputs are the columns of the row', 'Inserisce una riga (un oggetto) o una lista di righe; senza «riga», gli ingressi aggiunti sono le colonne della riga'),
    inputs: [runIn, connIn, { name: 'row', type: 'any', label: L('row', 'riga'), trigger: false }, tableIn],
    outputs: [
      { name: 'affected', type: 'number', label: L('rows inserted', 'righe inserite') },
      { name: 'lastId', type: 'any', label: L('last id', 'ultimo id') },
      { name: 'rows', type: 'list', label: L('rows inserted', 'righe inserite'), hidden: true },
    ],
    config: [tableField],
    grow: { inputs: { type: 'any', max: 32, name: 'user', label: L('column', 'colonna') } },
    async run(inputs, b) {
      if (addedTrigger(b)) return undefined;
      const rows = inputs.row !== undefined && inputs.row !== null ? inputs.row : addedValues(b);
      const r = await b.call('db.insert', { connection: inputs.connection, table: tableOf(inputs, b), rows });
      const id = r.lastId ?? (r.rows?.length ? Object.values(r.rows.at(-1))[0] ?? null : null);
      return { affected: r.affected, lastId: id, rows: r.rows };
    },
  },

  {
    type: 'db.update', version: 1, category: 'db', icon: 'pencil', label: L('SQL · Update (UPDATE)', 'SQL · Aggiorna (UPDATE)'),
    description: L('Changes the columns of «values» in the rows that match the added inputs (column = value)', 'Cambia le colonne di «valori» nelle righe che rispettano gli ingressi aggiunti (colonna = valore)'),
    inputs: [runIn, connIn, { name: 'values', type: 'object', label: L('values', 'valori'), trigger: false }, tableIn, whereIn],
    outputs: [{ name: 'affected', type: 'number', label: L('rows changed', 'righe modificate') }],
    config: [tableField, allField],
    grow: conditions,
    async run(inputs, b) {
      if (addedTrigger(b)) return undefined;
      const r = await b.call('db.update', { connection: inputs.connection, table: tableOf(inputs, b), set: inputs.values, where: whereOf(inputs, b), all: b.config.all === true });
      return { affected: r.affected };
    },
  },

  {
    type: 'db.delete', version: 1, category: 'db', icon: 'trash', label: L('SQL · Delete (DELETE)', 'SQL · Elimina (DELETE)'),
    description: L('Deletes the rows that match the added inputs (column = value); with no condition only when «All the rows» is ticked', 'Cancella le righe che rispettano gli ingressi aggiunti (colonna = valore); senza condizioni solo se «Tutte le righe» è spuntato'),
    inputs: [runIn, connIn, tableIn, whereIn],
    outputs: [{ name: 'affected', type: 'number', label: L('rows deleted', 'righe cancellate') }],
    config: [tableField, allField],
    grow: conditions,
    async run(inputs, b) {
      if (addedTrigger(b)) return undefined;
      const r = await b.call('db.delete', { connection: inputs.connection, table: tableOf(inputs, b), where: whereOf(inputs, b), all: b.config.all === true });
      return { affected: r.affected };
    },
  },

  {
    type: 'db.transaction', version: 1, category: 'db', icon: 'lock', label: L('SQL · Transaction (BEGIN · COMMIT · ROLLBACK)', 'SQL · Transazione (BEGIN · COMMIT · ROLLBACK)'),
    description: L('Opens a transaction on a connection: link «transaction» to the «connection» of the blocks that must run in it, then commit or roll back', 'Apre una transazione su una connessione: collega «transazione» alla «connessione» dei blocchi che devono stare dentro, poi conferma o annulla'),
    inputs: [
      { name: 'begin', type: 'pulse', label: L('begin', 'inizia') },
      { name: 'commit', type: 'pulse', label: L('commit', 'conferma') },
      { name: 'rollback', type: 'pulse', label: L('roll back', 'annulla') },
      connIn,
    ],
    outputs: [
      { name: 'transaction', type: 'object', label: L('transaction', 'transazione') },
      { name: 'committed', type: 'pulse', label: L('committed', 'confermata') },
      { name: 'rolledBack', type: 'pulse', label: L('rolled back', 'annullata') },
    ],
    config: [
      { key: 'isolation', type: 'select', default: '', label: L('Isolation level', 'Livello di isolamento'), options: [
        { value: '', label: L('The database\'s default', 'Quello del database') },
        { value: 'readUncommitted', label: L('Read uncommitted', 'Read uncommitted') },
        { value: 'readCommitted', label: L('Read committed', 'Read committed') },
        { value: 'repeatableRead', label: L('Repeatable read', 'Repeatable read') },
        { value: 'serializable', label: L('Serializable', 'Serializable') },
        { value: 'snapshot', label: L('Snapshot (SQL Server)', 'Snapshot (SQL Server)') },
      ] },
      { key: 'timeoutSeconds', type: 'number', default: 60, min: 1, max: 600, label: L('Rolled back by itself after (seconds)', 'Annullata da sola dopo (secondi)') },
    ],
    async run(inputs, b) {
      const m = b.memory();
      if (b.trigger === 'begin') {
        if (m.tx) throw new Error('Una transazione è già aperta: confermala o annullala prima di iniziarne un\'altra');
        const r = await b.call('db.begin', { connection: inputs.connection, isolation: b.config.isolation, timeoutSeconds: b.config.timeoutSeconds });
        m.tx = r.transaction;
        return { transaction: r.transaction };
      }
      if (b.trigger === 'commit' || b.trigger === 'rollback') {
        if (!m.tx) throw new Error('Nessuna transazione aperta');
        const tx = m.tx;
        m.tx = null;
        await b.call(b.trigger === 'commit' ? 'db.commit' : 'db.rollback', { transaction: tx });
        return b.trigger === 'commit' ? { committed: PULSE } : { rolledBack: PULSE };
      }
      return undefined;
    },
    async stop(b) {
      const m = b.memory();
      if (m.tx) { const tx = m.tx; m.tx = null; await b.call('db.rollback', { transaction: tx }).catch(() => {}); }
    },
  },

  {
    type: 'db.cursor', version: 1, category: 'db', icon: 'rows', label: L('SQL · Read rows one by one (cursor)', 'SQL · Scorri righe (cursor)'),
    description: L('Runs a query and sends its rows one at a time (or in groups): at each «next», or by itself when «next» is not linked', 'Esegue una query e manda le righe una alla volta (o a gruppi): a ogni «prossima», oppure da solo quando «prossima» non è collegato'),
    inputs: [
      runIn,
      { name: 'next', type: 'pulse', label: L('next', 'prossima') },
      { name: 'stop', type: 'pulse', label: L('stop', 'ferma'), hidden: true },
      connIn,
    ],
    outputs: [
      { name: 'row', type: 'any', label: L('row', 'riga') },
      { name: 'index', type: 'number', label: L('index', 'indice') },
      { name: 'done', type: 'pulse', label: L('done', 'finito') },
    ],
    config: [
      { key: 'sql', type: 'code', default: 'SELECT * FROM tabella', label: L('SQL', 'SQL') },
      { key: 'batch', type: 'number', default: 1, min: 1, max: 1000, label: L('Rows at a time (more than 1: a list)', 'Righe alla volta (più di 1: una lista)') },
      { key: 'pause', type: 'number', default: 0, min: 0, max: 60000, label: L('Pause between rows by itself (ms)', 'Pausa tra le righe da solo (ms)') },
    ],
    grow: { inputs: { type: 'any', max: 32, name: 'user', label: L('parameter', 'parametro') } },
    async run(inputs, b) {
      if (addedTrigger(b)) return undefined;
      const m = b.memory();
      const batch = Math.max(1, Math.min(1000, Number(b.config.batch) || 1));
      const close = async () => { if (m.cursor) { const c = m.cursor; m.cursor = null; await b.call('db.cursorClose', { cursor: c }).catch(() => {}); } };
      const step = async () => {
        if (!m.cursor) return false;
        const r = await b.call('db.cursorNext', { cursor: m.cursor, n: batch });
        if (r.done) m.cursor = null;
        if (r.rows.length) {
          b.send('index', r.index);
          b.send('row', batch === 1 ? r.rows[0] : r.rows);
        }
        if (r.done) { b.send('done', PULSE); return false; }
        return true;
      };
      const auto = () => {
        if (b.linked('next')) return;
        const gen = m.gen;
        b.setTimeout(async () => {
          if (m.gen !== gen) return;
          if (await step()) auto();
        }, Math.max(0, Number(b.config.pause) || 0));
      };
      if (b.trigger === 'stop') { await close(); return undefined; }
      if (b.trigger === 'next') { await step(); return undefined; }
      // run: a new query (the previous cursor closes)
      await close();
      m.gen = (m.gen ?? 0) + 1;
      const sql = text(b.config.sql);
      const r = await b.call('db.cursorOpen', { connection: inputs.connection, sql, values: addedValues(b) });
      m.cursor = r.cursor;
      if (await step()) auto();
      return undefined;
    },
    async stop(b) {
      const m = b.memory();
      if (m.cursor) { const c = m.cursor; m.cursor = null; await b.call('db.cursorClose', { cursor: c }).catch(() => {}); }
    },
  },

  {
    type: 'db.tables', version: 1, category: 'db', icon: 'list', label: L('SQL · Tables and columns (schema)', 'SQL · Tabelle e colonne (schema)'),
    description: L('The tables and views of the database; with a table, its columns', 'Le tabelle e le viste del database; con una tabella, le sue colonne'),
    inputs: [runIn, connIn, { name: 'table', type: 'text', label: L('table', 'tabella'), trigger: false }],
    outputs: [
      { name: 'tables', type: 'list', label: L('tables', 'tabelle') },
      { name: 'columns', type: 'list', label: L('columns', 'colonne') },
    ],
    config: [{ key: 'table', type: 'text', default: '', label: L('Table (empty: all the tables)', 'Tabella (vuota: tutte le tabelle)') }],
    async run(inputs, b) {
      const table = tableOf(inputs, b);
      const r = await b.call('db.tables', { connection: inputs.connection, table: table || undefined });
      return table ? { columns: r.columns } : { tables: r.tables };
    },
  },

  {
    type: 'db.listen', version: 1, category: 'db', icon: 'bell', label: L('SQL · Listen (LISTEN)', 'SQL · Ascolta (LISTEN)'),
    description: L('PostgreSQL: receives the notifications (NOTIFY) of a channel while the program runs', 'PostgreSQL: riceve le notifiche (NOTIFY) di un canale finché il programma gira'),
    inputs: [
      { name: 'start', type: 'pulse', label: L('start', 'avvia') },
      { name: 'stop', type: 'pulse', label: L('stop', 'ferma'), hidden: true },
      { ...connIn, trigger: true },
    ],
    outputs: [
      { name: 'message', type: 'text', label: L('message', 'messaggio') },
      { name: 'data', type: 'object', label: L('notification', 'notifica'), hidden: true },
      { name: 'listening', type: 'bool', label: L('listening', 'in ascolto') },
    ],
    config: [
      { key: 'channel', type: 'text', default: 'eventi', label: L('Channel', 'Canale') },
      { key: 'json', type: 'checkbox', default: false, label: L('Messages are JSON', 'I messaggi sono JSON') },
    ],
    async run(inputs, b) {
      const m = b.memory();
      const stop = async () => { m.gen = (m.gen ?? 0) + 1; if (m.sub) { const s = m.sub; m.sub = null; await b.call('db.unlisten', { subscription: s }).catch(() => {}); } };
      if (b.trigger === 'stop') { await stop(); return { listening: false }; }
      // «avvia», or a connection arriving (it starts by itself when the connection comes)
      if (b.trigger === 'connection' && (m.sub || !inputs.connection)) return undefined;
      await stop();
      const r = await b.call('db.listen', { connection: inputs.connection, channel: text(b.config.channel) });
      m.sub = r.subscription;
      const gen = m.gen;
      const sub = m.sub;
      (async () => {
        while (m.gen === gen && !b.signal.aborted) {
          let r2;
          try { r2 = await b.call('db.next', { subscription: sub, waitMs: 20000 }); } catch { break; }
          if (m.gen !== gen) break;
          for (const msg of r2.messages) {
            let payload = msg.payload;
            if (b.config.json) { try { payload = JSON.parse(msg.payload); } catch { /* not JSON: as text */ } }
            b.send('data', { channel: msg.channel, payload, pid: msg.pid });
            b.send('message', payload);
          }
          if (r2.closed) break;
        }
        if (m.gen === gen) { m.sub = null; b.send('listening', false); }
      })();
      return { listening: true };
    },
    async stop(b) {
      const m = b.memory();
      m.gen = (m.gen ?? 0) + 1;
      if (m.sub) { const s = m.sub; m.sub = null; await b.call('db.unlisten', { subscription: s }).catch(() => {}); }
    },
  },

  {
    type: 'db.notify', version: 1, category: 'db', icon: 'bolt', label: L('SQL · Notify (NOTIFY)', 'SQL · Notifica (NOTIFY)'),
    description: L('PostgreSQL: sends a notification on a channel (objects as JSON)', 'PostgreSQL: manda una notifica su un canale (gli oggetti come JSON)'),
    inputs: [runIn, connIn, { name: 'message', type: 'any', label: L('message', 'messaggio'), trigger: false }],
    outputs: [{ name: 'sent', type: 'pulse', label: L('sent', 'mandata') }],
    config: [{ key: 'channel', type: 'text', default: 'eventi', label: L('Channel', 'Canale') }],
    async run(inputs, b) {
      await b.call('db.notify', { connection: inputs.connection, channel: text(b.config.channel), payload: text(inputs.message) });
      return { sent: PULSE };
    },
  },
];
