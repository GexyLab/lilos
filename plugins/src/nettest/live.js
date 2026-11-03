import { h, icon, calls, formatBytes } from '@lilos/sdk';
import { kvTable } from '../shared/kvTable.js';
import { trustPrompt } from '../shared/trustPrompt.js';
import { codeArea } from './code.js';
import { responseView } from './response.js';
import { environmentBody, varsOf, chainOf, find, newId, protocolOf } from './model.js';
import { store } from './store.js';
import { t } from './i18n.js';

/**
 * A live session (WebSocket, SSE, TCP, TLS, UDP, MQTT) or a gRPC call: the kernel keeps the
 * connection (calls/sessions.js), this shows its messages and sends what the user writes. Closing
 * the window leaves the session open for 10 minutes: opening the request again finds it.
 *
 * gRPC: the methods come from the server (reflection) or from a .proto text; a unary method is
 * one call (Invoca, as an HTTP request: checks and scripts too), the streaming ones a session.
 */
const FORMATS = ['text', 'json', 'hex', 'base64'];
const MAX_SHOWN = 2000;

const toBase64 = bytes => btoa(String.fromCharCode(...bytes));
const fromHex = text => {
  const clean = text.replace(/0x|[\s,:]/gi, '');
  if (!/^(?:[0-9a-f]{2})*$/i.test(clean)) throw new Error(t('live.badHex'));
  return Uint8Array.from(clean.match(/../g) ?? [], b => parseInt(b, 16));
};
const hexOf = b64 => [...atob(b64)].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
const pretty = text => { try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; } };
const time = at => new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });

export class LiveView {
  #port = null;
  #items = [];
  #session = null;
  #tab = 'messages';
  #filter = '';
  #format = 'text';
  #schema = null;
  #waiting = new Map();

  constructor(owner, key, item) {
    this.owner = owner;
    this.key = key;
    this.item = item;
    this.el = h('div', { class: 'nx-live' });
    this.response = item.protocol === 'grpc' ? responseView({ onTrust: tr => this.#trust(tr) }) : null;
    this.draw();
    this.#reattach();
  }

  get collection() { return store.get(this.key)?.data; }
  get protocol() { return this.item.protocol; }
  touch() { store.touch(this.key); this.owner.itemChanged(this.key, this.item); }
  get #method() { return this.#schema?.services.find(s => s.name === this.item.values.service)?.methods.find(m => m.name === this.item.values.method) ?? null; }
  get #streaming() { const m = this.#method; return !!(m && (m.clientStreaming || m.serverStreaming)); }

  async #reattach() {
    try {
      const open = (await calls.sessions()).find(s => s.request === this.item.id && s.state !== 'closed');
      if (open) this.#attach(open);
    } catch { /* the kernel says so when the user connects */ }
  }

  draw() {
    const it = this.item;
    const v = it.values ??= {};
    const hostport = ['tcp', 'tls', 'udp'].includes(this.protocol);
    const addr = hostport
      ? [h('input', { class: 'nx-url', value: v.host ?? '', placeholder: t('live.host'), 'aria-label': t('live.host'), spellcheck: 'false', oninput: e => { v.host = e.target.value; this.touch(); } }),
        h('input', { class: 'nx-port', value: v.port ?? '', placeholder: t('live.port'), 'aria-label': t('live.port'), inputmode: 'numeric', oninput: e => { v.port = e.target.value; this.touch(); } })]
      : [h('input', {
        class: 'nx-url', value: it.url ?? '', spellcheck: 'false', 'aria-label': t('req.url'),
        placeholder: { ws: 'wss://echo.example.com/socket', sse: 'https://example.com/events', mqtt: 'mqtts://broker.example.com:8883', grpc: 'grpcs://api.example.com:443' }[this.protocol] ?? '',
        oninput: e => { it.url = e.target.value; this.touch(); }, onkeydown: e => { if (e.key === 'Enter') this.connect(); },
      })];
    this.button = h('button', { type: 'button', class: 'ctl-btn primary nx-send', onclick: () => this.connect() });
    this.state = h('span', { class: 'nx-livestate' });
    this.tabs = h('div', { class: 'nx-subtabs', role: 'tablist' });
    this.pane = h('div', { class: 'nx-livepane' });
    this.el.replaceChildren(h('div', { class: 'nx-reqhead' }, h('span', { class: `nx-proto p-${this.protocol}` }, protocolOf(this.protocol).label), ...addr, this.button), this.state, this.tabs, this.pane, ...(this.response ? [this.response.el] : []));
    this.#drawState();
    this.#drawTabs();
  }

  #tabsList() {
    switch (this.protocol) {
      case 'ws': return ['messages', 'headers', 'settings'];
      case 'sse': return ['messages', 'headers', 'settings'];
      case 'mqtt': return ['messages', 'subscriptions', 'client', 'settings'];
      case 'grpc': return ['service', 'messages', 'metadata', 'settings'];
      case 'udp': return ['messages'];
      default: return ['messages', 'settings'];
    }
  }

