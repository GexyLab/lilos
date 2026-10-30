import { menus, fs } from '@lilos/sdk';
import { launch } from '../apps/registry.js';

export const BACKGROUND_MENU = 'desktop.background';
const MAX_CONTENT = 20_000;

const HTML_PAGE = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>Pagina</title>
</head>
<body>

</body>
</html>
`;

/** The default layout of the desk's background menu. */
const DEFAULTS = [
  {
    type: 'submenu', label: 'Nuovo', icon: 'plus', items: [
      { type: 'action', action: 'desktop.create', label: 'Cartella', icon: 'folderPlus', params: { kind: 'folder', name: 'Nuova cartella' } },
      { type: 'action', action: 'workarea.create', label: 'Workarea', icon: 'workarea' },
      { type: 'separator' },
      { type: 'action', action: 'desktop.create', label: 'Documento di testo', icon: 'filePlus', params: { kind: 'file', name: 'Nuovo documento.txt' } },
      { type: 'action', action: 'desktop.create', label: 'Documento Markdown', icon: 'filePlus', params: { kind: 'file', name: 'Nuovo documento.md' } },
      { type: 'action', action: 'desktop.create', label: 'Pagina HTML', icon: 'filePlus', params: { kind: 'file', name: 'pagina.html', content: HTML_PAGE } },
    ],
  },
  { type: 'separator' },
  { type: 'action', action: 'desktop.openInFiles' },
  { type: 'action', action: 'desktop.arrange' },
  { type: 'separator' },
  { type: 'action', action: 'desk.fit' },
  { type: 'action', action: 'desk.zoomReset' },
];

/** Parameters of "create" entries (saved, so untrusted): kind, a valid name, optional content or template file. */
function createParams(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const kind = raw.kind === 'folder' ? 'folder' : raw.kind === 'file' ? 'file' : null;
  const name = typeof raw.name === 'string' ? raw.name.replace(/\s+/g, ' ').trim().replaceAll('/', '-').slice(0, 120) : '';
  if (!kind || !name) return null;
  const params = { kind, name };
  if (kind === 'file' && typeof raw.content === 'string') params.content = raw.content.slice(0, MAX_CONTENT);
  if (kind === 'file' && typeof raw.template === 'string' && /^[\w-]{1,80}$/.test(raw.template)) params.template = raw.template;
  return params;
}

/**
 * Actions of the desk's background menu and its default layout; the layout itself is edited in
 * Settings → Usabilità → Menu contestuale. ctx: { at, workarea } (the world point clicked, and the
 * workarea there if any: the actions on items and on the view act only on it).
 */
export function registerDesktopMenu(desktop) {
  const scope = [BACKGROUND_MENU];
  menus.defineAction('desktop.create', {
    label: 'Crea un elemento', icon: 'filePlus', menus: scope, params: createParams,
    run: (ctx, p) => desktop.create(p.kind, ctx.at, { name: p.name, content: p.content, template: p.template }),
  });
  menus.defineAction('desktop.openInFiles', { label: 'Apri la Scrivania nel File Manager', icon: 'folder', menus: scope, run: () => launch('files', { folder: desktop.folder }) });
  menus.defineAction('desktop.arrange', { label: 'Riordina icone', icon: 'grid', menus: scope, run: () => desktop.arrange() });
  menus.defineAction('desktop.selectAll', { label: 'Seleziona tutto', icon: 'check', menus: scope, shortcut: 'items.selectAll', run: () => desktop.select(desktop.scopeItems()) });
  menus.defineAction('workarea.create', {
    label: 'Nuova workarea', icon: 'workarea', menus: scope,
    // Areas do not overlap: not inside another one
    enabled: ctx => !!desktop.workareas && !ctx.workarea,
    run: ctx => desktop.workareas.createAt(ctx.at),
  });
  menus.defineAction('desk.fit', { label: 'Mostra tutto', icon: 'fit', menus: scope, shortcut: 'desk.fit', run: () => desktop.canvas.fit() });
  menus.defineAction('desk.zoomReset', { label: 'Zoom al 100%', icon: 'zoom', menus: scope, shortcut: 'desk.zoomReset', run: () => desktop.canvas.resetZoom() });
  menus.register(BACKGROUND_MENU, { label: 'Sfondo della scrivania', defaults: DEFAULTS });
}

/** Text a new file starts with: its template file's content, or the entry's own content. */
export async function initialContent({ content, template }) {
  if (template && fs.exists(template) && fs.get(template).type === 'file') return fs.read(template);
  return content ?? '';
}
