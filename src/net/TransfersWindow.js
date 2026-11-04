import { h, icon, Window, net, locale, formatBytes } from '@lilos/sdk';
import { notify } from '../notifications/notify.js';

const { t } = locale.define('lilos:transfers', {
  en: { strings: {
    title: 'Data transfer',
    'state.queued': 'queued', 'state.running': 'in progress', 'state.scanning': 'reading the folder', 'state.conflict': 'already exists',
    'state.done': 'done', 'state.error': 'error', 'state.canceled': 'canceled', 'state.skipped': 'skipped',
    'eta.s': 'about {s} s', 'eta.min': 'about {min} min', 'eta.h': 'about {h} h {min} min',
    failed: 'Transfer: {message}',
    sent: 'Sent', received: 'Received', of: '{done} of {total}', rate: '{bytes}/s',
    cancelAll: 'Cancel all', info: 'You can close this window: the transfers go on.',
    fresh: 'just added', error: 'error: {message}',
    closeFolder: 'Close the folder', openFolder: 'Show what it contains',
    filesOf: '{done} of {total} files',
    retry: 'Retry', dismiss: 'Remove from the list', cancelFolder: 'Cancel the folder', cancelFile: 'Cancel this file',
    more: { one: '… {n} more item', other: '… {n} more items' },
    exists: '«{name}» already exists in «{folder}»',
    existing: 'Already there: {size}', incoming: 'Incoming: {size}', withDate: '{size}, {date}',
    replace: 'Replace', keep: 'Keep both', skip: 'Skip', forAll: 'For every conflict of this queue',
    'queue.paused': 'paused', 'queue.conflict': 'waiting for a choice', 'queue.done': 'finished',
    'queue.status': '{files} · {status}', to: 'To «{name}»', toLabel: 'To {name}',
    retryAll: 'Retry all', close: 'Close', resume: 'Resume', pause: 'Pause', cancelQueue: 'Cancel destination',
    summary: '{running} in progress, {waiting} queued',
    empty: 'No transfers',
  } },
});

const KEY = 'transfers';
const STATES = new Set(['queued', 'running', 'scanning', 'conflict', 'done', 'error', 'canceled', 'skipped']);
const TERMINAL = new Set(['done', 'error', 'canceled', 'skipped']);

/** '1,2 GB', in the system's language (0 for a size not known). */
export const bytes = n => formatBytes(Number(n) || 0);

const pct = (done, total) => (total > 0 ? Math.min(100, Math.floor((done / total) * 100)) : 0);

/** 'circa 3 min', 'circa 10 s', '' when it cannot say. */
function eta(done, total, rate) {
  if (!rate || total <= done) return '';
  const s = Math.ceil((total - done) / rate);
  if (s < 60) return t('eta.s', { s });
  if (s < 3600) return t('eta.min', { min: Math.ceil(s / 60) });
  return t('eta.h', { h: Math.floor(s / 3600), min: Math.ceil((s % 3600) / 60) });
}

