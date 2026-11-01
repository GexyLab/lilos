/**
 * Keys typed without a keyboard (the on-screen keyboard): a key goes where a real one would, to the
 * element with the focus, in lilOS's page, in an app's Shadow DOM or in an isolated app's sandbox.
 *
 *   sendKey({ key: 'a', code: 'KeyA', text: 'a' })
 *   sendKey({ key: 'Backspace', code: 'Backspace', ctrl: true })
 *
 * key and code as in a KeyboardEvent; text: what the key writes (none for Ctrl/Alt shortcuts);
 * ctrl, alt, shift, meta, altGraph: the modifiers held. The element gets keydown (and keypress,
 * keyup): if nobody cancels it, what the browser would do comes next (writing, deleting, moving the
 * cursor, Enter, Tab, Space on a button, Ctrl+A/C/X/V/Z/Y), done here because a key made by a script
 * does nothing of that by itself. Writing goes through execCommand, so Ctrl+Z undoes it.
 * Remote apps (their own site) get nothing: lilOS has no code in them.
 */
export function sendKey(key) {
  let el = document.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  // An isolated window: its sandbox has the focus; the bridge there types the key (see bridge.js)
  if (el?.tagName === 'IFRAME' && el.classList.contains('pkg-frame') && !el.hasAttribute('src')) {
    el.contentWindow?.postMessage({ lilos: 1, key: { ...key } }, '*');
    return;
  }
  typeKey(document, key);
}

/**
 * Types one key in `doc`. Serialized (toString) into the code of the sandbox: it must not use
 * anything from outside itself.
 */
