import { h } from '../core/dom.js';
import { icon } from './icons.js';

let current = null;

export function closeMenu() {
  current?.close();
}

/**
 * Pop-up menu at a screen point. Only one is open at a time.
 *   items: { label, icon?, shortcut?, danger?, disabled?, action } | '-' (separator)
 *   placement: 'below' opens from the point downwards, 'above' puts the menu's bottom edge on the point
 */
export function openMenu(x, y, items, { placement = 'below' } = {}) {
  closeMenu();

  const buttons = [];
  const el = h('div', { class: 'menu', role: 'menu' }, items.map(item => {
    if (item === '-') return h('div', { class: 'menu-sep', role: 'separator' });
    const button = h('button', {
      class: item.danger ? 'menu-item danger' : 'menu-item',
      role: 'menuitem',
      disabled: item.disabled,
      onclick: () => { close(); item.action?.(); },
    },
      item.icon ? icon(item.icon) : h('span', { class: 'ico' }),
      h('span', { class: 'menu-label' }, item.label),
      item.shortcut && h('kbd', {}, item.shortcut),
    );
    buttons.push(button);
    return button;
  }));
  document.body.append(el);

  const r = el.getBoundingClientRect();
  const top = placement === 'above' ? y - r.height : Math.min(y, innerHeight - r.height - 4);
  el.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 4)) + 'px';
  el.style.top = Math.max(4, top) + 'px';

  const onPointerDown = e => { if (!el.contains(e.target)) close(); };
  const onKey = e => {
    // While a menu is open it owns the keyboard
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const enabled = buttons.filter(b => !b.disabled);
    const i = enabled.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? i + 1 : (i < 0 ? enabled.length : i) - 1;
    enabled[(next + enabled.length) % enabled.length]?.focus();
  };

  function close() {
    el.remove();
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

  const api = { el, close };
  current = api;
  return api;
}
