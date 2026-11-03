import { str, newCollection, newRequest, header, baseName, kindOfType, fixHeaders, formFields, isFormText, nameOf } from './common.js';

/**
 * cURL command lines → requests: one or many commands, as bash writes them ('…', "…", $'…',
 * `\` at the end of a line) or as Windows' cmd does (^ escapes and continuations, "…" with the
 * rules of the C runtime: what Chrome's «Copy as cURL (cmd)» gives). The options a request has
 * become its fields; the others are ignored, with a warning when they mattered.
 */
export const isCurl = text => /^\s*(?:\$\s*)?curl(?:\.exe)?\s/im.test(String(text ?? '').replace(/^\s*(#|REM\b|::).*$/gim, ''));

// ---------- Words ----------

const ANSI_C = { n: '\n', t: '\t', r: '\r', e: '\x1b', a: '\x07', b: '\b', f: '\f', v: '\v', 0: '\0' };

/** Splits bash text into commands (arrays of words); `;`, `&&`, `||`, `|` and new lines separate them. */
function bashCommands(text) {
  const s = text.replace(/`\r?\n/g, ' ');   // PowerShell's backtick continuation
  const out = [];
  let words = [];
  let cur = null;
  const push = () => { if (cur !== null) words.push(cur); cur = null; };
  const end = () => { push(); if (words.length) out.push(words); words = []; };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') {
      if (s[i + 1] === '\n') { i++; continue; }
      if (s[i + 1] === '\r' && s[i + 2] === '\n') { i += 2; continue; }
      cur = (cur ?? '') + (s[i + 1] ?? '');
      i++;
    } else if (c === "'") {
      const j = s.indexOf("'", i + 1);
      cur = (cur ?? '') + s.slice(i + 1, j < 0 ? undefined : j);
      i = j < 0 ? s.length : j;
    } else if (c === '$' && s[i + 1] === "'") {
      let v = '';
      let j = i + 2;
      for (; j < s.length && s[j] !== "'"; j++) {
        if (s[j] !== '\\') { v += s[j]; continue; }
        const e = s[++j];
        const hex = /^x([0-9a-fA-F]{1,2})/.exec(s.slice(j));
        const uni = /^u([0-9a-fA-F]{4})/.exec(s.slice(j));
        if (hex) { v += String.fromCharCode(parseInt(hex[1], 16)); j += hex[0].length - 1; }
        else if (uni) { v += String.fromCharCode(parseInt(uni[1], 16)); j += 4; }
        else v += ANSI_C[e] ?? e;
      }
      cur = (cur ?? '') + v;
      i = j;
    } else if (c === '"') {
      let v = '';
      let j = i + 1;
      for (; j < s.length && s[j] !== '"'; j++) {
        if (s[j] === '\\' && '$`"\\\n'.includes(s[j + 1])) { if (s[j + 1] !== '\n') v += s[j + 1]; j++; } else v += s[j];
      }
      cur = (cur ?? '') + v;
      i = j;
    } else if (c === ' ' || c === '\t') {
      push();
    } else if (c === '\n' || c === '\r' || c === ';') {
      end();
    } else if ((c === '&' && s[i + 1] === '&') || c === '|') {
      end();
      if (s[i + 1] === c) i++;
    } else if (c === '#' && cur === null) {
      while (i < s.length && s[i] !== '\n') i++;
      end();
    } else {
      cur = (cur ?? '') + c;
    }
  }
  end();
  return out;
}

/** cmd: ^ escapes, continuations and separators first, then each command split as the C runtime does. */
function cmdCommands(raw) {
  const text = raw.replace(/\r\n?/g, '\n');
  const commands = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { quoted = !quoted; cur += c; continue; }
    if (quoted) { cur += c; continue; }
    if (c === '^') {
      const n = text[i + 1];
      if (n === '\n') {
        i++;
        // ^ then an empty line: a new line inside the word (Chrome writes them so)
        if (text[i + 1] === '\n') { cur += '\n'; i++; }
        continue;
      }
      // an escaped " is a quote for the program, not for cmd
      if (n !== undefined) cur += n;
      i++;
      continue;
    }
    if (c === '\n' || c === '&' || c === '|') {
      if (cur.trim()) commands.push(cur);
      cur = '';
      if (text[i + 1] === c) i++;
      continue;
    }
    cur += c;
  }
  if (cur.trim()) commands.push(cur);
  return commands.map(msvcrtWords).filter(w => w.length && !/^(rem|::)$/i.test(w[0]));
}

