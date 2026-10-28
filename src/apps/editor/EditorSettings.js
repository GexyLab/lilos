import { SettingsWindow, h, fs, toggle, selectField, textField, actionButton } from '@lilos/sdk';
import { editorConfig } from './lang/config.js';
import { languages, enginesFor, engineFor, ENGINE_LABELS, loadCustomGrammars } from './lang/languages.js';
import { forgetCustom } from './lang/engines.js';
import { schemaUri } from './lsp/manager.js';
import { pickFile } from '../filePicker.js';

const KEY = 'editor-settings';
let current = null;

/** Settings of the Editor (one window): highlighting engines, TextMate grammars, language servers, JSON schemas. */
export function openEditorSettings(openWindow) {
  if (current?.el.isConnected) return openWindow(current, KEY);
  let problems = [];
  const refresh = () => win.view.render();

  const addGrammar = async () => {
    const node = await pickFile(openWindow, {
      title: 'Aggiungi una grammatica TextMate', exts: ['json'],
      text: 'Scegli un file .tmLanguage.json: deve contenere "scopeName" e "patterns"; "fileTypes" indica le estensioni.',
    });
    if (!node) return;
    editorConfig.set('grammars', [...editorConfig.get('grammars'), node.id]);
    forgetCustom();
    problems = await loadCustomGrammars();
    refresh();
  };
  const removeGrammar = async id => {
    editorConfig.set('grammars', editorConfig.get('grammars').filter(g => g !== id));
    forgetCustom();
    problems = await loadCustomGrammars();
    refresh();
  };

  const highlighting = () => [
    {
      title: 'Motore per linguaggio',
      rows: languages().map(lang => ({
        label: lang.label,
        description: lang.custom ? `Grammatica aggiunta · .${lang.exts.join(', .') || '—'}` : `.${lang.exts.filter(Boolean).join(', .') || 'txt'}`,
        keywords: 'evidenziazione colori tree-sitter textmate',
        control: selectField({
          value: engineFor(lang), label: `Motore per ${lang.label}`,
          options: enginesFor(lang).map(e => ({ value: e, label: ENGINE_LABELS[e] })),
          onChange: v => editorConfig.setEntry('engines', lang.id, v),
        }),
      })),
    },
    {
      title: 'Grammatiche TextMate aggiunte',
      rows: [
        ...languages().filter(l => l.custom).map(l => ({
          label: l.label, description: `${fs.get(l.fileId) ? fs.path(l.fileId) : 'file eliminato'} · ${l.textmate.grammar.scopeName}`,
          control: actionButton({ label: 'Rimuovi', onClick: () => removeGrammar(l.fileId) }),
        })),
        ...problems.map(p => ({
          label: p.name ?? 'Grammatica', description: `Non caricata: ${p.error}`,
          control: actionButton({ label: 'Rimuovi', onClick: () => removeGrammar(p.fileId) }),
        })),
        {
          label: 'Aggiungi una grammatica', description: 'Un file .tmLanguage.json di lilOS (il formato di VS Code, Sublime Text, Shiki)',
          control: actionButton({ label: 'Scegli file…', onClick: addGrammar }),
        },
      ],
    },
  ];

  const servers = () => {
    const builtin = editorConfig.get('builtin');
    const external = editorConfig.get('external');
    const langSelect = selectField({ value: 'typescript', label: 'Linguaggio', options: languages().map(l => ({ value: l.id, label: l.label })) });
    const url = textField({ placeholder: 'ws://localhost:3000/typescript', label: 'Indirizzo WebSocket' });
    const note = h('small', { class: 'es-note' });
    const add = actionButton({
      label: 'Aggiungi', onClick: () => {
        const value = url.value.trim();
        if (!/^wss?:\/\/.+/.test(value)) { note.textContent = 'Serve un indirizzo ws:// o wss://'; return; }
        editorConfig.set('external', [...external.filter(s => s.lang !== langSelect.value), { lang: langSelect.value, url: value }]);
        refresh();
      },
    });
    return [
      {
        title: 'Nel browser',
        rows: [['json', 'JSON', 'Completamento, errori, schemi JSON'], ['css', 'CSS', 'Completamento ed errori'], ['html', 'HTML', 'Completamento di tag, attributi e valori']]
          .map(([id, label, description]) => ({
            label, description, keywords: 'language server lsp',
            control: toggle({ value: builtin[id], onChange: v => editorConfig.setEntry('builtin', id, v) }),
          })),
      },
      {
        title: 'Server esterni (WebSocket)',
        rows: [
          ...external.map(s => ({
            label: languages().find(l => l.id === s.lang)?.label ?? s.lang, description: s.url,
            control: actionButton({ label: 'Rimuovi', onClick: () => { editorConfig.set('external', external.filter(x => x !== s)); refresh(); } }),
          })),
          {
            label: 'Aggiungi un server',
            description: 'Un Language Server raggiungibile via WebSocket (per esempio avviato con un ponte come lsp-ws-proxy). Ha la precedenza su quello nel browser.',
            control: h('div', { class: 'es-add' }, langSelect, url, add, note),
          },
        ],
      },
    ];
  };

  const schemas = () => {
    const entries = Object.entries(editorConfig.get('schemas')).filter(([fileId]) => fs.exists(fileId));
    return [{
      title: 'Schemi associati ai file',
      rows: entries.length
        ? entries.map(([fileId, source]) => ({
            label: fs.path(fileId),
            description: source.type === 'url' ? source.url : (fs.exists(source.id) ? fs.path(source.id) : 'file dello schema eliminato') + (schemaUri(source) ? '' : ' · non disponibile'),
            control: actionButton({ label: 'Rimuovi', onClick: () => { editorConfig.setEntry('schemas', fileId, undefined); refresh(); } }),
          }))
        : [{ label: 'Nessuno schema associato', description: 'Si sceglie dall’Editor con un file JSON aperto (pulsante Schema). Vale anche "$schema" scritto nel file.' }],
    }];
  };

  const win = new SettingsWindow({
    title: 'Impostazioni dell’Editor', icon: 'code', width: 720, height: 520,
    tabs: [
      { id: 'highlight', label: 'Evidenziazione', icon: 'palette', description: 'Con quale motore colorare ogni linguaggio, e grammatiche in più.', sections: highlighting },
      { id: 'servers', label: 'Language server', icon: 'code', description: 'Server che suggeriscono il codice e segnalano gli errori (Language Server Protocol).', sections: servers },
      { id: 'schemas', label: 'Schemi JSON', icon: 'file', description: 'Gli schemi che descrivono i file JSON.', sections: schemas },
    ],
  });
  current = win;
  win.on('destroy', () => { if (current === win) current = null; });
  loadCustomGrammars().then(p => { problems = p; refresh(); });
  return openWindow(win, KEY);
}
