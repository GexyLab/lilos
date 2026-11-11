# Redis · List: add (LPUSH · RPUSH)

`redis.push` · Database · [Redis blocks](logicstudio-redis) · version 1

Adds a value at the **start** or at the **end** of a Redis list, and sends the new length. It is the simplest work queue: one program adds, another takes with [Redis · List: take (LPOP · RPOP · BLPOP)](redis.pop).

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [Redis · Connection (connect)](redis.connect) block. It does not start the block. |
| **key** (`key`) | text | The key. If it has a non-empty value, it takes the place of the **Key** of the settings. It does not start the block. |
| **value** (`value`) | any | The value to add. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **length** (`length`) | number | How many items the list has after the add. |
| **Exception** (`error`) | object | When the add fails: missing or closed connection, missing key, the key is not a list, too many values, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Key** (`key`) | text | empty | The key, when the **key** input has no value. At most 10000 characters. |
| **Side** (`side`) | Start (left: L…), End (right: R…) | End (right: R…) | Where to add: `LPUSH` at the start, `RPUSH` at the end. |
| **A list adds each of its items** (`each`) | yes / no | no | If ticked and **value** is a list, each item becomes an item of the Redis list. If not, the list is a single item (written as JSON text). |
| **JSON (write with JSON.stringify, read with JSON.parse)** (`json`) | yes / no | no | See "The values" below and on the [Redis blocks](logicstudio-redis) page. |

## How it works

When a value arrives on **run**, the block adds with `RPUSH key value` (or `LPUSH`, with **Side** "Start"). If the key is not there, the list is born.

- **Queue**: add at the **end** (right) and take from the **start** (left) with [Redis · List: take (LPOP · RPOP · BLPOP)](redis.pop): the first to arrive is the first to leave. Add at the **start** and take from the start to get a **stack** (the last to arrive leaves first).
- With **A list adds each of its items** you can add several values at once (at most 10000); with `LPUSH` the items end up in the list in reverse order, as in Redis.
- An empty list with that option gives an error.
- **The values you write**: without the **JSON** option a text stays a text, numbers and yes/no become text (`5`, `true`), `null` the empty text, an object or a list are written as JSON text. With **JSON** ticked, any value (a text too) is written with `JSON.stringify`.

## Examples

### 1. Queue a job

**Key** `coda:email`, **Side** "End", **JSON** ticked.

```
[Object literal { }: a, oggetto] object ──▶ value [Redis · List: add (LPUSH · RPUSH)] length ──▶ value [Value: queued]
[Button: Send] pressed ──▶ run
```

Every press adds `{"a": "anna@esempio.it", "oggetto": "Ciao"}` to the queue; **length** says how many jobs are waiting.

### 2. Add a whole list

**Key** `eventi`, **A list adds each of its items** ticked.

```
[Array literal [ ]: "a", "b", "c"] list ──▶ value [Redis · List: add (LPUSH · RPUSH)]
```

The Redis list receives three items: `a`, `b`, `c`.

## Errors

The messages are in Italian, as the block sends them; the Redis server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [Redis blocks](logicstudio-redis) page. In addition:

| Message | When |
|---|---|
| Manca la chiave | The **Key** is empty and the **key** input has no value (missing key). |
| Chiave troppo lunga | The key is over 10000 characters (key too long). |
| La lista dei valori è vuota | The option **A list adds each of its items** is ticked and the list is empty (the list of values is empty). |
| Troppi valori in una volta (al massimo 10000) | The list has more items than the module's limit. |
| La chiave contiene un altro tipo di valore (testo, hash, lista…): usa il blocco giusto per quel tipo | The key exists but is of another type (the server says `WRONGTYPE`): the key holds another type of value, use the right block for that type. |
| Redis non ha risposto in 30 s | The command went over the time limit of an operation (Redis did not answer in 30 s). |
| ERR … / altri messaggi del server | The server refuses the command (for example `ERR value is not an integer or out of range`): the message is the server's own, in English. |

## See also

- [Redis · List: take (LPOP · RPOP · BLPOP)](redis.pop), to take the values from the queue
- [Redis · List: range (LRANGE)](redis.range), to look at the list without taking from it
- [Redis blocks](logicstudio-redis), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
