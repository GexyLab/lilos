# HTTP request (fetch)

`net.request` · Network · [Network blocks](logicstudio-net) · version 1

Makes an HTTP or HTTPS request to a site or a service (an API) and sends the response: the content, the status and the headers. With [Interval (setInterval)](core.every) linked to **send** you can ask for a piece of data every now and then, for example the weather every 10 minutes.

## Inputs

| Port | Type | Description |
|---|---|---|
| **send** (`run`) | pulse | Any value that arrives here starts the request. |
| **address (URL)** (`url`) | text | The address to call. If it has a non-empty value, it takes the place of the **Address (URL)** in the settings. It does not start the block. |
| **body** (`body`) | any | The body of the request, for POST, PUT, PATCH and DELETE. A text is sent as it is, any other value as JSON. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **status** (`status`) | number | The HTTP status code of the response: 200, 201, 404, 500... |
| **headers** (`headers`) | object | The headers of the response, with lowercase names. |
| **response** (`body`) | any | The content of the response: a JSON value or a text (see **Response** in the settings). |
| **Exception** (`error`) | object | When the request does not reach a response: invalid or not allowed address, a site that is not there or does not answer, response too big, quota used up... |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Method** (`method`) | GET, POST, PUT, PATCH, DELETE | GET | The HTTP method. |
| **Address (URL)** (`url`) | text | `https://` | The address to call, when the **address (URL)** input has no value. Only `http://` and `https://`. |
| **Headers (JSON)** (`headers`) | a JSON object | `{}` | The headers to send, for example `{"Accept": "application/json", "Authorization": "Bearer abc123"}`. |
| **Response** (`kind`) | Automatic (JSON when it is JSON), JSON, Text | Automatic | How to read the content of the response (see below). |

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 16 inputs of any type (fewer, if the general limit of the engine on added ports is lower: see [Limits](logicstudio-engine/limits)). Each added input is a **parameter of the address**: it is called **parameter 1**, **parameter 2**... and must be **renamed** with the name of the parameter, for example `q` or `city`.

The added inputs **only keep their value**: a value that arrives there does not start the request, even if the input "starts it". The request starts only with **send**. See [How a block works](ide/blocks).

## How it works

When a value arrives on **send**:

1. The block takes the address (the one of the input, if it has a non-empty value, otherwise the one in the settings) and removes the spaces at the start and end.
2. It adds to the address the parameters of the added inputs that have a value.
3. It reads the headers from the settings.
4. It asks the kernel (the computer lilOS runs on) to make the request, with all the security checks.
5. When the response arrives, it sends **status**, then **headers**, then **response**.

### The address and the parameters

- Only `http://` and `https://` addresses, at most 8192 characters long (also after adding the parameters).
- The default value `https://` alone is not an address: if you write nothing, the block gives "Indirizzo (URL) non valido: https://" ("Invalid address (URL): https://").
- Each added input with a value becomes `name=value` in the address, written correctly (spaces, accents and symbols are encoded). Inputs without a value (or with `null`) do not count.
- If the address already has a parameter with the same name, it is **replaced**: with `https://example.com/search?q=old` and the input **q** = `new`, the request goes to `https://example.com/search?q=new`.
- A list becomes the same parameter repeated: **tag** = `["a", "b"]` gives `tag=a&tag=b`. An object becomes JSON text. Numbers and yes/no become text (`5`, `true`).
- User name and password in the address (`https://user:password@example.com/`) are sent as "Basic" authentication.

### The headers

- The **Headers (JSON)** must be a JSON object `{ "Name": "value" }`, at most 50. A value that is not text becomes text (an object becomes JSON).
- Each name can only have letters, digits and the symbols HTTP allows (no spaces), at most 64 characters; each value at most 8192 characters, with no new lines.
- The block always sends `User-Agent: lilOS Logic Studio` and `Accept: */*`, unless you change them in the headers.
- Some headers are decided by the request itself and the ones you write are ignored without an error: `Host`, `Content-Length`, `Transfer-Encoding`, `Connection`, `Keep-Alive`, `Upgrade`, `TE`, `Trailer`, `Expect`, `Accept-Encoding`, `Proxy-Connection`.
- The headers can contain secrets (a key, a token): they are never written in the logs or in the error messages. Remember, though, that they stay written in the project, in clear.

