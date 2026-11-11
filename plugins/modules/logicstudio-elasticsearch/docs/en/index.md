# Elasticsearch blocks

`logicstudio-elasticsearch` · needs the engine `logicstudio-engine` and the [Basic blocks](logicstudio-core)

The blocks that make a Logic Studio program talk to **Elasticsearch** (7 and 8) and **OpenSearch** (1 and 2): index, read, search, update, delete and count documents, list the indices. OpenSearch uses the same API and works with the same blocks; it has been tried only against a simulated server, not against a real OpenSearch. In the block list of the IDE they are in the **Database** category. For SQL databases see [Database blocks (SQL)](logicstudio-db).

## How to install

The package does not come with Logic Studio IDE: an administrator installs it from the **AppStore**, **Kernel** tab ("Elasticsearch blocks"). The AppStore also installs the engine and the basic blocks, if they are missing. After the installation the blocks appear in the **Blocks** tab of the IDE.

## The blocks

| Block | Type | What it does |
|---|---|---|
| [Elasticsearch · Connection (connect)](es.connect) | `es.connect` | Opens the connection to the cluster and sends the handle to link to the other blocks. |
| [Elasticsearch · Index (index)](es.index) | `es.index` | Adds a document to an index, or replaces the one with that id. |
| [Elasticsearch · Get document (get)](es.get) | `es.get` | Reads the document with an id. |
| [Elasticsearch · Search (_search)](es.search) | `es.search` | Searches an index with a query. Each added input is a `match` field = value. |
| [Elasticsearch · Update (update)](es.update) | `es.update` | Changes some fields of a document (or creates it, with upsert). |
| [Elasticsearch · Delete document (delete)](es.delete) | `es.delete` | Deletes the document with an id. |
| [Elasticsearch · Delete by query (_delete_by_query)](es.deleteByQuery) | `es.deleteByQuery` | Deletes the documents a query finds. |
| [Elasticsearch · Count (_count)](es.count) | `es.count` | How many documents a query finds. |
| [Elasticsearch · Indices (_cat/indices)](es.indices) | `es.indices` | The cluster's indices, with documents, status and size. |
| [Elasticsearch · Bulk index (_bulk)](es.bulk) | `es.bulk` | Indexes a list of documents with a single request. |

## To know

### The requests start from the kernel

Elasticsearch speaks HTTP. The requests do not start from your browser or from the program, but from the **kernel**, that is the computer lilOS runs on, on behalf of the user who owns the program. For this reason:

- it also works when lilOS is closed in the browser, if the program is active;
- the program never sees the password nor a network connection: it only holds a **handle**;
- an active program really writes and deletes on the cluster, even when you are not looking: try it first with **Test**, above all with the blocks that write and delete;
- no external libraries are needed: the module has a small HTTP client of its own.

### The connection handle

The **connection** output of the [Elasticsearch · Connection (connect)](es.connect) block is a small object that holds only a random code, the kind of database (Elasticsearch or OpenSearch) and the server name. A [link](ide/blocks) carries it to the **connection** input of the other blocks. It is good only for the program that opened it (copied into another program it does not work) and it closes with **close** or when the program stops.

### Encrypted or not: http and https

Whether the connection is encrypted is decided by the node addresses: `https://…` is encrypted, `http://…` is not (password and data travel in the clear: fine only on a network you trust). With `https` the certificate is **checked** by default; the choice "Not checked (still encrypted)" is for self-signed certificates, like the ones Elasticsearch 8 creates by itself. You do not write user and password in the address: there are fields for that.

### Allowed addresses

The server name is resolved and **every** address it has is checked before connecting; then the connection goes to the very address that was checked (a name cannot be moved to a forbidden address between the check and the connection). The kernel never follows redirects: if the server answers with a 3xx, it is an error.

- **Never allowed**, not even by the administrator: the "link-local" addresses `169.254.x.x` and `fe80::…` (where many clouds keep the machine's secret data), multicast, `0.x.x.x`, `255.255.255.255` and `::`.
- **Blocked unless the administrator allows them**: this computer (`localhost`, `127.x.x.x`, `::1`), local networks (`10.x.x.x`, `172.16.x.x`–`172.31.x.x`, `192.168.x.x`) and the other non-public addresses. To allow them an administrator ticks **Allow the databases on this computer and on the local network** in the module settings. A cluster on your own computer (the default address is `https://localhost:9200`) therefore has to be allowed that way.
- **lilOS's own databases** (the addresses the kernel uses for itself in its configuration) can never be opened, not even with the permission: "Questo è il database di lilOS: i blocchi non possono usarlo" (this is lilOS's database: blocks cannot use it).

