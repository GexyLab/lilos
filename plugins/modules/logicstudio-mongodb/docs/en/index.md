# MongoDB blocks

`logicstudio-mongodb` · needs the engine `logicstudio-engine` (1.7.0 or later) and the [Basic blocks](logicstudio-core)

The blocks that make a Logic Studio program talk to a **MongoDB** database: read, insert, update and delete documents, count, aggregate, list the collections and receive the changes as they happen. They work with your own MongoDB and with Atlas. In the block list of the IDE they are in the **Database** category, with a name that begins with "MongoDB ·".

## How to install

The package does not come with Logic Studio IDE: an administrator installs it from the **AppStore**, **Kernel** tab ("MongoDB blocks"). The AppStore also installs the engine and the basic blocks, if they are missing. After the installation the blocks appear in the **Blocks** tab of the IDE.

## The blocks

The **connection** block opens the connection and sends a reference from its **connection** output; that reference is linked to the **connection** input of all the other blocks.

| Block | Type | What it does |
|---|---|---|
| [MongoDB · Connection (MongoClient)](mongo.connect) | `mongo.connect` | The connection to a MongoDB server (`mongodb://` or `mongodb+srv://` address, or server and port). |
| [MongoDB · Find (find)](mongo.find) | `mongo.find` | The documents of a collection that match the filter, with fields, order, limit and skip; each added input is a field of the filter. |
| [MongoDB · Insert (insertOne · insertMany)](mongo.insert) | `mongo.insert` | Inserts a document or a list of documents; each added input is a field of the document. |
| [MongoDB · Update (updateOne · updateMany)](mongo.update) | `mongo.update` | Changes the first document (or all) that matches the filter: `$set`, `$inc`…; with **upsert** it inserts it if missing. |
| [MongoDB · Delete (deleteOne · deleteMany)](mongo.delete) | `mongo.delete` | Deletes the first document (or all) that matches the filter; an empty filter only with "Every document". |
| [MongoDB · Count (countDocuments)](mongo.count) | `mongo.count` | How many documents match the filter. |
| [MongoDB · Aggregate (aggregate)](mongo.aggregate) | `mongo.aggregate` | An aggregation pipeline: a list of stages `$match`, `$group`, `$sort`…. |
| [MongoDB · Watch changes (watch)](mongo.watch) | `mongo.watch` | Sends every change of a collection (or of the database) as it happens. It needs a replica set or a cluster. |
| [MongoDB · Collections (listCollections)](mongo.collections) | `mongo.collections` | The names (and types) of the collections of the database. |

## A first example

```
[MongoDB · Connection (MongoClient)] connection ──▶ connection [MongoDB · Find (find): ordini] documents ──▶ rows [Table]
[Text field: stato] text ──▶ stato
[Button: Search] pressed ──▶ run
```

The program connects to the database at start. Add an input to [MongoDB · Find (find)](mongo.find) and call it `stato`; when you press **Search**, the block looks for the documents of `ordini` whose `stato` equals the text of the field, and the [Table](ui.table) shows them.

## Good to know

### The kernel makes the connections

The connections do not start from your browser nor from the program, but from the **kernel**, that is the computer lilOS runs on, on behalf of the user who owns the program. For this reason:

- it works even when lilOS is closed in the browser, if the program is active;
- the program never sees the password nor a network link: it only holds a **reference** (an object that comes out of the **connection** output), which is good for that program only. A reference copied into another program does not work ("Connessione chiusa (o di un altro programma)", connection closed or from another program);
- when the program stops, all its connections and watches close;
- an active program really uses the database, even when you are not looking: try it first with **Try**, especially with the blocks that write or delete.

### The reference to the connection (handle)

The **connection** output is a small object that holds only a random code, the kind of database (`mongodb`) and the server's name. It is carried by a [link](ide/blocks) to all the blocks that must use that connection. A reference of another kind of database (for example the one of [Redis blocks](logicstudio-redis)) cannot be used here: "Questa connessione è a redis: questo blocco non la può usare" (this connection is to redis: this block cannot use it). The database and the connection are one: for another database you need another connection block.

### The password

The **Password** setting of the connection block is a field made on purpose: what you write is not shown and never comes back. The engine **encrypts** it (AES-GCM) for you, on this lilOS, and only the encrypted text stays in the schema. So:

- whoever opens the schema (or a project file) does not see the password;
- another user, or the same schema on another lilOS, **cannot open it**: the connection gives the error "Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)" (password not readable: it must be entered again), and the password must be written again;
- the password can also come from the hidden **password** input, for example from [Input (readline)](core.consoleRead) with **Hide what is typed**: in that case it is not saved anywhere. A non-empty value on the input wins over the one in the settings;
- the password cannot be in the **address (URI)**: it is refused.

