import { h, icon, shortcuts, locale } from '@lilos/sdk';
import { Minimap } from './Minimap.js';

const { t } = locale.define('lilos:hud', {
  en: { strings: {
    zoomOut: 'Zoom out', zoomIn: 'Zoom in', fit: 'Show all', zoomReset: 'Zoom to 100%', help: 'Controls', withKey: '{text} ({keys})',
    'help.wheel': 'Wheel: zoom', 'help.move': 'Space + drag or middle button: move', 'help.select': 'Drag the background: select',
    'help.fit': '{keys}: show all',
  } },
});

/** 'Riduci (Ctrl −)', or just the text when the command has no shortcut. */
const withKey = (text, id) => (shortcuts.label(id) ? t('withKey', { text, keys: shortcuts.label(id) }) : text);

const help = () => [t('help.wheel'), t('help.move'), t('help.select'), shortcuts.label('desk.fit') && t('help.fit', { keys: shortcuts.label('desk.fit') })].filter(Boolean).join(' · ');

/** Floating panel with the minimap and zoom controls. */
export function createHud(canvas) {
  const minimap = new Minimap(canvas);
  const pct = h('button', { class: 'zoom-pct', onclick: () => canvas.resetZoom() });
  const showZoom = ({ s }) => { pct.textContent = Math.round(s * 100) + '%'; };
  canvas.on('camera', showZoom);
  showZoom(canvas.cam);

  const zoomOut = h('button', { 'aria-label': t('zoomOut'), onclick: () => canvas.zoomBy(1 / 1.2) }, icon('minus'));
  const zoomIn = h('button', { 'aria-label': t('zoomIn'), onclick: () => canvas.zoomBy(1.2) }, icon('plus'));
  const fit = h('button', { 'aria-label': t('fit'), onclick: () => canvas.fit() }, icon('fit'));
  const helpBtn = h('button', { 'aria-label': t('help') }, icon('help'));
  const titles = () => {
    zoomOut.title = withKey(t('zoomOut'), 'desk.zoomOut');
    zoomIn.title = withKey(t('zoomIn'), 'desk.zoomIn');
    fit.title = withKey(t('fit'), 'desk.fit');
    pct.title = withKey(t('zoomReset'), 'desk.zoomReset');
    helpBtn.title = help();
  };
  shortcuts.on('change', titles);
  titles();

  return h('div', { class: 'hud' }, minimap.el, h('div', { class: 'zoombar' }, zoomOut, pct, zoomIn, fit, helpBtn));
}
