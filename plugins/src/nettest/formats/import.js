import { isObj, list, warnings, finish } from './common.js';
import { parseYaml } from './yaml.js';
import { isPostman, isPostmanV1, isPostmanEnv, importPostman, importPostmanEnv } from './postman.js';
import { isInsomnia4, isInsomnia5, importInsomnia4, importInsomnia5 } from './insomnia.js';
import { isOpenApi, isSwagger, importOpenApi } from './openapi.js';
import { isHar, importHar } from './har.js';
import { isCurl, importCurl } from './curl.js';

/**
 * «Importa»: a text the user picked or pasted → a NetTest collection.
 *
 *   detectFormat(text) → 'postman' | 'postman-env' | 'insomnia' | 'openapi' | 'swagger' | 'har' | 'curl' | 'nettest' | null
 *   importText(text, { name? }) → { format, collection, environments, warnings: [string] }
 *
 * The collection is a .nettest one (common.js), environments also in collection.environments;
 * collection is null for a Postman environment. A secret variable comes as { secret: true,
 * value: '', needsValue: true }, a file in a body as { file: '', fileName } (the app asks for
 * both). Warnings are short, in Italian, for the user. Throws an Error (Italian message) when the
 * text is not something NetTest reads.
 */
export const MAX_IMPORT = 32 << 20;

/** The text as data: JSON, or YAML when it looks like one of the YAML formats. */
function parse(text) {
  const t = String(text ?? '').replace(/^﻿/, '');
  const trimmed = t.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try { return { data: JSON.parse(t), yaml: false }; } catch { return { data: null, yaml: false }; }
  }
  if (/^(openapi|swagger)\s*:/m.test(t) || /^type:\s*["']?(collection|spec)\.insomnia\.rest\//m.test(t)) {
    try { return { data: parseYaml(t), yaml: true }; } catch (err) { return { data: null, yaml: true, error: err }; }
  }
  return { data: null, yaml: false };
}

function formatOf(data) {
  if (!isObj(data)) return null;
  if (data.format === 'nettest' && Array.isArray(data.items)) return 'nettest';
  if (isPostman(data) || isPostmanV1(data)) return 'postman';
  if (isPostmanEnv(data)) return 'postman-env';
  if (isInsomnia4(data) || isInsomnia5(data) || /^spec\.insomnia\.rest\//.test(String(data.type ?? ''))) return 'insomnia';
  if (isOpenApi(data)) return 'openapi';
  if (isSwagger(data)) return 'swagger';
  if (isHar(data)) return 'har';
  return null;
}

export function detectFormat(text) {
  const t = String(text ?? '');
  if (!t.trim()) return null;
  const { data } = parse(t);
  if (data) return formatOf(data);
  return isCurl(t) ? 'curl' : null;
}

export function importText(text, { name } = {}) {
  const t = String(text ?? '');
  if (t.length > MAX_IMPORT) throw new Error('File troppo grande da importare (al massimo 32 MB)');
  if (!t.trim()) throw new Error('Niente da importare: il testo è vuoto');
  const warn = warnings();
  const opts = { name: typeof name === 'string' && name.trim() ? name.trim() : undefined };
  const parsed = parse(t);
  const data = parsed.data;
  const format = data ? formatOf(data) : isCurl(t) ? 'curl' : null;
  if (!format) {
    if (parsed.error) throw new Error(`Non riesco a leggere il file: ${parsed.error.message}`);
    throw new Error('Formato non riconosciuto: si importano Postman, Insomnia, OpenAPI/Swagger, HAR, cURL e .nettest');
  }
  let out;
  switch (format) {
    case 'nettest': {
      // As it is: the app checks it the way it checks a file it opens
      const environments = list(data.environments);
      return { format, collection: { ...data, ...(opts.name && { name: opts.name }) }, environments, warnings: [] };
    }
    case 'postman':
      if (isPostmanV1(data) && !isPostman(data)) throw new Error('Collezione Postman v1: esportala da Postman come v2.1 e importala di nuovo');
      out = importPostman(data, opts, warn);
      break;
    case 'postman-env': out = importPostmanEnv(data, opts); break;
    case 'insomnia':
      if (isInsomnia4(data)) out = importInsomnia4(data, opts, warn);
      else if (isInsomnia5(data)) out = importInsomnia5(data, opts, warn);
      else if (isObj(data.spec?.contents) && (isOpenApi(data.spec.contents) || isSwagger(data.spec.contents))) {
        // An Insomnia design document holds an OpenAPI one
        out = importOpenApi(data.spec.contents, { name: opts.name ?? data.name }, warn);
      } else throw new Error('Documento di Insomnia senza richieste da importare');
      break;
    case 'openapi':
      if (!/^3\./.test(String(data.openapi))) warn.add(`OpenAPI ${data.openapi}: letto come 3.x`);
      out = importOpenApi(data, opts, warn);
      break;
    case 'swagger': out = importOpenApi(data, opts, warn); break;
    case 'har': out = importHar(data, opts, warn); break;
    case 'curl':
      out = importCurl(t, opts, warn);
      if (!out.collection.items.length) throw new Error('Nessun comando curl con un indirizzo');
      break;
    default:
      throw new Error('Formato non riconosciuto');
  }
  return finish(out.collection, out.environments, warn, format);
}
