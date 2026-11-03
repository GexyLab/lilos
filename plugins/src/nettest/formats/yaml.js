/**
 * A small YAML reader, enough for what NetTest imports (OpenAPI/Swagger in YAML, Insomnia v5):
 * block mappings and sequences, plain / 'single' / "double" scalars, | and > block scalars with
 * their chomping, flow [..] and {..} (also over several lines), comments, anchors, aliases and
 * `<<` merges, the first document of a stream. Not there: complex keys (`? `), tags (read and
 * ignored), multi-document streams. Throws an Error with the line when it cannot read the text.
 */
const SEQ = /^-(?:[ \t]|$)/;

/** A key as an own property, even '__proto__' (a plain assignment would change the object's prototype). */
const setKey = (obj, key, value) => Object.defineProperty(obj, key, { value, enumerable: true, writable: true, configurable: true });

export function parseYaml(text) {
  return new Reader(String(text ?? '')).read();
}

class Reader {
  constructor(text) {
    this.raw = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
    this.lines = this.raw.map(r => {
      const m = /^( *)(.*)$/.exec(r);
      return { indent: m[1].length, text: m[2].replace(/[ \t]+$/, '') };
    });
    this.pos = 0;
    this.end = this.lines.length;
    this.anchors = Object.create(null);
    // The first document only: directives and '---' skipped, the next '---' or '...' ends it
    while (this.pos < this.end && (this.blank(this.pos) || this.lines[this.pos].text.startsWith('%'))) this.pos++;
    if (this.pos < this.end && this.lines[this.pos].indent === 0 && /^---(\s|$)/.test(this.lines[this.pos].text)) {
      const rest = this.lines[this.pos].text.slice(3).trim();
      if (rest && !rest.startsWith('#')) this.lines[this.pos] = { indent: 0, text: rest };
      else this.pos++;
    }
    for (let j = this.pos + 1; j < this.end; j++) {
      if (this.lines[j].indent === 0 && /^(---|\.\.\.)(\s|$)/.test(this.lines[j].text)) { this.end = j; break; }
    }
  }

  fail(message, at = this.pos) {
    throw new Error(`YAML: ${message} (riga ${Math.min(at, this.raw.length - 1) + 1})`);
  }

  blank(i) {
    const t = this.lines[i].text.trimStart();
    return t === '' || t.startsWith('#');
  }

  next() {
    while (this.pos < this.end && this.blank(this.pos)) this.pos++;
    return this.pos < this.end ? this.lines[this.pos] : null;
  }

  read() {
    const value = this.node(0);
    const left = this.next();
    if (left) this.fail('struttura non valida');
    return value;
  }

  /** The node that starts at the next line, if it is indented at least `min`. */
  node(min) {
    const line = this.next();
    if (!line || line.indent < min) return null;
    if (SEQ.test(line.text)) return this.seq(line.indent);
    if (splitKey(line.text)) return this.map(line.indent);
    this.pos++;
    return this.value(line.text, line.indent - 1, false);
  }

  map(ind) {
    const obj = {};
    for (;;) {
      const line = this.next();
      if (!line || line.indent < ind) break;
      if (line.indent > ind) this.fail('rientro non valido');
      const kv = splitKey(line.text);
      if (!kv) {
        if (SEQ.test(line.text)) break;
        this.fail(line.text.startsWith('? ') ? 'chiavi complesse non supportate' : 'manca «:» dopo la chiave');
      }
      this.pos++;
      const value = this.value(kv.rest, ind, true);
      if (kv.key === '<<' && !kv.quoted) {
        for (const src of Array.isArray(value) ? value : [value]) {
          if (src && typeof src === 'object') for (const [k, v] of Object.entries(src)) if (!Object.hasOwn(obj, k)) setKey(obj, k, v);
        }
      } else {
        setKey(obj, kv.key, value);
      }
    }
    return obj;
  }

  seq(ind) {
    const arr = [];
    for (;;) {
      const line = this.next();
      if (!line || line.indent !== ind || !SEQ.test(line.text)) break;
      const after = line.text.slice(1);
      const sp = /^[ \t]*/.exec(after)[0].length;
      const content = after.slice(sp);
      if (content === '' || content.startsWith('#')) {
        this.pos++;
        arr.push(this.node(ind + 1));
        continue;
      }
      // '- key: value' and '- - x': the item is a node that starts in the middle of the line
      const col = ind + 1 + sp;
      if (SEQ.test(content) || splitKey(content)) {
        this.lines[this.pos] = { indent: col, text: content };
        arr.push(this.node(col));
        continue;
      }
      this.pos++;
      arr.push(this.value(content, ind, false));
    }
    return arr;
  }