### The body

- With **GET** the body is not sent, even if **body** has a value.
- With POST, PUT, PATCH and DELETE: a **text** is sent as it is, with `Content-Type: text/plain; charset=utf-8`; any other value (object, list, number, yes/no) is sent as JSON, with `Content-Type: application/json`.
- If you write `Content-Type` in the headers yourself, yours applies. For example, to send a form write the body as the text `name=Anna&age=30` and the header `{"Content-Type": "application/x-www-form-urlencoded"}`.
- If **body** has no value (or is `null`), the request goes out without a body.
- The body can be at most 5 MB.

### The response

- HTTP error statuses (**404**, **500**...) are **not** errors of the block: they come out normally on **status**, **headers** and **response**. If you only care about a successful response, check **status** (for example with [Compare (== != < >)](core.compare): 200).
- **Automatic response**: if the server says the content is JSON (`Content-Type` like `application/json` or `…+json`), the JSON value comes out; if the JSON is not valid, or the server does not say JSON, the text comes out. An empty response comes out as empty text.
- **JSON response**: the content is always read as JSON; empty gives `null`; an invalid JSON gives the error "La risposta non è JSON valido" ("The response is not valid JSON").
- **Text response**: the text always comes out, even if it is JSON.
- The text is read as UTF-8. Compressed responses (gzip, deflate, br) are decompressed.
- **headers** has lowercase names (`content-type`, `date`...); `set-cookie`, if there is one, is a list.
- The final address, after any redirects, does not come out of the block.

### Redirects

- The block follows up to **5 redirects** by itself (statuses 301, 302, 303, 307, 308); at the sixth it gives an error.
- With 303, and with 301 or 302 after a POST, the next request becomes a GET without a body. With 307 and 308 method and body stay.
- If the redirect leads to another site, the headers `Authorization`, `Cookie` and `Proxy-Authorization` are not sent.
- Every redirect is checked like the first request (allowed addresses, quota).

### Security: the blocked addresses

The request starts from the kernel, that is the computer lilOS runs on. To keep a program from reaching where it must not:

- **Never allowed**, not even by the administrator: the "link-local" addresses `169.254.x.x` and `fe80::…` (where many clouds keep the secret data of the machine), multicast addresses (`224.0.0.0`–`239.255.255.255`, `ff00::…`), `0.x.x.x`, `255.255.255.255` and `::`.
- **Blocked unless the administrator allows them**: this computer (`127.x.x.x`, `localhost`, `::1`), local networks (`10.x.x.x`, `172.16.x.x`–`172.31.x.x`, `192.168.x.x`, `fc00::…`), the shared network of the carriers (`100.64.x.x`–`100.127.x.x`), reserved and documentation addresses, and IPv6 addresses that contain an IPv4 address inside (which could reach those).
- To allow the second group, an administrator ticks **Allow requests to this computer and to the local network** in the settings of the module `logicstudio-net`.
- The name of the site is resolved and **every** address it has is checked before connecting; then the connection goes exactly to the checked address. This way a name cannot be moved to a forbidden address between the check and the connection.
- HTTPS certificates are checked: an expired or invalid certificate gives an error.

### Times, sizes, quotas

| What | Value | Where to change it |
|---|---|---|
| Time limit of a request (redirects and reading included) | 20 seconds | Settings of the module: **Time limit of a request (seconds)**, 1 to 120 |
| Size of a response, at most (after decompression) | 1024 KB | Settings of the module: **Size of a response, at most (KB)**, 1 to 10240 |
| Network requests per minute, per user | 120 | Control Panel → Logic Studio → **Quotas** (**Requests/min**) |
| Maximum time of a block | 30 seconds | Control Panel → Logic Studio → **Limits** |

