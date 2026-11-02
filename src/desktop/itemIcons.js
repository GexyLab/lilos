import { h, svg, icon, appIcon, fileType, fs } from '@lilos/sdk';
import { getApp } from '../apps/registry.js';
import { thumbnailIcon } from '../apps/thumbnails.js';

export const FOLDER_COLOR = '#6f9bff';

// Same language as the app tiles (appIcon): flat shapes, square corners, details cut out so the
// background shows through. Masks need ids unique in the page.
let maskId = 0;

/** A folder: the tab and the body in one color, split by a cut; `glyph` is cut out of the body. */
export function folderIcon(color = FOLDER_COLOR, glyph = null) {
  const id = `lilos-folder-${++maskId}`;
  const el = svg('0 0 30 26', 'icon-folder',
    (glyph ? `<mask id="${id}"><rect width="30" height="26" fill="#fff"/><g transform="translate(9 11.25) scale(.5)" fill="none" stroke="#000" `
      + `stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">${icon(glyph).innerHTML}</g></mask>` : '') +
    '<path d="M1 1.5h9.8l2.6 2.6H29V8H1z" fill="currentColor"/>' +
    `<path d="M1 9.5h28V25H1z" fill="currentColor"${glyph ? ` mask="url(#${id})"` : ''}/>`);
  el.style.color = color;
  return el;
}

export function fileIcon(name) {
  // badge is sanitized to [A-Z0-9] and color comes from the type table: safe to interpolate
  const { badge, color } = fileType(name);
  const id = `lilos-file-${++maskId}`;
  return svg('0 0 24 30', 'icon-file',
    '<path d="M1 .5h13v10h9.5v19H1z" fill="#dfe3e9"/>' +
    '<path d="M15.5 .5l8 8h-8z" fill="#a9b1bd"/>' +
    (badge ? `<mask id="${id}"><rect width="24" height="30" fill="#fff"/><text x="12.25" y="24.6" text-anchor="middle" font-size="${badge.length > 3 ? 4.8 : 5.8}" `
      + `font-weight="700" fill="#000" font-family="Manrope, system-ui, sans-serif">${badge}</text></mask>` : '') +
    `<rect x="1" y="18.5" width="22.5" height="8.5" fill="${color}"${badge ? ` mask="url(#${id})"` : ''}/>`);
}

/** A place on the desk (Home, Documenti…): a folder with the place's glyph cut out of it. */
export function placeIcon(glyph, color) {
  return folderIcon(color, glyph);
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
 * The signs installed apps put on the icon of the items they have data on (node.apps, manifest
 * contributes.badge): [{ glyph, label, color }]. A content whose app is gone gets a lock.
 */
export function itemBadges(data) {
  if (!data?.apps || typeof data.apps !== 'object') return [];
  const out = [];
  for (const [id, value] of Object.entries(data.apps)) {
    const app = getApp(id);
    const badge = app?.text?.contributes?.badge;
    if (badge?.glyph) out.push({ glyph: badge.glyph, label: badge.label ?? app.name, color: app.color });
    else if (!app && value?.content === true) out.push({ glyph: 'lock', label: `Serve l’app ${id}`, color: '#5f6673' });
  }
  return out;
}

/**
 * A link (deskLinks.js): the icon of what it points to — its own, when it is in the home and there;
 * a globe for a web page —
 * with a chain at the bottom left; a broken one (its target was not found) fades and gets a red cross.
 */
function linkIcon(data) {
  const link = data.link ?? {};
  const broken = link.broken === true;
  const target = link.home && !broken ? fs.get(link.home) : null;
  const base = link.kind === 'web' ? appIcon({ glyph: 'globe', color: '#2f7fc1' })
    : target?.type === 'file' || target?.type === 'folder' ? itemIcon(target)
    : link.kind === 'folder' ? (link.mount && link.path === '/' ? placeIcon('globe') : folderIcon())
    : fileIcon(link.path?.split('/').pop() || data.name);
  const label = broken ? 'Collegamento rotto' : 'Collegamento';
  return h('span', { class: broken ? 'icon-link broken' : 'icon-link', title: label, 'aria-label': label },
    base, h('span', { class: 'icon-link-mark' }, icon(broken ? 'x' : 'link')));
}

/**
 * Icon for any desktop item data ({ type: 'folder' | 'file' | 'app' | 'link' | 'workarea' | 'trash', ... });
 * a folder with a `glyph` is a place (see fixedItems.js), the trash shows if it is `full`. Files and
 * folders carry the signs of the apps that have data on them (itemBadges).
 * `preview`: for a file node, the thumbnail its app makes (apps/thumbnails.js) about that many
 * CSS pixels on its longest side, in place of the icon once ready.
 */
export function itemIcon(data, { preview = 0 } = {}) {
  if (data.type === 'workarea') return workareaIcon();
  if (data.type === 'trash') return trashIcon(data.full);
  if (data.type === 'app') return appIcon(getApp(data.app));
  if (data.type === 'link') return linkIcon(data);
  // A network connection's folder shows a globe; its files make no thumbnails (they would be downloaded)
  const base = data.type === 'folder' ? (data.glyph ? placeIcon(data.glyph, data.color) : data.mount ? placeIcon('globe', data.color) : folderIcon(data.color))
    : preview > 0 && !data.fixed && !data.net ? thumbnailIcon(data, { size: preview, fallback: fileIcon(data.name) })
    : fileIcon(data.name);
  const badges = itemBadges(data);
  if (!badges.length) return base;
  const label = badges.map(b => b.label).join(', ');
  return h('span', { class: 'icon-badged', title: label, 'aria-label': label },
    base, h('span', { class: 'icon-badges' }, ...badges.map(b => h('span', { class: 'icon-badge', style: { backgroundColor: b.color } }, icon(b.glyph)))));
}
