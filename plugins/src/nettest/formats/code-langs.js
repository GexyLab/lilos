import { isContentHeader, fileOf } from './code-util.js';

/**
 * «Copia come codice» in programming languages: JavaScript (browser and Node), Python, Go, Java,
 * C#, PHP. Each takes what code.js prepare() makes. String literals are JSON's, which every one
 * of these languages reads the same way (PHP's are single-quoted).
 */
const lit = s => JSON.stringify(String(s));
const AWS_NOTE = 'AWS Signature v4: sign the request with the AWS SDK (or another library)';
const DIGEST_NOTE = 'Digest authentication: answer the server\'s challenge with a library';

// ---------- JavaScript ----------

function js(p, node) {
  const out = p.notes.map(n => `// ${n}`);
  const b = p.body;
  if (p.digest) out.push(`// ${DIGEST_NOTE}`);
  if (p.aws4) out.push(`// ${node ? 'AWS Signature v4: sign the request with @aws-sdk/signature-v4 (or aws4fetch)' : 'AWS Signature v4: sign the request with aws4fetch (or another library)'}`);
  if (p.insecure) out.push(node ? '// self-signed certificate: run with NODE_TLS_REJECT_UNAUTHORIZED=0 (only for tests)' : '// the browser always checks the certificate');
  if (node && b?.type === 'file') out.unshift("import { readFile } from 'node:fs/promises';", '');
  if (node && b?.type === 'multipart' && b.fields.some(f => f.file !== undefined)) out.unshift("import { openAsBlob } from 'node:fs';", '');
  if (b?.type === 'multipart') {
    out.push('const form = new FormData();');
    for (const f of b.fields) {
      if (f.file === undefined) out.push(f.contentType ? `form.append(${lit(f.key)}, new Blob([${lit(f.value)}], { type: ${lit(f.contentType)} }));` : `form.append(${lit(f.key)}, ${lit(f.value)});`);
      else if (node) out.push(`form.append(${lit(f.key)}, await openAsBlob(${lit(f.file)}${f.contentType ? `, { type: ${lit(f.contentType)} }` : ''}), ${lit(fileOf(f.file))});`);
      else out.push(`form.append(${lit(f.key)}, fileInput.files[0]); // ${f.file}: a file picked with <input type="file">`);
    }
  }
  if (!node && b?.type === 'file') out.push(`const file = fileInput.files[0]; // ${b.path}: a file picked with <input type="file">`);
  const headers = p.headers.map(h => `    ${lit(h.key)}: ${lit(h.value)},`);
  if (p.basic) headers.push(`    Authorization: 'Basic ' + ${node ? `Buffer.from(${lit(`${p.basic.user}:${p.basic.password}`)}).toString('base64')` : `btoa(${lit(`${p.basic.user}:${p.basic.password}`)})`},`);
  const opts = [`  method: ${lit(p.method)},`];
  if (headers.length) opts.push('  headers: {', ...headers, '  },');
  if (b?.type === 'text') opts.push(`  body: ${lit(b.text)},`);
  if (b?.type === 'form') opts.push(`  body: new URLSearchParams([${b.fields.map(([k, v]) => `[${lit(k)}, ${lit(v)}]`).join(', ')}]),`);
  if (b?.type === 'multipart') opts.push('  body: form,');
  if (b?.type === 'file') opts.push(node ? `  body: await readFile(${lit(b.path)}),` : '  body: file,');
  if (!p.follow) opts.push("  redirect: 'manual',");
  if (p.timeoutMs) opts.push(`  signal: AbortSignal.timeout(${p.timeoutMs}),`);
  out.push(`const response = await fetch(${lit(p.url)}, {`, ...opts, '});', '', 'console.log(response.status);', 'console.log(await response.text());');
  return out.join('\n');
}

export const fetchJs = p => js(p, false);
export const nodeJs = p => js(p, true);

// ---------- Python ----------

