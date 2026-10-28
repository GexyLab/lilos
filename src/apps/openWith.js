import { Window, h, appIcon, actionButton, fileType } from '@lilos/sdk';
import { launch } from './registry.js';
import { fileApps, appFor, extensionOf, setAppFor } from './open.js';

/**
 * "Apri con": choose the app for a file, optionally remembering it for the extension.
 * One at a time: a new request replaces the open one. Returns a function (node) for setChooser().
 */
export function createOpenWith(wm) {
  let current = null;

  return node => {
    if (current) wm.close(current);
    const ext = extensionOf(node);
    const candidates = fileApps();
    const suggested = appFor(ext)?.id ?? candidates[0]?.id ?? null;
    let chosen = suggested;

    const win = new Window({
      title: 'Apri con', subtitle: node.name, icon: 'open',
      width: 380, height: candidates.length ? 176 + candidates.length * 40 : 150,
      controls: { minimize: false, maximize: false }, resizable: false,
    });
    win.el.classList.add('openwith-window');
    current = win;
    win.on('destroy', () => { if (current === win) current = null; });

    const typeName = ext ? `i file .${ext}` : 'i file senza estensione';
    const remember = h('input', { type: 'checkbox', id: `ow-${node.id}` });

    const list = h('div', { class: 'ow-list', role: 'radiogroup', 'aria-label': 'App' }, candidates.map(app => {
      const option = h('button', {
        class: app.id === chosen ? 'ow-app on' : 'ow-app', type: 'button', role: 'radio',
        'aria-checked': String(app.id === chosen), dataset: { id: app.id },
        onclick: () => select(app.id),
        ondblclick: () => { select(app.id); confirm(); },
      }, appIcon(app), h('span', {}, app.name));
      return option;
    }));
    const select = id => {
      chosen = id;
      for (const b of list.children) {
        const on = b.dataset.id === id;
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', String(on));
      }
    };
    list.addEventListener('keydown', e => {
      const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      const items = [...list.children];
      const i = Math.max(0, items.findIndex(b => b.dataset.id === chosen));
      const next = items[(i + step + items.length) % items.length];
      select(next.dataset.id);
      next.focus();
    });

    const confirm = () => {
      if (!chosen) return;
      if (remember.checked) setAppFor(ext, chosen);
      wm.close(win);
      launch(chosen, { file: node.id });
    };

    const body = candidates.length
      ? [
          h('p', { class: 'ow-text' }, `Scegli l'app per aprire «${node.name}» (${fileType(node.name).label}).`),
          list,
          h('label', { class: 'ow-remember', for: remember.id }, remember, `Usa sempre quest'app per ${typeName}`),
          h('div', { class: 'ow-buttons' },
            actionButton({ label: 'Annulla', onClick: () => wm.close(win) }),
            actionButton({ label: 'Apri', primary: true, onClick: confirm })),
        ]
      : [
          h('p', { class: 'ow-text' }, `Nessuna app installata può aprire «${node.name}».`),
          h('div', { class: 'ow-buttons' }, actionButton({ label: 'Chiudi', primary: true, onClick: () => wm.close(win) })),
        ];
    win.body.append(h('div', { class: 'ow' }, body));
    win.body.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); wm.close(win); }
      if (e.key === 'Enter' && e.target.closest('.ow-list')) { e.preventDefault(); confirm(); }
    }, { signal: win.signal });

    wm.open(win, { key: 'open-with' });
    (list.querySelector('.on') ?? win.body.querySelector('.ctl-btn.primary'))?.focus();
  };
}
