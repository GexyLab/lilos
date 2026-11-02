import { randomBytes } from 'node:crypto';
import { fail } from '../errors.js';
import { openHome, toFrontNode } from '../api/home.js';
import { localText } from '../../../../sdk/core/scheduleRules.js';

/**
 * A web request of an operation, made by the kernel. Where it may go is the network's rule
 * (net/guard.js: with several users never this machine, the local network only if an admin opened
 * it), checked again at every redirect; a redirect to another origin drops the secret headers.
 * The secret headers are opened only here. The answer (10 MB at most) may be saved in a file of
 * the owner's home: replaced, or a new one each time with the date in its name.
 * Done when the status is the one expected (and, if asked, the answer contains a text).
 */
const MAX_ANSWER = 10 << 20;
const SHOWN = 4 << 10;
const REDIRECTS = 5;

const kb = n => (n < 1024 ? `${n} byte` : n < 1 << 20 ? `${(n / 1024).toFixed(1)} KB` : `${(n / (1 << 20)).toFixed(1)} MB`);

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
  const folder = await view.fs.stat(principal, parent) ?? fail('not_found', 'La cartella dove salvare non c’è più');
  if (folder.type !== 'folder') fail('invalid', 'Dove salvare non è una cartella');
  const same = (await view.fs.list(principal, parent)).find(n => n.name.toLowerCase() === name.toLowerCase());
  if (same && same.type !== 'file') fail('conflict', `«${name}» c’è già e non è un file`);
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

export async function runWeb({ kernel, task, run, principal, signal }) {
  const w = task.what;
  const guard = kernel.network.guard;
  const headers = {};
  const secret = new Set();
  for (const h of w.headers) {
    if (h.secret) {
      headers[h.name] = await kernel.settingSecrets.open(h.sealed).catch(() => fail('invalid', `Il valore segreto di ${h.name} non si legge più: va inserito di nuovo`));
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
    body = await view.fs.read(principal, view.toBack(w.body.file)).catch(() => fail('not_found', 'Il file da mandare non c’è più'));
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
    if (url.origin !== origin) for (const k of Object.keys(sent)) if (secret.has(k.toLowerCase())) delete sent[k];
    try {
      res = await fetch(url, { method, headers: sent, body: method === 'GET' || method === 'HEAD' ? undefined : body, redirect: 'manual', signal: both });
    } catch (err) {
      if (timeout.aborted) fail('unavailable', `Nessuna risposta in ${w.timeoutS} secondi`);
      if (signal.aborted) throw err;
      fail('unavailable', `Rete: ${err.cause?.code ?? err.message}`);
    }
    const to = res.headers.get('location');
    if (![301, 302, 303, 307, 308].includes(res.status) || !to) break;
    if (hop >= REDIRECTS) fail('unavailable', 'Troppi reindirizzamenti');
    await res.body?.cancel().catch(() => {});
    url = new URL(to, url);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') fail('invalid', 'Reindirizzamento a un indirizzo non web');
    if (res.status === 303 || ((res.status === 301 || res.status === 302) && method === 'POST')) { method = 'GET'; body = undefined; }
  }

  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of res.body ?? []) {
      size += chunk.length;
      if (size > MAX_ANSWER) fail('too_large', 'Risposta troppo grande (al massimo 10 MB)');
      chunks.push(chunk);
    }
  } catch (err) {
    if (err?.code === 'too_large') throw err;
    if (timeout.aborted) fail('unavailable', `La risposta non è finita in ${w.timeoutS} secondi`);
    throw err;
  }
  const data = Buffer.concat(chunks);
  const ms = Date.now() - started;
  const text = data.toString('utf8');
  const statusOk = w.expect.status === 'any' || (w.expect.status === '2xx' ? res.status >= 200 && res.status < 300 : res.status === w.expect.status);
  const containsOk = !w.expect.contains || text.includes(w.expect.contains);
  const lines = [
    `${method} ${url.href}`,
    `${res.status} ${res.statusText} · ${ms} ms · ${kb(size)}`,
    ...[...res.headers].slice(0, 40).map(([k, v]) => `${k}: ${v}`),
    '',
    text.slice(0, SHOWN) + (text.length > SHOWN ? '\n…' : ''),
  ];
  let saved = '';
  if (w.saveTo && statusOk) {
    const name = w.saveTo.mode === 'dated' ? datedName(w.saveTo.name, run.due ?? Date.now(), task.when.tz) : w.saveTo.name;
    await writeHomeFile(kernel, principal, w.saveTo.folder, name, data);
    saved = ` · salvata in ${name}`;
  }
  const summary = `${res.status} ${res.statusText || ''}`.trim() + ` in ${ms} ms · ${kb(size)}${saved}`;
  if (!statusOk) return { state: 'error', text: `Stato ${res.status}, atteso ${w.expect.status === '2xx' ? '2xx' : w.expect.status}`, log: lines.join('\n') };
  if (!containsOk) return { state: 'error', text: `La risposta non contiene «${w.expect.contains.slice(0, 80)}»`, log: lines.join('\n') };
  return { state: 'ok', text: summary, log: lines.join('\n') };
}
