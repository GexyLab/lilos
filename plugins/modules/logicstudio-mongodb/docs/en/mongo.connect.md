# MongoDB · Connection (MongoClient)

`mongo.connect` · Database · [MongoDB blocks](logicstudio-mongodb) · version 1

Opens a connection to a **MongoDB** server and sends the reference, which must be linked to the **connection** input of the other MongoDB blocks. It also works with Atlas (`mongodb+srv://` address) and with replica sets.

## Inputs

| Port | Type | Description |
|---|---|---|
| **connect** (`connect`) | pulse | Any value arriving here opens the connection (if this block already has one, it closes it first). |
| **close** (`close`) | pulse | Hidden. Closes the connection. |
| **password** (`password`) | text | Hidden. The password, if you do not want to keep it in the settings. If it has a non-empty value, it takes the place of the **Password** of the settings. **It does not start the block**: it keeps the value for the next connection. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **connection** (`connection`) | object | The reference to the open connection. It is good for this program only. |
| **connected** (`connected`) | yes/no | `true` when the connection is open, `false` when it is closed with **close**. |
| **server** (`info`) | object | Hidden. How the server is made: `{ "server": "db.esempio.it:27017/vendite", "database": "vendite", "version": "7.0.5", "replicaSet": "rs0", "primary": true, "changeStreams": true }`. `replicaSet` is `null` for a single server; `changeStreams` tells whether [MongoDB · Watch changes (watch)](mongo.watch) can work. |
| **Exception** (`error`) | object | When the connection fails: invalid or forbidden address, a server that is not there, access denied, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Address (URI: mongodb:// or mongodb+srv://, without the password; empty = the fields below)** (`uri`) | text | empty | For example `mongodb://db.esempio.it:27017/vendite` or `mongodb+srv://cluster0.abcde.mongodb.net/vendite`. If it is there, **Server** and **Port** do not count. It can have several servers separated by commas (at most 10) and some options (see below). |
| **Server** (`host`) | text | empty | The database computer: a name or an address. It is used only without an **Address (URI)**. |
| **Port** (`port`) | 1 to 65535 | 27017 | The MongoDB port (only without an **Address (URI)**). |
| **Database** (`database`) | text | empty | The database to use. Empty: the one in the address (URI), else `test`. If it is there, it wins over the one in the address. Up to 64 characters, without spaces, `/`, `\`, `.`, `"`, `$`, `*`, `<`, `>`, `:`, `|`, `?`. |
| **User** (`user`) | text | empty | The user. Empty: the one in the address (URI), if there is one; without a user the connection is without authentication. |
| **Password** (`password`) | password field | empty | The user's password. What you write is not shown and is encrypted by the engine (see below). |
| **Users database (authSource, empty = admin)** (`authSource`) | text | empty | The database where the user is. Empty: the one in the address (URI), else `admin`. |
| **Encryption (TLS)** (`tls`) | On, certificate checked; On, certificate not checked; Off | On, certificate checked | Whether and how to encrypt the connection. See below. |
| **Connect at start** (`atStart`) | yes / no | yes | If ticked, the block connects as soon as the program starts. If not, only with **connect**. |

## How it works

- **When the program starts**, if **Connect at start** is ticked, the block opens the connection and sends **connection**, then **connected**, then **server**. Otherwise the connection is opened only with **connect**.
- With **connect** the block closes the connection it already had (its old reference stops working) and opens a new one with the current settings.
- With **close** the block closes the connection and sends `connected = false`.
- When the program stops, all the connections (and the watches inside them) close.
- The **kernel** makes the connection, not the program: the program never sees the password nor a network link, only the reference. See [MongoDB blocks](logicstudio-mongodb).
- The server's errors come out of **Exception** on one line, without the password (three dots take its place).
- The block keeps at most 5 connections to the server (for operations that arrive together); for the user it counts as **one** open connection.
- The server sees the program as `lilOS Logic Studio` (`appName`). The connection opens in at most 10 seconds, and the server selection within the time limit of an operation (at most 30 seconds).

### The server: address (URI) or fields

- With **Server** and **Port** the block talks to **that server only** (direct connection): it does not discover nor use other members of a replica set. Fine for a single server or to talk to a specific member.
- With an **address (URI)** the block discovers the members of the replica set or cluster. A member announced with a forbidden address closes the connection. With `mongodb+srv://` the address has a single name with a dot, without a port.
- The **password cannot be in the address**: `mongodb://anna:segreta@…` is refused; write only `mongodb://anna@…` (or nothing) and put the password in the **Password** field.
- Options allowed in the address: `replicaSet`, `authSource`, `authMechanism` (only `SCRAM-SHA-1`, `SCRAM-SHA-256`, `PLAIN`), `retryWrites`, `retryReads`, `w`, `wtimeoutMS`, `journal`, `readPreference`, `readPreferenceTags`, `readConcernLevel`, `maxStalenessSeconds`, `connectTimeoutMS`, `socketTimeoutMS`, `serverSelectionTimeoutMS`, `heartbeatFrequencyMS`, `localThresholdMS`, `appName`, `directConnection`, `loadBalanced`, `compressors` (only `zlib`), `zlibCompressionLevel`, `srvMaxHosts`, `srvServiceName`, `maxIdleTimeMS`, `waitQueueTimeoutMS`, `timeoutMS`.
- **Not allowed**: the `tls…` and `ssl…` options (encryption is chosen in the **Encryption (TLS)** field: this way no computer file such as `tlsCAFile` is read), the `proxy…` options, `authMechanismProperties`, login mechanisms other than SCRAM and PLAIN (they would read the clouds' metadata), `maxPoolSize`, `minPoolSize` and `maxConnecting`, and any other option not in the list.
- With a server name, every address it has is checked before connecting (see the addresses on the [MongoDB blocks](logicstudio-mongodb) page); with `mongodb+srv://` also the SRV answers and the members the cluster announces.

### The password

The **Password** setting is encrypted by the engine (AES-GCM) for you, on this lilOS: only the encrypted text stays in the schema. Another user, or the same schema on another lilOS, cannot open it and gets the error "Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)" (password not readable: it must be entered again in the block's Properties): the password must be written again. It can also come from the hidden **password** input, for example from [Input (readline)](core.consoleRead) with **Hide what is typed**; a non-empty value on the input wins over the one in the settings. A password without a **User** is an error.

### Encryption (TLS)

| Choice | What it means |
|---|---|
| **On, certificate checked** | Encrypted, and the certificate (chain and server name) must be valid. It is the default, and the right one for a server on the internet (Atlas). |
| **On, certificate not checked** | Encrypted, but the certificate is not checked: it protects from whoever listens, not from whoever pretends to be the server. For servers with a self-signed certificate. |
| **Off** | No encryption: password and data travel in the clear. Fine only on a network you trust, for example a MongoDB on your own computer (which the administrator must have allowed). |

A MongoDB installed at home without TLS therefore needs **Off**: with the default choice the connection fails.

## Examples

### 1. Connect and read the collections

Settings: **Server** `db.esempio.it`, **Database** `vendite`, **User** `anna`, **Password** (written in the field), **Encryption (TLS)** "On, certificate checked".

```
[MongoDB · Connection (MongoClient)] connection ──▶ connection [MongoDB · Collections (listCollections)] names ──▶ value [Print (console.log)]
                                     connected ──▶ run
                                     Exception ──▶ value [Print (console.log)]
```

When the program starts it connects. [MongoDB · Collections (listCollections)](mongo.collections) starts only with **run**: link **connected** to **run** to read the collections as soon as the connection is ready, or use a [Button](ui.button).

### 2. Atlas with a `mongodb+srv://` address

**Address (URI)** `mongodb+srv://anna@cluster0.abcde.mongodb.net/vendite`, **Password** written in the field, **Encryption (TLS)** at its default.

```
[MongoDB · Connection (MongoClient)] connection ──▶ connection [MongoDB · Count (countDocuments): ordini] count ──▶ value [Value]
                                     connected ──▶ run
```

**connected** arrives after **connection**: [MongoDB · Count (countDocuments)](mongo.count) already sees the reference and counts the documents of `ordini`.

### 3. The password asked to whoever uses the program

Untick **Connect at start** and leave the **Password** empty.

```
[Input (readline): "Password?", Hide what is typed] value ──▶ password [MongoDB · Connection (MongoClient)] connection ──▶ connection [MongoDB · Collections (listCollections)] names ──▶ value [Print (console.log)]
[Button: Connect] pressed ─────────────────────────────────────────▶ connect                              connected ──▶ run
```

The password arrives on the hidden input, which keeps it without starting the block; the [Button](ui.button) opens the connection.

## Errors

The most common network and quota errors (address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many connections, password not readable…) are listed on the [MongoDB blocks](logicstudio-mongodb) page. In addition:

| Message | When |
|---|---|
| Manca il server: scrivi un indirizzo (URI) oppure il server | Both the **Address (URI)** and the **Server** are empty (missing server). |
| Server non valido: … | The server name is longer than 253 characters or contains spaces, `/`, `@`, `?`, `#` or commas. |
| Numero non valido: … | **Port** is not a whole number between 1 and 65535. |
| Server sconosciuto: … / Server non raggiungibile: … (…) | The name does not exist or the network does not reach the server (unknown server / server not reachable). |
| Indirizzo non permesso: … | The address is forbidden (local network without the administrator's permission, link-local, multicast): address not allowed. |
| Indirizzo (URI) non valido: scrivi mongodb://server:27017/database oppure mongodb+srv://cluster.esempio.net/database | The address does not begin with `mongodb://` or `mongodb+srv://`, or cannot be read. |
| L'indirizzo (URI) contiene una password: toglila e scrivila nel campo Password (viene conservata cifrata) | There is `user:password@` in the address (the URI contains a password). |
| Troppi server nell'indirizzo (al massimo 10) | The address lists more than 10 servers. |
| Un indirizzo mongodb+srv:// ha un solo nome, senza porta | A `mongodb+srv://` address with several names or with a port. |
| Nome non valido per mongodb+srv: … | The name has characters that are not allowed or has no dot. |
| Opzione … non permessa nell'indirizzo: usa il campo TLS | The address has a `tls…` or `ssl…` option (not allowed: use the TLS field). |
| Opzione … non permessa: i blocchi non passano da un proxy | The address has a `proxy…` option (the blocks do not go through a proxy). |
| Opzione authMechanismProperties non permessa | The address has `authMechanismProperties` (not allowed). |
| Opzione dell'indirizzo non permessa: … | The address has an option that is not in the list of allowed ones. |
| Meccanismo di accesso non permesso: … (solo SCRAM-SHA-1, SCRAM-SHA-256 e PLAIN) | `authMechanism` is another mechanism (login mechanism not allowed). |
| Compressione non permessa: solo zlib | `compressors` has a value other than `zlib` and `none` (only zlib). |
| Opzioni maxPoolSize, minPoolSize e maxConnecting non permesse: i blocchi usano al massimo 5 connessioni per server | The address changes the pool size. |
| Server non valido nell'indirizzo: … / Nome utente non valido nell'indirizzo / Nome del database non valido nell'indirizzo | A part of the address cannot be read. |
| Nome del database non valido: … | **Database** has characters that are not allowed or is longer than 64 characters. |
| C'è la password ma manca l'utente | There is a password but no user. |
| L'amministratore non permette i database MongoDB | MongoDB is switched off in the settings of the logicstudio-mongodb module (the administrator does not allow it). |
| Accesso negato: utente o password non validi | The server refuses the user or the password (or the **Users database** is wrong): access denied. |
| Permesso negato dal database: … | The user exists but does not have the required permission. |
| Server MongoDB non raggiungibile: … | No server answers (switched off, wrong port, TLS on/off wrong, replica set without a primary…). After the colon, the driver's reason. |
| Il server indica un membro a un indirizzo non permesso (…): connessione chiusa. … | The cluster announces a member at a forbidden address (for example a local network that is not allowed). |
| MongoDB non ha risposto in 30 s | The server did not answer within the time limit of an operation (MongoDB did not answer in 30 s). |

## See also

- [MongoDB · Find (find)](mongo.find), [MongoDB · Insert (insertOne · insertMany)](mongo.insert), [MongoDB · Watch changes (watch)](mongo.watch), [MongoDB · Collections (listCollections)](mongo.collections)
- [MongoDB blocks](logicstudio-mongodb), for the addresses, limits, quotas and module settings
- [Database blocks (SQL)](logicstudio-db), for the SQL databases
- [Input (readline)](core.consoleRead), to ask the password to whoever uses the program
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
