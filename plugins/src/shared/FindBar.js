import { Emitter, h, icon, uid, actionButton } from '@lilos/sdk';
import './FindBar.css';

/**
 * A find bar (Editor above its text, Terminal over its screen). Only shows the fields and reports
 * what the user asks; the app finds, selects and replaces.
 *   new FindBar({ t, signal, replace = true, options = true, floating = false, className })
 *     t         the app's t (its locales have the shared.find.* strings)
 *     signal    an AbortSignal: its listeners go when it aborts
 *     replace   the replace row (shown with open({ replace: true }) or the arrow)
 *     options   the match case, whole word and regular expression switches
 *     floating  over the content, at its top right (the parent is position: relative or absolute)
 *     className more classes for the bar
 *   query → { find, replace, matchCase, wholeWord, regex }
 *   open({ replace, text }) · close() · isOpen · focus() · setStatus(text, { error }) · results({ … })
 *
 * Keyboard: Enter next match, Shift+Enter previous; in the replace field Enter replaces and
 * Ctrl+Alt+Enter replaces all; Esc closes. Every control is reached with Tab; the count is read
 * out by screen readers (aria-live).
 *
 * Events: 'query' (the text to find or an option changed) · 'next' · 'previous' · 'replace' · 'replaceAll' · 'close'
 * ('close' only asks: the app calls close(), and puts the focus back where it belongs).
 */
export class FindBar extends Emitter {
  #options = { matchCase: false, wholeWord: false, regex: false };
  #t;
  #replace;