  /** The value after 'key:' or '- ' (rest of the line), its node under it when the line has none. */
  value(rest, ind, inMap) {
    let r = rest;
    let anchor = null;
    for (;;) {
      const a = /^&(\S+)[ \t]*/.exec(r);
      if (a) { anchor = a[1]; r = r.slice(a[0].length); continue; }
      const t = /^!\S*[ \t]*/.exec(r);
      if (t) { r = r.slice(t[0].length); continue; }
      break;
    }
    let value;
    if (r === '' || r.startsWith('#')) {
      value = this.node(ind + 1);
      // 'key:' then '- item' at the same indentation is a sequence of that key
      if (value === null && inMap) {
        const line = this.next();
        if (line && line.indent === ind && SEQ.test(line.text)) value = this.seq(ind);
      }
    } else if (r[0] === '|' || r[0] === '>') {
      value = this.block(r, ind);
    } else if (r[0] === '*') {
      const name = /^\*(\S+)/.exec(r)[1];
      if (!Object.hasOwn(this.anchors, name)) this.fail(`alias sconosciuto *${name}`, this.pos - 1);
      value = this.anchors[name];
    } else {
      value = this.inline(r, ind);
    }
    if (anchor) this.anchors[anchor] = value;
    return value;
  }

  /** A scalar or a flow collection that starts on this line (and may go on below it). */
  inline(text, ind) {
    let t = text;
    const c = t[0];
    if (c === '"' || c === "'") {
      while (quotedEnd(t, 0) < 0 && this.pos < this.end) t += `\n${this.raw[this.pos++].trim()}`;
      const endAt = quotedEnd(t, 0);
      if (endAt < 0) this.fail('stringa non chiusa');
      return unquote(t.slice(0, endAt + 1));
    }
    if (c === '[' || c === '{') {
      while (!flowClosed(t) && this.pos < this.end) t += ` ${this.raw[this.pos++].trim()}`;
      const f = new Flow(t);
      const v = f.value();
      f.ws();
      if (f.i < t.length && t[f.i] !== '#') this.fail('collezione non valida', this.pos - 1);
      return v;
    }
    let s = stripComment(t);
    // A plain scalar may go on in the lines more indented than its key
    while (this.pos < this.end) {
      const line = this.lines[this.pos];
      if (this.blank(this.pos) || line.indent <= ind) break;
      if (splitKey(line.text)) this.fail('rientro non valido');
      s += ` ${stripComment(line.text)}`;
      this.pos++;
    }
    return plain(s.trim());
  }

  /** | and > (with -, +, and an indentation digit). */
  block(head, ind) {
    const m = /^([|>])([-+]?)(\d?)([-+]?)/.exec(head);
    const folded = m[1] === '>';
    const chomp = m[2] || m[4];
    let n = m[3] ? ind + Number(m[3]) : -1;
    const rows = [];
    while (this.pos < this.end) {
      const raw = this.raw[this.pos];
      if (raw.trim() === '') { rows.push(''); this.pos++; continue; }
      const indent = /^ */.exec(raw)[0].length;
      if (n < 0) {
        if (indent <= ind) break;
        n = indent;
      }
      if (indent < n) break;
      rows.push(raw.slice(n));
      this.pos++;
    }
    let trailing = 0;
    while (rows.length && rows[rows.length - 1] === '') { rows.pop(); trailing++; }
    let body;
    if (!folded) {
      body = rows.join('\n');
    } else {
      body = '';
      let prevEmpty = true;
      let prev = '';
      for (const l of rows) {
        if (l === '') { body += '\n'; prevEmpty = true; continue; }
        if (!body || prevEmpty) body += l;
        else body += (l.startsWith(' ') || prev.startsWith(' ') ? '\n' : ' ') + l;
        prevEmpty = false;
        prev = l;
      }
    }
    if (!rows.length) return chomp === '+' ? '\n'.repeat(trailing) : '';
    if (chomp === '-') return body;
    if (chomp === '+') return `${body}\n${'\n'.repeat(trailing)}`;
    return `${body}\n`;
  }
}

