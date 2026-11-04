import { fail } from '../errors.js';
import { editConfig } from '../config.js';
import { checkFields, signInFields } from './drivers.js';
import { Text, defineStrings } from '../strings.js';

/**
 * Signing in to an account of a provider for the network protocols (OAuth 2.0, authorization code
 * with PKCE: the window, the callback and the paste are signin.js): the kernel asks the provider for
 * the tokens and renews them, the drivers only say what they need. A driver declares
 *
 *   oauth: {
 *     provider   'microsoft' | 'google'       an app an admin registers once with that provider, for
 *                                             every protocol (OAuthApps below: Control Panel)
 *                | { label?, authorizeUrl, tokenUrl, clientId() → string, clientSecret?() → string,
 *                    params?, scopeOnToken? }  any other provider: the driver says where and how
 *     scopes     [scope] | (values) → [scope]  what it asks for (the provider's own are added:
 *                                             Microsoft offline_access openid profile, Google openid email)
 *     params?    { name: value } | (values) → { … }   more parameters for the provider's page
 *     accounts?  'work'                       Microsoft: work or school accounts only (the app's
 *                                             directory, or 'organizations')
 *     manual?    boolean                      the sign-in may end by pasting the address (signin.js);
 *                                             default: Microsoft no, Google yes
 *     optional?  true                         the protocol works without the app (another way in, such
 *                                             as an account key): a missing app stops the sign-in only
 *     field?     key                          its 'signin' field (default: the first one)
 *     account?   async ({ tokens, claims, granted, values }) → string   who signed in (what the field
 *                                             shows); it may check the account and throw (with `net`).
 *                                             Default: the id token's preferred_username, email, upn
 *                                             or name. claims: the id token's, or {}; granted: the
 *                                             scopes the provider gave, or null
 *     errors?    (body, status) → Error | null   the provider's error at a token request as an error
 *                                             with `net`; null: the kernel's own reading
 *   }
 *
 * and gets, instead of writing signIn (which the kernel makes), `tokens` in the ctx of connect()
 * and shares(): the access token of the account the connection signed in to.
 *
 *   tokens.get() → access token     valid for 2 more minutes at least (renewed before)
 *   tokens.renew() → access token   a new one now (the provider said 401); one renewal at a time
 *
 * The refresh token is the field's secret (as when the drivers kept it): when the provider gives a
 * new one the kernel keeps it (saveSecret). tokens is null when the connection has no refresh
 * token (another way in, with `optional`).
 */
const TIMEOUT = 60_000;
const EARLY = 120_000;          // an access token is renewed this long before it ends
const TENANT = /^[\w.-]{1,100}$/;

