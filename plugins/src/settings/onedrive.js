import { storage, net, toggle, selectField, textField } from '@lilos/sdk';
import { t } from './i18n.js';

/**
 * Control Panel → OneDrive: the user's own preferences (cloud.js draws the tab, with the module's
 * settings for everyone): where «Carica su OneDrive e apri» puts files (connection, folder, a file
 * with the same name) and whether a double click opens Office documents of OneDrive in Office
 * online (storage 'onedrive', the File Manager reads it).
 */
const KEY = 'onedrive';
const DEFAULTS = { mount: null, folder: '/lilOS', ifExists: 'ask', doubleClick: true };

function prefs() {
  const saved = storage.get(KEY, {}) ?? {};
  return { ...DEFAULTS, ...(saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}) };
}

const setPref = (key, value) => storage.set(KEY, { ...prefs(), [key]: value });

/** The sections of the user's own preferences. */
export const oneDriveSections = () => [uploadSection(), officeSection()];

/** Carica su OneDrive e apri: which connection, which folder, a file with the same name there. */
function uploadSection() {
  const p = prefs();
  const mounts = net.mounts().filter(m => m.protocol === 'onedrive');
  return {
    title: t('onedrive.upload.title'),
    rows: [
      {
        label: t('onedrive.upload.mount.label'), description: mounts.length ? t('onedrive.upload.mount.description') : t('onedrive.upload.mount.none'),
        keywords: t('cloud.onedrive.keywords'),
        control: () => {
          const options = [{ value: '', label: t('onedrive.upload.mount.ask') }, ...mounts.map(m => ({ value: m.id, label: `${m.name} · ${m.values?.account ?? m.address}` }))];
          const el = selectField({ value: mounts.some(m => m.id === p.mount) ? p.mount : '', options, label: t('onedrive.upload.mount.label'), onChange: v => setPref('mount', v || null) });
          el.disabled = !mounts.length;
          return el;
        },
      },
      {
        label: t('onedrive.upload.folder.label'), description: t('onedrive.upload.folder.description'), keywords: t('cloud.onedrive.keywords'),
        control: () => {
          const field = textField({ value: p.folder, placeholder: DEFAULTS.folder, label: t('onedrive.upload.folder.label'), onChange: v => setPref('folder', cleanFolder(v)) });
          field.classList.add('od-text');
          return field;
        },
      },
      {
        label: t('onedrive.upload.exists.label'), description: t('onedrive.upload.exists.description'), keywords: t('cloud.onedrive.keywords'),
        control: () => selectField({
          value: p.ifExists, label: t('onedrive.upload.exists.label'),
          options: [
            { value: 'ask', label: t('onedrive.upload.exists.ask') },
            { value: 'keep', label: t('onedrive.upload.exists.keep') },
            { value: 'replace', label: t('onedrive.upload.exists.replace') },
          ],
          onChange: v => setPref('ifExists', v),
        }),
      },
    ],
  };
}

/** The double click on an Office document of OneDrive. */
function officeSection() {
  return {
    title: t('onedrive.office.title'),
    rows: [{
      label: t('onedrive.office.doubleClick.label'), description: t('onedrive.office.doubleClick.description'), keywords: t('cloud.onedrive.keywords'),
      control: () => toggle({ value: prefs().doubleClick !== false, label: t('onedrive.office.doubleClick.label'), onChange: v => setPref('doubleClick', v) }),
    }],
  };
}

/** 'Lavoro\\2026 ' → '/Lavoro/2026'; '' → the default. */
function cleanFolder(raw) {
  const parts = String(raw ?? '').split(/[/\\]+/).map(s => s.trim()).filter(s => s && s !== '.' && s !== '..');
  return parts.length ? `/${parts.join('/')}` : DEFAULTS.folder;
}

