import { h, kernel, toggle, textField, toast } from '@lilos/sdk';
import * as sdk from '@lilos/sdk';   // net.rules: missing in older lilOS
import { t } from './i18n.js';

/**
 * Control Panel → Rete (admins, lilOS 1.25.0 or newer): where users may make the kernel connect
 * (the Rete folder, Terminale, NetTest). With sign-in the kernel is shared: never this machine and
 * the local network, unless the admin opens them here (the exception), all of it or some
 * addresses. With one user and no sign-in everything is open anyway: the rules are shown, they
 * apply once users sign in. Saved in the kernel's config.json, used at once.
 */
const state = { rules: null, error: '', loading: false };
const isAdmin = () => kernel.user?.role === 'admin';

function load(rerender) {
  if (state.loading) return;
  state.loading = true;
  sdk.net.rules().then(r => { state.rules = r; state.error = ''; }, err => { state.error = err.message; }).finally(() => { state.loading = false; rerender(); });
}

async function save(change, rerender) {
  try {
    state.rules = await sdk.net.setRules(change);
    toast(t('network.saved'));
  } catch (err) {
    toast(err.message, { level: 'error' });
  }
  rerender();
}

/** The tab, or nothing (no kernel, an older one, not an admin). */
export function networkTab({ rerender }) {
  if (!kernel.connected || typeof sdk.net?.rules !== 'function' || !isAdmin()) return null;
  return {
    id: 'network', icon: 'globe',
    get label() { return t('network.label'); },
    get description() { return t('network.description'); },
    sections: () => sections(rerender),
  };
}

function sections(rerender) {
  if (!state.rules && !state.error) load(rerender);
  if (state.error) return [{ title: '', rows: [{ label: t('network.error'), description: state.error, control: '' }] }];
  const r = state.rules;
  if (!r) return [{ title: '', rows: [{ label: t('network.loading'), control: '' }] }];
  const ranges = textField({
    value: r.allow.join(', '), placeholder: '192.168.1.50/32, 10.0.5.0/24', mono: true, className: 'set-wide',
    onChange: v => save({ allow: String(v).split(/[\s,;]+/).filter(Boolean) }, rerender),
  });
  return [
    ...(!r.multiUser ? [{ title: '', rows: [{ label: t('network.single'), description: t('network.singleText'), control: '' }] }] : []),
    {
      title: t('network.exception'),
      rows: [
        { label: t('network.local.label'), description: t('network.local.description'), control: toggle({ value: r.allowLocal, onChange: v => save({ allowLocal: v }, rerender) }) },
        { label: t('network.private.label'), description: t('network.private.description'), control: toggle({ value: r.allowPrivate, onChange: v => save({ allowPrivate: v }, rerender) }) },
        { label: t('network.ranges.label'), description: t('network.ranges.description'), control: ranges },
      ],
    },
    { title: '', rows: [{ label: '', description: t('network.always'), control: h('span') }] },
  ];
}
