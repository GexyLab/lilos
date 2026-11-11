import { SettingsWindow, selectField, textField, toggle, h, icon, messageBox } from '@lilos/sdk';
import { options, SEARCH_ENGINES, KEEP_DAYS, addressOf } from './options.js';
import { history } from './history.js';
import { t } from './i18n.js';

/** NetWave's Options window (one): start, search, sites opened from lilOS, history, permissions of sites. */
const WINDOW_KEY = 'netwave-options';
let current = null;

export function openOptions(openWindow) {
  if (current?.el.isConnected) return openWindow(current, WINDOW_KEY);
  const win = new SettingsWindow({
    title: t('options.title'), icon: 'globe', width: 700, height: 480, search: false,
    tabs: [
      {
        id: 'general', label: t('options.general'), icon: 'gear', description: t('options.generalText'),
        sections: () => [{
          rows: [
            {
              label: t('options.home'), description: t('options.homeText'),
              control: textField({ value: options.get('home'), placeholder: t('options.homeEmpty'), type: 'url', onChange: v => options.set('home', v.trim() ? addressOf(v) ?? '' : '') }),
            },
            {
              label: t('options.search'), description: t('options.searchText'),
              control: selectField({ value: options.get('search'), label: t('options.search'), options: SEARCH_ENGINES.map(e => ({ value: e.id, label: e.label })), onChange: v => options.set('search', v) }),
            },
            {
              label: t('options.openLinks'), description: t('options.openLinksText'),
              control: toggle({ value: options.get('openLinks'), label: t('options.openLinks'), onChange: v => options.set('openLinks', !!v) }),
            },
          ],
        }],
      },
      {
        id: 'history', label: t('options.history'), icon: 'clock', description: t('options.historyText'),
        sections: () => [{
          rows: [
            {
              label: t('options.keep'),
              control: selectField({ value: options.get('keepDays'), label: t('options.keep'), options: KEEP_DAYS.map(d => ({ value: d, label: d ? t('options.days', { n: d }) : t('options.forever') })), onChange: v => options.set('keepDays', Number(v)) }),
            },
            { label: t('history.clear'), description: t('options.clearText'), control: () => h('button', { type: 'button', class: 'ctl-btn', onclick: () => clearHistory(win) }, icon('trash'), t('history.clear')) },
          ],
        }],
      },
      {
        id: 'sites', label: t('options.sites'), icon: 'shield', description: t('options.sitesText'),
        sections: () => {
          const grants = options.grants();
          return [{
            rows: [{
              label: t('options.askTabs'), description: t('options.askTabsText'),
              control: toggle({ value: options.get('askTabs'), label: t('options.askTabs'), onChange: v => options.set('askTabs', !!v) }),
            }],
          }, {
            content: () => (grants.length
              ? h('div', { class: 'nw-grants' }, ...grants.map(g => h('div', { class: 'nw-grant' },
                icon(g.allow ? 'check' : 'x'),
                h('span', { class: 'nw-grant-site' }, g.origin),
                h('span', { class: 'nw-grant-what' }, t(g.allow ? 'site.allowed' : 'site.blocked', { what: t(`perm.${g.permission}`) })),
                h('button', { type: 'button', class: 'ctl-btn', onclick: () => { options.setGrant(g.origin, g.permission, null); win.view?.render?.(); } }, t('site.forget')))))
              : h('p', { class: 'nw-grants-empty' }, t('options.noSites'))),
          }];
        },
      },
    ],
  });
  current = win;
  const off = options.on('grants', () => win.view?.render?.());
  win.on('destroy', () => { off(); if (current === win) current = null; });
  return openWindow(win, WINDOW_KEY);
}

/** Asks what to clear (the last hour, today, everything; pages, sessions) and clears it. */
export async function clearHistory(owner) {
  const r = await messageBox(owner, {
    icon: 'warning', title: t('history.clear'),
    fields: [
      { name: 'range', type: 'select', label: t('clear.range'), value: 'hour', options: [{ value: 'hour', label: t('clear.hour') }, { value: 'today', label: t('clear.today') }, { value: 'all', label: t('clear.all') }] },
      { name: 'pages', type: 'checkbox', label: t('clear.pages'), value: true },
      { name: 'sessions', type: 'checkbox', label: t('clear.sessions'), value: true },
    ],
    buttons: ['cancel', { value: 'clear', label: t('clear.do'), danger: true }],
  });
  if (r?.button !== 'clear') return;
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const since = { hour: Date.now() - 3_600_000, today: midnight.getTime(), all: 0 }[r.values.range] ?? 0;
  history.clear({ since, pages: !!r.values.pages, sessions: !!r.values.sessions });
}
