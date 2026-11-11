# Network blocks

`logicstudio-net` · needs the engine `logicstudio-engine` and the [Basic blocks](logicstudio-core)

The blocks that make a Logic Studio program talk to the internet. For now there is only one block, the [Web request](net.request): an HTTP or HTTPS request to a site or an API, with the response ready as JSON or as text. In the block list of the IDE it is in the **Network** category.

## How to install

The package does not come with Logic Studio IDE: an administrator installs it from the **AppStore**, **Kernel** tab ("Network blocks"). The AppStore also installs the engine and the basic blocks, if they are missing. After the installation the block appears in the **Blocks** tab of the IDE.

## The blocks

| Block | Type | What it does |
|---|---|---|
| [Web request](net.request) | `net.request` | An HTTP or HTTPS request (GET, POST, PUT, PATCH, DELETE); sends the response, the status and the headers. Each added input is a parameter of the address. |

MQTT and the other protocols are not there yet.

## To know

### The request starts from the kernel

The request does not start from your browser but from the **kernel**, that is the computer lilOS runs on, on behalf of the user who owns the program. For this reason:

- it also works when lilOS is closed in the browser, if the program is active;
- an active program really calls the site, even when you are not looking: try it first with **Test**;
- the kernel checks where the request goes: it **does not reach this computer or the local network**, unless an administrator allows it, and it **never** reaches "link-local" addresses (where many clouds keep the secret data of the machine) or multicast addresses. The details are in the [Web request](net.request) page.

### Settings of the module

An administrator changes them, in the settings of the module `logicstudio-net`, and they apply at once to all programs:

| Setting | Default | Values | What it does |
|---|---|---|---|
| **Allow requests to this computer and to the local network** | no | yes / no | If it is ticked, requests can go to `localhost`, `127.0.0.1`, `192.168.x.x`, `10.x.x.x` and the other non-public networks. Link-local and multicast addresses stay forbidden. |
| **Time limit of a request (seconds)** | 20 | 1 to 120 | How long a request can last, redirects and reading of the response included. |
| **Size of a response, at most (KB)** | 1024 | 1 to 10240 | How big a response can be, after decompression. |

### Quotas and limits

| What | Limit |
|---|---|
| Requests per minute, per user | 120 by default (Control Panel → Logic Studio → **Quotas**, **Requests/min**); every redirect counts as a request |
| Redirects followed | 5 |
| Address (URL) | 8192 characters |
| Body of the request | 5 MB |
| Headers | 50, names up to 64 characters, values up to 8192 |
| Maximum time of a block | 30 seconds by default (Control Panel → Logic Studio → **Limits**): it applies even if the time limit of a request is longer |

The network quota belongs to the user: it applies to all their programs together, tests included. **What I use**, in the IDE Home, and **My use**, in the Control Panel, show how many requests you made in this minute. See also [Limits](logicstudio-engine/limits).

### Apps made with Make app

An app made with **Make app** that contains a Web request, before starting, opens a window "Run «name»?" that says the app will be able to "make requests on the internet". With **Run** the app starts and lilOS does not ask again until the app changes; with **Cancel** it does not start. Tests and active programs of your projects ask nothing. See [Permissions](logicstudio-engine/permissions) and [Making an app](ide/create-app).

## Complete examples

### 1. A weather station in a window

**Address (URL)** of the Web request: `https://api.open-meteo.com/v1/forecast?latitude=45.46&longitude=9.19&current=temperature_2m,relative_humidity_2m`.

```
[Every… 600 s] pulse ──▶ send [Web request] response ──▶ object [Get field: current.temperature_2m]    value ──▶ value [Value: temperature]
                                             response ──▶ object [Get field: current.relative_humidity_2m] value ──▶ value [Value: humidity]
                                             Exception ──▶ value [Write to console]
```

[Every…](core.every) starts by itself at start and then every 10 minutes: that is 6 requests an hour, well within the quota. Two [Get field](core.get) blocks read the values and two [Value](ui.value) components show them in the window of the project.

### 2. A log of the responses

```
[Every… 300 s] pulse ──▶ read [Date and time] ISO ──▶ at [Build object] object ──▶ content [Append to file: ~/site-check.jsonl]
               pulse ──▶ send [Web request] status ──▶ code
```

Every 5 minutes the program calls a site and, with the [lilOS blocks](logicstudio-lilos), appends (with **Format** "JSON, one per line") a line with the time and the status, for example `{"at":"2026-11-11T10:05:00.000Z","code":200}`. On [Build object](core.compose) remove "starts it" from **at**, so the line is written only when the status arrives. This way you know when the site answered with an error.

### 3. Sending a measure and warning if it fails

**Method** POST, **Address (URL)** `https://example.com/api/measures`, **Headers (JSON)** `{"Authorization": "Bearer abc123"}`.

```
[Number field: measure] value ──▶ temp [Build object] object ──▶ body [Web request] status ──▶ a [Compare: a < b] if false ──▶ send [Notification: "The server refused the measure"]
[Button: Send]        pressed ──────────────────────────────────────▶ send            [Value: 300] value ──▶ b
                                                                          [Web request] Exception ──▶ send [Notification: "Server not reachable"]
```

Statuses from 200 to 299 mean "success": [Compare](core.compare) with `a < b` and 300 lets **if false** through for 300 and above (4xx, 5xx). Network errors instead come from **Exception**. The two [Notifications](lilos.notify) cover the two cases.

## Known limits

- There is only HTTP and HTTPS: no MQTT, WebSocket, FTP.
- You cannot choose not to follow redirects, nor see the final address.
- The response is always read as UTF-8 text or JSON: images and other binary files do not come out intact.
- The response cannot be over 10 MB even with the setting at its maximum.
- Headers with secret keys stay written in the project, in clear: do not share a project that contains your keys.

## See also

- [Basic blocks](logicstudio-core), [lilOS blocks](logicstudio-lilos)
- [The engine](logicstudio-engine), [Limits](logicstudio-engine/limits), [Permissions](logicstudio-engine/permissions)
- [How a block works](ide/blocks)
