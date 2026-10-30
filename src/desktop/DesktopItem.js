import { h, splitName } from '@lilos/sdk';
import { itemIcon } from './itemIcons.js';
import { tagDots } from '../tags/tagUi.js';
import { markItem } from '../items/itemDrag.js';

/**
 * A folder, file or app shortcut placed on the desk (or a reduced workarea's icon, or a fixed item).
 * Data shape: a file system node plus its position, { id, type, name, x, y, color?, app?, … }
 * File system items are marked as such (itemDrag.js): a folder accepts files and folders dropped on it.
 * Fixed items (fixedItems.js, data.fixed set) are not nodes: they mark themselves.
 */
export class DesktopItem {
  constructor(data) {
    this.data = data;
    this.glyph = h('div', { class: 'ditem-glyph' }, itemIcon(data), tagDots(data, 'ditem-tags'));
    this.label = h('span', { class: 'ditem-label' }, data.name);
    this.el = h('div', { class: 'ditem', dataset: { kind: 'item', id: data.id } }, this.glyph, this.label);
    if (data.type !== 'workarea' && !data.fixed) markItem(this.el, data);
    this.moveTo(data.x, data.y);
  }

  get id() { return this.data.id; }
  get editing() { return this.el.classList.contains('editing'); }

  moveTo(x, y) {
    this.data.x = x;
    this.data.y = y;
    this.el.style.left = x + 'px';
    this.el.style.top = y + 'px';
  }

  setSelected(selected) {
    this.el.classList.toggle('selected', selected);
  }

  /** New name or metadata from the file system (the icon can change with the extension, color or tags). */
  setData({ name, color, tags }) {
    Object.assign(this.data, { name, color, tags });
    this.label.textContent = name;
    this.glyph.replaceChildren(itemIcon(this.data), tagDots(this.data, 'ditem-tags') ?? '');
  }

  /** Inline rename. Resolves with the new (trimmed) name, or null if cancelled/unchanged. */
  editName() {
    return new Promise(resolve => {
      const { label } = this;
      const old = this.data.name;
      try { label.contentEditable = 'plaintext-only'; } catch { label.contentEditable = 'true'; }
      label.spellcheck = false;
      this.el.classList.add('editing');
      label.focus();

      // Pre-select the name without its extension, like a file manager does
      const text = label.firstChild;
      if (text) {
        const end = this.data.type === 'file' && splitName(old)[1] ? splitName(old)[0].length : old.length;
        const range = document.createRange();
        range.setStart(text, 0);
        range.setEnd(text, end);
        getSelection().removeAllRanges();
        getSelection().addRange(range);
      }

      const finish = commit => {
        label.removeEventListener('keydown', onKey);
        label.removeEventListener('blur', onBlur);
        label.contentEditable = 'false';
        this.el.classList.remove('editing');
        getSelection().removeAllRanges();
        const name = label.textContent.replace(/\s+/g, ' ').trim();
        label.textContent = old;
        resolve(commit && name && name !== old ? name : null);
      };
      const onKey = e => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); finish(true); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      };
      const onBlur = () => finish(true);
      label.addEventListener('keydown', onKey);
      label.addEventListener('blur', onBlur);
    });
  }
}
