import protobuf from 'protobufjs';
import descriptor from 'protobufjs/ext/descriptor.js';
import protojson from 'protobufjs/ext/protojson.js';
import { netError } from './lib/shared/errors.js';
import { startCall, statusName, UNIMPLEMENTED } from './transport.js';

/**
 * What a gRPC server offers, as protobuf.js types: from the .proto text the user gives, or from
 * the server's reflection (grpc.reflection.v1, then v1alpha for older servers), whose answers are
 * FileDescriptorProtos (protobufjs/ext/descriptor). Messages go to and from the user as ProtoJSON
 * (protobufjs/ext/protojson: lowerCamelCase names, 64-bit numbers as strings, bytes in base64,
 * enums by name, the well-known types in their JSON form).
 */
const REFLECTION_TIMEOUT = 30_000;
const REFLECTION_PROTO = `syntax = "proto3";
package grpc.reflection.v1;
message ServerReflectionRequest {
  string host = 1;
  oneof message_request {
    string file_by_filename = 3;
    string file_containing_symbol = 4;
    ExtensionRequest file_containing_extension = 5;
    string all_extension_numbers_of_type = 6;
    string list_services = 7;
  }
}
message ExtensionRequest { string containing_type = 1; int32 extension_number = 2; }
message ServerReflectionResponse {
  string valid_host = 1;
  ServerReflectionRequest original_request = 2;
  oneof message_response {
    FileDescriptorResponse file_descriptor_response = 4;
    ExtensionNumberResponse all_extension_numbers_response = 5;
    ListServiceResponse list_services_response = 6;
    ErrorResponse error_response = 7;
  }
}
message FileDescriptorResponse { repeated bytes file_descriptor_proto = 1; }
message ExtensionNumberResponse { string base_type_name = 1; repeated int32 extension_number = 2; }
message ListServiceResponse { repeated ServiceResponse service = 1; }
message ServiceResponse { string name = 1; }
message ErrorResponse { int32 error_code = 1; string error_message = 2; }
`;
const reflectionRoot = protobuf.parse(REFLECTION_PROTO, { keepCase: true }).root;
const ReflectionRequest = reflectionRoot.lookupType('grpc.reflection.v1.ServerReflectionRequest');
const ReflectionResponse = reflectionRoot.lookupType('grpc.reflection.v1.ServerReflectionResponse');
// The same messages in both versions: only the path changes
const REFLECTION_PATHS = ['/grpc.reflection.v1.ServerReflection/ServerReflectionInfo', '/grpc.reflection.v1alpha.ServerReflection/ServerReflectionInfo'];
const REFLECTION_SERVICES = new Set(['grpc.reflection.v1.ServerReflection', 'grpc.reflection.v1alpha.ServerReflection']);

const str = v => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v));
const short = err => str(err?.message ?? err).replace(/\s+/g, ' ').slice(0, 300);

/** The types of a .proto text; its imports of Google's well-known types (timestamp, any…) resolve too. */
export function rootFromProto(text) {
  const root = new protobuf.Root();
  let parsed;
  try {
    parsed = protobuf.parse(str(text), root, { keepCase: false, alternateCommentMode: true });
  } catch (err) {
    throw netError('invalid', `File .proto non valido: ${short(err)}`);
  }
  for (const name of [...(parsed.imports ?? []), ...(parsed.weakImports ?? [])]) {
    const common = protobuf.common.get(name);
    if (common) root.addJSON(common.nested);
  }
  try {
    root.resolveAll();
  } catch (err) {
    throw netError('invalid', `File .proto incompleto: ${short(err)} (si risolvono solo gli import dei tipi standard di Google: per gli altri usa la reflection o metti tutto in un file)`);
  }
  return root;
}

/** The reflection stream: one request, one answer, in order. */
class Reflection {
  #call;
  #waiting = [];
  #end = null;