/** The C runtime's rules: "…" groups, \" is a quote, 2n backslashes before " are n, "" inside quotes is ". */
function msvcrtWords(line) {
  const words = [];
  let cur = null;
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '\\') {
      let n = 0;
      while (line[i + n] === '\\') n++;
      if (line[i + n] === '"') {
        cur = (cur ?? '') + '\\'.repeat(Math.floor(n / 2));
        i += n - 1;
        if (n % 2 === 1) { cur += '"'; i++; }
        continue;
      }
      cur = (cur ?? '') + '\\'.repeat(n);
      i += n - 1;
    } else if (c === '"') {
      if (quoted && line[i + 1] === '"') { cur = (cur ?? '') + '"'; i++; continue; }
      quoted = !quoted;
      cur = cur ?? '';
    } else if ((c === ' ' || c === '\t') && !quoted) {
      if (cur !== null) words.push(cur);
      cur = null;
    } else {
      cur = (cur ?? '') + c;
    }
  }
  if (cur !== null) words.push(cur);
  return words;
}

/** cmd's text: lines that go on with ^, or words that start with ^" (Chrome); bash's \ at the end of a line wins. */
const isCmd = text => !/\s\\\r?\n/.test(text) && (/\s\^\r?\n/.test(text) || /(^|\s)\^"/.test(text));

// ---------- Options ----------

const SHORT_ARG = new Set('XHdFuAebowcmxUTErKyYzPQDt'.split(''));
const LONG_ARG = new Set([
  'request', 'header', 'data', 'data-raw', 'data-binary', 'data-ascii', 'data-urlencode', 'json', 'form', 'form-string', 'user',
  'user-agent', 'referer', 'cookie', 'url', 'output', 'write-out', 'cookie-jar', 'max-time', 'connect-timeout', 'proxy',
  'proxy-user', 'oauth2-bearer', 'aws-sigv4', 'upload-file', 'cacert', 'capath', 'cert', 'key', 'max-redirs', 'resolve', 'retry',
  'limit-rate', 'range', 'config', 'interface', 'retry-delay', 'retry-max-time', 'speed-limit', 'speed-time', 'time-cond',
  'trace', 'trace-ascii', 'stderr', 'dns-servers', 'noproxy', 'cert-type', 'key-type', 'pass', 'ciphers', 'tls-max', 'ftp-port',
  'quote', 'expect100-timeout', 'unix-socket', 'abstract-unix-socket', 'connect-to', 'dump-header', 'variable', 'proto',
  'proto-redir', 'header-file', 'request-target', 'telnet-option', 'local-port', 'max-filesize', 'netrc-file', 'pinnedpubkey',
  'socks5', 'socks5-hostname', 'preproxy', 'happy-eyeballs-timeout-ms', 'keepalive-time', 'login-options', 'sasl-authzid', 'mail-from', 'mail-rcpt',
]);
const SHORT_LONG = { X: 'request', H: 'header', d: 'data', F: 'form', u: 'user', A: 'user-agent', e: 'referer', b: 'cookie', o: 'output', w: 'write-out', c: 'cookie-jar', m: 'max-time', x: 'proxy', U: 'proxy-user', T: 'upload-file', E: 'cert', r: 'range', K: 'config', D: 'dump-header', k: 'insecure', L: 'location', G: 'get', I: 'head', s: 'silent', S: 'show-error', v: 'verbose', i: 'include', O: 'remote-name', f: 'fail', '#': 'progress-bar', N: 'no-buffer', g: 'globoff', j: 'junk-session-cookies', n: 'netrc', q: 'disable', Z: 'parallel' };
const IGNORED = new Set(['output', 'write-out', 'cookie-jar', 'silent', 'show-error', 'verbose', 'include', 'remote-name', 'fail', 'fail-with-body', 'progress-bar', 'no-buffer', 'globoff', 'dump-header', 'retry', 'retry-delay', 'retry-max-time', 'connect-timeout', 'stderr', 'trace', 'trace-ascii', 'path-as-is', 'no-progress-meter', 'remote-header-name', 'create-dirs', 'styled-output', 'no-keepalive', 'tcp-nodelay', 'ipv4', 'ipv6', 'raw', 'tr-encoding', 'disable']);

/** The options of one command, in order: [{ name, value }] and the URLs. */
function options(words, warn) {
  const opts = [];
  const urls = [];
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    if (w === '--') { urls.push(...words.slice(i + 1)); break; }
    if (w.startsWith('--')) {
      const name = w.slice(2);
      if (LONG_ARG.has(name)) opts.push({ name, value: words[++i] ?? '' });
      else opts.push({ name, value: true });
    } else if (w.startsWith('-') && w.length > 1) {
      for (let k = 1; k < w.length; k++) {
        const letter = w[k];
        const name = SHORT_LONG[letter] ?? `-${letter}`;
        if (SHORT_ARG.has(letter)) {
          opts.push({ name, value: k + 1 < w.length ? w.slice(k + 1) : words[++i] ?? '' });
          break;
        }
        if (/[0-9]/.test(letter)) { opts.push({ name: `-${letter}`, value: true }); continue; }
        opts.push({ name, value: true });
      }
    } else {
      urls.push(w);
    }
  }
  if (urls.length > 1) warn.add('Più indirizzi in un comando curl: si usa il primo');
  return { opts, url: urls[0] ?? '' };
}

