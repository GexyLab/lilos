import { randomInt, randomUUID } from 'node:crypto';
import vm from 'node:vm';
import { fail } from '../errors.js';

/**
 * Variables, checks and «save to variable» of NetTest: plain functions, the same for a request
 * sent from the window, a collection run and a scheduled run.
 *
 * `{{name}}` takes, from the first that has it: the request's own (a script's nt.variables), the
 * row of the data file, the environment, the collection, the globals. A secret variable's value is
 * not known here: `{{name}}` stays as it is, and the kernel puts the value in at the end
 * (request.js). `{{$guid}}`, `{{$timestamp}}`… are made each time (DYNAMIC).
 *
 *   scopes: { local, data, environment, collection, globals }   each { name: value }; secret: Set of names
 */
const VAR = /\{\{\s*([^{}\s][^{}]{0,120}?)\s*\}\}/g;
const FIRST = ['Anna', 'Luca', 'Giulia', 'Marco', 'Sara', 'Paolo', 'Elena', 'Davide'];
const LAST = ['Rossi', 'Bianchi', 'Ferrari', 'Esposito', 'Romano', 'Colombo', 'Ricci', 'Greco'];
const pick = list => list[randomInt(list.length)];

export const DYNAMIC = {
  $guid: () => randomUUID(),
  $randomUUID: () => randomUUID(),
  $timestamp: () => String(Math.floor(Date.now() / 1000)),
  $isoTimestamp: () => new Date().toISOString(),
  $randomInt: () => String(randomInt(1001)),
  $randomBoolean: () => String(randomInt(2) === 1),
  $randomFirstName: () => pick(FIRST),
  $randomLastName: () => pick(LAST),
  $randomFullName: () => `${pick(FIRST)} ${pick(LAST)}`,
  $randomEmail: () => `${pick(FIRST).toLowerCase()}.${pick(LAST).toLowerCase()}${randomInt(100)}@example.com`,
  $randomAlphaNumeric: () => 'abcdefghijklmnopqrstuvwxyz0123456789'[randomInt(36)],
  $randomHexColor: () => `#${randomInt(0x1000000).toString(16).padStart(6, '0')}`,
};

const ORDER = ['local', 'data', 'environment', 'collection', 'globals'];
const MAX_GROWTH = 4 << 20;   // what one pass of variables may add to a text: variables that hold variables can grow without end
const REGEX_MS = 250;         // a user's regular expression on a response: (a+)+$ would stop the kernel for everyone

/** A user's regular expression on a text, run with a time limit: test → boolean, or (group) the match → its group 1 or all, or null. */
function userRegex(pattern, text, group = false) {
  if (String(pattern).length > 500) throw new Error('long');
  const ctx = vm.createContext({ p: String(pattern), s: String(text) });
  const code = group ? '(m => (m ? m[1] ?? m[0] : null))(new RegExp(p).exec(s))' : 'new RegExp(p).test(s)';
  return vm.runInContext(code, ctx, { timeout: REGEX_MS });
}

/** The value of a variable, or undefined. A secret one gives back its `{{name}}`. */
export function lookupVar(scopes, name) {
  if (scopes.secret?.has(name) && !Object.hasOwn(scopes.local ?? {}, name) && !Object.hasOwn(scopes.data ?? {}, name)) return `{{${name}}}`;
  for (const k of ORDER) {
    const scope = scopes[k];
    if (scope && Object.hasOwn(scope, name) && scope[name] !== undefined && scope[name] !== null) return String(scope[name]);
  }
  if (Object.hasOwn(DYNAMIC, name)) return DYNAMIC[name]();
  return undefined;
}

/** A text with its variables put in (a few levels deep: a variable may hold another). */
export function resolve(text, scopes) {
  if (typeof text !== 'string' || !text.includes('{{')) return text;
  let out = text;
  for (let depth = 0; depth < 5; depth++) {
    let changed = false;
    let grown = 0;
    out = out.replace(VAR, (whole, name) => {
      const v = lookupVar(scopes, name);
      if (v === undefined || v === whole) return whole;
      grown += v.length;
      if (grown > MAX_GROWTH) fail('too_large', 'Le variabili si espandono troppo (al massimo 4 MB)');
      changed = true;
      return v;
    });
    if (!changed) break;
  }
  return out;
}

/** Every string in a value (a request's fields), resolved. */
export function resolveDeep(value, scopes) {
  if (typeof value === 'string') return resolve(value, scopes);
  if (Array.isArray(value)) return value.map(v => resolveDeep(v, scopes));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveDeep(v, scopes)]));
  return value;
}

/** The names of the variables a text uses that nothing gives (for the warning under the address). */
export function unknownVars(text, scopes) {
  const out = new Set();
  for (const m of String(text ?? '').matchAll(VAR)) if (lookupVar(scopes, m[1]) === undefined) out.add(m[1]);
  return [...out];
}

// ---------- A path in a JSON value: '$.data.items[0].id', 'data.items[0].id', 'items.length' ----------

