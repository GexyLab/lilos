import { h, kernel, storage, toggle, segmented, selectField, textField, actionButton, toast, messageBox, formatBytes } from '@lilos/sdk';
import * as sdk from '@lilos/sdk';   // `host`: missing in older lilOS, so not imported by name
import { t } from './i18n.js';

/**
 * Control Panel → Computer: the program lilOS on this computer (only inside it, not in a browser).
 *   Programma   versions, updates of the program, start with the computer, tray, notifications
 *   Schermo     window, full screen or kiosk; the monitor; the keys to lilOS in full screen
 *   Hardware    which apps use devices without asking (administrators); what the computer has
 *   Server      the lilOS this program opens (this computer, servers), add or remove one
 * The settings are the computer's (the program keeps them), not the user's.
 */
const host = () => (sdk.host?.native ? sdk.host : null);
const isAdmin = () => !kernel.user || kernel.user.role === 'admin';

const state = { info: null, settings: null, devices: null, servers: null, local: null, displays: [], updates: null, loading: null };

/** Reads what the tab shows, then draws again. */
function load(rerender, parts = ['info', 'settings', 'servers', 'local', 'displays']) {
  const h0 = host();
  if (!h0) return;
  const jobs = {
    info: () => h0.info(), settings: () => h0.settings.get(), servers: () => h0.servers.list(),
    local: () => h0.local.status().catch(() => null), displays: () => h0.displays(), devices: () => h0.devices.list(),
  };
  state.loading = Promise.all(parts.map(p => jobs[p]().then(v => { state[p] = v; }, () => {}))).then(() => rerender());
  return state.loading;
}

let watching = false;

/** The tab, or nothing outside the program. */
export function computerTab({ rerender }) {
  const h0 = host();
  if (!h0) return null;
  if (!watching) {
    watching = true;
    h0.on('settings', s => { state.settings = s; rerender(); });
    h0.on('drives', drives => { if (state.devices) { state.devices.drives = drives; rerender(); } });
    sdk.net?.on?.('mounts', () => rerender());
    load(rerender);
  }
  return {
    id: 'computer', icon: 'monitor',
    get label() { return t('computer.label'); },
    get description() { return t('computer.description'); },
    subtabs: [
      { id: 'program', get label() { return t('computer.program.label'); }, sections: () => programSections(rerender) },
      { id: 'screen', get label() { return t('computer.screen.label'); }, sections: () => screenSections(rerender) },
      { id: 'hardware', get label() { return t('computer.hardware.label'); }, sections: () => hardwareSections(rerender) },
      { id: 'servers', get label() { return t('computer.servers.label'); }, sections: () => serverSections(rerender) },
    ],
  };
}

const waiting = () => [{ title: '', rows: [{ label: t('computer.loading'), control: '' }] }];

function set(key, value, rerender) {
  return host().settings.set(key, value).then(s => { state.settings = s; rerender(); }, err => toast(t('computer.error', { error: err.message }), { level: 'error' }));
}

const OS = { win32: 'Windows', darwin: 'macOS', linux: 'Linux' };

