# Redis · List: range (LRANGE)

`redis.range` · Database · [Redis blocks](logicstudio-redis) · version 1

Reads the values of a list from **start** to **end** (0 is the first, -1 the last) **without taking them**.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [Redis · Connection (connect)](redis.connect) block. It does not start the block. |
| **key** (`key`) | text | The key. If it has a non-empty value, it takes the place of the **Key** of the settings. It does not start the block. |
| **start** (`start`) | number | Hidden. If it has a non-empty value, it takes the place of **Start**. It does not start the block. |
| **end** (`stop`) | number | Hidden. If it has a non-empty value, it takes the place of **End**. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **values** (`values`) | list | The values read, in a list (texts, or converted with **JSON**). Empty if the list is not there or the range is outside. |
| **list length** (`length`) | number | Hidden. How many items the list has in all. |
| **truncated** (`truncated`) | yes/no | Hidden. `true` if the range asked for had more values than the module's limit (10000 by default) and only some came out. |
| **Exception** (`error`) | object | When the read fails: missing or closed connection, missing key, the key is not a list, a value that is not JSON, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Key** (`key`) | text | empty | The key, when the **key** input has no value. At most 10000 characters. |
| **Start** (`start`) | whole number | 0 | The first item: 0 is the first, -1 the last, -2 the one before the last… |
| **End (-1 = the last)** (`stop`) | whole number | -1 | The last item to read, included. -1: up to the last. |
| **JSON (write with JSON.stringify, read with JSON.parse)** (`json`) | yes / no | no | See "The values" below and on the [Redis blocks](logicstudio-redis) page. |

## How it works

When a value arrives on **run**, the block asks for the length (`LLEN`) and then the items of the range (`LRANGE key start end`).

- The ends are *included*: from 0 to 9 are 10 items. Negative numbers count from the end: `-5` is the fifth from the last; `-5` as **Start** and `-1` as **End** give the last 5.
- A list that is not there gives an empty list and length 0, without an error.
- The block reads at most the module's limit of values (10000 by default): if the range is bigger, **truncated** is `true`.
- The list stays as it is: to take its values use [Redis · List: take (LPOP · RPOP · BLPOP)](redis.pop).
- **The values you read**: without **JSON** the text always comes out. With **JSON** the text is read with `JSON.parse`: numbers, yes/no, objects and lists come back as such; if the text is not JSON there is an error ("Il valore … non è JSON").

## Examples

### 1. The last 10 messages

**Key** `chat`, **Start** -10, **End** -1, **JSON** ticked.

```
[Redis · List: range (LRANGE)] values ──▶ rows [Table]
[Button: Refresh] pressed ──▶ run
```

A chat where each message is added with [Redis · List: add (LPUSH · RPUSH)](redis.push) at the end: the [Table](ui.table) shows the last 10 messages, as objects.

### 2. How many items the list has

```
[Redis · List: range (LRANGE): Start 0, End 0] list length ──▶ value [Value]
```

With a range of a single item, the list's length still comes out of the hidden output.

## Errors

The messages are in Italian, as the block sends them; the Redis server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [Redis blocks](logicstudio-redis) page. In addition:

| Message | When |
|---|---|
| Manca la chiave | The **Key** is empty and the **key** input has no value (missing key). |
| Chiave troppo lunga | The key is over 10000 characters (key too long). |
| Inizio non valido: … / Fine non valida: … | **Start** or **End** is not a whole number. |
| La chiave contiene un altro tipo di valore (testo, hash, lista…): usa il blocco giusto per quel tipo | The key exists but is of another type (the server says `WRONGTYPE`): the key holds another type of value, use the right block for that type. |
| Il valore … non è JSON: togli l'opzione JSON per leggerlo come testo | **JSON** is ticked and the text read is not JSON. After "Il valore" comes the key. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | The result is over the maximum size. |
| Redis non ha risposto in 30 s | The command went over the time limit of an operation (Redis did not answer in 30 s). |
| ERR … / altri messaggi del server | The server refuses the command (for example `ERR value is not an integer or out of range`): the message is the server's own, in English. |

## See also

- [Redis · List: add (LPUSH · RPUSH)](redis.push), [Redis · List: take (LPOP · RPOP · BLPOP)](redis.pop)
- [Table](ui.table), to show the values
- [Redis blocks](logicstudio-redis), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
