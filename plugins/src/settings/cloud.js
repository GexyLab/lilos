import { h, kernel, net, kernelModules, actionButton, toast } from '@lilos/sdk';
import { settingRows } from '../shared/fieldsForm.js';
import { oneDriveSections } from './onedrive.js';
import { t } from './i18n.js';

/**
 * Control Panel → the network protocols that need settings for everyone on this lilOS, one tab
 * each while their protocol is in net.protocols (its kernel module runs), and the provider apps
 * their sign-in uses:
 *   microsoft, google        the app registered with the provider (kernel's config `oauth`,
 *                            kernelModules.oauthApps), set once for every protocol of that provider;
 *                            then the addresses to register with the provider and the steps
 *   onedrive, gdrive, …      the settings of the protocol's kernel module (module.json `settings`,
 *                            kernelModules.settings), a row that leads to the app they sign in
 *                            with, and the tab's own sections (OneDrive: the user's preferences)
 * Settings are drawn from their descriptions (shared settingRows) and saved as soon as they change,
 * by admins. A secret setting (the client secret) is never shown: it says whether it is set, and
 * can be replaced or removed.
 */
const TABS = {
  onedrive: { module: 'netfs-onedrive', icon: 'cloud', uses: 'microsoft', signAgain: ['shared'], sections: oneDriveSections },
  gdrive: { module: 'netfs-google', icon: 'cloud', uses: 'google', hide: ['photos'] },
  gphotos: { module: 'netfs-google', icon: 'image', uses: 'google', hide: ['shared', 'exportFormat'] },
  azblob: { module: 'netfs-azblob', icon: 'cloud', uses: 'microsoft', steps: 3 },
  nfs: { module: 'netfs-nfs', icon: 'disk', steps: 4 },
  localfolders: { module: 'netfs-local', icon: 'monitor', protocols: ['local'], steps: 2 },
  microsoft: { app: 'microsoft', icon: 'lock', protocols: ['onedrive', 'azblob'], steps: 5 },
  google: { app: 'google', icon: 'lock', protocols: ['gdrive', 'gphotos'], steps: 7 },
};
/** The settings of the provider apps, kept in the kernel since lilOS 1.22.0: modules that still declare them are not asked. */
const APP_KEYS = ['clientId', 'clientSecret', 'clientType', 'accounts', 'tenant'];
const CALLBACK = '/api/net/signin/callback';
const BY_HAND = 'http://127.0.0.1:53682/';

const states = new Map();   // tab → { fields, values, secrets } | { error } | { readOnly }
const loading = new Map();
const said = new Map();     // tab → { ok, text } of the last change

const isAdmin = () => kernel.user?.role === 'admin';
const hasProtocol = id => !!net.protocols?.some(p => p.id === id);
const protocolsOf = id => TABS[id].protocols ?? [id];

/** The tabs of the protocols this lilOS has, then their apps: [{ id, icon, label, description, sections }]. */
export function cloudTabs(ctx) {
  return Object.entries(TABS).filter(([id]) => protocolsOf(id).some(hasProtocol)).map(([id, tab]) => ({
    id, icon: tab.icon,
    get label() { return t(`cloud.${id}.label`); },
    get description() { return t(`cloud.${id}.description`); },
    sections: () => sections(id, ctx),
  }));
}

/** True for the tabs drawn here (read again each time they are shown: reloadCloud). */
export const isCloudTab = id => Object.hasOwn(TABS, id);

/** Forgets what was read of a tab (it is opened again). */
export function reloadCloud(id) {
  states.delete(id);
  said.delete(id);
}

function load(id, rerender) {
  if (!isAdmin()) {
    states.set(id, { readOnly: true });
    return;
  }
  if (loading.has(id)) return;
  const tab = TABS[id];
  const read = tab.app ? kernelModules.oauthApps().then(list => list.find(app => app.id === tab.app) ?? { error: '' }) : kernelModules.settings(tab.module);
  loading.set(id, read
    .then(s => states.set(id, s), err => states.set(id, { error: err.message }))
    .finally(() => { loading.delete(id); rerender(); }));
}

