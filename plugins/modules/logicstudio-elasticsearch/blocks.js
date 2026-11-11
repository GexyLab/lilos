/**
 * The Elasticsearch blocks of Logic Studio (Elasticsearch 7/8, OpenSearch 1/2), loaded by the engine
 * in each user's worker (and read in the kernel's main thread for the catalog: nothing here runs at
 * import). The work is done by the kernel (actions es.*, lib/es.js): the worker never holds the
 * password. Block format: see logicstudio-core/blocks.js.
 *
 * Connessione Elasticsearch gives a «connessione» to link to the other blocks; it closes with the
 * program. In Cerca, Conta and Elimina per query each added input is a term field = value (in AND
 * with the query).
 */

const L = (en, it) => ({ en, it });
const text = v => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const given = v => v !== undefined && v !== null && v !== '';
const pick = (input, config) => (given(input) ? input : config);
const storedOnly = b => b.added.inputs.some(p => p.id === b.trigger);   // an added input only keeps its value
const matchOf = b => Object.fromEntries(b.added.inputs.filter(p => given(p.value)).map(p => [p.name, p.value]));

const RUN = { name: 'run', type: 'pulse', label: L('run', 'esegui') };
const CONNECTION = { name: 'connection', type: 'object', label: L('connection', 'connessione'), trigger: false };
const INDEX_IN = { name: 'index', type: 'text', label: L('index', 'indice'), trigger: false, hidden: true };
const ID_IN = { name: 'id', type: 'text', label: L('id', 'id'), trigger: false };
const INDEX = { key: 'index', type: 'text', default: '', label: L('Index', 'Indice') };
const REFRESH = { key: 'refresh', type: 'select', default: 'false', label: L('Visible to searches', 'Visibile alle ricerche'), options: [
  { value: 'false', label: L('Soon (as the index refreshes)', 'Tra poco (al prossimo refresh)') },
  { value: 'wait_for', label: L('Wait until visible (wait_for)', 'Aspetta che sia visibile (wait_for)') },
  { value: 'true', label: L('At once (refresh: costly)', 'Subito (refresh: costoso)') },
] };
const MATCH = { inputs: { type: 'any', max: 16, name: 'user', label: L('field', 'campo') } };

async function connect(b, passwordInput) {
  const m = b.memory();
  if (m.connection) {
    const old = m.connection;
    m.connection = null;
    await b.call('es.close', { connection: old }).catch(() => {});
  }
  const c = b.config;
  const r = await b.call('es.connect', { urls: c.urls, auth: c.auth, user: c.user, tls: c.tls, password: passwordInput, secret: c.password });
  m.connection = r.connection;
  return { connection: r.connection, connected: true, info: r.info };
}

