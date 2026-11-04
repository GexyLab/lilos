import { locale } from '@lilos/sdk';

const { t } = locale.define('lilos:deskSeed', {
  en: { strings: { projects: 'Projects', welcome: 'welcome.txt', settings: 'Control Panel' } },
});

/**
 * Items placed on the desk (/Scrivania) on first start, named in the system's language (the File
 * Manager is a fixed item: fixedItems.js). `welcome`: the file that gets the welcome text.
 */
export const seedItems = () => [
  { type: 'folder', name: t('projects'), color: '#e8b44c' },
  { type: 'file', name: t('welcome'), welcome: true },
  { type: 'app', name: 'Editor', app: 'editor' },
  { type: 'app', name: t('settings'), app: 'settings' },
];