function programSections(rerender) {
  const { info, settings: s } = state;
  if (!info || !s) return waiting();
  const mac = info.os === 'darwin';
  const rt = info.runtime;
  const rows = [
    { label: t('computer.program.version'), control: info.program },
    { label: t('computer.program.system'), control: `${OS[info.os] ?? info.os} ${info.osVersion} · ${info.arch}` },
    { label: t('computer.program.engine'), control: `Electron ${info.electron} · Chromium ${info.chrome}` },
  ];
  if (info.profile.kind === 'local' && rt) {
    rows.push({ label: t('computer.program.kernel'), description: t('computer.program.kernelHint'), control: `lilOS ${info.lilos ?? '?'} · Node.js ${rt.node} · PostgreSQL ${String(rt.postgres).split('-')[0]} · git ${rt.git}` });
  }
  const credits = Array.isArray(info.credits) ? info.credits : [];
  return [
    { title: t('computer.program.title'), rows },
    ...(credits.length ? [{
      title: t('computer.credits.title'),
      rows: credits.map(c => ({
        label: `${c.name} ${c.version ?? ''}`.trim(), description: `${c.license} · ${c.copyright}${c.use ? ` · ${typeof c.use === 'string' ? c.use : sdk.net?.text?.(c.use) ?? c.use.en}` : ''}`,
        control: c.url ? h('a', { class: 'credits-link', href: c.url, target: '_blank', rel: 'noopener noreferrer' }, t('computer.credits.site')) : '',
      })),
    }] : []),
    {
      title: t('computer.updates.title'),
      rows: [
        {
          label: t('computer.updates.label'), description: mac ? t('computer.updates.mac') : t('computer.updates.description'),
          control: selectField({
            value: s.updates, label: t('computer.updates.label'), onChange: v => set('updates', v, rerender),
            options: [
              { value: 'auto', label: t('computer.updates.auto'), disabled: mac },
              { value: 'notify', label: t('computer.updates.notify') },
              { value: 'off', label: t('computer.updates.off') },
            ],
          }),
        },
        {
          label: t('computer.updates.check'), description: updateText(),
          control: h('span', { class: 'cp-actions' },
            actionButton({ label: t('computer.updates.checkButton'), spinner: true, onClick: () => host().updates.check().then(u => { state.updates = u; rerender(); }) }),
            ['available', 'downloaded'].includes(state.updates?.status)
              ? actionButton({ label: state.updates.status === 'downloaded' ? t('computer.updates.install') : t('computer.updates.download'), primary: true, onClick: () => host().updates.install() })
              : null),
        },
      ],
    },
    {
      title: t('computer.start.title'),
      rows: [
        { label: t('computer.start.login'), description: t('computer.start.loginHint'), control: toggle({ value: s.startAtLogin, label: t('computer.start.login'), onChange: v => set('startAtLogin', v, rerender) }) },
        { label: t('computer.start.tray'), description: t('computer.start.trayHint'), control: toggle({ value: s.stayInTray, label: t('computer.start.tray'), onChange: v => set('stayInTray', v, rerender) }) },
        { label: t('computer.start.notifications'), description: t('computer.start.notificationsHint'), control: toggle({ value: s.notifications, label: t('computer.start.notifications'), onChange: v => set('notifications', v, rerender) }) },
      ],
    },
  ];
}

function updateText() {
  const u = state.updates;
  if (!u) return t('computer.updates.never');
  if (u.status === 'dev') return t('computer.updates.dev');
  if (u.status === 'current') return t('computer.updates.current');
  if (u.status === 'available') return t('computer.updates.available', { version: u.version });
  if (u.status === 'downloaded') return t('computer.updates.downloaded', { version: u.version });
  if (u.status === 'error') return t('computer.updates.failed', { error: u.error ?? '' });
  return t('computer.updates.checking');
}

function screenSections(rerender) {
  const { info, settings: s, displays } = state;
  if (!info || !s) return waiting();
  const admin = isAdmin();
  const kiosk = s.display === 'kiosk';
  const rows = [
    {
      label: t('computer.screen.mode'), description: t(`computer.screen.${s.display}Hint`),
      control: segmented({
        value: s.display, label: t('computer.screen.mode'),
        options: [
          { value: 'window', label: t('computer.screen.window'), disabled: kiosk && !admin },
          { value: 'fullscreen', label: t('computer.screen.fullscreen'), disabled: kiosk && !admin },
          { value: 'kiosk', label: t('computer.screen.kiosk'), disabled: !admin },
        ],
        onChange: v => set('display', v, rerender),
      }),
    },
  ];
  if (kiosk && !admin) {
    rows.push({ label: t('computer.screen.leave'), description: t('computer.screen.leaveHint'), control: actionButton({ label: t('computer.screen.leaveButton'), onClick: () => leaveKiosk(rerender) }) });
  }
  if (displays.length > 1) {
    rows.push({
      label: t('computer.screen.monitor'), description: t('computer.screen.monitorHint'),
      control: selectField({
        value: s.monitor ?? '', label: t('computer.screen.monitor'),
        options: [{ value: '', label: t('computer.screen.monitorSame') }, ...displays.map(d => ({ value: String(d.id), label: `${d.label}${d.primary ? ` (${t('computer.screen.primary')})` : ''} · ${d.width}×${d.height}` }))],
        onChange: v => set('monitor', v === '' ? null : Number(v), rerender),
      }),
    });
  }
  rows.push({ label: t('computer.screen.keys'), description: t(`computer.screen.keysHint.${info.os}`), control: toggle({ value: s.kioskKeys, label: t('computer.screen.keys'), onChange: v => set('kioskKeys', v, rerender) }) });
  return [{ title: t('computer.screen.title'), rows }, { title: t('computer.screen.limitsTitle'), rows: [{ label: t(`computer.screen.limits.${info.os}`), control: '' }] }];
}