export const blocks = [
  {
    type: 'es.connect', version: 1, category: 'db', icon: 'database', label: L('Elasticsearch · Connection (connect)', 'Elasticsearch · Connessione (connect)'),
    description: L('Opens a connection to Elasticsearch or OpenSearch for the other Elasticsearch blocks; it closes with the program',
      'Apre una connessione a Elasticsearch o OpenSearch per gli altri blocchi Elasticsearch; si chiude con il programma'),
    inputs: [
      { name: 'connect', type: 'pulse', label: L('connect', 'connetti') },
      { name: 'close', type: 'pulse', label: L('close', 'chiudi'), hidden: true },
      { name: 'password', type: 'text', label: L('password / API key', 'password / chiave API'), hidden: true, trigger: false },
    ],
    outputs: [
      { name: 'connection', type: 'object', label: L('connection', 'connessione') },
      { name: 'connected', type: 'bool', label: L('connected', 'connesso') },
      { name: 'info', type: 'object', label: L('server info', 'informazioni sul server'), hidden: true },
    ],
    config: [
      { key: 'urls', type: 'text', default: 'https://localhost:9200', label: L('Node addresses (URL, separated by commas)', 'Indirizzi dei nodi (URL, separati da virgole)') },
      { key: 'auth', type: 'select', default: 'basic', label: L('Access', 'Accesso'), options: [
        { value: 'basic', label: L('User and password', 'Utente e password') },
        { value: 'apikey', label: L('API key', 'Chiave API') },
        { value: 'none', label: L('None', 'Nessuno') },
      ] },
      { key: 'user', type: 'text', default: 'elastic', label: L('User', 'Utente') },
      { key: 'password', type: 'secret', default: '', label: L('Password or API key (encoded)', 'Password o chiave API (codificata)') },
      { key: 'tls', type: 'select', default: 'verify', label: L('Certificate (https)', 'Certificato (https)'), options: [
        { value: 'verify', label: L('Checked', 'Controllato') },
        { value: 'on', label: L('Not checked (still encrypted)', 'Non controllato (cifrato comunque)') },
      ] },
      { key: 'atStart', type: 'checkbox', default: true, label: L('Connect at start', 'Connetti all\'avvio') },
    ],
    async start(b) {
      if (b.config.atStart === false) return;
      const out = await connect(b);
      b.send('connection', out.connection);
      b.send('connected', true);
      b.send('info', out.info);
    },
    async run(inputs, b) {
      if (b.trigger === 'close') {
        const m = b.memory();
        const old = m.connection;
        m.connection = null;
        if (old) await b.call('es.close', { connection: old });
        return { connection: null, connected: false };
      }
      return connect(b, inputs.password);
    },
    async stop(b) {
      const m = b.memory();
      if (m.connection) await b.call('es.close', { connection: m.connection }).catch(() => {});
      m.connection = null;
    },
  },
  {
    type: 'es.index', version: 1, category: 'db', icon: 'plus', label: L('Elasticsearch · Index (index)', 'Elasticsearch · Indicizza (index)'),
    description: L('Adds a document to an index, or replaces the one with that id', 'Aggiunge un documento a un indice, o sostituisce quello con quell\'id'),
    inputs: [RUN, CONNECTION, { name: 'document', type: 'object', label: L('document', 'documento'), trigger: false }, ID_IN, INDEX_IN],
    outputs: [
      { name: 'id', type: 'text', label: L('id', 'id') },
      { name: 'result', type: 'text', label: L('result', 'esito'), hidden: true },
    ],
    config: [
      INDEX, REFRESH,
      { key: 'create', type: 'checkbox', default: false, label: L('Only if new (op_type create)', 'Solo se non c\'è già (op_type create)') },
    ],
    async run(inputs, b) {
      const r = await b.call('es.index', {
        connection: inputs.connection, index: pick(inputs.index, b.config.index), id: inputs.id, document: inputs.document,
        refresh: b.config.refresh, create: b.config.create === true,
      });
      return { id: r.id, result: r.result };
    },
  },
  {
    type: 'es.get', version: 1, category: 'db', icon: 'download', label: L('Elasticsearch · Get document (get)', 'Elasticsearch · Leggi documento (get)'),
    description: L('Reads the document with an id', 'Legge il documento con un id'),
    inputs: [RUN, CONNECTION, ID_IN, INDEX_IN],
    outputs: [
      { name: 'document', type: 'object', label: L('document', 'documento') },
      { name: 'found', type: 'bool', label: L('found', 'trovato') },
    ],
    config: [INDEX],
    async run(inputs, b) {
      const r = await b.call('es.get', { connection: inputs.connection, index: pick(inputs.index, b.config.index), id: inputs.id });
      return { document: r.document, found: r.found };
    },
  },
  {
    type: 'es.search', version: 1, category: 'db', icon: 'search', label: L('Elasticsearch · Search (_search)', 'Elasticsearch · Cerca (_search)'),
    description: L('Searches an index with a query (Query DSL, or a whole body with aggs); each added input is a match field = value, in AND',
      'Cerca in un indice con una query (Query DSL, o un corpo intero con aggs); ogni ingresso aggiunto è un match campo = valore, in AND'),
    inputs: [
      RUN, CONNECTION,
      { name: 'query', type: 'any', label: L('query', 'query'), trigger: false, hidden: true },
      { name: 'size', type: 'number', label: L('size', 'quanti'), trigger: false, hidden: true },
      { name: 'from', type: 'number', label: L('from', 'da'), trigger: false, hidden: true },
      INDEX_IN,
    ],
    outputs: [
      { name: 'hits', type: 'list', label: L('documents', 'documenti') },
      { name: 'total', type: 'number', label: L('total', 'totale') },
      { name: 'aggregations', type: 'object', label: L('aggregations', 'aggregazioni'), hidden: true },
      { name: 'truncated', type: 'bool', label: L('truncated', 'troncato'), hidden: true },
    ],
    config: [
      INDEX,
      { key: 'query', type: 'code', default: '{ "match_all": {} }', label: L('Query (JSON)', 'Query (JSON)') },
      { key: 'size', type: 'number', min: 0, max: 1000000, default: 10, label: L('How many (size)', 'Quanti (size)') },
      { key: 'from', type: 'number', min: 0, max: 1000000, default: 0, label: L('From (from)', 'Da (from)') },
      { key: 'sort', type: 'text', default: '', label: L('Sort (e.g. date:desc, name)', 'Ordine (per esempio data:desc, nome)') },
    ],
    grow: MATCH,
    async run(inputs, b) {
      if (storedOnly(b)) return undefined;
      const r = await b.call('es.search', {
        connection: inputs.connection, index: pick(inputs.index, b.config.index), query: pick(inputs.query, b.config.query), match: matchOf(b),
        size: pick(inputs.size, b.config.size), from: pick(inputs.from, b.config.from), sort: b.config.sort,
      });
      return { hits: r.hits, total: r.total, aggregations: r.aggregations, truncated: r.truncated };
    },
  },
  {
    type: 'es.update', version: 1, category: 'db', icon: 'pencil', label: L('Elasticsearch · Update (update)', 'Elasticsearch · Aggiorna (update)'),
    description: L('Changes some fields of the document with an id (partial document); with «create» it adds it when missing (upsert)',
      'Cambia alcuni campi del documento con un id (documento parziale); con «crea» lo aggiunge se non c\'è (upsert)'),
    inputs: [RUN, CONNECTION, { name: 'document', type: 'object', label: L('fields to change', 'campi da cambiare'), trigger: false }, ID_IN, INDEX_IN],
    outputs: [
      { name: 'result', type: 'text', label: L('result', 'esito') },
      { name: 'id', type: 'text', label: L('id', 'id'), hidden: true },
    ],
    config: [INDEX, { key: 'upsert', type: 'checkbox', default: false, label: L('Create it when missing (upsert)', 'Crealo se non c\'è (upsert)') }, REFRESH],
    async run(inputs, b) {
      const r = await b.call('es.update', {
        connection: inputs.connection, index: pick(inputs.index, b.config.index), id: inputs.id, document: inputs.document,
        upsert: b.config.upsert === true, refresh: b.config.refresh,
      });
      return { result: r.result, id: r.id };
    },
  },
  {
    type: 'es.delete', version: 1, category: 'db', icon: 'trash', label: L('Elasticsearch · Delete document (delete)', 'Elasticsearch · Elimina documento (delete)'),
    description: L('Deletes the document with an id', 'Cancella il documento con un id'),
    inputs: [RUN, CONNECTION, ID_IN, INDEX_IN],
    outputs: [
      { name: 'found', type: 'bool', label: L('found', 'trovato') },
      { name: 'result', type: 'text', label: L('result', 'esito'), hidden: true },
    ],
    config: [INDEX, REFRESH],
    async run(inputs, b) {
      const r = await b.call('es.delete', { connection: inputs.connection, index: pick(inputs.index, b.config.index), id: inputs.id, refresh: b.config.refresh });
      return { found: r.found, result: r.result };
    },
  },
  {
    type: 'es.deleteByQuery', version: 1, category: 'db', icon: 'trash', label: L('Elasticsearch · Delete by query (_delete_by_query)', 'Elasticsearch · Elimina per query (_delete_by_query)'),
    description: L('Deletes the documents a query finds; a query that takes them all only with «All the documents»',
      'Cancella i documenti che una query trova; una query che li prende tutti solo con «Tutti i documenti»'),
    inputs: [RUN, CONNECTION, { name: 'query', type: 'any', label: L('query', 'query'), trigger: false, hidden: true }, INDEX_IN],
    outputs: [{ name: 'deleted', type: 'number', label: L('deleted', 'cancellati') }],
    config: [
      INDEX,
      { key: 'query', type: 'code', default: '', label: L('Query (JSON)', 'Query (JSON)') },
      { key: 'all', type: 'checkbox', default: false, label: L('All the documents (also without a query)', 'Tutti i documenti (anche senza query)') },
      { key: 'refresh', type: 'checkbox', default: false, label: L('Visible at once (refresh)', 'Visibile subito (refresh)') },
    ],
    grow: MATCH,
    async run(inputs, b) {
      if (storedOnly(b)) return undefined;
      const r = await b.call('es.deleteByQuery', {
        connection: inputs.connection, index: pick(inputs.index, b.config.index), query: pick(inputs.query, b.config.query), match: matchOf(b),
        all: b.config.all === true, refresh: b.config.refresh === true,
      });
      return { deleted: r.deleted };
    },
  },
  {
    type: 'es.count', version: 1, category: 'db', icon: 'hash', label: L('Elasticsearch · Count (_count)', 'Elasticsearch · Conta (_count)'),
    description: L('How many documents a query finds; each added input is a match field = value, in AND',
      'Quanti documenti trova una query; ogni ingresso aggiunto è un match campo = valore, in AND'),
    inputs: [RUN, CONNECTION, { name: 'query', type: 'any', label: L('query', 'query'), trigger: false, hidden: true }, INDEX_IN],
    outputs: [{ name: 'count', type: 'number', label: L('count', 'quanti') }],
    config: [INDEX, { key: 'query', type: 'code', default: '', label: L('Query (JSON; empty: all)', 'Query (JSON; vuota: tutti)') }],
    grow: MATCH,
    async run(inputs, b) {
      if (storedOnly(b)) return undefined;
      const r = await b.call('es.count', { connection: inputs.connection, index: pick(inputs.index, b.config.index), query: pick(inputs.query, b.config.query), match: matchOf(b) });
      return { count: r.count };
    },
  },
  {
    type: 'es.indices', version: 1, category: 'db', icon: 'list', label: L('Elasticsearch · Indices (_cat/indices)', 'Elasticsearch · Indici (_cat/indices)'),
    description: L('The indices of the cluster, with their documents and size', 'Gli indici del cluster, con i loro documenti e la dimensione'),
    inputs: [RUN, CONNECTION],
    outputs: [
      { name: 'names', type: 'list', label: L('names', 'nomi') },
      { name: 'indices', type: 'list', label: L('indices', 'indici'), hidden: true },
    ],
    async run(inputs, b) {
      const r = await b.call('es.indices', { connection: inputs.connection });
      return { names: r.names, indices: r.indices };
    },
  },
  {
    type: 'es.bulk', version: 1, category: 'db', icon: 'transfer', label: L('Elasticsearch · Bulk index (_bulk)', 'Elasticsearch · Indicizza in blocco (_bulk)'),
    description: L('Indexes a list of documents in one request; the id of each from one of its fields, if you name it',
      'Indicizza una lista di documenti con una sola richiesta; l\'id di ognuno da un suo campo, se lo indichi'),
    inputs: [RUN, CONNECTION, { name: 'documents', type: 'list', label: L('documents', 'documenti'), trigger: false }, INDEX_IN],
    outputs: [
      { name: 'indexed', type: 'number', label: L('indexed', 'indicizzati') },
      { name: 'errors', type: 'number', label: L('errors', 'errori'), hidden: true },
      { name: 'failed', type: 'list', label: L('failed', 'non riusciti'), hidden: true },
    ],
    config: [INDEX, { key: 'idField', type: 'text', default: '', label: L('Field with the id (empty: automatic)', 'Campo con l\'id (vuoto: automatico)') }, REFRESH],
    async run(inputs, b) {
      const r = await b.call('es.bulk', {
        connection: inputs.connection, index: pick(inputs.index, b.config.index), documents: inputs.documents,
        idField: b.config.idField, refresh: b.config.refresh,
      });
      return { indexed: r.indexed, errors: r.errors, failed: r.failed };
    },
  },
];

/**
 * The subcategories of the Blocchi sidebar of Logic Studio IDE: it groups the blocks of a crowded
 * category under them, in `order` (shared by every package of the same category).
 */
for (const b of blocks) b.subcategory = { id: 'elasticsearch', label: L('Elasticsearch', 'Elasticsearch'), order: 4 };
