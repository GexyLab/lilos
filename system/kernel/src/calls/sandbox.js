/**
 * What NetTest's scripts run in: the code of a «service» for the 'runtime' service of the kernel
 * (services-isolate: a process of its own, a V8 isolate with no network, files or require), whose
 * `lilos` can do nothing (scripts.js answers every call with an error). It gets one request per
 * script and answers what the script did. scriptHost() is sent as text: it uses nothing from
 * outside itself.
 *
 *   in   { script, phase: 'pre' | 'test', name, request, response?, vars: { local, data, environment,
 *          collection, globals }, secret: [name], info: { requestName, iteration, iterations } }
 *        request { method, url, headers: [{ key, value }], body: { kind, text? } }
 *        response { code, status, headers: [[k, v]], text, time, size }
 *   out  { logs: [{ level, text }], tests: [{ name, ok, error? }], vars (the scopes, changed),
 *          request (pre: as the script left it), error? }
 *
 * The script sees `nt` (and `pm`, the same object, so that scripts written for Postman mostly work
 * as they are): nt.variables / environment / collectionVariables / globals / iterationData (get, set,
 * unset, has, toObject, replaceIn), nt.request (url, method, headers.add/upsert/remove/get, body),
 * nt.response (code, status, headers.get, responseTime, responseSize, text(), json(), to.have.status(),
 * to.have.header(), to.be.ok…), nt.test(name, fn), nt.expect(value) (the common words of Chai),
 * nt.info, console. A secret variable reads as '{{name}}': its value never reaches a script.
 */
