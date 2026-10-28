import { SettingsWindow, settings, shortcuts, shortcutField, storage, session, fs, fileTypeList, toggle, swatches, selectField, actionButton, SDK_VERSION } from '@lilos/sdk';
import { version } from '../../../package.json';
import { ACCENTS, LASSO_OPTIONS } from '../../systemSettings.js';
import { fileApps, appFor, defaultAppFor, setAppFor, resetAppsFor, knownExtensions } from '../open.js';

let view = null;   // the open SettingsView, to redraw after resets

/** Bound toggle for a boolean setting. */
const settingToggle = key => () => toggle({ value: settings.get(key), onChange: v => settings.set(key, v) });

const GROUP_ORDER = ['Generale', 'Scrivania', 'Elementi', 'Finestre'];

/** One section per type group (Testo, Codice…), one row per extension, with the app that opens it. */
function fileTypeSections() {
  const known = new Set(knownExtensions());
  const listed = new Set();
  const row = ext => {
    listed.add(ext);
    const fallback = defaultAppFor(ext);
    return {
      label: ext ? `.${ext}` : 'Senza estensione',
      description: fallback ? `Predefinita: ${fallback.name}` : 'Nessuna app predefinita',
      keywords: `tipo file estensione apri con ${ext}`,
      control: () => selectField({
        value: appFor(ext)?.id ?? 'ask', label: `App per ${ext ? '.' + ext : 'i file senza estensione'}`,
        options: [{ value: 'ask', label: 'Chiedi ogni volta' }, ...fileApps().map(a => ({ value: a.id, label: a.name }))],
        onChange: v => setAppFor(ext, v),
      }),
    };
  };
  const groups = fileTypeList()
    .map(t => ({ title: t.label, rows: t.exts.filter(e => known.has(e)).map(row) }))
    .filter(g => g.rows.length);
  const others = [...known].filter(e => !listed.has(e)).sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)));
  return [
    {
      title: 'App per tipo di file',
      rows: [{
        label: 'Tutti i tipi di file',
        description: 'Aprendo un file, lilOS usa l’app scelta qui. Con «Chiedi ogni volta» compare la finestra Apri con.',
        control: confirmButton('Ripristina tutti', 'Conferma', () => { resetAppsFor(); view?.render(); }),
      }],
    },
    ...groups,
    ...(others.length ? [{ title: 'Altri', rows: others.map(row) }] : []),
  ];
}

/** Bytes of all file contents (sizes kept in the tree). */
function contentsSize(id = fs.root) {
  return fs.children(id).reduce((sum, n) => sum + (n.type === 'folder' ? contentsSize(n.id) : n.size ?? 0), 0);
}

/** One section per command group, one row per command, each with its shortcut editor. */
function shortcutSections() {
  const groups = new Map();
  for (const cmd of shortcuts.list()) {
    if (!groups.has(cmd.group)) groups.set(cmd.group, []);
    groups.get(cmd.group).push(cmd);
  }
  const rank = g => (GROUP_ORDER.includes(g) ? GROUP_ORDER.indexOf(g) : GROUP_ORDER.length);
  return [
    {
      title: 'Scorciatoie da tastiera',
      rows: [{
        label: 'Tutte le scorciatoie',
        description: 'Le modifiche valgono subito. Per registrare una combinazione premi +, poi i tasti; Esc annulla.',
        control: confirmButton('Ripristina tutte', 'Conferma', () => shortcuts.resetAll()),
      }],
    },
    ...[...groups].sort(([a], [b]) => rank(a) - rank(b)).map(([group, cmds]) => ({
      title: group,
      rows: cmds.map(cmd => ({
        label: cmd.label,
        keywords: `scorciatoia tasti ${cmd.keys.map(k => shortcuts.format(k)).join(' ')}`,
        control: shortcutField(cmd.id),
      })),
    })),
    {
      title: 'Mouse',
      rows: [
        {
          label: 'Selezione a mano libera', description: 'Disegna un percorso chiuso: si selezionano gli elementi che contiene',
          keywords: 'lazo lasso percorso selezione alt',
          control: () => selectField({ value: settings.get('lasso'), options: LASSO_OPTIONS, onChange: v => settings.set('lasso', v) }),
        },
        { label: 'Selezione a rettangolo', control: 'Trascina sullo sfondo' },
        { label: 'Aggiungere alla selezione', control: 'Ctrl o Shift + clic o trascinamento' },
        { label: 'Spostarsi sulla scrivania', control: 'Spazio + trascina, o tasto centrale' },
      ],
    },
    {
      title: 'Tasti fissi',
      rows: [
        { label: 'Muoversi nei menu, nelle liste e nei tab', control: 'Frecce, Invio, Esc' },
        { label: 'Confermare o annullare la rinomina', control: 'Invio, Esc' },
      ],
    },
  ];
}

/** Destructive action in two clicks: the first one asks for confirmation for a few seconds. */
function confirmButton(label, confirmLabel, action) {
  let timer = 0;
  const btn = actionButton({
    label,
    onClick: () => {
      if (!btn.classList.contains('primary')) {
        btn.textContent = confirmLabel;
        btn.classList.add('danger', 'primary');
        timer = setTimeout(reset, 4000);
        return;
      }
      clearTimeout(timer);
      reset();
      action();
    },
  });
  const reset = () => {
    btn.textContent = label;
    btn.classList.remove('danger', 'primary');
  };
  return btn;
}