  #drawTabs() {
    const list = this.#tabsList();
    if (!list.includes(this.#tab)) this.#tab = list[0];
    this.tabs.replaceChildren(...list.map(s => h('button', { type: 'button', role: 'tab', 'aria-selected': String(this.#tab === s), class: this.#tab === s ? 'on' : '', onclick: () => { this.#tab = s; this.#drawTabs(); } },
      t(`live.tab.${s}`), s === 'messages' && this.#items.length ? h('span', { class: 'nx-count' }, String(this.#items.filter(i => i.dir !== 'sys').length)) : null)));
    this.pane.replaceChildren(this[`tab_${this.#tab}`]());
  }

  #drawState() {
    const s = this.#session;
    const on = s?.state === 'on' || s?.state === 'connecting';
    const grpcUnary = this.protocol === 'grpc' && !this.#streaming;
    this.button.replaceChildren(...(grpcUnary ? [icon('play'), t('live.invoke')] : on ? [icon('stop'), t('live.disconnect')] : [icon('play'), t(this.protocol === 'grpc' ? 'live.openStream' : 'live.connect')]));
    this.button.classList.toggle('danger', on && !grpcUnary);
    const info = s?.info ?? {};
    this.state.replaceChildren(...(s ? [h('span', { class: `nx-dot st-${s.state}` }), t(`live.state.${s.state}`), s.reason ? ` · ${s.reason}` : '',
      info.protocol ? ` · ${t('live.subprotocol', { name: info.protocol })}` : '', info.remote ? ` · ${info.remote}` : '', info.tls?.protocol ? ` · ${info.tls.protocol}` : '',
      info.clientId ? ` · ${info.clientId}` : '', s.closesAt ? ` · ${t('live.closesAt', { time: new Date(s.closesAt).toLocaleTimeString() })}` : ''] : [t('live.idle')]));
  }

  // ---------- Tabs ----------

  tab_messages() {
    const it = this.item;
    const log = h('div', { class: 'nx-log', role: 'log', 'aria-live': 'polite' });
    this.log = log;
    this.#drawLog();
    const tools = h('div', { class: 'nx-modes' },
      h('input', { class: 'ctl-text', type: 'search', placeholder: t('live.filter'), value: this.#filter, oninput: e => { this.#filter = e.target.value.toLowerCase(); this.#drawLog(); } }),
      h('span', { class: 'nx-grow' }),
      this.protocol === 'ws' ? h('button', { type: 'button', class: 'ctl-btn', disabled: this.#session?.state !== 'on', onclick: () => this.#command('ping') }, t('live.ping')) : null,
      ['tcp', 'tls'].includes(this.protocol) ? h('button', { type: 'button', class: 'ctl-btn', disabled: this.#session?.state !== 'on', onclick: () => this.#command('end') }, t('live.halfClose')) : null,
      this.protocol === 'grpc' && this.#streaming ? h('button', { type: 'button', class: 'ctl-btn', disabled: this.#session?.state !== 'on', onclick: () => this.#command('end') }, t('live.endStream')) : null,
      h('button', { type: 'button', class: 'ctl-btn', onclick: () => { this.#items = []; this.#drawLog(); } }, t('live.clear')));
    const parts = [tools, log];
    if (this.protocol !== 'sse') parts.push(this.#compose());
    if (this.protocol === 'grpc' && !this.#streaming) return h('div', { class: 'nx-sec' }, h('p', { class: 'nx-hint' }, t('live.grpcUnaryHint')), this.#compose());
    return h('div', { class: 'nx-msgs' }, ...parts);
  }

  #compose() {
    const it = this.item;
    it.messages ??= [];
    const draft = this.draft ??= { type: this.protocol === 'grpc' ? 'json' : 'text', data: this.protocol === 'grpc' ? it.values.message ?? '{}' : '', topic: it.values.lastTopic ?? '', qos: 0, retain: false };
    const area = codeArea({ value: draft.data, lang: this.#format === 'json' || this.protocol === 'grpc' ? 'json' : 'text', label: t('live.message'), minLines: 3, onInput: v => { draft.data = v; if (this.protocol === 'grpc') { it.values.message = v; this.touch(); } } });
    const format = this.protocol === 'grpc' ? null : h('select', { class: 'ctl-select', 'aria-label': t('live.format'), onchange: e => { this.#format = e.target.value; area.setLang(this.#format === 'json' ? 'json' : 'text'); } },
      ...FORMATS.map(f => h('option', { value: f, selected: this.#format === f }, t(`live.fmt.${f}`))));
    const mqtt = this.protocol === 'mqtt' ? [
      h('input', { class: 'ctl-text mono', placeholder: t('live.mqtt.topic'), value: draft.topic, oninput: e => { draft.topic = e.target.value; it.values.lastTopic = draft.topic; } }),
      h('select', { class: 'ctl-select', 'aria-label': 'QoS', onchange: e => { draft.qos = Number(e.target.value); } }, ...[0, 1, 2].map(q => h('option', { value: q, selected: draft.qos === q }, `QoS ${q}`))),
      h('label', { class: 'nx-check1' }, h('input', { type: 'checkbox', checked: draft.retain, onchange: e => { draft.retain = e.target.checked; } }), t('live.mqtt.retain'))] : [];
    const send = h('button', { type: 'button', class: 'ctl-btn primary', onclick: () => this.send(area.value) }, icon('arrowRight'), t('live.send'));
    area.input.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.send(area.value); } });
    const saved = h('div', { class: 'nx-saved' }, ...it.messages.map(m => h('span', { class: 'nx-chip' },
      h('button', { type: 'button', title: m.data.slice(0, 200), onclick: () => { area.setValue(m.data); draft.data = m.data; if (m.meta?.topic) draft.topic = m.meta.topic; } }, m.name || m.data.slice(0, 24)),
      h('button', { type: 'button', class: 'x', title: t('live.unsave'), onclick: () => { it.messages.splice(it.messages.indexOf(m), 1); this.touch(); this.#drawTabs(); } }, icon('x')))),
    h('button', { type: 'button', class: 'nx-link', onclick: () => { if (!area.value) return; it.messages.push({ id: newId(), name: area.value.slice(0, 24), type: this.#format, data: area.value, ...(draft.topic && { meta: { topic: draft.topic } }) }); this.touch(); this.#drawTabs(); } }, icon('save'), t('live.save')));
    return h('div', { class: 'nx-compose' }, h('div', { class: 'nx-modes' }, format, ...mqtt, h('span', { class: 'nx-grow' }), this.protocol === 'grpc' && !this.#streaming ? null : send), area.el, this.protocol === 'grpc' && !this.#streaming ? null : saved);
  }

  #drawLog() {
    if (!this.log) return;
    const shown = this.#items.filter(i => !this.#filter || i.data.toLowerCase().includes(this.#filter) || JSON.stringify(i.meta ?? {}).toLowerCase().includes(this.#filter)).slice(-MAX_SHOWN);
    const stick = this.log.scrollHeight - this.log.scrollTop - this.log.clientHeight < 40;
    this.log.replaceChildren(...(shown.length ? shown.map(i => this.#row(i)) : [h('p', { class: 'nx-dim' }, t('live.noMessages'))]));
    if (stick) this.log.scrollTop = this.log.scrollHeight;
  }

  #row(i) {
    const text = i.type === 'binary' ? hexOf(i.data) : i.type === 'json' || /^\s*[{[]/.test(i.data) ? pretty(i.data) : i.data;
    const meta = i.meta ?? {};
    const tags = [meta.event && meta.event !== 'message' ? meta.event : null, meta.id !== undefined ? `id ${meta.id}` : null, meta.topic ?? null, meta.qos ? `QoS ${meta.qos}` : null, meta.retain ? 'retain' : null, meta.from ?? null,
      meta.status !== undefined ? `status ${meta.status}` : null, i.type === 'binary' ? formatBytes(atob(i.data).length) : null].filter(Boolean);
    const row = h('div', { class: `nx-msg d-${i.dir} ty-${i.type}` },
      h('span', { class: 'nx-msgtime' }, time(i.at)),
      h('span', { class: 'nx-msgdir', title: t(`live.dir.${i.dir}`) }, i.dir === 'in' ? '↓' : i.dir === 'out' ? '↑' : '•'),
      h('div', { class: 'nx-msgbody' }, tags.length ? h('div', { class: 'nx-msgtags' }, ...tags.map(x => h('span', {}, x))) : null, h('pre', {}, text.length > 20000 ? `${text.slice(0, 20000)}…` : text)));
    if (meta.trust) row.append(h('button', { type: 'button', class: 'ctl-btn', onclick: () => this.#trust(meta.trust) }, icon('shield'), t('res.trust')));
    return row;
  }

  tab_headers() {
    const it = this.item;
    const table = kvTable({ t, rows: it.headers, mono: true, placeholder: { key: t('req.header'), value: t('req.value') }, onChange: () => this.touch() });
    const parts = [table.el];
    if (this.protocol === 'ws') parts.unshift(h('label', { class: 'nx-frow' }, h('span', { class: 'nx-flabel' }, t('live.ws.protocols')),
      h('input', { class: 'ctl-text mono nx-wide', value: it.values.protocols ?? '', placeholder: 'graphql-transport-ws, v1.chat', oninput: e => { it.values.protocols = e.target.value; this.touch(); } })));
    return h('div', { class: 'nx-sec' }, ...parts);
  }

  tab_metadata() {
    const it = this.item;
    const table = kvTable({ t, rows: it.headers, mono: true, placeholder: { key: t('live.grpc.metaKey'), value: t('req.value') }, onChange: () => this.touch() });
    return h('div', { class: 'nx-sec' }, h('p', { class: 'nx-hint' }, t('live.grpc.metaHint')), table.el);
  }

  tab_settings() {
    const s = this.item.settings ??= {};
    const v = this.item.values;
    const rows = [h('label', { class: 'nx-check1' }, h('input', { type: 'checkbox', checked: s.verify !== false, onchange: e => { s.verify = e.target.checked; this.touch(); } }), t('set.verify')), h('small', { class: 'nx-hint' }, t('set.verifyHint'))];
    if (this.protocol === 'tls') rows.push(h('label', { class: 'nx-frow' }, h('span', { class: 'nx-flabel' }, t('live.tls.servername')), h('input', { class: 'ctl-text mono', value: v.servername ?? '', oninput: e => { v.servername = e.target.value; this.touch(); } })),
      h('label', { class: 'nx-frow' }, h('span', { class: 'nx-flabel' }, 'ALPN'), h('input', { class: 'ctl-text mono', value: v.alpn ?? '', placeholder: 'h2, http/1.1', oninput: e => { v.alpn = e.target.value; this.touch(); } })));
    if (this.protocol === 'grpc') rows.push(h('label', { class: 'nx-frow' }, h('span', { class: 'nx-flabel' }, t('set.timeout')), h('input', { class: 'ctl-text', type: 'number', value: s.timeoutMs ? s.timeoutMs / 1000 : '', placeholder: '30', oninput: e => { s.timeoutMs = e.target.value ? Number(e.target.value) * 1000 : undefined; this.touch(); } })));
    return h('div', { class: 'nx-sec nx-settings' }, ...rows);
  }

  tab_client() {
    const v = this.item.values;
    const field = (key, label, { type = 'text', ph = '' } = {}) => h('label', { class: 'nx-frow' }, h('span', { class: 'nx-flabel' }, label),
      h('input', { class: 'ctl-text mono', type, value: v[key] ?? '', placeholder: ph, oninput: e => { v[key] = type === 'number' ? Number(e.target.value) : e.target.value; this.touch(); } }));
    return h('div', { class: 'nx-sec nx-settings' },
      h('label', { class: 'nx-frow' }, h('span', { class: 'nx-flabel' }, t('live.mqtt.version')), h('select', { class: 'ctl-select', onchange: e => { v.version = e.target.value; this.touch(); } }, ...['5', '3.1.1'].map(x => h('option', { value: x, selected: String(v.version ?? '5') === x }, `MQTT ${x}`)))),
      field('clientId', t('live.mqtt.clientId'), { ph: t('live.mqtt.clientIdHint') }),
      field('username', t('auth.user')),
      field('password', t('auth.password'), { type: 'password', ph: '{{mqttPassword}}' }),
      field('keepalive', t('live.mqtt.keepalive'), { type: 'number', ph: '60' }),
      h('label', { class: 'nx-check1' }, h('input', { type: 'checkbox', checked: v.clean !== false, onchange: e => { v.clean = e.target.checked; this.touch(); } }), t('live.mqtt.clean')));
  }

  tab_subscriptions() {
    const v = this.item.values;
    v.subscriptions ??= [];
    const on = this.#session?.state === 'on';
    const list = h('div', { class: 'nx-subs' }, ...v.subscriptions.map(s => h('div', { class: 'nx-sub' },
      h('code', {}, s.topic), h('span', { class: 'nx-dim' }, `QoS ${s.qos ?? 0}`), h('span', { class: 'nx-grow' }),
      h('button', { type: 'button', class: 'nx-icon', title: t('live.mqtt.unsubscribe'), onclick: async () => { if (on) await this.#command('unsubscribe', { topic: s.topic }).catch(() => {}); v.subscriptions.splice(v.subscriptions.indexOf(s), 1); this.touch(); this.#drawTabs(); } }, icon('x')))));
    const topic = h('input', { class: 'ctl-text mono', placeholder: 'sensors/+/temperature' });
    const qos = h('select', { class: 'ctl-select' }, ...[0, 1, 2].map(q => h('option', { value: q }, `QoS ${q}`)));
    const add = async () => {
      if (!topic.value.trim()) return;
      const sub = { topic: topic.value.trim(), qos: Number(qos.value) };
      if (on) await this.#command('subscribe', sub).catch(err => this.owner.notice(err.message));
      v.subscriptions.push(sub);
      this.touch();
      this.#drawTabs();
    };
    return h('div', { class: 'nx-sec' }, h('p', { class: 'nx-hint' }, t('live.mqtt.subsHint')), list, h('div', { class: 'nx-modes' }, topic, qos, h('button', { type: 'button', class: 'ctl-btn', onclick: add }, icon('plus'), t('live.mqtt.subscribe'))));
  }

  tab_service() {
    const v = this.item.values;
    const box = h('div', { class: 'nx-sec' });
    const services = this.#schema?.services ?? [];
    const svc = h('select', { class: 'ctl-select', onchange: e => { v.service = e.target.value; v.method = services.find(s => s.name === v.service)?.methods[0]?.name ?? ''; this.#pickMethod(); } },
      h('option', { value: '' }, t('live.grpc.service')), ...services.map(s => h('option', { value: s.name, selected: v.service === s.name }, s.name)));
    const methods = services.find(s => s.name === v.service)?.methods ?? [];
    const met = h('select', { class: 'ctl-select', onchange: e => { v.method = e.target.value; this.#pickMethod(); } },
      h('option', { value: '' }, t('live.grpc.method')), ...methods.map(m => h('option', { value: m.name, selected: v.method === m.name }, `${m.name}${m.clientStreaming || m.serverStreaming ? ` (${[m.clientStreaming && 'client', m.serverStreaming && 'server'].filter(Boolean).join('+')} stream)` : ''}`)));
    const proto = codeArea({ value: v.proto ?? '', lang: 'text', label: t('live.grpc.proto'), minLines: 6, onInput: x => { v.proto = x; this.touch(); } });
    box.append(
      h('div', { class: 'nx-modes' }, h('button', { type: 'button', class: 'ctl-btn', onclick: () => this.#describe(false) }, icon('download'), t('live.grpc.reflect')),
        h('button', { type: 'button', class: 'ctl-btn', onclick: () => this.#describe(true) }, icon('file'), t('live.grpc.fromProto')), this.describing ? h('span', { class: 'nx-spin' }) : null),
      this.describeError ? h('p', { class: 'nx-hint warn' }, this.describeError) : null,
      h('div', { class: 'nx-modes' }, svc, met),
      v.service && !services.length ? h('p', { class: 'nx-hint' }, t('live.grpc.saved', { service: v.service, method: v.method })) : null,
      h('div', { class: 'nx-flabel' }, t('live.grpc.proto')), proto.el, h('p', { class: 'nx-hint' }, t('live.grpc.protoHint')));
    return box;
  }

  #pickMethod() {
    const m = this.#method;
    if (m?.requestExample !== undefined && (!this.item.values.message || this.item.values.message.trim() === '{}' || this.item.values.message.trim() === '{\n  \n}')) {
      this.item.values.message = JSON.stringify(m.requestExample, null, 2);
      this.draft = null;
    }
    this.touch();
    this.#drawState();
    this.#drawTabs();
  }

  async #describe(fromProto) {
    this.describing = true;
    this.describeError = '';
    this.#drawTabs();
    try {
      const body = this.#body();
      if (!fromProto) body.request.values = { ...body.request.values, proto: '' };
      this.#schema = await calls.describe(body);
    } catch (err) {
      this.describeError = err.message;
    } finally {
      this.describing = false;
      this.#drawState();
      this.#drawTabs();
    }
  }

  // ---------- Connecting ----------

  #body() {
    const c = this.collection;
    const env = store.env(this.key);
    return {
      request: structuredClone(this.item), chain: c && find(c, this.item.id) ? chainOf(c, this.item.id) : [],
      environment: environmentBody(env), collection: { values: varsOf(c?.variables) }, globals: { values: varsOf(store.globals) },
    };
  }

  async connect() {
    const s = this.#session;
    if (this.protocol === 'grpc' && !this.#streaming) return this.#invoke();
    if (s && (s.state === 'on' || s.state === 'connecting')) {
      await calls.closeSession(s.id).catch(() => {});
      return;
    }
    try {
      this.#items = [];
      const session = await calls.openSession(this.#body());
      this.#attach(session);
    } catch (err) {
      this.#items.push({ n: 0, at: Date.now(), dir: 'sys', type: 'error', data: err.message });
      this.#drawLog();
    }
  }

  async #invoke() {
    if (!this.item.values.method) return this.owner.notice(t('live.grpc.pick'));
    this.response.busy(true);
    try {
      const answer = await calls.send(this.#body());
      this.owner.applyResult(this.key, answer);
      this.response.show(answer.result);
    } catch (err) {
      this.response.show({ error: { code: err.code ?? 'internal', message: err.message }, checks: [], tests: [], logs: [], redirects: [] });
    }
  }

  #attach(session) {
    this.#port?.detach?.();
    this.#session = session;
    const port = calls.attach(session.id);
    this.#port = port;
    port.onmessage = e => {
      if (this.#port !== port) return;
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 'state') {
        const subscribe = this.protocol === 'mqtt' && m.session.state === 'on' && this.#session?.state !== 'on';
        this.#session = m.session;
        this.#drawState();
        if (subscribe) for (const sub of this.item.values.subscriptions ?? []) this.#command('subscribe', sub).catch(() => {});
        if (this.#tab === 'messages') this.#drawTabs();
      } else if (m.t === 'history') {
        this.#items = m.items;
        this.#drawLog();
      } else if (m.t === 'msg') {
        this.#items.push(m.item);
        if (this.#items.length > 5000) this.#items.splice(0, 1000);
        this.#drawLog();
        if (m.item.meta?.trust) this.#trust(m.item.meta.trust, true);
      } else if (m.t === 'result') {
        const w = this.#waiting.get(m.id);
        this.#waiting.delete(m.id);
        if (m.error) w?.reject(new Error(m.error.message)); else w?.resolve(m.result);
      } else if (m.t === 'taken') {
        this.#session = { ...this.#session, state: 'closed', reason: t('live.taken') };
        this.#drawState();
      } else if (m.t === 'gone') {
        if (this.#port === port) this.#port = null;
      }
    };
  }

  #command(name, args = null) {
    if (!this.#port) return Promise.reject(new Error(t('live.notConnected')));
    const id = newId();
    this.#port.postMessage(JSON.stringify({ t: 'command', id, name, args }));
    return new Promise((resolve, reject) => {
      this.#waiting.set(id, { resolve, reject });
      setTimeout(() => { if (this.#waiting.delete(id)) reject(new Error(t('live.noAnswer'))); }, 15_000);
    });
  }

  send(text) {
    if (!this.#port || this.#session?.state !== 'on') return this.owner.notice(t('live.notConnected'));
    let msg;
    try {
      const fmt = this.protocol === 'grpc' ? 'json' : this.#format;
      if (fmt === 'hex') msg = { type: 'binary', data: toBase64(fromHex(text)) };
      else if (fmt === 'base64') msg = { type: 'binary', data: text.replace(/\s+/g, '') };
      else if (fmt === 'json') { JSON.parse(text); msg = { type: 'json', data: text }; } else msg = { type: 'text', data: text };
    } catch (err) {
      return this.owner.notice(err.message);
    }
    if (this.protocol === 'mqtt') {
      const d = this.draft;
      if (!d?.topic) return this.owner.notice(t('live.mqtt.noTopic'));
      msg.meta = { topic: d.topic, qos: d.qos ?? 0, retain: !!d.retain };
    }
    this.#port.postMessage(JSON.stringify({ t: 'send', msg }));
  }

  async #trust(trust, reconnect = false) {
    if (!await trustPrompt(this.owner.win, trust, { t })) return;
    await calls.trust(trust);
    if (reconnect || this.protocol !== 'grpc') this.connect();
    else this.#invoke();
  }

  focus() { this.el.querySelector('.nx-url')?.focus(); }

  destroy() {
    // The session stays in the kernel (10 minutes): only this view goes
    this.#port?.detach?.();
    this.#port = null;
  }
}
