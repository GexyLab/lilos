import { appFor, extensionOf } from './open.js';
import { isInstalled } from './registry.js';
import { entrypointsOf } from './entrypoints.js';
import * as background from './packages/background.js';
import { theme } from './packages/host.js';
import { locale } from '@lilos/sdk';

const { t } = locale.define('lilos:apps.filePreview', {
  en: { strings: {
    late: '{app} did not answer in time',
    invalid: 'Invalid preview', tooBig: 'Preview too large',
    imageType: 'The image of the preview has no image/* type',
  } },
});

/**
 * Previews made by apps. The app that opens a file (the user's choice for its type, see open.js)
 * may show what the file contains with a `filePreview` background entry point: it gets
 * `{ file, size? }`, the file handed to it only to read and, for an image, the longest side wanted
 * in pixels (thumbnails.js asks for small ones), and answers with what to show:
 *
 *   { text }    plain text
 *   { image }   a Blob with an image/* type
 *   { html }    a page with no scripts; it can't load anything nor take the user elsewhere
 *
 * and an optional `note` (a line under the preview). null: nothing to show, the File Manager
 * shows its own preview. Installed apps ask for one with lilos.files.preview (permission
 * fs.preview, methods.js).
 */
export const PREVIEW_ENTRY = 'filePreview';
const TIMEOUT = 10_000;
const MAX = { text: 1 << 20, html: 1 << 20, image: 20 << 20, note: 200 };
const CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:";
// Ways out of the page that work without scripts: links, a refresh, a base, SVG animations of a link
const UNSAFE = 'script, noscript, base, meta, link, iframe, frame, frameset, object, embed, portal, form, set, animate, animateMotion, animateTransform';
const fail = msg => { throw new Error(msg); };

/** The app that previews this file, or null. */
export function previewAppFor(node) {
  if (node?.type !== 'file' || node.trashed) return null;
  const app = appFor(extensionOf(node));
  if (!app?.package || !app.load || !isInstalled(app.id)) return null;
  return entrypointsOf(app)[PREVIEW_ENTRY]?.kind === 'background' ? app : null;
}

/**
 * The preview of a file made by its app: { app, text | image | html, note } or null (no app
 * previews it, or the app has nothing to show). `html` is a whole document for an
 * <iframe sandbox=""> (srcdoc), with the theme's colors as CSS variables. Rejects if the app
 * fails, answers something else or takes more than 10 seconds. size: see above (none: the app's own).
 * from: the id of the app that asks (null: lilOS or a system app), given to the previewing app.
 */
export async function filePreview(node, { size, from = null } = {}) {
  const app = previewAppFor(node);
  if (!app) return null;
  let timer;
  const late = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(t('late', { app: app.name }))), TIMEOUT); });
  try {
    const answer = await Promise.race([background.call(app, PREVIEW_ENTRY, { file: node.id, ...(size > 0 && { size: Math.round(size) }) }, from, { readOnly: true }), late]);
    const preview = checked(answer);
    return preview && { app: app.id, ...preview };
  } finally {
    clearTimeout(timer);
  }
}

/** What an app answered (untrusted): one kind of content, within its limits. */
function checked(answer) {
  if (answer == null) return null;
  if (typeof answer !== 'object') fail(t('invalid'));
  const note = typeof answer.note === 'string' && answer.note.trim() ? answer.note.trim().slice(0, MAX.note) : null;
  if (typeof answer.text === 'string') return { text: answer.text.slice(0, MAX.text), note };
  if (typeof answer.html === 'string') return answer.html.length <= MAX.html ? { html: previewDocument(answer.html), note } : fail(t('tooBig'));
  if (answer.image instanceof Blob) {
    if (!/^image\/[\w.+-]+$/.test(answer.image.type)) fail(t('imageType'));
    return answer.image.size <= MAX.image ? { image: answer.image, note } : fail(t('tooBig'));
  }
  fail(t('invalid'));
}

/**
 * The page of an app, to show in a sandbox with no permissions (no scripts, forms, popups):
 * without what could still leave it, a CSP that loads nothing from outside, and the theme.
 */
function previewDocument(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll(UNSAFE).forEach(el => el.remove());
  doc.querySelectorAll('a, area').forEach(el => ['href', 'xlink:href', 'target', 'ping'].forEach(a => el.removeAttribute(a)));
  const vars = Object.entries(theme()).map(([k, v]) => `${k}:${v}`).join(';');
  const scheme = getComputedStyle(document.documentElement).colorScheme || 'normal';
  const csp = doc.createElement('meta');
  csp.httpEquiv = 'Content-Security-Policy';
  csp.content = CSP;
  const style = doc.createElement('style');
  style.textContent = `:root{color-scheme:${scheme};${vars}}body{margin:12px;font:13px/1.5 var(--font);color:var(--text);background:transparent;overflow-wrap:anywhere}`;
  doc.head.prepend(csp, style);
  return `<!doctype html>${doc.documentElement.outerHTML}`;
}
