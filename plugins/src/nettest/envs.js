import { Window, h, icon, calls, messageBox, openMenu } from '@lilos/sdk';
import { kvTable } from '../shared/kvTable.js';
import { newId } from './model.js';
import { store } from './store.js';
import { t } from './i18n.js';

/**
 * Ambienti: the environments of a collection (Sviluppo, Produzione…), its own variables and the
 * global ones. A variable marked secret (the lock) is sealed by the kernel at once (calls.seal):
 * the file keeps only the sealed value, which opens only for this user on this lilOS and is put in
 * the request by the kernel; nobody sees it again, the user can only replace it.
 */
const KEY = 'nettest-envs';

export function openEnvironments(owner, col) {
  const entry = store.get(col);
  if (!entry) return;
  const win = new Window({ title: t('env.title', { name: store.nameOf(entry) }), icon: 'globe', width: 760, height: 480 });
  const data = entry.data;
  let current = store.envId(col) ?? data.environments[0]?.id ?? 'collection';
  const list = h('nav', { class: 'nx-envlist' });
  const pane = h('div', { class: 'nx-envpane' });
  win.body.append(h('div', { class: 'nx nx-envs' }, list, pane));
  const touch = () => store.touch(col);

  const askSecret = async row => {
    const r = await messageBox(win, { title: t('env.secret.title', { name: row.key || '—' }), text: t('env.secret.text'), fields: [{ name: 'v', type: 'password', label: t('vars.value'), required: true }], buttons: ['cancel', 'ok'] });
    return r?.button === 'ok' ? String(r.values.v) : null;
  };
  const secret = {
    label: row => (row.sealed ? t('env.secret.sealed') : t('env.secret.missing')),
    onSecret: async (row, on) => {
      if (!on) {
        const answer = await messageBox(win, { icon: 'warning', title: t('env.secret.dropTitle', { name: row.key }), text: t('env.secret.dropText'), buttons: ['cancel', 'continue'] });
        if (answer !== 'continue') return;
        Object.assign(row, { secret: false, value: '' });
        delete row.sealed;
        return;
      }
      const value = row.value || await askSecret(row);
      if (value === null) return;
      try {
        row.sealed = await calls.seal(value);
        Object.assign(row, { secret: true, value: '' });
        delete row.needsValue;
      } catch (err) {
        messageBox(win, { icon: 'error', text: err.message });
      }
    },
  };

  function drawList() {
    const item = (id, label, glyph, menu) => h('button', {
      type: 'button', class: `nx-envitem${current === id ? ' on' : ''}`, onclick: () => { current = id; draw(); },
      oncontextmenu: menu ? e => { e.preventDefault(); menu(e.clientX, e.clientY); } : null,
    }, icon(glyph), h('span', {}, label), store.envId(col) === id ? h('span', { class: 'nx-badge' }, t('env.active')) : null);
    list.replaceChildren(
      h('h6', {}, t('env.environments')),
      ...data.environments.map(e => item(e.id, e.name, 'globe', (x, y) => envMenu(e, x, y))),
      h('button', { type: 'button', class: 'nx-link', onclick: addEnv }, icon('plus'), t('env.add')),
      h('h6', {}, t('env.other')),
      item('collection', t('env.collectionVars'), 'list'),
      item('globals', t('env.globals'), 'star'));
  }

  async function addEnv() {
    const r = await messageBox(win, { title: t('env.add'), fields: [{ name: 'v', label: t('item.name'), value: t('env.newName'), required: true }], buttons: ['cancel', 'ok'] });
    if (r?.button !== 'ok') return;
    const env = { id: newId(), name: String(r.values.v).trim(), variables: [] };
    data.environments.push(env);
    if (!store.envId(col)) store.setEnv(col, env.id);
    current = env.id;
    touch();
    draw();
  }

  function envMenu(env, x, y) {
    openMenu(x, y, [
      { label: t('env.use'), icon: 'check', action: () => { store.setEnv(col, env.id); draw(); } },
      { label: t('menu.rename'), icon: 'pencil', action: async () => {
        const r = await messageBox(win, { title: t('menu.rename'), fields: [{ name: 'v', label: t('item.name'), value: env.name, required: true }], buttons: ['cancel', 'ok'] });
        if (r?.button === 'ok') { env.name = String(r.values.v).trim(); touch(); draw(); }
      } },
      { label: t('menu.duplicate'), icon: 'filePlus', action: () => {
        const copy = { ...structuredClone(env), id: newId(), name: t('item.copyOf', { name: env.name }) };
        data.environments.push(copy);
        touch();
        draw();
      } },
      { label: t('menu.delete'), icon: 'trash', danger: true, action: async () => {
        const answer = await messageBox(win, { icon: 'warning', title: t('env.deleteTitle', { name: env.name }), buttons: ['cancel', { value: 'delete', label: t('menu.delete'), danger: true, primary: true }] });
        if (answer !== 'delete') return;
        data.environments.splice(data.environments.indexOf(env), 1);
        if (store.envId(col) === env.id) store.setEnv(col, null);
        current = data.environments[0]?.id ?? 'collection';
        touch();
        draw();
      } },
    ]);
  }

  function draw() {
    drawList();
    if (current === 'globals') {
      const rows = store.globals;
      const table = kvTable({ t, rows, mono: true, placeholder: { key: t('vars.name'), value: t('vars.value') }, onChange: () => store.setGlobals(rows) });
      return pane.replaceChildren(h('h3', {}, t('env.globals')), h('p', { class: 'nx-hint' }, t('vars.globalsHint')), table.el);
    }
    if (current === 'collection') {
      const table = kvTable({ t, rows: data.variables, mono: true, placeholder: { key: t('vars.name'), value: t('vars.value') }, onChange: touch });
      return pane.replaceChildren(h('h3', {}, t('env.collectionVars')), h('p', { class: 'nx-hint' }, t('vars.collectionHint')), table.el);
    }
    const env = data.environments.find(e => e.id === current);
    if (!env) {
      return pane.replaceChildren(h('div', { class: 'nx-hello' }, h('p', {}, t('env.noneYet')), h('button', { type: 'button', class: 'ctl-btn primary', onclick: addEnv }, icon('plus'), t('env.add'))));
    }
    const table = kvTable({ t, rows: env.variables, mono: true, secret, placeholder: { key: t('vars.name'), value: t('vars.value') }, onChange: touch });
    const missing = env.variables.filter(v => v.secret && !v.sealed).map(v => v.key);
    pane.replaceChildren(...[
      h('div', { class: 'nx-envhead' }, h('h3', {}, env.name), h('span', { class: 'nx-grow' }),
        store.envId(col) === env.id ? h('span', { class: 'nx-badge' }, t('env.active')) : h('button', { type: 'button', class: 'ctl-btn', onclick: () => { store.setEnv(col, env.id); draw(); } }, t('env.use'))),
      h('p', { class: 'nx-hint' }, t('vars.envHint')),
      missing.length ? h('p', { class: 'nx-hint warn' }, icon('warning'), t('env.secret.needs', { names: missing.join(', ') })) : null,
      table.el,
      h('p', { class: 'nx-hint' }, icon('lock'), t('env.secret.hint'))].filter(Boolean));
  }

  const off = store.on('collections', () => { if (!store.get(col)) win.emit('close'); });
  win.on('destroy', off);
  draw();
  owner.openWindow(win, `${KEY}:${col}`);
}
