import * as sdk from '@lilos/sdk';   // `term`: missing in older lilOS, so not imported by name
import { pickFile } from '@lilos/system';
import { fieldsForm } from '../../shared/fieldsForm.js';
import { t } from '../i18n.js';

const { h, icon, fs, uid } = sdk;

/**
 * The dialogs of the remote sessions, message boxes over Terminal's window: a host to add or
 * change, a recording to start. Each returns a promise of what the user chose (null: cancelled).
 * The server key to confirm is the shared trustPrompt (RemoteTab.js).
 */

/** A labelled control of a dialog, drawn like the fields of fieldsForm; beside: on its right (a button). */
export const fieldRow = (label, control, { beside = null, hint = null } = {}) => {
  control.id ||= `tm-c-${uid()}`;
  return h('div', { class: 'sh-field' }, h('label', { for: control.id }, label),
    beside ? h('div', { class: 'sh-field-pick' }, control, beside) : control,
    hint && h('small', { class: 'sh-field-hint' }, hint));
};

/**
 * A host to add (host null; prefill: { protocol, values } from a command line) or change.
 * Saves it itself. Resolves { action: 'save' | 'connect' | 'delete', host } or null.
 */
export async function hostDialog(owner, host = null, prefill = null) {
  const text = label => sdk.term.text(label);
  const { protocols, encodings, hosts } = owner.data;
  let protocol = host?.protocol ?? prefill?.protocol ?? protocols[0]?.id;
  const settings = { term: 'xterm-256color', encoding: 'utf-8', backspace: 'del', ...(host?.settings ?? {}) };
  const name = h('input', { class: 'ctl-text', type: 'text', value: host?.name ?? '', maxLength: 60 });
  const folders = [...new Set(hosts.map(x => x.folder).filter(Boolean))];
  const listId = `tm-folders-${uid()}`;
  const folder = h('input', { class: 'ctl-text', type: 'text', value: host?.folder ?? '', maxLength: 60, list: listId, placeholder: t('remote.host.folderNone') });
  const select = h('select', { class: 'ctl-select', disabled: !!host }, ...protocols.map(p => h('option', { value: p.id, selected: p.id === protocol }, text(p.label))));
  const remember = h('label', { class: 'tm-check' }, h('input', { type: 'checkbox', checked: host ? host.remembered : true }), t('remote.host.remember'));
  const term = h('input', { class: 'ctl-text', type: 'text', value: settings.term, maxLength: 40, spellcheck: 'false' });
  const encoding = h('select', { class: 'ctl-select' }, ...encodings.map(e => h('option', { value: e, selected: e === settings.encoding }, e.toUpperCase())));
  const backspace = h('select', { class: 'ctl-select' }, h('option', { value: 'del', selected: settings.backspace === 'del' }, t('remote.host.backspaceDel')), h('option', { value: 'bs', selected: settings.backspace === 'bs' }, t('remote.host.backspaceBs')));
  const proto = () => protocols.find(p => p.id === protocol);

  // The protocol's own fields (the kernel describes them): a new form for each protocol
  const fieldsBox = h('div');
  let form = null;
  const drawFields = values => {
    const p = proto();
    if (!p) { form = null; return fieldsBox.replaceChildren(h('p', {}, t('remote.host.noProtocols'))); }
    form = fieldsForm(p.fields, {
      t, values, text, editing: !!host?.remembered, pairs: [['host', 'port']], filePlaceholder: '~/.ssh/id_ed25519',
      pickFile: options => pickFile(owner.openWindow, options),
      after: v => [
        !(p.secure ?? (protocol === 'telnet' ? v.tls === true : false)) && h('div', { class: 'tm-note' }, h('b', {}, icon('lockOpen'), t('remote.host.insecureTitle')), t('remote.host.insecureText')),
        p.fields.some(f => f.secret) && remember,
      ],
    });
    fieldsBox.replaceChildren(form.el);
  };
  drawFields({ ...(host?.values ?? prefill?.values ?? {}) });
  select.addEventListener('change', () => {
    const before = form?.all() ?? {};
    protocol = select.value;
    // What the new protocol has too stays
    drawFields(Object.fromEntries(Object.entries(before).filter(([k]) => proto()?.fields.some(f => f.key === k && !f.secret))));
  });

  let saved = null;
  const answer = sdk.messageBox(owner.win, {
    title: t(host ? 'remote.host.editTitle' : 'remote.host.newTitle'),
    width: 440,
    content: h('div', { class: 'sh-fields tm-host' },
      fieldRow(t('remote.host.name'), name),
      h('div', { class: 'tm-grid2b' },
        fieldRow(t('remote.host.protocol'), select),
        fieldRow(t('remote.host.folder'), folder)),
      h('datalist', { id: listId }, ...folders.map(f => h('option', { value: f }))),
      fieldsBox,
      h('details', {}, h('summary', {}, t('remote.host.advanced')),
        h('div', { class: 'sh-fields' },
          h('div', { class: 'tm-grid2b' }, fieldRow(t('remote.host.term'), term), fieldRow(t('remote.host.encoding'), encoding)),
          fieldRow(t('remote.host.backspace'), backspace)))),
    buttons: [
      host && { value: 'delete', label: t('remote.host.delete'), danger: true },
      'cancel',
      { value: 'save', label: t('remote.host.save') },
      { value: 'connect', label: t('remote.host.saveConnect'), primary: true },
    ].filter(Boolean),
    // Saved (or deleted) before the box closes: what goes wrong is said in it
    validate: async (_, button) => {
      if (button === 'delete') {
        await sdk.term.removeHost(host.id);
        return true;
      }
      if (!form) return t('remote.host.noProtocols');
      let read;
      try {
        read = await form.read();
      } catch (err) {
        return t('remote.host.keyUnreadable', { error: err.message });
      }
      saved = await sdk.term.saveHost(host?.id ?? null, {
        name: name.value, folder: folder.value, values: read.values,
        settings: { term: term.value.trim() || 'xterm-256color', encoding: encoding.value, backspace: backspace.value },
        remember: remember.querySelector('input').checked,
        ...(!host && { protocol }),
      }, read.secret);
    },
  });
  name.focus();
  const button = await answer;
  if (button === 'delete') return { action: 'delete', host };
  return button === 'save' || button === 'connect' ? { action: button, host: saved } : null;
}

