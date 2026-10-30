import { h, icon, openMenu } from '@lilos/sdk';
import { backgroundApps, running, stop } from '../apps/packages/background.js';
import { showAppProperties } from '../apps/appProperties.js';

/**
 * Taskbar button for the apps working in the background that asked to stay running
 * (lilos.app.keepAlive): hidden while there are none. Its menu lists them; stopping one ends
 * what it was doing (an encryption app, for example, forgets its keys).
 */
export function createBackgroundApps() {
  const count = h('span', { class: 'tb-bg-count' });
  const button = h('button', { class: 'tb-bg', type: 'button', hidden: true, 'aria-haspopup': 'menu' }, icon('bolt'), count);
  const kept = () => running().filter(r => r.keepAlive);

  const update = () => {
    const list = kept();
    button.hidden = !list.length;
    count.textContent = list.length > 1 ? String(list.length) : '';
    const label = list.length === 1 ? `${list[0].label} è attiva in background` : `${list.length} app attive in background`;
    button.title = label;
    button.setAttribute('aria-label', label);
  };

  button.addEventListener('click', () => {
    const r = button.getBoundingClientRect();
    const list = kept();
    openMenu(r.left, r.top, [
      { label: 'Attive in background', disabled: true },
      ...list.flatMap(item => [
        '-',
        { label: item.label === item.name ? item.name : `${item.name}: ${item.label}`, icon: item.glyph ?? 'bolt', action: () => showAppProperties(item.appId) },
        { label: 'Ferma', icon: 'x', action: () => stop(item.key) },
      ]),
    ], { placement: 'above' });
  });

  backgroundApps.on('change', update);
  update();
  return button;
}
