import { h, fs, segmented, selectField, slider, toggle, messageBox } from '@lilos/sdk';
import { pickFile } from '@lilos/system';
import { glyph } from './glyphs.js';
import { FORMATS, supported } from './image.js';
import { t } from './i18n.js';

/**
 * A small dialog over the app's window (the SDK's message box: the window stays usable only
 * through it): title, rows, Annulla and a main button. Esc or Annulla resolve null; the main
 * button resolves collect() (return undefined from it to keep the dialog open: it says why in its
 * rows). Enter in a field is the main button.
 */
async function openSheet(win, { title, rows, okLabel, collect, focus }) {
  let value;
  const box = messageBox(win, {
    title, width: 380,
    content: h('div', { class: 'ph-sheet' }, rows),
    buttons: ['cancel', { value: 'ok', label: okLabel, primary: true }],
    validate: () => {
      value = collect();
      return value !== undefined;
    },
  });
  focus?.focus();
  return (await box) === 'ok' ? value : null;
}

const row = (label, ...control) => h('div', { class: 'ph-row' }, h('span', { class: 'ph-row-label' }, label), ...control);
const number = (value, label) => h('input', { class: 'ph-number', type: 'number', min: 1, step: 1, value, 'aria-label': label });

/**
 * Width and height of the image: pixels or percent, proportions locked or not. Resolves
 * { width, height, quality, asked: { width, height, unit, keepRatio, quality } } or null.
 */
export function resizeDialog(win, { width, height }) {
  let unit = 'px', locked = true;
  const w = number(width, t('resize.width')), hgt = number(height, t('resize.height'));
  const unitW = h('span', { class: 'ph-unit' }, 'px'), unitH = h('span', { class: 'ph-unit' }, 'px');
  const result = h('div', { class: 'ph-hint' });
  const lock = h('button', { class: 'ph-lock', type: 'button', 'aria-pressed': 'true', title: t('resize.keepRatio'), 'aria-label': t('resize.keepRatio'), onclick: () => {
    locked = !locked;
    lock.setAttribute('aria-pressed', String(locked));
    if (locked) sync('w');
  } }, glyph('link'));
  let quality = 'high';
  const target = () => {
    const a = Number(w.value), b = Number(hgt.value);
    return unit === 'px' ? [Math.round(a), Math.round(b)] : [Math.round(width * a / 100), Math.round(height * b / 100)];
  };
  const show = () => {
    const [tw, th] = target();
    result.textContent = tw > 0 && th > 0 ? t('resize.result', { width, height, newWidth: tw, newHeight: th }) : t('resize.missing');
  };
  const sync = from => {
    if (locked) {
      if (unit === '%') (from === 'w' ? hgt : w).value = (from === 'w' ? w : hgt).value;
      else if (from === 'w') hgt.value = Math.max(1, Math.round(Number(w.value) * height / width));
      else w.value = Math.max(1, Math.round(Number(hgt.value) * width / height));
    }
    show();
  };
  w.addEventListener('input', () => sync('w'));
  hgt.addEventListener('input', () => sync('h'));
  const units = segmented({
    value: 'px', label: t('resize.unit'), options: [{ value: 'px', label: t('resize.pixels') }, { value: '%', label: t('resize.percent') }],
    onChange: v => {
      const [tw, th] = target();
      unit = v;
      unitW.textContent = unitH.textContent = v;
      w.value = v === 'px' ? tw : Math.round(tw / width * 100);
      hgt.value = v === 'px' ? th : Math.round(th / height * 100);
      show();
    },
  });
  show();
  return openSheet(win, {
    title: t('resize.title'), okLabel: t('resize.ok'), focus: w,
    rows: [
      row(t('resize.unit'), units),
      h('div', { class: 'ph-row' }, h('span', { class: 'ph-row-label' }, t('resize.size')),
        h('div', { class: 'ph-size' },
          h('label', { class: 'ph-size-field' }, w, unitW),
          lock,
          h('label', { class: 'ph-size-field' }, hgt, unitH))),
      row(t('resize.quality'), selectField({
        value: quality, label: t('resize.quality'),
        options: [{ value: 'high', label: t('resize.quality.high') }, { value: 'medium', label: t('resize.quality.medium') }, { value: 'pixel', label: t('resize.quality.pixel') }],
        onChange: v => { quality = v; },
      })),
      result,
    ],
    collect: () => {
      const [tw, th] = target();
      if (!(tw > 0 && th > 0) || tw > 16384 || th > 16384) {
        result.textContent = t('resize.outOfRange');
        return undefined;
      }
      if (tw === width && th === height) return null;
      // asked: what the fields said, in their unit (for automations)
      const percent = unit === '%';
      const asked = { width: percent ? Number(w.value) : tw, height: percent ? Number(hgt.value) : th, unit: percent ? 'percent' : 'pixels', keepRatio: locked, quality };
      return { width: tw, height: th, quality, asked };
    },
  });
}

