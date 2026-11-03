import { h, icon, calls, fs, resizeHandle, openMenu } from '@lilos/sdk';
import { pickFile } from '@lilos/system';
import { kvTable } from '../shared/kvTable.js';
import { trustPrompt } from '../shared/trustPrompt.js';
import { codeArea } from './code.js';
import { authForm } from './auth.js';
import { responseView } from './response.js';
import { cookieHeader, keepCookies } from './cookies.js';
import { METHODS, paramsOf, withParams, chainOf, effectiveAuth, environmentBody, varsOf, knownVars, resolveText, varNames, newCheck, newExtract, find, protocolOf } from './model.js';
import { store } from './store.js';
import { t } from './i18n.js';

/**
 * The editor of an HTTP or GraphQL request, with its response under it. The request is the item
 * of the collection itself: every change is the collection's (store.touch). Invia (Ctrl+Enter)
 * sends it through the kernel with the collection's variables, the chosen environment and the
 * globals; what the scripts and «save to variable» change comes back and is kept there.
 */
const SECTIONS = ['params', 'auth', 'headers', 'body', 'scripts', 'checks', 'settings'];
const BODY_KINDS = ['none', 'json', 'text', 'xml', 'html', 'form', 'multipart', 'file'];
const HEADERS = ['Accept', 'Accept-Encoding', 'Accept-Language', 'Authorization', 'Cache-Control', 'Content-Type', 'Cookie', 'If-Match', 'If-None-Match', 'If-Modified-Since', 'Origin', 'Prefer', 'Range', 'Referer', 'User-Agent', 'X-Api-Key', 'X-Correlation-Id', 'X-Request-Id', 'X-Requested-With'];
const TYPES = ['application/json', 'application/xml', 'application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain', 'text/html', 'application/octet-stream'];
const SOURCES = ['status', 'time', 'size', 'header', 'json', 'body'];
const OPS = ['eq', 'ne', 'lt', 'le', 'gt', 'ge', 'contains', 'notContains', 'exists', 'notExists', 'matches', 'in', 'type', 'empty', 'notEmpty'];
const SNIPPETS = {
  pre: [
    ['scripts.snip.setVar', "nt.environment.set('name', 'value');"],
    ['scripts.snip.timestamp', "nt.variables.set('now', String(Date.now()));"],
    ['scripts.snip.header', "nt.request.headers.upsert({ key: 'X-Request-Id', value: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()) });"],
  ],
  test: [
    ['scripts.snip.status', "nt.test('Lo stato è 200', () => {\n  nt.response.to.have.status(200);\n});"],
    ['scripts.snip.time', "nt.test('Risponde in meno di 500 ms', () => {\n  nt.expect(nt.response.responseTime).to.be.below(500);\n});"],
    ['scripts.snip.json', "nt.test('Il corpo ha un id', () => {\n  const body = nt.response.json();\n  nt.expect(body).to.have.property('id');\n});"],
    ['scripts.snip.save', "nt.environment.set('token', nt.response.json().token);"],
  ],
};

export const methodClass = m => `m-${String(m).toLowerCase().replace(/[^a-z]/g, '') || 'x'}`;

export class RequestView {
  #abort = null;
  #section = 'params';

