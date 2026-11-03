import { base64, isContentHeader } from './code-util.js';

/**
 * «Copia come codice» for the command line: curl (bash and Windows' cmd), HTTPie, PowerShell,
 * and the raw HTTP/1.1 message. Each takes what code.js prepare() makes.
 */

/** bash: '…' with ' as '\'' */
export const sq = s => (/^[\w@%+=:,./-]+$/.test(s) ? s : `'${String(s).replace(/'/g, `'\\''`)}'`);

/**
 * cmd: "…" for the C runtime (a quote as \", the backslashes before it doubled), then cmd's own
 * escapes, as Chrome's «Copy as cURL (cmd)» does: ^ before what cmd would read, %^ so that no
 * %variable% is expanded, a new line as ^ and an empty line.
 */
export function winQuote(s) {
  const t = String(s).replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1');
  return `^"${t.replace(/[^a-zA-Z0-9\s_\-:=+~'/.,?;()*@`[\]{}]/g, '^$&').replace(/%(?=[a-zA-Z0-9_])/g, '%^').replace(/\r?\n/g, '^\n\n')}^"`;
}

/** PowerShell: '…' with ' as ''. */
export const pq = s => `'${String(s).replace(/'/g, "''")}'`;

export function curl(p, windows) {
  const q = windows ? winQuote : sq;
  const parts = [];
  const sends = !!p.body;
  if (p.method === 'HEAD' && !sends) parts.push('-I');
  else if (!(p.method === 'GET' && !sends) && !(p.method === 'POST' && sends)) parts.push(`-X ${p.method}`);
  parts.push(q(p.url));
  if (p.follow) parts.push('-L');
  if (p.insecure) parts.push('-k');
  if (p.timeoutMs) parts.push(`--max-time ${Math.ceil(p.timeoutMs / 1000)}`);
  for (const h of p.headers) parts.push(`-H ${q(h.value === '' ? `${h.key};` : `${h.key}: ${h.value}`)}`);
  if (p.basic) parts.push(`-u ${q(`${p.basic.user}:${p.basic.password}`)}`);
  if (p.digest) parts.push('--digest', `-u ${q(`${p.digest.user}:${p.digest.password}`)}`);
  if (p.aws4) parts.push(`--aws-sigv4 ${q(`aws:amz:${p.aws4.region}:${p.aws4.service}`)}`, `-u ${q(`${p.aws4.accessKey}:${p.aws4.secretKey}`)}`);
  const b = p.body;
  if (b?.type === 'text') parts.push(`--data-raw ${q(b.text)}`);
  if (b?.type === 'form') for (const [k, v] of b.fields) parts.push(`--data-urlencode ${q(`${k}=${v}`)}`);
  if (b?.type === 'multipart') {
    for (const f of b.fields) {
      const type = f.contentType ? `;type=${f.contentType}` : '';
      if (f.file !== undefined) parts.push(`-F ${q(`${f.key}=@${f.file}${type}`)}`);
      // a value starting with @ or < would be read as a file: --form-string sends it as it is
      else if (!type && /^[@<]|;/.test(f.value)) parts.push(`--form-string ${q(`${f.key}=${f.value}`)}`);
      else parts.push(`-F ${q(`${f.key}=${f.value}${type}`)}`);
    }
  }
  if (b?.type === 'file') parts.push(`--data-binary ${q(`@${b.path}`)}`);
  const notes = p.notes.map(n => `${windows ? 'REM' : '#'} ${n}\n`).join('');
  return `${notes}curl ${parts.join(windows ? ' ^\n  ' : ' \\\n  ')}`;
}

export function httpie(p) {
  const flags = [];
  const items = [];
  const b = p.body;
  if (p.follow) flags.push('--follow');
  if (p.insecure) flags.push('--verify=no');
  if (p.timeoutMs) flags.push(`--timeout=${Math.ceil(p.timeoutMs / 1000)}`);
  if (p.basic) flags.push(`-a ${sq(`${p.basic.user}:${p.basic.password}`)}`);
  if (p.digest) flags.push('-A digest', `-a ${sq(`${p.digest.user}:${p.digest.password}`)}`);
  const notes = [...p.notes];
  if (p.aws4) notes.push('AWS Signature v4: install the httpie-aws-auth plugin and add -A aws -a ACCESS_KEY:SECRET_KEY');
  const esc = k => k.replace(/([\\:=@])/g, '\\$1');
  for (const h of p.headers) {
    // HTTPie writes its own Content-Type for --form and --multipart
    if (b && (b.type === 'form' || b.type === 'multipart') && h.key.toLowerCase() === 'content-type') continue;
    items.push(sq(h.value === '' ? `${h.key};` : `${h.key}:${h.value}`));
  }
  let tail = '';
  if (b?.type === 'text') flags.push(`--raw ${sq(b.text)}`);
  if (b?.type === 'form') { flags.push('--form'); for (const [k, v] of b.fields) items.push(sq(`${esc(k)}=${v}`)); }
  if (b?.type === 'multipart') {
    flags.push('--multipart');
    for (const f of b.fields) items.push(sq(f.file !== undefined ? `${esc(f.key)}@${f.file}${f.contentType ? `;type=${f.contentType}` : ''}` : `${esc(f.key)}=${f.value}`));
  }
  if (b?.type === 'file') tail = ` < ${sq(b.path)}`;
  else flags.unshift('--ignore-stdin');
  const words = [...flags, p.method, sq(p.url), ...items];
  return `${notes.map(n => `# ${n}\n`).join('')}http ${words.join(' \\\n  ')}${tail}`;
}

const PS_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'MERGE']);

