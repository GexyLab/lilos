/**
 * The MongoDB blocks of Logic Studio, loaded by the engine in each user's worker (and read in the
 * kernel's main thread for the catalog: nothing here runs at import). The work is done by the
 * kernel (actions mongo.*, lib/mongo.js): the driver, the password and the sockets never come here.
 * Block format: see logicstudio-core/blocks.js.
 *
 * «Connessione MongoDB» gives a handle on «connessione»: link it to the «connessione» input of the
 * other blocks. Documents are Extended JSON (relaxed): an ObjectId is { "$oid": "…" }, a date
 * { "$date": "…" }, both in what comes out and in the filters.
 */

const L = (en, it) => ({ en, it });
/** The database's name before each label: the blocks of all the databases share the category «db». */
const M = (en, it) => L(`MongoDB · ${en}`, `MongoDB · ${it}`);

const RUN = { name: 'run', type: 'pulse', label: L('run', 'esegui') };
const CONNECTION = { name: 'connection', type: 'object', label: L('connection', 'connessione'), trigger: false };
const COLLECTION_IN = { name: 'collection', type: 'text', label: L('collection', 'raccolta'), trigger: false, hidden: true };
const FILTER_IN = { name: 'filter', type: 'object', label: L('filter', 'filtro'), trigger: false };
const COLLECTION = { key: 'collection', type: 'text', default: '', label: L('Collection', 'Raccolta (collection)') };
const FILTER = { key: 'filter', type: 'code', default: '', label: L('Filter (JSON, empty = every document)', 'Filtro (JSON, vuoto = tutti i documenti)') };
const MANY = { key: 'many', type: 'select', default: 'one', label: L('Documents', 'Documenti'), options: [
  { value: 'one', label: L('The first one that matches (…One)', 'Il primo che corrisponde (…One)') },
  { value: 'many', label: L('All those that match (…Many)', 'Tutti quelli che corrispondono (…Many)') },
] };
/** Each added input is a field of the filter, by its name (equality). */
const FIELDS = { inputs: { type: 'any', max: 16, name: 'user', label: L('field', 'campo') } };

const blank = v => v === undefined || v === null || v === '';
const pick = (input, setting) => (blank(input) ? setting : input);
/** An added input only keeps its value: the block runs on «esegui». */
const onlyKept = b => b.added.inputs.some(p => p.id === b.trigger);
const fieldsOf = b => b.added.inputs.filter(p => p.value !== undefined).map(p => ({ name: p.name, value: p.value }));
const collectionOf = (inputs, b) => pick(inputs.collection, b.config.collection);

// ---- the connection

async function open(b, password) {
  const m = b.memory();
  await shut(b);
  const r = await b.call('mongo.connect', { config: b.config, password });
  m.connection = r.connection;
  return { connection: r.connection, connected: true, info: r.info };
}

async function shut(b) {
  const m = b.memory();
  const connection = m.connection;
  m.connection = null;
  if (connection) await b.call('mongo.close', { connection }).catch(() => {});
}

// ---- listening (change streams): the kernel keeps the stream, the block drains it

async function unlisten(b) {
  const m = b.memory();
  const { sub, connection } = m;
  m.token = null;
  m.sub = null;
  if (sub) await b.call('mongo.unwatch', { connection, sub }).catch(() => {});
}

function poll(b, m, token, connection, sub) {
  const alive = () => b.memory() === m && m.token === token && !b.signal.aborted;
  const step = async () => {
    if (!alive()) return;
    const r = await b.call('mongo.next', { connection, sub, waitMs: 20_000 });
    if (!alive()) return;
    if (r.dropped) b.send('dropped', r.dropped);
    for (const msg of r.messages) {
      b.send('operation', msg.operation);
      b.send('key', msg.key);
      b.send('document', msg.document);
      b.send('change', msg.change);
    }
    if (r.closed) {
      m.token = null;
      m.sub = null;
      b.send('listening', false);
      if (r.error) throw new Error(r.error);
      return;
    }
    b.setTimeout(step, 0);
  };
  b.setTimeout(step, 0);
}