/** Out of the kiosk without being an administrator: one signs in here to let it go. */
async function leaveKiosk(rerender) {
  const answer = await messageBox(null, {
    icon: 'warning', title: t('computer.screen.leaveTitle'), text: t('computer.screen.leaveText'),
    fields: [
      { name: 'username', label: t('computer.screen.adminName'), required: true },
      { name: 'password', type: 'password', label: t('computer.screen.adminPassword'), required: true },
    ],
    buttons: ['cancel', { value: 'ok', label: t('computer.screen.leaveButton'), primary: true }],
    validate: async values => {
      const res = await kernel.request('POST', '/session/verify', { username: values.username, password: values.password }).catch(err => ({ error: err.message }));
      if (res?.error) return res.error;
      if (res?.role !== 'admin') return t('computer.screen.notAdmin');
      return true;
    },
  });
  if (answer?.button === 'ok') set('display', 'window', rerender);
}

const RULES = ['ask', 'declared', 'all'];

function hardwareSections(rerender) {
  const { settings: s, devices: d } = state;
  if (!s) return waiting();
  if (!d && !state.devicesLoading) {
    state.devicesLoading = true;
    load(rerender, ['devices']).finally(() => { state.devicesLoading = false; });
  }
  const sections = [{
    title: t('computer.hardware.title'),
    rows: [{
      label: t('computer.hardware.rule'), description: `${t(`computer.hardware.${s.hardware}Hint`)}${isAdmin() ? '' : ` ${t('computer.hardware.adminOnly')}`}`,
      control: selectField({
        value: s.hardware, label: t('computer.hardware.rule'), disabled: !isAdmin(),
        options: RULES.map(v => ({ value: v, label: t(`computer.hardware.${v}`) })),
        onChange: v => set('hardware', v, rerender),
      }),
    }],
  }];
  if (!d) return [...sections, ...waiting()];
  const named = (list, fallback) => list.map(x => x.name || x.displayName || fallback);
  const ids = x => (x.vendorId != null && x.productId != null ? ` · ${x.vendorId.toString(16).padStart(4, '0')}:${x.productId.toString(16).padStart(4, '0')}` : '');
  const group = (title, items) => ({ label: title, description: items.length ? items.join(' · ') : t('computer.hardware.none'), control: String(items.length) });
  sections.push({
    title: t('computer.hardware.devices'),
    rows: [
      group(t('computer.hardware.cameras'), named(d.cameras, t('computer.hardware.unnamed'))),
      group(t('computer.hardware.microphones'), named(d.microphones, t('computer.hardware.unnamed'))),
      group(t('computer.hardware.serial'), d.serial.map((p, i) => (p.vendorId != null ? `USB${ids(p)}` : t('computer.hardware.portNumber', { n: i + 1 })))),
      group(t('computer.hardware.usb'), d.usb.map(x => `${x.name ?? t('computer.hardware.unnamed')}${ids(x)}`)),
      group(t('computer.hardware.hid'), d.hid.map(x => `${x.name ?? t('computer.hardware.unnamed')}${ids(x)}`)),
      group(t('computer.hardware.gpu'), d.gpu.map(g => `${g.name ?? `${g.vendorId}:${g.deviceId}`}${g.active ? ` (${t('computer.hardware.active')})` : ''}`)),
      { label: t('computer.hardware.webgpu'), control: d.gpuFeatures?.webgpu ?? '—' },
      group(t('computer.hardware.printers'), d.printers.map(p => `${p.displayName}${p.default ? ` (${t('computer.hardware.default')})` : ''}`)),
      group(t('computer.hardware.displays'), d.displays.map(x => `${x.label} ${x.width}×${x.height}`)),
    ],
  });
  sections.push({
    title: t('computer.hardware.drives'),
    rows: d.drives.length ? d.drives.map(drive => ({
      label: drive.name, description: t('computer.hardware.driveSpace', { free: formatBytes(drive.free), size: formatBytes(drive.size) }),
      control: actionButton({ label: t('computer.hardware.eject'), spinner: true, onClick: () => host().devices.eject(drive.id).catch(err => toast(err.message, { level: 'error' })) }),
    })) : [{ label: t('computer.hardware.noDrives'), control: '' }],
  });
  sections.push({ title: '', rows: [{ label: '', control: actionButton({ label: t('computer.hardware.refresh'), spinner: true, onClick: () => load(rerender, ['devices']) }) }] });
  return sections;
}

