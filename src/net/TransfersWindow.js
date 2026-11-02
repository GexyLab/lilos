import { h, icon, Window, net, locale, formatBytes } from '@lilos/sdk';
import { notify } from '../notifications/notify.js';

const KEY = 'transfers';
const STATES = {
  queued: 'in coda', running: 'in corso', scanning: 'lettura della cartella', conflict: 'esiste già',
  done: 'fatto', error: 'errore', canceled: 'annullato', skipped: 'saltato',
};
const TERMINAL = new Set(['done', 'error', 'canceled', 'skipped']);

/** '1,2 GB', in the system's language (0 for a size not known). */
export const bytes = n => formatBytes(Number(n) || 0);

const pct = (done, total) => (total > 0 ? Math.min(100, Math.floor((done / total) * 100)) : 0);

/** 'circa 3 min', 'circa 10 s', '' when it cannot say. */
function eta(done, total, rate) {
  if (!rate || total <= done) return '';
  const s = Math.ceil((total - done) / rate);
  if (s < 60) return `circa ${s} s`;
  if (s < 3600) return `circa ${Math.ceil(s / 60)} min`;
  return `circa ${Math.floor(s / 3600)} h ${Math.ceil((s % 3600) / 60)} min`;
}

const run = promise => promise.catch(err => notify(`Trasferimento: ${err.message}`, { level: 'error' }));

/**
 * The Trasferimento dati window (one per workspace): what the kernel is copying to and from the
 * network connections. At the top how much was sent and received; then one queue per destination,
 * with the file being copied, a file that exists already (the user chooses), and what waits. Any
 * item (a folder with what is inside it), a queue or everything can be canceled. Closing the window
 * only hides it: the transfers go on, and stop only when canceled here.
 */
