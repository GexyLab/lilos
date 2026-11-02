import { randomBytes } from 'node:crypto';
import { needKernel } from './lib/shared/kernel.js';

/**
 * Notifications, standalone: every user's are in notifications.json, in this module's folder.
 *
 *   { version: 1, users: { <user id>: { keep, items: [notification] } } }   items newest first
 *   notification: { id, at, from: { app, name } | { system: true }, level, text, action, read }
 *                 level: 'info' | 'success' | 'warning' | 'error'; action: { entry, args } | null
 *
 * A user keeps at most `keep` of them (Control Panel → Notifiche, `defaultKeep` until they choose):
 * a new one deletes the oldest. Each app sends at most `perMinute` a minute to a user.
 * The module tells the user's lilOS pages (ctx.emit):
 *   'notification.new'     { id }   one arrived
 *   'notification.change'  {}       some were read or removed, or `keep` changed
 * The file is written whole, through a temporary file, one change at a time.
 */
const ID = /^[\w-]{1,64}$/;
const APP = /^[a-z0-9][a-z0-9.-]{1,63}$/;
const ENTRY = /^[a-z][a-zA-Z0-9]{0,30}$/;
const LEVELS = new Set(['info', 'success', 'warning', 'error']);
const MAX_TEXT = 300;
const MAX_NAME = 80;
const MAX_ARGS = 4096;
const KEEP = { min: 1, max: 200 };
const MAX_IDS = 500;

const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const keepOf = v => (Number.isInteger(v) && v >= KEEP.min && v <= KEEP.max ? v : null);

/** A notification as saved: checked again when the file is read (it may be edited by hand). */
function cleanItem(n) {
  if (!plain(n) || !ID.test(n.id ?? '') || !Number.isFinite(n.at) || typeof n.text !== 'string' || !n.text) return null;
  const from = n.from?.system === true ? { system: true }
    : APP.test(n.from?.app ?? '') ? { app: n.from.app, name: typeof n.from.name === 'string' ? n.from.name.slice(0, MAX_NAME) : n.from.app }
    : null;
  if (!from) return null;
  const action = plain(n.action) && ENTRY.test(n.action.entry ?? '') ? { entry: n.action.entry, args: n.action.args ?? null } : null;
  return { id: n.id, at: n.at, from, level: LEVELS.has(n.level) ? n.level : 'info', text: n.text.slice(0, MAX_TEXT), action, read: n.read === true };
}

function clean(raw) {
  const users = {};
  for (const [id, u] of Object.entries(plain(raw?.users) ? raw.users : {})) {
    if (!ID.test(id) || !plain(u)) continue;
    const keep = keepOf(u.keep);
    const items = (Array.isArray(u.items) ? u.items : []).map(cleanItem).filter(Boolean);
    users[id] = { keep, items: keep ? items.slice(0, keep) : items };
  }
  return { version: 1, users };
}

let store, ctx;

export default {
  async init(context) {
    ctx = needKernel(context, 'jsonStore');
    store = ctx.jsonStore('notifications.json', { clean });
    await store.read();
    const defaultKeep = keepOf(Number(ctx.config.defaultKeep)) ?? 20;
    const perMinute = Math.max(1, Number(ctx.config.perMinute) || 10);
    // A kernel older than ctx.emit keeps them all the same: the pages see them when they read again
    const emit = (...args) => ctx.emit?.(...args);
    // Who sent what in the last minute, in memory: '<user> <sender>' → [times]
    const recent = new Map();

    const userOf = principal => (principal?.kind === 'user' && ID.test(principal.id ?? '') ? principal.id : ctx.fail('forbidden', 'Le notifiche sono di un utente'));
    const entry = (data, id) => (data.users[id] ??= { keep: null, items: [] });
    const keepFor = u => u.keep ?? defaultKeep;
    const ids = v => {
      if (v == null) return null;
      if (!Array.isArray(v) || v.length > MAX_IDS || v.some(id => typeof id !== 'string' || !ID.test(id))) ctx.fail('invalid', 'Notifiche non valide');
      return new Set(v);
    };
    const throttle = (user, sender) => {
      const key = `${user} ${sender}`;
      const now = Date.now();
      const times = (recent.get(key) ?? []).filter(t => now - t < 60_000);
      if (times.length >= perMinute) ctx.fail('rate_limited', `Troppe notifiche: al massimo ${perMinute} al minuto`, { retryAfter: Math.ceil((times[0] + 60_000 - now) / 1000) });
      times.push(now);
      recent.set(key, times);
      if (recent.size > 10_000) recent.clear();
    };

    ctx.provide('notifications', {
      async send(userId, { from, level = 'info', text, action = null }) {
        if (typeof userId !== 'string' || !ID.test(userId)) ctx.fail('invalid', 'Destinatario non valido');
        const body = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
        if (!body) ctx.fail('invalid', 'La notifica non ha testo');
        if (!LEVELS.has(level)) ctx.fail('invalid', 'Livello non valido: info, success, warning o error');
        if (action !== null) {
          if (!plain(action) || !ENTRY.test(action.entry ?? 'main')) ctx.fail('invalid', 'Azione non valida');
          if ((JSON.stringify(action.args ?? null) ?? '').length > MAX_ARGS) ctx.fail('invalid', 'Parametri dell’azione troppo lunghi (al massimo 4 KB)');
        }
        const sender = from?.system === true ? { system: true } : APP.test(from?.app ?? '') ? { app: from.app, name: String(from.name ?? from.app).slice(0, MAX_NAME) } : ctx.fail('invalid', 'Mittente non valido');
        throttle(userId, sender.app ?? 'lilos');
        const item = {
          id: randomBytes(9).toString('base64url'), at: Date.now(), from: sender, level, text: body.slice(0, MAX_TEXT),
          action: action && { entry: action.entry ?? 'main', args: JSON.parse(JSON.stringify(action.args ?? null)) }, read: false,
        };
        await store.change(data => {
          const u = entry(data, userId);
          u.items.unshift(item);
          u.items.length = Math.min(u.items.length, keepFor(u));
        });
        emit(userId, 'notification.new', { id: item.id });
        return item;
      },

      async list(principal) {
        const u = (await store.read()).users[userOf(principal)];
        return { keep: u ? keepFor(u) : defaultKeep, items: u ? u.items.map(n => ({ ...n })) : [] };
      },

      async read(principal, list) {
        const id = userOf(principal);
        const which = ids(list);
        await store.change(data => entry(data, id).items.forEach(n => { if (!which || which.has(n.id)) n.read = true; }));
        emit(id, 'notification.change', {});
      },

      async remove(principal, list) {
        const id = userOf(principal);
        const which = ids(list);
        await store.change(data => {
          const u = entry(data, id);
          u.items = which ? u.items.filter(n => !which.has(n.id)) : [];
        });
        emit(id, 'notification.change', {});
      },

      async setOptions(principal, { keep }) {
        const id = userOf(principal);
        const value = keepOf(keep) ?? ctx.fail('invalid', `Quante notifiche conservare: da ${KEEP.min} a ${KEEP.max}`);
        await store.change(data => {
          const u = entry(data, id);
          u.keep = value;
          u.items.length = Math.min(u.items.length, value);
        });
        emit(id, 'notification.change', {});
        return { keep: value };
      },
    });
  },

  async stop() {},
};
