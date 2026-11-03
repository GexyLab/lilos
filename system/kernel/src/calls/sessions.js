import { randomBytes } from 'node:crypto';
import { fail } from '../errors.js';
import { errorOf } from './request.js';

/**
 * NetTest's live sessions (WebSocket, SSE, TCP, TLS, UDP, and the modules' protocols: gRPC streams,
 * MQTT): open in the kernel, as the Terminal's sessions are (term/terminals.js), with the same rules:
 * at most MAX_SESSIONS per user, a session nobody looks at closes after DETACHED_FOR, a page that
 * comes back gets the messages again (the last MAX_KEPT, MAX_BYTES at most).
 *
 *   session  { id, name, protocol, address, state: 'new' | 'connecting' | 'on' | 'closed', reason,
 *              created, attached, closesAt, info, count }
 *   message  { n, at, dir: 'in' | 'out' | 'sys', type, data, meta? }
 *
 * The page attaches with a WebSocket (api/calls.js); text messages, JSON:
 *   from the kernel  { t: 'state', session } · { t: 'history', items } · { t: 'msg', item } ·
 *                    { t: 'result', id, result | error } · { t: 'taken' }
 *   from the page    { t: 'send', msg } · { t: 'command', id, name, args }
 * A session connects when a page first attaches. Events for the user's pages: 'calls.sessions' {}.
 */
const MAX_SESSIONS = 10;
const DETACHED_FOR = 10 * 60_000;
const MAX_KEPT = 2000;
const MAX_BYTES = 8 << 20;
const MAX_SEND = 16 << 20;

const newId = () => randomBytes(8).toString('hex');

export class CallSessions {
  #calls;
  #sessions = new Map();

  constructor(calls) {
    this.#calls = calls;
  }

  #mine(principal) {
    return [...this.#sessions.values()].filter(s => s.owner === principal.id);
  }

  list(principal) {
    return this.#mine(principal).map(s => s.view());
  }

  get(principal, id) {
    const s = typeof id === 'string' && this.#sessions.get(id);
    if (!s || s.owner !== principal?.id) fail('not_found', 'Sessione inesistente');
    return s;
  }