function serverSections(rerender) {
  const { servers, local } = state;
  if (!servers) return waiting();
  const trusted = host().trusted;
  const rows = servers.map(srv => {
    const status = srv.kind === 'local' ? t(`computer.servers.status.${srv.status ?? 'stopped'}`) : srv.trusted ? t('computer.servers.trusted') : t('computer.servers.untrusted');
    return {
      label: `${srv.name}${srv.current ? ` · ${t('computer.servers.current')}` : ''}`,
      description: `${srv.url ?? ''} · ${status}${srv.version ? ` · lilOS ${srv.version}` : ''}`,
      control: h('span', { class: 'cp-actions' },
        !srv.current && trusted ? actionButton({ label: t('computer.servers.open'), onClick: () => host().servers.open(srv.id) }) : null,
        srv.kind === 'local' && trusted ? actionButton({ label: t('computer.servers.browser'), onClick: () => host().local.openInBrowser() }) : null,
        srv.kind === 'local' && trusted && local?.status === 'running' && !srv.current ? actionButton({ label: t('computer.servers.restart'), spinner: true, onClick: () => host().local.restart() }) : null,
        srv.kind === 'remote' && !srv.current && trusted ? actionButton({ label: t('computer.servers.remove'), confirm: t('computer.servers.removeConfirm'), danger: true, onClick: () => host().servers.remove(srv.id).then(() => load(rerender, ['servers'])) }) : null),
    };
  });
  const sections = [{ title: t('computer.servers.title'), rows }];
  if (trusted) {
    const add = { url: '', trusted: false };
    sections.push({
      title: t('computer.servers.addTitle'),
      rows: [
        { label: t('computer.servers.address'), description: t('computer.servers.addressHint'), control: textField({ value: '', placeholder: 'https://lilos.azienda.it', type: 'url', mono: true, label: t('computer.servers.address'), onInput: v => { add.url = v; }, onChange: v => { add.url = v; } }) },
        { label: t('computer.servers.trust'), description: t('computer.servers.trustHint'), control: toggle({ value: false, label: t('computer.servers.trust'), onChange: v => { add.trusted = v; } }) },
        {
          label: '', control: actionButton({
            label: t('computer.servers.add'), primary: true, spinner: true,
            onClick: () => host().servers.add({ url: add.url, trusted: add.trusted })
              .then(() => load(rerender, ['servers']))
              .catch(err => toast(err.message, { level: 'error' })),
          }),
        },
      ],
    });
  }
  if (state.info?.profile?.thisComputer && sdk.net?.protocols?.some(p => p.id === 'local')) sections.push(folderSection(rerender));
  return sections;
}

/** Folders of this computer in Rete (netfs-local), chosen with the computer's dialog; not the removable drives (lilOS adds those itself). */
function folderSection(rerender) {
  const drives = new Set(Object.values(storage.get('desktop-drives', {}) ?? {}));
  const folders = sdk.net.mounts().filter(m => m.protocol === 'local' && !drives.has(m.id));
  const add = async () => {
    const path = await host().pickFolder();
    if (!path) return;
    try {
      const name = path.split(/[\\/]/).filter(Boolean).pop() || path;
      const mount = await sdk.net.create({ name, protocol: 'local', values: { folder: path, readOnly: false }, auto: true, remember: true });
      await sdk.net.connect(mount.id).catch(() => {});
      toast(t('computer.folders.added', { name }), { level: 'success' });
    } catch (err) {
      toast(t('computer.error', { error: err.message }), { level: 'error' });
    }
    rerender();
  };
  return {
    title: t('computer.folders.title'),
    rows: [
      ...(folders.length ? folders.map(m => ({
        label: m.name, description: `${m.values?.folder ?? ''}${m.values?.readOnly ? ` · ${t('computer.folders.readOnly')}` : ''}`,
        control: actionButton({ label: t('computer.servers.remove'), confirm: t('computer.servers.removeConfirm'), danger: true, onClick: () => sdk.net.remove(m.id).then(rerender, err => toast(err.message, { level: 'error' })) }),
      })) : [{ label: t('computer.folders.none'), control: '' }]),
      { label: t('computer.folders.add'), description: t('computer.folders.addHint'), control: actionButton({ label: t('computer.folders.addButton'), spinner: true, onClick: add }) },
    ],
  };
}