export function scriptHost(lilos) {
  const MAX_LOGS = 200;
  // The scripts of every collection of a user share this isolate: what one could change for the next is frozen
  for (const C of [Object, Function, Array, String, Number, Boolean, RegExp, Promise, Map, Set, Date, Error, Symbol]) {
    if (C.prototype) Object.freeze(C.prototype);
    Object.freeze(C);
  }
  Object.freeze(JSON);
  Object.freeze(Math);
  // A script's timers end with it (a setInterval would run on after it)
  const live = new Set();
  const real = { setTimeout: globalThis.setTimeout, setInterval: globalThis.setInterval, clearTimeout: globalThis.clearTimeout };
  globalThis.setTimeout = (fn, ms, ...a) => { const id = real.setTimeout(fn, ms, ...a); live.add(id); return id; };
  globalThis.setInterval = (fn, ms, ...a) => { const id = real.setInterval(fn, ms, ...a); live.add(id); return id; };
  globalThis.clearTimeout = globalThis.clearInterval = id => { live.delete(id); real.clearTimeout(id); };
  const show = v => {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return v.message;
    try { return JSON.stringify(v); } catch { return String(v); }
  };
  const typeOf = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : v instanceof RegExp ? 'regexp' : typeof v);
  const deepEqual = (a, b) => {
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return Number.isNaN(a) && Number.isNaN(b);
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
  };

  /** expect(value): the words of Chai that test scripts use most. */
  function expect(actual, label) {
    const flags = { not: false, deep: false };
    const say = text => (label ? `${label}: ${text}` : text);
    const check = (ok, text, negText) => {
      if (flags.not ? ok : !ok) throw new Error(say(flags.not ? negText : text));
      return chain;
    };
    const chain = {};
    const words = ['to', 'be', 'been', 'is', 'that', 'which', 'and', 'has', 'have', 'with', 'at', 'of', 'same', 'does', 'still', 'also'];
    for (const w of words) Object.defineProperty(chain, w, { get: () => chain });
    Object.defineProperty(chain, 'not', { get: () => { flags.not = !flags.not; return chain; } });
    Object.defineProperty(chain, 'deep', { get: () => { flags.deep = true; return chain; } });
    const props = {
      ok: () => check(!!actual, `atteso un valore vero, è ${show(actual)}`, `atteso un valore falso, è ${show(actual)}`),
      true: () => check(actual === true, `atteso true, è ${show(actual)}`, 'atteso diverso da true'),
      false: () => check(actual === false, `atteso false, è ${show(actual)}`, 'atteso diverso da false'),
      null: () => check(actual === null, `atteso null, è ${show(actual)}`, 'atteso diverso da null'),
      undefined: () => check(actual === undefined, `atteso undefined, è ${show(actual)}`, 'atteso un valore definito'),
      NaN: () => check(Number.isNaN(actual), `atteso NaN, è ${show(actual)}`, 'atteso un numero'),
      exist: () => check(actual !== null && actual !== undefined, 'atteso un valore, non c’è', `atteso nessun valore, è ${show(actual)}`),
      empty: () => check(actual === '' || (Array.isArray(actual) && !actual.length) || (typeOf(actual) === 'object' && !Object.keys(actual).length), `atteso vuoto, è ${show(actual)}`, 'atteso non vuoto'),
    };
    for (const [k, fn] of Object.entries(props)) Object.defineProperty(chain, k, { get: fn });
    const equal = (v, msg) => check(flags.deep ? deepEqual(actual, v) : actual === v, msg ?? `atteso ${show(v)}, è ${show(actual)}`, `atteso diverso da ${show(v)}`);
    chain.equal = chain.equals = chain.eq = equal;
    chain.eql = (v, msg) => check(deepEqual(actual, v), msg ?? `atteso ${show(v)}, è ${show(actual)}`, `atteso diverso da ${show(v)}`);
    chain.above = chain.gt = chain.greaterThan = n => check(actual > n, `atteso più di ${n}, è ${show(actual)}`, `atteso al massimo ${n}, è ${show(actual)}`);
    chain.least = chain.gte = n => check(actual >= n, `atteso almeno ${n}, è ${show(actual)}`, `atteso meno di ${n}, è ${show(actual)}`);
    chain.below = chain.lt = chain.lessThan = n => check(actual < n, `atteso meno di ${n}, è ${show(actual)}`, `atteso almeno ${n}, è ${show(actual)}`);
    chain.most = chain.lte = n => check(actual <= n, `atteso al massimo ${n}, è ${show(actual)}`, `atteso più di ${n}, è ${show(actual)}`);
    chain.within = (a, b) => check(actual >= a && actual <= b, `atteso tra ${a} e ${b}, è ${show(actual)}`, `atteso fuori da ${a}–${b}`);
    chain.a = chain.an = type => check(typeOf(actual) === String(type).toLowerCase(), `atteso di tipo ${type}, è ${typeOf(actual)}`, `atteso non di tipo ${type}`);
    chain.include = chain.includes = chain.contain = chain.contains = v => {
      const ok = typeof actual === 'string' ? actual.includes(v)
        : Array.isArray(actual) ? actual.some(x => (flags.deep || typeof v === 'object' ? deepEqual(x, v) : x === v))
          : typeOf(actual) === 'object' && typeOf(v) === 'object' ? Object.keys(v).every(k => deepEqual(actual[k], v[k])) : false;
      return check(ok, `atteso che contenga ${show(v)}`, `atteso che non contenga ${show(v)}`);
    };
    chain.property = (name, ...value) => {
      const has = actual !== null && actual !== undefined && Object.prototype.hasOwnProperty.call(Object(actual), name);
      if (!value.length) return check(has, `attesa la proprietà ${name}`, `non attesa la proprietà ${name}`);
      return check(has && (flags.deep ? deepEqual(actual[name], value[0]) : actual[name] === value[0]), `attesa ${name} = ${show(value[0])}, è ${show(has ? actual[name] : undefined)}`, `attesa ${name} diversa da ${show(value[0])}`);
    };
    chain.lengthOf = chain.length = n => check(actual?.length === n, `attesa lunghezza ${n}, è ${actual?.length}`, `attesa lunghezza diversa da ${n}`);
    chain.match = re => check(new RegExp(re).test(String(actual)), `atteso che corrisponda a ${re}`, `atteso che non corrisponda a ${re}`);
    chain.oneOf = list => check(list.some(x => (flags.deep ? deepEqual(x, actual) : x === actual)), `atteso uno tra ${show(list)}, è ${show(actual)}`, `atteso nessuno tra ${show(list)}`);
    chain.keys = (...keys) => {
      const want = keys.flat();
      return check(actual && want.every(k => Object.prototype.hasOwnProperty.call(actual, k)), `attese le chiavi ${want.join(', ')}`, `non attese le chiavi ${want.join(', ')}`);
    };
    chain.string = s => check(String(actual).includes(s), `atteso che contenga «${s}»`, `atteso che non contenga «${s}»`);
    chain.status = code => check(actual?.code === code, `atteso lo stato ${code}, è ${actual?.code}`, `atteso uno stato diverso da ${code}`);
    return chain;
  }
  expect.fail = msg => { throw new Error(msg ?? 'Fallito'); };

  lilos.handle(async data => {
    const logs = [];
    const tests = [];
    const pending = [];
    const log = level => (...args) => { if (logs.length < MAX_LOGS) logs.push({ level, text: args.map(show).join(' ').slice(0, 4000) }); };
    const output = { log: log('info'), info: log('info'), debug: log('info'), warn: log('warn'), error: log('error') };
    const vars = data.vars ?? {};
    for (const k of ['local', 'data', 'environment', 'collection', 'globals']) vars[k] = vars[k] && typeof vars[k] === 'object' ? vars[k] : {};
    const secret = new Set(data.secret ?? []);
    const lookup = name => {
      for (const k of ['local', 'data', 'environment', 'collection', 'globals']) {
        if (Object.prototype.hasOwnProperty.call(vars[k], name)) return k === 'environment' && secret.has(name) ? `{{${name}}}` : vars[k][name];
      }
      return undefined;
    };
    const replaceIn = text => String(text).replace(/\{\{\s*([^{}\s][^{}]*?)\s*\}\}/g, (all, n) => {
      const v = lookup(n);
      return v === undefined ? all : String(v);
    });
    const scope = (key, writable = true) => ({
      get: name => (key === 'any' ? lookup(name) : key === 'environment' && secret.has(name) && vars.environment[name] === `\u0000secret` ? `{{${name}}}` : vars[key][name]),
      has: name => (key === 'any' ? lookup(name) !== undefined : Object.prototype.hasOwnProperty.call(vars[key], name)),
      set: (name, value) => {
        if (!writable) throw new Error('Questi valori non si cambiano');
        vars[key === 'any' ? 'local' : key][String(name)] = value === undefined || value === null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (key === 'environment') secret.delete(String(name));
      },
      unset: name => { if (writable) delete vars[key === 'any' ? 'local' : key][String(name)]; },
      clear: () => { if (writable && key !== 'any') vars[key] = {}; },
      toObject: () => {
        const all = key === 'any' ? Object.assign({}, vars.globals, vars.collection, vars.environment, vars.data, vars.local) : { ...vars[key] };
        for (const [k, v] of Object.entries(all)) if (v === ' secret') all[k] = `{{${k}}}`;
        return all;
      },
      replaceIn,
    });
    // A secret value is never here: the environment holds a mark, read as '{{name}}'
    for (const n of secret) vars.environment[n] = '\u0000secret';

    const headerList = list => {
      const rows = list;
      const find = name => rows.findIndex(h => String(h.key).toLowerCase() === String(name).toLowerCase());
      return {
        get: name => { const i = find(name); return i < 0 ? undefined : rows[i].value; },
        has: name => find(name) >= 0,
        add: h => { rows.push({ key: String(h.key), value: String(h.value) }); },
        upsert: h => { const i = find(h.key); if (i < 0) rows.push({ key: String(h.key), value: String(h.value) }); else rows[i].value = String(h.value); },
        remove: name => { const i = find(name); if (i >= 0) rows.splice(i, 1); },
        toObject: () => Object.fromEntries(rows.map(h => [String(h.key).toLowerCase(), h.value])),
        each: fn => rows.forEach(h => fn({ key: h.key, value: h.value })),
        all: () => rows.map(h => ({ key: h.key, value: h.value })),
      };
    };
    const r = data.request ?? { method: 'GET', url: '', headers: [], body: { kind: 'none' } };
    r.headers = Array.isArray(r.headers) ? r.headers.map(h => ({ key: String(h.key), value: String(h.value) })) : [];
    const request = {
      get url() { return r.url; }, set url(v) { r.url = String(v); },
      get method() { return r.method; }, set method(v) { r.method = String(v).toUpperCase(); },
      headers: headerList(r.headers),
      addHeader: h => request.headers.add(h),
      removeHeader: name => request.headers.remove(name),
      body: {
        get mode() { return r.body?.kind ?? 'none'; },
        get raw() { return r.body?.text ?? ''; }, set raw(v) { r.body = { ...(r.body ?? {}), kind: r.body?.kind && r.body.kind !== 'none' ? r.body.kind : 'text', text: String(v) }; },
        update: v => { r.body = { ...(r.body ?? {}), kind: r.body?.kind && r.body.kind !== 'none' ? r.body.kind : 'text', text: typeof v === 'string' ? v : JSON.stringify(v) }; },
      },
    };
    let response;
    if (data.response) {
      const res = data.response;
      const heads = (res.headers ?? []).map(([key, value]) => ({ key, value }));
      let json;
      response = {
        code: res.code, status: res.status, responseTime: res.time, responseSize: res.size,
        headers: headerList(heads),
        text: () => res.text,
        json: () => {
          if (json === undefined) {
            try { json = JSON.parse(res.text); } catch { throw new Error('La risposta non è JSON'); }
          }
          return json;
        },
      };
      const be = {
        get ok() { return expect(res.code >= 200 && res.code < 300, 'stato').to.be.true; },
        get success() { return be.ok; },
        get error() { return expect(res.code >= 400, 'stato di errore').to.be.true; },
        get clientError() { return expect(res.code >= 400 && res.code < 500, 'stato 4xx').to.be.true; },
        get serverError() { return expect(res.code >= 500, 'stato 5xx').to.be.true; },
        get json() { return expect(() => response.json()).to.exist; },
      };
      response.to = {
        be,
        have: {
          status: code => (typeof code === 'number' ? expect(res.code, 'stato').to.equal(code) : expect(res.status, 'stato').to.equal(code)),
          header: (name, value) => (value === undefined ? expect(response.headers.has(name), `header ${name}`).to.be.true : expect(response.headers.get(name), `header ${name}`).to.equal(value)),
          body: text => (text === undefined ? expect(res.text.length > 0, 'corpo').to.be.true : expect(res.text, 'corpo').to.include(text)),
          jsonBody: (path, value) => {
            let cur = response.json();
            if (path !== undefined) for (const k of String(path).split('.')) cur = cur?.[k];
            return value === undefined ? expect(cur).to.exist : expect(cur).to.deep.equal(value);
          },
        },
      };
    }
    const test = (name, fn) => {
      const add = (ok, err) => tests.push({ name: String(name).slice(0, 300), ok, ...(err && { error: show(err).slice(0, 500) }) });
      try {
        const out = typeof fn === 'function' ? fn() : undefined;
        if (out && typeof out.then === 'function') pending.push(out.then(() => add(true), err => add(false, err)));
        else add(true);
      } catch (err) { add(false, err); }
    };
    test.skip = name => tests.push({ name: String(name).slice(0, 300), ok: null });
    const nt = Object.freeze({
      variables: scope('any'), environment: scope('environment'), collectionVariables: scope('collection'), globals: scope('globals'),
      iterationData: scope('data', false),
      request, response, test, expect,
      info: Object.freeze({ ...(data.info ?? {}), eventName: data.phase === 'pre' ? 'prerequest' : 'test' }),
      sendRequest: () => { throw new Error('nt.sendRequest non c’è: le richieste le fa la raccolta'); },
    });
    let error;
    try {
      // eslint-disable-next-line no-new-func -- running the user's script is what this is for
      const run = new Function('nt', 'pm', 'console', 'require', 'postman', `return (async () => {\n${data.script}\n})();`);
      await run(nt, nt, output, () => { throw new Error('require non c’è negli script'); }, undefined);
      await Promise.all(pending);
    } catch (err) {
      error = show(err).slice(0, 1000);
    }
    for (const id of live) real.clearTimeout(id);
    live.clear();
    for (const n of secret) if (vars.environment[n] === '\u0000secret') delete vars.environment[n];
    return { logs, tests, vars: { local: vars.local, environment: vars.environment, collection: vars.collection, globals: vars.globals }, secret: [...secret], request: data.phase === 'pre' ? r : undefined, ...(error && { error }) };
  });
}

/** The service's code: an ES module with `main`. */
export const SANDBOX_CODE = `export function main({ lilos }) {\n  (${scriptHost.toString()})(lilos);\n}\n`;