The server's errors, and so also those that could contain the password, come out of **Exception** on one line and without the password (three dots take its place).

### Encryption (TLS)

The connection block has the **Encryption (TLS)** choice: "On, certificate checked" (the default), "On, certificate not checked" and "Off". A MongoDB at home that has no TLS needs **Off**. For a server on the internet (Atlas) leave the default. The details are on the [MongoDB · Connection (MongoClient)](mongo.connect) page.

### The addresses and the administrator's setting

The server's name is resolved and **every** address it has is checked before connecting; then the connection goes to the address that was checked. So a name cannot be moved to a forbidden address between the check and the connection. It holds also for the SRV answers of `mongodb+srv://` and for the members a replica set announces.

- **Never allowed**, not even by the administrator: the "link-local" addresses `169.254.x.x` and `fe80::…` (where many clouds keep the machine's secret data), multicast addresses, `0.x.x.x`, `255.255.255.255` and `::`.
- **Blocked unless the administrator allows them**: this computer (`127.x.x.x`, `localhost`, `::1`), local networks (`10.x.x.x`, `172.16.x.x`–`172.31.x.x`, `192.168.x.x`, `fc00::…`), the carriers' shared network (`100.64.x.x`–`100.127.x.x`), reserved and documentation addresses, and IPv6 addresses that carry an IPv4 address inside.
- To allow the second group, an administrator ticks **Allow the databases on this computer and on the local network** in the module settings.
- With **Server** and **Port** the block talks to that server only; with an address (URI) it discovers the members of the replica set, and one announced at a forbidden address closes the connection: "Il server indica un membro a un indirizzo non permesso (…): connessione chiusa" (the server points to a member at a forbidden address: connection closed).
- In the address (URI) the options that would read files of the computer (`tlsCAFile`…), proxies and login mechanisms other than SCRAM and PLAIN (which would read the clouds' metadata) are not allowed: the list is on the [MongoDB · Connection (MongoClient)](mongo.connect) page.

A MongoDB on your home or office network therefore needs an administrator to tick that box.

### The lilOS database is never opened

The databases lilOS uses for itself (for example the one of `fs-postgres`, written in the kernel's configuration) **cannot be reached** by the blocks, not even with the local network allowed and not even under another name of the same computer: the connection gives "Questo è il database di lilOS: i blocchi non possono usarlo" (this is lilOS's own database: the blocks cannot use it). On the same server you can use another database or another port, not the one of lilOS.

### The values: Extended JSON

Documents go in and out as **Extended JSON (relaxed)**, that is JSON with a few special objects for the types JSON does not have:

| MongoDB type | How it is written |
|---|---|
| ObjectId | `{"$oid": "65a1b2c3d4e5f60718293a4b"}` |
| Date | `{"$date": "2026-11-11T10:05:00Z"}` (it comes out like this: `{"$date": "2026-11-11T10:05:00.000Z"}`) |
| Binary data | `{"$bytes": "base64"}` (as in the other database packages); inside the document it becomes a MongoDB binary |
| Numbers, texts, yes/no, `null`, lists, objects | As in JSON |

- Very big numbers (`Long`, `Decimal128`) come out as numbers, or as text if a Logic Studio number could not represent them without losing digits.
- **The filter, the change, the pipeline and the other options** can be an object or a text. If the text is not JSON, the block tries to read it as in the MongoDB shell: keys without quotes (`{stato: 'nuovo'}`), texts in single quotes, `ObjectId("…")`, `ISODate("…")` or `new Date("…")`, trailing commas.
- A value arriving on an **added input** (a field of the filter or of the document) is used as it is: a text stays a text, an object is Extended JSON (`{"$oid": "…"}`, `{"$date": "…"}`).
- An added input called `_id` with a text of 24 hexadecimal digits finds both the ObjectId and the equal text.

### Module settings

An administrator changes them, in the settings of the `logicstudio-mongodb` module, and they hold from the next operation for all programs.

| Setting | Default | Values | What it does |
|---|---|---|---|
| **Allow the databases on this computer and on the local network** | no | yes / no | If ticked, connections can go to `localhost`, `192.168.x.x`, `10.x.x.x` and the other non-public networks. Link-local and multicast addresses and lilOS's databases stay forbidden. |
| **Time limit of an operation (seconds)** | 30 | 1 to 600 | How long a connection or an operation can last. When it runs out the operation stops with an error (on the server too, with `maxTimeMS`). |
| **Documents in a result, at most** | 10000 | 1 to 1000000 | The highest number of documents a read or an aggregation gives. If there are more, **truncated** is true and the others do not come out. |
| **Size of a result, at most (KB)** | 4096 | 16 to 65536 | How big a result can be (measured as JSON). If it is bigger, an error. |
| **Connections open per user, at most** | 10 | 1 to 100 | The connections open together from all the programs of a user. |
| **Operations per minute per user, at most** | 600 | 1 to 100000 | The operations (connections, reads, writes, counts, aggregations, opening a watch…) a user can do in a minute. |
| **Allow the MongoDB databases** | yes | yes / no | If unticked, the connection gives "L'amministratore non permette i database MongoDB" (the administrator does not allow the MongoDB databases). |

### Quotas and limits

| What | Limit |
|---|---|
| Operations per minute, per user | 600 by default (module setting); it holds for all their programs together, tests included |
| Open connections, per user | 10 by default (module setting) |
| Time of an operation | 30 seconds by default (module setting), on the server too |
| Documents of a result | 10000 by default (module setting) |
| Size of a result | 4096 KB by default (module setting) |
| Documents of a single insert | as many as the maximum documents of a result |
| Text of a filter, a change or a pipeline | 1 MB (if written as text) |
| Servers in an address (URI) | 10 |
| Connections to the server, per connection block | 5 |
| Watches ([MongoDB · Watch changes (watch)](mongo.watch)) per connection | 10 |
| Changes waiting to be read, per watch | 1000 (the oldest are lost; the hidden **lost** output says how many) |
| Time limit of a block | 30 seconds by default (Control Panel → Logic Studio → **Limits**): it holds even if the time limit of an operation is longer |

The operations are those of the database; they are not to be confused with the network requests of the [Network blocks](logicstudio-net) package. See also [Limits](logicstudio-engine/limits).

### Apps made with Create app

An app made with **Create app** that contains MongoDB blocks uses the database on behalf of whoever launches it, with their quotas. See [Permissions](logicstudio-engine/permissions) and [Making an app](ide/create-app).

### The most common errors

Errors come out of the block's **Exception** output, in Italian and on one line. The ones that hold for all blocks:

| Message | When |
|---|---|
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | The **connection** input has no value (the connection is missing). |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | The connection was closed (by **close**, by a new **connect** or because the program stopped): open it again with the connection block. |
| Questa connessione è a …: questo blocco non la può usare | The reference is of another kind of database. |
| Troppe operazioni sul database: al massimo 600 al minuto | You went over the operations per minute (too many operations). |
| MongoDB non ha risposto in 30 s | The operation went over the time limit (MongoDB did not answer in 30 s). |
| Il database ha impiegato troppo tempo (limite del modulo) | The server stopped the operation at its time limit (`maxTimeMS`): the database took too long. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | The result is over the maximum size (ask for fewer rows or columns). |
| Troppe connessioni aperte: al massimo 10 per utente | You have too many open connections. |
| Il programma non è in esecuzione | The program was stopping (the program is not running). |
| Questo è il database di lilOS: i blocchi non possono usarlo | The server is a database that lilOS uses for itself. |
| Indirizzo non permesso: … | The address is forbidden (local network without the administrator's permission, link-local, multicast): address not allowed. |
| Server sconosciuto: … / Server non raggiungibile: … (…) | The name does not exist or the network does not reach the server (unknown server / server not reachable). |
| Accesso negato: utente o password non validi | The server refuses the user or the password (access denied). |
| Permesso negato dal database: … | The user does not have the permission for that operation (permission denied). |
| Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (…) | The password was sealed by another user or on another lilOS. |
| L'amministratore non permette i database MongoDB | MongoDB is switched off in the module settings (the administrator does not allow it). |

The connection errors (server, address, address options…) are listed on the [MongoDB · Connection (MongoClient)](mongo.connect) page; those of the filter and of the documents, on the page of each block; the messages that come from the MongoDB server (duplicate key, validation…) are in the server's language, that is English.

## Libraries

The database is reached with this library, included in the module:

| Library | For | License |
|---|---|---|
| [MongoDB Node.js Driver](https://github.com/mongodb/node-mongodb-native) (`mongodb`) | MongoDB | Apache-2.0 |

The license is also in Control Panel → About → Credits.

## Known limits

- The database is the one chosen in the connection: for another database you need another connection block.
- There are no blocks for indexes, transactions, GridFS or bulk writes with mixed operations.
- [MongoDB · Watch changes (watch)](mongo.watch) works only with a replica set or a cluster (even a one-server replica set), not with a single server.
- Operations in progress cannot be cancelled from a block, only stopped by the time limit.

## See also

- [Database blocks (SQL)](logicstudio-db), [Redis blocks](logicstudio-redis)
- [Basic blocks](logicstudio-core), [Network blocks](logicstudio-net), [lilOS blocks](logicstudio-lilos)
- [The engine](logicstudio-engine), [Limits](logicstudio-engine/limits), [Permissions](logicstudio-engine/permissions)
- [How a block works](ide/blocks)