/** Bytes used by lilOS in localStorage (strings are UTF-16). */
function storageUsage() {
  let bytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('lilos:')) bytes += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
    }
  } catch {
    return null;
  }
  return bytes;
}

function formatBytes(bytes) {
  if (bytes == null) return 'Non disponibile';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toLocaleString(session.locale, { maximumFractionDigits: 1 })} KB`;
}

const BROWSERS = [[/Edg\/(\d+)/, 'Edge'], [/Firefox\/(\d+)/, 'Firefox'], [/Chrome\/(\d+)/, 'Chrome'], [/Version\/(\d+).*Safari/, 'Safari']];

function browserName() {
  for (const [re, name] of BROWSERS) {
    const m = navigator.userAgent.match(re);
    if (m) return `${name} ${m[1]}`;
  }
  return 'Sconosciuto';
}

/** The system Settings app: only settings that actually work. */
export default function createSettings() {
  const win = new SettingsWindow({
    title: 'Impostazioni',
    icon: 'gear',
    width: 760,
    height: 500,
    tabs: [
      { group: 'Sistema' },
      {
        id: 'appearance', label: 'Aspetto', icon: 'palette',
        description: 'Colori e movimento dell’interfaccia.',
        subtabs: [
          {
            id: 'colors', label: 'Colori',
            sections: () => [{
              title: 'Colore principale',
              rows: [{
                label: 'Colore', description: 'Selezione, pulsanti, tab attivi e logo', keywords: 'accento tema',
                control: swatches({ value: settings.get('accent'), colors: ACCENTS, onChange: v => settings.set('accent', v) }),
              }],
            }],
          },
          {
            id: 'motion', label: 'Movimento',
            sections: () => [{
              title: 'Animazioni',
              rows: [{
                label: 'Animazioni', description: 'Spostamenti della vista, menu e transizioni. Se il sistema operativo chiede movimento ridotto, restano ridotte.',
                keywords: 'movimento transizioni', control: settingToggle('motion'),
              }],
            }],
          },
        ],
      },
      {
        id: 'desk', label: 'Scrivania', icon: 'grid',
        description: 'Comportamento della scrivania infinita.',
        subtabs: [
          {
            id: 'items', label: 'Elementi',
            sections: () => [{
              title: 'Posizionamento',
              rows: [{
                label: 'Allinea alla griglia', description: 'Gli elementi trascinati si allineano a una griglia invisibile',
                keywords: 'icone snap', control: settingToggle('snap'),
              }],
            }],
          },
          {
            id: 'overview', label: 'Panoramica',
            sections: () => [{
              title: 'Pannello in basso a destra',
              rows: [{ label: 'Mostra la minimappa', keywords: 'mappa miniatura', control: settingToggle('minimap') }],
            }],
          },
        ],
      },
      {
        id: 'usability', label: 'Usabilità', icon: 'accessibility',
        description: 'Tastiera, mouse e app che aprono i file.',
        subtabs: [
          { id: 'shortcuts', label: 'Scorciatoie', sections: shortcutSections },
          { id: 'filetypes', label: 'Tipi di file', sections: fileTypeSections },
        ],
      },
      { group: 'Dati' },
      {
        id: 'storage', label: 'Archiviazione', icon: 'disk',
        description: 'Dati di lilOS salvati in questo browser.',
        sections: () => [
          {
            title: 'Spazio',
            rows: [
              { label: 'Spazio usato', description: 'Cartelle, posizioni, vista e impostazioni', control: formatBytes(storageUsage()) },
              { label: 'Contenuto dei file', description: 'Testo salvato nei file', control: formatBytes(contentsSize()) },
            ],
          },
          {
            title: 'Ripristino',
            rows: [
              {
                label: 'Impostazioni predefinite', description: 'Riporta impostazioni, scorciatoie e app dei tipi di file ai valori iniziali',
                control: confirmButton('Ripristina', 'Conferma', () => {
                  ['accent', 'motion', 'snap', 'minimap', 'lasso'].forEach(k => settings.reset(k));
                  shortcuts.resetAll();
                  resetAppsFor();
                }),
              },
              {
                label: 'Scrivania e file iniziali', description: 'Elimina tutte le cartelle e i file creati, le posizioni e la vista salvate, poi ricarica lilOS',
                keywords: 'reset desktop', control: confirmButton('Ripristina…', 'Elimina e ricarica', () => {
                  ['fs', 'desktop-layout', 'desktop', 'camera'].forEach(k => storage.remove(k));
                  location.reload();
                }),
              },
            ],
          },
        ],
      },
      { group: '' },
      {
        id: 'about', label: 'Informazioni', icon: 'info',
        description: 'Versione e ambiente.',
        sections: () => [{
          title: 'lilOS',
          rows: [
            { label: 'Versione', control: version },
            { label: 'Versione dell’SDK', control: SDK_VERSION },
            { label: 'Lingua', control: session.locale },
            { label: 'Browser', control: browserName() },
          ],
        }],
      },
    ],
  });
  view = win.view;
  win.on('destroy', () => { if (view === win.view) view = null; });
  return win;
}
