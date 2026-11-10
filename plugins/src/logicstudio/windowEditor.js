import { h } from '@lilos/sdk';
import { t } from './i18n.js';

/** A window (.lsui) in its tab: placeholder until the UI editor (LogicUIDesigner) arrives. */
export class WindowEditor {
  el; doc; name;
  constructor(studio, doc, name) {
    this.doc = doc;
    this.name = name;
    this.el = h('div', { class: 'ls-editor' }, h('p', { class: 'ls-empty' }, t('window.soon')));
  }
  inspector() { return []; }
  destroy() {}
}
