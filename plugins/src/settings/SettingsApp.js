import { SettingsWindow, settings, shortcuts, shortcutField, storage, session, fs, tags, TAG_COLORS, menus, fileTypeList, toggle, swatches, segmented, selectField, textField, actionButton, toast, h, kernel, SDK_VERSION, apps as packages, formatBytes as bytesText } from '@lilos/sdk';
import * as sdk from '@lilos/sdk';   // locale, LANGUAGES, notifications: missing in older lilOS, so not imported by name
import { executionMode, canChangeExecution, showAppSecurity } from '@lilos/system';
import { setTag } from '@lilos/system';
import { version } from '@lilos/system';
import { ACCENTS, LASSO_OPTIONS, RETENTION_OPTIONS } from '@lilos/system';
import { apps, launch } from '@lilos/system';
import { fileApps, appFor, defaultAppFor, setAppFor, resetAppsFor, knownExtensions } from '@lilos/system';
import { workspaceManager } from '@lilos/system';
import * as system from '@lilos/system';   // DESK_FIXED_ITEMS, isFixedShown, setFixedShown: missing in older lilOS, so not imported by name
import { WORKSPACE_LIMITS } from '@lilos/system';
import { menuSections } from './menuEditor.js';
import { startupOptionsSections, startupAppsSections } from './startup.js';
import { servicesSections, watchServices } from './services.js';
import { pipeSections, watchPipes } from './pipes.js';
import { cloudTabs, isCloudTab, reloadCloud } from './cloud.js';
import { creditsSections } from './credits.js';
import { computerTab } from './computer.js';
import { networkTab } from './network.js';
import { storageTab, watchStorage, reloadStorage } from './storage.js';
import { t, i18n } from './i18n.js';
import './settings-app.css';

let view = null;   // the open SettingsView, to redraw after resets

/** A workspace (the current one or another): name, color, what it made, its apps and fixed desk items. */
function workspaceSections(id) {
  const ws = workspaceManager();
  const cur = ws?.list().find(w => w.id === id);
  if (!cur) return [];
  return [
    {
      title: t('workspaces.current.title'),
      rows: [
        {
          label: t('common.name'), keywords: t('workspaces.name.keywords'),
          control: () => {
            const field = textField({ value: cur.name, label: t('workspaces.name.field'), onChange: v => ws.rename(cur.id, v) });
            field.maxLength = WORKSPACE_LIMITS.MAX_NAME;
            return field;
          },
        },
        // lilOS before 2026-11-01 has no workspace descriptions
        ws.setDescription && {
          label: t('workspaces.description.label'), description: t('workspaces.description.description'), keywords: t('workspaces.description.keywords'),
          control: () => {
            const field = textField({ value: cur.description ?? '', placeholder: t('workspaces.description.placeholder'), label: t('workspaces.description.field'), onChange: v => ws.setDescription(cur.id, v) });
            field.maxLength = WORKSPACE_LIMITS.MAX_DESCRIPTION ?? 200;
            return field;
          },
        },
        {
          label: t('common.color'), description: t('workspaces.color.description'), keywords: t('workspaces.color.keywords'),
          control: () => swatches({ value: cur.color, colors: ACCENTS, onChange: v => ws.setColor(cur.id, v) }),
        },
        {
          label: t('workspaces.owned.label'), description: t('workspaces.owned.description'),
          control: String(ws.ownedCount(cur.id)),
        },
        id !== ws.currentId && {
          label: t('workspaces.switch.label'), keywords: t('workspaces.list.keywords'),
          control: () => actionButton({ label: t('workspaces.list.switch'), onClick: () => ws.switchTo(id) }),
        },
      ].filter(Boolean),
    },
    {
      title: t('workspaces.apps.title'),
      rows: apps.map(app => ({
        label: app.name,
        description: app.system ? t('workspaces.apps.system') : t('workspaces.apps.installed'),
        keywords: t('workspaces.apps.keywords', { name: app.name }),
        control: app.system ? t('workspaces.apps.alwaysVisible') : () => toggle({
          value: ws.isInstalled(app.id, id),
          label: id === ws.currentId ? t('workspaces.apps.toggle', { name: app.name }) : t('workspaces.apps.toggleIn', { name: app.name, workspace: cur.name }),
          onChange: v => ws.setInstalled(app.id, v, id),
        }),
      })),
    },
    ...workspaceFixedSections(id),
  ];
}

/**
 * Secondary tabs of Workspace: this one, one per other workspace (named after it), all of them.
 * The same objects at every render, as SettingsView needs to know which one is shown.
 */
const currentTab = { id: 'current', get label() { return t('workspaces.current.label'); }, sections: () => workspaceSections(workspaceManager()?.currentId) };
const allTab = { id: 'all', get label() { return t('workspaces.all.label'); }, sections: allWorkspacesSections };
const otherTabs = new Map();   // workspace id → its tab

function workspaceSubtabs() {
  const ws = workspaceManager();
  const others = (ws?.list() ?? []).filter(w => w.id !== ws.currentId).map(w => {
    if (!otherTabs.has(w.id)) {
      otherTabs.set(w.id, { id: `ws-${w.id}`, get label() { return workspaceManager()?.describe(w.id)?.name ?? ''; }, sections: () => workspaceSections(w.id) });
    }
    return otherTabs.get(w.id);
  });
  return [currentTab, ...others, allTab];
}

/** lilOS has this setting (an older one throws on keys it never defined). */
function hasSetting(key) {
  try { settings.get(key); return true; } catch { return false; }
}

