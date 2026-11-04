import { randomBytes } from 'node:crypto';
import { fail } from '../errors.js';
import { httpRequest, readBody } from '../net/http.js';
import { serverOf } from '../net/knownHosts.js';
import { openHome, toFrontNode, isProtected } from '../api/home.js';
import { localText } from '../../../../sdk/core/scheduleRules.js';
import { defineStrings } from '../strings.js';

/**
 * A web request of an operation, made by the kernel. Where it may go is the network's rule
 * (net/guard.js: with several users never this machine, the local network only if an admin opened
 * it), checked again at every redirect and on the address each connection really goes to (the
 * guard's lookup: a name can't be pointed elsewhere between the check and the connection); a
 * redirect to another origin drops the secret headers.
 * The secret headers are opened only here. The answer (10 MB at most) may be saved in a file of
 * the owner's home: replaced, or a new one each time with the date in its name.
 * Done when the status is the one expected (and, if asked, the answer contains a text).
 * The request is net/http.js's, as NetTest's: a certificate that does not validate goes only if the
 * owner confirmed it before (in NetTest, the Rete folder or the Terminal: net/knownHosts.js).
 */
const MAX_ANSWER = 10 << 20;
const SHOWN = 4 << 10;
const REDIRECTS = 5;

const { t } = defineStrings('lilos:kernel.schedule.web', { en: { strings: {
  folderGone: 'The folder to save into is no longer there',
  notFolder: 'Where to save is not a folder',
  notFile: '«{name}» is already there and is not a file',
  protected: '«{name}» is protected by an app (for example encrypted): it is not overwritten',
  secretGone: 'The secret value of {name} can no longer be read: it must be entered again',
  fileGone: 'The file to send is no longer there',
  noAnswer: { one: 'No answer in {n} second', other: 'No answer in {n} seconds' },
  untrusted: '{message}: confirm it once from NetTest',
  network: 'Network: {code}',
  redirects: 'Too many redirects',
  notWeb: 'Redirect to an address that is not web',
  otherOrigin: 'Redirect to another address with a body to send: not followed',
  tooBig: 'Response too large (10 MB at most)',
  unfinished: { one: 'The response did not end in {n} second', other: 'The response did not end in {n} seconds' },
  bytes: { one: '{n} byte', other: '{n} bytes' },
  saved: '{status} in {ms} ms · {size} · saved in {name}',
  summary: '{status} in {ms} ms · {size}',
  status: 'Status {status}, {expected} expected',
  contains: 'The response does not contain «{text}»',
} } });

/** A size as the history shows it; say: a Text in the owner's language. */
const kb = (n, say) => (n < 1024 ? say(t('bytes', { n })) : n < 1 << 20 ? `${(n / 1024).toFixed(1)} KB` : `${(n / (1 << 20)).toFixed(1)} MB`);

/** 'Risposta.json' → 'Risposta 2026-11-03 02.00.json' (the time of the run, on the operation's clock). */
export function datedName(name, at, tz) {
  const local = localText(at, tz).replace('T', ' ').replace(':', '.');
  const dot = name.lastIndexOf('.');
  return dot > 0 ? `${name.slice(0, dot)} ${local}${name.slice(dot)}` : `${name} ${local}`;
}

/** Writes `data` as a file of the home: replaces one with that name, or makes it. Returns its node. */
export async function writeHomeFile(kernel, principal, folderId, name, data, { append = false } = {}) {
  const view = await openHome(kernel, principal);
  const parent = view.toBack(folderId, { parent: true });
  const folder = await view.fs.stat(principal, parent) ?? fail('not_found', t('folderGone'));
  if (folder.type !== 'folder') fail('invalid', t('notFolder'));
  const same = (await view.fs.list(principal, parent)).find(n => n.name.toLowerCase() === name.toLowerCase());
  if (same && same.type !== 'file') fail('conflict', t('notFile', { name }));
  if (same && isProtected(same)) fail('conflict', t('protected', { name }));
  const now = Date.now();
  let node = same;
  if (!node) {
    node = { id: `${view.homeId}/${randomBytes(9).toString('base64url')}`, parent, name, type: 'file', meta: {}, created: now, modified: now };
    await view.fs.apply(principal, { put: [node] });
  }
  const body = append && same ? Buffer.concat([await view.fs.read(principal, node.id), data]) : data;
  await view.fs.write(principal, node.id, body);
  const saved = await view.fs.stat(principal, node.id);
  const front = saved && toFrontNode(view, saved);
  if (front) kernel.events.emit('user', { owner: principal.id, event: 'fs.external', data: { put: [front] } });
  return saved;
}

