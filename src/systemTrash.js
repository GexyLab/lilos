import { fs, settings, toast } from '@lilos/sdk';

const DAY = 86_400_000;
const HOUR = 3_600_000;

/**
 * Deletes for good what has been in the trash longer than Sistema → Usabilità → Cestino
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
    if (n) toast(n === 1 ? 'Eliminato definitivamente 1 elemento più vecchio del nuovo periodo' : `Eliminati definitivamente ${n} elementi più vecchi del nuovo periodo`);
  });
  setInterval(sweep, HOUR);
}
