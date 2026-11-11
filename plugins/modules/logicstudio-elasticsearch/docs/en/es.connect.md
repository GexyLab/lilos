# Elasticsearch · Connection (connect)

`es.connect` · Database · [Elasticsearch blocks](logicstudio-elasticsearch) · version 1

Opens a connection to an **Elasticsearch** (7 and 8) or **OpenSearch** (1 and 2) cluster and sends the handle, which is linked to the **connection** input of the other Elasticsearch blocks. The connection closes with **close** or when the program stops.

## Inputs

| Port | Type | Description |
|---|---|---|
| **connect** (`connect`) | pulse | Any value arriving here opens the connection (if this block already has one, it closes it first). |
| **close** (`close`) | pulse | Hidden. Closes the connection. |
| **password / API key** (`password`) | text | Hidden. The password or the API key, if you do not want to keep it in the settings. If it has a non-empty value, it takes the place of the **Password** setting. It **does not start the block**: it keeps the value for the next connection. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **connection** (`connection`) | object | The handle of the open connection. Good only for this program. |
| **connected** (`connected`) | yes/no | `true` when the connection is open, `false` when it is closed with **close**. |
| **server info** (`info`) | object | Hidden. What the cluster is like: `{ "product": "Elasticsearch", "version": "8.13.0", "cluster": "my-cluster", "node": "node-1", "uuid": "…", "url": "https://localhost:9200" }`. `product` is "Elasticsearch" or "OpenSearch". |
| **Exception** (`error`) | object | When the connection fails: no such cluster, wrong password, address not allowed, time out… |

Hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Node addresses (URL, separated by commas)** (`urls`) | text | `https://localhost:9200` | One or more `http://` or `https://` addresses (at most 8), separated by commas or spaces, without user and password. |
| **Access** (`auth`) | User and password, API key, None | User and password | How to introduce yourself to the cluster. |
| **User** (`user`) | text | `elastic` | The user, only for "User and password". |
| **Password or API key (encoded)** (`password`) | password field | empty | The password, or the API key already **encoded** (the `encoded` text Elasticsearch gives when it creates it). What you type is not shown and is encrypted by the engine (see below). |
| **Certificate (https)** (`tls`) | Checked, Not checked (still encrypted) | Checked | Only for `https://`. "Not checked" accepts expired or self-signed certificates too: the connection is encrypted but you cannot be sure you are talking to the right server. |
| **Connect at start** (`atStart`) | yes / no | yes | If ticked, the block connects as soon as the program starts. If not, only with **connect**. |

## How it works

- **When the program starts**, if **Connect at start** is ticked, the block opens the connection and sends **connection**, then **connected**, then **server info**. Otherwise the connection opens only with **connect**.
- With **connect** the block closes the connection it already had (its old handle stops working) and opens a new one with the current settings.
- With **close** the block closes the connection and sends `connected = false`.
- When the program stops, all the connections close.
- The **kernel** makes the connection, not the program, and checks the addresses as explained in [Elasticsearch blocks](logicstudio-elasticsearch).

### The nodes

With several addresses, the block uses the first that answers, and moves to the next one only when a node **cannot be reached** (connection refused, name not found, network unreachable): in that case the request did not get to the node, so it can be repeated elsewhere. If the request got there and the node gave an error, the error is shown and the node is not changed. The node that worked stays the one in use.

### How it checks the server

The block asks for the cluster's root (`/`) and checks that it is Elasticsearch or OpenSearch (from `version.number` and `version.distribution`). The connection opens even with a wrong password only if the server lets the root be read without access; usually a cluster with security on gives 401 and the connection fails at once.

### The password

The **Password or API key** setting is encrypted by the engine for you, on this lilOS: only the encrypted text stays in the schema. Another user, or the same schema on another lilOS, cannot open it and gets the error "Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS)" (password not readable: enter it again in the block Properties): the password must be typed again. It can also come from the hidden input **password / API key**. See [Elasticsearch blocks](logicstudio-elasticsearch).

## Examples

### 1. A cluster with user and password

Settings: **Addresses** `https://es.example.com:9200`, **Access** User and password, **User** `elastic`, **Password** (typed in the field).

```
[Elasticsearch · Connection (connect)] connection ──▶ connection [Elasticsearch · Indices (_cat/indices)] names ──▶ value [Print (console.log)]
[Button: List] pressed ──────────────────────────────────▶ run
```

### 2. A cluster with an API key and two nodes

Settings: **Addresses** `https://es1.example.com:9200, https://es2.example.com:9200`, **Access** API key, **Password or API key** the encoded key.

```
[Elasticsearch · Connection (connect)] connected ──▶ value [Value: connected]
                                       server info ──▶ value [Print (console.log)]
```

If `es1` does not answer, the program moves to `es2` by itself. To see the server info, show the hidden output with the eye.

## Errors

The messages are in Italian.

| Message | When |
|---|---|
| L'amministratore non permette i database Elasticsearch e OpenSearch | Both module settings **Allow Elasticsearch** and **Allow OpenSearch** are off. |
| L'amministratore non permette i database Elasticsearch / L'amministratore non permette i database OpenSearch | The cluster is of the other kind, and that kind is not allowed. |
| Manca l'indirizzo del server (URL) | No address. |
| Troppi indirizzi (al massimo 8) | More than 8 nodes. |
| Indirizzo del server non valido: … / Solo indirizzi http:// e https://: … | An address cannot be read or has another protocol. |
| Non scrivere utente e password nell'indirizzo: usa i campi delle impostazioni | An address contains `user:password@`. |
| Manca l'utente | **Access** "User and password" with no user. |
| Manca la chiave API: scrivila nelle impostazioni del blocco | **Access** API key with no key. |
| Utente, password o chiave API non validi | The password has a line break, or the user has a line break or a colon. |
| Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (lo schema viene da un altro utente o da un altro lilOS) | The encrypted password cannot be opened for this user or this lilOS. |
| Questo motore di Logic Studio non sa aprire le password salvate: aggiornalo | The engine is too old. |
| Il server non sembra Elasticsearch né OpenSearch | The server's root does not have the expected shape. |
| Il server ha risposto 401 (utente, password o chiave API non validi): … | The cluster refuses the access (also 403, 503…). |

The errors common to all blocks (network, certificate, addresses, quotas) are in the page [Elasticsearch blocks](logicstudio-elasticsearch).

## See also

- [Elasticsearch · Index (index)](es.index), [Elasticsearch · Search (_search)](es.search), [Elasticsearch · Indices (_cat/indices)](es.indices)
- [Input (readline)](core.consoleRead), to ask for the password
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
