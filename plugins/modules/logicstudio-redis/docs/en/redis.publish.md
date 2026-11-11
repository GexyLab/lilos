# Redis · Publish (PUBLISH)

`redis.publish` · Database · [Redis blocks](logicstudio-redis) · version 1

Sends a **message** on a channel to whoever is subscribed at that moment (with [Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe) or with another program). Messages are not kept: whoever is not subscribed does not receive them.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [Redis · Connection (connect)](redis.connect) block. It does not start the block. |
| **channel** (`channel`) | text | The channel. If it has a non-empty value, it takes the place of the **Channel** of the settings. It does not start the block. |
| **message** (`message`) | any | The message to send. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **received by** (`receivers`) | number | How many subscribers the message reached (0 if nobody is listening). |
| **Exception** (`error`) | object | When the publish fails: missing or closed connection, missing channel, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Channel** (`channel`) | text | empty | The channel, when the **channel** input has no value. At most 10000 characters. |
| **JSON (write with JSON.stringify, read with JSON.parse)** (`json`) | yes / no | no | See "The values" below and on the [Redis blocks](logicstudio-redis) page. |

## How it works

When a value arrives on **run**, the block does `PUBLISH channel message`.

- **The values you write**: without the **JSON** option a text stays a text, numbers and yes/no become text (`5`, `true`), `null` the empty text, an object or a list are written as JSON text. With **JSON** ticked, any value (a text too) is written with `JSON.stringify`.
- The message is not saved anywhere: if there are no subscribers, **received by** is 0 and the message is lost. For messages that must wait use a list ([Redis · List: add (LPUSH · RPUSH)](redis.push)).
- Whoever listens with [Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe) with **JSON** ticked receives the message already converted.

## Examples

### 1. Warn the other programs

**Channel** `allarmi`, **JSON** ticked.

```
[Compare (== != < >): a > b] if true ──▶ run [Redis · Publish (PUBLISH)] received by ──▶ value [Value: listeners]
[Object literal { }: tipo, valore] object ──▶ message
```

When the temperature goes over the threshold, the program publishes `{"tipo": "caldo", "valore": 31.5}` on the channel `allarmi`; whoever is subscribed receives it at once.

### 2. A channel for each room

```
[Template string: "stanza:{a}"] text ──▶ channel [Redis · Publish (PUBLISH)]
[Text field: messaggio] text ──▶ message
```

The **channel** input changes with each message; the **Channel** of the settings is not needed.

## Errors

The messages are in Italian, as the block sends them; the Redis server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [Redis blocks](logicstudio-redis) page. In addition:

| Message | When |
|---|---|
| Manca il canale | (The message is worded like this in the block.) The **Channel** is empty and the **channel** input has no value (missing channel). |
| Canale troppo lungo | The channel is over 10000 characters (channel too long). |
| Redis non ha risposto in 30 s | The command went over the time limit of an operation (Redis did not answer in 30 s). |
| ERR … / altri messaggi del server | The server refuses the command (for example `ERR value is not an integer or out of range`): the message is the server's own, in English. |

## See also

- [Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe), to receive the messages
- [Redis · List: add (LPUSH · RPUSH)](redis.push), for messages that must wait
- [Redis blocks](logicstudio-redis), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
