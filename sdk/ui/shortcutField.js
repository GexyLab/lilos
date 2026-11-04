import { h } from '../core/dom.js';
import { shortcuts } from '../core/shortcuts.js';
import { locale } from '../core/locale.js';
import { icon } from './icons.js';

const { t } = locale.define('lilos:sdk.shortcutField', {
  en: { strings: {
    remove: 'Remove', removeCombo: 'Remove {combo}', none: 'None', pressKeys: 'Press the keys…',
    add: 'Add a combination', addFor: 'Add a combination for {command}',
    resetTitle: 'Restore the original combination', reset: 'Restore',
    record: 'Press the combination. Esc to cancel.', invalid: '{combo}: {error}',
    already: '{combo} is already assigned to this command', usedBy: '{combo} is already used by “{command}”.',
    replace: 'Replace', cancel: 'Cancel',
  } },
});

/**
 * Editor for the combos of one shortcut command: key caps with a remove button, "add" to
 * record a new combo (Esc cancels), conflict handling and reset to default.
 * Stays in sync with every change to that command while it is in the page.
 */
export function shortcutField(id) {
  const el = h('div', { class: 'ctl-keys' });
  const caps = h('div', { class: 'ctl-keys-row' });
  const message = h('div', { class: 'ctl-keys-msg', role: 'status', 'aria-live': 'polite' });
  el.append(caps, message);

  let stopRecording = null;
  let pending = null; // combo waiting for "Replace"

  const command = () => shortcuts.list().find(c => c.id === id);
  const say = (text, actions = []) => message.replaceChildren(...(text ? [h('span', {}, text), ...actions] : []));

  const keycap = combo => h('span', { class: 'ctl-key', title: shortcuts.format(combo) },
    shortcuts.parts(combo).map(p => h('kbd', {}, p)),
    h('button', {
      class: 'ctl-key-remove', type: 'button', 'aria-label': t('removeCombo', { combo: shortcuts.format(combo) }), title: t('remove'),
      onclick: () => { shortcuts.set(id, shortcuts.get(id).filter(k => k !== combo)); say(''); },
    }, icon('x')));

  function render(focusAdd = false) {
    const cmd = command();
    if (!cmd) return;
    const items = cmd.keys.map(keycap);
    if (!cmd.keys.length) items.push(h('span', { class: 'ctl-keys-none' }, t('none')));
    if (stopRecording) {
      items.push(h('span', { class: 'ctl-key recording', 'aria-live': 'polite' }, t('pressKeys')));
    } else {
      items.push(h('button', { class: 'ctl-key-add', type: 'button', title: t('add'), 'aria-label': t('addFor', { command: cmd.label }), onclick: startRecording }, icon('plus')));
      if (cmd.custom) items.push(h('button', { class: 'ctl-key-reset', type: 'button', title: t('resetTitle'), onclick: () => { shortcuts.reset(id); say(''); } }, t('reset')));
    }
    caps.replaceChildren(...items);
    if (focusAdd) caps.querySelector('.ctl-key-add')?.focus();
  }

  function startRecording() {
    pending = null;
    say(t('record'));
    // Never keep capturing the keyboard for an editor that left the page
    const alive = fn => (...args) => (el.isConnected ? fn(...args) : finish());
    stopRecording = shortcuts.record({
      onPreview: held => {
        if (!el.isConnected) return finish();
        const cap = caps.querySelector('.recording');
        if (cap) cap.textContent = held ? `${held} …` : t('pressKeys');
      },
      onCancel: () => finish(),
      onCombo: alive(combo => {
        const error = shortcuts.validate(combo, id);
        if (error) return say(t('invalid', { combo: shortcuts.format(combo), error }));
        if (shortcuts.get(id).includes(combo)) return finish(t('already', { combo: shortcuts.format(combo) }));
        const owner = shortcuts.owner(combo, id);
        if (owner) {
          pending = combo;
          finish();
          return say(t('usedBy', { combo: shortcuts.format(combo), command: owner.label }), [
            h('button', { class: 'ctl-btn primary', type: 'button', onclick: () => replace(owner.id) }, t('replace')),
            h('button', { class: 'ctl-btn', type: 'button', onclick: () => { pending = null; say(''); } }, t('cancel')),
          ]);
        }
        shortcuts.set(id, [...shortcuts.get(id), combo]);
        finish();
      }),
    });
    // Clicking anywhere else cancels the recording
    addEventListener('pointerdown', cancelOutside, true);
    render();
  }

  function cancelOutside(e) {
    if (!caps.contains(e.target)) finish();
  }

  function finish(text = '') {
    stopRecording?.();
    stopRecording = null;
    removeEventListener('pointerdown', cancelOutside, true);
    say(text);
    render(true);
  }

  function replace(ownerId) {
    if (!pending) return;
    shortcuts.set(ownerId, shortcuts.get(ownerId).filter(k => k !== pending));
    shortcuts.set(id, [...shortcuts.get(id), pending]);
    pending = null;
    say('');
  }

  const off = shortcuts.on('change', ({ id: changed }) => {
    if (!el.isConnected && !stopRecording) return off();
    if (changed === id) render();
  });
  render();
  return el;
}
