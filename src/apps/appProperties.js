import { SettingsWindow, apps as installed, session, selectField, locale } from '@lilos/sdk';
import { getApp, registry } from './registry.js';
import { entrypointsOf } from './entrypoints.js';
import { executionMode, canChangeExecution } from './packages/isolation.js';
import { describePermission } from './packages/permissions.js';
import { notify } from '../notifications/notify.js';

/**
 * "Proprietà…" of an app: Generale (version, publisher, where it comes from, its entry points),
 * Permessi (what it may do) and Sicurezza (how it runs: isolated or not; only an administrator
 * changes it, for this app only — the rule for every app is in Control Panel → App → Sicurezza).
 * One window per app (key `app-props:<id>`).
 */
let wm = null;

/** Set by the system at start-up. */
export function connectAppProperties(windowManager) {
  wm = windowManager;
}

const { t } = locale.define('lilos:apps.appProperties', {
  en: { strings: {
    'mode.isolated': 'Isolated', 'mode.open': 'Not isolated', 'mode.system': 'Inside lilOS (system app)', 'mode.remote': 'Isolated, on its own site (remote app)',
    folder: 'Folder {dir}', kernelFolder: 'A folder on the kernel’s computer',
    app: 'App', name: 'Name', description: 'Description', version: 'Version', publisher: 'Publisher',
    signed: 'Signature verified', official: 'Verified: from the official repository', unsigned: 'Not verified: no known signature',
    source: 'Source', installed: 'Installed', updated: 'Updated',
    entrypoints: 'Entry points', mainWindow: 'Main window', mainHint: 'Opens when you open the app', otherHint: 'Started by the system and by other apps',
    window: 'Window', background: 'In the background',
    permissions: 'Permissions', noPermissions: 'No permissions', noPermissionsHint: 'The app uses only its own data and the files you open with it',
    modes: 'The two modes',
    isolatedHint: 'The app runs in a sandbox: it sees only what its permissions allow. Safer.',
    openHint: 'The app runs in lilOS’s page and in a Web Worker: it is faster, but it can do everything you can do, even beyond its permissions. Only for apps you trust.',
    execution: 'Execution', mode: 'Mode', generalIsolated: 'isolated', generalOpen: 'not isolated',
    executionMode: 'Execution mode', asOthers: 'Like the other apps ({mode})',
    nextOpen: '{app}: it applies from the next time it opens', notChanged: 'Not changed: {message}',
    now: 'Now: {mode}. It applies from the next time the app opens.', adminOnly: 'Only an administrator can change it.',
    keywords: 'isolation sandbox iframe worker security',
    notInstalled: 'The app is not installed',
    general: 'General', generalHint: 'What app it is and where it comes from.',
    permissionsHint: 'What the app may do, granted when it was installed.',
    security: 'Security', securityHint: 'How the app runs.',
  } },
});

const dateLabel = time => (time ? new Date(time).toLocaleDateString(session.locale, { day: '2-digit', month: 'long', year: 'numeric' }) : '—');

const modeLabel = mode => t(`mode.${mode}`);

function sourceLabel(source) {
  if (!source) return '—';
  if (source.type === 'github') return `GitHub: ${source.repo}${source.path ? ` (${source.path})` : ''}`;
  if (source.type === 'git') return `${source.url}${source.path ? ` (${source.path})` : ''}`;
  return source.dir ? t('folder', { dir: source.dir }) : t('kernelFolder');
}

function generalSections(app) {
  const pkg = app.package;
  if (!pkg) return [{ rows: [{ label: t('app'), control: app.name }] }];
  const manifest = app.text ?? pkg.manifest;   // in the system's language
  const entries = Object.entries(entrypointsOf(app));
  return [
    {
      title: t('app'),
      rows: [
        { label: t('name'), control: manifest.name },
        manifest.description && { label: t('description'), control: manifest.description },
        { label: t('version'), control: pkg.version },
        { label: t('publisher'), description: pkg.signed ? (pkg.manifest?.signature ? t('signed') : t('official')) : t('unsigned'), control: pkg.publisher?.name ?? manifest.publisher?.name ?? '—' },
        { label: t('source'), control: sourceLabel(pkg.source) },
        { label: t('installed'), control: dateLabel(pkg.installed) },
        { label: t('updated'), control: dateLabel(pkg.updated) },
      ].filter(Boolean),
    },
    {
      title: t('entrypoints'),
      rows: entries.map(([name, ep]) => ({
        label: name === 'main' ? t('mainWindow') : ep.label ?? name,
        description: name === 'main' ? t('mainHint') : t('otherHint'),
        control: ep.kind === 'window' ? t('window') : t('background'),
      })),
    },
  ];
}

