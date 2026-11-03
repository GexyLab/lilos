import { SettingsWindow, h, fs, toggle, selectField, textField, actionButton } from '@lilos/sdk';
import { editorConfig } from './lang/config.js';
import { languages, enginesFor, engineFor, ENGINE_LABELS, loadCustomGrammars } from './lang/languages.js';
import { forgetCustom } from './lang/engines.js';
import { schemaUri } from './lsp/manager.js';
import { pickFile } from '@lilos/system';
import { t } from './i18n.js';

const KEY = 'editor-settings';
let current = null;

/** Settings of the Editor (one window): tabs, highlighting engines, TextMate grammars, language servers, JSON schemas. */
export function openEditorSettings(openWindow) {
  if (current?.el.isConnected) return openWindow(current, KEY);
  let problems = [];
  const refresh = () => win.view.render();

  const addGrammar = async () => {
    const node = await pickFile(openWindow, {
      title: t('settings.grammars.picker.title'), exts: ['json'],
      text: t('settings.grammars.picker.text'),
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
      title: t('settings.engines.title'),
      rows: languages().map(lang => ({
        label: lang.label,
        description: lang.custom ? t('settings.engines.custom', { exts: `.${lang.exts.join(', .') || '—'}` }) : `.${lang.exts.filter(Boolean).join(', .') || 'txt'}`,
        keywords: t('settings.engines.keywords'),
        control: selectField({
          value: engineFor(lang), label: t('settings.engines.label', { language: lang.label }),
          options: enginesFor(lang).map(e => ({ value: e, label: ENGINE_LABELS[e] })),
          onChange: v => editorConfig.setEntry('engines', lang.id, v),
        }),
      })),
    },
    {
      title: t('settings.grammars.title'),
      rows: [
        ...languages().filter(l => l.custom).map(l => ({
          label: l.label, description: `${fs.get(l.fileId) ? fs.path(l.fileId) : t('settings.grammars.fileDeleted')} · ${l.textmate.grammar.scopeName}`,
          control: actionButton({ label: t('settings.remove'), onClick: () => removeGrammar(l.fileId) }),
        })),
        ...problems.map(p => ({
          label: p.name ?? t('settings.grammars.fallbackName'), description: t('settings.grammars.notLoaded', { error: p.error }),
          control: actionButton({ label: t('settings.remove'), onClick: () => removeGrammar(p.fileId) }),
        })),
        {
          label: t('settings.grammars.add'), description: t('settings.grammars.addDescription'),
          control: actionButton({ label: t('settings.grammars.choose'), onClick: addGrammar }),
        },
      ],
    },
  ];

  const servers = () => {
    const builtin = editorConfig.get('builtin');
    const external = editorConfig.get('external');
    const langSelect = selectField({ value: 'typescript', label: t('settings.servers.language'), options: languages().map(l => ({ value: l.id, label: l.label })) });
    const url = textField({ placeholder: 'ws://localhost:3000/typescript', label: t('settings.servers.url') });
    const note = h('small', { class: 'es-note' });
    const add = actionButton({
      label: t('settings.servers.add'), onClick: () => {
        const value = url.value.trim();
        if (!/^wss?:\/\/.+/.test(value)) { note.textContent = t('settings.servers.invalidUrl'); return; }
        editorConfig.set('external', [...external.filter(s => s.lang !== langSelect.value), { lang: langSelect.value, url: value }]);
        refresh();
      },
    });
    return [
      {
        title: t('settings.servers.builtin'),
        rows: [['json', 'JSON', t('settings.servers.json')], ['css', 'CSS', t('settings.servers.css')], ['html', 'HTML', t('settings.servers.html')]]
          .map(([id, label, description]) => ({
            label, description, keywords: 'language server lsp',
            control: toggle({ value: builtin[id], onChange: v => editorConfig.setEntry('builtin', id, v) }),
          })),
      },
      {
        title: t('settings.servers.external'),
        rows: [
          ...external.map(s => ({
            label: languages().find(l => l.id === s.lang)?.label ?? s.lang, description: s.url,
            control: actionButton({ label: t('settings.remove'), onClick: () => { editorConfig.set('external', external.filter(x => x !== s)); refresh(); } }),
          })),
          {
            label: t('settings.servers.addServer'),
            description: t('settings.servers.addDescription'),
            control: h('div', { class: 'es-add' }, langSelect, url, add, note),
          },
        ],
      },
    ];
  };

  const schemas = () => {
    const entries = Object.entries(editorConfig.get('schemas')).filter(([fileId]) => fs.exists(fileId));
    return [{
      title: t('settings.schemas.title'),
      rows: entries.length
        ? entries.map(([fileId, source]) => ({
            label: fs.path(fileId),
            description: source.type === 'url' ? source.url : schemaUri(source) ? fs.path(source.id) : t('settings.schemas.unavailable', { source: fs.exists(source.id) ? fs.path(source.id) : t('settings.schemas.fileDeleted') }),
            control: actionButton({ label: t('settings.remove'), onClick: () => { editorConfig.setEntry('schemas', fileId, undefined); refresh(); } }),
          }))
        : [{ label: t('settings.schemas.empty'), description: t('settings.schemas.emptyDescription') }],
    }];
  };

  const general = () => [{
    title: t('settings.tabs.title'),
    rows: [{
      label: t('settings.tabs.reopen'), description: t('settings.tabs.reopenDescription'), keywords: t('settings.tabs.keywords'),
      control: toggle({ value: editorConfig.get('tabs').reopen, onChange: v => editorConfig.setEntry('tabs', 'reopen', v) }),
    }],
  }];

  const win = new SettingsWindow({
    title: t('settings.title'), icon: 'code', width: 720, height: 520,
    tabs: [
      { id: 'general', label: t('settings.tab.general'), icon: 'gear', description: t('settings.tab.general.description'), sections: general },
      { id: 'highlight', label: t('settings.tab.highlight'), icon: 'palette', description: t('settings.tab.highlight.description'), sections: highlighting },
      { id: 'servers', label: t('settings.tab.servers'), icon: 'code', description: t('settings.tab.servers.description'), sections: servers },
      { id: 'schemas', label: t('settings.tab.schemas'), icon: 'file', description: t('settings.tab.schemas.description'), sections: schemas },
    ],
  });
  current = win;
  win.on('destroy', () => { if (current === win) current = null; });
  loadCustomGrammars().then(p => { problems = p; refresh(); });
  return openWindow(win, KEY);
}
