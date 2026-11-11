/**
 * The Redis blocks of Logic Studio, loaded by the engine in each user's worker (and read in the
 * kernel's main thread for the catalog: nothing here runs at import). The work is done by the
 * kernel (actions redis.*, lib/redis.js): the client, the password and the sockets never come here.
 * Block format: see logicstudio-core/blocks.js.
 *
 * «Connessione Redis» gives a handle on «connessione»: link it to the «connessione» input of the
 * other blocks. Redis keeps text: strings stay strings; with the «JSON» option the values are
 * written as JSON and read back as objects, lists, numbers.
 */

const L = (en, it) => ({ en, it });
/** The database's name before each label: the blocks of all the databases share the category «db». */
const R = (en, it) => L(`Redis · ${en}`, `Redis · ${it}`);

const RUN = { name: 'run', type: 'pulse', label: L('run', 'esegui') };
const CONNECTION = { name: 'connection', type: 'object', label: L('connection', 'connessione'), trigger: false };
const KEY_IN = { name: 'key', type: 'text', label: L('key', 'chiave'), trigger: false };
const KEY = { key: 'key', type: 'text', default: '', label: L('Key', 'Chiave') };
const JSON_OPTION = { key: 'json', type: 'checkbox', default: false, label: L('JSON (write with JSON.stringify, read with JSON.parse)', 'JSON (scrivi con JSON.stringify, leggi con JSON.parse)') };
const SIDE = (fallback) => ({ key: 'side', type: 'select', default: fallback, label: L('Side', 'Lato'), options: [
  { value: 'left', label: L('Start (left: L…)', 'Inizio (sinistra: L…)') },
  { value: 'right', label: L('End (right: R…)', 'Fine (destra: R…)') },
] });

const blank = v => v === undefined || v === null || v === '';
const pick = (input, setting) => (blank(input) ? setting : input);
const keyOf = (inputs, b) => pick(inputs.key, b.config.key);
const json = b => b.config.json === true;
/** An added input only keeps its value: the block runs on «esegui». */
const onlyKept = b => b.added.inputs.some(p => p.id === b.trigger);

// ---- the connection

async function open(b, password) {
  const m = b.memory();
  await shut(b);
  const r = await b.call('redis.connect', { config: b.config, password });
  m.connection = r.connection;
  return { connection: r.connection, connected: true, info: r.info };
}

async function shut(b) {
  const m = b.memory();
  const connection = m.connection;
  m.connection = null;
  if (connection) await b.call('redis.close', { connection }).catch(() => {});
}

// ---- listening (SUBSCRIBE): the kernel keeps the subscription, the block drains it

async function unlisten(b) {
  const m = b.memory();
  const { sub, connection } = m;
  m.token = null;
  m.sub = null;
  if (sub) await b.call('redis.unsubscribe', { connection, sub }).catch(() => {});
}

