import { str, isObj, list, newCollection, newFolder, newRequest, header, baseName, kindOfType, fixHeaders, formFields, nameOf } from './common.js';

/**
 * HAR 1.2 (what a browser's DevTools save): each entry a request. The headers the browser or the
 * connection set by themselves (Cookie, Content-Length, Host…) are kept but off: they would be
 * stale or wrong when sent again; HTTP/2 pseudo-headers (:authority…) are dropped. With entries
 * to several hosts, a folder per host.
 */
export const isHar = j => isObj(j) && isObj(j.log) && Array.isArray(j.log.entries);

const OFF = /^(cookie|content-length|host|connection|keep-alive|transfer-encoding|upgrade|proxy-connection|te|trailer)$/i;

function bodyFromHar(post, where, warn) {
  if (!isObj(post)) return { kind: 'none' };
  const mime = str(post.mimeType).split(';')[0].trim().toLowerCase();
  const params = list(post.params).filter(p => p && p.name !== undefined);
  if (mime === 'application/x-www-form-urlencoded') {
    return { kind: 'form', fields: params.length ? params.map(p => ({ key: str(p.name), value: str(p.value), type: 'text', enabled: true })) : formFields(post.text) };
  }
  if (mime === 'multipart/form-data') {
    if (!params.length) {
      warn.group('Corpo multipart senza campi, letto come testo', where);
      return { kind: 'text', text: str(post.text) };
    }
    return {
      kind: 'multipart',
      fields: params.map(p => (p.fileName !== undefined
        ? { key: str(p.name), value: '', type: 'file', file: '', fileName: baseName(p.fileName), contentType: str(p.contentType), enabled: true }
        : { key: str(p.name), value: str(p.value), type: 'text', enabled: true })),
    };
  }
  const text = str(post.text);
  if (!text && !mime) return { kind: 'none' };
  if (post.encoding === 'base64') {
    warn.group('Corpo binario non importato (sceglierai un file)', where);
    return { kind: 'file', file: '', fileName: '' };
  }
  const kind = kindOfType(mime);
  return { kind: kind && kind !== 'form' && kind !== 'multipart' ? kind : 'text', text };
}

export function importHar(json, { name } = {}, warn) {
  const c = newCollection(name || 'HAR');
  const byHost = new Map();
  let skipped = 0;
  let off = false;
  for (const e of json.log.entries) {
    const r = e?.request;
    const url = str(r?.url);
    if (!/^https?:\/\//i.test(url)) { skipped++; continue; }
    const method = (str(r.method) || 'GET').toUpperCase();
    const where = `«${nameOf(method, url)}»`;
    const headers = list(r.headers)
      .filter(h => h && str(h.name) && !str(h.name).startsWith(':'))
      .map(h => header(h.name, h.value, !OFF.test(str(h.name))));
    if (headers.some(h => !h.enabled)) off = true;
    const body = bodyFromHar(r.postData, where, warn);
    const req = newRequest({ name: nameOf(method, url), method, url, headers: fixHeaders(headers, body), body });
    let host = '';
    try { host = new URL(url).host; } catch { host = ''; }
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(req);
  }
  if (byHost.size > 1) {
    for (const [host, items] of byHost) {
      const f = newFolder(host || 'Altro');
      f.items = items;
      c.items.push(f);
    }
  } else {
    c.items = [...byHost.values()].flat();
  }
  if (skipped) warn.add(`${skipped} voci non HTTP (data:, ws:, estensioni…) saltate`);
  if (off) warn.add('Cookie e header della connessione importati ma disattivati');
  return { collection: c, environments: [] };
}
