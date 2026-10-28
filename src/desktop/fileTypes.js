const TYPES = [
  { exts: ['txt', 'md', 'rtf'], label: 'Testo', color: '#3b6ef5' },
  { exts: ['pdf'], label: 'PDF', color: '#e5484d' },
  { exts: ['doc', 'docx', 'odt'], label: 'Documento', color: '#2f63c9' },
  { exts: ['csv', 'xls', 'xlsx', 'ods'], label: 'Foglio di calcolo', color: '#30a46c' },
  { exts: ['ppt', 'pptx', 'odp'], label: 'Presentazione', color: '#d9622b' },
  { exts: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'], label: 'Immagine', color: '#d9922b' },
  { exts: ['mp3', 'wav', 'ogg', 'flac'], label: 'Audio', color: '#8e4ec6' },
  { exts: ['mp4', 'mov', 'webm', 'mkv'], label: 'Video', color: '#c2417a' },
  { exts: ['zip', 'rar', '7z', 'tar', 'gz'], label: 'Archivio', color: '#6b7280' },
  { exts: ['html', 'css', 'js', 'ts', 'json', 'py'], label: 'Codice', color: '#0d9488' },
];

export function splitName(name) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? [name.slice(0, dot), name.slice(dot + 1)] : [name, ''];
}

/** Type info from a file name: label, color and the short badge shown on the icon. */
export function fileType(name) {
  const ext = splitName(name)[1].toLowerCase();
  const type = TYPES.find(t => t.exts.includes(ext));
  return {
    ext,
    badge: ext.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4),
    label: type?.label ?? 'File',
    color: type?.color ?? '#6b7280',
  };
}