export function python(p) {
  const imports = ['import requests'];
  const out = p.notes.map(n => `# ${n}`);
  const b = p.body;
  const args = ['url'];
  out.push(`url = ${lit(p.url)}`);
  if (p.headers.length) {
    out.push('headers = {', ...p.headers.map(h => `    ${lit(h.key)}: ${lit(h.value)},`), '}');
    args.push('headers=headers');
  }
  if (b?.type === 'text') { out.push(`payload = ${lit(b.text)}`); args.push('data=payload.encode("utf-8")'); }
  if (b?.type === 'form') { out.push('payload = [', ...b.fields.map(([k, v]) => `    (${lit(k)}, ${lit(v)}),`), ']'); args.push('data=payload'); }
  if (b?.type === 'multipart') {
    out.push('files = [', ...b.fields.map(f => (f.file !== undefined
      ? `    (${lit(f.key)}, (${lit(fileOf(f.file))}, open(${lit(f.file)}, "rb")${f.contentType ? `, ${lit(f.contentType)}` : ''})),`
      : `    (${lit(f.key)}, (None, ${lit(f.value)}${f.contentType ? `, ${lit(f.contentType)}` : ''})),`)), ']');
    args.push('files=files');
  }
  if (b?.type === 'file') args.push(`data=open(${lit(b.path)}, "rb")`);
  if (p.basic) args.push(`auth=(${lit(p.basic.user)}, ${lit(p.basic.password)})`);
  if (p.digest) { imports.push('from requests.auth import HTTPDigestAuth'); args.push(`auth=HTTPDigestAuth(${lit(p.digest.user)}, ${lit(p.digest.password)})`); }
  if (p.aws4) {
    imports.push('from requests_aws4auth import AWS4Auth  # pip install requests-aws4auth');
    args.push(`auth=AWS4Auth(${[p.aws4.accessKey, p.aws4.secretKey, p.aws4.region, p.aws4.service].map(lit).join(', ')})`);
  }
  if (p.insecure) args.push('verify=False');
  if (!p.follow) args.push('allow_redirects=False');
  else if (p.method === 'HEAD') args.push('allow_redirects=True');
  if (p.timeoutMs) args.push(`timeout=${p.timeoutMs / 1000}`);
  out.push(`response = requests.request(${lit(p.method)}, ${args.join(', ')})`, '', 'print(response.status_code)', 'print(response.text)');
  return `${imports.join('\n')}\n\n${out.join('\n')}`;
}

// ---------- Go ----------

export function go(p) {
  const imports = new Set(['fmt', 'io', 'net/http']);
  const body = [];
  const b = p.body;
  const fail = ['\tif err != nil {', '\t\tpanic(err)', '\t}'];
  for (const n of p.notes) body.push(`\t// ${n}`);
  if (p.digest) body.push(`\t// ${DIGEST_NOTE}`);
  if (p.aws4) body.push(`\t// ${AWS_NOTE} (github.com/aws/aws-sdk-go-v2/aws/signer/v4)`);
  let payload = 'nil';
  let formType = false;
  if (b?.type === 'text' || b?.type === 'form') {
    imports.add('strings');
    if (b.type === 'form') {
      imports.add('net/url');
      body.push('\tform := url.Values{}', ...b.fields.map(([k, v]) => `\tform.Add(${lit(k)}, ${lit(v)})`), '\tpayload := strings.NewReader(form.Encode())');
    } else body.push(`\tpayload := strings.NewReader(${lit(b.text)})`);
    payload = 'payload';
  }
  if (b?.type === 'multipart') {
    imports.add('bytes'); imports.add('mime/multipart');
    body.push('\tpayload := &bytes.Buffer{}', '\twriter := multipart.NewWriter(payload)');
    b.fields.forEach((f, i) => {
      if (f.file === undefined) { body.push(`\twriter.WriteField(${lit(f.key)}, ${lit(f.value)})`); return; }
      imports.add('os');
      body.push(`\tfile${i}, err := os.Open(${lit(f.file)})`, ...fail, `\tdefer file${i}.Close()`, `\tpart${i}, err := writer.CreateFormFile(${lit(f.key)}, ${lit(fileOf(f.file))})`, ...fail, `\tio.Copy(part${i}, file${i})`);
    });
    body.push('\twriter.Close()');
    payload = 'payload';
    formType = true;
  }
  if (b?.type === 'file') {
    imports.add('os');
    body.push(`\tpayload, err := os.Open(${lit(b.path)})`, ...fail, '\tdefer payload.Close()');
    payload = 'payload';
  }
  body.push('', `\treq, err := http.NewRequest(${lit(p.method)}, ${lit(p.url)}, ${payload})`, ...fail);
  for (const h of p.headers) body.push(`\treq.Header.Add(${lit(h.key)}, ${lit(h.value)})`);
  if (formType) body.push('\treq.Header.Set("Content-Type", writer.FormDataContentType())');
  if (p.basic) body.push(`\treq.SetBasicAuth(${lit(p.basic.user)}, ${lit(p.basic.password)})`);
  const client = [];
  if (p.insecure) {
    imports.add('crypto/tls');
    client.push('\t\tTransport: &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}},');
  }
  if (!p.follow) client.push('\t\tCheckRedirect: func(req *http.Request, via []*http.Request) error { return http.ErrUseLastResponse },');
  if (p.timeoutMs) { imports.add('time'); client.push(`\t\tTimeout: ${p.timeoutMs} * time.Millisecond,`); }
  body.push('', client.length ? ['\tclient := &http.Client{', ...client, '\t}'].join('\n') : '\tclient := &http.Client{}');
  body.push('\tres, err := client.Do(req)', ...fail, '\tdefer res.Body.Close()', '', '\tdata, err := io.ReadAll(res.Body)', ...fail, '\tfmt.Println(res.Status)', '\tfmt.Println(string(data))');
  const list = [...imports].sort().map(i => `\t"${i}"`);
  return `package main\n\nimport (\n${list.join('\n')}\n)\n\nfunc main() {\n${body.join('\n')}\n}\n`;
}

