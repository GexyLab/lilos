/**
 * InfluxDB line protocol (writes) and annotated CSV (Flux query results), no library.
 *
 *   pointLine({ measurement, tags, fields, time }, { precision, integers }) → 'cpu,host=a usage=0.5 1700000000000'
 *   timeOf(value, precision) → the timestamp as text in that precision ('' when there is none)
 *   parseCsv(text) → [[cell]] (a blank line is [])
 *   fluxRows(text, maxRows) → { rows: [{ column: value }], truncated }
 *   fluxLiteral(value) → the value written in Flux (string, number, bool, array, record)
 */
const oops = (message, code) => Object.assign(new Error(message), code && { code });
export const PRECISIONS = { ns: 1n, us: 1_000n, ms: 1_000_000n, s: 1_000_000_000n };

const noNewline = (s, what) => {
  if (/[\r\n]/.test(s)) throw oops(`${what} non può contenere un a capo: ${s.slice(0, 60)}`);
  // a final \ would escape the comma or the space after it, joining the next tag or field
  if (s.endsWith('\\')) throw oops(`${what} non può finire con \\: ${s.slice(0, 60)}`);
  return s;
};
const escMeasurement = s => noNewline(s, 'Il nome della misura').replace(/[, ]/g, m => `\\${m}`);
const escKey = (s, what) => noNewline(s, what).replace(/[,= ]/g, m => `\\${m}`);
const escString = s => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** A field's value in line protocol, or null (no value: the field is left out). */
function fieldValue(v, integers) {
  if (v === undefined || v === null) return null;
  switch (typeof v) {
    case 'number':
      if (!Number.isFinite(v)) throw oops(`Valore non valido per un campo: ${v} (InfluxDB non tiene NaN e Infinito)`);
      return integers && Number.isInteger(v) ? `${v}i` : String(v);
    case 'boolean': return v ? 'true' : 'false';
    case 'bigint': return `${v}i`;
    case 'string': return escString(v);
    default: return escString(JSON.stringify(v));
  }
}

/** Nanoseconds since 1970 of a time: a number (milliseconds), digits (milliseconds) or a date as text (ISO). */
function nanosOf(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw oops(`Tempo non valido: ${value}`);
    const whole = Math.floor(value);
    return BigInt(whole) * 1_000_000n + BigInt(Math.round((value - whole) * 1e6));
  }
  const s = String(value).trim();
  if (/^-?\d+$/.test(s)) return BigInt(s) * 1_000_000n;
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) throw oops(`Tempo non valido: ${s.slice(0, 60)} (serve una data ISO, come 2026-11-11T10:00:00Z, o i millisecondi)`);
  // the digits after the seconds beyond the milliseconds (2026-…T10:00:00.123456789Z)
  const frac = /T\d{2}:\d{2}:\d{2}\.(\d+)/.exec(s)?.[1] ?? '';
  const seconds = BigInt(Math.floor(ms / 1000));
  return seconds * 1_000_000_000n + BigInt((frac + '000000000').slice(0, 9));
}

/** The timestamp of a point as text in `precision`, or '' (no time: the server's). */
export function timeOf(value, precision = 'ms') {
  if (value === undefined || value === null || value === '') return '';
  const unit = PRECISIONS[precision];
  if (!unit) throw oops(`Precisione non valida: ${precision} (ns, us, ms, s)`);
  const ns = nanosOf(value);
  // floor division (times before 1970 too)
  const q = ns / unit;
  return String(ns < 0n && ns % unit !== 0n ? q - 1n : q);
}

/** One point as a line. */
export function pointLine(point, { precision = 'ms', integers = false } = {}) {
  const p = point && typeof point === 'object' && !Array.isArray(point) ? point : {};
  const measurement = String(p.measurement ?? '').trim();
  if (!measurement) throw oops('Manca la misura (measurement)');
  if (measurement.startsWith('#')) throw oops('Il nome della misura non può cominciare con #');
  let line = escMeasurement(measurement);
  const tags = Object.entries(p.tags && typeof p.tags === 'object' ? p.tags : {})
    .filter(([k, v]) => k && v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));   // the order InfluxDB likes best
  for (const [k, v] of tags) line += `,${escKey(k, 'Il nome di un tag')}=${escKey(typeof v === 'object' ? JSON.stringify(v) : String(v), 'Il valore di un tag')}`;
  const fieldsIn = p.fields !== null && typeof p.fields === 'object' && !Array.isArray(p.fields) ? p.fields : p.fields === undefined || p.fields === null ? {} : { value: p.fields };
  const fields = [];
  for (const [k, v] of Object.entries(fieldsIn)) {
    if (!k) continue;
    const value = fieldValue(v, integers);
    if (value !== null) fields.push(`${escKey(k, 'Il nome di un campo')}=${value}`);
  }
  if (!fields.length) throw oops(`Il punto di «${measurement.slice(0, 60)}» non ha campi (fields): ne serve almeno uno`);
  line += ` ${fields.join(',')}`;
  const time = timeOf(p.time, precision);
  return time ? `${line} ${time}` : line;
}

