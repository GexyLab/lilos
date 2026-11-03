import { h, icon, trackDrag } from '@lilos/sdk';
import { badge } from './remote/RemoteTab.js';
import { t } from './i18n.js';

/**
 * Dragging a tab (window.js: the dragStart of its pane's TabBar). Where it is dropped:
 *   on a tab bar                 into that pane, where the blue line is          { kind: 'bar', owner, group, index }
 *   near an edge of a terminal   a new pane on that side                          { kind: 'split', owner, group, side }
 *   in the middle of a terminal  at the end of that pane (another pane)           { kind: 'pane', owner, group }
 *   out of every Terminal window a window of its own there                        { kind: 'window', dx, dy }
 * Panes of other Terminal windows count as well. Esc gives up.
 */

/** Pane element → { owner: TerminalWindow, group } (window.js fills it). */
export const groupAt = new WeakMap();

const EDGE = 0.25;   // the part of a terminal near each edge that makes a new pane

export function dragTab(e, tab, owner) {
  if (e.button !== 0) return;
  let ghost = null, mark = null, target = null, cancelled = false;
  const clear = () => { mark?.remove(); mark = null; };
  const onKey = ev => {
    if (ev.key !== 'Escape') return;
    ev.preventDefault();
    ev.stopPropagation();
    cancelled = true;
    ghost?.remove();
    clear();
  };
  trackDrag(e, {
    threshold: 6,
    onMove: (dx, dy, ev) => {
      if (cancelled) return;
      if (!ghost) {
        ghost = h('div', { class: 'tm-ghost', 'aria-hidden': 'true' }, tab.remote ? badge(tab.session.protocol) : icon('terminal'), h('span', {}, owner.nameOf(tab)));
        document.body.append(ghost);
        addEventListener('keydown', onKey, true);
      }
      ghost.style.left = `${ev.clientX + 10}px`;
      ghost.style.top = `${ev.clientY + 8}px`;
      target = find(ev.clientX, ev.clientY, tab, owner);
      if (target?.kind === 'window') Object.assign(target, { dx, dy });
      clear();
      mark = drawMark(target, tab, owner, ev);
    },
    onEnd: (moved, ev) => {
      removeEventListener('keydown', onKey, true);
      ghost?.remove();
      clear();
      if (moved && !cancelled && target) owner.drop(tab, target, ev);
    },
  });
}

function find(x, y, tab, owner) {
  const el = document.elementsFromPoint(x, y).find(n => !n.closest('.tm-ghost, .tm-mark'));
  const groupEl = el?.closest('.tm-group');
  const at = groupEl && groupAt.get(groupEl);
  if (!at) {
    // Over another part of its own window (the side panel, the title bar): nothing
    if (el && owner.win.el.contains(el)) return null;
    return { kind: 'window' };
  }
  const { group } = at;
  const own = group.tabs.includes(tab);
  if (group.bar.contains(el)) {
    const tabs = [...group.tabBar.list.querySelectorAll('.sh-tab')];
    let index = tabs.findIndex(n => { const r = n.getBoundingClientRect(); return x < r.left + r.width / 2; });
    if (index < 0) index = tabs.length;
    return { kind: 'bar', owner: at.owner, group, index };
  }
  const r = group.panes.getBoundingClientRect();
  const fx = (x - r.left) / r.width, fy = (y - r.top) / r.height;
  const near = [['left', fx], ['right', 1 - fx], ['up', fy], ['down', 1 - fy]].sort((a, b) => a[1] - b[1])[0];
  if (near[1] < EDGE) return own && group.tabs.length === 1 ? null : { kind: 'split', owner: at.owner, group, side: near[0] };
  return own ? null : { kind: 'pane', owner: at.owner, group };
}

/** What shows where the tab would go. */
function drawMark(target, tab, owner, ev) {
  if (!target) return null;
  if (target.kind === 'window') {
    if (owner.tabs.length < 2) return null;   // the window itself moves
    const r = owner.win.el.getBoundingClientRect();
    const mark = h('div', { class: 'tm-mark tm-mark-window', style: { left: `${ev.clientX - 60}px`, top: `${ev.clientY - 14}px`, width: `${r.width}px`, height: `${r.height}px` } },
      h('span', {}, icon('window'), t('drag.newWindow', { name: owner.nameOf(tab) })));
    document.body.append(mark);
    return mark;
  }
  if (target.kind === 'bar') {
    const { bar, tabBar } = target.group;
    const tabs = [...tabBar.list.querySelectorAll('.sh-tab')];
    const b = bar.getBoundingClientRect();
    const ref = tabs[target.index];
    const x = ref ? ref.getBoundingClientRect().left - 2 : (tabs.at(-1)?.getBoundingClientRect().right ?? b.left + 30) + 1;
    const mark = h('div', { class: 'tm-mark tm-mark-line', style: { left: `${x}px`, top: `${b.top + 4}px`, height: `${b.height - 6}px` } });
    document.body.append(mark);
    return mark;
  }
  const r = target.group.panes.getBoundingClientRect();
  const box = { left: r.left, top: r.top, width: r.width, height: r.height };
  if (target.kind === 'split') {
    if (target.side === 'right') box.left += r.width / 2;
    if (target.side === 'down') box.top += r.height / 2;
    if (target.side === 'left' || target.side === 'right') box.width /= 2;
    else box.height /= 2;
  }
  const label = target.kind === 'pane' ? t('drag.pane') : t(`drag.split.${target.side}`);
  const mark = h('div', { class: 'tm-mark tm-mark-area', style: Object.fromEntries(Object.entries(box).map(([k, v]) => [k, `${v}px`])) },
    h('span', {}, label));
  document.body.append(mark);
  return mark;
}
