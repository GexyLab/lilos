# Redis · Get (GET)

`redis.get` · Database · [Redis blocks](logicstudio-redis) · version 1

Reads the value of a text **key**. If the key is not there, the value is empty (`null`) and **exists** is false.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [Redis · Connection (connect)](redis.connect) block. It does not start the block. |
| **key** (`key`) | text | The key. If it has a non-empty value, it takes the place of the **Key** of the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The value of the key: a text, or (with **JSON**) the already converted value. `null` if the key is not there. |
| **exists** (`exists`) | yes/no | Hidden. `true` if the key is there (even with the empty text), `false` if it is missing. |
| **Exception** (`error`) | object | When the read fails: missing or closed connection, missing key, the key is of another type, a value that is not JSON, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Key** (`key`) | text | empty | The key, when the **key** input has no value. At most 10000 characters. |
| **JSON (write with JSON.stringify, read with JSON.parse)** (`json`) | yes / no | no | See "The values" below and on the [Redis blocks](logicstudio-redis) page. |

## How it works

When a value arrives on **run**, the block asks Redis `GET key`.

- **The values you read**: without **JSON** the text always comes out. With **JSON** the text is read with `JSON.parse`: numbers, yes/no, objects and lists come back as such; if the text is not JSON there is an error ("Il valore … non è JSON").
- **A missing key** is not an error: **value** is `null` (even with **JSON**) and **exists** `false`. To tell "missing" from "empty" use **exists**, or [Redis · Exists (EXISTS)](redis.exists).
- The block reads only **text** keys (string). A key that is a hash, a list… gives "La chiave contiene un altro tipo di valore": for those there are [Redis · Hash: get (HGET · HGETALL)](redis.hget) and [Redis · List: range (LRANGE)](redis.range).
- The text that comes out cannot be over the maximum size of a result (4096 KB by default).

## Examples

### 1. Show a counter

**Key** `visite`.

```
[Interval (setInterval): 5 s] pulse ──▶ run [Redis · Get (GET)] value ──▶ value [Value: visits]
```

Every 5 seconds the [Value](ui.value) shows the text of `visite` (for example `1204`). If you want a number, use [Cast to number (Number())](core.toNumber) or the **JSON** option: a `1204` written with **JSON** comes back as a number.

### 2. A configuration in JSON

**Key** `config:serra`, **JSON** ticked. Redis holds the text `{"soglia": 24.5, "attivo": true}`.

```
[Redis · Get (GET)] value ──▶ object [Get property: soglia] value ──▶ b [Compare (== != < >): a > b]
```

With **JSON** the output is already an object: [Get property](core.get) reads `soglia`.

## Errors

The messages are in Italian, as the block sends them; the Redis server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [Redis blocks](logicstudio-redis) page. In addition:

| Message | When |
|---|---|
| Manca la chiave | The **Key** is empty and the **key** input has no value (missing key). |
| Chiave troppo lunga | The key is over 10000 characters (key too long). |
| La chiave contiene un altro tipo di valore (testo, hash, lista…): usa il blocco giusto per quel tipo | The key exists but is of another type (the server says `WRONGTYPE`): the key holds another type of value, use the right block for that type. |
| Il valore … non è JSON: togli l'opzione JSON per leggerlo come testo | **JSON** is ticked and the text read is not JSON. After "Il valore" comes the key. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | The result is over the maximum size. |
| Redis non ha risposto in 30 s | The command went over the time limit of an operation (Redis did not answer in 30 s). |
| ERR … / altri messaggi del server | The server refuses the command (for example `ERR value is not an integer or out of range`): the message is the server's own, in English. |

## See also

- [Redis · Set (SET)](redis.set), to write the value
- [Redis · Exists (EXISTS)](redis.exists), [Redis · Expiry (EXPIRE · TTL)](redis.expire)
- [Get property](core.get), to read a field of a JSON value
- [Redis blocks](logicstudio-redis), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
