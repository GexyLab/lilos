import { fail } from '../errors.js';
import { performRequest, errorOf, secretFiller } from './request.js';
import { resolve, resolveDeep, evalCheck, extractValue, readable } from './vars.js';
import { Text, defineStrings } from '../strings.js';

const { t } = defineStrings('lilos:kernel.calls.runner', { en: { strings: {
  scriptErrorBefore: 'Script error (before): {message}',
  scriptErrorAfter: 'Script error (after): {message}',
  scriptTimeoutBefore: 'Script error (before): the script ran out of time (5 seconds)',
  scriptTimeoutAfter: 'Script error (after): the script ran out of time (5 seconds)',
  skipped: 'Sessions (WebSocket, SSE, TCP, UDP, MQTT) open from the window: runs skip them',
  otherServer: 'A script changed the server of the request: the secret values do not go to another address',
  noProtocol: 'Protocol not available in runs: {protocol} (its kernel module is missing)',
  nothingToSave: '«{name}»: nothing to save ({source} {path})',
} } });

/**
 * Runs NetTest's requests: one (Invia), a collection or a folder of it (Esegui, Pianificazione, the
 * Terminal's `nettest run`). The same steps every time:
 *
 *   1. the scripts before the request, the collection's first, then each folder's, then its own
 *      (they may change the request and the variables)
 *   2. the variables put in (vars.js); the auth taken from the closest folder that has one ('inherit')
 *   3. the request (request.js; gRPC unary: the module's invoke)
 *   4. the checks without code and «save to variable», then the scripts after the response
 *
 * A collection, as a .nettest file holds it (the app writes it, the kernel only reads it):
 *   { format: 'nettest', version: 1, name, variables: [{ key, value, enabled? }], auth?, scripts?: { pre, test },
 *     environments: [{ id, name, variables: [{ key, value, secret?, sealed?, enabled? }] }], items: [item] }
 *   item: folder { id, type: 'folder', name, items, auth?, scripts? }
 *       | request { id, type: 'request', name, protocol: 'http' | 'graphql' | 'ws' | 'sse' | 'tcp' | 'tls' | 'udp' | <module>,
 *                   method, url, headers, body, auth, settings, checks, extract, scripts, values? (other protocols) }
 *
 *   scopes: { local, data, environment, collection, globals, secret: Set } (changed as the run goes)
 *   result: { id, name, protocol, request, response, redirects, error, checks: [{ id, label, ok, actual, message }],
 *             tests: [{ name, ok, error? }], logs: [{ level, text, phase }], skipped?, ms, ok }
 */
const LIVE = new Set(['ws', 'sse', 'tcp', 'tls', 'udp', 'mqtt']);
export const MAX_RESULTS = 1000;
const KEEP_BODY = 64 << 10;   // what a run keeps of each response body (the page shows a run, it does not download it)

/** A result as a run keeps it: the body cut to KEEP_BODY (size still says how big it was). */
function slim(r) {
  const b = r.response?.body;
  const keep = Math.floor(KEEP_BODY / 3) * 4;
  if (typeof b === 'string' && b.length > keep) r.response = { ...r.response, body: b.slice(0, keep), truncated: true };
  return r;
}
const originOf = u => { try { return new URL(u).origin; } catch { return ''; } };
const str = v => (typeof v === 'string' ? v : '');
const scriptOf = (node, phase) => str(node?.scripts?.[phase]).trim();

/** The requests of a collection in order, each with its folders: [{ item, chain: [collection, …folders] }]. */
export function flatten(collection, only = null) {
  const out = [];
  const want = Array.isArray(only) && only.length ? new Set(only) : null;
  const walk = (items, chain, inside) => {
    for (const item of Array.isArray(items) ? items : []) {
      if (!item || typeof item !== 'object') continue;
      const picked = inside || !want || want.has(item.id);
      if (item.type === 'folder') walk(item.items, [...chain, item], picked);
      else if (picked) out.push({ item, chain });
    }
  };
  walk(collection.items, [collection], false);
  return out;
}

/** The item with this id and its folders, or null. */
export function findItem(collection, id) {
  return flatten(collection).find(x => x.item.id === id) ?? null;
}

/** The auth a request uses: its own, or the closest folder's (up to the collection's). */
function authOf(item, chain) {
  for (const node of [item, ...[...chain].reverse()]) {
    const a = node?.auth;
    if (a && typeof a === 'object' && a.type && a.type !== 'inherit') return a;
  }
  return { type: 'none' };
}

/** The variables of a list of rows ([{ key, value, enabled }]) as { key: value }. */
export const varsOf = rows => Object.fromEntries((Array.isArray(rows) ? rows : []).filter(r => r && r.enabled !== false && typeof r.key === 'string' && r.key && !r.secret).map(r => [r.key, str(r.value)]));