export async function runWeb({ kernel, task, run, principal, signal, say }) {
  const w = task.what;
  const guard = kernel.network.guard;
  const headers = {};
  const secret = new Set();
  for (const h of w.headers) {
    if (h.secret) {
      headers[h.name] = await kernel.settingSecrets.open(h.sealed).catch(() => fail('invalid', t('secretGone', { name: h.name })));
      secret.add(h.name.toLowerCase());
    } else headers[h.name] = h.value;
  }
  let body;
  if (w.body.kind === 'text' || w.body.kind === 'json' || w.body.kind === 'form') {
    body = w.body.text;
    const type = { text: 'text/plain; charset=utf-8', json: 'application/json', form: 'application/x-www-form-urlencoded' }[w.body.kind];
    if (!Object.keys(headers).some(k => k.toLowerCase() === 'content-type')) headers['Content-Type'] = type;
  } else if (w.body.kind === 'file') {
    const view = await openHome(kernel, principal);
    body = await view.fs.read(principal, view.toBack(w.body.file)).catch(() => fail('not_found', t('fileGone')));
  }

  const timeout = AbortSignal.timeout(w.timeoutS * 1000);
  const both = AbortSignal.any([signal, timeout]);
  const started = Date.now();
  let url = new URL(w.url);
  let method = w.method;
  const origin = url.origin;
  let res;
  for (let hop = 0; ; hop++) {
    await guard.check({ url: url.href });
    const sent = { ...headers };
    if (url.origin !== origin) for (const k of Object.keys(sent)) if (secret.has(k.toLowerCase()) || /^(authorization|cookie|proxy-authorization)$/i.test(k)) delete sent[k];
    const pinned = principal ? await kernel.network.knownHosts.get(principal.id, 'tls', serverOf({ url: url.href })) : null;
    if (!sent['User-Agent'] && !Object.keys(sent).some(k => k.toLowerCase() === 'user-agent')) sent['User-Agent'] = 'lilOS';
    if (!Object.keys(sent).some(k => k.toLowerCase() === 'accept')) sent.Accept = '*/*';
    try {
      res = await httpRequest(url, {
        method, headers: sent, body: method === 'GET' || method === 'HEAD' ? undefined : body, signal: both, lookup: guard.lookup,
        timeoutMs: w.timeoutS * 1000, tls: { pinned }, version: '1.1',
      });
    } catch (err) {
      if (timeout.aborted) fail('unavailable', t('noAnswer', { n: w.timeoutS }));
      if (signal.aborted) throw err;
      if (err?.code === 'forbidden') throw err;
      if (err?.code === 'untrusted') fail('unavailable', t('untrusted', { message: err.text ? say(err.text) : err.message }));
      fail('unavailable', t('network', { code: err.cause?.code ?? err.code ?? (err.text ? say(err.text) : err.message) }));
    }
    const to = res.headers.find(([k]) => k.toLowerCase() === 'location')?.[1];
    if (![301, 302, 303, 307, 308].includes(res.status) || !to) break;
    if (hop >= REDIRECTS) fail('unavailable', t('redirects'));
    res.body.destroy();
    url = new URL(to, url);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') fail('invalid', t('notWeb'));
    if (res.status === 303 || ((res.status === 301 || res.status === 302) && method === 'POST')) { method = 'GET'; body = undefined; }
    if (url.origin !== origin && body !== undefined) fail('invalid', t('otherOrigin'));
  }

  let data, size;
  try {
    const read = await readBody(res, { max: MAX_ANSWER, decode: false });
    if (read.truncated) fail('too_large', t('tooBig'));
    ({ data, size } = read);
  } catch (err) {
    if (err?.code === 'too_large') throw err;
    if (timeout.aborted) fail('unavailable', t('unfinished', { n: w.timeoutS }));
    throw err;
  }
  const ms = Date.now() - started;
  const text = data.toString('utf8');
  const statusOk = w.expect.status === 'any' || (w.expect.status === '2xx' ? res.status >= 200 && res.status < 300 : res.status === w.expect.status);
  const containsOk = !w.expect.contains || text.includes(w.expect.contains);
  const lines = [
    `${method} ${url.href}`,
    `${res.status} ${res.statusText} · ${ms} ms · ${kb(size, say)}`,
    ...res.headers.slice(0, 40).map(([k, v]) => `${k}: ${v}`),
    '',
    text.slice(0, SHOWN) + (text.length > SHOWN ? '\n…' : ''),
  ];
  let saved = null;
  if (w.saveTo && statusOk) {
    const name = w.saveTo.mode === 'dated' ? datedName(w.saveTo.name, run.due ?? Date.now(), task.when.tz) : w.saveTo.name;
    await writeHomeFile(kernel, principal, w.saveTo.folder, name, data);
    saved = name;
  }
  const shown = { status: `${res.status} ${res.statusText || ''}`.trim(), ms, size: kb(size, say) };
  const summary = say(saved === null ? t('summary', shown) : t('saved', { ...shown, name: saved }));
  if (!statusOk) return { state: 'error', text: say(t('status', { status: res.status, expected: w.expect.status === '2xx' ? '2xx' : w.expect.status })), log: lines.join('\n') };
  if (!containsOk) return { state: 'error', text: say(t('contains', { text: w.expect.contains.slice(0, 80) })), log: lines.join('\n') };
  return { state: 'ok', text: summary, log: lines.join('\n') };
}