function permissionSections(app) {
  const list = app.package?.manifest.permissions ?? [];
  return [{
    title: t('permissions'),
    rows: list.length
      ? list.map(p => ({ label: describePermission(p), description: p }))
      : [{ label: t('noPermissions'), description: t('noPermissionsHint') }],
  }];
}

function securitySections(app, rerender) {
  const pkg = app.package;
  const mode = executionMode(pkg);
  const explain = {
    title: t('modes'),
    rows: [
      { label: modeLabel('isolated'), description: t('isolatedHint') },
      { label: modeLabel('open'), description: t('openHint') },
    ],
  };
  if (mode.fixed) {
    return [{ title: t('execution'), rows: [{ label: t('mode'), description: mode.reason, control: modeLabel(mode.mode) }] }];
  }
  const general = installed.security().isolated ? t('generalIsolated') : t('generalOpen');
  const admin = canChangeExecution();
  const value = mode.own === null ? 'default' : mode.own ? 'isolated' : 'open';
  const control = admin
    ? selectField({
      value, label: t('executionMode'),
      options: [
        { value: 'default', label: t('asOthers', { mode: general }) },
        { value: 'isolated', label: modeLabel('isolated') },
        { value: 'open', label: modeLabel('open') },
      ],
      onChange: async v => {
        try {
          await installed.setAppSecurity(app.id, v === 'default' ? null : v === 'isolated');
          notify(t('nextOpen', { app: app.name }), { level: 'success' });
        } catch (err) {
          notify(t('notChanged', { message: err.message }), { level: 'error' });
        }
        rerender();
      },
    })
    : modeLabel(mode.mode);
  return [
    {
      title: t('execution'),
      rows: [{
        label: t('mode'),
        description: admin
          ? t('now', { mode: modeLabel(mode.mode).toLocaleLowerCase(locale.code) })
          : t('adminOnly'),
        keywords: t('keywords'),
        control,
      }],
    },
    explain,
  ];
}

export function showAppProperties(appId) {
  const app = getApp(appId);
  if (!app || !wm) {
    notify(t('notInstalled'), { level: 'error' });
    return null;
  }
  const key = `app-props:${appId}`;
  const open = wm.get(key);
  if (open) {
    wm.show(open);
    return open;
  }

  let win = null;
  const current = () => getApp(appId) ?? app;
  const rerender = () => win?.view.render();
  win = new SettingsWindow({
    title: app.name, icon: app.glyph, width: 640, height: 460, minWidth: 480, minHeight: 320, search: false,
    controls: { minimize: false },
    tabs: [
      { id: 'general', label: t('general'), icon: 'info', description: t('generalHint'), sections: () => generalSections(current()) },
      { id: 'permissions', label: t('permissions'), icon: 'check', description: t('permissionsHint'), sections: () => permissionSections(current()) },
      { id: 'security', label: t('security'), icon: 'shield', description: t('securityHint'), sections: () => securitySections(current(), rerender) },
    ],
  });
  win.el.classList.add('app-props-window');
  const offs = [
    registry.on('change', ({ id, app: next }) => {
      if (id !== appId) return;
      if (!next) wm.close(win);
      else rerender();
    }),
    installed.on('security', rerender),
  ];
  win.on('destroy', () => offs.forEach(off => off?.()));
  return wm.open(win, { key });
}

/** Opens the Sicurezza tab of an app's properties. */
export function showAppSecurity(appId) {
  const win = showAppProperties(appId);
  win?.view?.select('security');
  return win;
}
