/**
 * The InfluxDB blocks of Logic Studio, loaded by the engine in each user's worker (and read in the
 * kernel's main thread for the catalog: nothing here runs at import). The work is done by the
 * kernel (actions influx.*, lib/influx.js): the worker never holds the token. Block format: see
 * logicstudio-core/blocks.js.
 *
 * Connessione InfluxDB gives a «connessione» to link to the other blocks; it closes with the
 * program. A measurement every N seconds is Ogni… (core.every) linked to «esegui» of Scrivi punto.
 */

const L = (en, it) => ({ en, it });
const text = v => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const given = v => v !== undefined && v !== null && v !== '';
const pick = (input, config) => (given(input) ? input : config);
const storedOnly = b => b.added.inputs.some(p => p.id === b.trigger);   // an added input only keeps its value

/** An object from an input or a setting: an object as it is, JSON text parsed, nothing → {}. */
function objectOf(v, what) {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  const s = text(v).trim();
  if (!s) return {};
  let value;
  try { value = JSON.parse(s); } catch { throw new Error(`${what} non validi: scrivi un oggetto JSON, per esempio {"host": "server1"}`); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${what} non validi: serve un oggetto JSON { "nome": valore }`);
  return value;
}

const RUN = { name: 'run', type: 'pulse', label: L('run', 'esegui') };
const CONNECTION = { name: 'connection', type: 'object', label: L('connection', 'connessione'), trigger: false };
const BUCKET = { key: 'bucket', type: 'text', default: '', label: L('Bucket (empty: the connection\'s)', 'Bucket (vuoto: quello della connessione)') };

async function connect(b, passwordInput) {
  const m = b.memory();
  if (m.connection) {
    const old = m.connection;
    m.connection = null;
    await b.call('influx.close', { connection: old }).catch(() => {});
  }
  const c = b.config;
  const r = await b.call('influx.connect', {
    url: c.url, org: c.org, bucket: c.bucket, auth: c.auth, user: c.user, tls: c.tls,
    password: passwordInput, secret: c.password,
  });
  m.connection = r.connection;
  return { connection: r.connection, connected: true, info: r.info };
}

export const blocks = [
  {
    type: 'influx.connect', version: 1, category: 'db', icon: 'database', label: L('InfluxDB · Connection (connect)', 'InfluxDB · Connessione (connect)'),
    description: L('Opens a connection to InfluxDB (2.x, 3.x, 1.8+) for the other InfluxDB blocks; it closes with the program',
      'Apre una connessione a InfluxDB (2.x, 3.x, 1.8+) per gli altri blocchi InfluxDB; si chiude con il programma'),
    inputs: [
      { name: 'connect', type: 'pulse', label: L('connect', 'connetti') },
      { name: 'close', type: 'pulse', label: L('close', 'chiudi'), hidden: true },
      { name: 'password', type: 'text', label: L('token / password', 'token / password'), hidden: true, trigger: false },
    ],
    outputs: [
      { name: 'connection', type: 'object', label: L('connection', 'connessione') },
      { name: 'connected', type: 'bool', label: L('connected', 'connesso') },
      { name: 'info', type: 'object', label: L('server info', 'informazioni sul server'), hidden: true },
    ],
    config: [
      { key: 'url', type: 'text', default: 'http://localhost:8086', label: L('Server address (URL)', 'Indirizzo del server (URL)') },
      { key: 'org', type: 'text', default: '', label: L('Organization (2.x)', 'Organizzazione (2.x)') },
      { key: 'bucket', type: 'text', default: '', label: L('Bucket (or database; 1.x: database/retention)', 'Bucket (o database; 1.x: database/retention)') },
      { key: 'auth', type: 'select', default: 'token', label: L('Access', 'Accesso'), options: [
        { value: 'token', label: L('Token (2.x, 3.x)', 'Token (2.x, 3.x)') },
        { value: 'password', label: L('User and password (1.x)', 'Utente e password (1.x)') },
        { value: 'none', label: L('None', 'Nessuno') },
      ] },
      { key: 'user', type: 'text', default: '', label: L('User (1.x)', 'Utente (1.x)') },
      { key: 'password', type: 'secret', default: '', label: L('Token (password for 1.x)', 'Token (password per 1.x)') },
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
        if (old) await b.call('influx.close', { connection: old });
        return { connection: null, connected: false };
      }
      return connect(b, inputs.password);
    },
    async stop(b) {
      const m = b.memory();
      if (m.connection) await b.call('influx.close', { connection: m.connection }).catch(() => {});
      m.connection = null;
    },
  },
  {
    type: 'influx.write', version: 1, category: 'db', icon: 'plus', label: L('InfluxDB · Write point (write)', 'InfluxDB · Scrivi punto (write)'),
    description: L('Writes a point (measurement, tags, fields, time) or a list of points; each added input is a tag with its name',
      'Scrive un punto (misura, tag, campi, tempo) o una lista di punti; ogni ingresso aggiunto è un tag con il suo nome'),
    inputs: [
      RUN, CONNECTION,
      { name: 'measurement', type: 'text', label: L('measurement', 'misura'), trigger: false },
      { name: 'fields', type: 'any', label: L('fields', 'campi'), trigger: false },
      { name: 'tags', type: 'object', label: L('tags', 'tag'), trigger: false, hidden: true },
      { name: 'time', type: 'any', label: L('time', 'tempo'), trigger: false, hidden: true },
      { name: 'points', type: 'list', label: L('points (list)', 'punti (lista)'), trigger: false, hidden: true },
    ],
    outputs: [
      { name: 'done', type: 'pulse', label: L('done', 'fatto') },
      { name: 'written', type: 'number', label: L('points written', 'punti scritti'), hidden: true },
    ],
    config: [
      { key: 'measurement', type: 'text', default: '', label: L('Measurement', 'Misura (measurement)') },
      { key: 'tags', type: 'json', default: {}, label: L('Tags (JSON)', 'Tag (JSON)') },
      BUCKET,
      { key: 'precision', type: 'select', default: 'ms', label: L('Time precision', 'Precisione del tempo'), options: [
        { value: 'ns', label: L('Nanoseconds', 'Nanosecondi') }, { value: 'us', label: L('Microseconds', 'Microsecondi') },
        { value: 'ms', label: L('Milliseconds', 'Millisecondi') }, { value: 's', label: L('Seconds', 'Secondi') },
      ] },
      { key: 'integers', type: 'checkbox', default: false, label: L('Whole numbers as integers (i)', 'Numeri interi come integer (i)') },
    ],
    grow: { inputs: { type: 'any', max: 16, name: 'user', label: L('tag', 'tag') } },
    async run(inputs, b) {
      if (storedOnly(b)) return undefined;
      const tags = { ...objectOf(b.config.tags, 'Tag'), ...objectOf(inputs.tags, 'Tag') };
      for (const p of b.added.inputs) if (given(p.value)) tags[p.name] = p.value;
      const measurement = text(pick(inputs.measurement, b.config.measurement)).trim();
      let points;
      if (Array.isArray(inputs.points) && inputs.points.length) {
        points = inputs.points.map(p => {
          const o = p && typeof p === 'object' && !Array.isArray(p) ? p : { fields: p };
          return { measurement: given(o.measurement) ? o.measurement : measurement, tags: { ...tags, ...(o.tags ?? {}) }, fields: o.fields, time: o.time };
        });
      } else {
        points = [{ measurement, tags, fields: inputs.fields, time: inputs.time }];
      }
      const r = await b.call('influx.write', {
        connection: inputs.connection, points, bucket: b.config.bucket, precision: b.config.precision, integers: b.config.integers === true,
      });
      return { done: true, written: r.written };
    },
  },
  {
    type: 'influx.query', version: 1, category: 'db', icon: 'search', label: L('InfluxDB · Query (Flux · InfluxQL · SQL)', 'InfluxDB · Query (Flux · InfluxQL · SQL)'),
    description: L('Runs a query in Flux (2.x), InfluxQL or SQL (3.x) and gives its rows; each added input is a parameter (params.name in Flux, $name in InfluxQL and SQL)',
      'Esegue una query in Flux (2.x), InfluxQL o SQL (3.x) e ne dà le righe; ogni ingresso aggiunto è un parametro (params.nome in Flux, $nome in InfluxQL e SQL)'),
    inputs: [
      RUN, CONNECTION,
      { name: 'query', type: 'text', label: L('query', 'query'), trigger: false, hidden: true },
    ],
    outputs: [
      { name: 'rows', type: 'list', label: L('rows', 'righe') },
      { name: 'count', type: 'number', label: L('count', 'quante'), hidden: true },
      { name: 'truncated', type: 'bool', label: L('truncated', 'troncato'), hidden: true },
    ],
    config: [
      { key: 'language', type: 'select', default: 'flux', label: L('Language', 'Linguaggio'), options: [
        { value: 'flux', label: L('Flux (2.x)', 'Flux (2.x)') },
        { value: 'influxql', label: L('InfluxQL', 'InfluxQL') },
        { value: 'sql', label: L('SQL (3.x)', 'SQL (3.x)') },
      ] },
      { key: 'query', type: 'code', default: 'from(bucket: "my-bucket")\n  |> range(start: -1h)', label: L('Query', 'Query') },
      { key: 'bucket', type: 'text', default: '', label: L('Database for InfluxQL and SQL (empty: the connection\'s bucket)', 'Database per InfluxQL e SQL (vuoto: il bucket della connessione)') },
    ],
    grow: { inputs: { type: 'any', max: 16, name: 'user', label: L('parameter', 'parametro') } },
    async run(inputs, b) {
      if (storedOnly(b)) return undefined;
      const params = {};
      for (const p of b.added.inputs) if (p.value !== undefined && p.value !== null) params[p.name] = p.value;
      const r = await b.call('influx.query', {
        connection: inputs.connection, language: b.config.language, query: text(pick(inputs.query, b.config.query)),
        bucket: b.config.bucket, params,
      });
      return { rows: r.rows, count: r.count, truncated: r.truncated };
    },
  },
  {
    type: 'influx.buckets', version: 1, category: 'db', icon: 'list', label: L('InfluxDB · Buckets (list)', 'InfluxDB · Bucket (elenco)'),
    description: L('The buckets (databases on 1.x and 3.x) the token can see', 'I bucket (i database con 1.x e 3.x) che il token può vedere'),
    inputs: [RUN, CONNECTION],
    outputs: [
      { name: 'names', type: 'list', label: L('names', 'nomi') },
      { name: 'buckets', type: 'list', label: L('buckets', 'bucket'), hidden: true },
    ],
    async run(inputs, b) {
      const r = await b.call('influx.buckets', { connection: inputs.connection });
      return { names: r.names, buckets: r.buckets };
    },
  },
  {
    type: 'influx.delete', version: 1, category: 'db', icon: 'trash', label: L('InfluxDB · Delete data (delete)', 'InfluxDB · Elimina dati (delete)'),
    description: L('Deletes the points of a time range that match a filter (predicate, e.g. _measurement="cpu" AND host="a"); 2.x only',
      'Cancella i punti di un intervallo di tempo che rispettano un filtro (predicate, per esempio _measurement="cpu" AND host="a"); solo 2.x'),
    inputs: [
      RUN, CONNECTION,
      { name: 'start', type: 'any', label: L('start', 'inizio'), trigger: false },
      { name: 'stop', type: 'any', label: L('stop', 'fine'), trigger: false },
      { name: 'predicate', type: 'text', label: L('filter (predicate)', 'filtro (predicate)'), trigger: false, hidden: true },
    ],
    outputs: [{ name: 'done', type: 'pulse', label: L('done', 'fatto') }],
    config: [
      { key: 'predicate', type: 'code', default: '', label: L('Filter (predicate)', 'Filtro (predicate)') },
      { key: 'start', type: 'text', default: '', label: L('Start (ISO date; empty: 1970)', 'Inizio (data ISO; vuoto: 1970)') },
      { key: 'stop', type: 'text', default: '', label: L('Stop (ISO date; empty: now)', 'Fine (data ISO; vuoto: adesso)') },
      BUCKET,
      { key: 'all', type: 'checkbox', default: false, label: L('All the data of the range (without a filter)', 'Tutti i dati dell\'intervallo (senza filtro)') },
    ],
    async run(inputs, b) {
      await b.call('influx.delete', {
        connection: inputs.connection, bucket: b.config.bucket,
        start: pick(inputs.start, b.config.start), stop: pick(inputs.stop, b.config.stop),
        predicate: text(pick(inputs.predicate, b.config.predicate)), all: b.config.all === true,
      });
      return { done: true };
    },
  },
];

/**
 * The subcategories of the Blocchi sidebar of Logic Studio IDE: it groups the blocks of a crowded
 * category under them, in `order` (shared by every package of the same category).
 */
for (const b of blocks) b.subcategory = { id: 'influxdb', label: L('InfluxDB', 'InfluxDB'), order: 3 };