export function showTransfers(wm) {
  const open = wm.get(KEY);
  if (open) {
    wm.show(open);
    return open;
  }
  const win = new Window({ title: 'Trasferimento dati', icon: 'transfer', width: 640, height: 560, minWidth: 420, minHeight: 280 });
  const meter = (dir, label) => {
    const value = h('b'), of = h('span', { class: 'tx-of' }), fill = h('i'), sub = h('div', { class: 'tx-sub' });
    const el = h('div', { class: `tx-meter tx-${dir}` },
      h('div', { class: 'tx-top' }, icon(dir === 'up' ? 'arrowUp' : 'arrowDown'), label, value, of),
      h('div', { class: 'tx-bar', role: 'progressbar', 'aria-label': label }, fill), sub);
    return { el, set: m => {
      el.hidden = !m.total && !m.rate;
      const p = pct(m.done, m.total);
      value.textContent = `${p}%`;
      of.textContent = `${bytes(m.done)} di ${bytes(m.total)}`;
      fill.style.width = `${p}%`;
      el.querySelector('.tx-bar').setAttribute('aria-valuenow', String(p));
      sub.textContent = [m.rate ? `${bytes(m.rate)}/s` : '', eta(m.done, m.total, m.rate)].filter(Boolean).join(' · ');
    } };
  };
  const sent = meter('up', 'Inviati'), received = meter('down', 'Ricevuti');
  const sum = h('div', { class: 'tx-sum' }, sent.el, received.el);
  const list = h('div', { class: 'tx-list' });
  const cancelAll = h('button', { class: 'ctl-btn danger', type: 'button' }, 'Annulla tutto');
  cancelAll.addEventListener('click', () => run(net.cancel({ all: true })));
  win.body.append(h('div', { class: 'tx-window' }, sum, list,
    h('div', { class: 'tx-foot' }, h('span', { class: 'tx-info' }, icon('info'), 'Puoi chiudere questa finestra: i trasferimenti continuano.'), cancelAll)));

  const expanded = new Map();   // folder item id → { items, more, at }
  let forAll = false;

  const action = (glyph, title, fn, cls = '') => {
    const b = h('button', { class: `tx-icon ${cls}`, type: 'button', title, 'aria-label': title }, icon(glyph));
    b.addEventListener('click', e => { e.stopPropagation(); fn(); });
    return b;
  };

  const itemRow = (it, depth = 0) => {
    const folder = it.kind === 'folder';
    const open = expanded.has(it.id);
    const state = it.fresh ? 'aggiunto ora' : it.state === 'running' && !folder ? `${pct(it.done, it.size)}%` : STATES[it.state] ?? it.state;
    const twisty = folder
      ? action(open ? 'arrowDown' : 'arrowRight', open ? 'Chiudi la cartella' : 'Mostra cosa contiene', () => toggle(it.id), 'tx-twisty')
      : h('span', { class: 'tx-twisty' }, icon('file'));
    const row = h('div', { class: `tx-item${it.fresh ? ' fresh' : ''}${depth ? ' child' : ''}`, role: 'listitem', dataset: { id: it.id }, style: depth ? `--depth:${depth}` : null },
      twisty,
      h('span', { class: 'tx-name', title: it.error ?? it.name },
        folder ? h('b', {}, `${it.name}/`) : it.name,
        folder ? h('small', {}, `${it.filesDone} di ${it.files} file`) : null),
      h('span', { class: 'tx-size' }, folder || it.state === 'running' ? `${bytes(it.done)} / ${bytes(it.size)}` : bytes(it.size)),
      h('span', { class: `tx-state st-${it.state}`, title: it.error ?? '' }, it.state === 'error' && it.error ? `errore: ${it.error}` : state),
      it.state === 'error'
        ? h('span', { class: 'tx-acts' },
          action('restart', 'Riprova', () => run(net.retry({ ids: [it.id] }))),
          action('x', 'Togli dall’elenco', () => run(net.dismiss({ ids: [it.id] })), 'x'))
        : TERMINAL.has(it.state) ? h('span') : action('x', folder ? 'Annulla la cartella' : 'Annulla questo file', () => run(net.cancel({ ids: [it.id] })), 'x'));
    if (!folder || !open) return [row];
    const inner = expanded.get(it.id);
    const rows = [row, ...(inner?.items ?? []).flatMap(c => itemRow(c, depth + 1))];
    if (inner?.more) rows.push(h('div', { class: 'tx-item child more', style: `--depth:${depth + 1}` }, h('span'), h('span', { class: 'tx-name' }, `… altri ${inner.more} elementi`)));
    return rows;
  };

  const toggle = id => {
    if (expanded.has(id)) { expanded.delete(id); render(); return; }
    expanded.set(id, { items: [], more: 0, at: 0 });
    load(id);
  };

  const load = id => net.children(id).then(data => {
    if (!expanded.has(id)) return;
    expanded.set(id, { ...data, at: Date.now() });
    render();
  }).catch(() => { expanded.delete(id); render(); });

  const conflictBox = (q, c) => {
    const all = h('input', { type: 'checkbox', checked: forAll });
    all.addEventListener('change', () => { forAll = all.checked; });
    const choose = (label, value, primary = false) => {
      const b = h('button', { class: `ctl-btn${primary ? ' primary' : ''}`, type: 'button' }, label);
      b.addEventListener('click', () => run(net.resolve(c.id, value, all.checked)));
      return b;
    };
    return h('div', { class: 'tx-conflict', role: 'alert', dataset: { id: `conflict-${c.id}` } },
      h('div', { class: 'tx-ct' }, icon('warning'), h('div', {},
        h('b', {}, `«${c.name}» esiste già in «${c.to || q.label}»`),
        h('small', {}, `Già lì: ${bytes(c.existing?.size)}${c.existing?.modified ? `, ${new Date(c.existing.modified).toLocaleString(locale.code)}` : ''} · In arrivo: ${bytes(c.incoming?.size)}${c.incoming?.modified ? `, ${new Date(c.incoming.modified).toLocaleString(locale.code)}` : ''}`))),
      h('div', { class: 'tx-ca' }, choose('Sostituisci', 'replace', true), choose('Mantieni entrambi', 'keep'), choose('Salta', 'skip'),
        h('label', { class: 'tx-all' }, all, 'Per tutti i conflitti di questa coda')));
  };

  const queueBox = q => {
    const files = `${q.filesDone} di ${q.files} file`;
    const status = q.state === 'paused' ? ' · in pausa' : q.state === 'conflict' ? ' · in attesa di una scelta' : q.state === 'done' ? ' · finito' : '';
    const head = h('div', { class: 'tx-qhead' },
      h('div', { class: 'tx-dir' }, icon(q.dir === 'up' ? 'arrowUp' : 'arrowDown'), h('span', {}, `Verso «${q.label}»`)),
      h('span', { class: 'tx-cnt' }, files + status),
      h('span', { class: 'tx-sp' }),
      q.state === 'done'
        ? h('span', { class: 'tx-acts' },
          h('button', { class: 'ctl-btn', type: 'button', onclick: () => run(net.retry({ queue: q.id })) }, 'Riprova tutti'),
          h('button', { class: 'ctl-btn', type: 'button', onclick: () => run(net.dismiss({ queue: q.id })) }, 'Chiudi'))
        : h('span', { class: 'tx-acts' },
          action(q.paused ? 'play' : 'pause', q.paused ? 'Riprendi' : 'Pausa', () => run(net.pause(q.id, !q.paused))),
          h('button', { class: 'ctl-btn danger', type: 'button', onclick: () => run(net.cancel({ queue: q.id })) }, 'Annulla destinazione')));
    const parts = [head];
    if (q.current) {
      const c = q.current, p = pct(c.done, c.size);
      parts.push(h('div', { class: `tx-current tx-${q.dir}`, dataset: { id: `current-${c.id}` } },
        h('div', { class: 'tx-l1' }, icon('file'), h('span', { class: 'tx-fname' }, c.name), h('span', { class: 'tx-pct' }, `${p}%`),
          action('x', 'Annulla questo file', () => run(net.cancel({ ids: [c.id] })), 'x')),
        h('div', { class: 'tx-from' }, `${c.from} → ${c.to}`),
        h('div', { class: 'tx-bar', role: 'progressbar', 'aria-valuenow': String(p), 'aria-label': c.name }, h('i', { style: `width:${p}%` })),
        h('div', { class: 'tx-l3' }, h('span', {}, `${bytes(c.done)} di ${bytes(c.size)}`), h('span', { class: 'tx-sp' }),
          c.retrying ? h('span', { class: 'tx-retry' }, c.retrying) : h('span', {}, q.rate ? `${bytes(q.rate)}/s` : ''))));
    }
    if (q.conflict) parts.push(conflictBox(q, q.conflict));
    const rows = q.items.filter(it => it.id !== q.current?.id || it.kind === 'folder').flatMap(it => itemRow(it));
    if (q.more) rows.push(h('div', { class: 'tx-item more' }, h('span'), h('span', { class: 'tx-name' }, `… altri ${q.more} elementi`)));
    parts.push(h('div', { class: 'tx-items', role: 'list' }, ...rows));
    return h('section', { class: 'tx-queue', 'aria-label': `Verso ${q.label}`, dataset: { id: `queue-${q.id}` } }, ...parts);
  };

  // While a button is pressed the list stays as it is (a click needs press and release on the same button)
  let pressed = false, pending = false;
  list.addEventListener('pointerdown', () => { pressed = true; });
  const release = () => { pressed = false; if (pending) render(); };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);

  const render = () => {
    if (pressed) { pending = true; return; }
    pending = false;
    const s = net.transfers;
    sent.set(s.sent);
    received.set(s.received);
    sum.hidden = !s.queues.length;
    const running = s.queues.filter(q => q.current).length;
    const waiting = s.queues.reduce((n, q) => n + q.files - q.filesDone, 0) - running;
    win.setTitle('Trasferimento dati', s.active ? `${running} in corso, ${Math.max(0, waiting)} in coda` : '');
    cancelAll.disabled = !s.active;
    const scroll = list.scrollTop;
    // The keyboard stays on the same button of the same row
    const focused = list.contains(document.activeElement) ? document.activeElement : null;
    const where = focused && { id: focused.closest('[data-id]')?.dataset.id, label: focused.getAttribute('aria-label') ?? focused.textContent };
    list.replaceChildren(...(s.queues.length ? s.queues.map(queueBox) : [h('p', { class: 'tx-empty' }, 'Nessun trasferimento')]));
    list.scrollTop = scroll;
    if (where?.id) {
      const again = [...list.querySelectorAll(`[data-id="${CSS.escape(where.id)}"] button, [data-id="${CSS.escape(where.id)}"] input`)]
        .find(el => (el.getAttribute('aria-label') ?? el.textContent) === where.label);
      again?.focus();
    }
    // Folders opened: what is inside them, read again now and then
    for (const [id, v] of expanded) if (Date.now() - v.at > 1500) { v.at = Date.now(); load(id); }
  };

  const off = net.on('transfers', render);
  win.on('destroy', () => {
    off();
    removeEventListener('pointerup', release);
    removeEventListener('pointercancel', release);
  });
  render();
  net.loadTransfers().catch(() => {});
  return wm.open(win, { key: KEY });
}

/** True when the Trasferimento dati window of this workspace is open and not minimized. */
export const transfersShown = wm => {
  const win = wm.get(KEY);
  return !!win && !win.el.hidden;
};
