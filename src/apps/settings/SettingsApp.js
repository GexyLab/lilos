import { SettingsWindow, settings, shortcuts, shortcutField, storage, session, fs, tags, TAG_COLORS, menus, fileTypeList, toggle, swatches, segmented, selectField, textField, actionButton, toast, h, SDK_VERSION } from '@lilos/sdk';
import { setTag } from '../../tags/tagUi.js';
import { version } from '../../../package.json';
import { ACCENTS, LASSO_OPTIONS, RETENTION_OPTIONS } from '../../systemSettings.js';
import { apps, launch } from '../registry.js';
import { fileApps, appFor, defaultAppFor, setAppFor, resetAppsFor, knownExtensions } from '../open.js';
import { workspaceManager } from '../../workspaces/info.js';
import { LIMITS as WORKSPACE_LIMITS } from '../../workspaces/store.js';
import { menuSections } from './menuEditor.js';
import './settings-app.css';

let view = null;   // the open SettingsView, to redraw after resets

const count = (n, one, many) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

/** The current workspace: name, color, what it made, the apps installed in it. */
function currentWorkspaceSections() {
  const ws = workspaceManager();
  const cur = ws?.current;
  if (!cur) return [];
  return [
    {
      title: 'Workspace',
      rows: [
        {
          label: 'Nome', keywords: 'rinomina workspace',
          control: () => {
            const field = textField({ value: cur.name, label: 'Nome del workspace', onChange: v => ws.rename(cur.id, v) });
            field.maxLength = WORKSPACE_LIMITS.MAX_NAME;
            return field;
          },
        },
        {
          label: 'Colore', description: 'Il pallino nella barra in basso e accanto ai suoi file nell’app File', keywords: 'colore workspace',
          control: () => swatches({ value: cur.color, colors: ACCENTS, onChange: v => ws.setColor(cur.id, v) }),
        },
        {
          label: 'File, cartelle e collegamenti', description: 'Creati in questo workspace, sulla scrivania e nelle cartelle condivise',
          control: String(ws.ownedCount(cur.id)),
        },
      ],
    },
    {
      title: 'App installate',
      rows: apps.map(app => ({
        label: app.name,
        description: app.system ? 'App di sistema: c’è in ogni workspace' : app.load ? '' : 'Non ancora disponibile',
        keywords: `app installa disinstalla rimuovi ${app.name}`,
        control: app.system ? 'Sempre installata' : () => toggle({
          value: ws.isInstalled(app.id), label: `${app.name} installata in questo workspace`,
          onChange: v => ws.setInstalled(app.id, v),
        }),
      })),
    },
  ];
}

/** Every workspace: change to it, delete it; make a new one. */
function allWorkspacesSections() {
  const ws = workspaceManager();
  if (!ws) return [];
  const list = ws.list();
  return [
    {
      title: 'Workspace',
      rows: [
        ...list.map(w => {
          const current = w.id === ws.currentId;
          const installed = apps.filter(a => ws.isInstalled(a.id, w.id)).length;
          return {
            label: current ? `${w.name} (attuale)` : w.name,
            description: `${count(ws.ownedCount(w.id), 'elemento creato', 'elementi creati')} · ${count(installed, 'app', 'app')}`,
            keywords: 'workspace passa elimina',
            control: () => h('div', { class: 'ws-settings-actions' },
              current ? null : actionButton({ label: 'Passa a questo', onClick: () => ws.switchTo(w.id) }),
              list.length > 1 ? confirmButton('Elimina…', 'Elimina', () => ws.remove(w.id)) : null),
          };
        }),
        {
          label: 'Nuovo workspace', description: 'Con la scrivania vuota e tutte le app installate',
          control: actionButton({ label: 'Crea', onClick: () => { const id = ws.create(); if (id) ws.switchTo(id); } }),
        },
      ],
    },
    {
      title: 'Eliminare un workspace',
      rows: [
        { label: 'I file restano', description: 'La sua scrivania diventa la cartella Documenti/Scrivania di <nome> (se non è vuota); i file creati altrove restano dove sono, segnati come suoi.' },
        { label: 'Le finestre restano', description: 'Le sue finestre aperte passano nel workspace attuale, con le modifiche non salvate. Workarea, vista e app installate si perdono.' },
      ],
    },
  ];
}

/** Bound toggle for a boolean setting. */
let pendingTagFor = [];   // items to put the next tag made here on (from Tag → Nuovo tag…)

