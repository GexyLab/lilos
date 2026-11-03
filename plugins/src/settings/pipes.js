import { actionButton, h } from '@lilos/sdk';
// Namespace import: lilOS versions without pipes still load Control Panel
import * as sdk from '@lilos/sdk';
import { apps } from '@lilos/system';
import { t } from './i18n.js';

/**
 * Control Panel → App → Pipe: the events of the system (the SDK's pipes.js) and, for each one with
 * handlers, its chain before and after the operation, in the order it runs. Inside each band
 * (first, middle, last) the user moves a handler up or down (pipes.setOrder); "Reset" goes back to
 * the order of installation. The after stage runs in the reverse order of before: the list shows
 * it as it runs, and moving there changes the same order the other way round. lilOS's own handlers
 * stay where they are. The events of an app (its manifest's contributes.events) say whose they are.
 */
const STAGES = ['before', 'after'];

/** The label of an event in the language of Control Panel; an app's own event keeps its own (lilOS translates it). */
const eventLabel = def => {
  const key = `pipes.event.${def.name}`;
  const text = t(key);
  return text === key ? def.label : text;
};

/** The label, and for an app's event the app it belongs to. */
const eventName = def => {
  if (!def.owner) return eventLabel(def);
  const app = apps.find(a => a.id === def.owner)?.name ?? def.owner;
  return t('pipes.owned', { label: eventLabel(def), app });
};

function whereText(where) {
  if (!where) return t('pipes.where.all');
  if (typeof where === 'string') return t('pipes.where.system');
  const parts = [];
  if (where.meta === 'own') parts.push(t('pipes.where.own'));
  if (where.ext) parts.push(t('pipes.where.ext', { list: where.ext.map(e => `.${e}`).join(' ') }));
  if (where.type) parts.push(t(`pipes.where.type.${where.type}`));
  if (where.app) parts.push(t('pipes.where.app', { list: where.app.join(', ') }));
  return parts.join(' · ');
}

/** The rows of one stage of an event: one per handler, with buttons to move it in its band. */
function stageRows(pipes, def, stage, rerender) {
  const stored = pipes.chain(def.name, stage);
  if (!stored.length) return [];
  // As it runs: the after stage the other way round
  const shown = stage === 'after' ? [...stored].reverse() : stored;
  const move = (i, by) => {
    const keys = stored.map(s => s.key);
    const from = stage === 'after' ? stored.length - 1 - i : i;
    const to = stage === 'after' ? from - by : from + by;
    [keys[from], keys[to]] = [keys[to], keys[from]];
    pipes.setOrder(def.name, stage, keys);
    rerender();
  };
  return shown.map((s, i) => {
    const band = s.position;
    const movable = n => !!n?.app && n.position === band;
    const canUp = !!s.app && movable(shown[i - 1]);
    const canDown = !!s.app && movable(shown[i + 1]);
    const who = s.app ? (s.entry && s.entry !== 'main' ? `${s.name} · ${s.entry}` : s.name) : t('pipes.lilos');
    const up = actionButton({ label: t('pipes.up'), onClick: () => move(i, -1) });
    const down = actionButton({ label: t('pipes.down'), onClick: () => move(i, 1) });
    up.disabled = !canUp;
    down.disabled = !canDown;
    return {
      label: `${i + 1}. ${who}`,
      description: `${t(`pipes.stage.${stage}`)} · ${t(`pipes.band.${band}`)} · ${whereText(s.where)}`,
      keywords: t('pipes.keywords'),
      control: canUp || canDown ? h('span', { class: 'pipes-move' }, up, down) : null,
    };
  });
}

export function pipeSections({ rerender }) {
  const pipes = sdk.pipes;
  if (!pipes) return [{ title: t('pipes.title'), rows: [{ label: t('pipes.unsupported') }] }];
  const events = pipes.catalog();
  const used = events.filter(def => STAGES.some(stage => pipes.chain(def.name, stage).length));
  const sections = [{
    title: t('pipes.title'),
    rows: [{ label: t('pipes.intro.label'), description: t('pipes.intro.description', { count: events.length }), keywords: t('pipes.keywords') }],
  }];
  for (const def of used) {
    const rows = STAGES.flatMap(stage => stageRows(pipes, def, stage, rerender));
    const custom = STAGES.some(stage => pipes.isCustomOrder(def.name, stage));
    if (custom) {
      rows.push({
        label: t('pipes.reset.label'), description: t('pipes.reset.description'),
        control: actionButton({ label: t('common.reset'), onClick: () => { STAGES.forEach(stage => pipes.setOrder(def.name, stage, null)); rerender(); } }),
      });
    }
    sections.push({ title: `${eventName(def)} · ${def.name}`, rows });
  }
  const idle = events.filter(def => !used.includes(def));
  sections.push({
    title: t('pipes.idle.title'),
    rows: idle.length
      ? [{ label: idle.map(eventName).join(', '),description: t('pipes.idle.description', { count: idle.length }) }]
      : [{ label: t('pipes.idle.none') }],
  });
  return sections;
}

/** Redraws when subscriptions or order change; returns the function that stops. */
export const watchPipes = rerender => sdk.pipes?.on('change', rerender) ?? null;
