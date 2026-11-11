/**
 * SQL text for every database of the package: the named parameters of «Query SQL» (:nome) turned
 * into each driver's placeholders, and the statements of the blocks without SQL (Leggi tabella,
 * Inserisci, Aggiorna, Elimina) built with quoted names and parameters, never with values inside.
 *
 * A dialect (from the driver): { placeholder(i, name, value) → text, quote(name) → text,
 * paginate(limit, offset, ordered) → { prefix?, suffix }, returning: 'returning' | 'output' | null,
 * multiRow: bool, maxParams }.
 */
const oops = message => new Error(message);
const NAME = /^[A-Za-z_][A-Za-z0-9_$]{0,62}$/;

/**
 * :nome in the SQL → the driver's placeholders, skipping strings, quoted names, comments, casts
 * (::int), dollar-quoted text ($$…$$) and :: of PostgreSQL. `values`: { nome: value }.
 * → { sql, params: [values in order] }. A name with no value is an error (so a typo is not NULL).
 */
export function bindNamed(sql, values, dialect) {
  const src = String(sql ?? '');
  const params = [];
  const seen = new Map();   // name → index (a name used twice is one parameter where the driver allows it)
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    // comments
    if (c === '-' && next === '-') { const end = src.indexOf('\n', i); const j = end < 0 ? src.length : end; out += src.slice(i, j); i = j; continue; }
    if (c === '/' && next === '*') { const end = src.indexOf('*/', i + 2); const j = end < 0 ? src.length : end + 2; out += src.slice(i, j); i = j; continue; }
    // strings and quoted names
    if (c === '\'' || c === '"' || (c === '`' && dialect.backticks) || (c === '[' && dialect.brackets)) {
      const close = c === '[' ? ']' : c;
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === close) { if (src[j + 1] === close && close !== ']') { j += 2; continue; } break; }
        if (src[j] === '\\' && c === '\'' && dialect.backslashEscapes) { j += 2; continue; }
        j++;
      }
      out += src.slice(i, j + 1); i = j + 1; continue;
    }
    // dollar-quoted text of PostgreSQL: $$…$$ or $tag$…$tag$
    if (c === '$' && dialect.dollarQuotes) {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(src.slice(i));
      if (m) { const end = src.indexOf(m[0], i + m[0].length); const j = end < 0 ? src.length : end + m[0].length; out += src.slice(i, j); i = j; continue; }
    }
    if (c === ':') {
      if (next === ':') { out += '::'; i += 2; continue; }   // a cast
      const m = /^:([A-Za-z_][A-Za-z0-9_]*)/.exec(src.slice(i));
      if (m && !/[A-Za-z0-9_]/.test(src[i - 1] ?? '')) {
        const name = m[1];
        if (!Object.prototype.hasOwnProperty.call(values, name)) throw oops(`Manca il valore del parametro :${name} (aggiungi un ingresso «${name}» al blocco)`);
        let index = dialect.reuseParams ? seen.get(name) : undefined;
        if (index === undefined) {
          params.push(values[name]);
          index = params.length;
          if (dialect.reuseParams) seen.set(name, index);
        }
        out += dialect.placeholder(index, name, values[name]);
        i += m[0].length;
        continue;
      }
    }
    out += c;
    i++;
  }
  if (params.length > (dialect.maxParams ?? 2000)) throw oops(`Troppi parametri (al massimo ${dialect.maxParams ?? 2000})`);
  return { sql: out, params };
}

/** A name of a table or column: schema.tabella is two names. Checked, then quoted by the dialect. */
export function quoteName(raw, dialect) {
  const parts = String(raw ?? '').trim().split('.');
  if (!parts[0]) throw oops('Manca il nome della tabella');
  if (parts.length > 3 || parts.some(p => !NAME.test(p))) throw oops(`Nome della tabella non valido: «${String(raw ?? '').slice(0, 80)}» (lettere, cifre e _; schema.tabella per lo schema)`);
  return parts.map(p => dialect.quote(p)).join('.');
}

/** A column name alone (no schema). */
function column(raw, dialect) {
  const name = String(raw ?? '').trim();
  if (!NAME.test(name)) throw oops(`Colonna non valida: «${name.slice(0, 80)}» (lettere, cifre e _)`);
  return dialect.quote(name);
}

/** WHERE from { colonna: valore } (equality; null → IS NULL; a list → IN). */
function whereOf(where, dialect, params) {
  const parts = [];
  for (const [k, v] of Object.entries(where ?? {})) {
    const col = column(k, dialect);
    if (v === null || v === undefined) parts.push(`${col} IS NULL`);
    else if (Array.isArray(v)) {
      if (!v.length) { parts.push('1 = 0'); continue; }
      parts.push(`${col} IN (${v.map(x => { params.push(x); return dialect.placeholder(params.length, k, x); }).join(', ')})`);
    } else { params.push(v); parts.push(`${col} = ${dialect.placeholder(params.length, k, v)}`); }
  }
  return parts.length ? ` WHERE ${parts.join(' AND ')}` : '';
}