/** Every workspace: change to it, delete it; make a new one; how the taskbar shows them. */
function allWorkspacesSections() {
  const ws = workspaceManager();
  if (!ws) return [];
  const list = ws.list();
  return [
    // lilOS before 1.20.0 shows only the current workspace in the taskbar
    hasSetting('taskbarWorkspaces') && {
      title: t('workspaces.taskbar.title'),
      rows: [{
        label: t('workspaces.taskbar.label'), description: t('workspaces.taskbar.description'), keywords: t('workspaces.taskbar.keywords'),
        control: segmented({
          value: settings.get('taskbarWorkspaces') === 'all' ? 'all' : 'current', label: t('workspaces.taskbar.label'),
          options: [{ value: 'current', label: t('workspaces.taskbar.current') }, { value: 'all', label: t('workspaces.taskbar.all') }],
          onChange: v => settings.set('taskbarWorkspaces', v),
        }),
      }],
    },
    {
      title: t('workspaces.label'),
      rows: [
        ...list.map(w => {
          const current = w.id === ws.currentId;
          const installed = apps.filter(a => ws.isInstalled(a.id, w.id)).length;
          return {
            label: current ? t('workspaces.list.current', { name: w.name }) : w.name,
            description: `${t('workspaces.list.owned', { n: ws.ownedCount(w.id) })} · ${t('workspaces.list.apps', { n: installed })}`,
            keywords: t('workspaces.list.keywords'),
            control: () => h('div', { class: 'ws-settings-actions' },
              current ? null : actionButton({ label: t('workspaces.list.switch'), onClick: () => ws.switchTo(w.id) }),
              list.length > 1 ? confirmButton(t('common.delete'), t('common.deleteNow'), () => ws.remove(w.id)) : null),
          };
        }),
        {
          label: t('workspaces.new.label'), description: t('workspaces.new.description'),
          control: actionButton({ label: t('common.create'), onClick: () => { const id = ws.create(); if (id) ws.switchTo(id); } }),
        },
      ],
    },
    ...allFixedSections(),
    {
      title: t('workspaces.deleting.title'),
      rows: [
        { label: t('workspaces.deleting.files.label'), description: t('workspaces.deleting.files.description') },
        { label: t('workspaces.deleting.windows.label'), description: t('workspaces.deleting.windows.description') },
      ],
    },
  ].filter(Boolean);
}

/** Bound toggle for a boolean setting. */
let pendingTagFor = [];   // items to put the next tag made here on (from Tag → Nuovo tag…)

/** Creating tags, and one section per tag: name, color, visible, its items, delete. */
function tagSections() {
  const create = field => {
    try {
      const tag = tags.create({ name: field.value });
      if (pendingTagFor.length) setTag(pendingTagFor, tag.id, true);
      pendingTagFor = [];
    } catch (err) {
      toast(err.message);
      field.focus();
    }
  };
  const pending = pendingTagFor.filter(id => fs.exists(id)).length;
  return [
    {
      title: t('tags.new.title'),
      rows: [{
        label: t('common.name'),
        description: pending ? t('tags.new.pending', { n: pending }) : t('tags.new.description'),
        keywords: t('tags.new.keywords'),
        control: () => {
          const field = textField({ placeholder: t('tags.new.placeholder'), label: t('tags.new.field') });
          field.maxLength = 30;
          field.classList.add('tag-new-name');
          field.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); create(field); } });
          return h('div', { class: 'tag-settings-actions' }, field, actionButton({ label: t('common.create'), primary: true, onClick: () => create(field) }));
        },
      }],
    },
    ...tags.list().map(tag => ({
      title: tag.name,
      rows: [
        {
          label: t('common.name'), keywords: t('tags.name.keywords'),
          control: () => {
            const field = textField({
              value: tag.name, label: t('tags.name.field', { name: tag.name }),
              onChange: v => { try { tags.rename(tag.id, v); } catch (err) { toast(err.message); field.value = tags.get(tag.id)?.name ?? ''; } },
            });
            field.maxLength = 30;
            return field;
          },
        },
        { label: t('common.color'), keywords: t('tags.color.keywords'), control: () => swatches({ value: tag.color, colors: TAG_COLORS, onChange: v => tags.setColor(tag.id, v) }) },
        {
          label: t('tags.visible.label'),
          description: tag.visible ? t('tags.visible.on') : t('tags.visible.off'),
          keywords: t('tags.visible.keywords'),
          control: () => toggle({ value: tag.visible, label: t('tags.visible.toggle', { name: tag.name }), onChange: v => tags.setVisible(tag.id, v) }),
        },
        {
          label: t('common.items'), description: t('tags.items.description', { n: fs.tagged(tag.id).length }),
          control: () => h('div', { class: 'tag-settings-actions' },
            actionButton({ label: t('tags.items.show'), onClick: () => launch('files', { tag: tag.id }) }),
            confirmButton(t('common.delete'), t('tags.items.delete'), () => tags.remove(tag.id))),
        },
      ],
    })),
  ];
}

/** Fixed items whose name and description are in locales.json (desk.fixed.item.<key>.…). */
const TRANSLATED_FIXED = ['home', 'documents', 'images', 'files', 'downloads', 'trash'];

/**
 * A fixed item with its name and description in the system's language. lilOS gives them in
 * Italian; one Sistema does not know keeps those.
 */
function translatedFixed(f) {
  if (!TRANSLATED_FIXED.includes(f.key)) return f;
  return { ...f, name: t(`desk.fixed.item.${f.key}.name`), description: t(`desk.fixed.item.${f.key}.description`) };
}

