# Redis blocks

`logicstudio-redis` · needs the engine `logicstudio-engine` (1.7.0 or later) and the [Basic blocks](logicstudio-core)

The blocks that make a Logic Studio program talk to a **Redis** server: read and write values (also with an expiry), counters, hashes, lists (work queues), messages published and received as they arrive, a key search and, for everything else, any command. In the block list of the IDE they are in the **Database** category, with a name that begins with "Redis ·".

## How to install

The package does not come with Logic Studio IDE: an administrator installs it from the **AppStore**, **Kernel** tab ("Redis blocks"). The AppStore also installs the engine and the basic blocks, if they are missing. After the installation the blocks appear in the **Blocks** tab of the IDE.

## The blocks

The **connection** block opens the connection and sends a reference from its **connection** output; that reference is linked to the **connection** input of all the other blocks.

| Block | Type | What it does |
|---|---|---|
| [Redis · Connection (connect)](redis.connect) | `redis.connect` | The connection to a Redis server (server, port, database number, user, password, TLS). |
| [Redis · Get (GET)](redis.get) | `redis.get` | The value of a text key (empty if it is not there). |
| [Redis · Set (SET)](redis.set) | `redis.set` | Writes the value of a key, with an expiry and "only if it does not exist" (NX) or "only if it exists" (XX). |
| [Redis · Delete (DEL)](redis.del) | `redis.del` | Deletes a key, or each key of a list. |
| [Redis · Exists (EXISTS)](redis.exists) | `redis.exists` | Whether a key exists (with a list: whether they all exist, and how many do). |
| [Redis · Increment (INCRBY)](redis.incr) | `redis.incr` | Adds a step to the number of a key (with decimals, INCRBYFLOAT). |
| [Redis · Expiry (EXPIRE · TTL)](redis.expire) | `redis.expire` | Reads, sets or removes the expiry of a key. |
| [Redis · Hash: get (HGET · HGETALL)](redis.hget) | `redis.hget` | A field of a hash, or the whole hash as an object. |
| [Redis · Hash: set fields (HSET)](redis.hset) | `redis.hset` | Writes the fields of an object in a hash; each added input is a field. |
| [Redis · List: add (LPUSH · RPUSH)](redis.push) | `redis.push` | Adds a value (or each one of a list) at the start or at the end of a list. |
| [Redis · List: take (LPOP · RPOP · BLPOP)](redis.pop) | `redis.pop` | Takes one or more values from the start or the end of a list; it can wait for one (at most 25 seconds). |
| [Redis · List: range (LRANGE)](redis.range) | `redis.range` | The values of a list from start to end, without taking them. |
| [Redis · Publish (PUBLISH)](redis.publish) | `redis.publish` | Sends a message on a channel to whoever is subscribed. |
| [Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe) | `redis.subscribe` | Receives every message of the channels (or patterns) as it arrives, with a connection of its own. |
| [Redis · Find keys (SCAN)](redis.scan) | `redis.scan` | The keys that match a pattern, never with KEYS. |
| [Redis · Command (call)](redis.command) | `redis.command` | Any command as a list; the administration commands are refused. |

## A first example

```
[Redis · Connection (connect)] connection ──▶ connection [Redis · Increment (INCRBY): visite] value ──▶ value [Value: visits]
[Button: Visit] pressed ──▶ run
```

The program connects to Redis at start. Every time you press **Visit**, [Redis · Increment (INCRBY)](redis.incr) adds 1 to the number of the key `visite` and the [Value](ui.value) shows the total. Another program using the same key increases the same counter.

## Good to know

### The kernel makes the connections

The connections do not start from your browser nor from the program, but from the **kernel**, that is the computer lilOS runs on, on behalf of the user who owns the program. For this reason:

- it works even when lilOS is closed in the browser, if the program is active;
- the program never sees the password nor a network link: it only holds a **reference** (an object that comes out of the **connection** output), which is good for that program only. A reference copied into another program does not work ("Connessione chiusa (o di un altro programma)", connection closed or from another program);
- when the program stops, all its connections and subscriptions close;
- an active program really uses the server, even when you are not looking: try it first with **Try**, especially with the blocks that write or delete;
- what a user can really do also depends on the connection's **Redis user (ACL)**.

### The reference to the connection (handle)

The **connection** output is a small object that holds only a random code, the kind of database (`redis`) and the server's name. It is carried by a [link](ide/blocks) to all the blocks that must use that connection. A reference of another kind of database (for example the one of [MongoDB blocks](logicstudio-mongodb)) cannot be used here: "Questa connessione è a mongodb: questo blocco non la può usare" (this connection is to mongodb: this block cannot use it). The database number and the connection are one: for another number you need another connection block.

Some operations use an **extra connection**, made by the kernel with the same settings: every [Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe) and every wait of [Redis · List: take (LPOP · RPOP · BLPOP)](redis.pop). They all count in the user's open connections.

### The password

