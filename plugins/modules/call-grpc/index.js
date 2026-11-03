import { netError } from './lib/shared/errors.js';
import { openConnection, startCall, metadataOf, timeoutOf, statusName, reasonOf, OK } from './transport.js';
import { methodOf, servicesFrom, serviceInfo, encodeInput, encodeMessage, decodeMessage, fullName } from './schema.js';

/**
 * gRPC for NetTest (service 'call.grpc', see the kernel's calls/drivers.js): unary calls in the
 * window and in collection runs (invoke), the streams (client, server, both) as live sessions
 * (open), and what the server offers (describe) from its reflection or from the .proto the user
 * pasted. Messages are ProtoJSON both ways.
 *
 *   values  { url: 'grpc://host:port' | 'grpcs://host:port' | 'host:port', service: 'pkg.Service',
 *             method, proto?: .proto text, metadata | headers: [{ key, value, enabled }],
 *             message: JSON text, settings: { verify, ca, cert, key, timeoutMs } }
 *
 * A status that is not OK is an answer, not an error: invoke returns it, a session ends with it.
 * settings.timeoutMs is the deadline of invoke() and describe() (grpc-timeout); a live session
 * has none (it lasts until the user or the server ends it), only the connection waits that long.
 */
const label = (en, it) => ({ en, it });
const str = v => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v));
const metadataFrom = values => metadataOf(Array.isArray(values.metadata) && values.metadata.length ? values.metadata : values.headers);
const kindOf = m => (m.requestStream ? (m.responseStream ? 'bidi' : 'client') : m.responseStream ? 'server' : 'unary');

const driver = {
  label: label('gRPC', 'gRPC'),

  async describe(values, ctx) {
    const metadata = metadataFrom(values);
    const conn = str(values.proto).trim() ? null : await openConnection(values, ctx);
    try {
      const services = await servicesFrom(values, conn, metadata);
      return { services: services.map(serviceInfo), source: conn ? 'reflection' : 'proto' };
    } finally {
      conn?.close();
    }
  },

  async invoke(values, input, ctx) {
    const metadata = metadataFrom(values);
    const timeoutMs = timeoutOf(values.settings);
    const conn = await openConnection(values, ctx);
    try {
      const { method, path, requestType, responseType } = await methodOf(values, conn, metadata);
      const requests = encodeInput(str(input).trim() ? input : values.message, requestType, { many: method.requestStream });
      const replies = [];
      const end = await new Promise(resolve => {
        const call = startCall(conn, path, { metadata, timeoutMs }, {
          onMessage: bytes => replies.push(bytes),
          onEnd: resolve,
        });
        try { for (const r of requests) call.write(r); } catch { /* the call is over: its end says why */ }
        call.end();
      });
      if (end.error) throw end.error;
      const messages = replies.map(bytes => ({ type: 'json', data: decodeMessage(bytes, responseType) }));
      return {
        messages, status: end.status, statusText: end.message || statusName(end.status),
        meta: { ...end.headers, ...end.trailers, 'grpc-status': String(end.status) },
      };
    } finally {
      conn.close();
    }
  },

  async open(values, ctx) {
    const metadata = metadataFrom(values);
    const conn = await openConnection(values, ctx);
    let target;
    try {
      target = await methodOf(values, conn, metadata);
    } catch (err) {
      conn.close();
      throw err;
    }
    const { method, path, requestType, responseType } = target;
    const name = fullName(responseType);
    let halfClosed = false, over = false;
    const info = {
      service: fullName(method.parent), method: method.name, kind: kindOf(method),
      kinds: { clientStreaming: !!method.requestStream, serverStreaming: !!method.responseStream },
      requestType: fullName(requestType), responseType: name, remote: conn.remote, tls: conn.tls, headers: null,
    };
    const call = startCall(conn, path, { metadata }, {
      onHeaders: headers => {
        info.headers = headers;
        ctx.output({ type: 'info', data: 'headers', meta: { headers } });
      },
      onMessage: bytes => {
        try { ctx.output({ type: 'json', data: decodeMessage(bytes, responseType), meta: { type: name } }); } catch (err) { ctx.output({ type: 'error', data: err.message }); }
      },
      onEnd: end => {
        conn.close();
        if (over) return ctx.closed({ reason: '' });   // the user closed it
        over = true;
        if (end.error) return ctx.closed({ reason: reasonOf(end.error) });
        const status = statusName(end.status);
        const said = end.message && end.message !== status ? `: ${end.message}` : '';
        ctx.output({ type: 'info', data: `status ${end.status} ${status}${said}`, meta: { status: end.status, message: end.message, trailers: end.trailers } });
        ctx.closed({ reason: end.status === OK ? '' : `${status}${said}` });
      },
    });
    return {
      info,
      send(msg) {
        if (over) throw netError('invalid', 'La chiamata è finita');
        if (halfClosed) throw netError('invalid', method.requestStream ? 'Invio già chiuso (fine del flusso)' : 'Questo metodo prende un solo messaggio: è già stato inviato');
        let json;
        try { json = str(msg?.data).trim() ? JSON.parse(str(msg.data)) : {}; } catch (err) { throw netError('invalid', `Il messaggio non è JSON valido: ${err.message}`); }
        call.write(encodeMessage(json, requestType));
        // Unary and server streaming: one message, then the server answers
        if (!method.requestStream) { halfClosed = true; call.end(); }
      },
      command(cmd) {
        if (cmd === 'end') {
          if (!halfClosed && !over) { halfClosed = true; call.end(); }
          return { ended: true };
        }
        if (cmd === 'cancel') { call.cancel(); return null; }
        throw netError('invalid', 'Comando sconosciuto');
      },
      close() {
        over = true;
        call.cancel();
        conn.close();
      },
    };
  },
};

export default {
  async init(ctx) {
    ctx.provide('call.grpc', driver);
  },
};