/**
 * The fixed items of the desks (lilOS's list: none in older versions), with what `row(item)` adds
 * to each one's row (control, description).
 */
function fixedItemsSections(description, row) {
  const fixed = (system.DESK_FIXED_ITEMS ?? []).map(translatedFixed);
  if (!fixed.length) return [];
  return [{
    title: t('desk.fixed.title'),
    rows: [
      { label: t('desk.fixed.label'), description },
      ...fixed.map(f => ({ label: f.name, description: f.description, keywords: t('desk.fixed.keywords', { name: f.name }), ...row(f) })),
    ],
  }];
}

/** lilOS keeps the fixed items of each workspace apart (older ones: one choice for every desk). */
const fixedPerWorkspace = () => typeof system.setFixedShownEverywhere === 'function';

/** The fixed items of one workspace's desk, each one on or off there. */
function workspaceFixedSections(id) {
  if (!fixedPerWorkspace()) return [];
  const ws = workspaceManager();
  // Another workspace's tab: its name in the label, for screen readers
  const label = name => (id === ws?.currentId ? t('desk.fixed.toggle', { name }) : t('desk.fixed.toggleIn', { name, workspace: ws?.describe(id)?.name ?? '' }));
  return fixedItemsSections(t('desk.fixed.descriptionWorkspace'), f => ({
    control: () => toggle({ value: system.isFixedShown(f.key, id), label: label(f.name), onChange: v => system.setFixedShown(f.key, v, id) }),
  }));
}

/**
 * The fixed items of every desk: each one turned on or off in all the workspaces at once (and in
 * new ones). In older lilOS, the single choice for every desk, or just the list (always on).
 */
function allFixedSections() {
  const ws = workspaceManager();
  if (fixedPerWorkspace() && ws) {
    const list = ws.list();
    return fixedItemsSections(t('desk.fixed.descriptionAll'), f => {
      const on = list.filter(w => system.isFixedShown(f.key, w.id)).length;
      return {
        description: on && on < list.length ? t('desk.fixed.some', { on, n: list.length }) : f.description,
        control: () => toggle({ value: on === list.length, label: t('desk.fixed.toggleAll', { name: f.name }), onChange: v => system.setFixedShownEverywhere(f.key, v) }),
      };
    });
  }
  const switchable = typeof system.setFixedShown === 'function';
  return fixedItemsSections(switchable ? t('desk.fixed.descriptionSwitchable') : t('desk.fixed.description'), f => ({
    control: switchable
      ? () => toggle({ value: system.isFixedShown(f.key), label: t('desk.fixed.toggle', { name: f.name }), onChange: v => system.setFixedShown(f.key, v) })
      : t('desk.fixed.always'),
  }));
}

/** Where the fixed items went (Scrivania → Elementi had them before they were per workspace). */
function deskFixedSections() {
  if (!(system.DESK_FIXED_ITEMS ?? []).length) return [];
  return [{
    title: t('desk.fixed.title'),
    rows: [{
      label: t('desk.fixed.moved.label'), description: t('desk.fixed.moved.description'), keywords: t('desk.fixed.moved.keywords'),
      control: () => actionButton({ label: t('desk.fixed.moved.open'), onClick: () => view?.select('workspaces', 'current') }),
    }],
  }];
}

/** A color of one's own: the browser's color picker, set when it closes. */
function colorField(value, onChange) {
  const input = h('input', { class: 'desk-color-field', type: 'color', 'aria-label': t('desk.background.custom.label') });
  input.value = /^#[0-9a-f]{6}$/i.test(value) ? value : '#1f2227';
  input.addEventListener('change', () => onChange(input.value));
  return input;
}

/**
 * Scrivania → Sfondo: the desk's color (lilOS setting deskColor, '' for the theme's) and the image
 * behind it (lilOS desktop/wallpaper.js: chosen here, or with «Usa come sfondo desktop» in the
 * menu of an image on the desk). Only a lilOS that has them shows this tab.
 */
function deskBackgroundSections(openWindow) {
  const color = settings.get('deskColor');
  const image = system.wallpaperInfo();
  const choose = async () => {
    const node = await system.pickFile(openWindow, { title: t('desk.background.image.pick'), exts: system.WALLPAPER_EXTS });
    if (node) await system.setWallpaper(node.id);
  };
  return [
    {
      title: t('desk.background.color.title'),
      rows: [
        {
          label: t('common.color'), description: t('desk.background.color.description'), keywords: t('desk.background.color.keywords'),
          control: () => {
            const el = swatches({ value: color, colors: system.DESK_COLORS, onChange: v => settings.set('deskColor', v) });
            el.classList.add('desk-color-swatches');
            return el;
          },
        },
        {
          label: t('desk.background.custom.label'), description: t('desk.background.custom.description'), keywords: t('desk.background.color.keywords'),
          control: () => colorField(color, v => settings.set('deskColor', v)),
        },
        color && {
          label: t('desk.background.theme.label'), description: t('desk.background.theme.description'),
          control: () => actionButton({ label: t('desk.background.theme.button'), onClick: () => settings.set('deskColor', '') }),
        },
      ].filter(Boolean),
    },
    {
      title: t('desk.background.image.title'),
      rows: [
        {
          label: t('desk.background.image.label'), keywords: t('desk.background.image.keywords'),
          description: image ? t('desk.background.image.current', { name: image.name }) : t('desk.background.image.none'),
          control: () => actionButton({ label: t('desk.background.image.choose'), spinner: true, onClick: choose }),
        },
        image && {
          label: t('desk.background.image.remove.label'), description: t('desk.background.image.remove.description'),
          control: () => actionButton({ label: t('desk.background.image.remove.button'), onClick: () => system.clearWallpaper() }),
        },
      ].filter(Boolean),
    },
  ];
}

