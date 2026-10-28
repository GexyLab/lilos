import { getLanguageService } from 'vscode-json-languageservice';
import { serve } from './serve.js';

/**
 * JSON language server (vscode-json-languageservice): completion and validation, with JSON Schema.
 * Schemas come from the client settings ({ json: { schemas: [{ uri, fileMatch }] } }) or from
 * "$schema" in the document; their content is asked to the client ('lilos/schemaContent'),
 * which reads lilOS files and downloads web addresses.
 */
let conn = null;
let schemaUris = [];

const ls = getLanguageService({
  schemaRequestService: uri => conn.request('lilos/schemaContent', { uri }),
  workspaceContext: { resolveRelativePath: (relative, resource) => new URL(relative, resource).href },
});
ls.configure({ validate: true, allowComments: false, schemas: [] });

conn = serve({
  capabilities: { completionProvider: { triggerCharacters: ['"', ':'] } },
  complete: (doc, position) => ls.doComplete(doc, position, ls.parseJSONDocument(doc)),
  validate: doc => ls.doValidation(doc, ls.parseJSONDocument(doc), { schemaValidation: 'error' }),
  configure: settings => {
    const schemas = Array.isArray(settings?.json?.schemas) ? settings.json.schemas : [];
    // Content may have changed (a schema file edited in lilOS): drop the cached copies
    for (const uri of new Set([...schemaUris, ...schemas.map(s => s.uri)])) ls.resetSchema(uri);
    schemaUris = schemas.map(s => s.uri);
    ls.configure({ validate: true, allowComments: false, schemas });
  },
});