/** -F 'name=value;type=…' / 'name=@file;type=…;filename=…' / 'name=<file' → a multipart field. */
function formField(spec, literal) {
  const eq = spec.indexOf('=');
  const key = eq < 0 ? spec : spec.slice(0, eq);
  let rest = eq < 0 ? '' : spec.slice(eq + 1);
  if (literal) return { key, value: rest, type: 'text', enabled: true };
  let value = rest;
  let attrs = '';
  if (rest.startsWith('"')) {
    const end = rest.indexOf('"', 1);
    value = rest.slice(1, end < 0 ? undefined : end);
    attrs = end < 0 ? '' : rest.slice(end + 1);
  } else {
    const semi = rest.indexOf(';');
    if (semi >= 0) { value = rest.slice(0, semi); attrs = rest.slice(semi); }
  }
  const type = /;\s*type=([^;]+)/.exec(attrs)?.[1]?.trim() ?? '';
  const filename = /;\s*filename=("?)([^;"]+)\1/.exec(attrs)?.[2] ?? '';
  if (value.startsWith('@') || value.startsWith('<')) {
    return { key, value: '', type: 'file', file: '', fileName: filename || baseName(value.slice(1)), contentType: type, enabled: true };
  }
  return { key, value, type: 'text', contentType: type, enabled: true };
}

/** --data-urlencode: 'content', '=content', 'name=content', 'name@file'. */
function urlencoded(spec, warn) {
  const at = spec.search(/[=@]/);
  if (at < 0) return encodeURIComponent(spec);
  if (spec[at] === '@') { warn.add('--data-urlencode con un file: il contenuto va scritto nel corpo'); return spec.slice(0, at); }
  const name = spec.slice(0, at);
  return `${name ? `${name}=` : ''}${encodeURIComponent(spec.slice(at + 1))}`;
}