const { t } = defineStrings('lilos:kernel.net.oauth', { en: { strings: {
  'microsoft.label': 'Microsoft app',
  'microsoft.description': 'The app registered on Azure (Microsoft Entra ID) that lilOS signs in with: OneDrive, Azure Blob Storage',
  'microsoft.clientId': 'Application (client) ID',
  'microsoft.clientId.hint': 'portal.azure.com → App registrations → your app → Overview',
  'microsoft.accounts': 'Accounts allowed',
  'microsoft.accounts.hint': 'As «Supported account types» of the app on Azure',
  'microsoft.accounts.common': 'Personal, and work or school',
  'microsoft.accounts.organizations': 'Work or school only',
  'microsoft.accounts.consumers': 'Personal only',
  'microsoft.accounts.tenant': 'One organization only',
  'microsoft.tenant': 'Directory (tenant) ID or domain',
  'microsoft.notReady': 'An administrator must first enter the ID of the app registered on Azure (Control Panel → Microsoft app)',
  'microsoft.personalOnly': 'The Microsoft app accepts personal accounts only: this needs a work or school account (Control Panel → Microsoft app)',
  'microsoft.tenantInvalid': 'Directory (tenant) ID not valid (Control Panel → Microsoft app)',
  'microsoft.publicClient': 'On Azure, lilOS’s return address must be registered in the «Mobile and desktop applications» platform, with «Allow public client flows» on',
  'microsoft.redirect': 'lilOS’s return address is not registered in the app on Azure (Control Panel → Microsoft app shows it)',
  'microsoft.appNotFound': 'App not found on Azure: check the application ID and the accounts allowed (Control Panel → Microsoft app)',
  'microsoft.noRefresh': 'Microsoft did not give a lasting sign-in (offline_access is missing)',
  'google.label': 'Google project',
  'google.description': 'The project on Google Cloud that lilOS signs in with: Google Drive, Google Photos',
  'google.clientId': 'Client ID',
  'google.clientId.hint': 'console.cloud.google.com → APIs & Services → Credentials → your OAuth client',
  'google.clientSecret': 'Client secret',
  'google.clientSecret.hint': 'Kept encrypted in the kernel: nobody sees it again, it can only be replaced',
  'google.clientType': 'Client type',
  'google.clientType.web': 'Web application (sign-in window; elsewhere by pasting the address)',
  'google.clientType.desktop': 'Desktop app (always by pasting the address)',
  'google.notReady': 'An administrator must first enter the client ID and secret of the Google Cloud project (Control Panel → Google project)',
  'google.client': 'Google project not valid: check the client ID and secret ({message})',
  'google.clientStatus': 'Google project not valid: check the client ID and secret (error {status})',
  'google.redirect': 'lilOS’s return address is not registered in the Google project (Control Panel → Google project shows it)',
  'google.noRefresh': 'Google did not give a lasting sign-in: remove lilOS from the apps connected to the account and try again',
  'custom.notReady': 'The provider’s app is not set yet',
  'custom.noRefresh': '{name} did not give a lasting sign-in',
  'custom.provider': 'the provider',
  signInAgain: 'A new sign-in is needed ({message})',
  signInAgainStatus: 'A new sign-in is needed (error {status})',
  appInvalid: 'App of {name} not valid: {message}',
  appInvalidStatus: 'App of {name} not valid: error {status}',
  failed: 'Sign-in to {name} failed: {message}',
  failedStatus: 'Sign-in to {name} failed: error {status}',
  notReady: 'Sign-in not ready',
  unreachable: '{name} not reachable ({message})',
  noAccount: '{name} did not say which account it is',
  appNotFound: 'App not found',
  tenantInvalid: 'Directory (tenant) ID not valid',
  value: 'Value not valid: {key}',
} } });

const netError = (net, message, extra = {}) => Object.assign(new Error(String(message)), { net, ...(message instanceof Text && { text: message }), ...extra });
const str = v => (typeof v === 'string' ? v.trim() : '');
/** What the provider said about an error (its first line), or '' when it said nothing. */
const said = body => String(body?.error_description ?? body?.error ?? '').split(/\r?\n/)[0].slice(0, 240);
/** A message with what the provider said, or its status when it said nothing ('…Status' key). */
const withSaid = (key, body, status, params = {}) => {
  const message = said(body);
  return message ? t(key, { ...params, message }) : t(`${key}Status`, { ...params, status });
};
const isSecret = f => f.type === 'password';

/** What every provider's token errors mean, when the provider's own reading says nothing more. */
function commonError(body, status, name) {
  if (['invalid_grant', 'interaction_required', 'consent_required', 'login_required'].includes(body?.error)) return netError('auth', withSaid('signInAgain', body, status));
  if (body?.error === 'invalid_client' || body?.error === 'unauthorized_client') return netError('invalid', withSaid('appInvalid', body, status, { name }));
  return netError(status >= 500 ? 'unreachable' : 'invalid', withSaid('failed', body, status, { name }));
}

/**
 * The providers lilOS knows: the app an admin registers with them (its fields, in config.json
 * `oauth.<id>`, secret ones sealed), where their pages are and what their errors mean. In the app's
 * configuration, for tests only: loginUrl (Microsoft), authUrl and tokenUrl (Google) replace the
 * provider's addresses.
 */
