import { getLanguageService } from 'vscode-html-languageservice';
import { serve } from './serve.js';

/** HTML language server (vscode-html-languageservice): completion of tags, attributes and values. */
const ls = getLanguageService();

serve({
  capabilities: { completionProvider: { triggerCharacters: ['<', ' ', '"', '/', '='] } },
  complete: (doc, position) => ls.doComplete(doc, position, ls.parseHTMLDocument(doc)),
});
