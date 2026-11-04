import { fs, settings, locale } from '@lilos/sdk';
import { notify } from './notifications/notify.js';

const { t } = locale.define('lilos:systemTrash', {
  en: { strings: {
    purged: { one: 'Deleted for good 1 item older than the new period', other: 'Deleted for good {n} items older than the new period' },
  } },
});

const DAY = 86_400_000;
const HOUR = 3_600_000;

/**
 * Deletes for good what has been in the trash longer than Control Panel → Usabilità → Cestino
 * says (trashRetention, in days; 0 keeps everything): at start-up, every hour and when the
 * period changes (then it says how many went). Every workspace's trashed items count, not only
 * the current one's.
 */
export function setupTrash() {
  const sweep = () => {
    const days = settings.get('trashRetention');
    return Number.isFinite(days) && days > 0 ? fs.purgeTrash(Date.now() - days * DAY) : 0;
  };
  sweep();
  settings.on('change:trashRetention', () => {
    const n = sweep();
    if (n) notify(t('purged', { n }));
  });
  setInterval(sweep, HOUR);
}
