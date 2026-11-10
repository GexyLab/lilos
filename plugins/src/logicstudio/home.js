import { h, icon, fs, logic, actionButton, messageBox } from '@lilos/sdk';
import * as system from '@lilos/system';   // logicHost: lilOS ≥ 1.37.0
import { launch } from '@lilos/system';
import { recent } from './LogicStudioApp.js';
import { t, i18n } from './i18n.js';

/**
 * Home: new project, open, the recent ones; and the user's programs in the engine (tests and
 * active programs) with what they use of their quota.
 */
export class Home {
  el;
  #studio;
  #list = h('div', { class: 'ls-home-progs' });
  #usage = h('div', { class: 'ls-usage' });

  constructor(studio) {
    this.#studio = studio;
    this.el = h('div', { class: 'ls-editor ls-home' });
    this.render();
  }

  show() { this.render(); this.refresh(); }

  render() {
    const studio = this.#studio;
    const recents = recent.list().map(id => fs.get(id)).filter(Boolean);
    this.el.replaceChildren(
      h('div', { class: 'ls-home-main' },
        h('h2', {}, icon('blocks'), t('app.name')),
        h('p', { class: 'ls-hint' }, t('home.intro')),
        h('div', { class: 'ls-home-acts' },
          actionButton({ label: t('home.new'), icon: icon('plus'), primary: true, onClick: () => studio.newProject() }),
          actionButton({ label: t('home.open'), icon: icon('open'), onClick: () => studio.openProjectPicker() })),
        h('h3', {}, t('home.recent')),
        recents.length
          ? h('ul', { class: 'ls-recent' }, ...recents.map(n => h('li', {}, h('button', { type: 'button', onclick: () => studio.open(n.id) }, icon(n.name.endsWith('.lsch') ? 'blocks' : 'grid'), h('b', {}, n.name.replace(/\.(lsproj|lsch)$/i, '')), h('small', {}, fs.path(n.parent))))))
          : h('p', { class: 'ls-empty' }, t('home.noRecent')),
        h('h3', {}, t('home.programs')),
        this.#list),
      h('div', { class: 'ls-home-side' }, h('h3', {}, t('home.usage')), this.#usage));
  }

  async refresh() {
    let programs = [], status = null;
    try {
      [programs, status] = await Promise.all([logic.programs(), logic.status()]);
    } catch (err) {
      this.#list.replaceChildren(h('div', { class: 'ls-notice' }, icon('warning'), h('span', {}, t('home.noEngine')),
        actionButton({ label: t('home.appstore'), onClick: () => launch('appstore') })));
      this.#usage.replaceChildren();
      return;
    }
    if (!programs.length) this.#list.replaceChildren(h('p', { class: 'ls-empty' }, t('home.noPrograms')));
    else {
      this.#list.replaceChildren(h('table', { class: 'ls-progs' },
        h('tr', {}, h('th', {}, t('home.colName')), h('th', {}, t('home.colKind')), h('th', {}, t('home.colState')), h('th', {}, t('home.colSince')), h('th', {})),
        ...programs.map(p => h('tr', {},
          h('td', {}, h('b', {}, p.name), p.source?.path ? h('small', {}, p.source.path) : null, p.error ? h('small', { class: 'err' }, p.error) : null),
          h('td', {}, t(`kind.${p.kind}`)),
          h('td', {}, h('span', { class: `ls-st ${p.status}` }, t(`state.${p.status}`))),
          h('td', {}, p.started ? i18n.date(p.started, { dateStyle: 'short', timeStyle: 'short' }) : '—'),
          h('td', { class: 'acts' },
            p.status === 'running' && p.windows?.length && system.logicHost ? h('button', { type: 'button', class: 'ls-link-btn', onclick: () => system.logicHost.openMain(p.id) }, t('home.openWindow')) : null,
            p.source?.path && fs.resolve(p.source.path) ? h('button', { type: 'button', class: 'ls-link-btn', onclick: () => this.#studio.open(fs.resolve(p.source.path).id) }, t('home.openProject')) : null,
            p.status === 'running' || p.status === 'starting'
              ? h('button', { type: 'button', class: 'ls-link-btn', onclick: () => this.#stop(p) }, t('home.stop'))
              : h('button', { type: 'button', class: 'ls-link-btn danger', onclick: () => logic.forget(p.id).then(() => this.refresh()) }, t('home.forget')))))));
    }
    const q = status.quota;
    const bar = (label, used, max, text = `${used} / ${max}`) => h('div', { class: 'ls-u' }, h('span', {}, label), h('b', {}, text), h('i', { class: 'bar' }, h('i', { style: `width:${max ? Math.min(100, (used / max) * 100) : 0}%` })));
    this.#usage.replaceChildren(
      bar(t('usage.active'), status.active, q.maxActive),
      bar(t('usage.tests'), status.tests, q.maxTests),
      bar(t('usage.net'), status.net, q.netPerMinute),
      bar(t('usage.log'), status.log, q.logMb * 1024 * 1024, `${Math.round(status.log / 1024)} KB / ${q.logMb} MB`),
      h('p', { class: 'ls-hint' }, t('usage.cpuMem', { cpu: q.cpuPercent, mem: q.memoryMb })));
  }

  async #stop(p) {
    if (p.kind === 'active') {
      const res = await messageBox(this.#studio.win, { icon: 'power', title: t('home.stopQ', { name: p.name }), text: t('home.stopText'), buttons: ['cancel', { value: 'ok', label: t('home.stop'), danger: true }] });
      if (res !== 'ok') return;
    }
    await logic.stop(p.id).catch(() => {});
    this.refresh();
  }
}