  /** spec: { protocol, values (variables and secrets put in), name, address, tls(host, port) }. */
  open(principal, spec) {
    if (this.#mine(principal).filter(s => s.state !== 'closed').length >= MAX_SESSIONS) fail('rate_limited', `Al massimo ${MAX_SESSIONS} sessioni aperte`);
    const s = new Session(this, principal, spec);
    this.#sessions.set(s.id, s);
    s.armDetached();
    this.changed(s);
    return s.view();
  }

  async close(principal, id) {
    const s = this.get(principal, id);
    await s.end('');
    this.forget(s);
  }

  forget(s) {
    if (this.#sessions.get(s.id) !== s) return;
    this.#sessions.delete(s.id);
    this.changed(s);
  }

  changed(s) {
    this.#calls.emit(s.owner, 'calls.sessions');
  }

  get calls() { return this.#calls; }

  async stop() {
    await Promise.all([...this.#sessions.values()].map(s => s.end('Il kernel si sta fermando').catch(() => {})));
    this.#sessions.clear();
  }
}

class Session {
  #owner;
  #spec;
  #conn = null;
  #socket = null;
  #kept = [];
  #bytes = 0;
  #n = 0;
  #timer = null;
  #abort = new AbortController();

  constructor(owner, principal, spec) {
    this.#owner = owner;
    this.#spec = spec;
    this.principal = principal;
    this.id = newId();
    this.owner = principal.id;
    this.state = 'new';
    this.reason = '';
    this.created = Date.now();
    this.closesAt = null;
  }

  view() {
    const s = this.#spec;
    return {
      id: this.id, name: s.name, protocol: s.protocol, address: s.address, request: s.request ?? null, state: this.state, reason: this.reason,
      created: this.created, attached: !!this.#socket, closesAt: this.closesAt, info: this.#conn?.info ?? null, count: this.#n,
    };
  }

  #control(msg) {
    this.#socket?.send(JSON.stringify(msg));
  }

  #setState(state, reason = this.reason) {
    this.state = state;
    this.reason = reason;
    this.#control({ t: 'state', session: this.view() });
    this.#owner.changed(this);
  }

  armDetached() {
    clearTimeout(this.#timer);
    if (this.state === 'closed') return this.#owner.forget(this);
    this.closesAt = Date.now() + DETACHED_FOR;
    this.#timer = setTimeout(() => {
      this.end('Chiusa dopo 10 minuti senza finestra').catch(() => {});
      this.#owner.forget(this);
    }, DETACHED_FOR);
    this.#timer.unref?.();
  }

  /** A message to keep and show: in, out, or the session's own ('sys'). A secret value in it is written •••• (the page never sees one). */
  #keep(dir, msg) {
    const raw = typeof msg.data === 'string' ? msg.data : msg.data === undefined ? '' : JSON.stringify(msg.data);
    const mask = this.#spec.mask ?? (x => x);
    const data = msg.type === 'binary' ? raw : mask(raw);
    if (msg.meta && typeof msg.meta === 'object') msg = { ...msg, meta: JSON.parse(mask(JSON.stringify(msg.meta))) };
    const item = { n: ++this.#n, at: Date.now(), dir, type: String(msg.type ?? 'text').slice(0, 20), data, ...(msg.meta && typeof msg.meta === 'object' && { meta: msg.meta }) };
    this.#kept.push(item);
    this.#bytes += data.length;
    while (this.#kept.length > MAX_KEPT || (this.#bytes > MAX_BYTES && this.#kept.length > 1)) this.#bytes -= this.#kept.shift().data.length;
    this.#control({ t: 'msg', item });
  }

  attach(ws) {
    const old = this.#socket;
    if (old) {
      old.send(JSON.stringify({ t: 'taken' }));
      old.close(4000, 'taken');
    }
    clearTimeout(this.#timer);
    this.closesAt = null;
    this.#socket = ws;
    ws.send(JSON.stringify({ t: 'state', session: this.view() }));
    ws.send(JSON.stringify({ t: 'history', items: this.#kept }));
    ws.on('message', (data, binary) => { if (!binary) this.#command(data); });
    ws.on('close', () => {
      if (this.#socket !== ws) return;
      this.#socket = null;
      this.armDetached();
      this.#owner.changed(this);
    });
    this.#owner.changed(this);
    if (this.state === 'new') this.#connect();
  }

  async #command(data) {
    let msg;
    try { msg = JSON.parse(data.toString('utf8')); } catch { return; }
    if (msg?.t === 'send' && msg.msg && typeof msg.msg === 'object') {
      try {
        if (this.state !== 'on' || !this.#conn) fail('invalid', 'La sessione non è collegata');
        const out = { type: ['text', 'binary', 'json'].includes(msg.msg.type) ? msg.msg.type : 'text', data: String(msg.msg.data ?? ''), ...(msg.msg.meta && typeof msg.msg.meta === 'object' && { meta: msg.msg.meta }) };
        if (out.data.length > MAX_SEND) fail('too_large', 'Messaggio troppo grande');
        await this.#conn.send(out);
        this.#keep('out', out);
      } catch (err) {
        this.#keep('sys', { type: 'error', data: errorOf(err, this.#spec.mask).message });
      }
    } else if (msg?.t === 'command' && typeof msg.name === 'string') {
      const reply = r => this.#control({ t: 'result', id: msg.id ?? null, ...r });
      try {
        if (this.state !== 'on' || typeof this.#conn?.command !== 'function') fail('invalid', 'Comando non disponibile');
        const result = await this.#conn.command(msg.name.slice(0, 40), msg.args ?? null);
        if (msg.name !== 'ping') this.#keep('sys', { type: 'info', data: `${msg.name}${msg.args ? ` ${JSON.stringify(msg.args).slice(0, 300)}` : ''}` });
        reply({ result: result ?? null });
      } catch (err) {
        reply({ error: errorOf(err, this.#spec.mask) });
      }
    }
  }

  async #connect() {
    const s = this.#spec;
    const calls = this.#owner.calls;
    this.#setState('connecting', '');
    try {
      const conn = await s.driver.open(s.values, {
        output: msg => { if (this.state !== 'closed' && msg && typeof msg === 'object') this.#keep('in', msg); },
        closed: info => this.#ended(info?.reason ?? ''),
        lookup: calls.guard.lookup,
        check: values => calls.guard.check(values),
        tls: s.tls,
        signal: this.#abort.signal,
        connectTo: calls.connectTo,
      });
      if (this.#abort.signal.aborted || this.state === 'closed') { try { conn.close(); } catch { /* gone */ } return; }
      this.#conn = conn;
      s.values = null;   // gone with the secrets in them; only the mask stays, to write them •••• in what comes
      this.#keep('sys', { type: 'info', data: 'Collegato' });
      this.#setState('on', '');
    } catch (err) {
      if (this.state === 'closed') return;
      const e = errorOf(err, this.#spec.mask);
      this.#keep('sys', { type: 'error', data: e.message, ...(e.trust && { meta: { trust: e.trust } }) });
      this.#ended(e.message);
    }
  }

  #ended(reason) {
    if (this.state === 'closed') return;
    this.#conn = null;
    if (reason) this.#keep('sys', { type: 'info', data: reason });
    this.#setState('closed', reason);
    if (!this.#socket) this.#owner.forget(this);
  }

  async end(reason) {
    this.#abort.abort();
    clearTimeout(this.#timer);
    const conn = this.#conn;
    this.#ended(reason);
    if (conn) await Promise.resolve().then(() => conn.close()).catch(() => {});
    this.#socket?.close(1000, 'closed');
  }
}