/**
 * A copy in another format: format, quality, name, folder. Resolves
 * { format, quality, name, folder, open } or null.
 */
export function convertDialog(win, openWindow, { name, folder, format: initial = 'png', title = t('convert.title'), okLabel = t('action.save') }) {
  const formats = FORMATS.filter(supported);
  let format = formats.find(f => f.id === initial) ?? formats[0];
  let folderId = folder;
  let quality = 90;
  let open = true;
  const base = name.replace(/\.[^.]+$/, '') || t('file.defaultName');
  const nameField = h('input', { class: 'ph-text', type: 'text', spellcheck: 'false', 'aria-label': t('convert.fileName') });
  nameField.value = `${base}.${format.ext}`;
  const note = h('div', { class: 'ph-hint' });
  const qualityRow = row(t('convert.quality'), slider({ value: quality, min: 10, max: 100, unit: '%', label: t('convert.quality'), onChange: v => { quality = v; } }));
  const qualityInput = qualityRow.querySelector('input');
  qualityInput.addEventListener('input', () => { quality = Number(qualityInput.value); });
  const folderLabel = h('span', { class: 'ph-folder-name' });
  const folderButton = h('button', { class: 'ph-folder', type: 'button', onclick: async () => {
    const node = await pickFile(openWindow, { kind: 'folder', title: t('convert.pickFolder.title'), text: t('convert.pickFolder.text') });
    if (node) { folderId = node.id; showFolder(); }
  } }, glyph('folder'), folderLabel);
  const showFolder = () => {
    const node = fs.get(folderId);
    folderLabel.textContent = node ? (folderId === fs.root ? t('folder.home') : node.name) : t('convert.chooseFolder');
    folderButton.title = node ? fs.path(folderId) : '';
  };
  const showFormat = () => {
    qualityRow.classList.toggle('off', !format.lossy);
    qualityInput.disabled = !format.lossy;
    note.textContent = format.note;
  };
  showFolder();
  showFormat();
  return openSheet(win, {
    title, okLabel, focus: nameField,
    rows: [
      row(t('convert.format'), segmented({
        value: format.id, label: t('convert.format'), options: formats.map(f => ({ value: f.id, label: f.label })),
        onChange: v => {
          format = formats.find(f => f.id === v);
          nameField.value = `${nameField.value.replace(/\.[^.]+$/, '') || base}.${format.ext}`;
          showFormat();
        },
      })),
      qualityRow,
      row(t('convert.name'), nameField),
      h('div', { class: 'ph-row' }, h('span', { class: 'ph-row-label' }, t('convert.folder')), folderButton),
      h('div', { class: 'ph-row' }, h('span', { class: 'ph-row-label' }, t('convert.openAfter')), toggle({ value: open, label: t('convert.openAfterLabel'), onChange: v => { open = v; } })),
      note,
    ],
    collect: () => {
      const node = fs.get(folderId);
      const fileName = nameField.value.trim();
      if (!node || node.type !== 'folder') { note.textContent = t('convert.noFolder'); return undefined; }
      if (!fileName || fileName.includes('/')) { note.textContent = t('convert.badName'); nameField.focus(); return undefined; }
      return { format, quality: quality / 100, name: fileName, folder: folderId, open };
    },
  });
}