/** What the scripts may see of a request: the fields they change. */
const scriptRequest = item => ({
  method: str(item.method) || (item.protocol === 'graphql' ? 'POST' : 'GET'), url: str(item.url),
  headers: (Array.isArray(item.headers) ? item.headers : []).filter(h => h && h.enabled !== false).map(h => ({ key: str(h.key), value: str(h.value) })),
  body: item.body && typeof item.body === 'object' ? { kind: item.body.kind ?? 'none', text: str(item.body.text) } : { kind: 'none' },
});

async function runScript(ctx, item, phase, script, scopes, extra, out) {
  const answer = await ctx.calls.scripts.run(ctx.principal, {
    script, phase, request: extra.request, response: extra.response,
    vars: { local: scopes.local, data: scopes.data, environment: scopes.environment, collection: scopes.collection, globals: scopes.globals },
    secret: [...scopes.secret], info: { requestName: str(item.name), requestId: str(item.id), iteration: extra.iteration ?? 0, iterations: extra.iterations ?? 1 },
  }, { signal: ctx.signal });
  for (const l of answer?.logs ?? []) out.logs.push({ ...l, phase });
  for (const t of answer?.tests ?? []) out.tests.push(t);
  if (answer?.vars) {
    for (const k of ['local', 'environment', 'collection', 'globals']) if (answer.vars[k] && typeof answer.vars[k] === 'object') scopes[k] = answer.vars[k];
    if (Array.isArray(answer.secret)) scopes.secret = new Set(answer.secret.filter(n => scopes.secret.has(n)));
  }
  if (answer?.error) {
    const timedOut = answer.error instanceof Text && answer.error.part === 'kernel.calls.scripts' && answer.error.key === 'timeout';
    out.logs.push({ level: 'error', text: t(`${timedOut ? 'scriptTimeout' : 'scriptError'}${phase === 'pre' ? 'Before' : 'After'}`, { message: answer.error }), phase });
  }
  return answer;
}

/**
 * One request. ctx: { kernel, calls, principal, signal, secrets: { name: value }, renewed, drivers }.
 * Never throws for what the request did: errors are in the result.
 */