/** ORDER BY from «colonna», «colonna DESC», or a list of them. */
function orderOf(order, dialect) {
  const list = (Array.isArray(order) ? order : String(order ?? '').split(',')).map(s => String(s).trim()).filter(Boolean);
  if (!list.length) return '';
  return ` ORDER BY ${list.map(item => {
    const m = /^([A-Za-z_][A-Za-z0-9_$]*)(?:\s+(asc|desc))?$/i.exec(item);
    if (!m) throw oops(`Ordine non valido: «${item.slice(0, 80)}» (colonna oppure colonna DESC)`);
    return `${column(m[1], dialect)}${m[2] ? ` ${m[2].toUpperCase()}` : ''}`;
  }).join(', ')}`;
}

/** SELECT for «Leggi tabella». */
export function buildSelect({ table, columns, where, order, limit, offset }, dialect) {
  const params = [];
  const cols = (Array.isArray(columns) ? columns : String(columns ?? '').split(',')).map(s => String(s).trim()).filter(Boolean);
  const what = cols.length && !(cols.length === 1 && cols[0] === '*') ? cols.map(c => column(c, dialect)).join(', ') : '*';
  const from = quoteName(table, dialect);
  const w = whereOf(where, dialect, params);
  let o = orderOf(order, dialect);
  const page = dialect.paginate(limit, offset, !!o);
  if (page.needsOrder && !o) o = ` ORDER BY ${page.needsOrder}`;
  return { sql: `SELECT ${page.prefix ?? ''}${what} FROM ${from}${w}${o}${page.suffix ?? ''}`, params };
}

/** INSERT of one row or of rows (all with the same columns: those of the first). */
export function buildInsert({ table, rows, returning }, dialect) {
  if (!rows.length) throw oops('Niente da inserire');
  const cols = Object.keys(rows[0]);
  if (!cols.length) throw oops('La riga da inserire non ha colonne');
  for (const r of rows) if (!r || typeof r !== 'object' || Array.isArray(r)) throw oops('Ogni riga da inserire è un oggetto { colonna: valore }');
  const params = [];
  const quoted = cols.map(c => column(c, dialect));
  const values = rows.map(r => `(${cols.map(c => { params.push(r[c] === undefined ? null : r[c]); return dialect.placeholder(params.length, c, r[c]); }).join(', ')})`);
  const into = quoteName(table, dialect);
  const output = returning && dialect.returning === 'output' ? ' OUTPUT INSERTED.*' : '';
  const ret = returning && dialect.returning === 'returning' ? ' RETURNING *' : '';
  return { sql: `INSERT INTO ${into} (${quoted.join(', ')})${output} VALUES ${values.join(', ')}${ret}`, params };
}

/** UPDATE … SET … WHERE …; an empty WHERE only with `all`. */
export function buildUpdate({ table, set, where, all }, dialect) {
  const entries = Object.entries(set ?? {});
  if (!entries.length) throw oops('Niente da cambiare: serve un oggetto { colonna: valore } in «valori»');
  const params = [];
  const sets = entries.map(([k, v]) => { params.push(v === undefined ? null : v); return `${column(k, dialect)} = ${dialect.placeholder(params.length, k, v)}`; });
  const w = whereOf(where, dialect, params);
  if (!w && !all) throw oops('Nessuna condizione: si cambierebbero tutte le righe. Aggiungi una condizione o spunta «Tutte le righe»');
  return { sql: `UPDATE ${quoteName(table, dialect)} SET ${sets.join(', ')}${w}`, params };
}

/** DELETE … WHERE …; an empty WHERE only with `all`. */
export function buildDelete({ table, where, all }, dialect) {
  const params = [];
  const w = whereOf(where, dialect, params);
  if (!w && !all) throw oops('Nessuna condizione: si cancellerebbero tutte le righe. Aggiungi una condizione o spunta «Tutte le righe»');
  return { sql: `DELETE FROM ${quoteName(table, dialect)}${w}`, params };
}

/** The rows of an insert in groups that fit the driver's parameters (and its one-row-at-a-time rule). */
export function chunks(rows, dialect) {
  const cols = Math.max(1, Object.keys(rows[0] ?? {}).length);
  const per = dialect.multiRow ? Math.max(1, Math.min(500, Math.floor((dialect.maxParams ?? 999) / cols))) : 1;
  const out = [];
  for (let i = 0; i < rows.length; i += per) out.push(rows.slice(i, i + per));
  return out;
}

/** Whether a statement only reads (for SQLite's write back and for the read-only mode). */
export const readsOnly = sql => /^\s*(?:--[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*(select|with\s[\s\S]*?\bselect\b(?![\s\S]*\b(insert|update|delete|merge)\b)|pragma\s+\w+\s*$|explain|show|describe|values)\b/i.test(String(sql ?? ''));