function sections(id, ctx) {
  if (!states.has(id)) load(id, ctx.rerender);
  const tab = TABS[id];
  const out = [settingsSection(id, ctx)];
  if (tab.app) out.push(addressSection(tab.app));
  if (tab.steps) {
    out.push({ title: t(`cloud.${id}.steps.title`), rows: [{ label: t(`cloud.${id}.steps.label`), control: () => h('ol', { class: 'od-steps' }, ...Array.from({ length: tab.steps }, (_, i) => h('li', {}, t(`cloud.${id}.steps.${i + 1}`)))) }] });
  }
  if (tab.sections) out.push(...tab.sections(ctx));
  return out;
}

function settingsSection(id, { rerender, select }) {
  const tab = TABS[id];
  const state = states.get(id);
  const rows = [];
  if (!state) rows.push({ label: t('common.loading') });
  else if (state.error) rows.push({ label: t('cloud.error'), description: state.error });
  else if (state.readOnly) {
    const ready = protocolsOf(id).filter(hasProtocol).every(p => !net.protocols.find(x => x.id === p).notReady);
    rows.push({ label: t('cloud.status'), description: t('cloud.adminOnly'), control: ready ? t('cloud.ready') : t('cloud.notReady') });
  } else {
    const hidden = new Set([...tab.hide ?? [], ...(tab.module ? APP_KEYS : [])]);
    const fields = state.fields.filter(f => !hidden.has(f.key));
    rows.push(...settingRows(fields, state.values, { t, secrets: state.secrets ?? [], keywords: t(`cloud.${id}.keywords`), save: (f, value) => save(id, f, value, rerender) }));
    if (tab.app && state.ready) rows.push({ label: t('cloud.status'), description: net.text(state.ready), control: t('cloud.notReady') });
    if (id === 'nfs') rows.push({ label: t('cloud.nfs.you'), description: t('cloud.nfs.you.description'), control: () => h('code', {}, kernel.user?.username ?? '') });
    const last = said.get(id);
    if (last) rows.push({ label: last.ok ? t('cloud.saved') : t('cloud.notSaved'), description: last.text });
  }
  // The app the protocol signs in with: set in its own tab
  if (tab.uses) {
    rows.push({
      label: t(`cloud.uses.${tab.uses}`), description: t('cloud.uses.description'), keywords: t(`cloud.${id}.keywords`),
      control: () => actionButton({ label: t('cloud.uses.open'), onClick: () => select(tab.uses) }),
    });
  }
  return { title: t(`cloud.${id}.settings`), rows };
}

/** Saves a setting at once. Secret settings: left out keeps them, null removes them. */
async function save(id, f, value, rerender) {
  const tab = TABS[id];
  const state = states.get(id);
  const next = Object.fromEntries(Object.entries(state.values).filter(([k]) => state.fields.some(x => x.key === k && x.type !== 'password')));
  if (f.type === 'password') next[f.key] = value;
  else if (value === '' || value === undefined) delete next[f.key];
  else next[f.key] = value;
  try {
    states.set(id, await (tab.app ? kernelModules.saveOAuthApp(tab.app, next) : kernelModules.saveSettings(tab.module, next)));
    said.set(id, { ok: true, text: tab.signAgain?.includes(f.key) ? t('cloud.signAgain') : '' });
    await net.load();   // the protocols' state (ready) as it is now
  } catch (err) {
    said.set(id, { ok: false, text: err.message });
  }
  rerender();
}

/** The addresses to register with the provider: this page's (sign-in window) and the one by hand. */
function addressSection(app) {
  const copy = value => actionButton({ label: t('cloud.copy'), onClick: () => navigator.clipboard?.writeText(value).then(() => toast(t('cloud.copied')), () => {}) });
  const redirect = `${location.origin}${CALLBACK}`;
  const usable = location.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  return {
    title: t('cloud.addresses.title'),
    rows: [
      {
        label: t('cloud.redirect.label'),
        description: usable ? t(`cloud.redirect.${app}`) : t('cloud.redirect.unusable'),
        control: () => h('div', { class: 'od-redirect' }, h('code', {}, redirect), copy(redirect)),
      },
      {
        label: t('cloud.byHand.label'),
        description: t(`cloud.byHand.${app}`),
        control: () => h('div', { class: 'od-redirect' }, h('code', {}, BY_HAND), copy(BY_HAND)),
      },
    ],
  };
}
