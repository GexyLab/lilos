# Redis · Connection (connect)

`redis.connect` · Database · [Redis blocks](logicstudio-redis) · version 1

Opens a connection to a **Redis** server and sends the reference, which must be linked to the **connection** input of the other Redis blocks. It also works with services that speak the Redis protocol (for example Redis Cloud).

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
| **server** (`info`) | object | Hidden. How the server is made: `{ "server": "redis.esempio.it:6379/0", "version": "7.2.4", "mode": "standalone", "database": 0 }`. |
| **Exception** (`error`) | object | When the connection fails: a server that is not there, wrong password, forbidden address, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Server** (`host`) | text | empty | The database computer: a name (`redis.esempio.it`) or an address (`192.168.1.20`). |
| **Port** (`port`) | 1 to 65535 | 6379 | The Redis port. |
| **Database number (SELECT)** (`db`) | 0 to 10000 | 0 | The numbered Redis database to connect to (usually 0 to 15). The server may have fewer. |
| **User (ACL, empty = default)** (`user`) | text | empty | The ACL user (Redis 6 or later). Empty: the `default` user, with the password only. |
| **Password** (`password`) | password field | empty | The password. What you write is not shown and is encrypted by the engine (see below). |
| **Encryption (TLS)** (`tls`) | On, certificate checked; On, certificate not checked; Off | On, certificate checked | Whether and how to encrypt the connection. See below. |
| **Connect at start** (`atStart`) | yes / no | yes | If ticked, the block connects as soon as the program starts. If not, only with **connect**. |

## How it works

- **When the program starts**, if **Connect at start** is ticked, the block opens the connection and sends **connection**, then **connected**, then **server**. Otherwise the connection is opened only with **connect**.
- With **connect** the block closes the connection it already had (its old reference stops working) and opens a new one with the current settings.
- With **close** the block closes the connection and sends `connected = false`.
- When the program stops, all the connections (and the subscriptions inside them) close.
- The **kernel** makes the connection, not the program: the program never sees the password nor a network link, only the reference. See [Redis blocks](logicstudio-redis).
- The server's name is resolved and every address checked; the connection goes to the address that was checked (with TLS the certificate is checked against the server's name). **No Sentinel nor Cluster**: they would send the program to other, unchecked addresses.
- The server's errors come out of **Exception** on one line, without the password (three dots take its place).
- If the network drops, the block tries to reconnect up to 3 times; then the commands say "Connessione a Redis chiusa: riaprila con il blocco di connessione" (connection to Redis closed: reopen it with the connection block) and **connect** is needed.
- The subscriptions of [Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe) and the waits of [Redis · List: take (LPOP · RPOP · BLPOP)](redis.pop) use extra connections, each with the same settings: they count in the limit of open connections per user.

### The password

The **Password** setting is encrypted by the engine (AES-GCM) for you, on this lilOS: only the encrypted text stays in the schema. Another user, or the same schema on another lilOS, cannot open it and gets the error "Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)" (password not readable: it must be entered again): the password must be written again. It can also come from the hidden **password** input, for example from [Input (readline)](core.consoleRead) with **Hide what is typed**; a non-empty value on the input wins over the one in the settings.

### Encryption (TLS)

| Choice | What it means |
|---|---|
| **On, certificate checked** | Encrypted, and the certificate (chain and server name) must be valid. It is the default, and the right one for a server on the internet (Redis Cloud, ElastiCache with TLS). |
| **On, certificate not checked** | Encrypted, but the certificate is not checked: it protects from whoever listens, not from whoever pretends to be the server. For servers with a self-signed certificate. |
| **Off** | No encryption: password and data travel in the clear. Fine only on a network you trust, for example a Redis on your own computer (which the administrator must have allowed). |

A Redis installed at home without TLS therefore needs **Off**: with the default choice the connection fails.

## Examples

### 1. Connect to a local Redis

Settings: **Server** `127.0.0.1`, **Port** 6379, **Encryption (TLS)** "Off". An administrator must have ticked **Allow the databases on this computer and on the local network** in the module settings.

```
[Redis · Connection (connect)] connection ──▶ connection [Redis · Get (GET): contatore] value ──▶ value [Value]
                               connected ──▶ run
```

As soon as the connection is ready, **connected** starts [Redis · Get (GET)](redis.get) and the [Value](ui.value) shows the content of `contatore`.

### 2. Redis Cloud with user and password

**Server** `redis-12345.c1.eu-west-1.ec2.cloud.redislabs.com`, **Port** 12345, **User** `default`, **Password** written in the field, **Encryption (TLS)** at its default.

```
[Redis · Connection (connect)] connection ──▶ connection [Redis · Set (SET): avvio] written ──▶ value [Print (console.log)]
                               connected ──▶ run
                               Exception ──▶ value [Print (console.log)]
```

If the password is wrong, **Exception** writes "Accesso negato: utente o password non validi" (access denied: invalid user or password).

### 3. The password asked to whoever uses the program

Untick **Connect at start** and leave the **Password** empty.

```
[Input (readline): "Password?", Hide what is typed] value ──▶ password [Redis · Connection (connect)] connection ──▶ connection [Redis · Find keys (SCAN)] keys ──▶ value [Print (console.log)]
[Button: Connect] pressed ──────────────────────────────────────────▶ connect                          connected ──▶ run
```

The password arrives on the hidden input, which keeps it without starting the block; the [Button](ui.button) opens the connection.

## Errors

The most common network and quota errors (address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many connections, password not readable…) are listed on the [Redis blocks](logicstudio-redis) page. In addition:

| Message | When |
|---|---|
| Manca il server | The **Server** is empty (missing server). |
| Nome del server non valido: … | The name is longer than 253 characters or contains spaces, `/`, `\` or `@`. |
| Server sconosciuto: … / Server non raggiungibile: … (…) | The name does not exist or the network does not reach the server (unknown server / server not reachable). |
| Porta non valida: … | **Port** is not a whole number between 1 and 65535 (invalid port). |
| Numero del database non valido: … | **Database number** is not a whole number between 0 and 10000. |
| Nome utente troppo lungo | **User** is over 200 characters (user name too long). |
| Indirizzo non permesso: … | The address is forbidden (local network without the administrator's permission, link-local, multicast): address not allowed. |
| L'amministratore non permette i database Redis | Redis is switched off in the settings of the logicstudio-redis module (the administrator does not allow it). |
| Accesso negato: utente o password non validi | The server refuses the user or the password, or wants one and there is none (access denied). |
| Permesso negato dal database: … | The ACL user cannot use a command or a key (permission denied). |
| Connessione rifiutata dal server Redis | The server does not accept connections on that port (switched off, wrong port): connection refused. |
| Connessione a Redis chiusa: riaprila con il blocco di connessione | The connection dropped and did not reopen (or the TLS encryption does not agree with the server). |
| Redis non ha risposto in 30 s | The server did not answer within the time limit of an operation (Redis did not answer in 30 s). |
| ERR DB index is out of range | The server does not have that **Database number** (the server's own message, in English). |

## See also

- [Redis · Get (GET)](redis.get), [Redis · Set (SET)](redis.set), [Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe), [Redis · Command (call)](redis.command)
- [Redis blocks](logicstudio-redis), for the addresses, limits, quotas and module settings
- [Database blocks (SQL)](logicstudio-db), for the SQL databases; [MongoDB blocks](logicstudio-mongodb)
- [Input (readline)](core.consoleRead), to ask the password to whoever uses the program
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
