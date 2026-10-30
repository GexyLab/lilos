import { h, svg, icon, appIcon, fileType } from '@lilos/sdk';
import { getApp } from '../apps/registry.js';

export const FOLDER_COLOR = '#6f9bff';

export function folderIcon(color = FOLDER_COLOR) {
  const el = svg('0 0 30 26', 'icon-folder',
    '<path d="M1 4a2.5 2.5 0 0 1 2.5-2.5h7l3 3h13A2.5 2.5 0 0 1 29 7v2H1z" fill="currentColor" opacity=".7"/>' +
    '<path d="M1 9a2 2 0 0 1 2-2h24a2 2 0 0 1 2 2v14a2.5 2.5 0 0 1-2.5 2.5h-23A2.5 2.5 0 0 1 1 23z" fill="currentColor"/>');
  el.style.color = color;
  return el;
}

export function fileIcon(name) {
  // badge is sanitized to [A-Z0-9] and color comes from the type table: safe to interpolate
  const { badge, color } = fileType(name);
  return svg('0 0 24 30', 'icon-file',
    '<path d="M3 .75h12.5l7.75 7.75V27a2.25 2.25 0 0 1-2.25 2.25H3A2.25 2.25 0 0 1 .75 27V3A2.25 2.25 0 0 1 3 .75z" fill="#fff" stroke="#c4c9d1" stroke-width="1.5"/>' +
    '<path d="M15.5.75V7a1.5 1.5 0 0 0 1.5 1.5h6.25" fill="none" stroke="#c4c9d1" stroke-width="1.5"/>' +
    `<rect x="3" y="17.5" width="18" height="8" rx="1.5" fill="${color}"/>` +
    `<text x="12" y="23.4" text-anchor="middle" font-size="${badge.length > 3 ? 4.6 : 5.6}" font-weight="600" fill="#fff" font-family="Manrope, system-ui, sans-serif">${badge}</text>`);
}

/** A place on the desk (Home, Documenti…): a folder with the place's glyph on it. */
export function placeIcon(glyph, color) {
  return h('span', { class: 'icon-place' }, folderIcon(color), icon(glyph, 'ico icon-place-glyph'));
}

/** The trash on the desk: a bin, with paper sticking out when something is in it. */
export function trashIcon(full = false) {
  return svg('0 0 28 32', full ? 'icon-trash full' : 'icon-trash',
    (full ? '<path class="trash-i-paper" d="M7.5 9.5l1.8-4.6 3.4 2 2.6-3.4 3 3.1 2.6-1.4.6 4.3z"/>' : '') +
    `<g${full ? ' transform="rotate(-12 3 7)"' : ''}><path class="trash-i-handle" d="M10.5 4.5V3a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 17.5 3v1.5"/>` +
    '<rect class="trash-i-lid" x="2.5" y="4.5" width="23" height="3.5" rx="1.5"/></g>' +
    '<path class="trash-i-body" d="M4.5 9.5h19l-1.7 19.2a2.5 2.5 0 0 1-2.5 2.3H8.7a2.5 2.5 0 0 1-2.5-2.3z"/>' +
    '<path class="trash-i-rib" d="M10 13.5v13M14 13.5v13M18 13.5v13"/>');
}

/** A reduced workarea: a dashed frame with two small windows inside (colors from the theme). */
export function workareaIcon() {
  return svg('0 0 34 30', 'icon-workarea',
    '<rect class="wa-i-frame" x="1.5" y="1.5" width="31" height="27" rx="4" stroke-width="1.6" stroke-dasharray="4 2.5"/>' +
    '<rect class="wa-i-back" x="5.5" y="7" width="13" height="10" rx="1.5"/>' +
    '<rect class="wa-i-front" x="15.5" y="13" width="13" height="11" rx="1.5" stroke-width="1.2"/>');
}

/**
 * Icon for any desktop item data ({ type: 'folder' | 'file' | 'app' | 'workarea' | 'trash', ... });
 * a folder with a `glyph` is a place (see fixedItems.js), the trash shows if it is `full`.
 */
export function itemIcon(data) {
  if (data.type === 'workarea') return workareaIcon();
  if (data.type === 'trash') return trashIcon(data.full);
  if (data.type === 'folder') return data.glyph ? placeIcon(data.glyph, data.color) : folderIcon(data.color);
  if (data.type === 'app') return appIcon(getApp(data.app));
  return fileIcon(data.name);
}