export function typeKey(doc, k) {
  const focused = () => {
    let el = doc.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    return el || doc.body;
  };
  const init = {
    key: k.key, code: k.code || '', bubbles: true, cancelable: true, composed: true,
    ctrlKey: !!k.ctrl, altKey: !!k.alt, shiftKey: !!k.shift, metaKey: !!k.meta, modifierAltGraph: !!k.altGraph,
  };
  const target = focused();
  const shortcut = init.ctrlKey || init.altKey || init.metaKey;
  let go = target.dispatchEvent(new KeyboardEvent('keydown', init));
  if (go && !shortcut && (k.text || k.key === 'Enter')) go = focused().dispatchEvent(new KeyboardEvent('keypress', init));
  if (go) act(focused());
  target.dispatchEvent(new KeyboardEvent('keyup', init));

  function act(el) {
    const tag = el.tagName;
    const field = tag === 'TEXTAREA' || (tag === 'INPUT' && /^(text|search|url|tel|email|password|number|)$/.test(el.type || ''));
    const editable = (field && !el.readOnly && !el.disabled) || el.isContentEditable;
    const exec = (cmd, value) => doc.execCommand(cmd, false, value);
    const ctrl = init.ctrlKey || init.metaKey;

    if (ctrl && !init.altKey && k.key.length === 1) {
      const c = k.key.toLowerCase();
      if (c === 'a') return field ? el.select() : exec('selectAll');
      if (c === 'z') return exec(init.shiftKey ? 'redo' : 'undo');
      if (c === 'y') return exec('redo');
      if (c === 'c' || c === 'x') return exec(c === 'c' ? 'copy' : 'cut');
      if (c === 'v' && editable) return navigator.clipboard?.readText?.().then(t => t && exec('insertText', t), () => {});
      return;
    }
    // With Ctrl only deleting and moving by words or to the ends; with Alt nothing (but AltGr writes)
    if (init.altKey && !k.altGraph) return;
    if (ctrl && !/^(Backspace|Delete|Arrow|Home|End)/.test(k.key)) return;
    const clickable = !editable && (/^(BUTTON|SUMMARY)$/.test(tag) || (tag === 'A' && el.hasAttribute('href'))
      || (tag === 'INPUT' && /^(button|submit|reset|checkbox|radio|file|color|image)$/.test(el.type))
      || /^(button|checkbox|radio|switch|tab|menuitem|option|link)$/.test(el.getAttribute?.('role') || ''));

    if (k.text && k.key !== 'Enter') {
      if (editable) return exec('insertText', k.text);
      if (k.key === ' ' && clickable) return el.click();
      return;
    }
    switch (k.key) {
      case 'Enter':
        if (tag === 'TEXTAREA' && editable) return exec('insertText', '\n');
        if (el.isContentEditable) return exec(init.shiftKey ? 'insertLineBreak' : 'insertParagraph');
        if (tag === 'INPUT' && field) return el.form?.requestSubmit?.();
        if (clickable && !/^(checkbox|radio)$/.test(el.type || el.getAttribute('role') || '')) return el.click();
        return;
      case 'Backspace':
      case 'Delete':
        if (!editable) return;
        if (ctrl && field && el.selectionStart === el.selectionEnd) {
          const at = el.selectionStart;
          const to = word(el.value, at, k.key === 'Delete' ? 1 : -1);
          el.setSelectionRange(Math.min(at, to), Math.max(at, to));
        } else if (ctrl) {
          getSelection()?.modify('extend', k.key === 'Delete' ? 'forward' : 'backward', 'word');
        }
        return exec(k.key === 'Delete' ? 'forwardDelete' : 'delete');
      case 'Tab': return tab(el, init.shiftKey ? -1 : 1);
      case 'ArrowLeft': case 'ArrowRight': case 'ArrowUp': case 'ArrowDown':
      case 'Home': case 'End': case 'PageUp': case 'PageDown':
        if (field) return caret(el);
        if (el.isContentEditable) return move();
    }
  }

  /** The cursor in a text field: one place, one word (Ctrl), the line or the text; Shift selects. */
  function caret(el) {
    const v = el.value;
    let anchor = el.selectionDirection === 'backward' ? el.selectionEnd : el.selectionStart;
    let head = el.selectionDirection === 'backward' ? el.selectionStart : el.selectionEnd;
    if (anchor == null) return;   // a field without a cursor (email, number)
    const ctrl = init.ctrlKey || init.metaKey;
    const lineStart = p => v.lastIndexOf('\n', p - 1) + 1;
    const lineEnd = p => { const n = v.indexOf('\n', p); return n < 0 ? v.length : n; };
    const multi = el.tagName === 'TEXTAREA';
    const collapsed = anchor === head;
    switch (k.key) {
      case 'ArrowLeft': head = !init.shiftKey && !collapsed ? Math.min(anchor, head) : ctrl ? word(v, head, -1) : Math.max(0, head - 1); break;
      case 'ArrowRight': head = !init.shiftKey && !collapsed ? Math.max(anchor, head) : ctrl ? word(v, head, 1) : Math.min(v.length, head + 1); break;
      case 'Home': head = ctrl || !multi ? 0 : lineStart(head); break;
      case 'End': head = ctrl || !multi ? v.length : lineEnd(head); break;
      case 'PageUp': head = 0; break;
      case 'PageDown': head = v.length; break;
      case 'ArrowUp': case 'ArrowDown': {
        if (!multi) return;
        const start = lineStart(head), col = head - start;
        if (k.key === 'ArrowUp') {
          if (start === 0) { head = 0; break; }
          const prev = lineStart(start - 1);
          head = Math.min(prev + col, start - 1);
        } else {
          const end = lineEnd(head);
          if (end === v.length) { head = v.length; break; }
          head = Math.min(end + 1 + col, lineEnd(end + 1));
        }
      }
    }
    if (!init.shiftKey) anchor = head;
    el.setSelectionRange(Math.min(anchor, head), Math.max(anchor, head), head < anchor ? 'backward' : 'forward');
  }

  /** The cursor in editable content (contenteditable): the browser's own steps. */
  function move() {
    const sel = getSelection();
    if (!sel) return;
    const back = /Left|Up|Home|PageUp/.test(k.key);
    const unit = /Up|Down/.test(k.key) ? 'line' : /Home|End/.test(k.key) ? 'lineboundary' : /Page/.test(k.key) ? 'documentboundary'
      : init.ctrlKey || init.metaKey ? 'word' : 'character';
    sel.modify(init.shiftKey ? 'extend' : 'move', back ? 'backward' : 'forward', unit);
  }

  /** Where Ctrl+← / Ctrl+→ stops: the start of a word, or the end of the next one. */
  function word(v, at, dir) {
    let i = at;
    const w = c => /[\p{L}\p{N}_]/u.test(c);
    if (dir < 0) {
      while (i > 0 && !w(v[i - 1])) i--;
      while (i > 0 && w(v[i - 1])) i--;
    } else {
      while (i < v.length && !w(v[i])) i++;
      while (i < v.length && w(v[i])) i++;
    }
    return i;
  }

  /** Tab: the next (Shift: previous) element that takes the focus, in the same window. */
  function tab(el, dir) {
    const root = el.closest?.('.window') || el.getRootNode?.() || doc;
    const all = [...(root.querySelectorAll?.('a[href], button, input, select, textarea, summary, [tabindex], [contenteditable=""], [contenteditable="true"]') ?? [])]
      .filter(e => e.tabIndex >= 0 && !e.disabled && !e.closest('[inert], [hidden]') && e.getClientRects().length > 0);
    if (!all.length) return;
    const i = all.indexOf(el);
    all[i < 0 ? (dir > 0 ? 0 : all.length - 1) : (i + dir + all.length) % all.length].focus();
  }
}