### The password and the API key

The **Password or API key (encoded)** setting of the connection block is a special field: what you type is not shown and never comes back. The engine **encrypts** it for you, on this lilOS, and only the encrypted text stays in the schema. So:

- whoever opens the schema (or a project file) does not see the password;
- another user, or the same schema on another lilOS, **cannot open it**: the connection gives the error "Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)" (password not readable: enter it again in the block Properties), and the password must be typed again;
- the password can also come from the hidden input **password / API key**, for example from [Input (readline)](core.consoleRead) with **Hide what is typed**: in that case it is saved nowhere. A non-empty value on the input wins over the one in the settings;
- the password and the API key never end up in logs or error messages, even if the server repeats them (three dots appear in their place).

### Module settings

An administrator changes them, in the settings of the `logicstudio-elasticsearch` module, and they take effect at once, from the next operation:

| Setting | Default | Values | What it does |
|---|---|---|---|
| **Allow the databases on this computer and on the local network** | no | yes / no | Allows `localhost` and local networks. Link-local and multicast stay forbidden. |
| **Time limit of an operation (seconds)** | 30 | 1 to 600 | How long a request can last, response included. |
| **Documents of a result (and of a bulk), at most** | 10000 | 1 to 1000000 | The documents of a search, of a list of indices and of a _bulk. Search gives at most that many (**truncated** tells if there were more). |
| **Size of a result, at most (KB)** | 4096 | 16 to 65536 | How big a response (and a result) can be. |
| **Open connections per user, at most** | 10 | 1 to 100 | How many connections a user can keep open, with all their programs. |
| **Operations per minute per user, at most** | 600 | 1 to 100000 | How many operations (every connection included) a user can make in a minute. |
| **Allow Elasticsearch** | yes | yes / no | If it is not ticked, nobody can connect to an Elasticsearch. |
| **Allow OpenSearch** | yes | yes / no | If it is not ticked, nobody can connect to an OpenSearch. |

### Quotas and limits

| What | Limit |
|---|---|
| Documents of a result, of a _bulk, indices listed | 10000 by default (module setting) |
| Size of a result | 4096 KB by default |
| Time of an operation | 30 seconds by default |
| Operations per minute, per user | 600 by default |
| Open connections, per user | 10 by default |
| Nodes in the connection address | 8 |
| Indices in a search or a count | 64 |
| Name of an index | 255 bytes |
| Id of a document | 512 bytes |
| Added inputs (search fields) | 16 (fewer if the engine's general limit is lower: see [Limits](logicstudio-engine/limits)) |
| Time limit of a block | 30 seconds by default (Control Panel → Logic Studio → **Limits**): it applies even if the operation time is longer |

### Index names and ids

Index names are checked: lower-case letters only, none of `\ / * ? " < > | , # :` nor spaces, not starting with `-`, `_` or `+`. The name and the id are written encoded in the address: a strange name cannot reach another API of the cluster. An id can have any character, up to 512 bytes.

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
| Elasticsearch ha risposto 401 (utente, password o chiave API non validi): … | Also 400 (invalid request), 403 (permission denied), 404 (not found), 409 (conflict: the document already exists or changed), 413 (request too large), 429 (too many requests), 503 (cluster not ready); with OpenSearch the name is "OpenSearch"; after the colon comes the reason given by the server. |
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

### 1. A searchable event log

```
[Button: Report] pressed ──▶ run [Elasticsearch · Index (index)] id ──▶ value [Print (console.log)]
[Elasticsearch · Connection (connect)] connection ──▶ connection
[Object literal { }] object ──▶ document
```

[Object literal { }](core.compose) prepares `{ "messaggio": "Porta aperta", "livello": "avviso" }`; the document goes into the index `eventi`.

### 2. Search by text and show the results

```
[Text field: search] text ──▶ messaggio [Elasticsearch · Search (_search)] documents ──▶ rows [Table]
[Button: Search] pressed ──▶ run
```

One added input, renamed `messaggio`, is a `match` on the field `messaggio`.

## Known limits

- A search gives at most the module's maximum rows (10000 by default): to read more you need another strategy (for example sort and restart from a value).
- The HTTP client does not follow redirects and does not use proxies.
- There are no scroll, point in time or asynchronous searches.

## See also

- [Database blocks (SQL)](logicstudio-db), [Basic blocks](logicstudio-core)
- [The engine](logicstudio-engine), [Limits](logicstudio-engine/limits)
- [How a block works](ide/blocks)
