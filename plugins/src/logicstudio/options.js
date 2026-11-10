import { Window, h, icon, textField, selectField, checkbox, radios, actionButton, messageBox } from '@lilos/sdk';
import { t } from './i18n.js';

/**
 * Opzioni del progetto, in a window of its own: Generale, Finestre (the main one, the entry
 * points), Console (the list, and what they do outside the IDE), App (what the open windows
 * share: decision 8, an option of the app). Every change goes into the .lsproj at once (with
 * undo); «Salva» in the IDE writes it.
 */
const ENTRY_KINDS = ['none', 'file', 'action', 'call', 'login'];
const COLORS = ['#6b7280', '#0f9d9a', '#d9822b', '#2f81f7', '#8b5cf6', '#e5534b', '#2da44e', '#d9a514'];

export function openProjectOptions(studio, tab = 'general') {
  const project = studio.ws?.project;
  if (!project) return;
  const existing = studio.optionsWindow;
  if (existing && !existing.closed) { existing.show?.(tab); return; }
  const win = new Window({ title: t('options.title'), subtitle: project.data.name, icon: 'gear', width: 820, height: 560, minWidth: 560, minHeight: 380 });
  const side = h('div', { class: 'ls-opt-side', role: 'tablist' });
  const main = h('div', { class: 'ls-opt-main' });
  win.body.append(h('div', { class: 'ls-opt' }, side, main));
  let current = tab;
  const render = () => {
    side.replaceChildren(...['general', 'windows', 'consoles', 'app'].map(k => h('button', {
      type: 'button', role: 'tab', class: current === k ? 'on' : '', 'aria-selected': String(current === k),
      onclick: () => { current = k; render(); },
    }, t(`options.${k}`))));
    main.replaceChildren(...{ general, windows, consoles, app }[current](studio, project, render));
  };
  const onChange = () => render();
  project.on('change', onChange);
  win.on('destroy', () => { project.off('change', onChange); studio.optionsWindow = null; });
  win.show = k => { current = k; render(); };
  studio.optionsWindow = win;
  render();
  studio.openWindow(win, 'options');
  return win;
}

const field = (label, control, hint = null) => h('label', { class: 'ls-field' }, h('span', {}, label), control, hint ? h('small', { class: 'ls-hint' }, hint) : null);
const section = text => h('h4', { class: 'ls-opt-h' }, text);

function general(studio, project) {
  const d = project.data;
  return [
    section(t('options.general')),
    field(t('options.name'), textField({ value: d.name, maxLength: 80, onChange: v => v.trim() && project.setInfo({ name: v.trim() }) })),
    field(t('options.version'), textField({ value: d.version, maxLength: 20, onChange: v => /^\d+\.\d+\.\d+$/.test(v.trim()) && project.setInfo({ version: v.trim() }) }), t('options.versionHint')),
    field(t('options.description'), textField({ value: d.description ?? '', maxLength: 300, onChange: v => project.setInfo({ description: v }) })),
  ];
}

function windows(studio, project) {
  const d = project.data;
  const names = Object.keys(d.windows);
  const out = [section(t('options.windows')), h('p', { class: 'ls-hint' }, t('options.windowsHint'))];
  if (!names.length) return [...out, h('p', { class: 'ls-empty' }, t('options.noWindows'))];
  out.push(field(t('options.main'), selectField({ value: d.main, options: names, onChange: v => project.setMain(v) }), t('options.mainHint')));
  const rows = names.map(name => {
    const entry = d.entrypoints[name] ?? null;
    const kind = name === d.main ? 'main' : entry?.kind ?? 'none';
    const control = name === d.main
      ? h('span', { class: 'ls-hint' }, t('entry.main'))
      : h('span', { class: 'ls-entry' },
        selectField({ value: kind, options: ENTRY_KINDS.map(k => ({ value: k, label: t(`entry.${k}`) })), onChange: v => project.setEntrypoint(name, v === 'none' ? null : { kind: v, ...(v === 'file' && { ext: [] }), label: entry?.label ?? name }) }),
        kind === 'file' ? textField({ value: (entry.ext ?? []).join(', '), placeholder: t('entry.extPlaceholder'), onChange: v => project.setEntrypoint(name, { ...entry, ext: v.split(/[\s,;]+/).map(x => x.replace(/^\./, '').toLowerCase()).filter(x => /^[a-z0-9]{1,16}$/.test(x)).slice(0, 12) }) }) : null,
        kind !== 'none' ? textField({ value: entry?.label ?? '', placeholder: t('entry.label'), maxLength: 60, onChange: v => project.setEntrypoint(name, { ...entry, label: v.trim() || name }) }) : null);
    return h('tr', {}, h('td', {}, icon('window'), h('b', {}, name), name === d.main ? h('span', { class: 'pill' }, 'main') : null), h('td', {}, control));
  });
  out.push(h('table', { class: 'ls-opt-table' }, h('tr', {}, h('th', {}, t('options.window')), h('th', {}, t('options.opensFrom'))), ...rows));
  out.push(h('p', { class: 'ls-hint' }, t('options.unlinkedHint')));
  return out;
}

