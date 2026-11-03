import { h, icon, calls, messageBox } from '@lilos/sdk';
import { t } from './i18n.js';

/**
 * The form of a request's (or a folder's, or the collection's) auth: what the kernel's
 * calls/auth.js takes. Values may use {{variables}}; passwords and tokens belong in secret
 * variables of the environment ({{token}}): the field says so when a plain value is typed.
 *
 *   authForm({ auth, onChange, inherit, inherited, win })
 *     auth       the object, changed in place; onChange() after
 *     inherit    'inherit' is a choice (a request or a folder: not the collection)
 *     inherited  () → { auth, name }: what 'inherit' ends up with, shown under the choice
 *     win        the window, for the OAuth sign-in's questions
 */
export const AUTH_TYPES = ['inherit', 'none', 'basic', 'bearer', 'apikey', 'digest', 'aws4', 'oauth2'];
const GRANTS = ['token', 'authorization_code', 'client_credentials', 'password'];

export function authForm({ auth, onChange, inherit = true, inherited = null, win }) {
  const el = h('div', { class: 'nx-auth' });
  const changed = () => onChange?.();

  const row = (label, control, hint) => h('label', { class: 'nx-frow' }, h('span', { class: 'nx-flabel' }, label), h('span', { class: 'nx-fval' }, control, hint ? h('small', { class: 'nx-hint' }, hint) : null));
  const text = (key, { placeholder = '', password = false, mono = true } = {}) => {
    const input = h('input', {
      class: `ctl-text nx-wide${mono ? ' mono' : ''}`, type: password ? 'password' : 'text', value: String(auth[key] ?? ''), placeholder, spellcheck: 'false', autocomplete: 'off',
      oninput: () => { auth[key] = input.value; warn(); changed(); },
    });
    const note = h('small', { class: 'nx-hint warn', hidden: true }, t('auth.useSecret'));
    const warn = () => { note.hidden = !password || !input.value || /^\{\{[^{}]+\}\}$/.test(input.value.trim()); };
    warn();
    return h('span', { class: 'nx-fstack' }, input, note);
  };
  const choice = (key, options, fallback) => {
    const sel = h('select', { class: 'ctl-select', onchange: () => { auth[key] = sel.value; changed(); draw(); } },
      ...options.map(([value, label]) => h('option', { value, selected: (auth[key] ?? fallback) === value }, label)));
    return sel;
  };

  function oauth() {
    const grant = auth.grant ?? 'token';
    const rows = [row(t('auth.oauth.grant'), choice('grant', GRANTS.map(g => [g, t(`auth.oauth.grant.${g}`)]), 'token'))];
    if (grant === 'token') {
      rows.push(row(t('auth.token'), text('token', { placeholder: '{{accessToken}}', password: true })));
    } else {
      if (grant === 'authorization_code') rows.push(row(t('auth.oauth.authorizeUrl'), text('authorizeUrl', { placeholder: 'https://login.example.com/oauth2/authorize' })));
      rows.push(row(t('auth.oauth.tokenUrl'), text('tokenUrl', { placeholder: 'https://login.example.com/oauth2/token' })));
      rows.push(row(t('auth.oauth.clientId'), text('clientId')));
      rows.push(row(t('auth.oauth.clientSecret'), text('clientSecret', { password: true, placeholder: '{{clientSecret}}' })));
      rows.push(row(t('auth.oauth.scope'), text('scope', { placeholder: 'read write' })));
      rows.push(row(t('auth.oauth.audience'), text('audience')));
      if (grant === 'password') {
        rows.push(row(t('auth.user'), text('username')));
        rows.push(row(t('auth.password'), text('password', { password: true })));
      }
      rows.push(row(t('auth.oauth.send'), choice('send', [['body', t('auth.oauth.send.body')], ['basic', t('auth.oauth.send.basic')]], 'body')));
      if (grant === 'authorization_code') {
        rows.push(row(t('auth.oauth.redirect'), text('redirectUri', { placeholder: t('auth.oauth.redirect.lilos') }), t('auth.oauth.redirect.hint', { url: `${location.origin}/api/calls/oauth/callback` })));
        const info = auth.tokenInfo;
        const state = h('span', { class: 'nx-oauth-state' }, info
          ? [icon(info.expires > Date.now() ? 'check' : 'warning'), t(info.expires > Date.now() ? 'auth.oauth.has' : 'auth.oauth.expired', { preview: info.preview, until: new Date(info.expires).toLocaleString() }), info.refresh ? ` · ${t('auth.oauth.renews')}` : '']
          : t('auth.oauth.none'));
        rows.push(row('', h('span', { class: 'nx-oauth' }, h('button', { type: 'button', class: 'ctl-btn primary', onclick: e => signIn(e.currentTarget) }, icon('user'), t('auth.oauth.signIn')),
          auth.tokens ? h('button', { type: 'button', class: 'ctl-btn', onclick: () => { delete auth.tokens; delete auth.tokenInfo; changed(); draw(); } }, t('auth.oauth.forget')) : null, state)));
      } else {
        rows.push(row('', h('small', { class: 'nx-hint' }, t('auth.oauth.auto'))));
      }
    }
    rows.push(row(t('auth.prefix'), text('prefix', { placeholder: 'Bearer' })));
    return rows;
  }

  async function signIn(button) {
    const settings = Object.fromEntries(['authorizeUrl', 'tokenUrl', 'clientId', 'clientSecret', 'scope', 'audience', 'send', 'redirectUri'].map(k => [k, auth[k] ?? '']));
    button.disabled = true;
    try {
      let tokens;
      if (settings.redirectUri.trim()) {
        tokens = await calls.signIn(settings, {
          askAddress: async error => {
            const r = await messageBox(win, {
              title: t('auth.oauth.paste.title'), text: error ? `${t('auth.oauth.paste.text')}\n\n${error}` : t('auth.oauth.paste.text'),
              fields: [{ name: 'url', label: t('auth.oauth.paste.label'), placeholder: settings.redirectUri, required: true }], buttons: ['cancel', 'ok'],
            });
            return r?.button === 'ok' ? r.values.url : null;
          },
        });
      } else tokens = await calls.signIn(settings);
      auth.tokens = tokens.sealed;
      auth.tokenInfo = { expires: tokens.expires, scope: tokens.scope, preview: tokens.preview, refresh: tokens.refresh };
      changed();
      draw();
    } catch (err) {
      if (err?.code !== 'canceled') messageBox(win, { icon: 'error', title: t('auth.oauth.failed'), text: err.message });
    } finally {
      button.disabled = false;
    }
  }

  function fields() {
    switch (auth.type) {
      case 'basic':
      case 'digest':
        return [row(t('auth.user'), text('user')), row(t('auth.password'), text('password', { password: true, placeholder: '{{password}}' }))];
      case 'bearer':
        return [row(t('auth.token'), text('token', { password: true, placeholder: '{{token}}' })), row(t('auth.prefix'), text('prefix', { placeholder: 'Bearer' }))];
      case 'apikey':
        return [row(t('auth.apikey.key'), text('key', { placeholder: 'X-Api-Key' })), row(t('auth.apikey.value'), text('value', { password: true, placeholder: '{{apiKey}}' })),
          row(t('auth.apikey.in'), choice('in', [['header', t('auth.apikey.header')], ['query', t('auth.apikey.query')]], 'header'))];
      case 'aws4':
        return [row(t('auth.aws.accessKey'), text('accessKey')), row(t('auth.aws.secretKey'), text('secretKey', { password: true, placeholder: '{{awsSecret}}' })),
          row(t('auth.aws.sessionToken'), text('sessionToken', { password: true })), row(t('auth.aws.region'), text('region', { placeholder: 'eu-south-1' })),
          row(t('auth.aws.service'), text('service', { placeholder: 'execute-api' }))];
      case 'oauth2':
        return oauth();
      case 'inherit': {
        const from = inherited?.();
        return [h('p', { class: 'nx-hint' }, from ? t('auth.inherits', { type: t(`auth.type.${from.auth.type ?? 'none'}`), name: from.name }) : t('auth.inheritsNone'))];
      }
      default:
        return [h('p', { class: 'nx-hint' }, t('auth.noneText'))];
    }
  }

  function draw() {
    const types = AUTH_TYPES.filter(x => inherit || x !== 'inherit');
    if (!types.includes(auth.type)) auth.type = inherit ? 'inherit' : 'none';
    const sel = h('select', {
      class: 'ctl-select', 'aria-label': t('auth.type'),
      onchange: () => { auth.type = sel.value; changed(); draw(); },
    }, ...types.map(x => h('option', { value: x, selected: auth.type === x }, t(`auth.type.${x}`))));
    el.replaceChildren(row(t('auth.type'), sel), ...fields());
  }
  draw();
  return { el, draw };
}