/** Creating tags, and one section per tag: name, color, visible, its items, delete. */
function tagSections() {
  const create = field => {
    try {
      const tag = tags.create({ name: field.value });
      if (pendingTagFor.length) setTag(pendingTagFor, tag.id, true);
      pendingTagFor = [];
    } catch (err) {
      toast(err.message);
      field.focus();
    }
  };
  const pending = pendingTagFor.filter(id => fs.exists(id)).length;
  return [
    {
      title: 'Nuovo tag',
      rows: [{
        label: 'Nome',
        description: pending
          ? `Il nuovo tag andrà su ${count(pending, 'elemento selezionato', 'elementi selezionati')}`
          : 'Poi si assegna dal menu del tasto destro → Tag, sulla scrivania e nell’app File',
        keywords: 'nuovo tag crea etichetta',
        control: () => {
          const field = textField({ placeholder: 'Per esempio: Urgente', label: 'Nome del nuovo tag' });
          field.maxLength = 30;
          field.classList.add('tag-new-name');
          field.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); create(field); } });
          return h('div', { class: 'tag-settings-actions' }, field, actionButton({ label: 'Crea', primary: true, onClick: () => create(field) }));
        },
      }],
    },
    ...tags.list().map(t => ({
      title: t.name,
      rows: [
        {
          label: 'Nome', keywords: 'rinomina tag',
          control: () => {
            const field = textField({
              value: t.name, label: `Nome del tag ${t.name}`,
              onChange: v => { try { tags.rename(t.id, v); } catch (err) { toast(err.message); field.value = tags.get(t.id)?.name ?? ''; } },
            });
            field.maxLength = 30;
            return field;
          },
        },
        { label: 'Colore', keywords: 'colore tag', control: () => swatches({ value: t.color, colors: TAG_COLORS, onChange: v => tags.setColor(t.id, v) }) },
        {
          label: 'Visibile',
          description: t.visible ? 'Gli elementi con questo tag si vedono ovunque' : 'Gli elementi con questo tag sono nascosti ovunque: si ritrovano in File → Tag',
          keywords: 'nascondi mostra invisibile tag',
          control: () => toggle({ value: t.visible, label: `Tag ${t.name} visibile`, onChange: v => tags.setVisible(t.id, v) }),
        },
        {
          label: 'Elementi', description: `${count(fs.tagged(t.id).length, 'elemento', 'elementi')} in questo workspace e nelle cartelle condivise`,
          control: () => h('div', { class: 'tag-settings-actions' },
            actionButton({ label: 'Mostra in File', onClick: () => launch('files', { tag: t.id }) }),
            confirmButton('Elimina…', 'Elimina il tag', () => tags.remove(t.id))),
        },
      ],
    })),
  ];
}

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