The **Password** setting of the connection block is a field made on purpose: what you write is not shown and never comes back. The engine **encrypts** it (AES-GCM) for you, on this lilOS, and only the encrypted text stays in the schema. So:

- whoever opens the schema (or a project file) does not see the password;
- another user, or the same schema on another lilOS, **cannot open it**: the connection gives the error "Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)" (password not readable: it must be entered again), and the password must be written again;
- the password can also come from the hidden **password** input, for example from [Input (readline)](core.consoleRead) with **Hide what is typed**: in that case it is not saved anywhere. A non-empty value on the input wins over the one in the settings.

The server's errors, and so also those that could contain the password, come out of **Exception** on one line and without the password (three dots take its place).

### Encryption (TLS)

The connection block has the **Encryption (TLS)** choice: "On, certificate checked" (the default), "On, certificate not checked" and "Off". A Redis at home that has no TLS needs **Off**. For a server on the internet leave the default. The details are on the [Redis · Connection (connect)](redis.connect) page.

### The addresses and the administrator's setting

The server's name is resolved and **every** address it has is checked before connecting; then the connection goes to the address that was checked (with TLS the certificate is checked against the server's name). So a name cannot be moved to a forbidden address between the check and the connection. There is no Sentinel nor Cluster, which would send the program to other addresses.

