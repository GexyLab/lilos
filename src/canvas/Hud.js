import { h, icon, shortcuts } from '@lilos/sdk';
import { Minimap } from './Minimap.js';

/** 'Riduci (Ctrl −)', or just the text when the command has no shortcut. */
const withKey = (text, id) => (shortcuts.label(id) ? `${text} (${shortcuts.label(id)})` : text);

const help = () => ['Rotella: zoom', 'Spazio + trascina o tasto centrale: sposta', 'Trascina lo sfondo: seleziona', shortcuts.label('desk.fit') && `${shortcuts.label('desk.fit')}: mostra tutto`].filter(Boolean).join(' · ');

/** Floating panel with the minimap and zoom controls. */
export function createHud(canvas) {
  const minimap = new Minimap(canvas);
  const pct = h('button', { class: 'zoom-pct', onclick: () => canvas.resetZoom() });
  const showZoom = ({ s }) => { pct.textContent = Math.round(s * 100) + '%'; };
  canvas.on('camera', showZoom);
  showZoom(canvas.cam);

  const zoomOut = h('button', { 'aria-label': 'Riduci', onclick: () => canvas.zoomBy(1 / 1.2) }, icon('minus'));
  const zoomIn = h('button', { 'aria-label': 'Ingrandisci', onclick: () => canvas.zoomBy(1.2) }, icon('plus'));
  const fit = h('button', { 'aria-label': 'Mostra tutto', onclick: () => canvas.fit() }, icon('fit'));
  const helpBtn = h('button', { 'aria-label': 'Comandi' }, icon('help'));
  const titles = () => {
    zoomOut.title = withKey('Riduci', 'desk.zoomOut');
    zoomIn.title = withKey('Ingrandisci', 'desk.zoomIn');
    fit.title = withKey('Mostra tutto', 'desk.fit');
    pct.title = withKey('Zoom al 100%', 'desk.zoomReset');
    helpBtn.title = help();
  };
  shortcuts.on('change', titles);
  titles();

  return h('div', { class: 'hud' }, minimap.el, h('div', { class: 'zoombar' }, zoomOut, pct, zoomIn, fit, helpBtn));
}