  constructor({ t, signal, replace = true, options = true, floating = false, className = '' } = {}) {
    super();
    this.#t = t;
    this.#replace = replace;
    const statusId = `sh-find-status-${uid()}`;
    this.findInput = h('input', {
      class: 'ctl-text sh-find-input', type: 'text', spellcheck: 'false', autocomplete: 'off',
      placeholder: t('shared.find.find'), 'aria-label': t('shared.find.find'), 'aria-describedby': statusId,
    });
    this.status = h('span', { class: 'sh-find-status', id: statusId, role: 'status', 'aria-live': 'polite' });

    const tool = (glyph, label, onclick) => h('button', { class: 'sh-find-btn', type: 'button', title: label, 'aria-label': label, onclick }, icon(glyph));
    const option = (key, short, label) => {
      const button = h('button', { class: 'sh-find-opt', type: 'button', title: label, 'aria-label': label, 'aria-pressed': 'false', onclick: () => {
        this.#options[key] = !this.#options[key];
        button.setAttribute('aria-pressed', String(this.#options[key]));
        this.emit('query');
      } }, short);
      return button;
    };

    if (replace) {
      this.replaceInput = h('input', {
        class: 'ctl-text sh-find-input', type: 'text', spellcheck: 'false', autocomplete: 'off',
        placeholder: t('shared.find.replaceWith'), 'aria-label': t('shared.find.replaceWith'),
      });
      this.toggle = h('button', {
        class: 'sh-find-btn sh-find-toggle', type: 'button', title: t('shared.find.toggleReplace'), 'aria-label': t('shared.find.toggleReplace'), 'aria-expanded': 'false',
        onclick: () => { this.#showReplace(this.replaceRow.hidden); (this.replaceRow.hidden ? this.findInput : this.replaceInput).focus(); },
      }, icon('arrowRight'));
      this.replaceRow = h('div', { class: 'sh-find-row', hidden: true },
        h('span', { class: 'sh-find-indent' }),
        this.replaceInput,
        actionButton({ label: t('shared.find.replace'), onClick: () => this.emit('replace') }),
        actionButton({ label: t('shared.find.replaceAll'), onClick: () => this.emit('replaceAll') }));
      this.replaceInput.addEventListener('keydown', e => {
        if (e.key !== 'Enter' || e.shiftKey || e.metaKey) return;
        e.preventDefault();
        if (e.ctrlKey && e.altKey) this.emit('replaceAll');
        else if (!e.ctrlKey && !e.altKey) this.emit('replace');
      }, { signal });
    } else {
      this.replaceInput = this.toggle = this.replaceRow = null;
    }

    this.el = h('div', {
      class: ['sh-find', floating && 'floating', className].filter(Boolean).join(' '),
      role: 'search', 'aria-label': t(replace ? 'shared.find.labelReplace' : 'shared.find.label'), hidden: true,
    },
    h('div', { class: 'sh-find-row' },
      this.toggle,
      this.findInput,
      options ? [
        option('matchCase', t('shared.find.matchCase.short'), t('shared.find.matchCase')),
        option('wholeWord', t('shared.find.wholeWord.short'), t('shared.find.wholeWord')),
        option('regex', t('shared.find.regex.short'), t('shared.find.regex')),
      ] : null,
      this.status,
      tool('arrowUp', t('shared.find.previous'), () => this.emit('previous')),
      tool('arrowDown', t('shared.find.next'), () => this.emit('next')),
      tool('x', t('shared.find.close'), () => this.emit('close'))),
    this.replaceRow);

    this.findInput.addEventListener('input', () => this.emit('query'), { signal });
    this.findInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); this.emit(e.shiftKey ? 'previous' : 'next'); }
    }, { signal });
    this.el.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      this.emit('close');
    }, { signal });
  }

  get isOpen() { return !this.el.hidden; }

  get query() {
    return { find: this.findInput.value, replace: this.replaceInput?.value ?? '', ...this.#options };
  }

  /**
   * Shows the bar (with the replace row when `replace`) and puts the focus in it; `text` (the
   * selection of the document) becomes what to find. Emits 'query'.
   */
  open({ replace = false, text = null } = {}) {
    const wasOpen = this.isOpen;
    this.el.hidden = false;
    if (this.#replace) {
      if (replace) this.#showReplace(true);
      else if (!wasOpen) this.#showReplace(false);
    }
    if (text != null) this.findInput.value = text;
    // Ctrl+H with something to find already: straight to what replaces it
    const field = replace && this.#replace && this.findInput.value ? this.replaceInput : this.findInput;
    field.focus();
    field.select();
    this.emit('query');
  }

  close() {
    this.el.hidden = true;
    this.setStatus('');
  }

  /** The focus in the field of what to find. */
  focus() {
    this.findInput.focus();
  }

  /** What the status says: the count («3 of 12») or what is wrong (an invalid regular expression). */
  setStatus(text, { error = false } = {}) {
    if (this.status.textContent !== text) this.status.textContent = text;
    this.status.classList.toggle('error', error);
    if (error) this.findInput.setAttribute('aria-invalid', 'true');
    else this.findInput.removeAttribute('aria-invalid');
  }

  /**
   * The status from what the app found, in the shared words:
   *   total   how many matches (0: «No results»; nothing to find: empty)
   *   index   the current one, from 0 (-1 or none: only the total)
   *   more    there are more than `total` (the app stopped counting): «1000+»
   *   error   what is wrong with the query (an invalid regular expression), in place of the count
   */
  results({ total = 0, index = -1, more = false, error = null } = {}) {
    const t = this.#t;
    if (error) return this.setStatus(t('shared.find.badRegex', { error }), { error: true });
    if (!this.findInput.value) return this.setStatus('');
    if (!total) return this.setStatus(t('shared.find.none'));
    const count = `${total}${more ? '+' : ''}`;
    this.setStatus(index >= 0 ? t('shared.find.count', { index: index + 1, total: count }) : t('shared.find.total', { n: total, total: count }));
  }

  #showReplace(on) {
    this.replaceRow.hidden = !on;
    this.toggle.setAttribute('aria-expanded', String(on));
    this.toggle.replaceChildren(icon(on ? 'arrowDown' : 'arrowRight'));
  }
}