/** Deleting files and folders, and how long the trash keeps them. */
function trashSections() {
  const items = fs.trashed();
  const bytes = items.reduce((sum, n) => sum + n.bytes, 0);
  return [
    {
      title: 'Eliminazione',
      rows: [
        {
          label: 'Chiedi conferma', description: 'Prima di eliminare file e cartelle, un piccolo menu chiede di confermare',
          keywords: 'conferma elimina cancella domanda', control: settingToggle('deleteConfirm'),
        },
        {
          label: 'Elimina definitivamente', description: 'Gli elementi eliminati non passano dal cestino: si recuperano solo con Ctrl Z, finché la pagina resta aperta',
          keywords: 'cestino definitivo subito cancella salta', control: settingToggle('deletePermanent'),
        },
      ],
    },
    {
      title: 'Cestino',
      rows: [
        {
          label: 'Conserva gli elementi per', description: 'Passato questo tempo, quello che è nel cestino viene eliminato definitivamente',
          keywords: 'retention durata giorni pulizia automatica svuota',
          control: () => {
            // A stored period that is not in the list (set by hand) is shown as it is, not as the first option
            const days = settings.get('trashRetention');
            const listed = RETENTION_OPTIONS.some(o => o.value === days);
            const options = listed ? RETENTION_OPTIONS : [...RETENTION_OPTIONS, { value: days, label: days > 0 ? `${days} giorni` : 'Per sempre' }];
            return selectField({
              value: days, label: 'Conserva gli elementi nel cestino per', options,
              onChange: v => settings.set('trashRetention', Number(v)),
            });
          },
        },
        {
          label: 'Contenuto', description: items.length ? `${count(items.length, 'elemento', 'elementi')} · ${formatBytes(bytes)}` : 'Il cestino è vuoto',
          keywords: 'apri cestino ripristina', control: actionButton({ label: 'Apri il cestino', onClick: () => launch('files', { trash: true }) }),
        },
        {
          label: 'Svuota il cestino', description: 'Elimina definitivamente tutto quello che contiene', keywords: 'svuota cestino',
          control: items.length ? confirmButton('Svuota…', 'Svuota', () => fs.purgeTrash()) : 'Vuoto',
        },
      ],
    },
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
export default function createSettings({ openWindow, args } = {}) {
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
              title: 'Tema',
              rows: [{
                label: 'Tema', description: 'Chiaro o scuro: scrivania, barra, menu e finestre', keywords: 'tema chiaro scuro dark light notte',
                control: segmented({
                  value: settings.get('theme'), label: 'Tema',
                  options: [{ value: 'light', label: 'Chiaro' }, { value: 'dark', label: 'Scuro' }],
                  onChange: v => settings.set('theme', v),
                }),
              }],
            }, {
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
        id: 'workspaces', label: 'Workspace', icon: 'workspace',
        description: 'Scrivanie separate, ognuna con i suoi elementi, finestre e app. I file fuori dalla scrivania sono di tutti.',
        subtabs: [
          { id: 'current', label: 'Questo workspace', sections: currentWorkspaceSections },
          { id: 'all', label: 'Tutti', sections: allWorkspacesSections },
        ],
      },
      {
        id: 'tags', label: 'Tag', icon: 'tag',
        description: 'Etichette colorate per ritrovare file e cartelle ovunque siano. Un tag invisibile nasconde i suoi elementi.',
        sections: tagSections,
      },
      {
        id: 'usability', label: 'Usabilità', icon: 'accessibility',
        description: 'Tastiera, mouse, app che aprono i file, menu contestuali e cestino.',
        subtabs: [
          { id: 'shortcuts', label: 'Scorciatoie', sections: shortcutSections },
          { id: 'filetypes', label: 'Tipi di file', sections: fileTypeSections },
          { id: 'contextmenu', label: 'Menu contestuale', sections: () => menuSections('desktop.background', { openWindow, confirmButton, rerender: () => view?.render() }) },
          { id: 'trash', label: 'Cestino', sections: trashSections },
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
                label: 'Impostazioni predefinite', description: 'Riporta impostazioni, scorciatoie, app dei tipi di file e menu ai valori iniziali',
                control: confirmButton('Ripristina', 'Conferma', () => {
                  ['accent', 'theme', 'motion', 'snap', 'minimap', 'lasso', 'deleteConfirm', 'deletePermanent', 'trashRetention'].forEach(k => settings.reset(k));
                  shortcuts.resetAll();
                  resetAppsFor();
                  menus.list().forEach(m => menus.reset(m.id));
                }),
              },
              {
                label: 'Scrivania e file iniziali', description: 'Elimina tutte le cartelle e i file creati, i workspace, i tag, le posizioni e la vista salvate, poi ricarica lilOS',
                keywords: 'reset desktop workspace tag', control: confirmButton('Ripristina…', 'Elimina e ricarica', () => {
                  // The keys of each workspace (ws:<id>:…) are dropped at start-up, once their workspace is gone
                  ['fs', 'workspaces', 'tags', 'desktop-layout', 'desktop', 'camera', 'workareas', 'editor-tree', 'files-sidebar'].forEach(k => storage.remove(k));
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
  // Opened on a tab (args.tab, e.g. 'workspaces' from the taskbar), also when launched again.
  // args.tagFor: items the next tag made here goes on (Tag → Nuovo tag… in a menu)
  const show = a => {
    if (Array.isArray(a?.tagFor)) pendingTagFor = a.tagFor.filter(id => typeof id === 'string' && fs.exists(id));
    if (typeof a?.tab === 'string') win.view.select(a.tab);
    if (a?.tab === 'tags') win.view.panel.querySelector('.tag-new-name')?.focus();
  };
  show(args);
  win.on('launch', show);
  const offWorkspaces = workspaceManager()?.on('change', () => win.view.render());
  const offTrash = fs.on('trash', () => win.view.render());
  const offTags = tags.on('change', () => win.view.render());
  win.on('destroy', () => { offWorkspaces?.(); offTrash(); offTags(); if (view === win.view) view = null; });
  return win;
}
