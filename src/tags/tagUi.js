import { fs, tags, h } from '@lilos/sdk';
import { launch } from '../apps/registry.js';

const MAX_DOTS = 4;

/**
 * The colored dots of a node's tags (at most 4, then "+n"), with their names in the tooltip and
 * for screen readers; null if it has none.
 */
export function tagDots(node, cls = 'tag-dots') {
  const list = (node?.tags ?? []).map(id => tags.get(id)).filter(Boolean);
  if (!list.length) return null;
  const names = list.map(t => t.name).join(', ');
  return h('span', { class: cls, title: `Tag: ${names}`, role: 'img', 'aria-label': `Tag: ${names}` },
    list.slice(0, MAX_DOTS).map(t => h('span', { class: 'tag-dot', style: { background: t.color } })),
    list.length > MAX_DOTS ? h('span', { class: 'tag-more' }, `+${list.length - MAX_DOTS}`) : null);
}

/** Puts a tag on every node (on) or takes it off every node. System nodes are skipped. */
export function setTag(ids, tagId, on) {
  for (const id of ids) {
    const node = fs.get(id);
    if (!node || node.system) continue;
    const current = node.tags ?? [];
    fs.setTags(id, on ? [...current, tagId] : current.filter(t => t !== tagId));
  }
}

/**
 * "Tag" submenu for some nodes: one entry per tag, checked when every node has it (choosing it
 * then takes it off all of them, otherwise puts it on all), then a new tag and the tag settings.
 */
export function tagSubmenu(ids) {
  const nodes = ids.map(id => fs.get(id)).filter(n => n && !n.system);
  const list = tags.list();
  return {
    label: 'Tag', icon: 'tag', disabled: !nodes.length,
    items: [
      ...list.map(t => {
        const all = nodes.every(n => n.tags?.includes(t.id));
        return {
          label: t.visible ? t.name : `${t.name} (nasconde)`, icon: all ? 'check' : null, swatch: t.color,
          action: () => setTag(nodes.map(n => n.id), t.id, !all),
        };
      }),
      ...(list.length ? ['-'] : []),
      { label: 'Nuovo tag…', icon: 'plus', action: () => launch('settings', { tab: 'tags', tagFor: nodes.map(n => n.id) }) },
      { label: 'Gestisci i tag…', icon: 'gear', action: () => launch('settings', { tab: 'tags' }) },
    ],
  };
}