export function powershell(p) {
  const out = p.notes.map(n => `# ${n}`);
  const b = p.body;
  const headers = [];
  let contentType = null;
  let userAgent = null;
  for (const h of p.headers) {
    // Windows PowerShell wants these as parameters, not in -Headers
    if (h.key.toLowerCase() === 'content-type') contentType = h.value;
    else if (h.key.toLowerCase() === 'user-agent') userAgent = h.value;
    else if (!isContentHeader(h.key)) headers.push(`    ${pq(h.key)} = ${pq(h.value)}`);
  }
  if (p.basic) headers.push(`    'Authorization' = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(${pq(`${p.basic.user}:${p.basic.password}`)}))`);
  if (p.aws4) out.push('# AWS Signature v4: sign the request with the AWS Tools for PowerShell (or another library)');
  if (headers.length) out.push('$headers = @{', ...headers, '}');
  if (p.digest) out.push(`$credential = New-Object System.Management.Automation.PSCredential(${pq(p.digest.user)}, (ConvertTo-SecureString ${pq(p.digest.password)} -AsPlainText -Force))`);
  const params = [`    Uri = ${pq(p.url)}`];
  const m = p.method[0] + p.method.slice(1).toLowerCase();
  if (!PS_METHODS.has(p.method)) out.push('# -CustomMethod needs PowerShell 7 or later');
  params.push(PS_METHODS.has(p.method) ? `    Method = ${pq(m)}` : `    CustomMethod = ${pq(p.method)}`);
  if (headers.length) params.push('    Headers = $headers');
  if (contentType && b?.type !== 'multipart') params.push(`    ContentType = ${pq(contentType)}`);
  if (userAgent !== null) params.push(`    UserAgent = ${pq(userAgent)}`);
  if (b?.type === 'text') params.push(`    Body = ${pq(b.text)}`);
  if (b?.type === 'form') params.push(`    Body = @{\n${b.fields.map(([k, v]) => `        ${pq(k)} = ${pq(v)}`).join('\n')}\n    }`);
  if (b?.type === 'multipart') {
    out.push('# -Form needs PowerShell 7 or later');
    params.push(`    Form = @{\n${b.fields.map(f => `        ${pq(f.key)} = ${f.file !== undefined ? `Get-Item -LiteralPath ${pq(f.file)}` : pq(f.value)}`).join('\n')}\n    }`);
  }
  if (b?.type === 'file') params.push(`    InFile = ${pq(b.path)}`);
  if (p.digest) params.push('    Credential = $credential');
  if (!p.follow) params.push('    MaximumRedirection = 0');
  if (p.timeoutMs) params.push(`    TimeoutSec = ${Math.ceil(p.timeoutMs / 1000)}`);
  if (p.insecure) {
    out.push('# -SkipCertificateCheck needs PowerShell 7 or later');
    params.push('    SkipCertificateCheck = $true');
  }
  out.push('$params = @{', ...params, '}', '$response = Invoke-RestMethod @params', '$response | ConvertTo-Json -Depth 10');
  return out.join('\n');
}

const BOUNDARY = '----NetTestBoundary7MA4YWxkTrZu0gW';

/** The HTTP/1.1 message as it would go (the files written as a placeholder). */
export function raw(p) {
  const m = /^([a-z][a-z0-9+.-]*:)?\/\/([^/?#]*)([^#]*)/i.exec(p.url);
  const v = /^(\{\{[^{}]+\}\})([^#]*)/.exec(p.url);
  const host = m ? m[2] : v ? v[1] : '';
  const target = (m ? m[3] : v ? v[2] : p.url.split('#')[0]) || '/';
  const lines = [`${p.method} ${target.startsWith('/') || target === '*' ? target : `/${target}`} HTTP/1.1`];
  if (host && !p.headers.some(h => h.key.toLowerCase() === 'host')) lines.push(`Host: ${host}`);
  for (const h of p.headers) lines.push(`${h.key}: ${h.value}`);
  if (p.basic) {
    // a {{secret}} cannot be encoded here: the pair is shown as it is
    const pair = `${p.basic.user}:${p.basic.password}`;
    lines.push(`Authorization: Basic ${pair.includes('{{') ? `<base64 of "${pair}">` : base64(pair)}`);
  }
  if (p.digest) lines.push('Authorization: Digest <answer to the server\'s challenge>');
  if (p.aws4) lines.push('Authorization: AWS4-HMAC-SHA256 <signature>');
  const b = p.body;
  let body = '';
  let length = true;
  if (b?.type === 'text' || b?.type === 'form') body = b.text;
  if (b?.type === 'multipart') {
    lines.push(`Content-Type: multipart/form-data; boundary=${BOUNDARY}`);
    for (const f of b.fields) {
      const name = f.key.replace(/["\r\n]/g, '_');
      if (f.file !== undefined) body += `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"; filename="${f.file.split(/[\\/]/).pop()}"\r\nContent-Type: ${f.contentType || 'application/octet-stream'}\r\n\r\n<contents of ${f.file}>\r\n`;
      else body += `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"\r\n${f.contentType ? `Content-Type: ${f.contentType}\r\n` : ''}\r\n${f.value}\r\n`;
    }
    body += `--${BOUNDARY}--\r\n`;
    body = body.replace(/\r\n/g, '\n');
    length = false;
  }
  if (b?.type === 'file') { body = `<contents of ${b.path}>`; length = false; }
  if (body && length && !body.includes('{{') && !p.headers.some(h => h.key.toLowerCase() === 'content-length')) {
    lines.push(`Content-Length: ${new TextEncoder().encode(body).length}`);
  }
  return `${lines.join('\n')}\n${body ? `\n${body}` : ''}`;
}
