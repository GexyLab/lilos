import { getCSSLanguageService } from 'vscode-css-languageservice';
import { serve } from './serve.js';

/** CSS language server (vscode-css-languageservice): completion and validation. */
const ls = getCSSLanguageService();
ls.configure({ validate: true });

serve({
  capabilities: { completionProvider: { triggerCharacters: [':', ' ', '-', '@'] } },
  complete: (doc, position) => ls.doComplete(doc, position, ls.parseStylesheet(doc)),
  validate: doc => ls.doValidation(doc, ls.parseStylesheet(doc)),
});