- **Never allowed**, not even by the administrator: the "link-local" addresses `169.254.x.x` and `fe80::…` (where many clouds keep the machine's secret data), multicast addresses, `0.x.x.x`, `255.255.255.255` and `::`.
- **Blocked unless the administrator allows them**: this computer (`127.x.x.x`, `localhost`, `::1`), local networks (`10.x.x.x`, `172.16.x.x`–`172.31.x.x`, `192.168.x.x`, `fc00::…`), the carriers' shared network (`100.64.x.x`–`100.127.x.x`), reserved and documentation addresses, and IPv6 addresses that carry an IPv4 address inside.
- To allow the second group, an administrator ticks **Allow the databases on this computer and on the local network** in the module settings.

A Redis on your home or office network therefore needs an administrator to tick that box.

### The lilOS database is never opened

The databases lilOS uses for itself (the addresses written in the kernel's configuration) **cannot be reached** by the blocks, not even with the local network allowed and not even under another name of the same computer: the connection gives "Questo è il database di lilOS: i blocchi non possono usarlo" (this is lilOS's own database: the blocks cannot use it). On the same server you can use another port, not the one of lilOS.

### The values

Redis keeps **text**. The blocks behave like this:

- A **text** stays a text; a number or a yes/no becomes text (`5`, `true`); `null` the empty text; an object or a list are written as JSON text.
- Binary data `{ "$bytes": "base64" }` (as in the other database packages) is written as binary data.
- With the **JSON** option of the blocks that read and write, the value is written with `JSON.stringify` and reread with `JSON.parse`: objects, lists, numbers and yes/no come back as such. If the text read is not JSON, the block gives the error "Il valore … non è JSON: togli l'opzione JSON per leggerlo come testo" (the value is not JSON: remove the JSON option to read it as text). In [Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe) a message that is not JSON stays a text, without an error.
- The replies of [Redis · Command (call)](redis.command) become Logic Studio values (texts, numbers, `null`, lists).

### Module settings

An administrator changes them, in the settings of the `logicstudio-redis` module, and they hold from the next operation for all programs.

| Setting | Default | Values | What it does |
|---|---|---|---|
| **Allow the databases on this computer and on the local network** | no | yes / no | If ticked, connections can go to `localhost`, `192.168.x.x`, `10.x.x.x` and the other non-public networks. Link-local and multicast addresses and lilOS's databases stay forbidden. |
| **Time limit of an operation (seconds)** | 30 | 1 to 600 | How long a connection or a command can last. When it runs out the operation stops with an error. |
| **Values in a result, at most (keys, list items, hash fields)** | 10000 | 1 to 1000000 | The highest number of values that [Redis · Find keys (SCAN)](redis.scan), [Redis · List: range (LRANGE)](redis.range), [Redis · Hash: get (HGET · HGETALL)](redis.hget) and [Redis · List: take (LPOP · RPOP · BLPOP)](redis.pop) (with **How many**) give. If there are more, **truncated** is true and the others do not come out. |
| **Size of a result, at most (KB)** | 4096 | 16 to 65536 | How big a result can be (measured as JSON). If it is bigger, an error. |
| **Connections open per user, at most (each subscription counts as one)** | 10 | 1 to 100 | The connections open together from all the programs of a user, including those of subscriptions and waits. |
| **Operations per minute per user, at most** | 600 | 1 to 100000 | The operations (connections, commands, opening a subscription…) a user can do in a minute. |
| **Allow the Redis databases** | yes | yes / no | If unticked, the connection gives "L'amministratore non permette i database Redis" (the administrator does not allow the Redis databases). |
| **Allow the «Command» block (any command except the administration ones)** | yes | yes / no | If unticked, [Redis · Command (call)](redis.command) gives "L'amministratore ha disattivato il blocco Comando (impostazioni del modulo)" (the administrator switched off the Command block). |

### Quotas and limits

| What | Limit |
|---|---|
| Operations per minute, per user | 600 by default (module setting); it holds for all their programs together, tests included |
| Open connections, per user | 10 by default (module setting); each subscription and each wait of Take counts as one |
| Time of a command | 30 seconds by default (module setting) |
| Values of a result | 10000 by default (module setting) |
| Size of a result | 4096 KB by default (module setting) |
| Length of a key, a field or a channel | 10000 characters |
| Keys in a [Redis · Delete (DEL)](redis.del) or [Redis · Exists (EXISTS)](redis.exists) | 10000 |
| Arguments of a command | 10000 |
| Wait of [Redis · List: take (LPOP · RPOP · BLPOP)](redis.pop) | 25 seconds |
| Subscriptions ([Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe)) per connection | 10; at most 32 channels per subscription |
| Messages waiting to be read, per subscription | 1000 (the oldest are lost; the hidden **lost** output says how many) |
| Time limit of a block | 30 seconds by default (Control Panel → Logic Studio → **Limits**): it holds even if the time limit of a command is longer |

The operations are those of the database; they are not to be confused with the network requests of the [Network blocks](logicstudio-net) package. See also [Limits](logicstudio-engine/limits).

### Apps made with Create app

An app made with **Create app** that contains Redis blocks uses the server on behalf of whoever launches it, with their quotas. See [Permissions](logicstudio-engine/permissions) and [Making an app](ide/create-app).

### The most common errors

Errors come out of the block's **Exception** output, in Italian and on one line. The ones that hold for all blocks:

| Message | When |
|---|---|
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | The **connection** input has no value (the connection is missing). |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | The connection was closed (by **close**, by a new **connect** or because the program stopped): open it again with the connection block. |
| Questa connessione è a …: questo blocco non la può usare | The reference is of another kind of database. |
| Connessione a Redis chiusa: riaprila con il blocco di connessione | The network dropped and the connection did not reopen. |
| Troppe operazioni sul database: al massimo 600 al minuto | You went over the operations per minute (too many operations). |
| Redis non ha risposto in 30 s | The command went over the time limit (Redis did not answer in 30 s). |
| Redis non ha risposto in tempo (limite del modulo) | The command went over the time limit inside the library. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | The result is over the maximum size (ask for fewer rows or columns). |
| Troppe connessioni aperte: al massimo 10 per utente | You have too many open connections. |
| Il programma non è in esecuzione | The program was stopping (the program is not running). |
| La chiave contiene un altro tipo di valore (testo, hash, lista…): usa il blocco giusto per quel tipo | The key exists but is of another type (`WRONGTYPE`): use the right block for that type. |
| Questo è il database di lilOS: i blocchi non possono usarlo | The server is a database that lilOS uses for itself. |
| Indirizzo non permesso: … | The address is forbidden (local network without the administrator's permission, link-local, multicast): address not allowed. |
| Server sconosciuto: … / Server non raggiungibile: … (…) | The name does not exist or the network does not reach the server (unknown server / server not reachable). |
| Connessione rifiutata dal server Redis | The server does not accept connections on that port (connection refused). |
| Accesso negato: utente o password non validi | The server refuses the user or the password (access denied). |
| Permesso negato dal database: … | The ACL user cannot use that command or that key (permission denied). |
| Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (…) | The password was sealed by another user or on another lilOS. |
| L'amministratore non permette i database Redis | Redis is switched off in the module settings (the administrator does not allow it). |

The connection errors (server, port, database number…) are listed on the [Redis · Connection (connect)](redis.connect) page; those of each command, on the block's page; the other messages that come from the Redis server (`ERR …`) are in the server's language, that is English.

## Libraries

The server is reached with this library, included in the module:

| Library | For | License |
|---|---|---|
| [ioredis](https://github.com/redis/ioredis) (`ioredis`) | Redis | MIT |

The license is also in Control Panel → About → Credits.

## Known limits

- No Sentinel nor Cluster: the connection is to a single server.
- There are no blocks for transactions (`MULTI`/`EXEC`), scripts (`EVAL`) and functions, and [Redis · Command (call)](redis.command) refuses them.
- Published messages are not kept: [Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe) receives only those that arrive while it listens. For queues that must not lose jobs use a list.
- The values are text: numbers come back as numbers only with the **JSON** option (or with [Type cast](core.convert)).

## See also

- [Database blocks (SQL)](logicstudio-db), [MongoDB blocks](logicstudio-mongodb)
- [Basic blocks](logicstudio-core), [Network blocks](logicstudio-net), [lilOS blocks](logicstudio-lilos)
- [The engine](logicstudio-engine), [Limits](logicstudio-engine/limits), [Permissions](logicstudio-engine/permissions)
- [How a block works](ide/blocks)