const settingToggle = key => () => toggle({ value: settings.get(key), onChange: v => settings.set(key, v) });

/** Groups and items of the user page whose names and descriptions are in locales.json (userPage.…). */
const TRANSLATED_USER_PAGE = {
  groups: ['header', 'actions', 'account', 'session', 'footer'],
  items: ['details', 'lock', 'logout', 'restart', 'photo', 'theme', 'language', 'settings', 'workspace', 'windows', 'startup', 'storage', 'about'],
};

/**
 * What the page opened from the user's name shows (lilOS's lists: none in older versions), one
 * switch per item, a section per group. Items Control Panel does not know keep lilOS's Italian texts.
 */
function userPageSections() {
  const items = system.USER_PAGE_ITEMS ?? [];
  const groupName = g => (TRANSLATED_USER_PAGE.groups.includes(g.key) ? t(`userPage.group.${g.key}`) : g.name);
  const texts = i => (TRANSLATED_USER_PAGE.items.includes(i.key)
    ? { name: t(`userPage.item.${i.key}.name`), description: t(`userPage.item.${i.key}.description`) }
    : i);
  return [
    { title: t('userPage.title'), rows: [{ label: t('userPage.open.label'), description: t('userPage.open.description') }] },
    ...(system.USER_PAGE_GROUPS ?? []).map(g => ({
      title: groupName(g),
      rows: items.filter(i => i.group === g.key).map(i => {
        const { name, description } = texts(i);
        return {
          label: name, description, keywords: t('userPage.keywords', { name }),
          control: () => toggle({ value: system.isUserPageShown(i.key), label: t('userPage.toggle', { name }), onChange: v => system.setUserPageShown(i.key, v) }),
        };
      }),
    })).filter(section => section.rows.length),
  ];
}

// Shortcut groups by the first word of their commands' ids (the names are in the system's language)
const GROUP_ORDER = ['system', 'desk', 'items', 'windows'];

/** One section per type group (Testo, Codice…), one row per extension, with the app that opens it. */
function fileTypeSections() {
  const known = new Set(knownExtensions());
  const listed = new Set();
  const row = ext => {
    listed.add(ext);
    const fallback = defaultAppFor(ext);
    return {
      label: ext ? `.${ext}` : t('fileTypes.noExtension'),
      description: fallback ? t('fileTypes.default', { app: fallback.name }) : t('fileTypes.noDefault'),
      keywords: t('fileTypes.keywords', { ext }),
      control: () => selectField({
        value: appFor(ext)?.id ?? 'ask', label: ext ? t('fileTypes.field', { ext }) : t('fileTypes.fieldNoExtension'),
        options: [{ value: 'ask', label: t('fileTypes.ask') }, ...fileApps().map(a => ({ value: a.id, label: a.name }))],
        onChange: v => setAppFor(ext, v),
      }),
    };
  };
  const groups = fileTypeList()
    .map(t => ({ title: t.label, rows: t.exts.filter(e => known.has(e)).map(row) }))
    .filter(g => g.rows.length);
  const others = [...known].filter(e => !listed.has(e)).sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)));
  return [
    {
      title: t('fileTypes.title'),
      rows: [{
        label: t('fileTypes.all.label'),
        description: t('fileTypes.all.description'),
        control: confirmButton(t('fileTypes.all.reset'), t('common.confirm'), () => { resetAppsFor(); view?.render(); }),
      }],
    },
    ...groups,
    ...(others.length ? [{ title: t('fileTypes.others'), rows: others.map(row) }] : []),
  ];
}

/** Deleting files and folders, and how long the trash keeps them. */
function trashSections() {
  const items = fs.trashed();
  const bytes = items.reduce((sum, n) => sum + n.bytes, 0);
  return [
    {
      title: t('trash.deleting.title'),
      rows: [
        {
          label: t('trash.confirm.label'), description: t('trash.confirm.description'),
          keywords: t('trash.confirm.keywords'), control: settingToggle('deleteConfirm'),
        },
        {
          label: t('trash.permanent.label'), description: t('trash.permanent.description'),
          keywords: t('trash.permanent.keywords'), control: settingToggle('deletePermanent'),
        },
      ],
    },
    {
      title: t('trash.label'),
      rows: [
        {
          label: t('trash.retention.label'), description: t('trash.retention.description'),
          keywords: t('trash.retention.keywords'),
          control: () => {
            // A stored period that is not in the list (set by hand) is shown as it is, not as the first option
            const days = settings.get('trashRetention');
            const listed = RETENTION_OPTIONS.some(o => o.value === days);
            const options = listed ? RETENTION_OPTIONS : [...RETENTION_OPTIONS, { value: days, label: days > 0 ? t('trash.retention.days', { n: days }) : t('trash.retention.forever') }];
            return selectField({
              value: days, label: t('trash.retention.field'), options,
              onChange: v => settings.set('trashRetention', Number(v)),
            });
          },
        },
        {
          label: t('trash.contents.label'), description: items.length ? t('trash.contents.description', { n: items.length, size: formatBytes(bytes) }) : t('trash.contents.empty'),
          keywords: t('trash.contents.keywords'), control: actionButton({ label: t('trash.contents.open'), onClick: () => launch('files', { trash: true }) }),
        },
        {
          label: t('trash.empty.label'), description: t('trash.empty.description'), keywords: t('trash.empty.keywords'),
          control: items.length ? confirmButton(t('trash.empty.button'), t('trash.empty.confirm'), () => fs.purgeTrash()) : t('trash.empty.none'),
        },
      ],
    },
  ];
}

