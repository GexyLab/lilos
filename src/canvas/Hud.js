import { h } from '../core/dom.js';
import { icon } from '../ui/icons.js';
import { Minimap } from './Minimap.js';

const HELP = 'Rotella: zoom · Trascina lo sfondo: sposta · Spazio + trascina: sposta ovunque · Shift+1: mostra tutto';

/** Floating panel with the minimap and zoom controls. */
export function createHud(canvas) {
  const minimap = new Minimap(canvas);
  const pct = h('button', { class: 'zoom-pct', title: 'Zoom al 100% (Ctrl 0)', onclick: () => canvas.resetZoom() });
  const showZoom = ({ s }) => { pct.textContent = Math.round(s * 100) + '%'; };
  canvas.on('camera', showZoom);
  showZoom(canvas.cam);

  return h('div', { class: 'hud' },
    minimap.el,
    h('div', { class: 'zoombar' },
      h('button', { title: 'Riduci (Ctrl −)', 'aria-label': 'Riduci', onclick: () => canvas.zoomBy(1 / 1.2) }, icon('minus')),
      pct,
      h('button', { title: 'Ingrandisci (Ctrl +)', 'aria-label': 'Ingrandisci', onclick: () => canvas.zoomBy(1.2) }, icon('plus')),
      h('button', { title: 'Mostra tutto (Shift 1)', 'aria-label': 'Mostra tutto', onclick: () => canvas.fit() }, icon('fit')),
      h('button', { title: HELP, 'aria-label': 'Comandi' }, icon('help')),
    ),
  );
}