function consoles(studio, project) {
  const c = project.data.consoles;
  const out = [section(t('options.consoleList'))];
  const rows = c.list.map(con => h('tr', {},
    h('td', {}, con.id === 'main' ? h('b', {}, con.name || t('console.main'), ' ★') : textField({ value: con.name, maxLength: 60, onChange: v => v.trim() && project.updateConsole(con.id, { name: v.trim() }) })),
    h('td', {}, h('span', { class: 'ls-swatches' }, ...COLORS.map(col => h('button', { type: 'button', class: `sw${(con.color ?? '#6b7280') === col ? ' on' : ''}`, style: `background:${col}`, title: col, 'aria-label': col, onclick: () => project.updateConsole(con.id, { color: col }) })))),
    h('td', {}, textField({ type: 'number', value: con.keep ?? 1000, min: 100, max: 10000, step: 100, onChange: v => project.updateConsole(con.id, { keep: Math.max(100, Math.min(10000, Number(v) || 1000)) }) })),
    h('td', {}, con.id === 'main' ? h('span', { class: 'ls-hint' }, t('options.mainConsole')) : h('button', { type: 'button', class: 'ls-link-btn danger', onclick: () => removeConsole(studio, project, con) }, t('options.remove')))));
  out.push(h('table', { class: 'ls-opt-table' }, h('tr', {}, h('th', {}, t('options.consoleName')), h('th', {}, t('options.color')), h('th', {}, t('options.keep')), h('th', {})), ...rows));
  const add = actionButton({ label: t('console.add'), icon: icon('plus'), onClick: () => project.addConsole(t('options.newConsole', { n: c.list.length })) });
  add.disabled = c.list.length >= 10;
  out.push(h('div', { class: 'ls-insp-acts' }, add,
    h('span', { class: 'ls-hint' }, t('options.removeHint'))));
  out.push(section(t('options.outside')));
  out.push(radios({
    value: c.outside, onChange: v => project.setConsoles({ outside: v }),
    options: ['all', 'onInput', 'hidden', 'main'].map(v => ({ value: v, label: `${t(`outside.${v}`)} — ${t(`outside.${v}.hint`)}` })),
  }));
  out.push(section(t('options.details')));
  out.push(checkbox({ value: c.closeAfterAnswer !== false, label: t('options.closeAfter'), disabled: c.outside !== 'onInput', onChange: v => project.setConsoles({ closeAfterAnswer: v }) }));
  out.push(checkbox({ value: c.notify !== false, label: t('options.notify'), disabled: c.outside === 'hidden', onChange: v => project.setConsoles({ notify: v }) }));
  out.push(field(t('options.copyToLog'), selectField({ value: c.copyToLog ?? 'warnings', options: ['none', 'warnings', 'all'].map(v => ({ value: v, label: t(`log.${v}`) })), onChange: v => project.setConsoles({ copyToLog: v }) })));
  out.push(field(t('options.mainOpens'), selectField({ value: c.mainOpens ?? 'start', disabled: c.outside !== 'main', options: ['start', 'onInput'].map(v => ({ value: v, label: t(`mainOpens.${v}`) })), onChange: v => project.setConsoles({ mainOpens: v }) })));
  out.push(h('p', { class: 'ls-hint' }, t('options.consoleQuota')));
  return out;
}

async function removeConsole(studio, project, con) {
  const res = await messageBox(studio.win, { icon: 'warning', title: t('options.removeConsoleQ', { name: con.name }), text: t('options.removeHint'), buttons: ['cancel', { value: 'ok', label: t('options.remove'), danger: true }] });
  if (res === 'ok') project.removeConsole(con.id);
}

function app(studio, project) {
  const o = project.data.options;
  return [
    section(t('options.app')),
    h('p', { class: 'ls-hint' }, t('options.appHint')),
    checkbox({ value: o.keepValues !== false, label: t('options.keepValues'), onChange: v => project.setOptions({ keepValues: v }) }),
    h('p', { class: 'ls-hint ind' }, t('options.keepValuesHint')),
    checkbox({ value: o.syncCopies !== false, label: t('options.syncCopies'), onChange: v => project.setOptions({ syncCopies: v }) }),
    h('p', { class: 'ls-hint ind' }, t('options.syncCopiesHint')),
    h('p', { class: 'ls-hint' }, t('options.commandsHint')),
  ];
}
