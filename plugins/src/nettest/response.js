import { h, icon, formatBytes } from '@lilos/sdk';
import { codeArea } from './code.js';
import { parseSetCookie } from './cookies.js';
import { t } from './i18n.js';

/**
 * What came back from a request (the kernel's result: calls/runner.js): the status, the time with
 * its steps, the size, then tabs for the body (formatted, as it came, or shown as a page or an
 * image), the headers, the cookies it set, the checks and tests, the console of the scripts, the
 * time line and the request as it went (secrets as ••••).
 *
 *   const view = responseView({ onTrust })   view.el · view.show(result | null) · view.busy(on) · view.message(text)
 *   onTrust(trust)   the server's certificate is to be confirmed (result.error.trust): the request
 *                    is sent again if the user confirms
 */
const TABS = ['body', 'headers', 'cookies', 'results', 'console', 'timing', 'request'];
const IMAGE = /^image\/(png|jpe?g|gif|webp|svg\+xml|avif|bmp|x-icon)/i;

export const statusClass = s => (s >= 500 ? 's5' : s >= 400 ? 's4' : s >= 300 ? 's3' : s >= 200 ? 's2' : 's1');
export const ms = n => (n === null || n === undefined ? '—' : n < 1000 ? `${Math.round(n)} ms` : `${(n / 1000).toFixed(2)} s`);
const headerOf = (headers, name) => headers.find(([k]) => k.toLowerCase() === name)?.[1] ?? '';