  constructor(owner, key, item) {
    this.owner = owner;
    this.key = key;
    this.item = item;
    this.response = responseView({ onTrust: trust => this.#trust(trust) });
    this.el = h('div', { class: 'nx-request' });
    this.draw();
  }

  get collection() { return store.get(this.key)?.data; }
  touch() { store.touch(this.key); this.owner.itemChanged(this.key, this.item); }

  draw() {
    const it = this.item;
    const graphql = it.protocol === 'graphql';
    const method = h('select', { class: `nx-method ${methodClass(it.method)}`, 'aria-label': t('req.method'), onchange: () => { it.method = method.value; method.className = `nx-method ${methodClass(it.method)}`; this.touch(); } },
      ...[...new Set([...METHODS, it.method])].map(m => h('option', { value: m, selected: it.method === m }, m)));
    this.url = h('input', {
      class: 'nx-url', type: 'text', value: it.url, spellcheck: 'false', autocomplete: 'off', placeholder: 'https://api.example.com/{{path}}', 'aria-label': t('req.url'),
      oninput: () => { it.url = this.url.value; this.#syncParams(); this.#warnVars(); this.touch(); },
      onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); this.send(); } },
    });
    this.sendButton = h('button', { type: 'button', class: 'ctl-btn primary nx-send', onclick: () => (this.#abort ? this.cancel() : this.send()) }, icon('play'), t('req.send'));
    this.warn = h('div', { class: 'nx-varwarn' });
    const head = h('div', { class: 'nx-reqhead' },
      h('span', { class: `nx-proto p-${it.protocol}` }, protocolOf(it.protocol).label), method, this.url, this.sendButton,
      h('button', { type: 'button', class: 'ctl-btn', title: t('req.more'), onclick: e => this.#more(e) }, icon('list')));
    this.tabs = h('div', { class: 'nx-subtabs', role: 'tablist' });
    this.pane = h('div', { class: 'nx-reqpane' });
    const top = h('div', { class: 'nx-reqtop' }, head, this.warn, this.tabs, this.pane);
    const split = h('div', { class: 'nx-split' });
    if (RequestView.topHeight) top.style.flexBasis = `${RequestView.topHeight}px`;
    const handle = resizeHandle({
      orientation: 'horizontal', get: () => top.offsetHeight, min: 120, max: () => split.offsetHeight - 120, reset: () => { top.style.flexBasis = ''; RequestView.topHeight = 0; },
      set: px => { top.style.flexBasis = `${px}px`; RequestView.topHeight = px; }, label: t('req.resize'), host: split,
    });
    split.append(top, handle, this.response.el);
    this.el.replaceChildren(split);
    this.#drawTabs();
    this.#warnVars();
    if (graphql && this.#section === 'params') this.#section = 'body';
  }

  #drawTabs() {
    const it = this.item;
    const count = s => (s === 'params' ? paramsOf(it.url).length : s === 'headers' ? it.headers.filter(x => x.enabled !== false && x.key).length : s === 'checks' ? it.checks.length + it.extract.length : s === 'scripts' ? [it.scripts.pre, it.scripts.test].filter(x => x?.trim()).length : 0);
    this.tabs.replaceChildren(...SECTIONS.map(s => h('button', {
      type: 'button', role: 'tab', 'aria-selected': String(this.#section === s), class: this.#section === s ? 'on' : '',
      onclick: () => { this.#section = s; this.#drawTabs(); },
    }, t(s === 'body' && it.protocol === 'graphql' ? 'req.tab.graphql' : `req.tab.${s}`), count(s) ? h('span', { class: 'nx-count' }, String(count(s))) : null)));
    this.pane.replaceChildren(this[`section_${this.#section}`]());
  }

  #syncParams() {
    if (this.#section === 'params' && this.paramsTable && document.activeElement === this.url) {
      this.paramRows.splice(0, this.paramRows.length, ...paramsOf(this.item.url));
      this.paramsTable.render();
    }
  }

  #warnVars() {
    const known = new Set(knownVars(this.collection, store.env(this.key), store.globals).map(v => v.key));
    const it = this.item;
    const used = [it.url, ...it.headers.map(x => `${x.key}${x.value}`), it.body?.text, it.body?.query].flatMap(varNames);
    const unknown = [...new Set(used.filter(n => !known.has(n) && !n.startsWith('$')))];
    this.warn.replaceChildren(...(unknown.length ? [icon('warning'), t('req.unknownVars', { names: unknown.join(', ') })] : []));
    this.warn.hidden = !unknown.length;
  }

  // ---------- Sections ----------

  section_params() {
    this.paramRows = paramsOf(this.item.url);
    this.paramsTable = kvTable({
      t, rows: this.paramRows, mono: true, placeholder: { key: t('req.param'), value: t('req.value') },
      onChange: rows => { this.item.url = withParams(this.item.url, rows); this.url.value = this.item.url; this.touch(); this.#warnVars(); },
    });
    return h('div', { class: 'nx-sec' }, h('p', { class: 'nx-hint' }, t('req.paramsHint')), this.paramsTable.el);
  }

  section_auth() {
    const it = this.item;
    it.auth ??= { type: 'inherit' };
    const form = authForm({
      auth: it.auth, win: this.owner.win, onChange: () => this.touch(),
      inherited: () => {
        const c = this.collection;
        if (!c || !find(c, it.id)) return null;
        const { auth, from } = effectiveAuth(c, it.id);
        return { auth, name: from === c || !from ? store.nameOf(store.get(this.key)) : from.name };
      },
    });
    return h('div', { class: 'nx-sec' }, form.el);
  }

  section_headers() {
    const it = this.item;
    const table = kvTable({
      t, rows: it.headers, mono: true, keys: HEADERS, placeholder: { key: t('req.header'), value: t('req.value') },
      values: row => (/^content-type$/i.test(row.key) || /^accept$/i.test(row.key) ? TYPES : []),
      onChange: () => { this.touch(); this.#warnVars(); },
    });
    return h('div', { class: 'nx-sec' }, table.el, h('p', { class: 'nx-hint' }, t('req.headersHint')));
  }

  section_body() {
    const it = this.item;
    const b = it.body;
    if (it.protocol === 'graphql') {
      const query = codeArea({ value: b.query ?? '', lang: 'graphql', label: t('req.gql.query'), minLines: 8, onInput: v => { b.query = v; this.touch(); } });
      const variables = codeArea({ value: b.variables ?? '', lang: 'json', label: t('req.gql.variables'), minLines: 4, onInput: v => { b.variables = v; this.touch(); } });
      const schema = h('div', { class: 'nx-schema' });
      const load = h('button', { type: 'button', class: 'ctl-btn', onclick: () => this.#schema(schema, query) }, icon('list'), t('req.gql.schema'));
      return h('div', { class: 'nx-sec gql' },
        h('div', { class: 'nx-gqlmain' }, h('div', { class: 'nx-flabel' }, t('req.gql.query'), h('span', { class: 'nx-grow' }), load), query.el, h('div', { class: 'nx-flabel' }, t('req.gql.variables')), variables.el),
        schema);
    }
    const kinds = h('div', { class: 'nx-modes' }, ...BODY_KINDS.map(k => h('button', { type: 'button', class: b.kind === k ? 'on' : '', onclick: () => { b.kind = k; this.touch(); this.#drawTabs(); } }, t(`req.body.${k}`))));
    let content;
    if (b.kind === 'none') content = h('p', { class: 'nx-hint' }, t('req.body.noneHint', { method: it.method }));
    else if (b.kind === 'form' || b.kind === 'multipart') {
      b.fields ??= [];
      const table = kvTable({
        t, rows: b.fields, mono: true, placeholder: { key: t('req.field'), value: t('req.value') },
        columns: b.kind === 'multipart' ? [{ field: 'type', placeholder: t('req.body.fieldType'), width: 92, options: [{ value: 'text', label: t('req.body.fieldText') }, { value: 'file', label: t('req.body.fieldFile') }] }] : [],
        onChange: () => this.touch(),
      });
      const files = b.kind === 'multipart' ? h('div', { class: 'nx-files' }, ...b.fields.filter(f => f.type === 'file').map(f => this.#fileRow(f, 'file', () => this.#drawTabs()))) : null;
      content = h('div', {}, table.el, files, b.kind === 'multipart' ? h('p', { class: 'nx-hint' }, t('req.body.fileHint')) : null);
    } else if (b.kind === 'file') {
      content = h('div', {}, this.#fileRow(b, 'file', () => this.#drawTabs()), h('p', { class: 'nx-hint' }, t('req.body.binaryHint')));
    } else {
      const lang = { json: 'json', xml: 'html', html: 'html', text: 'text' }[b.kind] ?? 'text';
      const area = codeArea({ value: b.text ?? '', lang, label: t('req.tab.body'), minLines: 8, onInput: v => { b.text = v; this.touch(); this.#warnVars(); } });
      const tools = h('div', { class: 'nx-modes' }, h('span', { class: 'nx-grow' }), b.kind === 'json' ? h('button', {
        type: 'button', onclick: () => {
          try { area.setValue(JSON.stringify(JSON.parse(area.value), null, 2)); b.text = area.value; this.touch(); } catch (err) { this.owner.notice(t('req.body.badJson', { error: err.message })); }
        },
      }, t('req.body.format')) : null);
      content = h('div', {}, tools, area.el);
    }
    return h('div', { class: 'nx-sec' }, kinds, content);
  }

  /** A file of the home for a field ({ file: '~/…' }): its path and Scegli. */
  #fileRow(target, key, redraw) {
    const label = target[key] || (target.fileName ? t('req.file.missing', { name: target.fileName }) : t('req.file.none'));
    return h('div', { class: 'nx-filerow' }, icon('file'), h('span', { class: target[key] ? 'mono' : 'nx-dim' }, target.key ? `${target.key}: ${label}` : label),
      h('button', {
        type: 'button', class: 'ctl-btn', onclick: async () => {
          const node = await pickFile(this.owner.openWindow, { title: t('req.file.pick') });
          if (!node) return;
          target[key] = fs.tildePath(node.id);
          this.touch();
          redraw();
        },
      }, t('req.file.choose')));
  }

  section_scripts() {
    const it = this.item;
    const box = phase => {
      const area = codeArea({ value: it.scripts[phase] ?? '', lang: 'javascript', label: t(`scripts.${phase}`), minLines: 7, onInput: v => { it.scripts[phase] = v; this.touch(); } });
      const add = h('button', {
        type: 'button', class: 'nx-link', onclick: e => {
          const r = e.currentTarget.getBoundingClientRect();
          openMenu(r.left, r.bottom, SNIPPETS[phase].map(([label, code]) => ({ label: t(label), action: () => { area.setValue(`${area.value}${area.value && !area.value.endsWith('\n') ? '\n' : ''}${code}\n`); it.scripts[phase] = area.value; this.touch(); } })));
        },
      }, icon('plus'), t('scripts.snippets'));
      return h('div', { class: 'nx-scriptbox' }, h('div', { class: 'nx-flabel' }, t(`scripts.${phase}`), h('span', { class: 'nx-grow' }), add), area.el);
    };
    return h('div', { class: 'nx-sec' }, h('p', { class: 'nx-hint' }, t('scripts.hint')), box('pre'), box('test'));
  }

  section_checks() {
    const it = this.item;
    const list = h('div', { class: 'nx-checks' });
    const sel = (row, field, options, onChange) => {
      const s = h('select', { class: 'ctl-select', onchange: () => { row[field] = s.value; this.touch(); onChange?.(); } }, ...options.map(([v, l]) => h('option', { value: v, selected: String(row[field]) === v }, l)));
      return s;
    };
    const input = (row, field, ph, cls = '') => h('input', { class: `ctl-text mono ${cls}`, value: String(row[field] ?? ''), placeholder: ph, oninput: e => { row[field] = e.target.value; this.touch(); } });
    const del = (arr, row) => h('button', { type: 'button', class: 'nx-icon', title: t('checks.remove'), onclick: () => { arr.splice(arr.indexOf(row), 1); this.touch(); this.#drawTabs(); } }, icon('x'));
    const needsPath = s => s === 'header' || s === 'json';
    const draw = () => {
      list.replaceChildren(
        h('h4', {}, t('checks.title')),
        ...it.checks.map(c => h('div', { class: 'nx-check' },
          h('input', { type: 'checkbox', checked: c.enabled !== false, 'aria-label': t('checks.enabled'), onchange: e => { c.enabled = e.target.checked; this.touch(); } }),
          sel(c, 'source', SOURCES.map(s => [s, t(`checks.src.${s}`)]), draw),
          needsPath(c.source) ? input(c, 'path', c.source === 'json' ? '$.data.id' : 'Content-Type', 'path') : h('span', { class: 'path' }),
          sel(c, 'op', OPS.map(o => [o, t(`checks.op.${o}`)]), draw),
          ['exists', 'notExists', 'empty', 'notEmpty'].includes(c.op) ? h('span', { class: 'val' }) : input(c, 'value', t('checks.value'), 'val'),
          del(it.checks, c))),
        h('button', { type: 'button', class: 'nx-link', onclick: () => { it.checks.push(newCheck()); this.touch(); draw(); } }, icon('plus'), t('checks.add')),
        h('h4', {}, t('extract.title')),
        h('p', { class: 'nx-hint' }, t('extract.hint')),
        ...it.extract.map(x => h('div', { class: 'nx-check' },
          h('input', { type: 'checkbox', checked: x.enabled !== false, 'aria-label': t('checks.enabled'), onchange: e => { x.enabled = e.target.checked; this.touch(); } }),
          input(x, 'var', t('extract.var'), 'var'),
          h('span', { class: 'nx-dim' }, '←'),
          sel(x, 'source', ['json', 'header', 'body', 'status'].map(s => [s, t(`checks.src.${s}`)]), draw),
          x.source === 'status' ? h('span', { class: 'path' }) : input(x, x.source === 'body' ? 'regex' : 'path', x.source === 'json' ? '$.token' : x.source === 'header' ? 'Location' : 'id=(\\d+)', 'path'),
          sel(x, 'scope', ['environment', 'collection', 'globals'].map(s => [s, t(`vars.scope.${s}`)])),
          del(it.extract, x))),
        h('button', { type: 'button', class: 'nx-link', onclick: () => { it.extract.push(newExtract()); this.touch(); draw(); } }, icon('plus'), t('extract.add')),
      );
    };
    draw();
    return h('div', { class: 'nx-sec' }, list);
  }

  section_settings() {
    const s = this.item.settings ??= {};
    const row = (label, control, hint) => h('label', { class: 'nx-frow' }, h('span', { class: 'nx-flabel' }, label), h('span', { class: 'nx-fval' }, control, hint ? h('small', { class: 'nx-hint' }, hint) : null));
    const check = (key, def, label) => h('label', { class: 'nx-check1' }, h('input', { type: 'checkbox', checked: s[key] ?? def, onchange: e => { s[key] = e.target.checked; this.touch(); } }), label);
    const num = (key, ph, scale = 1) => h('input', { class: 'ctl-text', type: 'number', min: 0, value: s[key] === undefined ? '' : s[key] / scale, placeholder: ph, oninput: e => { if (e.target.value === '') delete s[key]; else s[key] = Number(e.target.value) * scale; this.touch(); } });
    const version = h('select', { class: 'ctl-select', onchange: () => { s.version = version.value; this.touch(); } }, ...[['auto', t('set.version.auto')], ['1.1', 'HTTP/1.1'], ['2', 'HTTP/2']].map(([v, l]) => h('option', { value: v, selected: (s.version ?? 'auto') === v }, l)));
    const file = key => h('span', { class: 'nx-filepick' }, h('input', { class: 'ctl-text mono', value: s[key] ?? '', placeholder: '~/…', oninput: e => { s[key] = e.target.value; this.touch(); } }),
      h('button', { type: 'button', class: 'ctl-btn', onclick: async e => { const node = await pickFile(this.owner.openWindow, { title: t('set.pickFile') }); if (node) { s[key] = fs.tildePath(node.id); e.target.closest('.nx-filepick').querySelector('input').value = s[key]; this.touch(); } } }, t('req.file.choose')));
    return h('div', { class: 'nx-sec nx-settings' },
      row(t('set.timeout'), num('timeoutMs', '30', 1000), t('set.timeoutHint')),
      row(t('set.redirects'), h('span', { class: 'nx-inline' }, check('followRedirects', true, t('set.follow')), num('maxRedirects', '10'))),
      row(t('set.version'), version),
      row(t('set.tls'), check('verify', true, t('set.verify')), t('set.verifyHint')),
      row(t('set.decode'), check('decode', true, t('set.decodeLabel'))),
      row(t('set.cookies'), check('cookies', true, t('set.cookiesLabel'))),
      row(t('set.cert'), file('cert'), t('set.certHint')),
      row(t('set.key'), file('key')),
      row(t('set.passphrase'), h('input', { class: 'ctl-text mono', value: s.passphrase ?? '', placeholder: '{{passphrase}}', oninput: e => { s.passphrase = e.target.value; this.touch(); } })),
      row(t('set.ca'), file('ca'), t('set.caHint')),
      row(t('set.maxBody'), num('maxBody', '20', 1 << 20), t('set.maxBodyHint')));
  }

  // ---------- GraphQL schema ----------

  async #schema(box, query) {
    box.replaceChildren(h('span', { class: 'nx-spin' }));
    const it = this.item;
    const probe = { ...structuredClone(it), body: { kind: 'graphql', query: INTROSPECTION, variables: '' }, scripts: { pre: '', test: '' }, checks: [], extract: [] };
    try {
      const { result } = await calls.send(this.#body(probe));
      const json = result.response ? JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(result.response.body), c => c.charCodeAt(0)))) : null;
      const types = json?.data?.__schema?.types;
      if (!types) throw new Error(result.error?.message ?? t('req.gql.noSchema'));
      const roots = [json.data.__schema.queryType?.name, json.data.__schema.mutationType?.name, json.data.__schema.subscriptionType?.name].filter(Boolean);
      const typeName = ty => (ty?.kind === 'NON_NULL' ? `${typeName(ty.ofType)}!` : ty?.kind === 'LIST' ? `[${typeName(ty.ofType)}]` : ty?.name ?? '?');
      const shown = types.filter(x => !x.name.startsWith('__') && x.fields).sort((a, b) => (roots.includes(b.name) - roots.includes(a.name)) || a.name.localeCompare(b.name));
      box.replaceChildren(h('input', { class: 'ctl-text nx-wide', type: 'search', placeholder: t('req.gql.filter'), oninput: e => { const q = e.target.value.toLowerCase(); box.querySelectorAll('.nx-gqlf').forEach(f => { f.hidden = q && !f.textContent.toLowerCase().includes(q); }); } }),
        ...shown.map(ty => h('details', { open: roots.includes(ty.name) }, h('summary', {}, ty.name),
          ...ty.fields.map(f => h('button', {
            type: 'button', class: 'nx-gqlf', title: f.description ?? '',
            onclick: () => { const i = query.input; i.focus(); i.setRangeText(f.name, i.selectionStart, i.selectionEnd, 'end'); i.dispatchEvent(new Event('input')); },
          }, h('b', {}, f.name), f.args?.length ? `(${f.args.map(a => `${a.name}: ${typeName(a.type)}`).join(', ')})` : '', h('small', {}, `: ${typeName(f.type)}`))))));
    } catch (err) {
      box.replaceChildren(h('p', { class: 'nx-hint warn' }, err.message));
    }
  }

  // ---------- Sending ----------

  /** What the kernel gets for this request (or a variation of it). */
  #body(item = this.item) {
    const entry = store.get(this.key);
    const c = entry?.data;
    const env = store.env(this.key);
    const request = structuredClone(item);
    if (request.settings?.cookies !== false && !request.headers.some(x => x.enabled !== false && /^cookie$/i.test(x.key))) {
      const jar = cookieHeader(resolveText(request.url, knownVars(c, env, store.globals)));
      if (jar) request.headers.push({ key: 'Cookie', value: jar, enabled: true });
    }
    return {
      request, chain: c && find(c, item.id) ? chainOf(c, item.id) : [{ auth: c?.auth ?? { type: 'none' }, scripts: c?.scripts ?? {} }],
      environment: environmentBody(env), collection: { values: varsOf(c?.variables) }, globals: { values: varsOf(store.globals) },
    };
  }

  async send() {
    if (this.#abort) return;
    const it = this.item;
    this.#abort = new AbortController();
    this.sendButton.replaceChildren(icon('stop'), t('req.cancel'));
    this.response.busy(true);
    const started = Date.now();
    try {
      const answer = await calls.send(this.#body(), { signal: this.#abort.signal });
      this.owner.applyResult(this.key, answer);
      const r = answer.result;
      if (r.response) keepCookies(r.response.url ?? resolveText(it.url, knownVars(this.collection, store.env(this.key), store.globals)), r.response.headers);
      this.response.show(r);
      store.addHistory({
        id: `${started}`, at: started, key: this.key, item: it.id, name: it.name, protocol: it.protocol, method: r.request?.method ?? it.method,
        url: r.request?.url ?? it.url, status: r.response?.status ?? null, ms: r.response?.timings?.total ?? r.ms, error: r.error?.message ?? null, ok: r.ok,
        snapshot: JSON.stringify(it).length < 64 << 10 ? structuredClone(it) : null,
      });
    } catch (err) {
      if (err?.code === 'canceled') this.response.message(t('req.cancelled'));
      else this.response.show({ error: { code: err.code ?? 'internal', message: err.message }, checks: [], tests: [], logs: [], redirects: [] });
    } finally {
      this.#abort = null;
      this.sendButton.replaceChildren(icon('play'), t('req.send'));
    }
  }

  cancel() { this.#abort?.abort(); }

  async #trust(trust) {
    if (!await trustPrompt(this.owner.win, trust, { t })) return;
    await calls.trust(trust);
    this.send();
  }

  #more(e) {
    const r = e.currentTarget.getBoundingClientRect();
    openMenu(r.right - 200, r.bottom, [
      { label: t('req.copyCode'), icon: 'code', action: () => this.owner.copyAsCode(this.key, this.item) },
      { label: t('req.duplicate'), icon: 'filePlus', action: () => this.owner.duplicate(this.key, this.item.id) },
      { label: t('req.schedule'), icon: 'clock', action: () => this.owner.schedule(this.key, this.item.id) },
    ]);
  }

  focus() { this.url?.focus(); }
  destroy() { this.cancel(); }
}

const INTROSPECTION = `query IntrospectionQuery { __schema { queryType { name } mutationType { name } subscriptionType { name }
  types { kind name description fields(includeDeprecated: true) { name description args { name type { ...T } } type { ...T } } } } }
fragment T on __Type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }`;
