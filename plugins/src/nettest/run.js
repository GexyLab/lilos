import { Window, h, icon, calls, fs, messageBox } from '@lilos/sdk';
import { pickFile } from '@lilos/system';
import { environmentBody, varsOf, walk, find, collectionText } from './model.js';
import { statusClass, ms } from './response.js';
import { store } from './store.js';
import { t } from './i18n.js';

/**
 * Esegui: the requests of a collection or of one of its folders, one after the other, in the
 * kernel (calls.run: the same engine as Invia, Pianificazione and the Terminal). Repeated
 * `iterations` times, or once per row of a data file (CSV with a header row, or a JSON array of
 * objects: each row's columns are variables). The results come as they are ready; at the end the
 * variables the run changed can be kept in the environment.
 */
export function parseCsv(text) {
  const s = String(text).replace(/^\uFEFF/, '');
  const first = s.slice(0, s.search(/\r?\n|$/));
  // Excel in many languages writes ';' between the columns
  const sep = first.includes(';') && !first.includes(',') ? ';' : ',';
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c;
    } else if (c === '"' && !field) quoted = true;
    else if (c === sep) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some(x => x !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(x => x !== '')) rows.push(row);
  const [head, ...body] = rows;
  if (!head) return [];
  return body.map(r => Object.fromEntries(head.map((k, i) => [k.trim(), r[i] ?? ''])));
}

