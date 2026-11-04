import { Window, h, fs, icon } from '@lilos/sdk';
import * as system from '@lilos/system';
import { APP_ID, COLORS, COLOR_NAMES, isNote, bareName } from './note.js';
import { noteMeta, newColor, setNewColor } from './store.js';
import { pendingReminder, whenText } from './remind.js';
import { t, i18n } from './i18n.js';

/**
 * The window of Note adesive: every note of the user, on the desk of every workspace (also those
 * a reduced workarea hides) and in any other folder. It reads only what the notes keep in their
 * data (title, start of the text, color, reminder), so it lists the notes of the other workspaces
 * too (fs.everywhere). Filters on the left, a search in the text, and on each note:
 *   Mostra      the desk where it is, the view on it (system.revealOnDesk)
 *   Porta qui   onto this desk, in the middle of the view (system.bringToDesk)
 */
const ALL = 'all', REMIND = 'remind', ELSEWHERE = 'elsewhere';

export function createListWindow({ args } = {}) {
  const win = new Window({ title: t('app.name'), icon: 'note', width: 900, height: 560, minWidth: 560, minHeight: 320 });
  const state = { filter: ALL, query: '', focus: typeof args?.focus === 'string' ? args.focus : null };

  const side = h('nav', { class: 'sn-side', 'aria-label': t('list.filters') });
  const search = h('input', { class: 'ctl-text sn-search', type: 'search', placeholder: t('list.search'), 'aria-label': t('list.search') });
  const count = h('span', { class: 'sn-hint' });
  const grid = h('div', { class: 'sn-grid', role: 'list' });
  const status = h('div', { class: 'sn-status' });
  const newButton = h('button', { class: 'ctl-btn primary', type: 'button', onclick: () => {
    // The note is made in the middle of the view: the window steps aside so that it can be seen
    if (system.newWidgetOnDesk(APP_ID, 'note')) win.emit('minimize');
    else status.textContent = t('list.cannotCreate');
  } }, icon('plus'), t('list.new'));
  win.body.append(h('div', { class: 'sn-win' },
    side,
    h('div', { class: 'sn-main' },
      h('div', { class: 'sn-tools' }, search, count, h('span', { class: 'sn-grow' }), newButton),
      grid, status)));
  search.addEventListener('input', () => { state.query = search.value.trim().toLowerCase(); render(); });

  /** Every note: { node, meta, scope, title, excerpt, remind }. */
  function notes() {
    return fs.everywhere(isNote).map(node => {
      const meta = noteMeta(node);
      return { node, meta, scope: node.scope, title: meta.title || bareName(node), excerpt: meta.excerpt, remind: pendingReminder(node) };
    }).sort((a, b) => (b.node.modified ?? 0) - (a.node.modified ?? 0));
  }

  const workspaces = () => system.workspaceManager()?.list?.() ?? [];
  const onDesk = n => !!n.scope;

  function matches(n) {
    const f = state.filter;
    if (f === REMIND && !n.remind) return false;
    if (f === ELSEWHERE && onDesk(n)) return false;
    if (f.startsWith('ws:') && n.scope !== f.slice(3)) return false;
    if (f.startsWith('color:') && n.meta.color !== f.slice(6)) return false;
    if (state.query && !`${n.title}\n${n.excerpt}`.toLowerCase().includes(state.query)) return false;
    return true;
  }

  function filterButton(key, label, n, mark) {
    return h('button', {
      class: 'sn-flt', type: 'button', 'aria-pressed': String(state.filter === key),
      onclick: () => { state.filter = key; render(); },
    }, mark, h('span', {}, label), h('small', {}, String(n)));
  }

  function renderSide(all) {
    const spaces = workspaces();
    const elsewhere = all.filter(n => !onDesk(n)).length;
    side.replaceChildren(
      filterButton(ALL, t('list.all'), all.length, icon('note')),
      filterButton(REMIND, t('list.withReminder'), all.filter(n => n.remind).length, icon('bell')),
      h('h6', {}, t('list.workspaces')),
      ...spaces.map(w => filterButton(`ws:${w.id}`, w.name, all.filter(n => n.scope === w.id).length, h('span', { class: 'sn-dot', style: { background: w.color } }))),
      elsewhere ? filterButton(ELSEWHERE, t('list.elsewhere'), elsewhere, icon('folder')) : '',
      h('h6', {}, t('list.colors')),
      ...COLOR_NAMES.map(c => filterButton(`color:${c}`, t(`color.${c}`), all.filter(n => n.meta.color === c).length, h('span', { class: 'sn-sq', style: { background: COLORS[c] } }))),
      h('h6', {}, t('list.newColor')),
      h('div', { class: 'sn-newcolor', role: 'radiogroup', 'aria-label': t('list.newColor') }, COLOR_NAMES.map(c => h('button', {
        class: `sn-sw${newColor() === c ? ' on' : ''}`, type: 'button', role: 'radio', 'aria-checked': String(newColor() === c),
        title: t(`color.${c}`), 'aria-label': t(`color.${c}`), style: { background: COLORS[c] },
        onclick: () => { setNewColor(c); render(); },
      }))));
  }

  /** Where a note is, in words: the workspace, or the folder. */
  function where(n) {
    if (!n.scope) {
      const visible = fs.get(n.node.id);
      return h('span', {}, icon('folder'), visible ? fs.tildePath(n.node.parent) : t('list.otherFolder'));
    }
    const ws = system.describeWorkspace(n.scope);
    return h('span', {}, h('span', { class: 'sn-dot', style: { background: ws?.color ?? '#888' } }), ws?.name ?? t('list.unknownWorkspace'));
  }

  function card(n) {
    const show = async () => {
      if (n.scope) {
        if (await system.revealOnDesk(n.node.id)) return;
      }
      const node = fs.get(n.node.id);
      if (node) system.launch('files', { folder: node.parent });
    };
    const el = h('div', { class: 'sn-card', role: 'listitem', tabindex: '0', 'aria-label': n.title, dataset: { id: n.node.id } },
      h('div', { class: 'sn-card-t' }, n.title),
      n.excerpt ? h('div', { class: 'sn-card-x' }, n.excerpt) : '',
      h('div', { class: 'sn-card-w' }, n.remind ? h('span', {}, icon('bell'), whenText(n.remind)) : '', where(n)),
      h('div', { class: 'sn-card-acts' },
        h('button', { class: 'ctl-btn primary', type: 'button', onclick: show }, icon('fit'), t('list.show')),
        h('button', { class: 'ctl-btn', type: 'button', onclick: async () => {
          if (!await system.bringToDesk(n.node.id, { w: n.meta.w, h: n.meta.h })) status.textContent = t('list.gone');
        } }, icon('arrowDown'), t('list.bring'))));
    el.style.setProperty('--sn-c', COLORS[n.meta.color]);
    el.addEventListener('dblclick', e => { if (!e.target.closest('button')) show(); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target === el) show(); });
    return el;
  }

  function render() {
    const all = notes();
    renderSide(all);
    const shown = all.filter(matches);
    count.textContent = t('list.count', { n: shown.length });
    grid.replaceChildren(...(shown.length ? shown.map(card) : [h('p', { class: 'sn-empty' }, all.length ? t('list.noMatch') : t('list.none'))]));
    status.textContent = t('list.status', { n: all.length, spaces: new Set(all.filter(onDesk).map(n => n.scope)).size });
    if (state.focus) {
      grid.querySelector(`[data-id="${CSS.escape(state.focus)}"]`)?.scrollIntoView({ block: 'nearest' });
      state.focus = null;
    }
  }

  let timer = 0;
  const later = () => { clearTimeout(timer); timer = setTimeout(render, 150); };
  const offs = [fs.on('change', later), fs.on('scope', later), system.onWorkspacesChange?.(later) ?? (() => {}), i18n.onChange?.(render) ?? (() => {})];
  win.on('destroy', () => offs.forEach(off => off?.()));
  render();
  return win;
}
