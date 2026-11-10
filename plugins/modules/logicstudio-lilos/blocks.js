/**
 * The lilOS blocks of Logic Studio, loaded by the engine in each user's worker (and read in the
 * kernel's main thread for the catalog: nothing here runs at import). They touch nothing of lilOS
 * themselves: each asks the kernel with b.call('lilos.…', args), an action of this package
 * (lib/actions.js) made for the program's owner. Block format: see logicstudio-core/blocks.js.
 *
 * Paths are the user's: '~/…' or '/home/<user>/…'. A path input, when linked, takes the place of
 * the path in the settings.
 */

const L = (en, it) => ({ en, it });
const text = v => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const PULSE = true;

/** True when the block was started by one of the ports the user added (they only keep their value). */
const byAdded = b => b.added.inputs.some(p => p.id === b.trigger);
const pathOf = (inputs, b) => {
  const p = inputs.path === undefined || inputs.path === null || inputs.path === '' ? b.config.path : inputs.path;
  return text(p).trim();
};

const pathField = (fallback = '~/') => ({ key: 'path', type: 'text', default: fallback, label: L('Path (~/… or /home/…)', 'Percorso (~/… o /home/…)') });
const pathInput = { name: 'path', type: 'text', label: L('path', 'percorso'), trigger: false };
const modeField = { key: 'mode', type: 'select', default: 'text', options: [{ value: 'text', label: L('Text', 'Testo') }, { value: 'json', label: L('JSON', 'JSON') }], label: L('Format', 'Formato') };

