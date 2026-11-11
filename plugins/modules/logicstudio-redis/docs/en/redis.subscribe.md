# Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)

`redis.subscribe` · Database · [Redis blocks](logicstudio-redis) · version 1

Sends every **message** published on one or more channels (or on patterns such as `notizie.*`) as it arrives, with the channel's name. The block keeps listening as long as the program runs, with a connection of its own.

## Inputs

| Port | Type | Description |
|---|---|---|
| **listen** (`listen`) | pulse | Any value arriving here starts listening (if the block was already listening, it starts over). |
| **stop** (`stop`) | pulse | Hidden. Stops listening. |
| **connection** (`connection`) | object | The reference of a [Redis · Connection (connect)](redis.connect) block. **It starts the block**: with **Listen as soon as the connection arrives** ticked, when the connection arrives it starts listening. |
| **channels** (`channels`) | any | Hidden. The channels: a text with channels separated by commas, or a list of texts. If it has a non-empty value, it takes the place of the **Channels** of the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **message** (`message`) | any | The message: a text, or (with **JSON**) the converted value (if the message is not JSON it stays a text). |
| **channel** (`channel`) | text | The channel it was published on. |
| **pattern** (`pattern`) | text | Hidden. With patterns, the pattern that matched (for example `notizie.*`). Without patterns nothing comes out. |
| **listening** (`listening`) | yes/no | Hidden. `true` when the block has started listening, `false` when it stops (with **stop**, because of an error or because the connection closed). |
| **lost** (`dropped`) | number | Hidden. How many messages were lost because the program did not read them fast enough. |
| **Exception** (`error`) | object | When listening does not start or is interrupted: missing or closed connection, no channel, too many channels or subscriptions, the subscription's connection dropped… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Channels (separated by commas)** (`channels`) | text | empty | The channels to listen to, for example `allarmi, avvisi`. Up to 32. With patterns: `stanza:*, notizie.*`. |
| **Patterns, such as news.* (PSUBSCRIBE)** (`pattern`) | yes / no | no | If ticked, the channels are patterns: `*` stands for any text, `?` for one character, `[ab]` for one of the two. |
| **JSON (write with JSON.stringify, read with JSON.parse)** (`json`) | yes / no | no | See "The values" below and on the [Redis blocks](logicstudio-redis) page. |
| **Listen as soon as the connection arrives** (`auto`) | yes / no | yes | If ticked, when the connection arrives the block starts listening. If not, only with **listen**. |

## How it works

- **It starts** with **listen**, or (with **Listen as soon as the connection arrives**) when the **connection** arrives: the block asks the kernel to subscribe (`SUBSCRIBE`, or `PSUBSCRIBE` with patterns) and sends `listening = true`.
- **Each message** comes out with the outputs **channel**, **pattern** (only with patterns) and **message**, in that order.
- **A connection of its own**: the subscription uses one more connection, with the same settings (user, password, TLS), which counts in the user's open connections. Each connection can have at most **10** subscriptions; the channels of a subscription are at most 32.
- **The kernel keeps the listening** and the block reads it now and then: if there is nothing at that moment, it waits up to 20 seconds. When the program stops, the subscription closes.
- **Lost messages**: the kernel keeps at most 1000 messages waiting (and at most 4096 KB). If the program does not read them fast enough, the oldest are lost and the **lost** output says how many.
- **If the subscription's connection drops**, **listening** becomes `false` and **Exception** gets "La connessione dell'iscrizione si è chiusa" (the subscription's connection closed): **listen** is needed again. If the main connection closes (with **close** or because the program stops), the listening ends without an error.
- Redis does not keep messages: only those published while you are listening arrive.
- With **JSON** the message is read with `JSON.parse`; if it is not JSON it is **not** an error, it stays a text.

## Examples

### 1. Receive the alarms

**Channels** `allarmi`, **JSON** ticked.

```
[Redis · Connection (connect)] connection ──▶ connection [Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)] message ──▶ value [Print (console.log)]
                                                                                    channel ──▶ value [Value: channel]
```

As soon as the connection is ready, the block starts listening; every message published on the channel `allarmi` comes out as an object.

### 2. All the rooms with a pattern

**Channels** `stanza:*`, **Patterns** ticked.

```
[Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)] message ──▶ value [Print (console.log)]
                                             pattern ──▶ value [Value]
```

A message on `stanza:cucina` and one on `stanza:bagno` both arrive, with a different **channel** and **pattern** `stanza:*`.

### 3. Listen and stop on command

Untick **Listen as soon as the connection arrives**.

```
[Button: Listen] pressed ──▶ listen [Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)] message ──▶ value [Print (console.log)]
[Button: Stop]   pressed ──▶ stop
```

## Errors

The messages are in Italian, as the block sends them; the Redis server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [Redis blocks](logicstudio-redis) page. In addition:

| Message | When |
|---|---|
| Manca il canale: scrivi uno o più canali (per i modelli, per esempio notizie.*) | There is no channel. |
| Troppi canali (al massimo 32) | More than 32 channels. |
| Troppe iscrizioni su questa connessione (al massimo 10) | You already have 10 subscriptions on this connection. |
| Troppe connessioni aperte: al massimo 10 per utente | The subscription needs one more connection and you already have the maximum. |
| La connessione dell'iscrizione si è chiusa | The subscription's connection dropped while listening. |
| Redis non ha risposto in 30 s | The server did not confirm the subscription within the time limit of an operation. |
| ERR … / altri messaggi del server | The server refuses the command (for example `ERR value is not an integer or out of range`): the message is the server's own, in English. |

## See also

- [Redis · Publish (PUBLISH)](redis.publish), to send the messages
- [Redis · List: take (LPOP · RPOP · BLPOP)](redis.pop), for queues that must keep the jobs
- [Redis · Connection (connect)](redis.connect)
- [Redis blocks](logicstudio-redis), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