function decode(result) {
  const r = result.response;
  const bytes = Uint8Array.from(atob(r.body ?? ''), c => c.charCodeAt(0));
  const type = headerOf(r.headers ?? [], 'content-type');
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  let json;
  if (/json/i.test(type) || /^\s*[[{]/.test(text)) {
    try { json = JSON.parse(text); } catch { json = undefined; }
  }
  const binary = !json && /[\u0000-\u0008\u000e-\u001f]/.test(text.slice(0, 2000)) && !/^text\//i.test(type);
  const lang = json !== undefined ? 'json' : /xml|html/i.test(type) ? 'html' : /javascript/i.test(type) ? 'javascript' : /css/i.test(type) ? 'css' : 'text';
  return { bytes, type, text, json, binary, lang };
}

function hexDump(bytes, max = 64 << 10) {
  const rows = [];
  for (let i = 0; i < Math.min(bytes.length, max); i += 16) {
    const part = [...bytes.subarray(i, i + 16)];
    rows.push(`${i.toString(16).padStart(8, '0')}  ${part.map(b => b.toString(16).padStart(2, '0')).join(' ').padEnd(47)}  ${part.map(b => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('')}`);
  }
  return rows.join('\n') + (bytes.length > max ? `\n… ${formatBytes(bytes.length - max)}` : '');
}

export function responseView({ onTrust } = {}) {
  let tab = 'body', mode = 'pretty', result = null, decoded = null, preview = null;
  const bar = h('div', { class: 'nx-resbar' });
  const tabs = h('div', { class: 'nx-subtabs', role: 'tablist' });
  const pane = h('div', { class: 'nx-respane' });
  const el = h('section', { class: 'nx-response', 'aria-label': t('res.label') }, bar, tabs, pane);
  const body = codeArea({ readOnly: true, label: t('res.body'), minLines: 6 });

  function drawBar() {
    if (!result) return bar.replaceChildren(h('span', { class: 'nx-dim' }, t('res.empty')));
    const r = result.response;
    const parts = [];
    if (result.error) parts.push(h('span', { class: 'nx-pill s5' }, icon('error'), result.error.code === 'untrusted' ? t('res.untrusted') : t('res.error')));
    if (r) {
      parts.push(h('span', { class: `nx-pill ${statusClass(r.status)}` }, `${r.status} ${r.statusText ?? ''}`.trim()));
      const tm = r.timings ?? {};
      parts.push(h('span', { class: 'nx-metric', title: timingText(tm) }, icon('clock'), ms(tm.total)));
      parts.push(h('span', { class: 'nx-metric', title: r.received && r.received !== r.size ? t('res.sizeWire', { size: formatBytes(r.received) }) : '' }, icon('download'), formatBytes(r.size ?? 0)));
      if (r.httpVersion) parts.push(h('span', { class: 'nx-metric' }, `HTTP/${r.httpVersion}`));
      if (r.tls?.protocol) parts.push(h('span', { class: 'nx-metric', title: `${r.tls.cipher ?? ''}\n${r.tls.subject ?? ''}` }, icon('lock'), r.tls.protocol));
      if (r.truncated) parts.push(h('span', { class: 'nx-pill s4' }, t('res.truncated')));
    }
    const fails = [...result.checks.filter(c => !c.ok), ...result.tests.filter(x => x.ok === false)].length;
    const total = result.checks.length + result.tests.length;
    if (total) parts.push(h('button', { type: 'button', class: `nx-pill ${fails ? 's5' : 's2'} link`, onclick: () => { tab = 'results'; draw(); } }, icon(fails ? 'warning' : 'check'), t('res.passed', { ok: total - fails, n: total })));
    if (result.redirects?.length) parts.push(h('span', { class: 'nx-metric', title: result.redirects.map(x => `${x.status} ${x.url}`).join('\n') }, t('res.redirects', { n: result.redirects.length })));
    bar.replaceChildren(...parts);
  }

  function timingText(tm) {
    const steps = [['lookup', 'res.t.lookup'], ['connect', 'res.t.connect'], ['secure', 'res.t.tls'], ['firstByte', 'res.t.wait'], ['done', 'res.t.download']];
    let prev = 0;
    return steps.filter(([k]) => tm[k] !== null && tm[k] !== undefined).map(([k, label]) => { const d = tm[k] - prev; prev = tm[k]; return `${t(label)}: ${ms(d)}`; }).join('\n');
  }

  const tabButton = id => {
    const n = id === 'headers' ? result?.response?.headers?.length : id === 'console' ? result?.logs?.length : id === 'results' ? (result?.checks?.length ?? 0) + (result?.tests?.length ?? 0) : id === 'cookies' ? cookiesOf().length : 0;
    return h('button', { type: 'button', role: 'tab', 'aria-selected': String(tab === id), class: tab === id ? 'on' : '', onclick: () => { tab = id; draw(); } },
      t(`res.tab.${id}`), n ? h('span', { class: 'nx-count' }, String(n)) : null);
  };

  const cookiesOf = () => (result?.response?.headers ?? []).filter(([k]) => k.toLowerCase() === 'set-cookie').map(([, v]) => parseSetCookie(v)).filter(Boolean);

  function bodyPane() {
    if (!result?.response) return [h('p', { class: 'nx-dim' }, result?.error ? '' : t('res.noBody'))];
    decoded ??= decode(result);
    const modes = h('div', { class: 'nx-modes' }, ...['pretty', 'raw', 'preview'].map(m => h('button', { type: 'button', class: mode === m ? 'on' : '', onclick: () => { mode = m; draw(); } }, t(`res.mode.${m}`))),
      h('span', { class: 'nx-grow' }),
      h('button', { type: 'button', class: 'nx-icon', title: t('res.copy'), onclick: () => navigator.clipboard?.writeText(decoded.text) }, icon('code')),
      h('button', { type: 'button', class: 'nx-icon', title: t('res.download'), onclick: download }, icon('download')));
    if (mode === 'preview') {
      if (IMAGE.test(decoded.type)) {
        const url = URL.createObjectURL(new Blob([decoded.bytes], { type: decoded.type }));
        preview?.();
        preview = () => URL.revokeObjectURL(url);
        return [modes, h('div', { class: 'nx-preview img' }, h('img', { src: url, alt: '' }))];
      }
      if (/html/i.test(decoded.type)) {
        // Shown as the server sent it, but in a frame that runs nothing and reaches nothing
        // …and loads nothing from the network either (images, styles, fonts: tracking, the user's intranet)
        const csp = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:">';
        return [modes, h('iframe', { class: 'nx-preview', sandbox: '', referrerpolicy: 'no-referrer', srcdoc: `${csp}${decoded.text}`, title: t('res.preview') })];
      }
    }
    if (decoded.binary) {
      body.setLang('text');
      body.setValue(hexDump(decoded.bytes));
    } else if (mode === 'pretty' && decoded.json !== undefined) {
      body.setLang('json');
      body.setValue(JSON.stringify(decoded.json, null, 2));
    } else {
      body.setLang(mode === 'raw' ? 'text' : decoded.lang);
      body.setValue(decoded.text.length > 4_000_000 ? `${decoded.text.slice(0, 4_000_000)}\n…` : decoded.text);
    }
    return [modes, body.el];
  }

  function download() {
    const a = h('a', { href: URL.createObjectURL(new Blob([decoded.bytes], { type: decoded.type || 'application/octet-stream' })), download: `response${decoded.lang === 'json' ? '.json' : decoded.lang === 'html' ? '.html' : '.txt'}` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  }

  const table = rows => h('table', { class: 'nx-table' }, h('tbody', {}, ...rows.map(([k, v]) => h('tr', {}, h('th', {}, k), h('td', {}, v)))));

  function results() {
    const rows = [];
    for (const c of result.checks) rows.push(h('li', { class: c.ok ? 'ok' : 'ko' }, icon(c.ok ? 'check' : 'x'), h('span', {}, c.label || t('res.check')), h('small', {}, `${c.actual}${c.message ? ` · ${c.message}` : ''}`)));
    for (const x of result.tests) rows.push(h('li', { class: x.ok === null ? 'skip' : x.ok ? 'ok' : 'ko' }, icon(x.ok === false ? 'x' : x.ok === null ? 'minus' : 'check'), h('span', {}, x.name), x.error ? h('small', {}, x.error) : null));
    return rows.length ? [h('ul', { class: 'nx-results' }, ...rows)] : [h('p', { class: 'nx-dim' }, t('res.noResults'))];
  }

  function draw() {
    drawBar();
    tabs.replaceChildren(...(result ? TABS.map(tabButton) : []));
    if (!result) return pane.replaceChildren();
    if (result.error) {
      const err = h('div', { class: 'nx-error' }, icon('error'), h('div', {}, h('b', {}, result.error.message), result.error.detail ? h('small', {}, result.error.detail) : null));
      if (result.error.trust) err.append(h('button', { type: 'button', class: 'ctl-btn', onclick: () => onTrust?.(result.error.trust) }, icon('shield'), t('res.trust')));
      if (tab === 'body') return pane.replaceChildren(err, ...(result.response ? bodyPane() : []));
    }
    const r = result.response;
    let content;
    switch (tab) {
      case 'body': content = bodyPane(); break;
      case 'headers': content = r ? [table(r.headers)] : []; break;
      case 'cookies': {
        const list = cookiesOf();
        content = list.length ? [h('table', { class: 'nx-table' }, h('thead', {}, h('tr', {}, ...['name', 'value', 'domain', 'path', 'expires', 'flags'].map(c => h('th', {}, t(`res.cookie.${c}`))))),
          h('tbody', {}, ...list.map(c => h('tr', {}, h('td', {}, c.name), h('td', { class: 'mono' }, c.value), h('td', {}, c.domain ?? ''), h('td', {}, c.path ?? ''), h('td', {}, c.expires ? new Date(c.expires).toLocaleString() : t('res.cookie.session')), h('td', {}, [c.secure && 'Secure', c.httpOnly && 'HttpOnly', c.sameSite].filter(Boolean).join(' ')))))) ] : [h('p', { class: 'nx-dim' }, t('res.noCookies'))];
        break;
      }
      case 'results': content = results(); break;
      case 'console': content = result.logs.length ? [h('div', { class: 'nx-console' }, ...result.logs.map(l => h('div', { class: `l-${l.level}` }, h('span', { class: 'nx-phase' }, t(`res.phase.${l.phase ?? 'pre'}`)), l.text)))] : [h('p', { class: 'nx-dim' }, t('res.noLogs'))]; break;
      case 'timing': content = [timing(r?.timings ?? {}), r?.remote?.address ? h('p', { class: 'nx-dim' }, t('res.remote', { address: `${r.remote.address}:${r.remote.port}` })) : null, r?.tls ? tlsInfo(r.tls) : null]; break;
      case 'request': {
        const q = result.request;
        content = q ? [h('pre', { class: 'nx-raw' }, `${q.method} ${q.url}\n${q.headers.map(([k, v]) => `${k}: ${v}`).join('\n')}${q.body?.text ? `\n\n${q.body.text}` : ''}`)] : [];
        break;
      }
      default: content = [];
    }
    pane.replaceChildren(...content.filter(Boolean));
  }

  function timing(tm) {
    const total = tm.total || tm.done || 1;
    const steps = [['lookup', 'res.t.lookup'], ['connect', 'res.t.connect'], ['secure', 'res.t.tls'], ['firstByte', 'res.t.wait'], ['done', 'res.t.download']].filter(([k]) => tm[k] !== null && tm[k] !== undefined);
    let prev = 0;
    return h('div', { class: 'nx-timing' }, ...steps.map(([k, label]) => {
      const from = prev, d = tm[k] - prev;
      prev = tm[k];
      return h('div', { class: 'nx-trow' }, h('span', {}, t(label)), h('span', { class: 'nx-track' }, h('i', { class: `k-${k}`, style: `left:${(from / total) * 100}%;width:${Math.max(0.5, (d / total) * 100)}%` })), h('b', {}, ms(d)));
    }), h('div', { class: 'nx-trow total' }, h('span', {}, t('res.t.total')), h('span', {}), h('b', {}, ms(tm.total))));
  }

  const tlsInfo = tls => h('div', { class: 'nx-tls' }, h('h4', {}, icon('lock'), `${tls.protocol ?? ''} · ${tls.cipher ?? ''}${tls.alpn ? ` · ${tls.alpn}` : ''}`),
    tls.error ? h('p', { class: 'nx-hint warn' }, t('res.tlsError', { error: tls.error })) : null,
    ...(tls.chain ?? []).map(c => h('div', { class: 'nx-cert' }, h('b', {}, c.subject), h('small', {}, `${t('res.cert.issuer')}: ${c.issuer}`), h('small', {}, `${c.validFrom ?? ''} → ${c.validTo ?? ''}`), h('small', { class: 'mono' }, c.fingerprint))));

  draw();
  return {
    el,
    show(r) {
      result = r;
      decoded = null;
      preview?.();
      preview = null;
      if (r?.error && !r.response) tab = 'body';
      el.classList.remove('busy');
      draw();
    },
    busy(on) { el.classList.toggle('busy', on); if (on) bar.replaceChildren(h('span', { class: 'nx-spin' }), h('span', { class: 'nx-dim' }, t('res.sending'))); },
    message(text) { result = null; draw(); bar.replaceChildren(h('span', { class: 'nx-dim' }, text)); },
  };
}