function requestFromWords(words, warn) {
  const { opts, url: rawUrl } = options(words, warn);
  let method = '';
  const headers = [];
  const data = [];
  let dataFile = null;
  let json = false;
  const fields = [];
  let get = false;
  let head = false;
  let upload = null;
  let auth = { type: 'inherit' };
  let user = null;
  let authKind = 'basic';
  let sigv4 = null;
  const settings = {};
  let url = rawUrl;
  const unknown = new Set();
  for (const { name, value } of opts) {
    const v = str(value);
    switch (name) {
      case 'request': method = v.toUpperCase(); break;
      case 'url': url = v; break;
      case 'header': {
        if (v.startsWith('@')) { warn.add('Header letti da file (-H @file) non importati'); break; }
        const colon = v.indexOf(':');
        if (colon < 0) { if (v.endsWith(';')) headers.push(header(v.slice(0, -1).trim(), '')); break; }
        const value2 = v.slice(colon + 1).trim();
        if (!value2) break;   // 'Name:' removes a header curl would send
        headers.push(header(v.slice(0, colon).trim(), value2));
        break;
      }
      case 'data': case 'data-ascii': case 'data-binary':
        if (v.startsWith('@')) dataFile = v.slice(1);
        else data.push(name === 'data-binary' ? v : v.replace(/[\r\n]/g, ''));
        break;
      case 'data-raw': data.push(v); break;
      case 'data-urlencode': data.push(urlencoded(v, warn)); break;
      case 'json':
        json = true;
        if (v.startsWith('@')) dataFile = v.slice(1); else data.push(v);
        break;
      case 'form': fields.push(formField(v, false)); break;
      case 'form-string': fields.push(formField(v, true)); break;
      case 'user': user = v; break;
      case 'digest': authKind = 'digest'; break;
      case 'basic': authKind = 'basic'; break;
      case 'ntlm': case 'negotiate': case 'anyauth': warn.add(`Autenticazione --${name} non supportata`); break;
      case 'aws-sigv4': sigv4 = v; break;
      case 'oauth2-bearer': auth = { type: 'bearer', token: v }; break;
      case 'user-agent': headers.push(header('User-Agent', v)); break;
      case 'referer': headers.push(header('Referer', v.replace(/;auto$/, ''))); break;
      case 'cookie':
        if (v.includes('=')) headers.push(header('Cookie', v));
        else warn.add('Cookie letti da file (-b file) non importati');
        break;
      case 'get': get = true; break;
      case 'head': head = true; break;
      case 'upload-file': upload = v; break;
      case 'insecure': settings.verify = false; break;
      case 'location': case 'location-trusted': settings.followRedirects = true; break;
      case 'max-redirs': settings.maxRedirects = Math.max(0, parseInt(v, 10) || 0); break;
      case 'max-time': settings.timeoutMs = Math.round((parseFloat(v) || 30) * 1000); break;
      case 'compressed': settings.decode = true; break;
      case 'http1.1': case 'http1.0': case '-0': settings.version = '1.1'; break;
      case 'http2': case 'http2-prior-knowledge': settings.version = '2'; break;
      case 'proxy': case 'socks5': case 'socks5-hostname': case 'preproxy': warn.add('Proxy non supportati: le richieste vanno dirette'); break;
      case 'cacert': case 'cert': case 'key': case 'capath': warn.add('Certificati (--cacert, --cert, --key): scegli i file nelle impostazioni della richiesta'); break;
      case 'config': warn.add('-K/--config non letto'); break;
      default:
        if (!IGNORED.has(name)) unknown.add(name.startsWith('-') ? name : `--${name}`);
    }
  }
  if (unknown.size) warn.add(`Opzioni di curl ignorate: ${[...unknown].slice(0, 8).join(', ')}`);
  if (!url) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url) && !url.startsWith('{{')) url = `http://${url}`;

  if (user !== null) {
    const colon = user.indexOf(':');
    const u = colon < 0 ? user : user.slice(0, colon);
    const p = colon < 0 ? '' : user.slice(colon + 1);
    if (colon < 0) warn.add('-u senza password: va scritta');
    if (sigv4) {
      const [, , region = '', service = ''] = sigv4.split(':');
      auth = { type: 'aws4', accessKey: u, secretKey: p, region, service };
    } else {
      auth = { type: authKind, user: u, password: p };
    }
  }

  // The body: -F (multipart), -d/--json (text or form), -T and -d @file (a file); -G puts -d in the address
  let body = { kind: 'none' };
  const type = headers.find(h => h.key.toLowerCase() === 'content-type')?.value;
  if (json) {
    if (!type) headers.push(header('Content-Type', 'application/json'));
    if (!headers.some(h => h.key.toLowerCase() === 'accept')) headers.push(header('Accept', 'application/json'));
  }
  const text = json ? data.join('') : data.join('&');
  if (get && data.length) {
    url = `${url}${url.includes('?') ? '&' : '?'}${text}`;
  } else if (fields.length) {
    body = { kind: 'multipart', fields };
  } else if (dataFile !== null || upload !== null) {
    body = { kind: 'file', file: '', fileName: baseName(dataFile ?? upload) };
    if (dataFile !== null && !type) headers.push(header('Content-Type', 'application/x-www-form-urlencoded'));
  } else if (data.length) {
    const kind = json ? 'json' : kindOfType(type);
    if (kind === 'form' || (!kind && !type && isFormText(text))) {
      body = { kind: 'form', fields: formFields(text) };
    } else if (kind && kind !== 'multipart') {
      body = { kind, text };
    } else {
      // curl sends -d as a form when nothing says otherwise: the header keeps that
      if (!type) headers.push(header('Content-Type', 'application/x-www-form-urlencoded'));
      body = { kind: 'text', text };
    }
  }
  if (!method) method = head ? 'HEAD' : upload !== null ? 'PUT' : get ? 'GET' : body.kind !== 'none' ? 'POST' : 'GET';
  return newRequest({ name: nameOf(method, url), method, url, headers: fixHeaders(headers, body), body, auth, settings });
}

export function importCurl(text, { name } = {}, warn) {
  const t = String(text ?? '');
  const commands = isCmd(t) ? cmdCommands(t) : bashCommands(t);
  const c = newCollection(name || 'cURL');
  for (const words of commands) {
    const first = words[0] === '$' ? words.slice(1) : words;
    if (!/^curl(\.exe)?$/i.test(baseName(first[0] ?? ''))) continue;
    const req = requestFromWords(first, warn);
    if (req) c.items.push(req);
    else warn.add('Un comando curl senza indirizzo è stato saltato');
  }
  // Without -u/--oauth2-bearer the request takes the folder's auth like any other
  return { collection: c, environments: [] };
}