  constructor(conn, path, metadata) {
    this.#call = startCall(conn, path, { metadata, timeoutMs: REFLECTION_TIMEOUT }, {
      onMessage: bytes => {
        const w = this.#waiting.shift();
        if (!w) return;
        try { w.resolve(ReflectionResponse.decode(bytes)); } catch { w.reject(netError('invalid', 'Risposta della reflection non valida')); }
      },
      onEnd: end => {
        this.#end = end;
        for (const w of this.#waiting.splice(0)) w.reject(Reflection.error(end));
      },
    });
  }

  static error(end) {
    if (end.error) return end.error;
    if (end.status === UNIMPLEMENTED) return Object.assign(netError('unsupported', 'Il server non offre la reflection gRPC: incolla il file .proto del servizio'), { unimplemented: true });
    return netError('invalid', `Reflection non riuscita: ${statusName(end.status)}${end.message ? ` (${end.message})` : ''}`);
  }

  ask(request) {
    if (this.#end) return Promise.reject(Reflection.error(this.#end));
    return new Promise((resolve, reject) => {
      this.#waiting.push({ resolve, reject });
      try { this.#call.write(ReflectionRequest.encode(ReflectionRequest.create(request)).finish()); } catch (err) { this.#waiting.pop(); reject(err); }
    });
  }

  close() {
    this.#call.end();
  }
}

/** The reflection client whose version the server has, with its answer to `first`. */
async function reflect(conn, metadata, first) {
  let last;
  for (const path of REFLECTION_PATHS) {
    const client = new Reflection(conn, path, metadata);
    try {
      return { client, answer: await client.ask(first) };
    } catch (err) {
      client.close();
      if (!err?.unimplemented) throw err;
      last = err;
    }
  }
  throw last;
}

/** A well-known type's file (google/protobuf/…) the server did not give, from protobuf.js's own copy. */
function commonFile(name) {
  const json = protobuf.common.get(name);
  if (!json) return null;
  const file = protobuf.Root.fromJSON(json).toDescriptor('proto3').file?.[0];
  if (file) file.name = name;
  return file ?? null;
}

/** The files of `answer` and the ones they import, asked one by one, into `files` (name → FileDescriptorProto). */
async function collect(client, answer, files) {
  const queue = [];
  const take = (res, what) => {
    if (res.error_response) throw netError('not_found', `Il server non conosce ${what}${res.error_response.error_message ? `: ${res.error_response.error_message}` : ''}`);
    for (const bytes of res.file_descriptor_response?.file_descriptor_proto ?? []) {
      let file;
      try { file = descriptor.FileDescriptorProto.decode(bytes); } catch { throw netError('invalid', 'Descrizione del servizio non valida (reflection)'); }
      if (files.has(file.name)) continue;
      files.set(file.name, file);
      queue.push(...(file.dependency ?? []));
    }
  };
  take(answer.res, answer.what);
  while (queue.length) {
    const name = queue.shift();
    if (files.has(name)) continue;
    const res = await client.ask({ file_by_filename: name });
    if (res.error_response) {
      const common = commonFile(name);
      if (!common) throw netError('not_found', `Il server non dà ${name}, importato dal servizio`);
      files.set(name, common);
      continue;
    }
    take(res, name);
  }
}

function rootOf(files) {
  try {
    return protobuf.Root.fromDescriptor(descriptor.FileDescriptorSet.create({ file: [...files.values()] }));
  } catch (err) {
    throw netError('invalid', `Descrizione del servizio non utilizzabile: ${short(err)}`);
  }
}

/** The services of a root, at any depth. */
function servicesOf(ns, out = []) {
  for (const o of ns.nestedArray) {
    if (o instanceof protobuf.Service) out.push(o);
    else if (o instanceof protobuf.Namespace && !(o instanceof protobuf.Type)) servicesOf(o, out);
  }
  return out;
}

const fullName = o => o.fullName.replace(/^\./, '');

/** 'pkg.Service' and 'Method' as the user gives them ('pkg.Service/Method' and '/pkg.Service/Method' too). */
export function namesOf(values) {
  let service = str(values.service).trim().replace(/^\//, '');
  let method = str(values.method).trim().replace(/^\//, '');
  if (method.includes('/')) [service, method] = method.split('/', 2);
  else if (!method && service.includes('/')) [service, method] = service.split('/', 2);
  service = service.replace(/^\./, '');
  if (!service) throw netError('invalid', 'Manca il servizio (pkg.Servizio)');
  if (!method) throw netError('invalid', 'Manca il metodo');
  return { service, method };
}

/**
 * The method to call: from values.proto, or asked to the server's reflection on `conn`.
 * → { method (resolved), path, requestType, responseType }
 */
export async function methodOf(values, conn, metadata) {
  const names = namesOf(values);
  let root;
  if (str(values.proto).trim()) {
    root = rootFromProto(values.proto);
  } else {
    const files = new Map();
    const { client, answer } = await reflect(conn, metadata, { file_containing_symbol: names.service });
    try { await collect(client, { res: answer, what: names.service }, files); } finally { client.close(); }
    root = rootOf(files);
  }
  const service = root.lookup(names.service, [protobuf.Service]);
  if (!service) throw netError('not_found', `Servizio sconosciuto: ${names.service}`);
  const method = service.methods[names.method] ?? Object.values(service.methods).find(m => m.name.toLowerCase() === names.method.toLowerCase());
  if (!method) throw netError('not_found', `Il servizio ${names.service} non ha il metodo ${names.method}`);
  method.resolve();
  return { method, path: `/${fullName(service)}/${method.name}`, requestType: method.resolvedRequestType, responseType: method.resolvedResponseType };
}

/** Every service the server (or values.proto) has, for describe(). */
export async function servicesFrom(values, conn, metadata) {
  let root;
  if (str(values.proto).trim()) {
    root = rootFromProto(values.proto);
  } else {
    const { client, answer } = await reflect(conn, metadata, { list_services: '' });
    try {
      if (answer.error_response) throw netError('invalid', `Reflection non riuscita: ${answer.error_response.error_message || answer.error_response.error_code}`);
      const files = new Map();
      for (const { name } of answer.list_services_response?.service ?? []) {
        if (REFLECTION_SERVICES.has(name)) continue;
        await collect(client, { res: await client.ask({ file_containing_symbol: name }), what: name }, files);
      }
      root = files.size ? rootOf(files) : new protobuf.Root();
    } finally {
      client.close();
    }
  }
  return servicesOf(root).filter(s => !REFLECTION_SERVICES.has(fullName(s)));
}

/** A service as describe() gives it. */
export function serviceInfo(service) {
  return {
    name: fullName(service),
    methods: service.methodsArray.map(m => {
      m.resolve();
      return {
        name: m.name, requestType: fullName(m.resolvedRequestType), responseType: fullName(m.resolvedResponseType),
        clientStreaming: !!m.requestStream, serverStreaming: !!m.responseStream, requestExample: example(m.resolvedRequestType),
      };
    }),
  };
}

// The well-known types in their JSON form, for the examples
const WELL_KNOWN = {
  '.google.protobuf.Timestamp': () => '1970-01-01T00:00:00Z', '.google.protobuf.Duration': () => '0s', '.google.protobuf.FieldMask': () => '',
  '.google.protobuf.Empty': () => ({}), '.google.protobuf.Struct': () => ({}), '.google.protobuf.Value': () => null, '.google.protobuf.ListValue': () => [],
  '.google.protobuf.Any': () => ({ '@type': '' }),
  '.google.protobuf.DoubleValue': () => 0, '.google.protobuf.FloatValue': () => 0, '.google.protobuf.Int32Value': () => 0, '.google.protobuf.UInt32Value': () => 0,
  '.google.protobuf.Int64Value': () => '0', '.google.protobuf.UInt64Value': () => '0', '.google.protobuf.BoolValue': () => false,
  '.google.protobuf.StringValue': () => '', '.google.protobuf.BytesValue': () => '',
};
const LONG = new Set(['int64', 'uint64', 'sint64', 'fixed64', 'sfixed64']);

function scalar(type) {
  if (LONG.has(type)) return '0';
  if (type === 'bool') return false;
  if (type === 'string' || type === 'bytes') return '';
  return 0;
}

/**
 * A message of `type` with every field at its default value, as ProtoJSON: what the user fills
 * in. Of a oneof only the first field; a message inside itself (a tree) is {} the second time.
 */
export function example(type, seen = new Set()) {
  const known = WELL_KNOWN[type.fullName];
  if (known) return known();
  if (seen.has(type) || seen.size > 12) return {};
  seen.add(type);
  const out = {};
  const oneofs = new Set();
  for (const field of type.fieldsArray) {
    if (field.partOf) {
      if (oneofs.has(field.partOf)) continue;
      oneofs.add(field.partOf);
    }
    field.resolve();
    const t = field.resolvedType;
    const value = t instanceof protobuf.Type ? example(t, seen) : t instanceof protobuf.Enum ? (Object.keys(t.values)[0] ?? 0) : scalar(field.type);
    if (field.map) out[field.jsonName] = { [field.keyType === 'string' ? 'key' : field.keyType === 'bool' ? 'false' : '0']: value };
    else out[field.jsonName] = field.repeated ? [value] : value;
  }
  seen.delete(type);
  return out;
}

/** JSON text (one message, or for a client stream an array of them) → the messages' bytes. */
export function encodeInput(text, type, { many = false } = {}) {
  const source = str(text).trim();
  let json;
  try { json = source ? JSON.parse(source) : {}; } catch (err) { throw netError('invalid', `Il messaggio non è JSON valido: ${short(err)}`); }
  const list = many && Array.isArray(json) ? json : [json];
  return list.map(item => encodeMessage(item, type));
}

export function encodeMessage(json, type) {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    if (!WELL_KNOWN[type.fullName]) throw netError('invalid', `Il messaggio per ${fullName(type)} deve essere un oggetto JSON`);
  }
  try {
    return type.encode(protojson.fromJson(type, json)).finish();
  } catch (err) {
    throw netError('invalid', `Messaggio non valido per ${fullName(type)}: ${short(err)}`);
  }
}

/** A message received → JSON text (ProtoJSON, indented). */
export function decodeMessage(bytes, type) {
  try {
    return JSON.stringify(protojson.toJson(type, type.decode(bytes)), null, 2);
  } catch (err) {
    throw netError('invalid', `Risposta non leggibile come ${fullName(type)}: ${short(err)}`);
  }
}

export { fullName };