export async function runRequest(ctx, { item, chain }, scopes, extra = {}) {
  const started = Date.now();
  const protocol = str(item.protocol) || 'http';
  const out = { id: str(item.id), name: str(item.name), protocol, request: null, response: null, redirects: [], error: null, checks: [], tests: [], logs: [], ms: 0, ok: false };
  scopes.local = {};
  try {
    if (LIVE.has(protocol)) {
      out.skipped = t('skipped');
      out.ok = true;
      return out;
    }
    // 1. Scripts before
    let req = scriptRequest(item);
    for (const node of [...chain, item]) {
      const script = scriptOf(node, 'pre');
      if (!script) continue;
      const answer = await runScript(ctx, item, 'pre', script, scopes, { ...extra, request: req }, out);
      if (answer?.request && typeof answer.request === 'object') req = { ...req, ...answer.request };
    }
    // 2. Variables in, auth
    const spec = {
      method: resolve(req.method, scopes), url: resolve(req.url, scopes).trim(),
      headers: req.headers.map(h => ({ key: resolve(h.key, scopes), value: resolve(h.value, scopes) })),
      body: resolveDeep({ ...(item.body ?? { kind: 'none' }), ...(req.body?.text !== undefined && { text: req.body.text }), kind: req.body?.kind ?? item.body?.kind ?? 'none' }, scopes),
      auth: resolveDeep(authOf(item, chain), scopes),
      settings: resolveDeep(item.settings ?? {}, scopes),
    };
    // A script that sent the request to another server takes no secret there
    if (originOf(resolve(scriptRequest(item).url, scopes).trim()) !== originOf(spec.url) && secretFiller(ctx.secrets ?? {}).has(JSON.stringify([spec.url, spec.headers, spec.body, spec.auth]))) {
      fail('forbidden', t('otherServer'));
    }
    // GraphQL is HTTP with its body
    if (protocol === 'graphql' && spec.body.kind !== 'graphql') spec.body = { ...spec.body, kind: 'graphql' };
    // 3. The request
    let res;
    if (protocol === 'http' || protocol === 'graphql') {
      const done = await performRequest(ctx, spec);
      Object.assign(out, { request: done.request, response: done.response, redirects: done.redirects, error: done.error });
      res = done.response && readable(done.response);
    } else {
      const driver = ctx.drivers.get(protocol);
      if (typeof driver?.invoke !== 'function') fail('unavailable', t('noProtocol', { protocol }));
      const values = ctx.fill(resolveDeep({ ...(item.values ?? {}), url: str(item.url), headers: Array.isArray(item.headers) ? item.headers : [], settings: item.settings ?? {} }, scopes));
      const t0 = Date.now();
      try {
        const answer = await driver.invoke(values, resolve(str(item.values?.message ?? item.body?.text ?? ''), scopes), ctx.driverContext(values));
        // What the server sent back is the page's: a secret it echoes is written •••• (as for HTTP)
        const messages = (answer?.messages ?? []).map(m => (m?.type === 'binary' ? m : { ...m, data: ctx.mask(String(m?.data ?? '')) }));
        const text = messages.map(m => m.data).join('\n');
        out.request = { method: str(item.values?.method), url: ctx.mask(str(values.url ?? values.host ?? '')), headers: [], body: { size: 0 } };
        out.response = {
          status: answer?.status ?? 0, statusText: ctx.mask(str(answer?.statusText)), headers: Object.entries(answer?.meta ?? {}).map(([k, v]) => [k, ctx.mask(String(v))]),
          body: Buffer.from(text, 'utf8').toString('base64'), size: Buffer.byteLength(text), timings: { total: Date.now() - t0 }, messages,
        };
        res = readable(out.response);
      } catch (err) {
        out.error = errorOf(err, ctx.mask);
      }
    }
    // 4. Checks, «save to variable», scripts after
    if (res) {
      for (const c of (Array.isArray(item.checks) ? item.checks : []).filter(c => c && c.enabled !== false)) {
        const check = { ...c, path: resolve(str(c.path), scopes), value: resolve(c.value === undefined ? '' : String(c.value), scopes) };
        out.checks.push({ id: str(c.id), label: str(c.label), ...evalCheck(check, res) });
      }
      for (const rule of (Array.isArray(item.extract) ? item.extract : []).filter(r => r && r.enabled !== false && str(r.var))) {
        const v = extractValue({ ...rule, path: resolve(str(rule.path), scopes) }, res);
        if (v === undefined) { out.logs.push({ level: 'warn', text: t('nothingToSave', { name: rule.var, source: rule.source, path: rule.path ?? '' }), phase: 'test' }); continue; }
        const scope = ['collection', 'globals'].includes(rule.scope) ? rule.scope : 'environment';
        scopes[scope] = { ...scopes[scope], [rule.var]: v };
        if (scope === 'environment') scopes.secret.delete(rule.var);
      }
      const shown = { code: res.status, status: str(out.response?.statusText), headers: res.headers, text: res.text.slice(0, 5 << 20), time: res.time, size: res.size };
      for (const node of [...chain, item]) {
        const script = scriptOf(node, 'test');
        if (script) await runScript(ctx, item, 'test', script, scopes, { ...extra, response: shown }, out);
      }
    }
  } catch (err) {
    out.error = errorOf(err, ctx.mask);
  }
  out.ms = Date.now() - started;
  out.ok = !out.error && out.checks.every(c => c.ok) && out.tests.every(t => t.ok !== false) && !out.logs.some(l => l.level === 'error' && l.text instanceof Text && l.text.part === 'kernel.calls.runner' && l.text.key.startsWith('script'));
  return out;
}

/**
 * A collection run: the requests of `only` (ids of requests or folders; all with none), once per
 * row of `data` (or `iterations` times), one after the other with `delayMs` between them.
 * onResult(result, { iteration, index, total }) for each; stops at the first failure with
 * stopOnError, or when the signal aborts. → { results, passed, failed, skipped, ms, cancelled }
 */
export async function runCollection(ctx, collection, scopes, { only = null, data = null, iterations = 1, delayMs = 0, stopOnError = false, onResult } = {}) {
  const list = flatten(collection, only);
  const rows = Array.isArray(data) && data.length ? data : null;
  const rounds = rows ? rows.length : Math.min(1000, Math.max(1, Number(iterations) || 1));
  const started = Date.now();
  const summary = { results: [], passed: 0, failed: 0, skipped: 0, ms: 0, cancelled: false, total: list.length * rounds };
  outer:
  for (let i = 0; i < rounds; i++) {
    scopes.data = rows ? Object.fromEntries(Object.entries(rows[i] ?? {}).map(([k, v]) => [k, String(v)])) : {};
    for (let j = 0; j < list.length; j++) {
      if (ctx.signal?.aborted) { summary.cancelled = true; break outer; }
      const r = slim(await runRequest(ctx, list[j], scopes, { iteration: i, iterations: rounds }));
      r.iteration = i;
      if (summary.results.length < MAX_RESULTS) summary.results.push(r);
      if (r.skipped) summary.skipped++;
      else if (r.ok) summary.passed++;
      else summary.failed++;
      onResult?.(r, { iteration: i, index: j, total: summary.total });
      if (!r.ok && stopOnError) break outer;
      if (delayMs > 0) await new Promise(done => setTimeout(done, Math.min(60_000, delayMs)));
    }
  }
  summary.ms = Date.now() - started;
  return summary;
}