export function openRunner(owner, col, folderId = null) {
  const entry = store.get(col);
  if (!entry) return;
  const c = entry.data;
  const win = new Window({ title: t('run.title', { name: store.nameOf(entry) }), icon: 'play', width: 820, height: 600 });
  const opts = { folder: folderId ?? '', env: store.envId(col) ?? '', iterations: 1, delayMs: 0, stopOnError: false, data: null, dataName: '', keep: true };
  let running = null, results = [], summary = null, total = 0;

  const folders = [];
  walk(c.items, (x, list, parents) => { if (x.type === 'folder') folders.push({ id: x.id, label: [...parents.map(p => p.name), x.name].join(' / ') }); });
  const sel = (value, options, onChange) => h('select', { class: 'ctl-select', onchange: e => onChange(e.target.value) }, ...options.map(([v, l]) => h('option', { value: v, selected: String(value) === v }, l)));

  const form = h('div', { class: 'nx-runform' });
  const bar = h('div', { class: 'nx-runbar' });
  const list = h('div', { class: 'nx-runlist', role: 'list' });
  win.body.append(h('div', { class: 'nx nx-run' }, form, bar, list));

  function drawForm() {
    const field = (label, control) => h('label', { class: 'nx-frow' }, h('span', { class: 'nx-flabel' }, label), control);
    form.replaceChildren(
      field(t('run.what'), sel(opts.folder, [['', t('run.all')], ...folders.map(f => [f.id, f.label])], v => { opts.folder = v; })),
      field(t('run.env'), sel(opts.env, [['', t('env.none')], ...c.environments.map(e => [e.id, e.name])], v => { opts.env = v; })),
      field(t('run.iterations'), h('input', { class: 'ctl-text', type: 'number', min: 1, max: 1000, value: opts.iterations, disabled: !!opts.data, oninput: e => { opts.iterations = Math.max(1, Number(e.target.value) || 1); } })),
      field(t('run.data'), h('span', { class: 'nx-inline' }, h('span', { class: opts.data ? 'mono' : 'nx-dim' }, opts.data ? t('run.dataRows', { name: opts.dataName, n: opts.data.length }) : t('run.noData')),
        h('button', { type: 'button', class: 'ctl-btn', onclick: chooseData }, t('req.file.choose')),
        opts.data ? h('button', { type: 'button', class: 'nx-icon', title: t('run.dropData'), onclick: () => { opts.data = null; drawForm(); } }, icon('x')) : null)),
      field(t('run.delay'), h('input', { class: 'ctl-text', type: 'number', min: 0, value: opts.delayMs, oninput: e => { opts.delayMs = Math.max(0, Number(e.target.value) || 0); } })),
      h('label', { class: 'nx-check1' }, h('input', { type: 'checkbox', checked: opts.stopOnError, onchange: e => { opts.stopOnError = e.target.checked; } }), t('run.stop')),
      h('label', { class: 'nx-check1' }, h('input', { type: 'checkbox', checked: opts.keep, onchange: e => { opts.keep = e.target.checked; } }), t('run.keep')),
      h('div', { class: 'nx-modes' }, h('span', { class: 'nx-grow' }),
        running ? h('button', { type: 'button', class: 'ctl-btn danger', onclick: () => calls.cancelRun(running).catch(() => {}) }, icon('stop'), t('run.cancel'))
          : h('button', { type: 'button', class: 'ctl-btn primary', onclick: start }, icon('play'), t('run.start'))));
  }

  async function chooseData() {
    const node = await pickFile(owner.openWindow, { title: t('run.pickData'), exts: ['csv', 'json'] });
    if (!node) return;
    try {
      const text = await fs.read(node.id);
      const rows = /\.json$/i.test(node.name) ? JSON.parse(text) : parseCsv(text);
      if (!Array.isArray(rows) || rows.some(r => !r || typeof r !== 'object')) throw new Error(t('run.badData'));
      opts.data = rows;
      opts.dataName = node.name;
      drawForm();
    } catch (err) {
      messageBox(win, { icon: 'error', title: t('run.badData'), text: err.message });
    }
  }

  function drawBar() {
    const passed = results.filter(r => r.ok && !r.skipped).length, failed = results.filter(r => !r.ok).length, skipped = results.filter(r => r.skipped).length;
    const pct = total ? Math.round((results.length / total) * 100) : 0;
    bar.replaceChildren(...[
      h('span', { class: 'nx-pill s2' }, icon('check'), t('run.passed', { n: passed })),
      h('span', { class: `nx-pill ${failed ? 's5' : 's1'}` }, icon('x'), t('run.failed', { n: failed })),
      skipped ? h('span', { class: 'nx-pill s1' }, t('run.skipped', { n: skipped })) : null,
      h('span', { class: 'nx-grow' }),
      summary ? h('span', { class: 'nx-dim' }, summary.cancelled ? t('run.cancelled') : t('run.done', { time: ms(summary.ms) })) : running ? h('span', { class: 'nx-dim' }, `${results.length}/${total}`) : null,
      results.length && !running ? h('button', { type: 'button', class: 'ctl-btn', onclick: exportResults }, icon('download'), t('run.export')) : null,
      h('div', { class: 'nx-progress' }, h('i', { style: `width:${summary ? 100 : pct}%` }))].filter(Boolean));
  }

  function row(r) {
    const failures = [...r.checks.filter(x => !x.ok).map(x => `${x.label || t('res.check')}: ${x.actual}`), ...r.tests.filter(x => x.ok === false).map(x => `${x.name}: ${x.error ?? ''}`)];
    const errors = r.logs.filter(l => l.level === 'error').map(l => l.text);
    const el = h('details', { class: `nx-runrow ${r.skipped ? 'skip' : r.ok ? 'ok' : 'ko'}`, role: 'listitem' },
      h('summary', {}, icon(r.skipped ? 'minus' : r.ok ? 'check' : 'x'),
        h('span', { class: 'nx-name' }, r.name || r.id), r.iteration ? h('span', { class: 'nx-dim' }, `#${r.iteration + 1}`) : null,
        h('span', { class: 'nx-grow' }),
        r.response ? h('span', { class: `nx-st ${statusClass(r.response.status)}` }, String(r.response.status)) : null,
        h('span', { class: 'nx-dim' }, ms(r.ms))),
      h('div', { class: 'nx-rundetail' },
        r.request ? h('div', { class: 'mono' }, `${r.request.method} ${r.request.url}`) : null,
        r.skipped ? h('p', { class: 'nx-dim' }, r.skipped) : null,
        r.error ? h('p', { class: 'nx-hint warn' }, r.error.message) : null,
        ...[...failures, ...errors].map(f => h('p', { class: 'nx-hint warn' }, f)),
        ...r.tests.filter(x => x.ok).map(x => h('p', { class: 'nx-dim' }, `✓ ${x.name}`)),
        r.logs.length ? h('pre', { class: 'nx-raw' }, r.logs.map(l => l.text).join('\n')) : null,
        h('button', { type: 'button', class: 'nx-link', onclick: () => { owner.openItem(col, r.id); } }, t('run.openRequest'))));
    return el;
  }

  async function start() {
    results = [];
    summary = null;
    list.replaceChildren();
    try {
      const env = c.environments.find(e => e.id === opts.env) ?? null;
      const collection = JSON.parse(collectionText(c));
      const started = await calls.run({
        collection, only: opts.folder ? [opts.folder] : null, environment: environmentBody(env), globals: { values: varsOf(store.globals) },
        data: opts.data, iterations: opts.iterations, delayMs: opts.delayMs, stopOnError: opts.stopOnError,
      });
      running = started.id;
      total = started.total;
      drawForm();
      drawBar();
      for (let after = 0; ;) {
        const p = await calls.progress(running, { after, wait: true });
        for (const r of p.results) { results.push(r); list.append(row(r)); }
        after = p.next;
        drawBar();
        if (p.done) { summary = p.summary; break; }
      }
      if (summary && opts.keep && opts.env === store.envId(col)) owner.applyResult(col, { vars: summary.vars, secret: summary.secret, renewed: summary.renewed });
    } catch (err) {
      messageBox(win, { icon: 'error', title: t('run.failedTitle'), text: err.message });
    } finally {
      running = null;
      drawForm();
      drawBar();
    }
  }

  async function exportResults() {
    const folder = await pickFile(owner.openWindow, { kind: 'folder', title: t('file.whereTo') });
    if (!folder) return;
    const name = `${fs.cleanName(store.nameOf(entry), { portable: true }) || 'nettest'} ${new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')}.json`;
    const node = fs.create(folder.id, { type: 'file', name });
    const slim = results.map(({ response, ...r }) => ({ ...r, response: response && { status: response.status, statusText: response.statusText, headers: response.headers, size: response.size, timings: response.timings } }));
    await fs.write(node.id, `${JSON.stringify({ collection: store.nameOf(entry), at: new Date().toISOString(), summary, results: slim }, null, 2)}\n`);
    owner.notice(t('file.exported', { path: fs.tildePath(node.id) }));
  }

  win.on('destroy', () => { if (running) calls.cancelRun(running).catch(() => {}); });
  drawForm();
  drawBar();
  owner.openWindow(win);
  if (folderId && !find(c, folderId)) opts.folder = '';
}
