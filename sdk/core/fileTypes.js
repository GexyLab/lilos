import { locale } from './locale.js';

const TYPES = [
  { key: 'text', exts: ['txt', 'md', 'rtf'], color: '#3b6ef5' },
  { key: 'pdf', exts: ['pdf'], color: '#e5484d' },
  { key: 'document', exts: ['doc', 'docx', 'odt'], color: '#2f63c9' },
  { key: 'spreadsheet', exts: ['csv', 'xls', 'xlsx', 'ods'], color: '#30a46c' },
  { key: 'presentation', exts: ['ppt', 'pptx', 'odp'], color: '#d9622b' },
  { key: 'image', exts: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'], color: '#d9922b' },
  { key: 'audio', exts: ['mp3', 'wav', 'ogg', 'flac'], color: '#8e4ec6' },
  { key: 'video', exts: ['mp4', 'mov', 'webm', 'mkv'], color: '#c2417a' },
  { key: 'archive', exts: ['zip', 'rar', '7z', 'tar', 'gz'], color: '#6b7280' },
  { key: 'code', exts: ['html', 'css', 'js', 'ts', 'json', 'py'], color: '#0d9488' },
  { key: 'term', exts: ['term'], color: '#2b3038' },
  { key: 'nettest', exts: ['nettest'], color: '#c2410c' },
];

const { t } = locale.define('lilos:fileTypes', {
  en: { strings: {
    text: 'Text', pdf: 'PDF', document: 'Document', spreadsheet: 'Spreadsheet', presentation: 'Presentation', image: 'Image',
    audio: 'Audio', video: 'Video', archive: 'Archive', code: 'Code', term: 'Terminal connection', nettest: 'NetTest collection', file: 'File',
  } },
  it: { strings: {
    text: 'Testo', pdf: 'PDF', document: 'Documento', spreadsheet: 'Foglio di calcolo', presentation: 'Presentazione', image: 'Immagine',
    audio: 'Audio', video: 'Video', archive: 'Archivio', code: 'Codice', term: 'Collegamento terminale', nettest: 'Collezione di NetTest', file: 'File',
  } },
});

export function splitName(name) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? [name.slice(0, dot), name.slice(dot + 1)] : [name, ''];
}

/** Type info from a file name: label (in the system's language), color and the short badge shown on the icon. */
export function fileType(name) {
  const ext = splitName(name)[1].toLowerCase();
  const type = TYPES.find(x => x.exts.includes(ext));
  return {
    ext,
    badge: ext.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4),
    label: t(type?.key ?? 'file'),
    color: type?.color ?? '#6b7280',
  };
}

/** Every known type group: [{ label, color, exts }] (copies; labels in the system's language). */
export const fileTypeList = () => TYPES.map(x => ({ label: t(x.key), color: x.color, exts: [...x.exts] }));
