import { h } from '../core/dom.js';
import { Emitter } from '../core/events.js';
import { uid } from '../core/storage.js';
import { icon } from './icons.js';

/**
 * Tabbed layout shared by every settings window: main tabs listed vertically on the left,
 * the selected tab in the center (title, description, optional horizontal secondary tabs,
 * sections of label + control rows) and an optional footer.
 *
 *   tabs: Array<
 *     { group: 'Sistema' }                                   group heading ('' = spacer)
 *     | { id, label, icon, badge?, description?,
 *         sections?: Section[] | () => Section[],           when the tab has no secondary tabs
 *         subtabs?: Array<{ id, label, sections }> }        horizontal secondary tabs
 *   >
 *   Section: { title?, rows?: Row[], content?: Node | () => Node }
 *   Row:     { label, description?, keywords?, control?: Node | string | () => Node | string }
 *
 * Sections given as functions (and function controls) are rebuilt on every render, so they
 * always show current values.
 *
 * Events: 'select' { tab, subtab }
 */
export class SettingsView extends Emitter {
  #tabs;
  #query = '';
  #tab = null;
  #subtab = new Map();
  #ids = uid();

  constructor({ tabs, search = true, footer = null } = {}) {
    super();
    this.#tabs = tabs;

    this.tabList = h('nav', { class: 'st-tabs', role: 'tablist', 'aria-orientation': 'vertical', 'aria-label': 'Sezioni' });
    this.heading = h('h1', { id: `${this.#ids}-h` });
    this.description = h('p');
    this.head = h('header', { class: 'st-head' }, this.heading, this.description);
    this.subtabList = h('div', { class: 'st-subtabs', role: 'tablist', 'aria-orientation': 'horizontal' });
    this.panel = h('div', { class: 'st-body', role: 'tabpanel', 'aria-labelledby': `${this.#ids}-h`, tabindex: '-1' });

    const searchInput = !search ? null : h('input', { type: 'text', placeholder: 'Cerca impostazioni', 'aria-label': 'Cerca impostazioni', spellcheck: 'false' });
    searchInput?.addEventListener('input', () => this.#filter(searchInput.value));
    searchInput?.addEventListener('keydown', e => {
      if (e.key === 'Escape' && searchInput.value) { e.stopPropagation(); searchInput.value = ''; this.#filter(''); }
    });

    this.footerNote = h('span', { class: 'st-note' });
    this.footer = footer && h('footer', { class: 'st-foot' },
      this.footerNote, h('span', { class: 'st-grow' }), footer.buttons ?? []);
    if (footer?.note) this.footerNote.textContent = footer.note;

    this.el = h('div', { class: 'settings' },
      h('aside', { class: 'st-side' },
        searchInput && h('label', { class: 'st-search' }, icon('search'), searchInput),
        this.tabList),
      h('div', { class: 'st-main' }, this.head, this.subtabList, this.panel, this.footer));

    this.tabList.addEventListener('keydown', e => this.#arrows(e, this.tabList, 'ArrowUp', 'ArrowDown'));
    this.subtabList.addEventListener('keydown', e => this.#arrows(e, this.subtabList, 'ArrowLeft', 'ArrowRight'));

    const first = this.#mainTabs()[0];
    if (first) this.select(first.id);
  }

  get tab() { return this.#tab; }
  get subtab() { return this.#tab?.subtabs?.find(s => s.id === this.#subtab.get(this.#tab.id)) ?? null; }

  /** Show a main tab and, optionally, one of its secondary tabs (the last used one otherwise). */
  select(tabId, subtabId) {
    const tab = this.#mainTabs().find(t => t.id === tabId);
    if (!tab) return;
    this.#tab = tab;
    if (tab.subtabs?.length) {
      const valid = id => tab.subtabs.some(s => s.id === id);
      this.#subtab.set(tab.id, valid(subtabId) ? subtabId : valid(this.#subtab.get(tab.id)) ? this.#subtab.get(tab.id) : tab.subtabs[0].id);
    }
    this.render();
    this.emit('select', { tab: this.tab, subtab: this.subtab });
  }

  setBadge(tabId, value) {
    const tab = this.#mainTabs().find(t => t.id === tabId);
    if (!tab) return;
    tab.badge = value;
    this.#renderTabs();
  }

  /** Text on the left of the footer (e.g. "1 modifica non salvata"). */
  setNote(text) {
    this.footerNote.textContent = text ?? '';
  }

  /** Rebuilds the tab list and the current page. */
  render() {
    this.#renderTabs();
    const tab = this.#tab;
    if (!tab) {
      this.heading.textContent = '';
      this.description.textContent = '';
      this.subtabList.hidden = true;
      this.panel.replaceChildren(h('div', { class: 'st-empty' }, 'Nessuna impostazione trovata'));
      return;
    }
    this.heading.textContent = tab.label;
    this.description.textContent = tab.description ?? '';
    this.description.hidden = !tab.description;

    const subtabs = tab.subtabs ?? [];
    const active = this.subtab;
    this.subtabList.hidden = !subtabs.length;
    this.head.classList.toggle('alone', !subtabs.length);
    this.subtabList.replaceChildren(...subtabs.map(s => {
      const on = s === active;
      return h('button', {
        class: on ? 'st-subtab on' : 'st-subtab', type: 'button', role: 'tab',
        'aria-selected': String(on), tabindex: on ? '0' : '-1', dataset: { id: s.id },
        onclick: () => this.select(tab.id, s.id),
      }, s.label);
    }));

    const sections = resolve(active ? active.sections : tab.sections) ?? [];
    this.panel.replaceChildren(...sections.map(s => this.#section(s)));
    this.panel.scrollTop = 0;
  }

  // ---------- Internals ----------

  #mainTabs() {
    return this.#tabs.filter(t => t.id);
  }

  #renderTabs() {
    const visible = new Set(this.#mainTabs().filter(t => this.#matches(t)));
    const items = [];
    let pendingGroup = null;
    for (const t of this.#tabs) {
      if (!t.id) { pendingGroup = t; continue; }
      if (!visible.has(t)) continue;
      if (pendingGroup) {
        items.push(h('div', { class: 'st-group', 'aria-hidden': pendingGroup.group ? null : 'true' }, pendingGroup.group || ' '));
        pendingGroup = null;
      }
      const on = t === this.#tab;
      items.push(h('button', {
        class: on ? 'st-tab on' : 'st-tab', type: 'button', role: 'tab',
        'aria-selected': String(on), tabindex: on ? '0' : '-1', dataset: { id: t.id },
        onclick: () => this.select(t.id),
      }, icon(t.icon), h('span', { class: 'st-tab-label' }, t.label), t.badge ? h('span', { class: 'st-badge' }, String(t.badge)) : null));
    }
    if (!visible.size) items.push(h('div', { class: 'st-none' }, 'Nessun risultato'));
    this.tabList.replaceChildren(...items);
  }

  #section(section) {
    const rows = section.rows ?? [];
    const content = section.content ? [resolve(section.content)] : rows.map(r => this.#row(r));
    return h('section', { class: 'st-section' },
      section.title && h('h2', {}, section.title),
      h('div', { class: 'st-card' }, content));
  }

  #row(row) {
    let control = resolve(row.control);
    if (typeof control === 'string' || typeof control === 'number') control = h('span', { class: 'st-value' }, control);
    if (control instanceof Element && !control.hasAttribute('aria-label') && control.matches('button, input, select, [role]')) {
      control.setAttribute('aria-label', row.label);
    }
    return h('div', { class: 'st-row' },
      h('div', { class: 'st-label' }, h('b', {}, row.label), row.description && h('small', {}, row.description)),
      control);
  }

  #filter(query) {
    const before = [this.tab, this.subtab];
    this.#query = fold(query.trim());
    const visible = this.#mainTabs().filter(t => this.#matches(t));
    if (this.#tab && !visible.includes(this.#tab)) this.#tab = null;
    if (!this.#tab) this.#tab = visible[0] ?? null;

    // Show the secondary tab that holds the match, unless the current one already does
    const tab = this.#tab;
    if (tab?.subtabs?.length) {
      const hits = this.#query ? tab.subtabs.filter(s => fold(s.label).includes(this.#query) || this.#sectionsMatch(s.sections)) : [];
      const current = tab.subtabs.find(s => s.id === this.#subtab.get(tab.id));
      if (hits.length && !hits.includes(current)) this.#subtab.set(tab.id, hits[0].id);
      else if (!current) this.#subtab.set(tab.id, tab.subtabs[0].id);
    }
    this.render();
    if (tab && (tab !== before[0] || this.subtab !== before[1])) this.emit('select', { tab, subtab: this.subtab });
  }

  #matches(tab) {
    const q = this.#query;
    if (!q) return true;
    if ([tab.label, tab.description].some(t => t && fold(t).includes(q))) return true;
    if (tab.subtabs?.some(s => fold(s.label).includes(q) || this.#sectionsMatch(s.sections))) return true;
    return this.#sectionsMatch(tab.sections);
  }

  #sectionsMatch(sections) {
    const q = this.#query;
    return (resolve(sections) ?? []).some(s =>
      (s.title && fold(s.title).includes(q)) ||
      (s.rows ?? []).some(r => [r.label, r.description, r.keywords].some(t => t && fold(t).includes(q))));
  }

  /** Roving focus inside a tablist; selection follows focus. */
  #arrows(e, list, prev, next) {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let j;
    if (e.key === prev) j = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === next) j = (i + 1) % tabs.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = tabs.length - 1;
    else return;
    e.preventDefault();
    tabs[j].click();
    // The click re-renders the list: focus the new button with the same id
    list.querySelector(`[data-id="${CSS.escape(tabs[j].dataset.id)}"]`)?.focus();
  }
}

const resolve = v => (typeof v === 'function' ? v() : v);
/** Lowercase without accents, for search. */
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
