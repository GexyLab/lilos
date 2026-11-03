/**
 * FileCrypt: encrypts single files with a password. An installable app (sdk 2), not part of lilOS:
 * it uses the pipes of file.open, file.read and file.write for the files it marked (node.apps.filecrypt),
 * so an encrypted file keeps its name and opens in its own app once unlocked, and saves encrypted again.
 * Its entry points are the exports here (see the manifest, app.json).
 */
export { main, unlock, encrypt } from './windows.js';
export { vault } from './vault.js';
