import { SettingsWindow, selectField, storage } from '@lilos/sdk';
import { t } from './i18n.js';

/**
 * Terminal's options (the window's menu → Options…), saved with the app's storage:
 *   openTerm   'window' | 'tab'   where a .term file opens when it does not say it itself
 */
const KEY = 'terminal.options';
const DEFAULTS = { openTerm: 'window' };
const CHOICES = { openTerm: ['window', 'tab'] };

const read = () => {
  const saved = storage.get(KEY, {});
  return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
};

export const options = {
  get(key) {
    const value = read()[key];
    return CHOICES[key]?.includes(value) ? value : DEFAULTS[key];
  },
  set(key, value) {
    if (!CHOICES[key]?.includes(value)) return;
    storage.set(KEY, { ...read(), [key]: value });
  },
};

const WINDOW_KEY = 'terminal-options';
let current = null;

/** The Options window (one). */
export function openOptions(openWindow) {
  if (current?.el.isConnected) return openWindow(current, WINDOW_KEY);
  const win = new SettingsWindow({
    title: t('options.title'), icon: 'terminal', width: 640, height: 400, search: false,
    tabs: [{
      id: 'general', label: t('options.tab.general'), icon: 'gear', description: t('options.tab.generalDescription'),
      sections: () => [{
        title: t('options.files'),
        rows: [{
          label: t('options.openTerm'), description: t('options.openTermDescription'),
          control: selectField({
            value: options.get('openTerm'), label: t('options.openTerm'),
            options: CHOICES.openTerm.map(v => ({ value: v, label: t(`options.openTerm.${v}`) })),
            onChange: v => options.set('openTerm', v),
          }),
        }],
      }],
    }],
  });
  current = win;
  win.on('destroy', () => { if (current === win) current = null; });
  return openWindow(win, WINDOW_KEY);
}