/** 'key: rest' → { key, rest, quoted }, or null when the line is not a mapping entry. */
function splitKey(text) {
  const c = text[0];
  if (!c || c === '#' || c === '[' || c === '{' || SEQ.test(text) || text.startsWith('? ')) return null;
  if (c === '"' || c === "'") {
    const end = quotedEnd(text, 0);
    if (end < 0) return null;
    const after = /^[ \t]*:(?:[ \t]+|$)/.exec(text.slice(end + 1));
    return after ? { key: String(unquote(text.slice(0, end + 1))), rest: text.slice(end + 1 + after[0].length), quoted: true } : null;
  }
  const m = /:(?:[ \t]+|$)/.exec(text);
  if (!m) return null;
  const key = text.slice(0, m.index);
  if (/[ \t]#/.test(key)) return null;
  return { key: key.trim(), rest: text.slice(m.index + m[0].length), quoted: false };
}

function stripComment(t) {
  const m = /(^|[ \t])#/.exec(t);
  return (m ? t.slice(0, m.index) : t).trimEnd();
}

/** The index of the quote that closes the string starting at `at`, or -1. */
function quotedEnd(t, at) {
  const q = t[at];
  for (let i = at + 1; i < t.length; i++) {
    if (q === '"' && t[i] === '\\') { i++; continue; }
    if (t[i] === q) {
      if (q === "'" && t[i + 1] === "'") { i++; continue; }
      return i;
    }
  }
  return -1;
}

const ESC = { 0: '\0', a: '\x07', b: '\b', t: '\t', '\t': '\t', n: '\n', v: '\v', f: '\f', r: '\r', e: '\x1b', ' ': ' ', '"': '"', '/': '/', '\\': '\\', N: '\x85', _: '\xa0', L: ' ', P: ' ' };

function unquote(s) {
  const body = s.slice(1, -1);
  if (s[0] === "'") return body.replace(/[ \t]*\n[ \t]*/g, ' ').replace(/''/g, "'");
  return body.replace(/[ \t]*\n[ \t]*/g, ' ').replace(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|.)/g, (all, e) => {
    if (e.length > 1) return String.fromCodePoint(parseInt(e.slice(1), 16));
    return Object.hasOwn(ESC, e) ? ESC[e] : all;
  });
}

/** Are the brackets of a flow collection closed (quotes skipped)? */
function flowClosed(t) {
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '"' || c === "'") { const e = quotedEnd(t, i); if (e < 0) return false; i = e; continue; }
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') { depth--; if (depth === 0) return true; }
  }
  return depth === 0;
}

function plain(s) {
  if (s === '' || s === '~' || /^(null|Null|NULL)$/.test(s)) return null;
  if (/^(true|True|TRUE)$/.test(s)) return true;
  if (/^(false|False|FALSE)$/.test(s)) return false;
  if (/^[-+]?(0|[1-9][0-9]*)$/.test(s)) return Number(s);
  if (/^0x[0-9a-fA-F]+$/.test(s)) return parseInt(s.slice(2), 16);
  if (/^0o[0-7]+$/.test(s)) return parseInt(s.slice(2), 8);
  if (/^[-+]?(\.[0-9]+|(0|[1-9][0-9]*)(\.[0-9]*)?)([eE][-+]?[0-9]+)?$/.test(s)) return Number(s);
  if (/^[-+]?\.(inf|Inf|INF)$/.test(s)) return s[0] === '-' ? -Infinity : Infinity;
  if (/^\.(nan|NaN|NAN)$/.test(s)) return NaN;
  return s;
}

/** [..] and {..} on one string. */
class Flow {
  constructor(t) { this.t = t; this.i = 0; }

  ws() { while (this.i < this.t.length && /\s/.test(this.t[this.i])) this.i++; }

  value() {
    this.ws();
    const c = this.t[this.i];
    if (c === '[') {
      this.i++;
      const arr = [];
      for (;;) {
        this.ws();
        if (this.t[this.i] === ']') { this.i++; return arr; }
        if (this.i >= this.t.length) throw new Error('YAML: «]» mancante');
        arr.push(this.value());
        this.ws();
        if (this.t[this.i] === ',') this.i++;
      }
    }
    if (c === '{') {
      this.i++;
      const obj = {};
      for (;;) {
        this.ws();
        if (this.t[this.i] === '}') { this.i++; return obj; }
        if (this.i >= this.t.length) throw new Error('YAML: «}» mancante');
        const key = this.scalar(true);
        this.ws();
        let v = null;
        if (this.t[this.i] === ':') { this.i++; v = this.value(); }
        setKey(obj, String(key), v);
        this.ws();
        if (this.t[this.i] === ',') this.i++;
      }
    }
    return this.scalar(false);
  }

  scalar(isKey) {
    this.ws();
    const c = this.t[this.i];
    if (c === '"' || c === "'") {
      const e = quotedEnd(this.t, this.i);
      if (e < 0) throw new Error('YAML: stringa non chiusa');
      const s = unquote(this.t.slice(this.i, e + 1));
      this.i = e + 1;
      return s;
    }
    const start = this.i;
    while (this.i < this.t.length) {
      const ch = this.t[this.i];
      if (ch === ',' || ch === ']' || ch === '}' || ch === '[' || ch === '{') break;
      if (ch === ':' && (isKey || /[\s,\]}]/.test(this.t[this.i + 1] ?? ' '))) break;
      if (ch === '#' && /\s/.test(this.t[this.i - 1] ?? '')) break;
      this.i++;
    }
    return plain(this.t.slice(start, this.i).trim());
  }
}
