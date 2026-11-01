import { settings } from '@lilos/sdk';
import { notify } from '../notifications/notify.js';

/**
 * The user's profile photo, saved in the 'userPhoto' setting as a small square JPEG (data: URL).
 * Every avatar of the user in lilOS's chrome (class 'user-avatar': taskbar, menu, user page)
 * shows it through the --user-photo variable on the root; without one they keep the initials.
 */
const SIZE = 192;                 // side of the saved photo, in pixels
const MAX_FILE = 25 << 20;        // larger images are not opened
const MAX_SAVED = 200_000;        // longer saved values are ignored
// Stored values are untrusted: only base64 reaches the stylesheet
const VALID = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;

/** The saved photo (data: URL), or '' if there is none or it is not valid. */
export function userPhoto() {
  const value = settings.get('userPhoto');
  return value.length <= MAX_SAVED && VALID.test(value) ? value : '';
}

const root = document.documentElement;
settings.watch('userPhoto', () => {
  const photo = userPhoto();
  if (photo) {
    root.style.setProperty('--user-photo', `url("${photo}")`);
    root.dataset.userPhoto = '';
  } else {
    root.style.removeProperty('--user-photo');
    delete root.dataset.userPhoto;
  }
});

/** Asks for an image on the computer and saves it, cut to a centred square, as the photo. */
export function choosePhoto() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE) return notify('Questa immagine è troppo grande: scegline una sotto i 25 MB', { level: 'warning' });
    try {
      settings.set('userPhoto', await squareJpeg(file));
    } catch {
      notify(`“${file.name}” non si apre come immagine`, { level: 'error' });
    }
  });
  input.click();
}

export function removePhoto() {
  settings.set('userPhoto', '');
}

async function squareJpeg(file) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = Object.assign(document.createElement('canvas'), { width: SIZE, height: SIZE });
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';   // under transparent PNGs
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.86);
}