- The settings of the module are changed by an administrator and apply at once, from the next request.
- **Every** request counts in the network quota per minute, and every redirect counts as one more request. The quota belongs to the user: it applies to all their programs together, tests included.
- If the time limit of a request is longer than the maximum time of a block, the block is the first to stop, with "HTTP (fetch) ha impiegato più di 30 s" ("HTTP request (fetch) took more than 30 s").
- When the program stops, the requests in progress stop too.

### One request at a time

Like every block, HTTP request (fetch) handles the values one at a time: if another **send** arrives while a request is in progress, it waits its turn and starts after. If the pulses arrive faster than the requests last, they pile up. Use a calm pace, or more blocks for different addresses.

## Examples

### 1. Reading a JSON every 10 minutes

Settings: **Method** GET, **Address (URL)** `https://api.open-meteo.com/v1/forecast?latitude=45.46&longitude=9.19&current=temperature_2m`.

```
[Interval (setInterval): 600 s] pulse ──▶ send [HTTP request (fetch)] response ──▶ object [Get property: current.temperature_2m] value ──▶ value [Print (console.log)]
                                             Exception ──▶ value [Print (console.log): error]
```

The server answers with `Content-Type: application/json`, so **response** is already an object, for example `{ "current": { "temperature_2m": 12.4, … }, … }`. [Get property](core.get) sends `12.4`. If the network is down, the console writes for example "Indirizzo non trovato: api.open-meteo.com" ("Address not found: api.open-meteo.com").

### 2. A search with a parameter

Add an input and rename it `q`. **Address (URL)**: `https://example.com/api/search`.

```
[Text field: search] text ──▶ q    [HTTP request (fetch)] response ──▶ rows [Table]
[Button: Search]   pressed ──▶ send
```

The user writes `coffee and milk` and presses the [Button](ui.button): the request goes to `https://example.com/api/search?q=coffee+and+milk`. If the response is a list of objects, the [Table](ui.table) shows it.

### 3. Sending data with POST

Settings: **Method** POST, **Address (URL)** `https://example.com/api/measures`, **Headers (JSON)** `{"Authorization": "Bearer abc123"}`.

```
[Object literal { }] object ──▶ body [HTTP request (fetch)] status ──▶ a [Compare (== != < >): a = b] if false ──▶ send [Notify: "Sending failed"]
[Button: Send] pressed ──▶ send                    [Constant · Variable: 201] value ──▶ b
```

[Object literal { }](core.compose) prepares `{ "sensor": "greenhouse", "temp": 22.5 }`, which goes out as JSON with `Content-Type: application/json`. If the server answers with a status other than 201 (for example 401 if the key is wrong), you receive a [Notify](lilos.notify). Remember: a 401 does not go to **Exception**.

### 4. An address that changes

```
[Selection: country] value ──▶ a [Template string: "https://example.com/countries/{a}.json"] text ──▶ address (URL) [HTTP request (fetch)]
                                                                                       text ──▶ value [Delay (setTimeout): 0.1 s] value ──▶ send
```

