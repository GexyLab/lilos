# InfluxDB blocks

`logicstudio-influxdb` · needs the engine `logicstudio-engine` and the [Basic blocks](logicstudio-core)

The blocks that make a Logic Studio program talk to **InfluxDB**, the time-series database (sensor readings, consumption, temperatures…): write points, read them with a Flux, InfluxQL or SQL query, list the buckets and delete data. They work with InfluxDB **2.x** (Cloud too), **3.x** (Core, Enterprise, Cloud) and **1.8 and later** (through the v2 compatibility API). In the block list of the IDE they are in the **Database** category. For SQL databases see [Database blocks (SQL)](logicstudio-db).

## How to install

The package does not come with Logic Studio IDE: an administrator installs it from the **AppStore**, **Kernel** tab ("InfluxDB blocks"). The AppStore also installs the engine and the basic blocks, if they are missing. After the installation the blocks appear in the **Blocks** tab of the IDE.

## The blocks

| Block | Type | What it does |
|---|---|---|
| [InfluxDB · Connection (connect)](influx.connect) | `influx.connect` | Opens the connection to the server and sends the handle to link to the other blocks. |
| [InfluxDB · Write point (write)](influx.write) | `influx.write` | Writes a point (measurement, tags, fields, time) or a list of points. Each added input is a tag. |
| [InfluxDB · Query (Flux · InfluxQL · SQL)](influx.query) | `influx.query` | Runs a query and sends the rows. Each added input is a parameter. |
| [InfluxDB · Buckets (list)](influx.buckets) | `influx.buckets` | The buckets (or databases) the token can see. |
| [InfluxDB · Delete data (delete)](influx.delete) | `influx.delete` | Deletes the points of a time range that match a filter. 2.x only. |

A measurement every now and then is [Interval (setInterval)](core.every) linked to **run** of Write point.

## To know

### The requests start from the kernel

InfluxDB speaks HTTP. The requests do not start from your browser or from the program, but from the **kernel**, that is the computer lilOS runs on, on behalf of the user who owns the program. For this reason:

- it also works when lilOS is closed in the browser, if the program is active;
- the program never sees the token nor a network connection: it only holds a **handle**;
- an active program really writes and deletes on the database, even when you are not looking: try it first with **Test**, above all with Write point and Delete data;
- no external libraries are needed: the module has a small HTTP client of its own.

### The connection handle

The **connection** output of the [InfluxDB · Connection (connect)](influx.connect) block is a small object that holds only a random code, the kind of database and the server name. A [link](ide/blocks) carries it to the **connection** input of the other blocks. It is good only for the program that opened it (copied into another program it does not work) and it closes with **close** or when the program stops. An InfluxDB block does not accept the handle of another kind of database.

### Encrypted or not: http and https

Whether the connection is encrypted is decided by the server address: `https://…` is encrypted, `http://…` is not (token, password and data travel in the clear: fine only on a network you trust). With `https` the certificate is **checked** by default; the choice "Not checked (still encrypted)" is for self-signed certificates. You do not write user and password in the address: there are fields for that.

### Allowed addresses

The server name is resolved and **every** address it has is checked before connecting; then the connection goes to the very address that was checked (a name cannot be moved to a forbidden address between the check and the connection). The kernel never follows redirects: if the server answers with a 3xx, it is an error.

- **Never allowed**, not even by the administrator: the "link-local" addresses `169.254.x.x` and `fe80::…` (where many clouds keep the machine's secret data), multicast, `0.x.x.x`, `255.255.255.255` and `::`.
- **Blocked unless the administrator allows them**: this computer (`localhost`, `127.x.x.x`, `::1`), local networks (`10.x.x.x`, `172.16.x.x`–`172.31.x.x`, `192.168.x.x`) and the other non-public addresses. To allow them an administrator ticks **Allow the databases on this computer and on the local network** in the module settings.
- **lilOS's own databases** (the addresses the kernel uses for itself in its configuration) can never be opened, not even with the permission: "Questo è il database di lilOS: i blocchi non possono usarlo" (this is lilOS's database: blocks cannot use it).

### The token and the password

The **Token (password for 1.x)** setting of the connection block is a special field: what you type is not shown and never comes back. The engine **encrypts** it for you, on this lilOS, and only the encrypted text stays in the schema. So:

- whoever opens the schema (or a project file) does not see the token;
- another user, or the same schema on another lilOS, **cannot open it**: the connection gives the error "Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)" (password not readable: enter it again in the block Properties), and the token must be typed again;
- the token can also come from the hidden input **token / password**, for example from [Input (readline)](core.consoleRead) with **Hide what is typed**: in that case it is saved nowhere. A non-empty value on the input wins over the one in the settings;
- the token and the password never end up in logs or error messages, even if the server repeats them (three dots appear in their place).

### Module settings

An administrator changes them, in the settings of the `logicstudio-influxdb` module, and they take effect at once, from the next operation:

| Setting | Default | Values | What it does |
|---|---|---|---|
| **Allow the databases on this computer and on the local network** | no | yes / no | Allows `localhost` and local networks. Link-local and multicast stay forbidden. |
| **Time limit of an operation (seconds)** | 30 | 1 to 600 | How long a request can last, response included. |
| **Rows of a result (and points of a write), at most** | 10000 | 1 to 1000000 | The rows of a query and the points of a write. With more rows the result is **truncated**. |
| **Size of a result, at most (KB)** | 4096 | 16 to 65536 | How big a response (and a result) can be. |
| **Open connections per user, at most** | 10 | 1 to 100 | How many connections a user can keep open, with all their programs. |
| **Operations per minute per user, at most** | 600 | 1 to 100000 | How many operations (every connection included) a user can make in a minute. |
| **Allow InfluxDB** | yes | yes / no | If it is not ticked, nobody can open an InfluxDB connection. |