export function jsonPath(value, path) {
  const p = String(path ?? '').trim().replace(/^\$\.?/, '');
  if (!p) return { found: true, value };
  let cur = value;
  for (const m of p.matchAll(/([^.[\]]+)|\[(-?\d+)\]|\[['"]([^'"]+)['"]\]/g)) {
    const key = m[1] ?? m[3] ?? Number(m[2]);
    if (key === 'length' && (Array.isArray(cur) || typeof cur === 'string')) { cur = cur.length; continue; }
    if (cur === null || typeof cur !== 'object') return { found: false };
    const k = typeof key === 'number' && Array.isArray(cur) && key < 0 ? cur.length + key : key;
    if (!Object.hasOwn(cur, k)) return { found: false };
    cur = cur[k];
  }
  return { found: true, value: cur };
}

// ---------- What a check or a «save to variable» reads ----------

/** res: { status, headers: [[k, v]], text, json (lazy), time, size } */
function read(source, path, res) {
  switch (source) {
    case 'status': return { found: true, value: res.status };
    case 'time': return { found: true, value: res.time };
    case 'size': return { found: true, value: res.size };
    case 'header': {
      const h = res.headers.find(([k]) => k.toLowerCase() === String(path ?? '').trim().toLowerCase());
      return h ? { found: true, value: h[1] } : { found: false };
    }
    case 'body': return { found: true, value: res.text };
    case 'json': {
      const json = res.json();
      if (json === undefined) return { found: false, error: 'La risposta non è JSON' };
      return jsonPath(json, path);
    }
    default: return { found: false, error: 'Origine non valida' };
  }
}

const typeName = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const num = v => (typeof v === 'number' ? v : Number(v));
const same = (a, b) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)) === String(b);
const asText = v => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v));
const has = (v, want) => (Array.isArray(v) ? v.some(x => same(x, want)) : asText(v).includes(String(want)));
const show = v => (v === undefined ? '—' : typeof v === 'object' && v !== null ? JSON.stringify(v).slice(0, 200) : String(v).slice(0, 200));

/**
 * A check without code: { source: 'status' | 'time' | 'size' | 'header' | 'body' | 'json', path?,
 * op: 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge' | 'contains' | 'notContains' | 'exists' | 'notExists' |
 * 'matches' | 'in' | 'type' | 'empty' | 'notEmpty', value? } → { ok, actual, message }
 */
export function evalCheck(check, res) {
  const got = read(check.source, check.path, res);
  const v = got.value;
  const want = check.value;
  if (got.error) return { ok: false, actual: '—', message: got.error };
  let ok;
  switch (check.op) {
    case 'exists': ok = got.found; break;
    case 'notExists': ok = !got.found; break;
    case 'eq': ok = got.found && same(v, want); break;
    case 'ne': ok = !got.found || !same(v, want); break;
    case 'lt': ok = got.found && num(v) < num(want); break;
    case 'le': ok = got.found && num(v) <= num(want); break;
    case 'gt': ok = got.found && num(v) > num(want); break;
    case 'ge': ok = got.found && num(v) >= num(want); break;
    case 'contains': ok = got.found && has(v, want); break;
    case 'notContains': ok = !got.found || !has(v, want); break;
    case 'matches': {
      try { ok = got.found && userRegex(want, v); } catch { return { ok: false, actual: show(v), message: 'Espressione regolare non valida o troppo lenta' }; }
      break;
    }
    case 'in': ok = got.found && String(want).split(',').map(x => x.trim()).some(x => same(v, x)); break;
    case 'type': ok = got.found && typeName(v) === String(want); break;
    case 'empty': ok = !got.found || v === '' || v === null || (Array.isArray(v) && !v.length) || (typeof v === 'object' && v !== null && !Object.keys(v).length); break;
    case 'notEmpty': ok = got.found && !(v === '' || v === null || (Array.isArray(v) && !v.length) || (typeof v === 'object' && v !== null && !Object.keys(v).length)); break;
    default: return { ok: false, actual: show(v), message: 'Condizione non valida' };
  }
  return { ok: !!ok, actual: got.found ? show(v) : '—', message: '' };
}

/** «Save to variable»: { var, source, path?, regex? } → the value to keep, or undefined. */
export function extractValue(rule, res) {
  const got = read(rule.source, rule.path, res);
  if (!got.found) return undefined;
  let v = got.value;
  if (rule.regex) {
    try {
      const m = userRegex(rule.regex, typeof v === 'object' ? JSON.stringify(v) : String(v), true);
      if (m === null || m === undefined) return undefined;
      v = m;
    } catch { return undefined; }
  }
  return typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
}

/** The response as checks and scripts read it (the body as text, its JSON when asked). */
export function readable(response) {
  const data = Buffer.from(response.body ?? '', 'base64');
  const text = data.toString('utf8');
  let parsed;
  let done = false;
  return {
    status: response.status, headers: response.headers ?? [], text, size: data.length,
    time: response.timings?.total ?? null,
    json() {
      if (!done) {
        done = true;
        try { parsed = JSON.parse(text); } catch { parsed = undefined; }
      }
      return parsed;
    },
  };
}
