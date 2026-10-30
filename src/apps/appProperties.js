import { SettingsWindow, apps as installed, session, selectField, toast } from '@lilos/sdk';
import { getApp, registry } from './registry.js';
import { entrypointsOf } from './entrypoints.js';
import { executionMode, canChangeExecution } from './packages/isolation.js';
import { describePermission } from './packages/permissions.js';

/**
 * "Proprietà…" of an app: Generale (version, publisher, where it comes from, its entry points),
 * Permessi (what it may do) and Sicurezza (how it runs: isolated or not; only an administrator
 * changes it, for this app only — the rule for every app is in Impostazioni → App → Sicurezza).
 * One window per app (key `app-props:<id>`).
 */
let wm = null;

/** Set by the system at start-up. */
export function connectAppProperties(windowManager) {
  wm = windowManager;
}

const dateLabel = t => (t ? new Date(t).toLocaleDateString(session.locale, { day: '2-digit', month: 'long', year: 'numeric' }) : '—');

const MODE_LABELS = {
  isolated: 'Isolata',
  open: 'Non isolata',
  system: 'Dentro lilOS (app di sistema)',
  remote: 'Isolata, nel suo sito (app remota)',
};

function sourceLabel(source) {
  if (!source) return '—';
  if (source.type === 'github') return `GitHub: ${source.repo}${source.path ? ` (${source.path})` : ''}`;
  if (source.type === 'git') return `${source.url}${source.path ? ` (${source.path})` : ''}`;
  return source.dir ? `Cartella ${source.dir}` : 'Cartella del computer del kernel';
}

function generalSections(app) {
  const pkg = app.package;
  if (!pkg) return [{ rows: [{ label: 'App', control: app.name }] }];
  const { manifest } = pkg;
  const entries = Object.entries(entrypointsOf(app));
  return [
    {
      title: 'App',
      rows: [
        { label: 'Nome', control: manifest.name },
        manifest.description && { label: 'Descrizione', control: manifest.description },
        { label: 'Versione', control: pkg.version },
        { label: 'Editore', description: pkg.signed ? 'Firma verificata' : 'Non verificata: nessuna firma riconosciuta', control: pkg.publisher?.name ?? manifest.publisher?.name ?? '—' },
        { label: 'Provenienza', control: sourceLabel(pkg.source) },
        { label: 'Installata', control: dateLabel(pkg.installed) },
        { label: 'Aggiornata', control: dateLabel(pkg.updated) },
      ].filter(Boolean),
    },
    {
      title: 'Punti d’ingresso',
      rows: entries.map(([name, ep]) => ({
        label: name === 'main' ? 'Finestra principale' : ep.label ?? name,
        description: name === 'main' ? 'Si apre quando apri l’app' : 'Lo avviano il sistema e le altre app',
        control: ep.kind === 'window' ? 'Finestra' : 'In background',
      })),
    },
  ];
}

function permissionSections(app) {
  const list = app.package?.manifest.permissions ?? [];
  return [{
    title: 'Permessi',
    rows: list.length
      ? list.map(p => ({ label: describePermission(p), description: p }))
      : [{ label: 'Nessun permesso', description: 'L’app usa solo i propri dati e i file che apri con lei' }],
  }];
}

function securitySections(app, rerender) {
  const pkg = app.package;
  const mode = executionMode(pkg);
  const explain = {
    title: 'Le due modalità',
    rows: [
      { label: 'Isolata', description: 'L’app gira in una sandbox: vede solo quello che i suoi permessi le concedono. Più sicura.' },
      { label: 'Non isolata', description: 'L’app gira nella pagina di lilOS e in un Web Worker: è più veloce, ma può fare tutto quello che puoi fare tu, anche fuori dai suoi permessi. Solo per app di cui ti fidi.' },
    ],
  };
  if (mode.fixed) {
    return [{ title: 'Esecuzione', rows: [{ label: 'Modalità', description: mode.reason, control: MODE_LABELS[mode.mode] }] }];
  }
  const general = installed.security().isolated ? 'isolata' : 'non isolata';
  const admin = canChangeExecution();
  const value = mode.own === null ? 'default' : mode.own ? 'isolated' : 'open';
  const control = admin
    ? selectField({
      value, label: 'Modalità di esecuzione',
      options: [
        { value: 'default', label: `Come le altre app (${general})` },
        { value: 'isolated', label: 'Isolata' },
        { value: 'open', label: 'Non isolata' },
      ],
      onChange: async v => {
        try {
          await installed.setAppSecurity(app.id, v === 'default' ? null : v === 'isolated');
          toast(`${app.name}: vale dalla prossima apertura`);
        } catch (err) {
          toast(`Non cambiata: ${err.message}`);
        }
        rerender();
      },
    })
    : MODE_LABELS[mode.mode];
  return [
    {
      title: 'Esecuzione',
      rows: [{
        label: 'Modalità',
        description: admin
          ? `Ora: ${MODE_LABELS[mode.mode].toLowerCase()}. Vale dalla prossima apertura dell’app.`
          : 'Solo un amministratore la cambia.',
        keywords: 'isolamento sandbox iframe worker sicurezza',
        control,
      }],
    },
    explain,
  ];
}

export function showAppProperties(appId) {
  const app = getApp(appId);
  if (!app || !wm) {
    toast('L’app non è installata');
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
      { id: 'general', label: 'Generale', icon: 'info', description: 'Che app è e da dove viene.', sections: () => generalSections(current()) },
      { id: 'permissions', label: 'Permessi', icon: 'check', description: 'Cosa l’app può fare, concesso quando è stata installata.', sections: () => permissionSections(current()) },
      { id: 'security', label: 'Sicurezza', icon: 'shield', description: 'Come gira l’app.', sections: () => securitySections(current(), rerender) },
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