### Quotas and limits

| What | Limit |
|---|---|
| Rows of a result, points of a write | 10000 by default (module setting) |
| Size of a result | 4096 KB by default |
| Time of an operation | 30 seconds by default |
| Operations per minute, per user | 600 by default |
| Open connections, per user | 10 by default |
| Length of a query | 100000 characters |
| Added inputs (tags or parameters) | 16 (fewer if the engine's general limit is lower: see [Limits](logicstudio-engine/limits)) |
| Time limit of a block | 30 seconds by default (Control Panel → Logic Studio → **Limits**): it applies even if the operation time is longer |

### The versions

- **2.x** (and Cloud): token, organization and bucket; Flux, InfluxQL, write and delete.
- **3.x**: token and database (called "bucket" here); write, SQL and InfluxQL. Flux and delete with a filter are not there.
- **1.8 and later**: user and password (the token becomes `user:password`), database written as `database/retention`; write and Flux through the compatibility API, InfluxQL. Delete with a filter is not there.

### Common errors

The block pages list the errors of each block; these can come from any of them (the messages are in Italian):

| Message | When |
|---|---|
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | The connection input is empty ("connection missing: link the connection output to the input"). |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | The connection was closed, or the handle comes from another program. |
| Questa connessione è a …: questo blocco non la può usare | The handle is of another kind of database. |
| Troppe operazioni sul database: al massimo 600 al minuto | The per-minute quota is used up (the number is the one in the settings). |
| Troppe connessioni aperte: al massimo 10 per utente | You already opened the maximum of connections. |
| Il database non ha risposto in 31 s | The operation went over the time limit (plus one second). |
| Nessuna risposta da … in 30 secondi | The server did not answer in time. |
| Risultato troppo grande (… KB, al massimo 4096 KB): chiedi meno righe o colonne | The result is over the size limit. |
| Risposta troppo grande (più di 4096 KB): chiedi meno dati | The server's response is over the size limit. |
| InfluxDB ha risposto 401 (token o password non validi): … | Also 400 (invalid request), 403 (the token has no permission), 404 (not found), 413 (request too large), 422 (invalid data), 429 (too many requests), 503 (server not ready); after the colon comes the server's message. |
| Il server ha risposto con un reindirizzamento (301): controlla l'indirizzo del server | The server answered with a 3xx: redirects are not followed. |
| Risposta non valida da … (non è JSON) | The server answered with text that is not JSON. |
| Richiesta interrotta: il programma si è fermato | The program was stopping. |
| Il programma non è in esecuzione | A connection was being opened while the program was stopping. |
| Indirizzo non permesso: … | The address is among the never-allowed ones, or it is this computer's or the local network's and the administrator does not allow it. |
| Questo è il database di lilOS: i blocchi non possono usarlo | The address is a database lilOS uses for itself. |
| Server non trovato: … | The server name does not exist. |
| Connessione rifiutata da … | The server does not accept connections on that port. |
| Connessione chiusa da … | The server closed the connection. |
| … non è raggiungibile | The network cannot reach that server. |
| Il certificato di … è scaduto | The https certificate has expired. |
| Il certificato di … non è valido (si può non controllarlo nelle impostazioni della connessione) | The certificate is not valid for that name, or it is self-signed. |
| … non parla HTTPS (forse l'indirizzo è http://) | The address is https but the server speaks http. |
| … non risponde in HTTP (forse l'indirizzo è https://) | The address is http but the server speaks https. |
| Richiesta a … non riuscita: … | Other network problems, with the technical explanation. |

## Complete examples

### 1. Record a temperature every minute

```
[Interval (setInterval): 60 s] pulse ──▶ run [InfluxDB · Write point (write)] done ──▶ value [Print (console.log)]
[InfluxDB · Connection (connect)] connection ──▶ connection [InfluxDB · Write point (write)]
[Number field: temperature] value ──▶ fields [InfluxDB · Write point (write)]
```

In the settings of Write point, **Measurement** `ambiente` and **Tags** `{"stanza": "cucina"}`. A lone number becomes the field `value`.

### 2. The average of the last hour in a window

```
[InfluxDB · Connection (connect)] connection ──▶ connection [InfluxDB · Query (Flux · InfluxQL · SQL)] rows ──▶ object [Get property: 0._value] value ──▶ value [Value: average]
[Interval (setInterval): 300 s] pulse ──────────────────▶ run
```

Flux query: `from(bucket: "casa") |> range(start: -1h) |> filter(fn: (r) => r._measurement == "ambiente") |> mean()`.

## Known limits

- There is no streaming read: a query gives all the rows at once (up to the limit).
- The HTTP client does not follow redirects and does not use proxies.
- Flux does not exist in InfluxDB 3.x and SQL does not exist in 2.x and 1.x.

## See also

- [Database blocks (SQL)](logicstudio-db), [Basic blocks](logicstudio-core)
- [The engine](logicstudio-engine), [Limits](logicstudio-engine/limits)
- [How a block works](ide/blocks)
