# SQL · Listen (LISTEN)

`db.listen` · Database · [Database blocks (SQL)](logicstudio-db) · version 1

**PostgreSQL** only: receives the **notifications** (`NOTIFY`) of a channel while the program runs. It is the way the database tells the program that something changed (a new row, an order that arrived...) without having to ask every now and then.

## Inputs

| Port | Type | Description |
|---|---|---|
| **start** (`start`) | pulse | Starts listening to the channel (if it was already listening, it starts again). |
| **stop** (`stop`) | pulse | Hidden. Stops listening and sends `listening = false`. |
| **connection** (`connection`) | object | The reference of a **PostgreSQL** connection block. **It starts the block**: as soon as the connection arrives, listening begins by itself. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **message** (`message`) | text | The text of each notification; with **Messages are JSON**, the value read from the JSON (if the text is valid JSON). |
| **notification** (`data`) | object | Hidden. Each whole notification: `{ "channel": "ordini", "payload": …, "pid": 4821 }` (`pid` is the number of the server process that sent it). |
| **listening** (`listening`) | yes/no | `true` when listening began; `false` when it ends (with **stop** or because the connection closed). |
| **Exception** (`error`) | object | When listening does not begin: not a PostgreSQL connection, invalid channel, closed connection... |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Channel** (`channel`) | text | `eventi` | The name of the channel to listen to: letters, digits, `_` and `$`, starting with a letter or `_`, at most 63 characters. |
| **Messages are JSON** (`json`) | yes / no | no | If ticked, the text of each notification is read as JSON: **message** sends the object or list. If the text is not valid JSON, the text comes out. |

## Added ports

This block has no added ports.

## How it works

1. With **start** (or as soon as the **connection** arrives) the block asks the server to listen to the channel (`LISTEN channel`). It sends `listening = true`.
2. The block waits for notifications (a long wait, using no resources). For each notification it sends **notification** and then **message**.
3. Listening ends with **stop**, when the program stops or when the connection closes: then it sends `listening = false`.

- **PostgreSQL only**: with another database it gives the error "SQL · Ascolta (LISTEN) funziona solo con le connessioni PostgreSQL" (Listen works only with PostgreSQL connections).
- **One connection of the pool**: each listening keeps busy one of the **Connections in the pool** of the PostgreSQL connection, while it lasts.
- **Only messages sent afterwards**: notifications sent before listening began are not received (PostgreSQL does not keep them).
- **If too many** notifications arrive fast, the block queues up to 1000; the oldest beyond that number are lost.
- The message is at most 8000 bytes (PostgreSQL's limit).
- **Not inside a transaction**: link the connection, not the transaction.
- Notifications do not change the time limit of operations: listening is a long-lived connection, not a query.

## Examples

### 1. Every new order in a window

In the database a function does `NOTIFY ordini, '{"id": 7, "cliente": "Rossi"}'` when an order is inserted. **Channel** `ordini`, **Messages are JSON** ticked.

```
[SQL · PostgreSQL (connect)] connection ──▶ connection [SQL · Listen (LISTEN)] message ──▶ object [Destructure object: cliente] ──▶ value [Value: latest customer]
```

Listening begins by itself when the connection arrives. Each new order updates the [Value](ui.value).

### 2. Listening only when needed

The connection stays open, and listening is commanded with buttons.

```
[SQL · PostgreSQL (connect)] connection ──▶ connection [SQL · Listen (LISTEN): avvisi] message ──▶ value [Print (console.log)]
[Button: Listen] pressed ──▶ start
[Button: Stop]   pressed ──▶ stop (hidden port)
```

Show the hidden **stop** input with the **eye**; **listening** can light a [Lamp](ui.lamp).

### 3. A real-time alert

```
[SQL · PostgreSQL (connect)] connection ──▶ connection [SQL · Listen (LISTEN): allarmi] message ──▶ text [Notify]
```

When another program (or a database trigger) sends `NOTIFY allarmi`, a [Notify](lilos.notify) arrives at once.

## Errors

The messages are in Italian, as the block sends them. In English:

| Message | When |
|---|---|
| SQL · Ascolta (LISTEN) funziona solo con le connessioni PostgreSQL | The connection is not PostgreSQL's, or it is a transaction or a cursor. |
| Canale non valido: «…» (lettere, cifre e _) | The **Channel** has spaces or symbols that are not allowed (invalid channel). |
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | The **connection** input has no value. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | The connection was closed. |
| Troppe operazioni sul database: al massimo 600 al minuto | You went over the operations per minute. |
| Il database non ha risposto in 30 s | Starting to listen went over the time limit. |

## See also

- [SQL · Notify (NOTIFY)](db.notify), to send the notifications
- [SQL · PostgreSQL (connect)](db.postgres)
- [Database blocks (SQL)](logicstudio-db), [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
