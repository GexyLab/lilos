import { h } from '../core/dom.js';
import { icon } from './icons.js';

let current = null;

export function closeMenu() {
  current?.close();
}

/**
 * Pop-up menu at a screen point. Only one is open at a time (with its submenus).
 *   items: { label, icon?, swatch?, shortcut?, danger?, disabled?, action }   swatch: '#rrggbb', a color dot before the label
 *        | { label, icon?, disabled?, items: [...] }   submenu, opened on hover, click or →
 *        | '-'                                         separator
 *   placement: 'below' opens from the point downwards, 'above' puts the menu's bottom edge on the point
 *
 * Keyboard: ↑ ↓ move, → or Enter opens a submenu, ← or Esc closes it (Esc on the first level closes all).
 */
export function openMenu(x, y, items, { placement = 'below' } = {}) {
  closeMenu();
  const levels = [];   // open panels, first = root

  function panel(list, depth) {
    const buttons = [];
    const el = h('div', { class: 'menu', role: 'menu', dataset: { depth } }, list.map(item => {
      if (item === '-') return h('div', { class: 'menu-sep', role: 'separator' });
      const sub = Array.isArray(item.items);
      const button = h('button', {
        class: ['menu-item', item.danger && 'danger', sub && 'has-sub'].filter(Boolean).join(' '),
        role: 'menuitem', type: 'button', disabled: item.disabled || (sub && !item.items.length),
        'aria-haspopup': sub ? 'menu' : null, 'aria-expanded': sub ? 'false' : null,
        onclick: () => {
          if (sub) return openSub(button, item, depth, true);
          close();
          item.action?.();
        },
        onpointerenter: () => {
          if (sub) openSub(button, item, depth, false);
          else closeFrom(depth + 1);
        },
      },
        item.icon ? icon(item.icon) : h('span', { class: 'ico' }),
        // Only a plain hex color reaches the style
        /^#[0-9a-f]{6}$/i.test(item.swatch ?? '') && h('span', { class: 'menu-swatch', style: `background:${item.swatch}`, 'aria-hidden': 'true' }),
        h('span', { class: 'menu-label' }, item.label),
        item.shortcut && !sub && h('kbd', {}, item.shortcut),
        sub && h('span', { class: 'menu-arrow', 'aria-hidden': 'true' }, '›'),
      );
      buttons.push(button);
      return button;
    }));
    document.body.append(el);
    const level = { el, buttons, owner: null };
    levels[depth] = level;
    return level;
  }

  function place(el, px, py, opts = {}) {
    const r = el.getBoundingClientRect();
    let left = px, top = opts.above ? py - r.height : py;
    if (opts.besideOf) {
      // Submenu: right of the parent item, or left of the parent menu if there is no room
      const p = opts.besideOf;
      left = p.right + r.width + 4 <= innerWidth ? p.right - 2 : Math.max(4, p.left - r.width + 2);
      top = p.top - 5;
    }
    el.style.left = Math.max(4, Math.min(left, innerWidth - r.width - 4)) + 'px';
    el.style.top = Math.max(4, Math.min(top, innerHeight - r.height - 4)) + 'px';
  }

  function closeFrom(depth) {
    while (levels.length > depth) {
      const level = levels.pop();
      level.el.remove();
      if (level.owner) level.owner.setAttribute('aria-expanded', 'false');
    }
  }

  function openSub(button, item, depth, focusFirst) {
    if (levels[depth + 1]?.owner === button) {
      if (focusFirst) levels[depth + 1].buttons.find(b => !b.disabled)?.focus();
      return;
    }
    closeFrom(depth + 1);
    const level = panel(item.items, depth + 1);
    level.owner = button;
    button.setAttribute('aria-expanded', 'true');
    const parent = levels[depth].el.getBoundingClientRect();
    place(level.el, 0, 0, { besideOf: { top: button.getBoundingClientRect().top, left: parent.left, right: parent.right } });
    if (focusFirst) level.buttons.find(b => !b.disabled)?.focus();
  }

  const root = panel(items, 0);
  place(root.el, x, y, { above: placement === 'above' });

  const onPointerDown = e => { if (!levels.some(l => l.el.contains(e.target))) close(); };
  const onKey = e => {
    // While a menu is open it owns the keyboard
    e.stopPropagation();
    const depth = levels.findIndex(l => l.el.contains(document.activeElement));
    const level = levels[depth] ?? levels[levels.length - 1];
    const d = depth === -1 ? levels.length - 1 : depth;
    if (e.key === 'Escape' || (e.key === 'ArrowLeft' && d > 0)) {
      e.preventDefault();
      if (d === 0) return close();
      const owner = levels[d].owner;
      closeFrom(d);
      owner?.focus();
      return;
    }
    if (e.key === 'ArrowRight' || (e.key === 'Enter' && document.activeElement?.classList.contains('has-sub'))) {
      const b = document.activeElement;
      if (b?.classList.contains('has-sub') && level.buttons.includes(b)) {
        e.preventDefault();
        b.click();
      }
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const enabled = level.buttons.filter(b => !b.disabled);
    const i = enabled.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? i + 1 : (i < 0 ? enabled.length : i) - 1;
    enabled[(next + enabled.length) % enabled.length]?.focus();
  };

  function close() {
    closeFrom(0);
    removeEventListener('pointerdown', onPointerDown, true);
    removeEventListener('keydown', onKey, true);
    removeEventListener('wheel', close, true);
    removeEventListener('resize', close);
    removeEventListener('blur', close);
    if (current === api) current = null;
  }

  addEventListener('pointerdown', onPointerDown, true);
  addEventListener('keydown', onKey, true);
  addEventListener('wheel', close, { capture: true, passive: true });
  addEventListener('resize', close);
  addEventListener('blur', close);

  const api = { el: root.el, close };
  current = api;
  return api;
}
