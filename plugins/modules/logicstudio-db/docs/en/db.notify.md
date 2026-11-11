# SQL · Notify (NOTIFY)

`db.notify` · Database · [Database blocks (SQL)](logicstudio-db) · version 1

**PostgreSQL** only: sends a **notification** on a channel. Whoever listens to that channel (another program with [SQL · Listen (LISTEN)](db.listen), or any application connected to the same database) receives it at once.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here sends the notification. |
| **connection** (`connection`) | object | The reference of a **PostgreSQL** connection block. It does not start the block. |
| **message** (`message`) | any | The content of the notification. A text is sent as it is; an object or list as JSON text; a number or yes/no as text; no value, an empty message. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **sent** (`sent`) | pulse | A pulse when the notification was sent. |
| **Exception** (`error`) | object | When the notification does not go: not a PostgreSQL connection, invalid channel, message too long, closed connection... |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Channel** (`channel`) | text | `eventi` | The channel's name: letters, digits, `_` and `$`, starting with a letter or `_`, at most 63 characters. |

## Added ports

This block has no added ports.

## How it works

When a value arrives on **run**, the block takes the **message** and the **Channel** and asks the server to send the notification (`pg_notify`). When the server has answered, it sends **sent**.

- **PostgreSQL only**: with another database it gives the error "SQL · Notifica (NOTIFY) funziona solo con le connessioni PostgreSQL" (Notify works only with PostgreSQL connections).
- **Length**: the message can be at most 8000 bytes long (a little less, for the space needed); beyond that, an error.
- **At once**: the notification is not part of a transaction, even if you link a [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction): it goes when the block sends it.
- **Whoever is not listening does not receive it**: PostgreSQL does not keep notifications for whoever connects later.
- The channel is the same name you write in [SQL · Listen (LISTEN)](db.listen).

## Examples

### 1. Warning another program

```
[SQL · PostgreSQL (connect)] connection ──▶ connection [SQL · Notify (NOTIFY): produzione] sent ──▶ value [Print (console.log)]
[Object literal { }: { "linea": 2, "stato": "ferma" }] object ──▶ message
[Button: Warn] pressed ──▶ run
```

The message goes as the JSON text `{"linea":2,"stato":"ferma"}`: whoever listens to `produzione` with **Messages are JSON** receives it already as an object.

### 2. A notification every minute

```
[SQL · PostgreSQL (connect)] connection ──▶ connection [SQL · Notify (NOTIFY): battito]
[Now (date and time)] ISO ──▶ message
[Interval (setInterval): 60 s] pulse ──▶ run
```

A "heartbeat" with the time, useful to know that a program is alive.

## Errors

The messages are in Italian, as the block sends them. In English:

| Message | When |
|---|---|
| SQL · Notifica (NOTIFY) funziona solo con le connessioni PostgreSQL | The connection is not PostgreSQL's. |
| Canale non valido: «…» (lettere, cifre e _) | The **Channel** has spaces or symbols that are not allowed (invalid channel). |
| Messaggio troppo lungo (PostgreSQL ne accetta al massimo 8000 byte) | The message is over 8000 bytes (message too long). |
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | The **connection** input has no value. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | The connection was closed. |
| Troppe operazioni sul database: al massimo 600 al minuto | You went over the operations per minute. |
| Il database non ha risposto in 30 s | Sending went over the time limit. |

## See also

- [SQL · Listen (LISTEN)](db.listen), to receive the notifications
- [SQL · PostgreSQL (connect)](db.postgres)
- [Database blocks (SQL)](logicstudio-db), [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