export const blocks = [
  {
    type: 'mongo.connect', version: 1, category: 'db', icon: 'database', label: M('Connection (MongoClient)', 'Connessione (MongoClient)'),
    description: L('Connects to a MongoDB server; link «connection» to the other MongoDB blocks', 'Si collega a un server MongoDB; collega «connessione» agli altri blocchi MongoDB'),
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
    config: [
      { key: 'uri', type: 'text', default: '', label: L('Address (URI: mongodb:// or mongodb+srv://, without the password; empty = the fields below)', 'Indirizzo (URI: mongodb:// o mongodb+srv://, senza password; vuoto = i campi qui sotto)') },
      { key: 'host', type: 'text', default: '', label: L('Server', 'Server') },
      { key: 'port', type: 'number', default: 27017, min: 1, max: 65535, step: 1, label: L('Port', 'Porta') },
      { key: 'database', type: 'text', default: '', label: L('Database', 'Database') },
      { key: 'user', type: 'text', default: '', label: L('User', 'Utente') },
      { key: 'password', type: 'secret', default: '', label: L('Password', 'Password') },
      { key: 'authSource', type: 'text', default: '', label: L('Users database (authSource, empty = admin)', 'Database degli utenti (authSource, vuoto = admin)') },
      { key: 'tls', type: 'select', default: 'verify', label: L('Encryption (TLS)', 'Cifratura (TLS)'), options: [
        { value: 'verify', label: L('On, certificate checked', 'Sì, con il certificato controllato') },
        { value: 'on', label: L('On, certificate not checked', 'Sì, senza controllare il certificato') },
        { value: 'off', label: L('Off', 'No') },
      ] },
      { key: 'atStart', type: 'checkbox', default: true, label: L('Connect at start', 'Connetti all\'avvio') },
    ],
    async start(b) {
      if (b.config.atStart === false) return;
      const out = await open(b);
      for (const [port, value] of Object.entries(out)) b.send(port, value);
    },
    async run(inputs, b) {
      if (b.trigger === 'close') { await shut(b); return { connected: false }; }
      return open(b, inputs.password);
    },
    async stop(b) { await shut(b).catch(() => {}); },
  },

  {
    type: 'mongo.find', version: 1, category: 'db', icon: 'search', label: M('Find (find)', 'Trova (find)'),
    description: L('The documents of a collection that match the filter; each added input is a field of the filter', 'I documenti di una raccolta che corrispondono al filtro; ogni ingresso aggiunto è un campo del filtro'),
    inputs: [RUN, CONNECTION, FILTER_IN, COLLECTION_IN,
      { name: 'limit', type: 'number', label: L('limit', 'limite'), trigger: false, hidden: true },
      { name: 'skip', type: 'number', label: L('skip', 'salta'), trigger: false, hidden: true }],
    outputs: [
      { name: 'documents', type: 'list', label: L('documents', 'documenti') },
      { name: 'first', type: 'object', label: L('first', 'primo'), hidden: true },
      { name: 'count', type: 'number', label: L('count', 'quanti') },
      { name: 'truncated', type: 'bool', label: L('truncated', 'troncato'), hidden: true },
    ],
    config: [
      COLLECTION, FILTER,
      { key: 'projection', type: 'code', default: '', label: L('Fields (projection, e.g. {"name": 1})', 'Campi (projection, per esempio {"nome": 1})') },
      { key: 'sort', type: 'code', default: '', label: L('Order (sort, e.g. {"age": -1})', 'Ordine (sort, per esempio {"eta": -1})') },
      { key: 'limit', type: 'number', default: 0, min: 0, step: 1, label: L('At most (limit, 0 = up to the module\'s limit)', 'Al massimo (limit, 0 = fino al limite del modulo)') },
      { key: 'skip', type: 'number', default: 0, min: 0, step: 1, label: L('Skip (skip)', 'Salta (skip)') },
    ],
    grow: FIELDS,
    async run(inputs, b) {
      if (onlyKept(b)) return undefined;
      const r = await b.call('mongo.find', {
        connection: inputs.connection, collection: collectionOf(inputs, b),
        filter: inputs.filter, filterSetting: b.config.filter, fields: fieldsOf(b),
        projection: b.config.projection, sort: b.config.sort,
        limit: pick(inputs.limit, b.config.limit), skip: pick(inputs.skip, b.config.skip),
      });
      return { documents: r.documents, first: r.documents[0] ?? null, count: r.count, truncated: r.truncated };
    },
  },

  {
    type: 'mongo.insert', version: 1, category: 'db', icon: 'plus', label: M('Insert (insertOne · insertMany)', 'Inserisci (insertOne · insertMany)'),
    description: L('Inserts a document, or each one of a list; each added input is a field of the document', 'Inserisce un documento, o ognuno di una lista; ogni ingresso aggiunto è un campo del documento'),
    inputs: [RUN, CONNECTION, { name: 'document', type: 'any', label: L('document or list', 'documento o lista'), trigger: false }, COLLECTION_IN],
    outputs: [
      { name: 'ids', type: 'list', label: L('ids', 'id') },
      { name: 'id', type: 'any', label: L('first id', 'primo id'), hidden: true },
      { name: 'count', type: 'number', label: L('count', 'quanti'), hidden: true },
    ],
    config: [COLLECTION],
    grow: { inputs: { type: 'any', max: 16, name: 'user', label: L('field', 'campo') } },
    async run(inputs, b) {
      if (onlyKept(b)) return undefined;
      const fields = Object.fromEntries(fieldsOf(b).map(f => [f.name, f.value]));
      let documents = inputs.document;
      if (Object.keys(fields).length) {
        if (Array.isArray(documents)) throw new Error('Con una lista di documenti non servono ingressi aggiunti: mettili nei documenti');
        documents = { ...(documents && typeof documents === 'object' ? documents : {}), ...fields };
      }
      if (blank(documents)) throw new Error('Manca il documento da inserire');
      const r = await b.call('mongo.insert', { connection: inputs.connection, collection: collectionOf(inputs, b), documents });
      return { ids: r.ids, id: r.ids[0] ?? null, count: r.count };
    },
  },

  {
    type: 'mongo.update', version: 1, category: 'db', icon: 'pencil', label: M('Update (updateOne · updateMany)', 'Aggiorna (updateOne · updateMany)'),
    description: L('Changes the documents that match the filter: {"$set": {…}}, {"$inc": {…}}…; an object without operators is a $set', 'Cambia i documenti che corrispondono al filtro: {"$set": {…}}, {"$inc": {…}}…; un oggetto senza operatori è un $set'),
    inputs: [RUN, CONNECTION, FILTER_IN, { name: 'update', type: 'any', label: L('update', 'modifica'), trigger: false }, COLLECTION_IN],
    outputs: [
      { name: 'matched', type: 'number', label: L('matched', 'trovati') },
      { name: 'modified', type: 'number', label: L('modified', 'modificati') },
      { name: 'upsertedId', type: 'any', label: L('id inserted', 'id inserito'), hidden: true },
    ],
    config: [
      COLLECTION, FILTER,
      { key: 'update', type: 'code', default: '', label: L('Update (JSON, e.g. {"$set": {"done": true}})', 'Modifica (JSON, per esempio {"$set": {"fatto": true}})') },
      MANY,
      { key: 'upsert', type: 'checkbox', default: false, label: L('Insert it when none matches (upsert)', 'Inseriscilo se nessuno corrisponde (upsert)') },
    ],
    grow: FIELDS,
    async run(inputs, b) {
      if (onlyKept(b)) return undefined;
      const r = await b.call('mongo.update', {
        connection: inputs.connection, collection: collectionOf(inputs, b),
        filter: inputs.filter, filterSetting: b.config.filter, fields: fieldsOf(b),
        update: inputs.update, updateSetting: b.config.update, many: b.config.many === 'many', upsert: b.config.upsert === true,
      });
      return { matched: r.matched, modified: r.modified, upsertedId: r.upsertedId };
    },
  },

  {
    type: 'mongo.delete', version: 1, category: 'db', icon: 'trash', label: M('Delete (deleteOne · deleteMany)', 'Elimina (deleteOne · deleteMany)'),
    description: L('Deletes the documents that match the filter; an empty filter only with «Every document»', 'Elimina i documenti che corrispondono al filtro; un filtro vuoto solo con «Tutti i documenti»'),
    inputs: [RUN, CONNECTION, FILTER_IN, COLLECTION_IN],
    outputs: [{ name: 'deleted', type: 'number', label: L('deleted', 'eliminati') }],
    config: [
      COLLECTION, FILTER, MANY,
      { key: 'all', type: 'checkbox', default: false, label: L('Every document (even with an empty filter)', 'Tutti i documenti (anche con il filtro vuoto)') },
    ],
    grow: FIELDS,
    async run(inputs, b) {
      if (onlyKept(b)) return undefined;
      const r = await b.call('mongo.delete', {
        connection: inputs.connection, collection: collectionOf(inputs, b),
        filter: inputs.filter, filterSetting: b.config.filter, fields: fieldsOf(b),
        many: b.config.many === 'many', all: b.config.all === true,
      });
      return { deleted: r.deleted };
    },
  },

  {
    type: 'mongo.count', version: 1, category: 'db', icon: 'hash', label: M('Count (countDocuments)', 'Conta (countDocuments)'),
    description: L('How many documents match the filter', 'Quanti documenti corrispondono al filtro'),
    inputs: [RUN, CONNECTION, FILTER_IN, COLLECTION_IN],
    outputs: [{ name: 'count', type: 'number', label: L('count', 'quanti') }],
    config: [COLLECTION, FILTER],
    grow: FIELDS,
    async run(inputs, b) {
      if (onlyKept(b)) return undefined;
      const r = await b.call('mongo.count', {
        connection: inputs.connection, collection: collectionOf(inputs, b),
        filter: inputs.filter, filterSetting: b.config.filter, fields: fieldsOf(b),
      });
      return { count: r.count };
    },
  },

  {
    type: 'mongo.aggregate', version: 1, category: 'db', icon: 'merge', label: M('Aggregate (aggregate)', 'Aggrega (aggregate)'),
    description: L('An aggregation pipeline: a list of stages [{"$match": …}, {"$group": …}]', 'Una pipeline di aggregazione: una lista di passi [{"$match": …}, {"$group": …}]'),
    inputs: [RUN, CONNECTION, { name: 'pipeline', type: 'list', label: L('pipeline', 'pipeline'), trigger: false }, COLLECTION_IN],
    outputs: [
      { name: 'documents', type: 'list', label: L('documents', 'documenti') },
      { name: 'first', type: 'object', label: L('first', 'primo'), hidden: true },
      { name: 'count', type: 'number', label: L('count', 'quanti') },
      { name: 'truncated', type: 'bool', label: L('truncated', 'troncato'), hidden: true },
    ],
    config: [
      COLLECTION,
      { key: 'pipeline', type: 'code', default: '[]', label: L('Pipeline (JSON list of stages)', 'Pipeline (lista JSON di passi)') },
    ],
    async run(inputs, b) {
      const r = await b.call('mongo.aggregate', {
        connection: inputs.connection, collection: collectionOf(inputs, b),
        pipeline: inputs.pipeline, pipelineSetting: b.config.pipeline,
      });
      return { documents: r.documents, first: r.documents[0] ?? null, count: r.count, truncated: r.truncated };
    },
  },

  {
    type: 'mongo.watch', version: 1, category: 'db', icon: 'eye', label: M('Watch changes (watch)', 'Osserva modifiche (watch)'),
    description: L('Each change of a collection (or of the whole database) as it happens; needs a replica set or a cluster', 'Ogni modifica di una raccolta (o di tutto il database) appena avviene; serve un replica set o un cluster'),
    inputs: [
      { name: 'listen', type: 'pulse', label: L('listen', 'ascolta') },
      { name: 'stop', type: 'pulse', label: L('stop', 'smetti'), hidden: true },
      { name: 'connection', type: 'object', label: L('connection', 'connessione') },
      COLLECTION_IN,
    ],
    outputs: [
      { name: 'document', type: 'object', label: L('document', 'documento') },
      { name: 'operation', type: 'text', label: L('operation', 'operazione') },
      { name: 'key', type: 'object', label: L('key (_id)', 'chiave (_id)'), hidden: true },
      { name: 'change', type: 'object', label: L('change', 'modifica'), hidden: true },
      { name: 'listening', type: 'bool', label: L('listening', 'in ascolto'), hidden: true },
      { name: 'dropped', type: 'number', label: L('lost', 'perse'), hidden: true },
    ],
    config: [
      { key: 'collection', type: 'text', default: '', label: L('Collection (empty = the whole database)', 'Raccolta (vuoto = tutto il database)') },
      { key: 'operation', type: 'select', default: 'all', label: L('Changes', 'Modifiche'), options: [
        { value: 'all', label: L('All', 'Tutte') },
        { value: 'insert', label: L('Inserts (insert)', 'Inserimenti (insert)') },
        { value: 'update', label: L('Updates (update, replace)', 'Aggiornamenti (update, replace)') },
        { value: 'delete', label: L('Deletes (delete)', 'Eliminazioni (delete)') },
      ] },
      { key: 'pipeline', type: 'code', default: '', label: L('More stages (JSON list, e.g. [{"$match": {"fullDocument.status": "new"}}])', 'Altri passi (lista JSON, per esempio [{"$match": {"fullDocument.stato": "nuovo"}}])') },
      { key: 'fullDocument', type: 'checkbox', default: true, label: L('Whole document also for updates (updateLookup)', 'Documento intero anche per gli aggiornamenti (updateLookup)') },
      { key: 'auto', type: 'checkbox', default: true, label: L('Listen as soon as the connection arrives', 'Ascolta appena arriva la connessione') },
    ],
    async run(inputs, b) {
      if (b.trigger === 'collection') return undefined;
      if (b.trigger === 'connection' && (b.config.auto === false || blank(inputs.connection))) return undefined;
      await unlisten(b);
      if (b.trigger === 'stop') return { listening: false };
      const m = b.memory();
      const token = {};
      m.token = token;
      const r = await b.call('mongo.watch', {
        connection: inputs.connection, collection: collectionOf(inputs, b),
        operation: b.config.operation, pipeline: b.config.pipeline, fullDocument: b.config.fullDocument !== false,
      });
      if (m.token !== token || b.memory() !== m) {   // stopped meanwhile
        await b.call('mongo.unwatch', { connection: inputs.connection, sub: r.sub }).catch(() => {});
        return undefined;
      }
      m.sub = r.sub;
      m.connection = inputs.connection;
      poll(b, m, token, inputs.connection, r.sub);
      return { listening: true };
    },
    async stop(b) { await unlisten(b).catch(() => {}); },
  },

  {
    type: 'mongo.collections', version: 1, category: 'db', icon: 'list', label: M('Collections (listCollections)', 'Raccolte (listCollections)'),
    description: L('The names of the collections of the database', 'I nomi delle raccolte del database'),
    inputs: [RUN, CONNECTION],
    outputs: [
      { name: 'names', type: 'list', label: L('names', 'nomi') },
      { name: 'collections', type: 'list', label: L('collections', 'raccolte'), hidden: true },
      { name: 'truncated', type: 'bool', label: L('truncated', 'troncato'), hidden: true },
    ],
    async run(inputs, b) {
      const r = await b.call('mongo.collections', { connection: inputs.connection });
      return { names: r.names, collections: r.collections, truncated: r.truncated };
    },
  },
];

/**
 * The subcategories of the Blocchi sidebar of Logic Studio IDE: it groups the blocks of a crowded
 * category under them, in `order` (shared by every package of the same category).
 */
for (const b of blocks) b.subcategory = { id: 'mongodb', label: L('MongoDB', 'MongoDB'), order: 1 };