function poll(b, m, token, connection, sub) {
  const alive = () => b.memory() === m && m.token === token && !b.signal.aborted;
  const step = async () => {
    if (!alive()) return;
    const r = await b.call('redis.next', { connection, sub, waitMs: 20_000 });
    if (!alive()) return;
    if (r.dropped) b.send('dropped', r.dropped);
    for (const msg of r.messages) {
      b.send('channel', msg.channel);
      if (msg.pattern !== null) b.send('pattern', msg.pattern);
      b.send('message', msg.message);
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
    type: 'redis.connect', version: 1, category: 'db', icon: 'database', label: R('Connection (connect)', 'Connessione (connect)'),
    description: L('Connects to a Redis server; link «connection» to the other Redis blocks', 'Si collega a un server Redis; collega «connessione» agli altri blocchi Redis'),
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
      { key: 'host', type: 'text', default: '', label: L('Server', 'Server') },
      { key: 'port', type: 'number', default: 6379, min: 1, max: 65535, step: 1, label: L('Port', 'Porta') },
      { key: 'db', type: 'number', default: 0, min: 0, max: 10000, step: 1, label: L('Database number (SELECT)', 'Numero del database (SELECT)') },
      { key: 'user', type: 'text', default: '', label: L('User (ACL, empty = default)', 'Utente (ACL, vuoto = default)') },
      { key: 'password', type: 'secret', default: '', label: L('Password', 'Password') },
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
    type: 'redis.get', version: 1, category: 'db', icon: 'download', label: R('Get (GET)', 'Leggi (GET)'),
    description: L('The value of a key (empty when there is none)', 'Il valore di una chiave (vuoto se non c\'è)'),
    inputs: [RUN, CONNECTION, KEY_IN],
    outputs: [
      { name: 'value', type: 'any', label: L('value', 'valore') },
      { name: 'exists', type: 'bool', label: L('exists', 'esiste'), hidden: true },
    ],
    config: [KEY, JSON_OPTION],
    async run(inputs, b) {
      const r = await b.call('redis.get', { connection: inputs.connection, key: keyOf(inputs, b), json: json(b) });
      return { value: r.value, exists: r.exists };
    },
  },

  {
    type: 'redis.set', version: 1, category: 'db', icon: 'pencil', label: R('Set (SET)', 'Scrivi (SET)'),
    description: L('Writes the value of a key, with an expiry if you want', 'Scrive il valore di una chiave, con una scadenza se vuoi'),
    inputs: [RUN, CONNECTION, KEY_IN, { name: 'value', type: 'any', label: L('value', 'valore'), trigger: false },
      { name: 'seconds', type: 'number', label: L('expires in (s)', 'scade tra (s)'), trigger: false, hidden: true }],
    outputs: [{ name: 'ok', type: 'bool', label: L('written', 'scritto') }],
    config: [
      KEY,
      { key: 'seconds', type: 'number', default: 0, min: 0, step: 1, label: L('Expires in seconds (EX, 0 = never)', 'Scade tra secondi (EX, 0 = mai)') },
      { key: 'mode', type: 'select', default: 'always', label: L('When', 'Quando'), options: [
        { value: 'always', label: L('Always', 'Sempre') },
        { value: 'nx', label: L('Only if the key does not exist (NX)', 'Solo se la chiave non esiste (NX)') },
        { value: 'xx', label: L('Only if the key exists (XX)', 'Solo se la chiave esiste (XX)') },
      ] },
      JSON_OPTION,
    ],
    async run(inputs, b) {
      const r = await b.call('redis.set', {
        connection: inputs.connection, key: keyOf(inputs, b), value: inputs.value ?? null, json: json(b),
        seconds: pick(inputs.seconds, b.config.seconds), mode: b.config.mode,
      });
      return { ok: r.ok };
    },
  },

  {
    type: 'redis.del', version: 1, category: 'db', icon: 'trash', label: R('Delete (DEL)', 'Elimina (DEL)'),
    description: L('Deletes a key, or each key of a list', 'Elimina una chiave, o ogni chiave di una lista'),
    inputs: [RUN, CONNECTION, { name: 'key', type: 'any', label: L('key or list', 'chiave o lista'), trigger: false }],
    outputs: [{ name: 'deleted', type: 'number', label: L('deleted', 'eliminate') }],
    config: [KEY],
    async run(inputs, b) {
      const r = await b.call('redis.del', { connection: inputs.connection, keys: keyOf(inputs, b) });
      return { deleted: r.deleted };
    },
  },

  {
    type: 'redis.exists', version: 1, category: 'db', icon: 'search', label: R('Exists (EXISTS)', 'Esiste (EXISTS)'),
    description: L('Whether a key exists (with a list: whether they all exist, and how many do)', 'Se una chiave esiste (con una lista: se esistono tutte, e quante)'),
    inputs: [RUN, CONNECTION, { name: 'key', type: 'any', label: L('key or list', 'chiave o lista'), trigger: false }],
    outputs: [
      { name: 'exists', type: 'bool', label: L('exists', 'esiste') },
      { name: 'count', type: 'number', label: L('how many', 'quante'), hidden: true },
    ],
    config: [KEY],
    async run(inputs, b) {
      const r = await b.call('redis.exists', { connection: inputs.connection, keys: keyOf(inputs, b) });
      return { exists: r.exists, count: r.count };
    },
  },

  {
    type: 'redis.incr', version: 1, category: 'db', icon: 'plus', label: R('Increment (INCRBY)', 'Incrementa (INCRBY)'),
    description: L('Adds the step to the number of a key (a missing key counts as 0); a step with decimals uses INCRBYFLOAT', 'Aggiunge il passo al numero di una chiave (una chiave che non c\'è vale 0); un passo con la virgola usa INCRBYFLOAT'),
    inputs: [RUN, CONNECTION, KEY_IN, { name: 'step', type: 'number', label: L('step', 'passo'), trigger: false }],
    outputs: [{ name: 'value', type: 'number', label: L('value', 'valore') }],
    config: [KEY, { key: 'step', type: 'number', default: 1, label: L('Step (negative to decrease)', 'Passo (negativo per diminuire)') }],
    async run(inputs, b) {
      const r = await b.call('redis.incr', { connection: inputs.connection, key: keyOf(inputs, b), step: pick(inputs.step, b.config.step) });
      return { value: r.value };
    },
  },

  {
    type: 'redis.expire', version: 1, category: 'db', icon: 'clock', label: R('Expiry (EXPIRE · TTL)', 'Scadenza (EXPIRE · TTL)'),
    description: L('Reads, sets or removes the expiry of a key; «seconds left» is -1 without expiry, -2 when the key does not exist', 'Legge, imposta o toglie la scadenza di una chiave; «secondi rimasti» è -1 senza scadenza, -2 se la chiave non esiste'),
    inputs: [RUN, CONNECTION, KEY_IN, { name: 'seconds', type: 'number', label: L('seconds', 'secondi'), trigger: false }],
    outputs: [
      { name: 'ttl', type: 'number', label: L('seconds left', 'secondi rimasti') },
      { name: 'ok', type: 'bool', label: L('done', 'fatto'), hidden: true },
    ],
    config: [
      KEY,
      { key: 'op', type: 'select', default: 'ttl', label: L('Operation', 'Operazione'), options: [
        { value: 'ttl', label: L('Read it (TTL)', 'Leggila (TTL)') },
        { value: 'expire', label: L('Set it (EXPIRE)', 'Impostala (EXPIRE)') },
        { value: 'persist', label: L('Remove it (PERSIST)', 'Toglila (PERSIST)') },
      ] },
      { key: 'seconds', type: 'number', default: 60, min: 1, step: 1, label: L('Seconds (for EXPIRE)', 'Secondi (per EXPIRE)') },
    ],
    async run(inputs, b) {
      const r = await b.call('redis.expire', {
        connection: inputs.connection, key: keyOf(inputs, b), op: b.config.op, seconds: pick(inputs.seconds, b.config.seconds),
      });
      return { ttl: r.ttl, ok: r.ok };
    },
  },

  {
    type: 'redis.hget', version: 1, category: 'db', icon: 'download', label: R('Hash: get (HGET · HGETALL)', 'Hash: leggi (HGET · HGETALL)'),
    description: L('A field of a hash, or the whole hash as an object when the field is empty', 'Un campo di un hash, o tutto l\'hash come oggetto se il campo è vuoto'),
    inputs: [RUN, CONNECTION, KEY_IN, { name: 'field', type: 'text', label: L('field', 'campo'), trigger: false }],
    outputs: [
      { name: 'value', type: 'any', label: L('value', 'valore') },
      { name: 'exists', type: 'bool', label: L('exists', 'esiste'), hidden: true },
      { name: 'truncated', type: 'bool', label: L('truncated', 'troncato'), hidden: true },
    ],
    config: [KEY, { key: 'field', type: 'text', default: '', label: L('Field (empty = all of them, HGETALL)', 'Campo (vuoto = tutti, HGETALL)') }, JSON_OPTION],
    async run(inputs, b) {
      const r = await b.call('redis.hget', { connection: inputs.connection, key: keyOf(inputs, b), field: pick(inputs.field, b.config.field), json: json(b) });
      return { value: r.value, exists: r.exists, truncated: r.truncated };
    },
  },

  {
    type: 'redis.hset', version: 1, category: 'db', icon: 'pencil', label: R('Hash: set fields (HSET)', 'Hash: scrivi campi (HSET)'),
    description: L('Writes the fields of an object in a hash; each added input is a field, by its name', 'Scrive i campi di un oggetto in un hash; ogni ingresso aggiunto è un campo, con il suo nome'),
    inputs: [RUN, CONNECTION, KEY_IN, { name: 'fields', type: 'object', label: L('fields', 'campi'), trigger: false }],
    outputs: [{ name: 'added', type: 'number', label: L('new fields', 'campi nuovi') }],
    config: [KEY, JSON_OPTION],
    grow: { inputs: { type: 'any', max: 16, name: 'user', label: L('field', 'campo') } },
    async run(inputs, b) {
      if (onlyKept(b)) return undefined;
      const fields = { ...(inputs.fields && typeof inputs.fields === 'object' && !Array.isArray(inputs.fields) ? inputs.fields : {}) };
      for (const p of b.added.inputs) if (p.value !== undefined) fields[p.name] = p.value;
      const r = await b.call('redis.hset', { connection: inputs.connection, key: keyOf(inputs, b), fields, json: json(b) });
      return { added: r.added };
    },
  },

  {
    type: 'redis.push', version: 1, category: 'db', icon: 'plus', label: R('List: add (LPUSH · RPUSH)', 'Lista: aggiungi (LPUSH · RPUSH)'),
    description: L('Adds a value at the start or at the end of a list', 'Aggiunge un valore all\'inizio o alla fine di una lista'),
    inputs: [RUN, CONNECTION, KEY_IN, { name: 'value', type: 'any', label: L('value', 'valore'), trigger: false }],
    outputs: [{ name: 'length', type: 'number', label: L('length', 'lunghezza') }],
    config: [
      KEY, SIDE('right'),
      { key: 'each', type: 'checkbox', default: false, label: L('A list adds each of its items', 'Una lista aggiunge ognuno dei suoi elementi') },
      JSON_OPTION,
    ],
    async run(inputs, b) {
      const r = await b.call('redis.push', {
        connection: inputs.connection, key: keyOf(inputs, b), value: inputs.value ?? null,
        side: b.config.side, each: b.config.each === true, json: json(b),
      });
      return { length: r.length };
    },
  },

  {
    type: 'redis.pop', version: 1, category: 'db', icon: 'transfer', label: R('List: take (LPOP · RPOP · BLPOP)', 'Lista: togli (LPOP · RPOP · BLPOP)'),
    description: L('Takes a value from the start or the end of a list; it can wait for one (at most 25 s)', 'Toglie un valore dall\'inizio o dalla fine di una lista; può aspettarne uno (al massimo 25 s)'),
    inputs: [RUN, CONNECTION, KEY_IN],
    outputs: [
      { name: 'value', type: 'any', label: L('value', 'valore') },
      { name: 'values', type: 'list', label: L('values', 'valori'), hidden: true },
      { name: 'empty', type: 'bool', label: L('empty', 'vuota'), hidden: true },
    ],
    config: [
      KEY, SIDE('left'),
      { key: 'count', type: 'number', default: 0, min: 0, step: 1, label: L('How many (0 = one)', 'Quanti (0 = uno)') },
      { key: 'block', type: 'checkbox', default: false, label: L('Wait for a value when the list is empty (BLPOP · BRPOP)', 'Aspetta un valore se la lista è vuota (BLPOP · BRPOP)') },
      { key: 'timeout', type: 'number', default: 5, min: 0.1, max: 25, label: L('Wait at most (seconds, up to 25)', 'Aspetta al massimo (secondi, fino a 25)') },
      JSON_OPTION,
    ],
    async run(inputs, b) {
      const count = Number(b.config.count) > 0 ? Number(b.config.count) : null;
      const r = await b.call('redis.pop', {
        connection: inputs.connection, key: keyOf(inputs, b), side: b.config.side, count,
        block: b.config.block === true, timeout: b.config.timeout, json: json(b),
      });
      return { value: r.value, values: r.values, empty: r.empty };
    },
  },

  {
    type: 'redis.range', version: 1, category: 'db', icon: 'list', label: R('List: range (LRANGE)', 'Lista: intervallo (LRANGE)'),
    description: L('The values of a list from «start» to «end» (0 is the first, -1 the last)', 'I valori di una lista da «inizio» a «fine» (0 è il primo, -1 l\'ultimo)'),
    inputs: [RUN, CONNECTION, KEY_IN,
      { name: 'start', type: 'number', label: L('start', 'inizio'), trigger: false, hidden: true },
      { name: 'stop', type: 'number', label: L('end', 'fine'), trigger: false, hidden: true }],
    outputs: [
      { name: 'values', type: 'list', label: L('values', 'valori') },
      { name: 'length', type: 'number', label: L('list length', 'lunghezza della lista'), hidden: true },
      { name: 'truncated', type: 'bool', label: L('truncated', 'troncato'), hidden: true },
    ],
    config: [
      KEY,
      { key: 'start', type: 'number', default: 0, step: 1, label: L('Start', 'Inizio') },
      { key: 'stop', type: 'number', default: -1, step: 1, label: L('End (-1 = the last)', 'Fine (-1 = l\'ultimo)') },
      JSON_OPTION,
    ],
    async run(inputs, b) {
      const r = await b.call('redis.range', {
        connection: inputs.connection, key: keyOf(inputs, b),
        start: pick(inputs.start, b.config.start), stop: pick(inputs.stop, b.config.stop), json: json(b),
      });
      return { values: r.values, length: r.length, truncated: r.truncated };
    },
  },

  {
    type: 'redis.publish', version: 1, category: 'db', icon: 'bell', label: R('Publish (PUBLISH)', 'Pubblica (PUBLISH)'),
    description: L('Sends a message on a channel to whoever is subscribed', 'Manda un messaggio su un canale a chi è iscritto'),
    inputs: [RUN, CONNECTION, { name: 'channel', type: 'text', label: L('channel', 'canale'), trigger: false },
      { name: 'message', type: 'any', label: L('message', 'messaggio'), trigger: false }],
    outputs: [{ name: 'receivers', type: 'number', label: L('received by', 'ricevuto da') }],
    config: [{ key: 'channel', type: 'text', default: '', label: L('Channel', 'Canale') }, JSON_OPTION],
    async run(inputs, b) {
      const r = await b.call('redis.publish', {
        connection: inputs.connection, channel: pick(inputs.channel, b.config.channel), message: inputs.message ?? null, json: json(b),
      });
      return { receivers: r.receivers };
    },
  },

  {
    type: 'redis.subscribe', version: 1, category: 'db', icon: 'bolt', label: R('Subscribe (SUBSCRIBE · PSUBSCRIBE)', 'Iscriviti (SUBSCRIBE · PSUBSCRIBE)'),
    description: L('Each message published on the channels, as it arrives (a connection of its own)', 'Ogni messaggio pubblicato sui canali, appena arriva (con una connessione sua)'),
    inputs: [
      { name: 'listen', type: 'pulse', label: L('listen', 'ascolta') },
      { name: 'stop', type: 'pulse', label: L('stop', 'smetti'), hidden: true },
      { name: 'connection', type: 'object', label: L('connection', 'connessione') },
      { name: 'channels', type: 'any', label: L('channels', 'canali'), trigger: false, hidden: true },
    ],
    outputs: [
      { name: 'message', type: 'any', label: L('message', 'messaggio') },
      { name: 'channel', type: 'text', label: L('channel', 'canale') },
      { name: 'pattern', type: 'text', label: L('pattern', 'modello'), hidden: true },
      { name: 'listening', type: 'bool', label: L('listening', 'in ascolto'), hidden: true },
      { name: 'dropped', type: 'number', label: L('lost', 'persi'), hidden: true },
    ],
    config: [
      { key: 'channels', type: 'text', default: '', label: L('Channels (separated by commas)', 'Canali (separati da virgole)') },
      { key: 'pattern', type: 'checkbox', default: false, label: L('Patterns, such as news.* (PSUBSCRIBE)', 'Modelli, come notizie.* (PSUBSCRIBE)') },
      JSON_OPTION,
      { key: 'auto', type: 'checkbox', default: true, label: L('Listen as soon as the connection arrives', 'Ascolta appena arriva la connessione') },
    ],
    async run(inputs, b) {
      if (b.trigger === 'connection' && (b.config.auto === false || blank(inputs.connection))) return undefined;
      await unlisten(b);
      if (b.trigger === 'stop') return { listening: false };
      const m = b.memory();
      const token = {};
      m.token = token;
      const r = await b.call('redis.subscribe', {
        connection: inputs.connection, channels: pick(inputs.channels, b.config.channels), pattern: b.config.pattern === true, json: json(b),
      });
      if (m.token !== token || b.memory() !== m) {   // stopped meanwhile
        await b.call('redis.unsubscribe', { connection: inputs.connection, sub: r.sub }).catch(() => {});
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
    type: 'redis.scan', version: 1, category: 'db', icon: 'search', label: R('Find keys (SCAN)', 'Cerca chiavi (SCAN)'),
    description: L('The keys that match a pattern (such as user:*), at most the module\'s limit; never KEYS', 'Le chiavi che corrispondono a un modello (come utente:*), al massimo il limite del modulo; mai KEYS'),
    inputs: [RUN, CONNECTION, { name: 'match', type: 'text', label: L('pattern', 'modello'), trigger: false }],
    outputs: [
      { name: 'keys', type: 'list', label: L('keys', 'chiavi') },
      { name: 'truncated', type: 'bool', label: L('truncated', 'troncato'), hidden: true },
    ],
    config: [
      { key: 'match', type: 'text', default: '*', label: L('Pattern (MATCH, * = any text)', 'Modello (MATCH, * = qualsiasi testo)') },
      { key: 'type', type: 'select', default: 'any', label: L('Type', 'Tipo'), options: [
        { value: 'any', label: L('Any', 'Qualsiasi') }, { value: 'string', label: L('Text (string)', 'Testo (string)') },
        { value: 'hash', label: L('Hash', 'Hash') }, { value: 'list', label: L('List', 'Lista') }, { value: 'set', label: L('Set', 'Insieme (set)') },
        { value: 'zset', label: L('Sorted set (zset)', 'Insieme ordinato (zset)') }, { value: 'stream', label: L('Stream', 'Stream') },
      ] },
      { key: 'max', type: 'number', default: 0, min: 0, step: 1, label: L('At most (0 = the module\'s limit)', 'Al massimo (0 = il limite del modulo)') },
    ],
    async run(inputs, b) {
      const r = await b.call('redis.scan', {
        connection: inputs.connection, match: pick(inputs.match, b.config.match), type: b.config.type,
        max: Number(b.config.max) > 0 ? Number(b.config.max) : null,
      });
      return { keys: r.keys, truncated: r.truncated };
    },
  },

  {
    type: 'redis.command', version: 1, category: 'db', icon: 'terminal', label: R('Command (call)', 'Comando (call)'),
    description: L('Any Redis command as a list, such as ["ZADD", "ranking", 10, "anna"]; the administration commands are refused', 'Qualsiasi comando Redis come lista, per esempio ["ZADD", "classifica", 10, "anna"]; i comandi di amministrazione sono rifiutati'),
    inputs: [RUN, CONNECTION, { name: 'command', type: 'list', label: L('command', 'comando'), trigger: false }],
    outputs: [{ name: 'result', type: 'any', label: L('result', 'risultato') }],
    config: [{ key: 'command', type: 'text', default: '', label: L('Command (JSON list, or words: ZADD ranking 10 anna)', 'Comando (lista JSON, o parole: ZADD classifica 10 anna)') }],
    async run(inputs, b) {
      const r = await b.call('redis.command', { connection: inputs.connection, command: pick(inputs.command, b.config.command) });
      return { result: r.result };
    },
  },
];

/**
 * The subcategories of the Blocchi sidebar of Logic Studio IDE: it groups the blocks of a crowded
 * category under them, in `order` (shared by every package of the same category).
 */
for (const b of blocks) b.subcategory = { id: 'redis', label: L('Redis', 'Redis'), order: 2 };