export const blocks = [
  {
    type: 'lilos.notify', version: 1, category: 'lilos', icon: 'bell', label: L('Notification', 'Notifica'),
    description: L('Sends a lilOS notification to you, from the program', 'Ti manda una notifica di lilOS, a nome del programma'),
    inputs: [
      { name: 'send', type: 'pulse', label: L('send', 'invia') },
      { name: 'title', type: 'text', label: L('title', 'titolo'), trigger: false },
      { name: 'text', type: 'text', label: L('text', 'testo'), trigger: false },
    ],
    outputs: [{ name: 'sent', type: 'pulse', label: L('sent', 'inviata') }],
    config: [
      { key: 'title', type: 'text', default: '', label: L('Title', 'Titolo') },
      { key: 'text', type: 'text', default: '', label: L('Text ({name} = an added input)', 'Testo ({nome} = un ingresso aggiunto)') },
      { key: 'level', type: 'select', default: 'info', label: L('Kind', 'Tipo'), options: [
        { value: 'info', label: L('Information', 'Informazione') }, { value: 'success', label: L('Success', 'Riuscita') },
        { value: 'warning', label: L('Warning', 'Avviso') }, { value: 'error', label: L('Error', 'Errore') },
      ] },
    ],
    grow: { inputs: { type: 'any', max: 8, name: 'user', label: L('placeholder', 'segnaposto') } },
    async run(inputs, b) {
      if (byAdded(b)) return undefined;
      const byName = new Map(b.added.inputs.map(p => [p.name, p.value]));
      const fill = s => text(s).replace(/\{([^{}]+)\}/g, (all, name) => (byName.has(name) ? text(byName.get(name)) : all));
      const title = fill(inputs.title ?? b.config.title);
      const body = fill(inputs.text ?? b.config.text);
      if (!title.trim() && !body.trim()) throw new Error('La notifica non ha testo');
      await b.call('lilos.notify', { title, text: body, level: b.config.level });
      return { sent: PULSE };
    },
  },
  {
    type: 'lilos.fileRead', version: 1, category: 'lilos', icon: 'file', label: L('Read file', 'Leggi file'),
    inputs: [{ name: 'read', type: 'pulse', label: L('read', 'leggi') }, pathInput],
    outputs: [{ name: 'content', type: 'any', label: L('content', 'contenuto') }, { name: 'size', type: 'number', label: L('size (bytes)', 'dimensione (byte)') }],
    config: [pathField('~/dati.txt'), modeField],
    async run(inputs, b) {
      const r = await b.call('lilos.fileRead', { path: pathOf(inputs, b), mode: b.config.mode });
      return { content: r.content, size: r.size };
    },
  },
  {
    type: 'lilos.fileWrite', version: 1, category: 'lilos', icon: 'save', label: L('Write file', 'Scrivi file'),
    inputs: [{ name: 'content', type: 'any', label: L('content', 'contenuto') }, pathInput],
    outputs: [{ name: 'written', type: 'pulse', label: L('written', 'scritto') }, { name: 'size', type: 'number', label: L('size (bytes)', 'dimensione (byte)') }],
    config: [pathField('~/dati.txt'), modeField],
    async run(inputs, b) {
      if (b.trigger === 'path') return undefined;   // a new path alone writes nothing
      const r = await b.call('lilos.fileWrite', { path: pathOf(inputs, b), mode: b.config.mode, content: inputs.content ?? null });
      return { written: PULSE, size: r.size };
    },
  },
  {
    type: 'lilos.fileAppend', version: 1, category: 'lilos', icon: 'pencil', label: L('Append to file', 'Aggiungi a file'),
    inputs: [{ name: 'content', type: 'any', label: L('content', 'contenuto') }, pathInput],
    outputs: [{ name: 'written', type: 'pulse', label: L('written', 'scritto') }, { name: 'size', type: 'number', label: L('size (bytes)', 'dimensione (byte)') }],
    config: [
      pathField('~/registro.txt'),
      { key: 'mode', type: 'select', default: 'text', options: [{ value: 'text', label: L('Text', 'Testo') }, { value: 'json', label: L('JSON, one per line', 'JSON, uno per riga') }], label: L('Format', 'Formato') },
      { key: 'newline', type: 'checkbox', default: true, label: L('New line after each one', 'A capo dopo ognuno'), when: { mode: 'text' } },
    ],
    async run(inputs, b) {
      if (b.trigger === 'path') return undefined;
      const r = await b.call('lilos.fileAppend', { path: pathOf(inputs, b), mode: b.config.mode, newline: b.config.newline !== false, content: inputs.content ?? null });
      return { written: PULSE, size: r.size };
    },
  },
  {
    type: 'lilos.folderList', version: 1, category: 'lilos', icon: 'folder', label: L('List folder', 'Elenca cartella'),
    inputs: [{ name: 'read', type: 'pulse', label: L('read', 'leggi') }, pathInput],
    outputs: [
      { name: 'items', type: 'list', label: L('items', 'elementi') },
      { name: 'names', type: 'list', label: L('names', 'nomi') },
      { name: 'count', type: 'number', label: L('count', 'quanti') },
    ],
    config: [
      pathField('~'),
      { key: 'show', type: 'select', default: 'all', label: L('Show', 'Mostra'), options: [
        { value: 'all', label: L('Files and folders', 'File e cartelle') }, { value: 'files', label: L('Files only', 'Solo file') }, { value: 'folders', label: L('Folders only', 'Solo cartelle') },
      ] },
      { key: 'hidden', type: 'checkbox', default: false, label: L('Hidden ones too (.name)', 'Anche i nascosti (.nome)') },
    ],
    async run(inputs, b) {
      const r = await b.call('lilos.folderList', { path: pathOf(inputs, b), show: b.config.show, hidden: b.config.hidden === true });
      return { items: r.items, names: r.items.map(i => i.name), count: r.count };
    },
  },
  {
    type: 'lilos.exists', version: 1, category: 'lilos', icon: 'search', label: L('Exists', 'Esiste'),
    inputs: [{ name: 'check', type: 'pulse', label: L('check', 'controlla') }, { name: 'path', type: 'text', label: L('path', 'percorso') }],
    outputs: [
      { name: 'exists', type: 'bool', label: L('exists', 'esiste') },
      { name: 'yes', type: 'pulse', label: L('if it exists', 'se esiste') },
      { name: 'no', type: 'pulse', label: L('if not', 'se non esiste') },
      { name: 'kind', type: 'text', label: L('kind (file, folder)', 'tipo (file, folder)') },
      { name: 'size', type: 'number', label: L('size (bytes)', 'dimensione (byte)') },
    ],
    config: [pathField('~/dati.txt')],
    async run(inputs, b) {
      const r = await b.call('lilos.exists', { path: pathOf(inputs, b) });
      return r.exists ? { exists: true, yes: PULSE, kind: r.type, size: r.size } : { exists: false, no: PULSE, kind: '', size: 0 };
    },
  },
  {
    type: 'lilos.event', version: 1, category: 'lilos', icon: 'bolt', label: L('Event to lilOS', 'Evento a lilOS'),
    description: L('Sends an event to your open lilOS pages (logicstudio.event)', 'Manda un evento alle tue pagine di lilOS aperte (logicstudio.event)'),
    inputs: [{ name: 'data', type: 'any', label: L('data', 'dati') }],
    outputs: [{ name: 'sent', type: 'pulse', label: L('sent', 'inviato') }],
    config: [{ key: 'name', type: 'text', default: 'evento', label: L('Event name', 'Nome dell\'evento') }],
    async run(inputs, b) {
      await b.call('lilos.event', { name: text(b.config.name).trim(), data: inputs.data ?? null });
      return { sent: PULSE };
    },
  },
];
