import { h, icon, fs } from '@lilos/sdk';
import { kvTable } from '../shared/kvTable.js';
import { codeArea } from './code.js';
import { authForm } from './auth.js';
import { effectiveAuth, find, walk } from './model.js';
import { store } from './store.js';
import { t } from './i18n.js';

/**
 * The settings of a collection (item null) or of a folder: its variables (the collection only),
 * the auth its requests inherit and the scripts that run before and after each of them.
 */
export class FolderView {
  #section = 'overview';

  constructor(owner, key, item) {
    this.owner = owner;
    this.key = key;
    this.item = item;
    this.el = h('div', { class: 'nx-folder' });
    this.draw();
  }

  get node() { return this.item ?? store.get(this.key).data; }
  touch() { store.touch(this.key); this.owner.itemChanged(this.key, this.item); }

  draw() {
    const entry = store.get(this.key);
    const node = this.node;
    const sections = this.item ? ['overview', 'auth', 'scripts'] : ['overview', 'variables', 'auth', 'scripts'];
    let requests = 0, folders = 0;
    walk(node.items, x => { if (x.type === 'folder') folders++; else requests++; });
    const title = this.item ? node.name : store.nameOf(entry);
    const head = h('div', { class: 'nx-fhead' }, icon(this.item ? 'folder' : entry.file ? 'file' : 'star', 'ico big'),
      h('div', {}, h('h2', {}, title), h('small', { class: 'nx-dim' }, [entry.file ? fs.tildePath(entry.file) : t('mine.where'), t('folder.counts', { n: requests, folders })].join(' · '))),
      h('span', { class: 'nx-grow' }),
      h('button', { type: 'button', class: 'ctl-btn', onclick: () => this.owner.run(this.key, this.item?.id ?? null) }, icon('play'), t('tools.run')));
    const tabs = h('div', { class: 'nx-subtabs', role: 'tablist' }, ...sections.map(s => h('button', {
      type: 'button', role: 'tab', 'aria-selected': String(this.#section === s), class: this.#section === s ? 'on' : '', onclick: () => { this.#section = s; this.draw(); },
    }, t(`folder.tab.${s}`))));
    this.el.replaceChildren(head, tabs, h('div', { class: 'nx-reqpane' }, this[`section_${this.#section}`]()));
  }

  section_overview() {
    const node = this.node;
    const name = h('input', { class: 'ctl-text nx-wide', value: node.name ?? '', oninput: e => { node.name = e.target.value; this.touch(); } });
    const notes = h('textarea', { class: 'ctl-text nx-notes', rows: 6, placeholder: t('folder.notesHint'), oninput: e => { node.description = e.target.value; this.touch(); } });
    notes.value = node.description ?? '';
    return h('div', { class: 'nx-sec nx-settings' },
      h('label', { class: 'nx-frow' }, h('span', { class: 'nx-flabel' }, t('item.name')), name),
      h('label', { class: 'nx-frow' }, h('span', { class: 'nx-flabel' }, t('folder.notes')), notes),
      this.item ? null : h('p', { class: 'nx-hint' }, t('folder.collectionHint')));
  }

  section_variables() {
    const c = this.node;
    const table = kvTable({ t, rows: c.variables, mono: true, placeholder: { key: t('vars.name'), value: t('vars.value') }, onChange: () => this.touch() });
    return h('div', { class: 'nx-sec' }, h('p', { class: 'nx-hint' }, t('vars.collectionHint')), table.el);
  }

  section_auth() {
    const node = this.node;
    node.auth ??= { type: this.item ? 'inherit' : 'none' };
    const c = store.get(this.key).data;
    const form = authForm({
      auth: node.auth, win: this.owner.win, inherit: !!this.item, onChange: () => this.touch(),
      inherited: () => {
        const at = find(c, this.item.id);
        const parent = at?.parents.at(-1);
        if (parent) {
          const { auth, from } = effectiveAuth(c, parent.id);
          return { auth, name: from === c || !from ? store.nameOf(store.get(this.key)) : from.name };
        }
        return { auth: c.auth ?? { type: 'none' }, name: store.nameOf(store.get(this.key)) };
      },
    });
    return h('div', { class: 'nx-sec' }, h('p', { class: 'nx-hint' }, t('folder.authHint')), form.el);
  }

  section_scripts() {
    const node = this.node;
    node.scripts ??= { pre: '', test: '' };
    const box = phase => h('div', { class: 'nx-scriptbox' }, h('div', { class: 'nx-flabel' }, t(`scripts.${phase}`)),
      codeArea({ value: node.scripts[phase] ?? '', lang: 'javascript', label: t(`scripts.${phase}`), minLines: 7, onInput: v => { node.scripts[phase] = v; this.touch(); } }).el);
    return h('div', { class: 'nx-sec' }, h('p', { class: 'nx-hint' }, t('folder.scriptsHint')), box('pre'), box('test'));
  }

  destroy() {}
}