export const PROVIDERS = Object.freeze({
  microsoft: {
    id: 'microsoft',
    name: 'Microsoft',
    label: t('microsoft.label'),
    description: t('microsoft.description'),
    fields: [
      {
        key: 'clientId', type: 'text', label: t('microsoft.clientId'),
        placeholder: '00000000-0000-0000-0000-000000000000',
        hint: t('microsoft.clientId.hint'),
      },
      {
        key: 'accounts', type: 'select', default: 'common', label: t('microsoft.accounts'),
        hint: t('microsoft.accounts.hint'),
        options: [
          { value: 'common', label: t('microsoft.accounts.common') },
          { value: 'organizations', label: t('microsoft.accounts.organizations') },
          { value: 'consumers', label: t('microsoft.accounts.consumers') },
          { value: 'tenant', label: t('microsoft.accounts.tenant') },
        ],
      },
      {
        key: 'tenant', type: 'text', when: { accounts: 'tenant' }, placeholder: 'contoso.onmicrosoft.com',
        label: t('microsoft.tenant'),
      },
    ],
    scopes: ['offline_access', 'openid', 'profile'],
    manual: false,
    scopeOnToken: true,
    params: { response_mode: 'query', prompt: 'select_account' },
    client: app => ({ id: str(app.clientId) }),
    ready(app, decl) {
      if (!str(app.clientId)) return t('microsoft.notReady');
      if (decl.accounts === 'work' && app.accounts === 'consumers') return t('microsoft.personalOnly');
      return null;
    },
    /** The directory the sign-in goes to: common, organizations, consumers, or one tenant. */
    endpoints(app, decl) {
      let authority = ['common', 'organizations', 'consumers', 'tenant'].includes(app.accounts) ? app.accounts : 'common';
      if (authority === 'tenant') {
        authority = str(app.tenant);
        if (!TENANT.test(authority)) throw netError('invalid', t('microsoft.tenantInvalid'));
      } else if (decl.accounts === 'work') authority = 'organizations';
      const base = `${(str(app.loginUrl) || 'https://login.microsoftonline.com').replace(/\/+$/, '')}/${encodeURIComponent(authority)}/oauth2/v2.0`;
      return { authorize: `${base}/authorize`, token: `${base}/token` };
    },
    /** What Microsoft's errors at sign-in mean for whoever set up the app on Azure. */
    error(body, status) {
      const codes = Array.isArray(body?.error_codes) ? body.error_codes : [];
      if (codes.includes(9002327) || codes.includes(7000218) || codes.includes(700025)) {
        return netError('invalid', t('microsoft.publicClient'));
      }
      if (codes.includes(50011) || codes.includes(500113)) return netError('invalid', t('microsoft.redirect'));
      if (codes.includes(700016)) return netError('invalid', t('microsoft.appNotFound'));
      return commonError(body, status, 'Microsoft');
    },
    noRefresh: t('microsoft.noRefresh'),
  },
  google: {
    id: 'google',
    name: 'Google',
    label: t('google.label'),
    description: t('google.description'),
    fields: [
      {
        key: 'clientId', type: 'text', label: t('google.clientId'), placeholder: '123456789012-abc.apps.googleusercontent.com',
        hint: t('google.clientId.hint'),
      },
      {
        key: 'clientSecret', type: 'password', label: t('google.clientSecret'),
        hint: t('google.clientSecret.hint'),
      },
      {
        key: 'clientType', type: 'select', default: 'web', label: t('google.clientType'),
        options: [
          { value: 'web', label: t('google.clientType.web') },
          { value: 'desktop', label: t('google.clientType.desktop') },
        ],
      },
    ],
    scopes: ['openid', 'email'],
    manual: true,
    onlyManual: app => app.clientType === 'desktop',
    scopeOnToken: false,
    params: { access_type: 'offline', prompt: 'consent select_account', include_granted_scopes: 'true' },
    client: app => ({ id: str(app.clientId), secret: str(app.clientSecret) }),
    ready(app) {
      if (!str(app.clientId) || !str(app.clientSecret)) return t('google.notReady');
      return null;
    },
    endpoints: app => ({ authorize: str(app.authUrl) || 'https://accounts.google.com/o/oauth2/v2/auth', token: str(app.tokenUrl) || 'https://oauth2.googleapis.com/token' }),
    error(body, status) {
      if (body?.error === 'invalid_client' || body?.error === 'unauthorized_client') return netError('invalid', withSaid('google.client', body, status));
      if (body?.error === 'redirect_uri_mismatch') return netError('invalid', t('google.redirect'));
      return commonError(body, status, 'Google');
    },
    noRefresh: t('google.noRefresh'),
  },
});

