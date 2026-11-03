import { h, fs, fileType, session, settings, formatBytes } from '@lilos/sdk';
import * as sdk from '@lilos/sdk';   // `net`: missing in older lilOS
import { describeWorkspace } from '@lilos/system';
import { t } from './i18n.js';

/** Labels shared by the list, the information panel and the preview. */

export const num = n => n.toLocaleString(session.locale);

export const typeLabel = n => (n.type === 'folder' ? t('type.folder') : n.type === 'app' ? t('type.app')
  : n.type === 'link' ? t({ folder: 'type.linkFolder', web: 'type.linkWeb' }[n.link?.kind] ?? 'type.linkFile') : fileType(n.name).label);

/** Where a link points: its path in the home, or the connection and the path on it. */
export function linkPlace(n) {
  const link = n.link ?? {};
  if (link.kind === 'web') return link.url;
  if (link.home) return fs.exists(link.home) ? fs.path(link.home) : t('link.notFound');
  return `${sdk.net?.mount(link.mount)?.name ?? t('link.mountGone')}: ${link.path}`;
}
export const folderName = n => (n.id === fs.root ? t('place.home') : n.name);
export const locationLabel = n => (n.parent === fs.root ? t('place.home') : fs.path(n.parent));

/** Where a trashed item goes back when restored: the folder it left, or Home if that is gone. */
export function originLabel(n) {
  const from = n.trashed.from;
  return fs.exists(from) && from !== fs.root ? fs.path(from) : t('place.home');
}

/** Whose a node is: the workspace that made it, or shared (system folders). */
export function ownerLabel(n) {
  const ws = describeWorkspace(n.workspace);
  if (!ws) return n.workspace ? t('owner.unknown') : t('owner.shared');
  return ws.removed ? t('owner.removed', { name: ws.name }) : ws.name;
}

export function ownerNode(n) {
  const ws = describeWorkspace(n.workspace);
  const dot = h('span', { class: 'ws-owner-dot', 'aria-hidden': 'true' });
  if (ws) dot.style.background = ws.color;   // validated hex color (workspaces/store.js)
  return h('span', { class: ['ws-owner', !ws && 'shared', ws?.removed && 'removed'].filter(Boolean).join(' '), title: t('owner.label', { name: ownerLabel(n) }) },
    dot, h('span', {}, ownerLabel(n)));
}

export const countLabel = n => t('count.items', { n, count: num(n) });

export function sizeLabel(n) {
  if (n.type === 'folder') return countLabel(n.trashed ? n.inside : fs.children(n.id).length);
  // A document of a connection with no bytes of its own (Google's): no size
  if (n.type === 'file' && n.net && n.web) return '—';
  return n.type === 'file' ? formatBytes(n.size ?? 0) : '—';
}

/** Status bar of the trash: how long it keeps what it holds. */
export function retentionLabel() {
  const days = settings.get('trashRetention');
  if (days <= 0) return t('trash.keptForever');
  return t('trash.keptDays', { n: days, count: num(days) });
}

export const dateLabel = time => new Date(time).toLocaleString(session.locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
