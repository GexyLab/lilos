import { bus } from '@lilos/sdk';

/** Extensions the text editor opens ('' = no extension, e.g. README or .env). */
const TEXT_EXTENSIONS = [
  '', 'txt', 'md', 'markdown', 'log', 'csv', 'json', 'js', 'mjs', 'cjs', 'ts', 'css',
  'html', 'htm', 'xml', 'svg', 'py', 'sh', 'yml', 'yaml', 'ini', 'toml', 'env',
];

/**
 * Apps lilOS knows. `glyph` is a name accepted by icon().
 * Each workspace installs some of them (see isInstalled); `system` apps are always installed.
 * `load` imports the app module on first launch (see launcher.js); apps without it are not built yet.
 * `opens`: file extensions the app opens (see open.js).
 * `commands`: keyboard shortcuts of the app, registered at start-up so they can be changed in
 * Settings even before the app runs; the app provides the handlers (see commands.js).
 */
export const apps = [
  { id: 'files', name: 'File', glyph: 'folder', color: '#3b6ef5', system: true, load: () => import('./files/FilesApp.js') },
  { id: 'browser', name: 'Browser', glyph: 'globe', color: '#0e8ad6' },
  {
    id: 'editor', name: 'Editor', glyph: 'code', color: '#7c5cdb', load: () => import('./editor/EditorApp.js'),
    opens: TEXT_EXTENSIONS,
    commands: [
      { id: 'editor.save', label: 'Salva', keys: ['Ctrl+S'] },
      { id: 'editor.new', label: 'Nuovo documento', keys: ['Ctrl+Alt+N'] },
      { id: 'editor.openFile', label: 'Apri un file', keys: ['Ctrl+O'] },
      { id: 'editor.openFolder', label: 'Apri una cartella', keys: ['Ctrl+Alt+O'] },
      { id: 'editor.sidebar', label: 'Mostra o nascondi la cartella', keys: ['Ctrl+B'] },
      { id: 'editor.complete', label: 'Mostra i suggerimenti', keys: ['Ctrl+Space'] },
    ],
  },
  { id: 'terminal', name: 'Terminale', glyph: 'terminal', color: '#3a3f4b' },
  { id: 'calendar', name: 'Calendario', glyph: 'calendar', color: '#e5484d' },
  { id: 'images', name: 'Immagini', glyph: 'image', color: '#d9822b' },
  { id: 'music', name: 'Musica', glyph: 'music', color: '#c2417a' },
  { id: 'mail', name: 'Posta', glyph: 'mail', color: '#30a46c' },
  { id: 'settings', name: 'Impostazioni', glyph: 'gear', color: '#5f6673', system: true, load: () => import('./settings/SettingsApp.js') },
];

export const getApp = id => apps.find(app => app.id === id);

let installed = () => true;

/** Set by the system (workspaces): (appId) → whether the current workspace has the app installed. */
export function setInstalledFilter(fn) {
  installed = fn;
}

/** True if the app can be used in the current workspace (system apps always). */
export const isInstalled = id => !!getApp(id) && (getApp(id).system === true || installed(id));

/** Apps installed in the current workspace, in registry order. */
export const installedApps = () => apps.filter(app => isInstalled(app.id));

export function launch(id, args) {
  bus.emit('app:launch', { id, args });
}
