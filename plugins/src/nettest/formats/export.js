/**
 * What NetTest exports: a collection as Postman v2.1 (and its environments as Postman's
 * environment files), a request as a curl command or as code («Copia come codice»).
 *
 *   toPostman(collection) → Postman v2.1 collection (object)
 *   toPostmanEnvironment(environment) → Postman environment (object; secret values left empty)
 *   toCurl(request, { windows?, auth? }) → string
 *   toCode(language, request, { auth? }) → string; LANGUAGES: [{ id, label, syntax }]
 */
export { toPostman, toPostmanEnvironment } from './postman-export.js';
export { toCurl, toCode, LANGUAGES } from './code.js';
