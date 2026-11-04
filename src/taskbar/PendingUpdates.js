import { h, icon, openMenu, locale } from '@lilos/sdk';
import { updates, reopenApp, restartSystem } from '../apps/updates.js';

const { t } = locale.define('lilos:pendingUpdates', {
  en: { strings: {
    restart: 'Restart lilOS to finish the updates', reopen: 'Updated apps to restart',
    heading: 'Updated, open with the previous version', reopenApp: 'Restart {name} ({version})', restartSystem: 'Restart lilOS',
  } },
});

/**
 * Taskbar button for updates not finished yet (apps/updates.js): apps updated elsewhere whose
 * windows here still run the old code, and lilOS waiting to restart. Hidden while there are none.
 */
export function createPendingUpdates() {
  const button = h('button', { class: 'tb-bg tb-updates', type: 'button', hidden: true, 'aria-haspopup': 'menu' }, icon('download'));

  const update = () => {
    const list = updates.pending();
    const restart = updates.restartReasons().length > 0;
    button.hidden = !list.length && !restart;
    const label = restart ? t('restart') : t('reopen');
    button.title = label;
    button.setAttribute('aria-label', label);
    button.classList.toggle('restart', restart);
  };

  button.addEventListener('click', () => {
    const r = button.getBoundingClientRect();
    const reopen = updates.pending().filter(p => p.kind === 'reopen');
    const reasons = updates.restartReasons();
    openMenu((document.documentElement.dir === 'rtl' ? r.right : r.left), r.top, [
      ...(reopen.length ? [
        { label: t('heading'), disabled: true },
        ...reopen.map(p => ({ label: t('reopenApp', { name: p.name, version: p.version }), icon: 'download', action: () => reopenApp(p.id) })),
      ] : []),
      ...(reopen.length && reasons.length ? ['-'] : []),
      ...(reasons.length ? [
        ...reasons.map(text => ({ label: text, disabled: true })),
        { label: t('restartSystem'), icon: 'power', action: () => restartSystem() },
      ] : []),
    ], { placement: 'above' });
  });

  updates.on('change', update);
  update();
  return button;
}
