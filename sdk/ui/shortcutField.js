import { h } from '../core/dom.js';
import { shortcuts } from '../core/shortcuts.js';
import { icon } from './icons.js';

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
  let pending = null; // combo waiting for "Sostituisci"

  const command = () => shortcuts.list().find(c => c.id === id);
  const say = (text, actions = []) => message.replaceChildren(...(text ? [h('span', {}, text), ...actions] : []));

  const keycap = combo => h('span', { class: 'ctl-key', title: shortcuts.format(combo) },
    shortcuts.parts(combo).map(p => h('kbd', {}, p)),
    h('button', {
      class: 'ctl-key-remove', type: 'button', 'aria-label': `Togli ${shortcuts.format(combo)}`, title: 'Togli',
      onclick: () => { shortcuts.set(id, shortcuts.get(id).filter(k => k !== combo)); say(''); },
    }, icon('x')));

  function render(focusAdd = false) {
    const cmd = command();
    if (!cmd) return;
    const items = cmd.keys.map(keycap);
    if (!cmd.keys.length) items.push(h('span', { class: 'ctl-keys-none' }, 'Nessuna'));
    if (stopRecording) {
      items.push(h('span', { class: 'ctl-key recording', 'aria-live': 'polite' }, 'Premi i tasti…'));
    } else {
      items.push(h('button', { class: 'ctl-key-add', type: 'button', title: 'Aggiungi una combinazione', 'aria-label': `Aggiungi una combinazione per ${cmd.label}`, onclick: startRecording }, icon('plus')));
      if (cmd.custom) items.push(h('button', { class: 'ctl-key-reset', type: 'button', title: 'Ripristina la combinazione iniziale', onclick: () => { shortcuts.reset(id); say(''); } }, 'Ripristina'));
    }
    caps.replaceChildren(...items);
    if (focusAdd) caps.querySelector('.ctl-key-add')?.focus();
  }

  function startRecording() {
    pending = null;
    say('Premi la combinazione. Esc per annullare.');
    // Never keep capturing the keyboard for an editor that left the page
    const alive = fn => (...args) => (el.isConnected ? fn(...args) : finish());
    stopRecording = shortcuts.record({
      onPreview: held => {
        if (!el.isConnected) return finish();
        const cap = caps.querySelector('.recording');
        if (cap) cap.textContent = held ? `${held} …` : 'Premi i tasti…';
      },
      onCancel: () => finish(),
      onCombo: alive(combo => {
        const error = shortcuts.validate(combo, id);
        if (error) return say(`${shortcuts.format(combo)}: ${error}`);
        if (shortcuts.get(id).includes(combo)) return finish(`${shortcuts.format(combo)} è già assegnata a questo comando`);
        const owner = shortcuts.owner(combo, id);
        if (owner) {
          pending = combo;
          finish();
          return say(`${shortcuts.format(combo)} è già usata da «${owner.label}».`, [
            h('button', { class: 'ctl-btn primary', type: 'button', onclick: () => replace(owner.id) }, 'Sostituisci'),
            h('button', { class: 'ctl-btn', type: 'button', onclick: () => { pending = null; say(''); } }, 'Annulla'),
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