Every time the user chooses a country in the [Selection](ui.select) (for example `IT`), [Template string](core.format) prepares the address `https://example.com/countries/IT.json`. Since **address (URL)** does not start the block, the request starts with **send**: here the same text goes through [Delay (setTimeout)](core.delay), so **send** arrives a moment after the address and the request always uses the new one. If **send** arrived before **address (URL)** has a value, the block would use the **Address** in the settings.

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Manca l'indirizzo (URL) della richiesta ("The address (URL) of the request is missing") | The address is empty. |
| Indirizzo (URL) non valido: … ("Invalid address (URL): …") | The address cannot be read (for example `https://` alone, or without `http`). |
| Indirizzo (URL) troppo lungo ("Address (URL) too long") | More than 8192 characters. |
| Indirizzo (URL) troppo lungo con i parametri ("Address (URL) too long with the parameters") | More than 8192 characters after adding the parameters. |
| Solo indirizzi http e https: ftp: ("Only http and https addresses: ftp:") | The address is not `http` or `https` (here `ftp`). |
| Metodo non valido: … (GET, POST, PUT, PATCH, DELETE) ("Invalid method: … (GET, POST, PUT, PATCH, DELETE)") | The method is not one of the allowed ones. |
| Intestazioni non valide: scrivi un oggetto JSON, per esempio {"Accept": "application/json"} ("Invalid headers: write a JSON object, for example {"Accept": "application/json"}") | The **Headers (JSON)** are not JSON. |
| Intestazioni non valide: serve un oggetto JSON { "Nome": "valore" } ("Invalid headers: a JSON object { "Name": "value" } is needed") | It is JSON, but not an object (for example a list). |
| Troppe intestazioni (al massimo 50) ("Too many headers (at most 50)") | More than 50 headers. |
| Nome di intestazione non valido: … ("Invalid header name: …") | A name has spaces or symbols that are not allowed, or is longer than 64 characters. |
| Valore dell'intestazione … non valido ("Value of the header … is not valid") | A value has a new line or is longer than 8192 characters. |
| Corpo della richiesta troppo grande (al massimo 5 MB) ("Request body too big (at most 5 MB)") | The body is over 5 MB. |
| Indirizzo non permesso: 169.254.169.254 ("Address not allowed: 169.254.169.254") | The address is one of the never-allowed ones. |
| Indirizzo non permesso: 127.0.0.1 è di questo computer o della rete locale (l'amministratore può permetterlo nelle impostazioni del modulo logicstudio-net) ("Address not allowed: 127.0.0.1 belongs to this computer or to the local network (the administrator can allow it in the settings of the module logicstudio-net)") | The address belongs to this computer or the local network and is not allowed. |
| Indirizzo non trovato: … ("Address not found: …") | The name of the site does not exist (or the DNS does not answer). |
| Connessione rifiutata da … ("Connection refused by …") | The server does not accept connections on that port. |
| Connessione chiusa da … ("Connection closed by …") | The server closed the connection. |
| … non è raggiungibile ("… is not reachable") | The network does not reach that server. |
| Il certificato di … è scaduto ("The certificate of … has expired") | The HTTPS certificate has expired. |
| Il certificato di … non è valido ("The certificate of … is not valid") | The HTTPS certificate is not valid for that name, or is self-signed. |
| Nessuna risposta da … in 20 secondi ("No response from … in 20 seconds") | The time limit of a request is over (the number is the one in the settings). The same message appears if the program is stopped during the request. |
| Troppi reindirizzamenti (più di 5) ("Too many redirects (more than 5)") | More than 5 redirects in a row. |
| Risposta troppo grande (più di 1024 KB) ("Response too big (more than 1024 KB)") | The response is over the maximum size. |
| La risposta non è JSON valido ("The response is not valid JSON") | **Response** JSON and the content is not JSON. |
| Richiesta a … non riuscita: … ("Request to … failed: …") | Other network problems, with the technical explanation. |
| Troppe richieste di rete: hai finito la quota di questo minuto ("Too many network requests: you have used up the quota of this minute") | You went over the requests per minute of your quota. |
| HTTP (fetch) ha impiegato più di 30 s ("HTTP request (fetch) took more than 30 s") | The request went over the maximum time of a block. |
| Il programma non è in esecuzione ("The program is not running") | The program was stopping. |

## Permissions

The request starts from the computer lilOS runs on, on behalf of the user who owns the program, and counts in their quota. An app made with **Make app** that contains an HTTP request (fetch) block, before starting, asks you for permission to "make requests on the internet". See [Permissions](logicstudio-engine/permissions).

## See also

- [Interval (setInterval)](core.every), for requests at intervals
- [Get property](core.get), to read a field of the response
- [Object literal { }](core.compose), to prepare a JSON body
- [Template string](core.format), to build an address
- [appendFile](lilos.fileAppend), to keep a log of the responses
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
