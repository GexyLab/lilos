import { bus } from '../core/events.js';

/**
 * Installed apps. `glyph` is a name from ui/icons.js.
 * Apps have no implementation yet: launching only emits 'app:launch' for the future window manager.
 */
export const apps = [
  { id: 'files', name: 'File', glyph: 'folder', color: '#3b6ef5' },
  { id: 'browser', name: 'Browser', glyph: 'globe', color: '#0e8ad6' },
  { id: 'editor', name: 'Editor', glyph: 'code', color: '#7c5cdb' },
  { id: 'terminal', name: 'Terminale', glyph: 'terminal', color: '#3a3f4b' },
  { id: 'calendar', name: 'Calendario', glyph: 'calendar', color: '#e5484d' },
  { id: 'images', name: 'Immagini', glyph: 'image', color: '#d9822b' },
  { id: 'music', name: 'Musica', glyph: 'music', color: '#c2417a' },
  { id: 'mail', name: 'Posta', glyph: 'mail', color: '#30a46c' },
  { id: 'settings', name: 'Impostazioni', glyph: 'gear', color: '#5f6673' },
];

export const getApp = id => apps.find(app => app.id === id);

export function launch(id, args) {
  bus.emit('app:launch', { id, args });
}