/** One section per command group, one row per command, each with its shortcut editor. */
function shortcutSections() {
  const groups = new Map();
  for (const cmd of shortcuts.list()) {
    if (!groups.has(cmd.group)) groups.set(cmd.group, []);
    groups.get(cmd.group).push(cmd);
  }
  const rank = cmds => {
    const at = GROUP_ORDER.indexOf(String(cmds[0]?.id ?? '').split('.')[0]);
    return at < 0 ? GROUP_ORDER.length : at;
  };
  return [
    {
      title: t('shortcuts.title'),
      rows: [{
        label: t('shortcuts.all.label'),
        description: t('shortcuts.all.description'),
        control: confirmButton(t('shortcuts.all.reset'), t('common.confirm'), () => shortcuts.resetAll()),
      }],
    },
    ...[...groups].sort(([, a], [, b]) => rank(a) - rank(b)).map(([group, cmds]) => ({
      title: group,
      rows: cmds.map(cmd => ({
        label: cmd.label,
        keywords: t('shortcuts.keywords', { keys: cmd.keys.map(k => shortcuts.format(k)).join(' ') }),
        control: shortcutField(cmd.id),
      })),
    })),
    {
      title: t('shortcuts.mouse.title'),
      rows: [
        {
          label: t('shortcuts.lasso.label'), description: t('shortcuts.lasso.description'),
          keywords: t('shortcuts.lasso.keywords'),
          control: () => selectField({ value: settings.get('lasso'), options: LASSO_OPTIONS, onChange: v => settings.set('lasso', v) }),
        },
        { label: t('shortcuts.rectangle.label'), control: t('shortcuts.rectangle.control') },
        { label: t('shortcuts.addToSelection.label'), control: t('shortcuts.addToSelection.control') },
        { label: t('shortcuts.pan.label'), control: t('shortcuts.pan.control') },
      ],
    },
    {
      title: t('shortcuts.fixed.title'),
      rows: [
        { label: t('shortcuts.navigate.label'), control: t('shortcuts.navigate.control') },
        { label: t('shortcuts.rename.label'), control: t('shortcuts.rename.control') },
      ],
    },
  ];
}

const modeLabels = () => ({ isolated: t('apps.mode.isolated'), open: t('apps.mode.open'), system: t('apps.mode.system'), remote: t('apps.mode.remote') });

/**
 * How installed apps run: isolated (a sandbox: only what their permissions allow) or not
 * (lilOS's page and a Web Worker: faster, with everything the user can do). Only an
 * administrator changes it; each app may have its own choice (its Proprietà → Sicurezza).
 */
function appSecuritySections() {
  const admin = canChangeExecution();
  const { isolated } = packages.security();
  const listed = apps.filter(a => a.package && !a.package.system);
  return [
    {
      title: t('apps.execution.title'),
      rows: [
        {
          label: t('apps.isolated.label'),
          description: admin ? t('apps.isolated.description') : t('apps.isolated.adminOnly'),
          keywords: t('apps.isolated.keywords'),
          control: admin
            ? toggle({
              value: isolated, label: t('apps.isolated.label'),
              onChange: async v => {
                try {
                  await packages.setSecurity({ isolated: v });
                } catch (err) {
                  toast(t('apps.isolated.failed', { error: err.message }));
                }
                view?.render();
              },
            })
            : (isolated ? t('common.yes') : t('common.no')),
        },
        { label: t('apps.system.label'), description: t('apps.system.description') },
      ],
    },
    {
      title: t('apps.installed.title'),
      rows: listed.length
        ? listed.map(a => {
          const mode = executionMode(a.package);
          const why = mode.fixed ? mode.reason : mode.own === null ? t('apps.installed.shared') : t('apps.installed.own');
          return {
            label: a.name, description: `${modeLabels()[mode.mode]} · ${why}`, keywords: t('apps.installed.keywords'),
            control: actionButton({ label: t('apps.installed.properties'), onClick: () => showAppSecurity(a.id) }),
          };
        })
        : [{ label: t('apps.installed.none') }],
    },
  ];
}

/** Destructive action in two clicks (the first one asks for confirmation for a few seconds); its error in a notification. */
function confirmButton(label, confirm, action) {
  return actionButton({
    label, confirm,
    onClick: () => {
      const result = action();
      return typeof result?.then === 'function' ? result.catch(err => toast(err.message, { timeout: 7000 })) : result;
    },
  });
}

/** Bytes of settings, positions and views saved by lilOS (JSON text). */
function storageUsage() {
  return storage.bytes();
}

const formatBytes = bytes => (bytes == null ? t('common.unavailable') : bytesText(bytes));

const BROWSERS = [[/Edg\/(\d+)/, 'Edge'], [/Firefox\/(\d+)/, 'Firefox'], [/Chrome\/(\d+)/, 'Chrome'], [/Version\/(\d+).*Safari/, 'Safari']];

function browserName() {
  for (const [re, name] of BROWSERS) {
    const m = navigator.userAgent.match(re);
    if (m) return `${name} ${m[1]}`;
  }
  return t('about.unknownBrowser');
}

