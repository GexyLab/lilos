import { menus, fs, locale } from '@lilos/sdk';
import { launch } from '../apps/registry.js';
import { fileWidget } from './widgets.js';

export const BACKGROUND_MENU = 'desktop.background';
const MAX_CONTENT = 20_000;

const { t } = locale.define('lilos:deskMenu', {
  en: { strings: {
    'new': 'New', folder: 'Folder', newFolder: 'New folder', workarea: 'Work area',
    textDocument: 'Text document', newText: 'New document.txt',
    markdownDocument: 'Markdown document', newMarkdown: 'New document.md',
    htmlPage: 'HTML page', newHtml: 'page.html', htmlTitle: 'Page',
    create: 'Create an item', link: 'Link…', openInFiles: 'Open the Desktop in the File Manager',
    arrange: 'Arrange icons', selectAll: 'Select all', newWorkarea: 'New work area',
    fit: 'Show all', zoomReset: 'Zoom to 100%', menu: 'Desktop background',
    stickyNote: 'Sticky note', newWidget: 'New widget',
  } },
});

/** The content of a new HTML page, in the system's language. */
const htmlPage = () => `<!doctype html>
<html lang="${locale.language}">
<head>
  <meta charset="utf-8">
  <title>${t('htmlTitle')}</title>
</head>
<body>

</body>
</html>
`;

/** The default layout of the desk's background menu (in the system's language: made when registered). */
const defaults = () => [
  {
    type: 'submenu', label: t('new'), icon: 'plus', items: [
      { type: 'action', action: 'desktop.create', label: t('folder'), icon: 'folderPlus', params: { kind: 'folder', name: t('newFolder') } },
      { type: 'action', action: 'workarea.create', label: t('workarea'), icon: 'workarea' },
      { type: 'separator' },
      { type: 'action', action: 'desktop.create', label: t('textDocument'), icon: 'filePlus', params: { kind: 'file', name: t('newText') } },
      { type: 'action', action: 'desktop.create', label: t('markdownDocument'), icon: 'filePlus', params: { kind: 'file', name: t('newMarkdown') } },
      { type: 'action', action: 'desktop.create', label: t('htmlPage'), icon: 'filePlus', params: { kind: 'file', name: t('newHtml'), content: htmlPage() } },
      { type: 'separator' },
      { type: 'action', action: 'desktop.newWidget', label: t('stickyNote'), icon: 'note', params: { app: 'stickynotes', widget: 'note' } },
      { type: 'separator' },
      { type: 'action', action: 'desktop.newLink' },
    ],
  },
  { type: 'separator' },
  { type: 'action', action: 'desktop.openInFiles' },
  { type: 'action', action: 'desktop.arrange' },
  { type: 'separator' },
  { type: 'action', action: 'desk.fit' },
  { type: 'action', action: 'desk.zoomReset' },
];

/** Parameters of "new widget" entries (saved, so untrusted): an app id and one of its widgets. */
function widgetParams(raw) {
  const app = typeof raw?.app === 'string' && /^[a-z0-9][a-z0-9.-]{1,63}$/.test(raw.app) ? raw.app : null;
  const widget = typeof raw?.widget === 'string' && /^[a-zA-Z][\w.-]{0,63}$/.test(raw.widget) ? raw.widget : null;
  return app && widget ? { app, widget } : null;
}

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
    label: t('create'), icon: 'filePlus', menus: scope, params: createParams,
    run: (ctx, p) => desktop.create(p.kind, ctx.at, { name: p.name, content: p.content, template: p.template }),
  });
  // A file shown by an app's widget (Note adesive: a note), only while that app shows its type
  menus.defineAction('desktop.newWidget', {
    label: t('newWidget'), icon: 'note', menus: scope, params: widgetParams,
    visible: (ctx, p) => !!p && !!fileWidget(p.app, p.widget),
    run: (ctx, p) => desktop.createWidget(p.app, p.widget, ctx.at),
  });
  // The File Manager's window "Nuovo collegamento" (its entry point newLink), making the link on the desk
  menus.defineAction('desktop.newLink', { label: t('link'), icon: 'link', menus: scope, run: () => launch('files', { folder: desktop.folder }, 'newLink') });
  menus.defineAction('desktop.openInFiles', { label: t('openInFiles'), icon: 'folder', menus: scope, run: () => launch('files', { folder: desktop.folder }) });
  menus.defineAction('desktop.arrange', { label: t('arrange'), icon: 'grid', menus: scope, run: () => desktop.arrange() });
  menus.defineAction('desktop.selectAll', { label: t('selectAll'), icon: 'check', menus: scope, shortcut: 'items.selectAll', run: () => desktop.select(desktop.scopeItems()) });
  menus.defineAction('workarea.create', {
    label: t('newWorkarea'), icon: 'workarea', menus: scope,
    // Areas do not overlap: not inside another one
    enabled: ctx => !!desktop.workareas && !ctx.workarea,
    run: ctx => desktop.workareas.createAt(ctx.at),
  });
  menus.defineAction('desk.fit', { label: t('fit'), icon: 'fit', menus: scope, shortcut: 'desk.fit', run: () => desktop.canvas.fit() });
  menus.defineAction('desk.zoomReset', { label: t('zoomReset'), icon: 'zoom', menus: scope, shortcut: 'desk.zoomReset', run: () => desktop.canvas.resetZoom() });
  menus.register(BACKGROUND_MENU, { label: t('menu'), defaults: defaults() });
}

/** Text a new file starts with: its template file's content, or the entry's own content. */
export async function initialContent({ content, template }) {
  if (template && fs.exists(template) && fs.get(template).type === 'file') return fs.read(template);
  return content ?? '';
}