/** Where to record a session: { path, folder, name, colors } or null. */
export async function recordDialog(owner, sessionName) {
  const now = new Date();
  const two = n => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())} ${two(now.getHours())}.${two(now.getMinutes())}`;
  const safe = fs.cleanName(String(sessionName), { portable: true }).slice(0, 60).trim();
  let choice = null;
  const { button } = await sdk.messageBox(owner.win, {
    title: t('remote.record.title'),
    fields: [
      { name: 'path', label: t('remote.record.file'), value: `~/Documenti/${[safe, stamp].filter(Boolean).join(' ')}.txt`, hint: t('remote.record.hint') },
      { name: 'colors', type: 'checkbox', label: t('remote.record.colors') },
    ],
    buttons: ['cancel', { value: 'start', label: t('remote.record.start'), primary: true }],
    validate: ({ path, colors }) => {
      const p = path.trim().replace(/\/+$/, '');
      const cut = p.lastIndexOf('/');
      const dir = cut > 0 ? fs.resolve(p.slice(0, cut)) : null;
      const name = p.slice(cut + 1);
      if (!dir || dir.type !== 'folder' || !name) return t('remote.record.badPath');
      if (fs.children(dir.id).some(n => n.name === name)) return t('remote.record.exists', { name });
      choice = { path: p, folder: dir.id, name, colors };
    },
  });
  return button === 'start' ? choice : null;
}
