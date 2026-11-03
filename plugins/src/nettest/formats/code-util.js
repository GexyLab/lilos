import { str } from './common.js';

/** What the writers of «Copia come codice» share. */

/** The body of a GraphQL request as it goes: { query, variables, operationName? } (variables as written when not JSON). */
export function graphqlText(b) {
  const vars = str(b?.variables).trim();
  let v = '{}';
  if (vars) {
    try { v = JSON.stringify(JSON.parse(vars)); } catch { v = vars; }
  }
  const op = str(b?.operationName);
  return `{"query":${JSON.stringify(str(b?.query))},"variables":${v}${op ? `,"operationName":${JSON.stringify(op)}` : ''}}`;
}

/** application/x-www-form-urlencoded, with {{secrets}} left readable. */
export function formEncode(s) {
  return str(s).split(/(\{\{[^{}]+\}\})/).map((part, i) => (i % 2 ? part : encodeURIComponent(part).replace(/%20/g, '+'))).join('');
}

/** UTF-8 text → base64, in the page (btoa takes only Latin-1). */
export function base64(s) {
  let bin = '';
  for (const b of new TextEncoder().encode(str(s))) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** The headers that go with the body (C#'s content headers, PowerShell's -ContentType). */
export const isContentHeader = key => /^content-(type|language|encoding|disposition|md5|range|location)$/i.test(key) || /^(expires|last-modified|allow)$/i.test(key);

/** The name of the file of a home path ('~/Documenti/foto.png' → 'foto.png'). */
export const fileOf = path => str(path).split(/[\\/]/).filter(Boolean).pop() || 'file';

