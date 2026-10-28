import { svg, appIcon, fileType } from '@lilos/sdk';
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
    `<text x="12" y="23.4" text-anchor="middle" font-size="${badge.length > 3 ? 4.6 : 5.6}" font-weight="700" fill="#fff" font-family="Inter, system-ui, sans-serif">${badge}</text>`);
}

/** Icon for any desktop item data ({ type: 'folder' | 'file' | 'app', ... }). */
export function itemIcon(data) {
  if (data.type === 'folder') return folderIcon(data.color);
  if (data.type === 'app') return appIcon(getApp(data.app));
  return fileIcon(data.name);
}