// ---------- CSV ----------

/** RFC 4180 CSV: quotes, "" inside quotes, line ends \n or \r\n (also inside quotes). A blank line is []. */
export function parseCsv(text) {
  const out = [];
  let record = [];
  let field = '';
  let quoted = false;     // inside quotes now
  let touched = false;    // the record has something (a cell, a quote)
  const s = String(text ?? '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; touched = true; continue; }
    if (c === ',') { record.push(field); field = ''; touched = true; continue; }
    if (c === '\r' && s[i + 1] === '\n') continue;
    if (c === '\n' || c === '\r') {
      if (touched || field !== '') { record.push(field); out.push(record); } else out.push([]);
      record = []; field = ''; touched = false;
      continue;
    }
    field += c;
  }
  if (quoted) throw oops('Risposta CSV non valida: virgolette non chiuse');
  if (touched || field !== '') { record.push(field); out.push(record); }
  return out;
}

/** A cell of annotated CSV as the type its #datatype says. */
function typed(raw, type) {
  if (raw === undefined || raw === '') return null;
  switch (type) {
    case 'long': case 'unsignedLong': {
      const n = Number(raw);
      return Number.isSafeInteger(n) ? n : raw;
    }
    case 'double': {
      const n = Number(raw);
      return Number.isFinite(n) ? n : raw;   // +Inf, -Inf, NaN stay text
    }
    case 'boolean': return raw === 'true';
    default: return raw;   // string, dateTime:RFC3339, duration, base64Binary…
  }
}

/**
 * The rows of a Flux result (annotated CSV, several tables): every table's rows as objects
 * { column: value }, the values in their type (#datatype), empty ones from #default or null.
 * An error table (error, reference) becomes an exception.
 */
export function fluxRows(text, maxRows = Infinity) {
  const rows = [];
  let header = null, types = null, defaults = null, errorTable = false;
  for (const rec of parseCsv(text)) {
    if (!rec.length || (rec.length === 1 && rec[0] === '')) { header = null; types = null; defaults = null; errorTable = false; continue; }
    if (rec[0].startsWith('#')) {
      if (header) { header = null; types = null; defaults = null; errorTable = false; }   // a new table without a blank line
      if (rec[0] === '#datatype') types = rec;
      else if (rec[0] === '#default') defaults = rec;
      continue;
    }
    if (!header) {
      header = rec;
      errorTable = rec.includes('error') && rec.includes('reference') && rec.filter(Boolean).length <= 2;
      continue;
    }
    if (errorTable) {
      const message = rec[header.indexOf('error')] || 'errore sconosciuto';
      throw oops(`Errore della query Flux: ${message.split('\n')[0].slice(0, 400)}`);
    }
    if (rows.length >= maxRows) return { rows, truncated: true };
    const row = {};
    for (let i = 0; i < header.length; i++) {
      const name = header[i];
      if (!name) continue;   // the annotation column
      const raw = rec[i] === '' || rec[i] === undefined ? (defaults?.[i] ?? '') : rec[i];
      row[name] = typed(raw, types?.[i]);
    }
    rows.push(row);
  }
  return { rows, truncated: false };
}

// ---------- Flux values ----------

/** A value of a block written in Flux, for the parameters (params.name) of a query. */
export function fluxLiteral(v, depth = 0) {
  if (depth > 8) throw oops('Parametro troppo annidato');
  if (v === null || v === undefined) return null;
  switch (typeof v) {
    case 'string': return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$\{/g, '\\${').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t')}"`;
    case 'number':
      if (!Number.isFinite(v)) throw oops(`Parametro non valido: ${v}`);
      if (Number.isSafeInteger(v)) return String(v);
      if (Number.isInteger(v)) return `${BigInt(v)}.0`;   // too big for an int: a float
      return String(v).includes('e') ? v.toFixed(20).replace(/0+$/, '').replace(/\.$/, '.0') : String(v);
    case 'boolean': return v ? 'true' : 'false';
    default: break;
  }
  if (Array.isArray(v)) return `[${v.map(x => fluxLiteral(x, depth + 1)).filter(x => x !== null).join(', ')}]`;
  const parts = [];
  for (const [k, x] of Object.entries(v)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) throw oops(`Nome di parametro non valido per Flux: ${k.slice(0, 40)}`);
    const lit = fluxLiteral(x, depth + 1);
    if (lit !== null) parts.push(`${k}: ${lit}`);
  }
  return `{${parts.join(', ')}}`;
}

/** The query with `params = {…}` put after its package clause, imports and comments at the top. */
export function withFluxParams(query, params) {
  const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null);
  if (!entries.length) return query;
  const record = fluxLiteral(Object.fromEntries(entries));
  const lines = String(query).split('\n');
  let i = 0;
  while (i < lines.length && /^\s*(?:$|\/\/|package\s+\w+\s*$|import\s+(?:\w+\s+)?"[^"]*"\s*$)/.test(lines[i])) i++;
  return [...lines.slice(0, i), `params = ${record}`, ...lines.slice(i)].join('\n');
}