const run = promise => promise.catch(err => notify(t('failed', { message: err.message }), { level: 'error' }));

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
  const win = new Window({ title: t('title'), icon: 'transfer', width: 640, height: 560, minWidth: 420, minHeight: 280 });
  const meter = (dir, label) => {
    const value = h('b'), of = h('span', { class: 'tx-of' }), fill = h('i'), sub = h('div', { class: 'tx-sub' });
    const el = h('div', { class: `tx-meter tx-${dir}` },
      h('div', { class: 'tx-top' }, icon(dir === 'up' ? 'arrowUp' : 'arrowDown'), label, value, of),
      h('div', { class: 'tx-bar', role: 'progressbar', 'aria-label': label }, fill), sub);
    return { el, set: m => {
      el.hidden = !m.total && !m.rate;
      const p = pct(m.done, m.total);
      value.textContent = `${p}%`;
      of.textContent = t('of', { done: bytes(m.done), total: bytes(m.total) });
      fill.style.width = `${p}%`;
      el.querySelector('.tx-bar').setAttribute('aria-valuenow', String(p));
      sub.textContent = [m.rate ? t('rate', { bytes: bytes(m.rate) }) : '', eta(m.done, m.total, m.rate)].filter(Boolean).join(' · ');
    } };
  };
  const sent = meter('up', t('sent')), received = meter('down', t('received'));
  const sum = h('div', { class: 'tx-sum' }, sent.el, received.el);
  const list = h('div', { class: 'tx-list' });
  const cancelAll = h('button', { class: 'ctl-btn danger', type: 'button' }, t('cancelAll'));
  cancelAll.addEventListener('click', () => run(net.cancel({ all: true })));
  win.body.append(h('div', { class: 'tx-window' }, sum, list,
    h('div', { class: 'tx-foot' }, h('span', { class: 'tx-info' }, icon('info'), t('info')), cancelAll)));

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
    const state = it.fresh ? t('fresh') : it.state === 'running' && !folder ? `${pct(it.done, it.size)}%` : STATES.has(it.state) ? t(`state.${it.state}`) : it.state;
    const twisty = folder
      ? action(open ? 'arrowDown' : 'arrowRight', open ? t('closeFolder') : t('openFolder'), () => toggle(it.id), 'tx-twisty')
      : h('span', { class: 'tx-twisty' }, icon('file'));
    const row = h('div', { class: `tx-item${it.fresh ? ' fresh' : ''}${depth ? ' child' : ''}`, role: 'listitem', dataset: { id: it.id }, style: depth ? `--depth:${depth}` : null },
      twisty,
      h('span', { class: 'tx-name', title: it.error ?? it.name },
        folder ? h('b', {}, `${it.name}/`) : it.name,
        folder ? h('small', {}, t('filesOf', { done: it.filesDone, total: it.files })) : null),
      h('span', { class: 'tx-size' }, folder || it.state === 'running' ? `${bytes(it.done)} / ${bytes(it.size)}` : bytes(it.size)),
      h('span', { class: `tx-state st-${it.state}`, title: it.error ?? '' }, it.state === 'error' && it.error ? t('error', { message: it.error }) : state),
      it.state === 'error'
        ? h('span', { class: 'tx-acts' },
          action('restart', t('retry'), () => run(net.retry({ ids: [it.id] }))),
          action('x', t('dismiss'), () => run(net.dismiss({ ids: [it.id] })), 'x'))
        : TERMINAL.has(it.state) ? h('span') : action('x', folder ? t('cancelFolder') : t('cancelFile'), () => run(net.cancel({ ids: [it.id] })), 'x'));
    if (!folder || !open) return [row];
    const inner = expanded.get(it.id);
    const rows = [row, ...(inner?.items ?? []).flatMap(c => itemRow(c, depth + 1))];
    if (inner?.more) rows.push(h('div', { class: 'tx-item child more', style: `--depth:${depth + 1}` }, h('span'), h('span', { class: 'tx-name' }, t('more', { n: inner.more }))));
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

  /** '1,2 MB, 3/11/2026, 10:00:00': the size and date of a file of a conflict. */
  const sized = f => (f?.modified ? t('withDate', { size: bytes(f.size), date: new Date(f.modified).toLocaleString(locale.code) }) : bytes(f?.size));

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
        h('b', {}, t('exists', { name: c.name, folder: c.to || q.label })),
        h('small', {}, `${t('existing', { size: sized(c.existing) })} · ${t('incoming', { size: sized(c.incoming) })}`))),
      h('div', { class: 'tx-ca' }, choose(t('replace'), 'replace', true), choose(t('keep'), 'keep'), choose(t('skip'), 'skip'),
        h('label', { class: 'tx-all' }, all, t('forAll'))));
  };

  const queueBox = q => {
    const files = t('filesOf', { done: q.filesDone, total: q.files });
    const status = ['paused', 'conflict', 'done'].includes(q.state) ? t(`queue.${q.state}`) : '';
    const head = h('div', { class: 'tx-qhead' },
      h('div', { class: 'tx-dir' }, icon(q.dir === 'up' ? 'arrowUp' : 'arrowDown'), h('span', {}, t('to', { name: q.label }))),
      h('span', { class: 'tx-cnt' }, status ? t('queue.status', { files, status }) : files),
      h('span', { class: 'tx-sp' }),
      q.state === 'done'
        ? h('span', { class: 'tx-acts' },
          h('button', { class: 'ctl-btn', type: 'button', onclick: () => run(net.retry({ queue: q.id })) }, t('retryAll')),
          h('button', { class: 'ctl-btn', type: 'button', onclick: () => run(net.dismiss({ queue: q.id })) }, t('close')))
        : h('span', { class: 'tx-acts' },
          action(q.paused ? 'play' : 'pause', q.paused ? t('resume') : t('pause'), () => run(net.pause(q.id, !q.paused))),
          h('button', { class: 'ctl-btn danger', type: 'button', onclick: () => run(net.cancel({ queue: q.id })) }, t('cancelQueue'))));
    const parts = [head];
    if (q.current) {
      const c = q.current, p = pct(c.done, c.size);
      parts.push(h('div', { class: `tx-current tx-${q.dir}`, dataset: { id: `current-${c.id}` } },
        h('div', { class: 'tx-l1' }, icon('file'), h('span', { class: 'tx-fname' }, c.name), h('span', { class: 'tx-pct' }, `${p}%`),
          action('x', t('cancelFile'), () => run(net.cancel({ ids: [c.id] })), 'x')),
        h('div', { class: 'tx-from' }, `${c.from} → ${c.to}`),
        h('div', { class: 'tx-bar', role: 'progressbar', 'aria-valuenow': String(p), 'aria-label': c.name }, h('i', { style: `width:${p}%` })),
        h('div', { class: 'tx-l3' }, h('span', {}, t('of', { done: bytes(c.done), total: bytes(c.size) })), h('span', { class: 'tx-sp' }),
          c.retrying ? h('span', { class: 'tx-retry' }, c.retrying) : h('span', {}, q.rate ? t('rate', { bytes: bytes(q.rate) }) : ''))));
    }
    if (q.conflict) parts.push(conflictBox(q, q.conflict));
    const rows = q.items.filter(it => it.id !== q.current?.id || it.kind === 'folder').flatMap(it => itemRow(it));
    if (q.more) rows.push(h('div', { class: 'tx-item more' }, h('span'), h('span', { class: 'tx-name' }, t('more', { n: q.more }))));
    parts.push(h('div', { class: 'tx-items', role: 'list' }, ...rows));
    return h('section', { class: 'tx-queue', 'aria-label': t('toLabel', { name: q.label }), dataset: { id: `queue-${q.id}` } }, ...parts);
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
    win.setTitle(t('title'), s.active ? t('summary', { running, waiting: Math.max(0, waiting) }) : '');
    cancelAll.disabled = !s.active;
    const scroll = list.scrollTop;
    // The keyboard stays on the same button of the same row
    const focused = list.contains(document.activeElement) ? document.activeElement : null;
    const where = focused && { id: focused.closest('[data-id]')?.dataset.id, label: focused.getAttribute('aria-label') ?? focused.textContent };
    list.replaceChildren(...(s.queues.length ? s.queues.map(queueBox) : [h('p', { class: 'tx-empty' }, t('empty'))]));
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
