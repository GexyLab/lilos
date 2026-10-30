import { Window, h, fs, fileType, splitName, actionButton, icon } from '@lilos/sdk';

/**
 * Window to choose a file of lilOS (optionally only some extensions) or, with kind: 'folder', a
 * folder; `within` limits the choice to a folder and what it contains, `exclude` hides a subtree
 * (e.g. the folder being moved). Resolves with the node, or null if the user closes it.
 *
 *   const node = await pickFile(openWindow, { title: 'Scegli lo schema', exts: ['json'] });
 *   const dir = await pickFile(openWindow, { kind: 'folder', within: rootId, exclude: movingId });
 */
export function pickFile(openWindow, { title = 'Scegli un file', exts = null, text = '', kind = 'file', within = fs.root, exclude = null } = {}) {
  return new Promise(resolve => {
    const all = [];
    const folders = kind === 'folder';
    const add = n => all.push({ ...n, path: fs.path(n.id) });
    const walk = id => fs.children(id).forEach(n => {
      if (n.id === exclude) return;
      if (n.type === 'folder') { if (folders) add(n); walk(n.id); }
      else if (!folders && n.type === 'file' && (!exts || exts.includes(splitName(n.name)[1].toLowerCase()))) add(n);
    });
    if (folders && fs.exists(within)) add(fs.get(within));
    walk(fs.exists(within) ? within : fs.root);
    all.sort((a, b) => a.path.localeCompare(b.path));

    const win = new Window({
      title, icon: folders ? 'folder' : 'file', width: 460, height: 380, minWidth: 340, minHeight: 240,
      controls: { minimize: false, maximize: false },
    });
    win.el.classList.add('picker-window');
    let chosen = all[0]?.id ?? null;
    let done = false;
    const finish = node => {
      if (done) return;
      done = true;
      resolve(node);
      win.emit('close');
    };
    win.on('destroy', () => { if (!done) { done = true; resolve(null); } });

    const search = h('input', { type: 'text', placeholder: 'Cerca per nome o percorso', spellcheck: 'false', 'aria-label': 'Cerca' });
    const list = h('div', { class: 'fp-list', role: 'listbox', tabindex: '0', 'aria-label': folders ? 'Cartelle' : 'File' });
    const ok = actionButton({ label: 'Scegli', primary: true, onClick: () => chosen && finish(fs.get(chosen)) });

    const render = () => {
      const q = search.value.trim().toLowerCase();
      const shown = all.filter(n => !q || n.path.toLowerCase().includes(q));
      if (!shown.some(n => n.id === chosen)) chosen = shown[0]?.id ?? null;
      ok.disabled = !chosen;
      list.replaceChildren(...(shown.length ? shown.map(n => h('div', {
        class: n.id === chosen ? 'fp-item on' : 'fp-item', role: 'option', 'aria-selected': String(n.id === chosen), dataset: { id: n.id },
      }, folders
        ? h('span', { class: 'fp-badge folder' }, icon('folder'))
        : h('span', { class: 'fp-badge', style: { background: fileType(n.name).color } }, fileType(n.name).badge || 'FILE'),
        h('span', { class: 'fp-name' }, n.id === fs.root ? 'Home' : n.name),
        h('span', { class: 'fp-path' }, n.id === fs.root ? n.path : n.path.slice(0, -n.name.length - 1))))
        : [h('div', { class: 'fp-empty' }, all.length ? 'Nulla corrisponde alla ricerca' : folders ? 'Nessuna cartella' : `Nessun file${exts ? ` .${exts.join(', .')}` : ''} in lilOS`)]));
    };
    search.addEventListener('input', render);
    list.addEventListener('click', e => { const it = e.target.closest('[data-id]'); if (it) { chosen = it.dataset.id; render(); } });
    list.addEventListener('dblclick', e => { const it = e.target.closest('[data-id]'); if (it) finish(fs.get(it.dataset.id)); });
    win.body.addEventListener('keydown', e => {
      const ids = [...list.querySelectorAll('[data-id]')].map(el => el.dataset.id);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const i = ids.indexOf(chosen);
        chosen = ids[Math.max(0, Math.min(ids.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))] ?? null;
        render();
        list.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && chosen && !e.target.closest('button')) {
        e.preventDefault();
        finish(fs.get(chosen));
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        finish(null);
      }
    }, { signal: win.signal });

    win.body.append(h('div', { class: 'fp' },
      text && h('p', { class: 'fp-text' }, text),
      h('label', { class: 'fp-search' }, icon('search'), search),
      list,
      h('div', { class: 'fp-buttons' }, actionButton({ label: 'Annulla', onClick: () => finish(null) }), ok)));
    render();
    openWindow(win);
    search.focus();
  });
}
