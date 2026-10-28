import { h } from '../core/dom.js';
import { session } from '../core/session.js';
import { apps, launch } from '../apps/registry.js';
import { appIcon } from '../apps/appIcon.js';
import { avatar } from '../ui/avatar.js';
import { closeMenu } from '../ui/ContextMenu.js';
import { icon } from '../ui/icons.js';

/** Launcher opened by the logo button (or Ctrl+K): app search, app list, user footer. */
export class StartMenu {
  #results = [];
  #active = 0;

  constructor(anchor) {
    this.anchor = anchor;
    this.input = h('input', { type: 'text', placeholder: 'Cerca app', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Cerca app' });
    this.heading = h('div', { class: 'sm-heading' });
    this.list = h('div', { class: 'sm-list', role: 'listbox' });

    this.el = h('div', { class: 'start-menu', role: 'dialog', 'aria-label': 'Menu lilOS' },
      h('label', { class: 'sm-search' }, icon('search'), this.input),
      this.heading,
      this.list,
      h('div', { class: 'sm-footer' },
        h('div', { class: 'sm-user' }, avatar(session.user), h('span', {}, session.user.name)),
        h('button', { class: 'sm-btn', title: 'Impostazioni', 'aria-label': 'Impostazioni', onclick: () => this.#launch('settings') }, icon('gear')),
        h('button', { class: 'sm-btn', title: 'Riavvia sessione', 'aria-label': 'Riavvia sessione', onclick: () => location.reload() }, icon('power')),
      ),
    );
    document.body.append(this.el);

    this.input.addEventListener('input', () => this.#render());
    this.el.addEventListener('keydown', e => this.#onKey(e));
    addEventListener('pointerdown', e => {
      if (this.isOpen && !this.el.contains(e.target) && !anchor.contains(e.target)) this.close();
    }, true);
    addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); this.toggle(); }
    });
    this.#render();
  }

  get isOpen() {
    return this.el.classList.contains('open');
  }

  open() {
    closeMenu();
    this.input.value = '';
    this.#render();
    this.el.classList.add('open');
    this.anchor.classList.add('active');
    this.anchor.setAttribute('aria-expanded', 'true');
    this.input.focus();
  }

  close() {
    if (!this.isOpen) return;
    this.el.classList.remove('open');
    this.anchor.classList.remove('active');
    this.anchor.setAttribute('aria-expanded', 'false');
    if (this.el.contains(document.activeElement)) document.activeElement.blur();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  #render() {
    const query = this.input.value.trim().toLowerCase();
    this.#results = apps.filter(app => app.name.toLowerCase().includes(query));
    this.heading.textContent = query ? 'Risultati' : 'App';
    this.list.replaceChildren(...this.#results.map((app, i) =>
      h('button', {
        class: 'sm-item', role: 'option', tabindex: '-1',
        onclick: () => this.#launch(app.id),
        onpointermove: () => this.#setActive(i),
      }, appIcon(app), h('span', {}, app.name))));
    if (!this.#results.length) this.list.append(h('div', { class: 'sm-empty' }, `Nessuna app per “${this.input.value.trim()}”`));
    this.#setActive(0);
  }

  #setActive(i) {
    this.#active = i;
    [...this.list.children].forEach((el, j) => {
      el.classList.toggle('active', j === i);
      el.setAttribute('aria-selected', String(j === i));
    });
    this.list.children[i]?.scrollIntoView?.({ block: 'nearest' });
  }

  #onKey(e) {
    // The menu owns the keyboard while focused: desktop/canvas shortcuts must not fire underneath
    e.stopPropagation();
    const n = this.#results.length;
    if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      this.close();
      this.anchor.focus();
    } else if (e.key === 'ArrowDown' && n) {
      e.preventDefault();
      this.#setActive((this.#active + 1) % n);
    } else if (e.key === 'ArrowUp' && n) {
      e.preventDefault();
      this.#setActive((this.#active - 1 + n) % n);
    } else if (e.key === 'Enter' && n) {
      e.preventDefault();
      this.#launch(this.#results[this.#active].id);
    }
  }

  #launch(id) {
    this.close();
    launch(id);
  }
}