// ---------- Java ----------

const JAVA_RESTRICTED = /^(connection|content-length|expect|host|upgrade)$/i;

export function java(p) {
  const imports = new Set(['java.net.URI', 'java.net.http.HttpClient', 'java.net.http.HttpRequest', 'java.net.http.HttpResponse']);
  const pre = [];
  const b = p.body;
  const I = '        ';
  for (const n of p.notes) pre.push(`${I}// ${n}`);
  if (p.digest) pre.push(`${I}// ${DIGEST_NOTE}`);
  if (p.aws4) pre.push(`${I}// ${AWS_NOTE}`);
  if (p.insecure) pre.push(`${I}// to skip the certificate check, build the client with an SSLContext that trusts it`);
  let publisher = 'HttpRequest.BodyPublishers.noBody()';
  if (b?.type === 'text' || b?.type === 'form') publisher = `HttpRequest.BodyPublishers.ofString(${lit(b.text)})`;
  if (b?.type === 'file') { imports.add('java.nio.file.Path'); publisher = `HttpRequest.BodyPublishers.ofFile(Path.of(${lit(b.path)}))`; }
  if (b?.type === 'multipart') {
    imports.add('java.io.ByteArrayOutputStream'); imports.add('java.nio.charset.StandardCharsets');
    pre.push(`${I}String boundary = "----NetTestBoundary7MA4YWxkTrZu0gW";`, `${I}ByteArrayOutputStream form = new ByteArrayOutputStream();`);
    for (const f of b.fields) {
      const name = f.key.replace(/["\r\n]/g, '_');
      if (f.file === undefined) {
        pre.push(`${I}form.write(("--" + boundary + ${lit(`\r\nContent-Disposition: form-data; name="${name}"\r\n${f.contentType ? `Content-Type: ${f.contentType}\r\n` : ''}\r\n${f.value}\r\n`)}).getBytes(StandardCharsets.UTF_8));`);
      } else {
        imports.add('java.nio.file.Files'); imports.add('java.nio.file.Path');
        pre.push(
          `${I}form.write(("--" + boundary + ${lit(`\r\nContent-Disposition: form-data; name="${name}"; filename="${fileOf(f.file)}"\r\nContent-Type: ${f.contentType || 'application/octet-stream'}\r\n\r\n`)}).getBytes(StandardCharsets.UTF_8));`,
          `${I}form.write(Files.readAllBytes(Path.of(${lit(f.file)})));`,
          `${I}form.write("\\r\\n".getBytes(StandardCharsets.UTF_8));`,
        );
      }
    }
    pre.push(`${I}form.write(("--" + boundary + "--\\r\\n").getBytes(StandardCharsets.UTF_8));`);
    publisher = 'HttpRequest.BodyPublishers.ofByteArray(form.toByteArray())';
  }
  const req = [`${I}HttpRequest request = HttpRequest.newBuilder()`, `${I}    .uri(URI.create(${lit(p.url)}))`];
  for (const h of p.headers) {
    if (JAVA_RESTRICTED.test(h.key)) { req.push(`${I}    // ${h.key}: set by HttpClient itself`); continue; }
    req.push(`${I}    .header(${lit(h.key)}, ${lit(h.value)})`);
  }
  if (b?.type === 'multipart') req.push(`${I}    .header("Content-Type", "multipart/form-data; boundary=" + boundary)`);
  if (p.basic) {
    imports.add('java.util.Base64'); imports.add('java.nio.charset.StandardCharsets');
    req.push(`${I}    .header("Authorization", "Basic " + Base64.getEncoder().encodeToString(${lit(`${p.basic.user}:${p.basic.password}`)}.getBytes(StandardCharsets.UTF_8)))`);
  }
  if (p.timeoutMs) { imports.add('java.time.Duration'); req.push(`${I}    .timeout(Duration.ofMillis(${p.timeoutMs}))`); }
  req.push(`${I}    .method(${lit(p.method)}, ${publisher})`, `${I}    .build();`);
  const client = [`${I}HttpClient client = HttpClient.newBuilder()`, `${I}    .followRedirects(HttpClient.Redirect.${p.follow ? 'NORMAL' : 'NEVER'})`, `${I}    .build();`];
  const main = [...pre, ...client, ...req, `${I}HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());`, `${I}System.out.println(response.statusCode());`, `${I}System.out.println(response.body());`];
  return `${[...imports].sort().map(i => `import ${i};`).join('\n')}\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n${main.join('\n')}\n    }\n}\n`;
}

// ---------- C# ----------

export function csharp(p) {
  const usings = new Set(['System.Net.Http', 'System.Net.Http.Headers', 'System.Text']);
  const out = p.notes.map(n => `// ${n}`);
  const b = p.body;
  if (p.aws4) out.push(`// ${AWS_NOTE}`);
  if (b?.type === 'file' || (b?.type === 'multipart' && b.fields.some(f => f.file !== undefined))) usings.add('System.IO');
  if (b?.type === 'form') usings.add('System.Collections.Generic');
  const handler = [];
  if (!p.follow) handler.push('    AllowAutoRedirect = false,');
  if (p.insecure) handler.push('    ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator,');
  if (p.digest) handler.push(`    Credentials = new System.Net.NetworkCredential(${lit(p.digest.user)}, ${lit(p.digest.password)}),`);
  if (handler.length) out.push('var handler = new HttpClientHandler', '{', ...handler, '};', 'using var client = new HttpClient(handler);');
  else out.push('using var client = new HttpClient();');
  if (p.timeoutMs) out.push(`client.Timeout = TimeSpan.FromMilliseconds(${p.timeoutMs});`);
  out.push(`var request = new HttpRequestMessage(new HttpMethod(${lit(p.method)}), ${lit(p.url)});`);
  for (const h of p.headers) if (!isContentHeader(h.key)) out.push(`request.Headers.TryAddWithoutValidation(${lit(h.key)}, ${lit(h.value)});`);
  if (p.basic) out.push(`request.Headers.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes(${lit(`${p.basic.user}:${p.basic.password}`)})));`);
  if (b?.type === 'text') out.push(`request.Content = new StringContent(${lit(b.text)}, Encoding.UTF8);`);
  if (b?.type === 'form') out.push('request.Content = new FormUrlEncodedContent(new[]', '{', ...b.fields.map(([k, v]) => `    new KeyValuePair<string, string>(${lit(k)}, ${lit(v)}),`), '});');
  if (b?.type === 'file') out.push(`request.Content = new StreamContent(File.OpenRead(${lit(b.path)}));`);
  if (b?.type === 'multipart') {
    out.push('var form = new MultipartFormDataContent();');
    b.fields.forEach((f, i) => {
      if (f.file === undefined) {
        out.push(f.contentType ? `form.Add(new StringContent(${lit(f.value)}, Encoding.UTF8, ${lit(f.contentType)}), ${lit(f.key)});` : `form.Add(new StringContent(${lit(f.value)}), ${lit(f.key)});`);
        return;
      }
      out.push(`var file${i} = new StreamContent(File.OpenRead(${lit(f.file)}));`);
      if (f.contentType) out.push(`file${i}.Headers.ContentType = MediaTypeHeaderValue.Parse(${lit(f.contentType)});`);
      out.push(`form.Add(file${i}, ${lit(f.key)}, ${lit(fileOf(f.file))});`);
    });
    out.push('request.Content = form;');
  }
  if (b && b.type !== 'multipart') {
    for (const h of p.headers.filter(x => isContentHeader(x.key))) {
      out.push(`request.Content.Headers.Remove(${lit(h.key)});`, `request.Content.Headers.TryAddWithoutValidation(${lit(h.key)}, ${lit(h.value)});`);
    }
  }
  out.push('', 'var response = await client.SendAsync(request);', 'Console.WriteLine((int)response.StatusCode);', 'Console.WriteLine(await response.Content.ReadAsStringAsync());');
  return `${[...usings].map(u => `using ${u};`).join('\n')}\n\n${out.join('\n')}\n`;
}

// ---------- PHP ----------

const php1 = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

export function php(p) {
  const b = p.body;
  const opts = [`    CURLOPT_URL => ${php1(p.url)},`, '    CURLOPT_RETURNTRANSFER => true,'];
  if (p.method === 'HEAD') opts.push('    CURLOPT_NOBODY => true,');
  else opts.push(`    CURLOPT_CUSTOMREQUEST => ${php1(p.method)},`);
  opts.push(`    CURLOPT_FOLLOWLOCATION => ${p.follow ? 'true' : 'false'},`);
  if (p.timeoutMs) opts.push(`    CURLOPT_TIMEOUT_MS => ${p.timeoutMs},`);
  if (p.insecure) opts.push('    CURLOPT_SSL_VERIFYPEER => false,', '    CURLOPT_SSL_VERIFYHOST => 0,');
  if (p.basic) opts.push('    CURLOPT_HTTPAUTH => CURLAUTH_BASIC,', `    CURLOPT_USERPWD => ${php1(`${p.basic.user}:${p.basic.password}`)},`);
  if (p.digest) opts.push('    CURLOPT_HTTPAUTH => CURLAUTH_DIGEST,', `    CURLOPT_USERPWD => ${php1(`${p.digest.user}:${p.digest.password}`)},`);
  if (p.aws4) opts.push(`    CURLOPT_AWS_SIGV4 => ${php1(`aws:amz:${p.aws4.region}:${p.aws4.service}`)}, // PHP 8.2+`, `    CURLOPT_USERPWD => ${php1(`${p.aws4.accessKey}:${p.aws4.secretKey}`)},`);
  if (p.headers.length) opts.push('    CURLOPT_HTTPHEADER => [', ...p.headers.map(h => `        ${php1(h.value === '' ? `${h.key};` : `${h.key}: ${h.value}`)},`), '    ],');
  if (b?.type === 'text' || b?.type === 'form') opts.push(`    CURLOPT_POSTFIELDS => ${php1(b.text)},`);
  if (b?.type === 'file') opts.push(`    CURLOPT_POSTFIELDS => file_get_contents(${php1(b.path)}),`);
  if (b?.type === 'multipart') {
    opts.push('    CURLOPT_POSTFIELDS => [', ...b.fields.map(f => (f.file !== undefined
      ? `        ${php1(f.key)} => new CURLFile(${php1(f.file)}, ${php1(f.contentType || 'application/octet-stream')}, ${php1(fileOf(f.file))}),`
      : `        ${php1(f.key)} => ${php1(f.value)},`)), '    ],');
  }
  const notes = p.notes.map(n => `// ${n}\n`).join('');
  return `<?php\n\n${notes}$curl = curl_init();\ncurl_setopt_array($curl, [\n${opts.join('\n')}\n]);\n$response = curl_exec($curl);\n$status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);\ncurl_close($curl);\n\necho $status . "\\n" . $response;\n`;
}
