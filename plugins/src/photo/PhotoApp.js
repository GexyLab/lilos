import { Window, h, icon, fs, UndoStack, history, toast, slider, segmented, selectField, actionButton, isEditing, formatBytes } from '@lilos/sdk';
import * as sdk from '@lilos/sdk';   // `automation`: missing in older lilOS, so not imported by name
import { launch, handleCommand, pickFile } from '@lilos/system';
import { glyph } from './glyphs.js';
import { OPENS, extOf, labelOf, formatOf, supported, decode, encode, resample, cropped, copyOf, FORMATS } from './image.js';
import { resizeDialog, convertDialog } from './dialogs.js';
import { t } from './i18n.js';
import './photo.css';

export { filePreview } from './preview.js';

// Labels come from functions, so they are in the system's language when they are drawn
const colors = () => [
  { value: '#ffffff', label: t('color.white') }, { value: '#1f2328', label: t('color.black') }, { value: '#e5484d', label: t('color.red') },
  { value: '#f2994a', label: t('color.orange') }, { value: '#f2c94c', label: t('color.yellow') }, { value: '#30a46c', label: t('color.green') },
  { value: '#3b6ef5', label: t('color.blue') }, { value: '#7c5cdb', label: t('color.purple') },
];
const FONTS = [
  { value: 'sans', label: () => t('font.sans'), css: 'system-ui, "Segoe UI", Roboto, sans-serif' },
  { value: 'serif', label: () => t('font.serif'), css: 'Georgia, "Times New Roman", serif' },
  { value: 'mono', label: () => t('font.mono'), css: 'ui-monospace, Consolas, "Courier New", monospace' },
  { value: 'hand', label: () => t('font.hand'), css: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive' },
];
const ratios = () => [
  { value: 'free', label: t('ratio.free') }, { value: 'image', label: t('ratio.image') }, { value: '1', label: t('ratio.square') },
  { value: '4/3', label: '4:3' }, { value: '3/4', label: '3:4' }, { value: '3/2', label: '3:2' }, { value: '2/3', label: '2:3' },
  { value: '16/9', label: '16:9' }, { value: '9/16', label: '9:16' },
];
const TOOLS = [
  { id: 'view', label: () => t('tool.view'), key: 'V', glyph: 'hand' },
  { id: 'brush', label: () => t('tool.brush'), key: 'B', glyph: 'brush' },
  { id: 'text', label: () => t('tool.text'), key: 'T', glyph: 'text' },
  { id: 'crop', label: () => t('tool.crop'), key: 'C', glyph: 'crop' },
];
const ZOOMS = [0.05, 0.1, 1 / 6, 0.25, 1 / 3, 0.5, 2 / 3, 1, 1.5, 2, 3, 4, 6, 8, 12, 16];
const LINE = 1.2;          // line height of the text tool, in font sizes
const STEPS = 20;          // undo steps kept (each one holds a copy of the image)
const PAD = 24;            // space around the image when it fits the window
const MAX_SIDE = 16384;    // the largest width or height a resize may give
/** Automations (the Automata app): what the user does here is recorded and done again. */
const automation = () => sdk.automation ?? null;

/**
 * Image viewer with a little editing: drawing, text, crop, resize, conversion to PNG, JPEG or
 * WebP. One image per window; args.file opens a file of lilOS. The arrows go through the other
 * images of the same folder; images from the computer come in with "Importa" or by dropping them.
 */
export default function createPhoto({ args, openWindow } = {}) {
  const win = new Window({ title: 'Photo', icon: 'image', width: 900, height: 620, minWidth: 560, minHeight: 360 });
  const photo = new Photo(win, openWindow);
  if (args?.file && fs.exists(args.file)) photo.open(args.file);
  else photo.render();
  // Launched again (another image opened from File Manager): open it here, asking first if there are changes
  win.on('launch', a => { if (a?.file && fs.exists(a.file)) photo.open(a.file); });
  win.canClose = () => photo.confirmDiscard();
  win.getState = () => ({ file: photo.fileId });
  return win;
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
const isImage = name => OPENS.includes(extOf(name));

class Photo {
  fileId = null;
  name = '';
  canvas = null;            // the image being edited, at full size
  #error = '';
  #loading = 0;             // sequence of the open in progress (a later one wins)
  #rev = 0;                 // which state of the image is shown; dirty when it is not the saved one
  #savedRev = 0;
  #revs = 0;
  #zoom = 1;
  #fit = true;              // the zoom follows the window
  #tool = 'view';
  #color = '#e5484d';
  #brush = { size: 8, opacity: 100, mode: 'pen', chosen: false };
  #text = { font: 'sans', size: 48, bold: true, chosen: false };
  #ratio = 'free';
  #crop = null;             // { x, y, width, height } in image pixels, with the crop tool
  #typing = null;           // { box, x, y } while text is being written
  #message = '';

  constructor(win, openWindow) {
    this.win = win;
    this.openWindow = openWindow ?? (() => {});
    this.stack = new UndoStack({ limit: STEPS });
    const { signal } = win;

    const tool = (symbol, label, onclick) => h('button', { class: 'ph-btn', type: 'button', title: label, 'aria-label': label, onclick }, glyph(symbol));
    this.undoBtn = tool('undo', t('toolbar.undo'), () => this.stack.undo());
    this.redoBtn = tool('redo', t('toolbar.redo'), () => this.stack.redo());
    this.saveBtn = tool('save', t('toolbar.save'), () => this.save());
    this.downloadBtn = tool('download', t('toolbar.download'), () => this.download());
    this.revealBtn = tool('folder', t('toolbar.reveal'), () => this.reveal());
    this.toolBtns = TOOLS.map(x => {
      const b = tool(x.glyph, t('toolbar.tool', { label: x.label(), key: x.key }), () => this.setTool(x.id));
      b.dataset.tool = x.id;
      return b;
    });
    const labelled = (symbol, label, title, onclick) => h('button', { class: 'ph-btn ph-labelled', type: 'button', title, onclick }, glyph(symbol), h('span', {}, label));
    this.resizeBtn = labelled('resize', t('toolbar.resize'), t('toolbar.resize.title'), () => this.resize());
    this.convertBtn = labelled('convert', t('toolbar.convert'), t('toolbar.convert.title'), () => this.convert());
    this.fileInput = h('input', { type: 'file', accept: 'image/*,.svg', multiple: true, hidden: true });
    this.fileInput.addEventListener('change', () => {
      const files = [...this.fileInput.files];
      this.fileInput.value = '';
      this.importFiles(files);
    }, { signal });

    this.options = { brush: this.#brushOptions(), text: this.#textOptions(), crop: this.#cropOptions() };
    this.banner = h('div', { class: 'ph-banner', role: 'alertdialog', hidden: true });

    // The image: the canvas being edited, a layer for the stroke being drawn, the crop frame
    this.overlay = h('canvas', { class: 'ph-overlay', 'aria-hidden': 'true' });
    this.cropFrame = h('div', { class: 'ph-crop', hidden: true },
      ...['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(d => h('span', { class: 'ph-handle', dataset: { handle: d } })),
      this.cropSize = h('span', { class: 'ph-crop-size' }));
    this.paper = h('div', { class: 'ph-paper' }, this.overlay, this.cropFrame);
    this.stage = h('div', { class: 'ph-stage', tabindex: '0', 'aria-label': t('stage.label') }, this.paper);
    this.prevBtn = h('button', { class: 'ph-nav ph-prev', type: 'button', title: t('nav.previous.title'), 'aria-label': t('nav.previous'), onclick: () => this.step(-1) }, icon('arrowLeft'));
    this.nextBtn = h('button', { class: 'ph-nav ph-next', type: 'button', title: t('nav.next.title'), 'aria-label': t('nav.next'), onclick: () => this.step(1) }, icon('arrowRight'));
    this.empty = h('div', { class: 'ph-empty' });
    this.dropHint = h('div', { class: 'ph-drop', hidden: true }, glyph('upload'), h('span', {}, t('drop.hint')));
    this.main = h('div', { class: 'ph-main' }, this.stage, this.prevBtn, this.nextBtn, this.empty, this.dropHint);

    this.dims = h('span', { class: 'ph-mono' });
    this.info = h('span');
    this.position = h('span');
    this.state = h('span', { class: 'ph-state' });
    this.zoomLabel = h('button', { class: 'ph-zoom-value', type: 'button', title: t('zoom.fitToWindow'), onclick: () => this.fitToWindow() });
    const zoomBtn = (symbol, label, onclick) => h('button', { class: 'ph-zoom-btn', type: 'button', title: label, 'aria-label': label, onclick }, glyph(symbol));

    win.body.classList.add('ph');
    win.body.append(
      h('div', { class: 'ph-toolbar' },
        tool('open', t('toolbar.open'), () => this.openFile()),
        tool('upload', t('toolbar.import'), () => this.fileInput.click()),
        this.saveBtn, this.downloadBtn,
        h('span', { class: 'ph-sep' }),
        this.undoBtn, this.redoBtn,
        h('span', { class: 'ph-sep' }),
        h('span', { class: 'ph-tools', role: 'group', 'aria-label': t('toolbar.tools') }, this.toolBtns),
        h('span', { class: 'ph-sep' }),
        this.resizeBtn, this.convertBtn,
        h('span', { class: 'ph-grow' }),
        this.revealBtn, this.fileInput),
      ...Object.values(this.options),
      this.banner,
      this.main,
      h('div', { class: 'ph-status' },
        this.dims, this.info, this.position, this.state,
        h('span', { class: 'ph-grow' }),
        zoomBtn('minus', t('zoom.out'), () => this.zoomStep(-1)),
        this.zoomLabel,
        zoomBtn('plus', t('zoom.in'), () => this.zoomStep(1)),
        zoomBtn('fit', t('zoom.fit'), () => this.fitToWindow()),
        zoomBtn('actual', t('zoom.actual'), () => this.zoomTo(1))));

    this.paper.addEventListener('pointerdown', e => this.#onPaperDown(e), { signal });
    this.stage.addEventListener('pointerdown', e => this.#onStageDown(e), { signal });
    this.stage.addEventListener('wheel', e => this.#onWheel(e), { signal, passive: false });
    win.body.addEventListener('keydown', e => this.#onKey(e), { signal });
    this.#dropTarget(signal);
    // Leaving with unsaved changes (reload, closing the tab): let the browser ask
    addEventListener('beforeunload', e => { if (this.dirty) e.preventDefault(); }, { signal });
    const resizes = new ResizeObserver(() => { if (this.#fit) this.#layout(); });
    resizes.observe(this.stage);

    const off = [
      fs.on('change', e => this.#onFsChange(e)),
      fs.on('scope', () => this.render()),
      this.stack.on('change', () => this.render()),
      handleCommand('photo.save', { isActive: () => win.active, run: () => this.save() }),
      handleCommand('photo.open', { isActive: () => win.active, run: () => this.openFile() }),
      history.attach(win.body, this.stack),
    ];
    win.on('destroy', () => { off.forEach(o => o()); resizes.disconnect(); });
    // Automations: this window does again, without dialogs, what was recorded on the image it shows
    const auto = automation();
    if (auto) {
      const file = () => this.fileId;
      auto.handle('photo.resize', params => this.resizeTo(params), { window: win, file });
      auto.handle('photo.crop', params => void this.cropTo(params), { window: win, file });
      auto.handle('photo.saveAs', params => this.saveCopy(params), { window: win, file });
      auto.handle('photo.save', () => this.saveInPlace(), { window: win, file });
    }
    this.setTool('view');
  }

  get dirty() { return !!this.canvas && this.#rev !== this.#savedRev; }
  get node() { return this.fileId ? fs.get(this.fileId) : null; }

  // ---------- Files ----------

  /** Opens an image of lilOS, asking first about unsaved changes. */
  async open(id) {
    const node = fs.get(id);
    if (!node || node.type !== 'file') return;
    if (id === this.fileId && this.canvas && !this.#error) return;
    if (!(await this.confirmDiscard(t('confirm.unsaved.beforeOpen', { name: this.name, other: node.name })))) return;
    this.#cancelText();
    const seq = ++this.#loading;
    this.#message = t('status.opening');
    this.render();
    let canvas = null, error = '';
    try {
      canvas = await decode(await fs.readBlob(id));
    } catch (err) {
      error = err?.name === 'EncodingError' || err instanceof DOMException
        ? t('error.unsupported', { name: node.name })
        : t('error.unreadable', { name: node.name, error: err?.message ?? err });
    }
    if (seq !== this.#loading) return;   // another image was asked for meanwhile
    this.#message = '';
    this.fileId = id;
    this.name = node.name;
    this.#error = error;
    this.#setCanvas(canvas);
    this.stack.clear();
    this.#rev = this.#savedRev = ++this.#revs;
    this.#scaleDefaults();
    this.#fit = true;
    this.render();
    if (this.#tool === 'crop') this.#resetCrop();
    this.#layout();
    this.stage.focus({ preventScroll: true });
  }

  async openFile() {
    const node = await pickFile(this.openWindow, { title: t('pick.open.title'), exts: OPENS });
    if (node) this.open(node.id);
  }

  /** Images of the computer → files of lilOS (next to the open one, or in Immagini); opens the first. */
  async importFiles(files) {
    const images = files.filter(f => isImage(f.name) || f.type.startsWith('image/'));
    if (files.length && !images.length) return toast(files.length === 1 ? t('import.notImage', { name: files[0].name }) : t('import.noImages'));
    if (!images.length) return;
    const here = this.node && fs.get(this.node.parent);
    const folder = here?.type === 'folder' ? here : fs.resolve('/Immagini') ?? fs.get(fs.root);
    let first = null;
    for (const file of images) {
      const name = isImage(file.name) ? file.name : `${file.name || t('file.defaultName')}.${file.type.split('/')[1] ?? 'png'}`;
      const node = fs.create(folder.id, { type: 'file', name });
      try {
        await fs.write(node.id, file);
        first ??= node;
      } catch (err) {
        fs.remove(node.id);
        toast(t('import.failed', { name: file.name, error: err?.message ?? err }));
      }
    }
    if (!first) return;
    toast(t('import.done', { n: images.length, folder: folder.id === fs.root ? t('folder.home') : folder.name }));
    this.open(first.id);
  }

  /**
   * Saves over the file in its own format. GIF, SVG and the other formats the browser cannot
   * write (or an image whose file is gone) are saved as a copy instead.
   */
  async save() {
    this.#commitText();
    if (!this.canvas) return false;
    const node = this.node;
    const format = node && formatOf(node.name);
    if (!format) {
      return this.convert({
        title: node ? t('save.cannotWrite', { format: labelOf(node.name) }) : t('save.fileGone'),
        okLabel: t('save.saveCopy'), open: true,
      });
    }
    try {
      await fs.write(node.id, await encode(this.canvas, format));
    } catch (err) {
      toast(`Non salvata: ${err?.message ?? err}`);
      return false;
    }
    this.#savedRev = this.#rev;
    automation()?.record('photo.save', { file: node.id });
    const saved = this.#message = t('status.saved');
    this.render();
    setTimeout(() => { if (this.#message === saved) { this.#message = ''; this.render(); } }, 2000);
    return true;
  }

  /** Saving over the file without asking anything (automations); throws when it cannot. */
  async saveInPlace() {
    if (!this.canvas) throw new Error(t('automation.noImage'));
    const node = this.node;
    if (!node || !formatOf(node.name)) throw new Error(node ? t('save.cannotWrite', { format: labelOf(node.name) }) : t('save.fileGone'));
    if (!(await this.save())) throw new Error(t('automation.notSaved'));
  }

  /** What the copy dialog proposes: next to the file, in PNG (or JPEG for a PNG). */
  #copyProposal() {
    const node = this.node;
    const folder = node && fs.get(node.parent)?.type === 'folder' ? node.parent : (fs.resolve('/Immagini') ?? fs.get(fs.root)).id;
    const current = node && formatOf(node.name);
    return { name: this.name || `${t('file.defaultName')}.png`, folder, format: current?.id === 'png' ? 'jpeg' : 'png' };
  }

  /** Writes the image as a new file: { format, quality (0–1), name, folder }. Resolves { copy, blob }; throws if not saved. */
  async #writeCopy({ format, quality, name, folder }) {
    const blob = await encode(this.canvas, format, quality);
    const copy = fs.create(folder, { type: 'file', name });
    try {
      await fs.write(copy.id, blob);
    } catch (err) {
      fs.remove(copy.id);
      throw err;
    }
    return { copy, blob };
  }

  /** A copy in another format (and, if asked, opens it here). Resolves true when saved. */
  async convert({ title, okLabel, open } = {}) {
    this.#commitText();
    if (!this.canvas) return false;
    const proposal = this.#copyProposal();
    const choice = await convertDialog(this.win, this.openWindow, { ...proposal, title, okLabel });
    if (!choice) return false;
    if (open !== undefined) choice.open = open;
    const from = this.fileId;
    let copy, blob;
    try {
      ({ copy, blob } = await this.#writeCopy(choice));
    } catch (err) {
      toast(`Non salvata: ${err?.message ?? err}`);
      return false;
    }
    const base = proposal.name.replace(/\.[^.]+$/, '') || t('file.defaultName');
    automation()?.record('photo.saveAs', {
      params: { format: choice.format.id, quality: Math.round(choice.quality * 100), name: choice.name, folder: choice.folder, open: choice.open },
      defaults: { format: proposal.format, quality: 90, name: `${base}.${FORMATS.find(f => f.id === proposal.format).ext}`, folder: proposal.folder, open: true },
      file: from, result: copy.id,
    });
    if (choice.open) {
      // The copy has the changes: open it as saved, without asking about the old file
      this.#savedRev = this.#rev;
      await this.open(copy.id);
    } else {
      toast(t('convert.saved', { name: copy.name, size: formatBytes(blob.size) }));
    }
    return true;
  }

  /**
   * The copy without the dialog (automations): { format, quality (10–100), name, folder, open },
   * what is missing as the dialog would propose it. Resolves the id of the new file.
   */
  async saveCopy({ format, quality = 90, name, folder, open = false } = {}) {
    this.#commitText();
    if (!this.canvas) throw new Error(t('automation.noImage'));
    const proposal = this.#copyProposal();
    const chosen = FORMATS.find(f => f.id === (format ?? proposal.format));
    if (!chosen || !supported(chosen)) throw new Error(t('automation.badFormat'));
    const parent = folder ?? proposal.folder;
    if (fs.get(parent)?.type !== 'folder') throw new Error(t('convert.noFolder'));
    const fileName = name?.trim() || `${proposal.name.replace(/\.[^.]+$/, '') || t('file.defaultName')}.${chosen.ext}`;
    if (fileName.includes('/')) throw new Error(t('convert.badName'));
    const { copy } = await this.#writeCopy({ format: chosen, quality: clamp(Number(quality) || 90, 10, 100) / 100, name: fileName, folder: parent });
    if (open) {
      this.#savedRev = this.#rev;
      await this.open(copy.id);
    }
    return copy.id;
  }

  /** The image on the computer: the file as it is, or with the changes (PNG if its format cannot be written). */
  async download() {
    this.#commitText();
    if (!this.canvas) return;
    const node = this.node;
    let blob, name = this.name || `${t('file.defaultName')}.png`;
    try {
      if (node && !this.dirty) blob = await fs.readBlob(node.id);
      else {
        const format = formatOf(name) ?? FORMATS[0];
        if (!formatOf(name)) name = `${name.replace(/\.[^.]+$/, '')}.png`;
        blob = await encode(this.canvas, format);
      }
    } catch (err) {
      return toast(t('error.notDownloaded', { error: err?.message ?? err }));
    }
    const url = URL.createObjectURL(blob);
    h('a', { href: url, download: name }).click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  reveal() {
    const node = this.node;
    if (node) launch('files', { folder: node.parent });
  }

  /** The other images of the folder, by name. */
  #siblings() {
    const node = this.node;
    if (!node) return [];
    return fs.children(node.parent).filter(n => n.type === 'file' && isImage(n.name)).sort(byName);
  }

  step(delta) {
    const list = this.#siblings();
    const i = list.findIndex(n => n.id === this.fileId);
    const next = list[i + delta];
    if (i !== -1 && next) this.open(next.id);
  }

  /**
   * With unsaved changes, asks in a bar above the image: Salva / Non salvare / Annulla.
   * message: what the bar says (by default, that the changes are not saved). Resolves true when it is fine to go on.
   */
  confirmDiscard(message) {
    this.#commitText();
    if (!this.dirty) return Promise.resolve(true);
    return new Promise(resolve => {
      const done = async choice => {
        this.banner.hidden = true;
        this.banner.replaceChildren();
        if (choice === 'save') resolve(await this.save());
        else resolve(choice === 'discard');
        if (choice === 'cancel') this.stage.focus();
      };
      const save = actionButton({ label: t('action.save'), primary: true, onClick: () => done('save') });
      this.banner.replaceChildren(
        icon('help'),
        h('span', { class: 'ph-banner-text' }, message ?? t('confirm.unsaved', { name: this.name })),
        save,
        actionButton({ label: t('confirm.discard'), danger: true, onClick: () => done('discard') }),
        actionButton({ label: t('action.cancel'), onClick: () => done('cancel') }));
      this.banner.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); done('cancel'); } };
      this.banner.hidden = false;
      save.focus();
    });
  }

  #onFsChange({ type, node, ids }) {
    if (!this.fileId) return this.render();
    if ((type === 'rename' || type === 'update') && node?.id === this.fileId) this.name = node.name;
    if (type === 'remove' && ids?.includes(this.fileId)) this.#message = t('status.fileGone');
    this.render();
  }

  // ---------- Editing ----------

  #setCanvas(canvas) {
    this.canvas?.remove();
    this.canvas = canvas;
    if (canvas) {
      canvas.classList.add('ph-image');
      this.paper.prepend(canvas);
      this.overlay.width = canvas.width;
      this.overlay.height = canvas.height;
    }
  }

  /** Records a change made to the image (before: a copy taken first). */
  #record(label, before) {
    const after = copyOf(this.canvas);
    const from = this.#rev, to = this.#rev = ++this.#revs;
    const show = (image, rev) => {
      this.#cancelText();
      const fits = image.width !== this.canvas?.width || image.height !== this.canvas?.height;
      this.#setCanvas(copyOf(image));
      this.#rev = rev;
      if (this.#tool === 'crop') this.#resetCrop();
      if (fits) this.#fit = true;
      this.#layout();
      this.render();
    };
    this.stack.push({ label, undo: () => show(before, from), redo: () => show(after, to) });
  }

  /** Replaces the image with a new canvas (resize, crop), as one step of the history. */
  #replace(label, canvas) {
    const before = copyOf(this.canvas);
    this.#setCanvas(canvas);
    this.#fit = true;
    this.#record(label, before);
    if (this.#tool === 'crop') this.#resetCrop();
    this.#layout();
    this.render();
  }

  async resize() {
    this.#commitText();
    if (!this.canvas) return;
    const { width, height } = this.canvas;
    const choice = await resizeDialog(this.win, { width, height });
    if (!choice) return;
    this.#replace(t('history.resize'), resample(this.canvas, choice.width, choice.height, choice.quality));
    automation()?.record('photo.resize', {
      params: choice.asked,
      defaults: { width, height, unit: 'pixels', keepRatio: true, quality: 'high' },
      file: this.fileId,
    });
  }

  /**
   * The resize without the dialog (automations): width and height in pixels or percent; with
   * keepRatio the height follows the width and the proportions of the image shown.
   */
  resizeTo({ width, height, unit = 'pixels', keepRatio = true, quality = 'high' } = {}) {
    this.#commitText();
    if (!this.canvas) throw new Error(t('automation.noImage'));
    const W = this.canvas.width, H = this.canvas.height;
    let tw, th;
    if (unit === 'percent') {
      tw = Math.round(W * width / 100);
      th = Math.round(H * (keepRatio ? width : height) / 100);
    } else {
      tw = Math.round(width);
      th = keepRatio ? Math.max(1, Math.round(width * H / W)) : Math.round(height);
    }
    if (!(tw > 0 && th > 0) || tw > MAX_SIDE || th > MAX_SIDE) throw new Error(t('resize.outOfRange'));
    if (tw === W && th === H) return;
    this.#replace(t('history.resize'), resample(this.canvas, tw, th, ['high', 'medium', 'pixel'].includes(quality) ? quality : 'high'));
  }

  /** Sizes of brush and text that suit the image, until the user picks their own. */
  #scaleDefaults() {
    if (!this.canvas) return;
    const short = Math.min(this.canvas.width, this.canvas.height);
    if (!this.#brush.chosen) this.#brush.size = clamp(Math.round(short / 120), 2, 200);
    if (!this.#text.chosen) this.#text.size = clamp(Math.round(short / 14), 12, 400);
    this.#syncOptions();
  }

  setTool(id) {
    if (this.#tool === 'text' && id !== 'text') this.#commitText();
    this.#tool = id;
    for (const b of this.toolBtns) b.setAttribute('aria-pressed', String(b.dataset.tool === id));
    for (const [name, bar] of Object.entries(this.options)) bar.hidden = name !== id;
    this.paper.dataset.tool = id;
    this.stage.dataset.tool = id;
    if (id === 'crop') this.#resetCrop();
    else this.#crop = null;
    this.#drawCrop();
  }

  #imagePoint(e) {
    const r = this.paper.getBoundingClientRect();
    return { x: (e.clientX - r.left) / this.#zoom, y: (e.clientY - r.top) / this.#zoom };
  }

  #onStageDown(e) {
    // Middle button, or the view tool anywhere: drag the image around
    if (e.button === 1 || (e.button === 0 && this.#tool === 'view')) {
      e.preventDefault();
      this.stage.focus({ preventScroll: true });
      const sx = this.stage.scrollLeft, sy = this.stage.scrollTop, x = e.clientX, y = e.clientY;
      this.stage.setPointerCapture(e.pointerId);
      this.stage.classList.add('panning');
      const move = ev => { this.stage.scrollLeft = sx - (ev.clientX - x); this.stage.scrollTop = sy - (ev.clientY - y); };
      const up = () => {
        this.stage.classList.remove('panning');
        this.stage.removeEventListener('pointermove', move);
        this.stage.removeEventListener('pointerup', up);
        this.stage.removeEventListener('pointercancel', up);
      };
      this.stage.addEventListener('pointermove', move);
      this.stage.addEventListener('pointerup', up);
      this.stage.addEventListener('pointercancel', up);
    } else if (e.button === 0 && this.#tool === 'crop' && this.canvas && !this.paper.contains(e.target)) {
      // Outside the image: a new frame, clamped to the image
      this.#dragCrop(e, 'new');
    }
  }

  #onPaperDown(e) {
    if (e.button !== 0 || !this.canvas) return;
    if (this.#tool === 'brush') { e.stopPropagation(); this.#paint(e); }
    else if (this.#tool === 'text') {
      e.stopPropagation();
      if (this.#typing && this.#typing.box.contains(e.target)) return;
      e.preventDefault();
      if (this.#typing) this.#commitText();
      else this.#startText(this.#imagePoint(e));
    } else if (this.#tool === 'crop') {
      e.stopPropagation();
      this.#dragCrop(e, e.target.dataset.handle ?? (e.target === this.cropFrame ? 'move' : 'new'));
    }
  }

  /** A stroke of the brush (or the eraser), drawn on a layer and then onto the image as one step. */
  #paint(e) {
    e.preventDefault();
    const { size, opacity, mode } = this.#brush;
    const before = copyOf(this.canvas);
    const erase = mode === 'eraser';
    const target = erase ? this.canvas : this.overlay;
    const ctx = target.getContext('2d');
    ctx.save();
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.lineWidth = size;
    ctx.strokeStyle = ctx.fillStyle = this.#color;
    if (erase) ctx.globalCompositeOperation = 'destination-out';
    this.overlay.style.opacity = erase ? '' : String(opacity / 100);
    let last = this.#imagePoint(e);
    ctx.beginPath();
    ctx.arc(last.x, last.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    const move = ev => {
      for (const p of ev.getCoalescedEvents?.() ?? [ev]) {
        const point = this.#imagePoint(p);
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        last = point;
      }
    };
    const up = () => {
      this.paper.removeEventListener('pointermove', move);
      this.paper.removeEventListener('pointerup', up);
      this.paper.removeEventListener('pointercancel', up);
      ctx.restore();
      if (!erase) {
        const main = this.canvas.getContext('2d');
        main.save();
        main.globalAlpha = opacity / 100;
        main.drawImage(this.overlay, 0, 0);
        main.restore();
        ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
      }
      this.#record(erase ? t('history.erase') : t('history.draw'), before);
      // Free-hand: an automation cannot do it again (the recorder shows it struck out)
      automation()?.missed('photo', t('tool.brush'));
      this.render();
    };
    this.paper.setPointerCapture(e.pointerId);
    this.paper.addEventListener('pointermove', move);
    this.paper.addEventListener('pointerup', up);
    this.paper.addEventListener('pointercancel', up);
  }

  #fontCss(size) {
    const font = FONTS.find(f => f.value === this.#text.font) ?? FONTS[0];
    return `${this.#text.bold ? 700 : 400} ${size}px ${font.css}`;
  }

  /** A box where the user writes, over the image at (x, y); Invio puts the text on the image. */
  #startText({ x, y }) {
    const box = h('div', { class: 'ph-textbox', role: 'textbox', 'aria-label': t('text.box'), 'aria-multiline': 'true', spellcheck: 'false' });
    box.contentEditable = 'plaintext-only';
    if (box.contentEditable !== 'plaintext-only') box.contentEditable = 'true';
    // The click is where the first line starts: the box goes up by half a line
    this.#typing = { box, x, y: y - this.#text.size * LINE / 2 };
    this.#styleText();
    box.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.#commitText(); this.stage.focus({ preventScroll: true }); }
      else if (e.key === 'Escape') { e.preventDefault(); this.#cancelText(); this.stage.focus({ preventScroll: true }); }
    });
    box.addEventListener('paste', e => {
      // Text only, whatever the browser would paste
      e.preventDefault();
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    });
    this.paper.append(box);
    box.focus();
  }

  #styleText() {
    if (!this.#typing) return;
    const { box, x, y } = this.#typing;
    const z = this.#zoom;
    Object.assign(box.style, { left: `${x * z}px`, top: `${y * z}px`, font: this.#fontCss(this.#text.size * z), lineHeight: String(LINE), color: this.#color });
  }

  #commitText() {
    if (!this.#typing) return;
    const { box, x, y } = this.#typing;
    const lines = box.innerText.replace(/\n+$/, '').split('\n');
    this.#cancelText();
    if (!lines.some(l => l.trim())) return;
    const before = copyOf(this.canvas);
    const ctx = this.canvas.getContext('2d');
    const size = this.#text.size;
    ctx.save();
    ctx.font = this.#fontCss(size);
    ctx.fillStyle = this.#color;
    ctx.textBaseline = 'top';
    // Same place as in the box: each line box is LINE sizes tall, the glyphs' em box in its middle
    lines.forEach((line, i) => ctx.fillText(line, x, y + size * (LINE - 1) / 2 + i * size * LINE));
    ctx.restore();
    this.#record(t('history.text'), before);
    automation()?.missed('photo', t('tool.text'));
    this.render();
  }

  #cancelText() {
    this.#typing?.box.remove();
    this.#typing = null;
  }

  // ---------- Crop ----------

  #ratioValue() {
    if (this.#ratio === 'free' || !this.canvas) return null;
    if (this.#ratio === 'image') return this.canvas.width / this.canvas.height;
    const [a, b = 1] = this.#ratio.split('/').map(Number);
    return a / b;
  }

  /** The whole image, or the largest centered frame with the chosen proportions. */
  #resetCrop() {
    if (!this.canvas) return void (this.#crop = null);
    const W = this.canvas.width, H = this.canvas.height, r = this.#ratioValue();
    let width = W, height = H;
    if (r) { width = Math.min(W, H * r); height = width / r; }
    this.#crop = { x: (W - width) / 2, y: (H - height) / 2, width, height };
    this.#drawCrop();
  }

  /** Moves or resizes the frame (handle: 'move', a side or corner, or 'new' from the pointer). */
  #dragCrop(e, handle) {
    e.preventDefault();
    if (!this.#crop) return;
    const W = this.canvas.width, H = this.canvas.height;
    const start = this.#imagePoint(e);
    const r0 = { ...this.#crop };
    const ratio = this.#ratioValue();
    if (handle === 'new') {
      start.x = clamp(start.x, 0, W);
      start.y = clamp(start.y, 0, H);
    }
    const move = ev => {
      const p = this.#imagePoint(ev);
      const dx = p.x - start.x, dy = p.y - start.y;
      if (handle === 'move') {
        this.#crop = { ...r0, x: clamp(r0.x + dx, 0, W - r0.width), y: clamp(r0.y + dy, 0, H - r0.height) };
      } else if (handle === 'new') {
        this.#crop = frameFrom(start.x, start.y, clamp(p.x, 0, W), clamp(p.y, 0, H), ratio, W, H);
      } else {
        this.#crop = resizeFrame(r0, handle, dx, dy, ratio, W, H);
      }
      this.#drawCrop();
    };
    const up = () => {
      this.paper.removeEventListener('pointermove', move);
      this.paper.removeEventListener('pointerup', up);
      this.paper.removeEventListener('pointercancel', up);
      if (this.#crop.width < 1 || this.#crop.height < 1) this.#resetCrop();
    };
    this.paper.setPointerCapture(e.pointerId);
    this.paper.addEventListener('pointermove', move);
    this.paper.addEventListener('pointerup', up);
    this.paper.addEventListener('pointercancel', up);
  }

  #drawCrop() {
    const c = this.#crop;
    this.cropFrame.hidden = !c || !this.canvas;
    if (!c || !this.canvas) return;
    const z = this.#zoom;
    Object.assign(this.cropFrame.style, { left: `${c.x * z}px`, top: `${c.y * z}px`, width: `${c.width * z}px`, height: `${c.height * z}px` });
    this.cropSize.textContent = `${Math.round(c.width)} × ${Math.round(c.height)}`;
    this.applyCropBtn.disabled = Math.round(c.width) === this.canvas.width && Math.round(c.height) === this.canvas.height;
  }

  applyCrop() {
    const c = this.#crop;
    if (!c || !this.canvas) return;
    const area = this.cropTo({ x: c.x, y: c.y, width: c.width, height: c.height });
    if (area) automation()?.record('photo.crop', { params: area, file: this.fileId });
  }

  /**
   * Crops to { x, y, width, height } in image pixels, kept inside the image (also for
   * automations). Returns the area cropped, or null when it is the whole image; throws when
   * there is no image or the area starts outside it.
   */
  cropTo({ x = 0, y = 0, width, height } = {}) {
    if (!this.canvas) throw new Error(t('automation.noImage'));
    const W = this.canvas.width, H = this.canvas.height;
    x = Math.round(x);
    y = Math.round(y);
    if (!(x >= 0 && y >= 0 && x < W && y < H)) throw new Error(t('automation.cropOutside'));
    const area = { x, y, width: clamp(Math.round(width ?? W - x), 1, W - x), height: clamp(Math.round(height ?? H - y), 1, H - y) };
    if (area.width === W && area.height === H) return null;
    this.#replace(t('history.crop'), cropped(this.canvas, area));
    return area;
  }

  // ---------- Zoom ----------

  #fitZoom() {
    if (!this.canvas) return 1;
    const w = this.stage.clientWidth - PAD * 2, h = this.stage.clientHeight - PAD * 2;
    if (w <= 0 || h <= 0) return this.#zoom;
    return Math.min(1, w / this.canvas.width, h / this.canvas.height);
  }

  #layout() {
    if (!this.canvas) return;
    if (this.#fit) this.#zoom = this.#fitZoom();
    const z = this.#zoom;
    const width = `${this.canvas.width * z}px`, height = `${this.canvas.height * z}px`;
    Object.assign(this.paper.style, { width, height });
    this.canvas.classList.toggle('pixelated', z >= 2);
    this.zoomLabel.textContent = `${Math.round(z * 100)}%`;
    this.#drawCrop();
    this.#styleText();
  }

  /** Zooms keeping the point under (cx, cy) — client coordinates — where it is (the center by default). */
  zoomTo(zoom, cx, cy) {
    if (!this.canvas) return;
    const rect = this.stage.getBoundingClientRect();
    cx ??= rect.left + rect.width / 2;
    cy ??= rect.top + rect.height / 2;
    const p = this.#imagePoint({ clientX: cx, clientY: cy });
    this.#zoom = clamp(zoom, ZOOMS[0], ZOOMS.at(-1));
    this.#fit = false;
    this.#layout();
    const paper = this.paper.getBoundingClientRect();
    this.stage.scrollLeft += paper.left + p.x * this.#zoom - cx;
    this.stage.scrollTop += paper.top + p.y * this.#zoom - cy;
  }

  zoomStep(direction, cx, cy) {
    const z = this.#zoom;
    const next = direction > 0 ? ZOOMS.find(v => v > z * 1.001) : ZOOMS.findLast(v => v < z / 1.001);
    if (next) this.zoomTo(next, cx, cy);
  }

  fitToWindow() {
    this.#fit = true;
    this.#layout();
  }

  #onWheel(e) {
    if (!(e.ctrlKey || e.metaKey) || !this.canvas) return;
    e.preventDefault();
    // Smooth for trackpads (small deltas), one step per notch for wheels
    const factor = Math.abs(e.deltaY) < 40 ? Math.exp(-e.deltaY / 100) : null;
    if (factor) this.zoomTo(this.#zoom * factor, e.clientX, e.clientY);
    else this.zoomStep(e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY);
  }

  // ---------- Keys, drop ----------

  #onKey(e) {
    if (e.defaultPrevented || isEditing() || e.target.closest?.('.ph-banner, .msgbox-layer, select, input')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const tool = TOOLS.find(x => x.key.toLowerCase() === key);
    let done = true;
    if (tool) this.setTool(tool.id);
    else if (key === '+' || key === '=') this.zoomStep(1);
    else if (key === '-') this.zoomStep(-1);
    else if (key === '0') this.fitToWindow();
    else if (key === '1') this.zoomTo(1);
    else if (key === 'ArrowLeft' && e.target.closest('.ph-main, .ph-toolbar') !== null) this.step(-1);
    else if (key === 'ArrowRight' && e.target.closest('.ph-main, .ph-toolbar') !== null) this.step(1);
    else if (key === 'Enter' && this.#tool === 'crop' && !e.target.closest('button')) this.applyCrop();
    else if (key === 'Escape' && this.#tool === 'crop') this.#resetCrop();
    else done = false;
    if (done) e.preventDefault();
  }

  /** Image files dropped from the computer are imported. */
  #dropTarget(signal) {
    const hasFiles = e => [...(e.dataTransfer?.types ?? [])].includes('Files');
    let depth = 0;
    this.main.addEventListener('dragenter', e => { if (hasFiles(e)) { depth++; this.dropHint.hidden = false; } }, { signal });
    this.main.addEventListener('dragleave', e => { if (hasFiles(e) && --depth <= 0) { depth = 0; this.dropHint.hidden = true; } }, { signal });
    this.main.addEventListener('dragover', e => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }, { signal });
    this.main.addEventListener('drop', e => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      this.dropHint.hidden = true;
      this.confirmDiscard(t('confirm.unsaved.beforeImport', { name: this.name })).then(ok => { if (ok) this.importFiles([...e.dataTransfer.files]); });
    }, { signal });
  }

  // ---------- Tool options ----------

  #swatches() {
    const custom = h('input', { type: 'color', class: 'ph-swatch ph-custom', title: t('color.custom.title'), 'aria-label': t('color.custom') });
    const list = colors();
    const buttons = list.map(c => h('button', {
      class: 'ph-swatch', type: 'button', title: c.label, 'aria-label': c.label, style: { background: c.value },
      onclick: () => this.#setColor(c.value),
    }));
    buttons.forEach((b, i) => { b.dataset.color = list[i].value; });
    custom.addEventListener('input', () => this.#setColor(custom.value));
    return h('span', { class: 'ph-swatches', role: 'group', 'aria-label': t('option.color') }, buttons, custom);
  }

  #setColor(color) {
    this.#color = color;
    this.#syncOptions();
    this.#styleText();
    this.#typing?.box.focus();
  }

  /** A slider that reports every move (the SDK's reports on release). */
  #slider({ value, min, max, unit, label, onInput }) {
    const el = slider({ value, min, max, unit, label });
    const input = el.querySelector('input');
    input.addEventListener('input', () => onInput(Number(input.value)));
    el.set = v => { input.value = v; el.querySelector('.ctl-value').textContent = `${v}${unit}`; };
    return el;
  }

  #brushOptions() {
    this.brushSize = this.#slider({ value: this.#brush.size, min: 1, max: 200, unit: ' px', label: t('brush.size'), onInput: v => { this.#brush.size = v; this.#brush.chosen = true; } });
    this.brushOpacity = this.#slider({ value: 100, min: 5, max: 100, unit: '%', label: t('brush.opacity'), onInput: v => { this.#brush.opacity = v; } });
    this.opacityGroup = h('span', { class: 'ph-option' }, h('span', { class: 'ph-label' }, t('brush.opacity')), this.brushOpacity);
    return h('div', { class: 'ph-options', hidden: true },
      h('span', { class: 'ph-option' }, h('span', { class: 'ph-label' }, t('option.color')), this.#swatches()),
      h('span', { class: 'ph-option' }, h('span', { class: 'ph-label' }, t('brush.size')), this.brushSize),
      this.opacityGroup,
      segmented({
        value: 'pen', label: t('brush.mode'), options: [{ value: 'pen', label: t('brush.pen') }, { value: 'eraser', label: t('brush.eraser') }],
        onChange: v => { this.#brush.mode = v; this.#syncOptions(); },
      }));
  }

  #textOptions() {
    this.textSize = this.#slider({ value: this.#text.size, min: 8, max: 400, unit: ' px', label: t('text.size'), onInput: v => { this.#text.size = v; this.#text.chosen = true; this.#styleText(); } });
    this.boldBtn = h('button', { class: 'ph-btn ph-bold', type: 'button', title: t('text.bold'), 'aria-label': t('text.bold'), 'aria-pressed': 'true', onclick: () => {
      this.#text.bold = !this.#text.bold;
      this.#syncOptions();
      this.#styleText();
      this.#typing?.box.focus();
    } }, t('text.bold.letter'));
    return h('div', { class: 'ph-options', hidden: true },
      h('span', { class: 'ph-option' }, h('span', { class: 'ph-label' }, t('option.color')), this.#swatches()),
      h('span', { class: 'ph-option' }, h('span', { class: 'ph-label' }, t('text.font')), selectField({
        value: this.#text.font, label: t('text.font'), options: FONTS.map(f => ({ value: f.value, label: f.label() })),
        onChange: v => { this.#text.font = v; this.#styleText(); this.#typing?.box.focus(); },
      })),
      h('span', { class: 'ph-option' }, h('span', { class: 'ph-label' }, t('text.size')), this.textSize),
      this.boldBtn,
      h('span', { class: 'ph-hint' }, t('text.hint')));
  }

  #cropOptions() {
    this.applyCropBtn = actionButton({ label: t('crop.apply'), primary: true, onClick: () => this.applyCrop() });
    return h('div', { class: 'ph-options', hidden: true },
      h('span', { class: 'ph-option' }, h('span', { class: 'ph-label' }, t('crop.ratio')), selectField({
        value: this.#ratio, label: t('crop.ratio'), options: ratios(),
        onChange: v => { this.#ratio = v; this.#resetCrop(); },
      })),
      h('span', { class: 'ph-hint' }, t('crop.hint')),
      h('span', { class: 'ph-grow' }),
      actionButton({ label: t('crop.whole'), onClick: () => this.#resetCrop() }),
      this.applyCropBtn);
  }

  #syncOptions() {
    for (const b of this.win.body.querySelectorAll('.ph-swatch[data-color]')) b.setAttribute('aria-pressed', String(b.dataset.color === this.#color));
    for (const c of this.win.body.querySelectorAll('.ph-custom')) {
      c.value = this.#color;
      c.classList.toggle('on', !colors().some(x => x.value === this.#color));
    }
    this.brushSize?.set(this.#brush.size);
    this.textSize?.set(this.#text.size);
    if (this.opacityGroup) this.opacityGroup.hidden = this.#brush.mode === 'eraser';
    this.boldBtn?.setAttribute('aria-pressed', String(this.#text.bold));
  }

  // ---------- Rendering ----------

  render() {
    const node = this.node;
    const has = !!this.canvas;
    this.win.setTitle(this.name ? `${this.name}${this.dirty ? ' •' : ''}` : 'Photo', this.name ? 'Photo' : '');
    this.stage.hidden = !has;
    this.empty.hidden = has;
    if (!has) this.#renderEmpty();
    for (const b of [this.saveBtn, this.downloadBtn, this.resizeBtn, this.convertBtn, ...this.toolBtns]) b.disabled = !has;
    this.revealBtn.disabled = !node;
    this.undoBtn.disabled = !this.stack.canUndo;
    this.redoBtn.disabled = !this.stack.canRedo;
    this.undoBtn.title = this.stack.undoLabel ? t('toolbar.undo.named', { label: this.stack.undoLabel }) : t('toolbar.undo');
    this.redoBtn.title = this.stack.redoLabel ? t('toolbar.redo.named', { label: this.stack.redoLabel }) : t('toolbar.redo');

    const list = this.#siblings();
    const i = list.findIndex(n => n.id === this.fileId);
    this.prevBtn.hidden = !has || i <= 0;
    this.nextBtn.hidden = !has || i === -1 || i >= list.length - 1;
    this.dims.textContent = has ? t('status.size', { width: this.canvas.width, height: this.canvas.height }) : '';
    this.info.textContent = has && this.name ? [labelOf(this.name), node && formatBytes(node.size ?? 0)].filter(Boolean).join(' · ') : '';
    const folder = node && fs.get(node.parent);
    const index = i + 1, count = list.length;
    this.position.textContent = i === -1 || count <= 1 ? ''
      : folder ? t('status.positionIn', { index, count, folder: node.parent === fs.root ? t('folder.home') : folder.name })
      : t('status.position', { index, count });
    this.state.textContent = this.#message || (this.dirty ? t('status.modified') : '');
    this.state.classList.toggle('dirty', !this.#message && this.dirty);
    this.zoomLabel.hidden = !has;
    for (const b of this.win.body.querySelectorAll('.ph-zoom-btn')) b.disabled = !has;
  }

  #renderEmpty() {
    const action = (symbol, label, onclick) => h('button', { class: 'ctl-btn', type: 'button', onclick }, glyph(symbol), h('span', {}, label));
    this.empty.replaceChildren(
      h('div', { class: 'ph-empty-icon' }, icon('image')),
      h('div', { class: 'ph-empty-title' }, this.#loading && this.#message ? t('status.opening') : this.#error ? t('empty.unavailable') : t('empty.title')),
      h('p', {}, this.#error || t('empty.text')),
      h('div', { class: 'ph-empty-actions' },
        action('open', t('empty.open'), () => this.openFile()),
        action('upload', t('toolbar.import'), () => this.fileInput.click())));
  }
}

/** The frame from (ax, ay) to (bx, by), with the proportions if any, inside the image. */
function frameFrom(ax, ay, bx, by, ratio, W, H) {
  const sx = bx >= ax ? 1 : -1, sy = by >= ay ? 1 : -1;
  let width = Math.abs(bx - ax), height = Math.abs(by - ay);
  if (ratio) {
    const availW = sx > 0 ? W - ax : ax, availH = sy > 0 ? H - ay : ay;
    width = Math.min(Math.max(width, height * ratio), availW, availH * ratio);
    height = width / ratio;
  }
  return { x: sx > 0 ? ax : ax - width, y: sy > 0 ? ay : ay - height, width, height };
}

/** The frame r0 with a side or corner moved by (dx, dy), keeping the proportions if any, inside the image. */
function resizeFrame(r0, handle, dx, dy, ratio, W, H) {
  let left = r0.x, top = r0.y, right = r0.x + r0.width, bottom = r0.y + r0.height;
  if (handle.includes('w')) left = clamp(left + dx, 0, right - 1);
  if (handle.includes('e')) right = clamp(right + dx, left + 1, W);
  if (handle.includes('n')) top = clamp(top + dy, 0, bottom - 1);
  if (handle.includes('s')) bottom = clamp(bottom + dy, top + 1, H);
  if (!ratio) return { x: left, y: top, width: right - left, height: bottom - top };
  if (handle.length === 2) {
    // A corner: the opposite one stays
    const ax = handle.includes('w') ? r0.x + r0.width : r0.x, ay = handle.includes('n') ? r0.y + r0.height : r0.y;
    return frameFrom(ax, ay, handle.includes('w') ? left : right, handle.includes('n') ? top : bottom, ratio, W, H);
  }
  // A side: the other dimension follows, around the middle
  const cx = r0.x + r0.width / 2, cy = r0.y + r0.height / 2;
  if (handle === 'e' || handle === 'w') {
    let width = Math.min(right - left, 2 * Math.min(cy, H - cy) * ratio);
    const height = width / ratio;
    if (handle === 'w') left = right - width; else right = left + width;
    width = right - left;
    return { x: left, y: cy - height / 2, width, height };
  }
  const height = Math.min(bottom - top, 2 * Math.min(cx, W - cx) / ratio);
  const width = height * ratio;
  if (handle === 'n') top = bottom - height; else bottom = top + height;
  return { x: cx - width / 2, y: top, width, height };
}
