# InfluxDB · Connection (connect)

`influx.connect` · Database · [InfluxDB blocks](logicstudio-influxdb) · version 1

Opens a connection to an **InfluxDB** server (2.x, 3.x, 1.8 and later) and sends the handle, which is linked to the **connection** input of the other InfluxDB blocks. The connection closes with **close** or when the program stops.

## Inputs

| Port | Type | Description |
|---|---|---|
| **connect** (`connect`) | pulse | Any value arriving here opens the connection (if this block already has one, it closes it first). |
| **close** (`close`) | pulse | Hidden. Closes the connection. |
| **token / password** (`password`) | text | Hidden. The token (or the password for 1.x), if you do not want to keep it in the settings. If it has a non-empty value, it takes the place of the **Token** setting. It **does not start the block**: it keeps the value for the next connection. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **connection** (`connection`) | object | The handle of the open connection. Good only for this program. |
| **connected** (`connected`) | yes/no | `true` when the connection is open, `false` when it is closed with **close**. |
| **server info** (`info`) | object | Hidden. What the server is like: `{ "version": "2.7.10", "major": 2, "build": "OSS", "url": "http://localhost:8086", "org": "casa", "bucket": "sensori" }`. `major` is `null` if the version cannot be told. |
| **Exception** (`error`) | object | When the connection fails: no such server, wrong token, address not allowed, time out… |

Hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Server address (URL)** (`url`) | text | `http://localhost:8086` | The InfluxDB address, `http://` or `https://`, without user and password. A path is kept (`https://example.com/influx`); whatever follows `?` and `#` is dropped. |
| **Organization (2.x)** (`org`) | text | empty | The InfluxDB 2 organization. Leave empty with 3.x and 1.x. |
| **Bucket (or database; 1.x: database/retention)** (`bucket`) | text | empty | The default bucket of the other blocks (which can have their own). With 3.x it is the database; with 1.x write `database/retention`. |
| **Access** (`auth`) | Token (2.x, 3.x), User and password (1.x), None | Token | How to introduce yourself to the server. With "User and password" the token becomes `user:password`. |
| **User (1.x)** (`user`) | text | empty | The user, only for "User and password". |
| **Token (password for 1.x)** (`password`) | password field | empty | The token (or the 1.x password). What you type is not shown and is encrypted by the engine (see below). |
| **Certificate (https)** (`tls`) | Checked, Not checked (still encrypted) | Checked | Only for `https://`. "Not checked" accepts expired or self-signed certificates too: the connection is encrypted but you cannot be sure you are talking to the right server. |
| **Connect at start** (`atStart`) | yes / no | yes | If ticked, the block connects as soon as the program starts. If not, only with **connect**. |

## How it works

- **When the program starts**, if **Connect at start** is ticked, the block opens the connection and sends **connection**, then **connected**, then **server info**. Otherwise the connection opens only with **connect**.
- With **connect** the block closes the connection it already had (its old handle stops working) and opens a new one with the current settings.
- With **close** the block closes the connection and sends `connected = false`.
- When the program stops, all the connections close.
- The **kernel** makes the connection, not the program, and checks the addresses as explained in [InfluxDB blocks](logicstudio-influxdb).

### How it checks the server

The block asks for `/ping` (and, if needed, `/health`) and reads the version from the headers or from the answer. With version 2 it also tries to read the bucket list, so a wrong token gives an error at once (`/ping` does not ask for the token). With version 3 the token is already needed for `/ping`. So the connection succeeds only if the server answers and, where it can be checked, the token is valid; it is not checked that the bucket exists.

### The token

The **Token** setting is encrypted by the engine for you, on this lilOS: only the encrypted text stays in the schema. Another user, or the same schema on another lilOS, cannot open it and gets the error "Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)" (password not readable: enter it again in the block Properties): the token must be typed again. It can also come from the hidden input **token / password**. See [InfluxDB blocks](logicstudio-influxdb).

## Examples

### 1. Connecting to InfluxDB 2 on your own server

Settings: **Address** `https://influx.example.com`, **Organization** `casa`, **Bucket** `sensori`, **Access** Token, **Token** (typed in the field).

```
[InfluxDB · Connection (connect)] connection ──▶ connection [InfluxDB · Buckets (list)] names ──▶ value [Print (console.log)]
[Button: List] pressed ──────────────────────────────────▶ run
```

The program connects at start; the button writes the bucket names to the console.

### 2. The token asked at start

Untick **Connect at start** and leave the token empty.

```
[Input (readline): "Token?"] text ──▶ token / password [InfluxDB · Connection (connect)]
[Button: Connect] pressed ──▶ connect
```

With **Hide what is typed** on [Input (readline)](core.consoleRead) the token is saved nowhere. After the connection, the **token / password** input keeps the value for reconnections.

## Errors

The messages are in Italian.

| Message | When |
|---|---|
| L'amministratore non permette i database InfluxDB | The module setting **Allow InfluxDB** is off. |
| Manca l'indirizzo del server (URL) | The address is empty. |
| Indirizzo del server troppo lungo | The address is longer than 2048 characters. |
| Indirizzo del server non valido: … | The address cannot be read. |
| Solo indirizzi http:// e https://: … | The address has another protocol. |
| Non scrivere utente e password nell'indirizzo: usa i campi delle impostazioni | The address contains `user:password@`. |
| Manca il server nell'indirizzo | The address has no server name. |
| L'organizzazione non valido: … / Il bucket non valido: … | The name is longer than 255 characters or has control characters. |
| Manca l'utente (InfluxDB 1.x) | **Access** "User and password" with no **User**. |
| Manca il token: scrivilo nelle impostazioni del blocco (o scegli «Nessuna» come accesso) | **Access** Token with no token. |
| Utente o token non validi | The token has a line break, or the user has a line break or a colon. |
| Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS) | The encrypted token cannot be opened for this user or this lilOS. |
| Questo motore di Logic Studio non sa aprire le password salvate: aggiornalo | The engine is too old. |
| InfluxDB ha risposto 401 (token o password non validi): … | The server refuses the token (also 403, 404, 503…). |

The errors common to all blocks (network, certificate, addresses, quotas) are in the page [InfluxDB blocks](logicstudio-influxdb).

## See also

- [InfluxDB · Write point (write)](influx.write), [InfluxDB · Query (Flux · InfluxQL · SQL)](influx.query), [InfluxDB · Buckets (list)](influx.buckets), [InfluxDB · Delete data (delete)](influx.delete)
- [Input (readline)](core.consoleRead), to ask for the token
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