/** A language's name in the given language ('it-IT' → 'italiano (Italia)'); the code if Intl does not know it. */
function languageName(code, lang = code) {
  try {
    return new Intl.DisplayNames([lang], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * The language of apps: 'auto' (the browser's) or one of lilOS's, each named in its own language.
 * sdk.LANGUAGES is English and the language packs installed (lilOS with sdk.languagePacks): the
 * others come from the AppStore's Languages tab («Altre lingue»).
 */
function languageSections() {
  const stored = settings.get('language');
  const codes = [...(sdk.LANGUAGES ?? [])];
  // A stored language served by a pack of another tag ('it-IT' by 'it'): shown as that pack, not twice
  const served = sdk.locale?.language;
  const value = stored !== 'auto' && !codes.includes(stored) && sdk.locale?.code === stored && served && served !== 'en' && codes.includes(served) ? served : stored;
  // A stored language that is not in the list (set by hand, or its pack was removed) is shown as it is
  if (value !== 'auto' && !codes.includes(value)) codes.push(value);
  // The pack's own name ('Italiano'), or Intl's
  const own = code => {
    const name = sdk.locale?.packs?.find(p => p.language === code)?.name ?? languageName(code);
    return name.charAt(0).toUpperCase() + name.slice(1);
  };
  const packs = !!sdk.languagePacks;
  return [{
    title: t('language.title'),
    rows: [
      {
        label: t('language.label'), description: packs ? t('language.row.packs') : t('language.row.description'), keywords: t('language.keywords'),
        control: () => selectField({
          value, label: t('language.label'),
          options: [
            { value: 'auto', label: t('language.auto', { name: languageName(navigator.language || 'en', i18n.lang) }) },
            ...codes.map(code => ({ value: code, label: own(code) })),
          ],
          onChange: v => settings.set('language', v),
        }),
      },
      packs && {
        label: t('language.more.label'), description: t('language.more.description'), keywords: t('language.more.keywords'),
        control: actionButton({ label: t('language.more.button'), onClick: () => launch('appstore', { tab: 'languages' }) }),
      },
    ].filter(Boolean),
  }];
}

const SHOWN_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 10];
const SECONDS_OPTIONS = [3, 5, 8, 10, 15, 30, 60];
const KEEP_OPTIONS = [10, 20, 50, 100, 200];

/** A number select: the stored value is listed even when it is not one of the options (set by hand). */
function numberField({ value, values, label, text = String, onChange }) {
  const list = values.includes(value) ? values : [...values, value].sort((a, b) => a - b);
  return selectField({ value, label, options: list.map(v => ({ value: v, label: text(v) })), onChange: v => onChange(Number(v)) });
}

/**
 * Notifiche: how the notification bar over the taskbar shows them (lilOS settings notifyShown and
 * notifySeconds), how many are kept (the kernel's notifications module keeps them for each user)
 * and a test one, sent by Control Panel.
 */
function notificationSections() {
  const { notifications } = sdk;
  const failed = err => toast(t('notifications.error', { message: err.message }));
  return [
    {
      title: t('notifications.arrive.title'),
      rows: [
        {
          label: t('notifications.shown.label'), description: t('notifications.shown.description'), keywords: t('notifications.shown.keywords'),
          control: () => numberField({ value: settings.get('notifyShown'), values: SHOWN_OPTIONS, label: t('notifications.shown.field'), onChange: v => settings.set('notifyShown', v) }),
        },
        {
          label: t('notifications.seconds.label'), description: t('notifications.seconds.description'), keywords: t('notifications.seconds.keywords'),
          control: () => numberField({
            value: settings.get('notifySeconds'), values: SECONDS_OPTIONS, label: t('notifications.seconds.field'),
            text: n => t('notifications.seconds.value', { n }), onChange: v => settings.set('notifySeconds', v),
          }),
        },
      ],
    },
    {
      title: t('notifications.list.title'),
      rows: [
        {
          label: t('notifications.keep.label'), keywords: t('notifications.keep.keywords'),
          description: notifications.available ? t('notifications.keep.description') : `${t('notifications.keep.description')} ${t('notifications.keep.page')}`,
          control: () => numberField({ value: notifications.keep, values: KEEP_OPTIONS, label: t('notifications.keep.field'), onChange: v => notifications.setKeep(v).catch(failed) }),
        },
        {
          label: t('notifications.test.label'), description: t('notifications.test.description'),
          control: actionButton({ label: t('notifications.test.button'), onClick: () => notifications.send({ app: 'settings', text: t('notifications.test.text') }).catch(failed) }),
        },
      ],
    },
  ];
}

/**
 * The system Settings app: only settings that actually work. Tabs and secondary tabs give their
 * texts with getters, read on every render: they follow a change of language.
 */
export default function createSettings({ openWindow, args } = {}) {
  const win = new SettingsWindow({
    title: t('window.title'),
    icon: 'gear',
    width: 760,
    height: 500,
    tabs: [
      { get group() { return t('group.system'); } },
      {
        id: 'appearance', icon: 'palette',
        get label() { return t('appearance.label'); },
        get description() { return t('appearance.description'); },
        subtabs: [
          {
            id: 'colors', get label() { return t('appearance.colors.label'); },
            sections: () => [{
              title: t('appearance.theme.label'),
              rows: [{
                label: t('appearance.theme.label'), description: t('appearance.theme.description'), keywords: t('appearance.theme.keywords'),
                control: segmented({
                  value: settings.get('theme'), label: t('appearance.theme.label'),
                  options: [{ value: 'light', label: t('appearance.theme.light') }, { value: 'dark', label: t('appearance.theme.dark') }],
                  onChange: v => settings.set('theme', v),
                }),
              }],
            }, {
              title: t('appearance.accent.title'),
              rows: [{
                label: t('common.color'), description: t('appearance.accent.description'), keywords: t('appearance.accent.keywords'),
                control: swatches({ value: settings.get('accent'), colors: ACCENTS, onChange: v => settings.set('accent', v) }),
              }],
            }],
          },
          {
            id: 'motion', get label() { return t('appearance.motion.label'); },
            sections: () => [{
              title: t('appearance.animations.label'),
              rows: [{
                label: t('appearance.animations.label'), description: t('appearance.animations.description'),
                keywords: t('appearance.animations.keywords'), control: settingToggle('motion'),
              }],
            }],
          },
        ],
      },
      sdk.locale && {
        id: 'language', icon: 'globe',
        get label() { return t('language.label'); },
        get description() { return t('language.description'); },
        sections: languageSections,
      },
      {
        id: 'desk', icon: 'grid',
        get label() { return t('desk.label'); },
        get description() { return t('desk.description'); },
        subtabs: [
          {
            id: 'items', get label() { return t('common.items'); },
            sections: () => [...deskFixedSections(), {
              title: t('desk.placement.title'),
              rows: [{
                label: t('desk.snap.label'), description: t('desk.snap.description'),
                keywords: t('desk.snap.keywords'), control: settingToggle('snap'),
              }],
            },
            // Thumbnails made by apps (lilOS apps/thumbnails.js): only a lilOS that has them
            typeof system.fileThumbnail === 'function' && {
              title: t('desk.previews.title'),
              rows: [{
                label: t('desk.previews.label'), description: t('desk.previews.description'),
                keywords: t('desk.previews.keywords'), control: settingToggle('deskPreviews'),
              }],
            }].filter(Boolean),
          },
          // Color and image of the desk (lilOS desktop/wallpaper.js): only a lilOS that has them
          typeof system.setWallpaper === 'function' && {
            id: 'background', get label() { return t('desk.background.label'); },
            sections: () => deskBackgroundSections(openWindow),
          },
          {
            id: 'overview', get label() { return t('desk.overview.label'); },
            sections: () => [{
              title: t('desk.overview.title'),
              rows: [{ label: t('desk.minimap.label'), keywords: t('desk.minimap.keywords'), control: settingToggle('minimap') }],
            }],
          },
        ].filter(Boolean),
      },
      (system.USER_PAGE_ITEMS ?? []).length && {
        id: 'userpage', icon: 'user',
        get label() { return t('userPage.label'); },
        get description() { return t('userPage.description'); },
        sections: userPageSections,
      },
      {
        id: 'workspaces', icon: 'workspace',
        get label() { return t('workspaces.label'); },
        get description() { return t('workspaces.description'); },
        get subtabs() { return workspaceSubtabs(); },
      },
      sdk.notifications && {
        id: 'notifications', icon: 'bell',
        get label() { return t('notifications.label'); },
        get description() { return t('notifications.description'); },
        sections: notificationSections,
      },
      {
        id: 'tags', icon: 'tag',
        get label() { return t('tags.label'); },
        get description() { return t('tags.description'); },
        sections: tagSections,
      },
      {
        id: 'usability', icon: 'accessibility',
        get label() { return t('usability.label'); },
        get description() { return t('usability.description'); },
        subtabs: [
          { id: 'shortcuts', get label() { return t('shortcuts.label'); }, sections: shortcutSections },
          { id: 'filetypes', get label() { return t('fileTypes.label'); }, sections: fileTypeSections },
          { id: 'contextmenu', get label() { return t('menu.label'); }, sections: () => menuSections('desktop.background', { openWindow, confirmButton, rerender: () => view?.render() }) },
          { id: 'trash', get label() { return t('trash.label'); }, sections: trashSections },
        ],
      },
      {
        id: 'apps', icon: 'window',
        get label() { return t('apps.label'); },
        get description() { return t('apps.description'); },
        subtabs: [
          { id: 'security', get label() { return t('apps.security.label'); }, sections: appSecuritySections },
          { id: 'pipes', get label() { return t('pipes.label'); }, sections: () => pipeSections({ rerender: () => view?.render() }) },
        ],
      },
      {
        id: 'startup', icon: 'power',
        get label() { return t('startup.label'); },
        get description() { return t('startup.description'); },
        subtabs: [
          { id: 'options', get label() { return t('startup.options.label'); }, sections: () => startupOptionsSections({ rerender: () => view?.render() }) },
          { id: 'services', get label() { return t('startup.services.label'); }, sections: () => servicesSections({ openWindow, rerender: () => view?.render() }) },
          { id: 'apps', get label() { return t('startup.apps.label'); }, sections: () => startupAppsSections({ openWindow, rerender: () => view?.render() }) },
        ],
      },
      // Where users may make the kernel connect, and the admin's exceptions (lilOS 1.25.0)
      networkTab({ rerender: () => view?.render() }),
      // The program lilOS (lilos-desktop): only inside it, not in a browser
      computerTab({ rerender: () => view?.render() }),
      // OneDrive, Google Drive, Google Foto, Azure Blob Storage, NFS and the provider apps they
      // sign in with: only while their modules run
      ...cloudTabs({ rerender: () => view?.render(), select: id => view?.select(id) }),
      { get group() { return t('group.data'); } },
      // With the kernel: Il mio spazio, and for admins Limiti and Utenti (lilOS 1.33.0)
      storageTab({
        rerender: () => view?.render(),
        own: () => [
          {
            title: t('storage.space.title'),
            rows: [
              { label: t('storage.used.label'), description: t('storage.used.description'), control: formatBytes(storageUsage()) },
              { label: t('storage.contents.label'), description: t('storage.contents.description'), control: formatBytes(fs.usage(fs.root)?.bytes) },
            ],
          },
          {
            title: t('storage.reset.title'),
            rows: [
              {
                label: t('storage.defaults.label'), description: t('storage.defaults.description'),
                control: confirmButton(t('common.reset'), t('common.confirm'), () => {
                  ['accent', 'theme', 'motion', 'snap', ...(system.fileThumbnail ? ['deskPreviews'] : []), 'minimap', 'lasso', 'deleteConfirm', 'deletePermanent', 'trashRetention', 'startupApps', ...(sdk.locale ? ['language'] : []), ...(system.USER_PAGE_ITEMS ? ['userPageHidden'] : []), ...(sdk.notifications ? ['notifyShown', 'notifySeconds'] : []), ...(system.setWallpaper ? ['deskColor', 'wallpaper'] : [])].forEach(k => settings.reset(k));
                  shortcuts.resetAll();
                  resetAppsFor();
                  menus.list().forEach(m => menus.reset(m.id));
                }),
              },
              {
                label: t('storage.initial.label'), description: t('storage.initial.description'),
                keywords: t('storage.initial.keywords'), control: confirmButton(t('storage.initial.button'), t('storage.initial.confirm'), async () => {
                  // The keys of each workspace (ws:<id>:…) are dropped at start-up, once their workspace is gone
                  await fs.reset();
                  // 'app-setup' too: installed apps make their folders and desk items again
                  ['workspaces', 'tags', 'desktop-layout', 'desktop', 'camera', 'workareas', 'editor-tree', 'files-sidebar', 'app-setup'].forEach(k => storage.remove(k));
                  await kernel.flush().catch(() => {});
                  location.reload();
                }),
              },
            ],
          },
        ],
      }),
      { group: '' },
      {
        id: 'about', icon: 'info',
        get label() { return t('about.label'); },
        get description() { return t('about.description'); },
        subtabs: [
          {
            id: 'system', label: 'lilOS',
            sections: () => [{
              title: 'lilOS',
              rows: [
                { label: t('about.version'), control: version },
                { label: t('about.sdkVersion'), control: SDK_VERSION },
                { label: t('about.language'), control: session.locale },
                { label: t('about.browser'), control: browserName() },
              ],
            }],
          },
          { id: 'credits', get label() { return t('credits.label'); }, sections: creditsSections },
        ],
      },
    ].filter(Boolean),
  });
  view = win.view;
  // Opened on a tab (args.tab, e.g. 'workspaces' from the taskbar; args.subtab, one of its
  // secondary tabs), also when launched again.
  // args.tagFor: items the next tag made here goes on (Tag → Nuovo tag… in a menu)
  const show = a => {
    if (Array.isArray(a?.tagFor)) pendingTagFor = a.tagFor.filter(id => typeof id === 'string' && fs.exists(id));
    if (typeof a?.tab === 'string') win.view.select(a.tab, typeof a.subtab === 'string' ? a.subtab : undefined);
    if (a?.tab === 'tags') win.view.panel.querySelector('.tag-new-name')?.focus();
  };
  show(args);
  win.on('launch', show);
  // Workspaces changed or switched: Workspace has a tab per other workspace (back to the first
  // one if the workspace shown went away, or became the current one)
  const refresh = () => (win.view.tab?.subtabs?.length && !win.view.subtab ? win.view.select(win.view.tab.id) : win.view.render());
  const offWorkspaces = [workspaceManager()?.on('change', refresh), workspaceManager()?.on('switch', refresh)];
  const offTrash = fs.on('trash', () => win.view.render());
  const offTags = tags.on('change', () => win.view.render());
  const offApps = [packages.on('change', () => win.view.render()), packages.on('security', () => win.view.render()), watchServices(() => win.view.render()), watchPipes(() => win.view.render())];
  // Fixed desk items turned off from the desk's menu meanwhile (older lilOS: one choice for every desk)
  const offDesk = settings.on('change:deskHidden', () => win.view.render());
  // The desk's color or image changed (here, or from the desk's menu)
  const offBackground = [settings.on('change:deskColor', () => win.view.render()), system.wallpaper?.on('change', () => win.view.render())];
  // The language changed (here or elsewhere): every text again in the new one. The title too,
  // which SettingsWindow sets on each tab change with the text it was made with
  const retitle = () => win.setTitle(t('window.title'), win.view.tab?.label ?? '');
  win.view.on('select', retitle);
  // The settings of the network protocols are read again each time their tab is shown; OneDrive's
  // connections change its lists
  win.view.on('select', () => {
    if (isCloudTab(win.view.tab?.id)) { reloadCloud(win.view.tab.id); win.view.render(); }
    // The space used changes all the time: read again each time the tab is shown
    if (win.view.tab?.id === 'storage') { reloadStorage(); win.view.render(); }
  });
  const offStorage = watchStorage(() => win.view.render());
  const offNet = sdk.net?.on?.('mounts', () => { if (win.view.tab?.id === 'onedrive') win.view.render(); });
  const offLocale = sdk.locale?.on('change', () => { win.view.render(); retitle(); });
  // Language packs installed or removed (in the AppStore, by another user): Lingua lists them
  const offLanguages = sdk.locale?.on('languages', () => win.view.render());
  win.on('destroy', () => { offWorkspaces.forEach(off => off?.()); offTrash(); offTags(); offDesk(); offBackground.forEach(off => off?.()); offLocale?.(); offLanguages?.(); offApps.forEach(off => off?.()); offNet?.(); offStorage(); if (view === win.view) view = null; });
  return win;
}