/** A provider lilOS knows, by its id, or null. */
const providerOf = id => (typeof id === 'string' && Object.hasOwn(PROVIDERS, id) ? PROVIDERS[id] : null);

/** A provider the driver describes itself (oauth.provider an object). */
function customProvider(p) {
  for (const k of ['authorizeUrl', 'tokenUrl']) if (typeof p[k] !== 'string' || !/^https?:\/\//.test(p[k])) throw new Error(`oauth.provider.${k} non valido`);
  if (typeof p.clientId !== 'function') throw new Error('oauth.provider.clientId deve essere una funzione');
  const name = typeof p.label === 'string' ? p.label : t('custom.provider');
  return {
    id: null, name, scopes: [], manual: false, scopeOnToken: p.scopeOnToken === true,
    params: p.params && typeof p.params === 'object' ? p.params : {},
    client: () => ({ id: str(p.clientId()), secret: typeof p.clientSecret === 'function' ? str(p.clientSecret()) : '' }),
    ready: () => (str(p.clientId()) ? null : t('custom.notReady')),
    endpoints: () => ({ authorize: p.authorizeUrl, token: p.tokenUrl }),
    error: (body, status) => commonError(body, status, name),
    noRefresh: t('custom.noRefresh', { name }),
  };
}

/** The claims of an id token (not verified: it came straight from the provider, only to say who signed in). */
export function claimsOf(idToken) {
  try {
    const claims = JSON.parse(Buffer.from(String(idToken).split('.')[1], 'base64url').toString('utf8'));
    return claims && typeof claims === 'object' ? claims : {};
  } catch {
    return {};
  }
}

const accountOf = claims => String(claims.preferred_username || claims.email || claims.upn || claims.name || '');

/** The access token of a connection, renewed with its refresh token when it is about to end. */
export class OAuthTokens {
  #request; #refresh; #save; #access = null; #until = 0; #renewing = null;

  /** request(form) → the provider's answer; save(refresh): the provider gave a new refresh token. */
  constructor(request, refresh, save = null, first = null) {
    this.#request = request;
    this.#refresh = refresh;
    this.#save = save;
    if (first) this.#keep(first);
  }

  #keep(body) {
    this.#access = body.access_token;
    this.#until = Date.now() + (Number(body.expires_in) || 3600) * 1000;
    if (typeof body.refresh_token === 'string' && body.refresh_token && body.refresh_token !== this.#refresh) {
      this.#refresh = body.refresh_token;
      try { this.#save?.(body.refresh_token); } catch { /* the kernel logs it */ }
    }
  }

  async get() {
    if (this.#access && Date.now() < this.#until - EARLY) return this.#access;
    return this.renew();
  }

  renew() {
    this.#renewing ??= this.#request({ grant_type: 'refresh_token', refresh_token: this.#refresh })
      .then(body => { this.#keep(body); return this.#access; })
      .finally(() => { this.#renewing = null; });
    return this.#renewing;
  }
}

const BINDINGS = new WeakMap();   // driver as the kernel uses it → its Binding

/** A driver's `oauth` with the provider and the app it uses. */
class Binding {
  constructor(apps, protocol, impl) {
    const decl = impl.oauth;
    if (!decl || typeof decl !== 'object') throw new Error('oauth non valido');
    this.preset = typeof decl.provider === 'string' ? providerOf(decl.provider) : decl.provider && typeof decl.provider === 'object' ? customProvider(decl.provider) : null;
    if (!this.preset) throw new Error(`fornitore oauth sconosciuto: ${decl.provider}`);
    if (!Array.isArray(decl.scopes) && typeof decl.scopes !== 'function') throw new Error('oauth.scopes non valido');
    this.field = decl.field ?? signInFields(impl)[0]?.key;
    if (!signInFields(impl).some(f => f.key === this.field)) throw new Error('oauth senza un campo signin');
    this.apps = apps;
    this.protocol = protocol;
    this.decl = decl;
  }

  get app() {
    return this.preset.id ? this.apps.values(this.preset.id) : {};
  }

  scopes(values = {}) {
    const own = typeof this.decl.scopes === 'function' ? this.decl.scopes(values) : this.decl.scopes;
    return [...new Set([...this.preset.scopes, ...(Array.isArray(own) ? own : [])].filter(s => typeof s === 'string' && s))];
  }

  notReady() {
    try {
      return this.preset.ready(this.app, this.decl);
    } catch {
      return t('notReady');
    }
  }

  #ready() {
    const why = this.notReady();
    if (why) throw netError('unsupported', typeof why === 'string' || why instanceof Text ? why : why.it ?? why.en);
  }

  /** A request to the provider's token address: form → its answer. Errors carry `net`. */
  async request(form, values = {}) {
    const app = this.app;
    const client = this.preset.client(app);
    const body = new URLSearchParams({
      client_id: client.id, ...(client.secret && { client_secret: client.secret }),
      ...(this.preset.scopeOnToken && { scope: this.scopes(values).join(' ') }), ...form,
    });
    let res;
    try {
      res = await this.apps.fetch(this.preset.endpoints(app, this.decl).token, {
        method: 'POST', body, signal: AbortSignal.timeout(TIMEOUT),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      });
    } catch (err) {
      if (err?.net) throw err;
      throw netError('unreachable', t('unreachable', { name: this.preset.name, message: err?.cause?.code ?? err?.message ?? err }));
    }
    const answer = await res.json().catch(() => null);
    if (!res.ok || typeof answer?.access_token !== 'string') {
      let mine = null;
      try { mine = this.decl.errors?.(answer, res.status) ?? null; } catch { /* the kernel's reading, then */ }
      throw mine ?? this.preset.error(answer, res.status);
    }
    return answer;
  }

  /** signIn for signin.js, made from the declaration. */
  get signIn() {
    const self = this;
    return {
      manual: this.decl.manual ?? this.preset.manual,
      onlyManual: () => self.preset.onlyManual?.(self.app) === true,
      start({ values = {}, redirectUri, state, challenge }) {
        self.#ready();
        const app = self.app;
        const extra = typeof self.decl.params === 'function' ? self.decl.params(values) : self.decl.params;
        const url = new URL(self.preset.endpoints(app, self.decl).authorize);
        // The parameters of the flow come last: no extra one replaces them
        url.search = new URLSearchParams({
          ...self.preset.params, ...(extra && typeof extra === 'object' ? extra : {}),
          client_id: self.preset.client(app).id, response_type: 'code', redirect_uri: redirectUri, scope: self.scopes(values).join(' '),
          state, code_challenge: challenge, code_challenge_method: 'S256',
        });
        return url.href;
      },
      async finish({ values = {}, code, redirectUri, verifier }) {
        self.#ready();
        const body = await self.request({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: verifier }, values);
        if (typeof body.refresh_token !== 'string' || !body.refresh_token) throw netError('invalid', self.preset.noRefresh);
        const tokens = new OAuthTokens(form => self.request(form, values), body.refresh_token, null, body);
        const claims = claimsOf(body.id_token);
        const granted = typeof body.scope === 'string' ? body.scope.split(/\s+/).filter(Boolean) : null;
        const account = String((self.decl.account ? await self.decl.account({ tokens, claims, granted, values }) : accountOf(claims)) ?? '').trim();
        if (!account) throw netError('invalid', t('noAccount', { name: self.preset.name }));
        return { account, secret: body.refresh_token };
      },
    };
  }

  /** The tokens of a connection from its secret, or null without a refresh token. */
  tokens(secret, saveSecret, values = {}) {
    const refresh = secret?.[this.field];
    if (typeof refresh !== 'string' || !refresh) return null;
    return new OAuthTokens(form => this.request(form, values), refresh, fresh => saveSecret?.({ [this.field]: fresh }));
  }
}

/** The tokens of a connection for its driver (one with `oauth`), or null. */
export const tokensFor = (driver, secret, saveSecret, values) => BINDINGS.get(driver)?.tokens(secret, saveSecret, values) ?? null;

/**
 * The apps an admin registers with the providers (PROVIDERS), one for each, used by every protocol
 * that signs in there: config.json `oauth: { microsoft: { clientId, accounts, tenant },
 * google: { clientId, clientSecret: 'v1:…', clientType } }`, secret fields sealed as the secret
 * settings of the modules (modules.js), in clear here. The Control Panel shows and changes them
 * (api/net.js /api/net/oauth): the protocols use the new values at once.
 */
export class OAuthApps {
  #values = {};         // provider id → its app, secret fields in clear
  #bound = new Map();   // protocol → Binding
  #secrets;

  constructor(raw, { secrets, fetch = globalThis.fetch } = {}) {
    this.#secrets = secrets;
    this.fetch = fetch;
    for (const id of Object.keys(PROVIDERS)) {
      const app = raw?.[id];
      this.#values[id] = app && typeof app === 'object' && !Array.isArray(app) ? { ...app } : {};
    }
  }

  /** Opens the sealed fields (before the protocols use them); ones that cannot be opened go. */
  async open(log) {
    for (const [id, app] of Object.entries(this.#values)) {
      for (const f of PROVIDERS[id].fields.filter(isSecret)) {
        const v = app[f.key];
        if (typeof v !== 'string' || !v.startsWith('v1:')) continue;
        try {
          const open = await this.#secrets.open(v);
          if (typeof open === 'string') app[f.key] = open; else delete app[f.key];
        } catch {
          delete app[f.key];
          log?.warn(`App ${id}: «${f.key}» non leggibile (va inserito di nuovo)`);
        }
      }
    }
  }

  values(id) {
    return providerOf(id) ? this.#values[id] : {};
  }

  /** The driver as the kernel uses it: signIn made from its `oauth`, ready() saying what the app lacks. Throws if `oauth` is not valid. */
  bind(protocol, impl) {
    const binding = new Binding(this, protocol, impl);
    const driver = Object.create(impl);
    driver.signIn = binding.signIn;
    driver.ready = () => (binding.decl.optional === true ? null : binding.notReady()) ?? impl.ready?.call(driver) ?? null;
    BINDINGS.set(driver, binding);
    this.#bound.set(protocol, binding);
    return driver;
  }

  /** The protocols that sign in with a provider's app. */
  protocols(id) {
    return [...this.#bound.values()].filter(b => b.preset.id === id).map(b => b.protocol);
  }

  /**
   * An app as the Control Panel sees it: { id, label, description, fields, values, secrets, live,
   * protocols, ready } (secrets: the keys of the secret fields that are set; ready: null or why not).
   */
  view(id) {
    const preset = providerOf(id) ?? fail('not_found', t('appNotFound'));
    const app = this.values(id);
    return {
      id, label: preset.label, description: preset.description, fields: preset.fields, live: true,
      values: Object.fromEntries(preset.fields.filter(f => !isSecret(f) && app[f.key] !== undefined).map(f => [f.key, app[f.key]])),
      secrets: preset.fields.filter(f => isSecret(f) && str(app[f.key])).map(f => f.key),
      protocols: this.protocols(id),
      ready: preset.ready(app, {}),
    };
  }

  list() {
    return Object.keys(PROVIDERS).map(id => this.view(id));
  }

  /**
   * Changes an app: { key: value } of its fields (others in its configuration stay). A secret field
   * left out or empty keeps its value; null removes it. → its view
   */
  async save(id, raw) {
    const preset = providerOf(id) ?? fail('not_found', t('appNotFound'));
    const plainFields = preset.fields.filter(f => !isSecret(f));
    const { values } = checkFields({ fields: plainFields }, raw);
    if (values.tenant !== undefined && !TENANT.test(values.tenant)) fail('invalid', t('tenantInvalid'));
    const sealed = {}, clear = {}, gone = new Set();
    for (const f of preset.fields.filter(isSecret)) {
      const v = raw?.[f.key];
      if (v === null) gone.add(f.key);
      else if (typeof v === 'string' && v.trim()) {
        if (v.length > 4096) fail('invalid', t('value', { key: f.key }));
        clear[f.key] = v.trim();
        sealed[f.key] = await this.#secrets.seal(v.trim());
      }
    }
    const apply = (app, secret) => {
      for (const f of plainFields) if (values[f.key] === undefined) delete app[f.key]; else app[f.key] = values[f.key];
      for (const k of gone) delete app[k];
      Object.assign(app, secret);
      return app;
    };
    await editConfig(file => {
      const all = file.oauth && typeof file.oauth === 'object' && !Array.isArray(file.oauth) ? file.oauth : {};
      all[id] = apply(all[id] && typeof all[id] === 'object' ? all[id] : {}, sealed);
      file.oauth = all;
    });
    apply(this.#values[id], clear);
    return this.view(id);
  }
}

/**
 * Where the app was before lilOS 1.22.0: in the settings of each module (the same client ID typed
 * in OneDrive and in Azure Blob Storage, in Google Drive and in Google Photos). Modules in order:
 * the first with a client ID gives the app.
 */
const LEGACY = {
  microsoft: ['netfs-onedrive', 'netfs-azblob'],
  google: ['netfs-google', 'netfs-gdrive', 'netfs-gphotos'],
};
const LEGACY_KEYS = ['clientId', 'clientSecret', 'clientType', 'accounts', 'tenant', 'loginUrl', 'authUrl', 'tokenUrl'];

/** The Microsoft app as a module kept it: OneDrive's accounts and tenant, or Azure Blob's tenant (organizations, or a directory). */
function legacyApp(id, name, cfg) {
  const pick = keys => Object.fromEntries(keys.filter(k => cfg[k] !== undefined && cfg[k] !== '').map(k => [k, cfg[k]]));
  if (id === 'google') return pick(['clientId', 'clientSecret', 'clientType', 'authUrl', 'tokenUrl']);
  if (name === 'netfs-azblob') {
    const tenant = str(cfg.tenant) || 'organizations';
    return { ...pick(['clientId', 'loginUrl']), ...(['common', 'organizations', 'consumers'].includes(tenant) ? { accounts: tenant } : { accounts: 'tenant', tenant }) };
  }
  return pick(['clientId', 'accounts', 'tenant', 'loginUrl']);
}

/**
 * At start, before the modules: an app not set yet comes from the settings of the modules that kept
 * it (sealed secrets copied as they are: same key); those settings leave a module's configuration
 * once its module.json no longer has them (a version that signs in through the kernel). `config`:
 * loadConfig()'s, changed in place too; `mods`: the modules about to start (resolveModules).
 * Returns whether config.json changed.
 */
export async function migrateOAuthSettings(config, mods, log) {
  const oauth = {};
  for (const [id, names] of Object.entries(LEGACY)) {
    if (str(config.oauth?.[id]?.clientId)) continue;
    const kept = names.map(name => config.modules.find(m => m.name === name)).filter(m => str(m?.config?.clientId));
    if (!kept.length) continue;
    const app = legacyApp(id, kept[0].name, kept[0].config);
    // A secret the first did not keep, from another with the same client ID
    for (const m of kept.slice(1)) {
      if (str(m.config.clientId) !== app.clientId) continue;
      for (const [k, v] of Object.entries(legacyApp(id, m.name, m.config))) if (app[k] === undefined) app[k] = v;
    }
    oauth[id] = { ...(config.oauth?.[id] ?? {}), ...app };
    log?.info(`App ${id} presa dalle impostazioni di ${kept[0].name}`);
  }
  const drop = new Map();   // module → keys that leave its configuration
  for (const mod of mods) {
    if (!Object.values(LEGACY).flat().includes(mod.name)) continue;
    const keys = LEGACY_KEYS.filter(k => mod.config[k] !== undefined && !mod.settings.some(f => f.key === k));
    if (keys.length) drop.set(mod.name, keys);
  }
  if (!Object.keys(oauth).length && !drop.size) return false;
  await editConfig(file => {
    if (Object.keys(oauth).length) file.oauth = { ...(file.oauth && typeof file.oauth === 'object' ? file.oauth : {}), ...oauth };
    for (const m of Array.isArray(file.modules) ? file.modules : []) {
      for (const k of drop.get(m?.name) ?? []) if (m.config) delete m.config[k];
    }
  });
  Object.assign(config.oauth, oauth);
  for (const mod of mods) for (const k of drop.get(mod.name) ?? []) delete mod.config[k];
  return true;
}
