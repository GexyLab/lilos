/**
 * The network blocks of Logic Studio, loaded by the engine in each user's worker (and read in the
 * kernel's main thread for the catalog: nothing here runs at import). The request is made by the
 * kernel (action net.request, lib/request.js), which checks the addresses and counts it against
 * the user's network quota. Block format: see logicstudio-core/blocks.js.
 *
 * A JSON request every N seconds is Ogni… (core.every) linked to «run» of Richiesta web.
 */

const L = (en, it) => ({ en, it });
const text = v => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/** The headers of the settings: a JSON object, or nothing. */
function headersOf(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  const s = text(raw).trim();
  if (!s) return {};
  let value;
  try { value = JSON.parse(s); } catch { throw new Error('Intestazioni non valide: scrivi un oggetto JSON, per esempio {"Accept": "application/json"}'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Intestazioni non valide: serve un oggetto JSON { "Nome": "valore" }');
  return value;
}

export const blocks = [
  {
    type: 'net.request', version: 1, category: 'net', icon: 'globe', label: L('HTTP request (fetch)', 'HTTP (fetch)'),
    description: L('An HTTP or HTTPS request; each added input is a query parameter', 'Una richiesta HTTP o HTTPS; ogni ingresso aggiunto è un parametro dell\'indirizzo'),
    inputs: [
      { name: 'run', type: 'pulse', label: L('send', 'invia') },
      { name: 'url', type: 'text', label: L('address (URL)', 'indirizzo (URL)'), trigger: false },
      { name: 'body', type: 'any', label: L('body', 'corpo'), trigger: false },
    ],
    outputs: [
      { name: 'body', type: 'any', label: L('response', 'risposta') },
      { name: 'status', type: 'number', label: L('status', 'stato') },
      { name: 'headers', type: 'object', label: L('headers', 'intestazioni') },
    ],
    config: [
      { key: 'method', type: 'select', default: 'GET', options: METHODS.map(m => ({ value: m, label: L(m, m) })), label: L('Method', 'Metodo') },
      { key: 'url', type: 'text', default: 'https://', label: L('Address (URL)', 'Indirizzo (URL)') },
      { key: 'headers', type: 'text', default: '{}', label: L('Headers (JSON)', 'Intestazioni (JSON)') },
      { key: 'kind', type: 'select', default: 'auto', label: L('Response', 'Risposta'), options: [
        { value: 'auto', label: L('Automatic (JSON when it is JSON)', 'Automatica (JSON se è JSON)') },
        { value: 'json', label: L('JSON', 'JSON') }, { value: 'text', label: L('Text', 'Testo') },
      ] },
    ],
    grow: { inputs: { type: 'any', max: 16, name: 'user', label: L('parameter', 'parametro') } },
    async run(inputs, b) {
      if (b.added.inputs.some(p => p.id === b.trigger)) return undefined;   // a parameter only keeps its value
      const url = text(inputs.url === undefined || inputs.url === null || inputs.url === '' ? b.config.url : inputs.url).trim();
      const query = b.added.inputs.filter(p => p.value !== undefined && p.value !== null).map(p => [p.name, p.value]);
      const r = await b.call('net.request', {
        method: METHODS.includes(b.config.method) ? b.config.method : 'GET',
        url, query, headers: headersOf(b.config.headers), body: inputs.body, kind: b.config.kind,
      });
      return { status: r.status, headers: r.headers, body: r.body };
    },
  },
];
