# Redis · Set (SET)

`redis.set` · Database · [Redis blocks](logicstudio-redis) · version 1

Writes the value of a **key**, with an expiry if you want and, if you want, only if the key is not there (NX) or only if it is already there (XX).

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [Redis · Connection (connect)](redis.connect) block. It does not start the block. |
| **key** (`key`) | text | The key. If it has a non-empty value, it takes the place of the **Key** of the settings. It does not start the block. |
| **value** (`value`) | any | The value to write. It does not start the block. |
| **expires in (s)** (`seconds`) | number | Hidden. If it has a non-empty value, it takes the place of **Expires in seconds**. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **written** (`ok`) | yes/no | `true` if the value was written; `false` if **When** prevented it (NX with a key that is there, XX with a key that is missing). |
| **Exception** (`error`) | object | When the write fails: missing or closed connection, missing key, invalid expiry, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Key** (`key`) | text | empty | The key, when the **key** input has no value. At most 10000 characters. |
| **Expires in seconds (EX, 0 = never)** (`seconds`) | whole number from 0 | 0 | After how many seconds the key disappears by itself. 0: never. At most 100 years. |
| **When** (`mode`) | Always, Only if the key does not exist (NX), Only if the key exists (XX) | Always | With NX the block does not overwrite; with XX it does not create. |
| **JSON (write with JSON.stringify, read with JSON.parse)** (`json`) | yes / no | no | See "The values" below and on the [Redis blocks](logicstudio-redis) page. |

## How it works

When a value arrives on **run**, the block writes the key with `SET key value [EX seconds] [NX | XX]`.

- **The values you write**: without the **JSON** option a text stays a text, numbers and yes/no become text (`5`, `true`), `null` the empty text, an object or a list are written as JSON text. With **JSON** ticked, any value (a text too) is written with `JSON.stringify`.
- A binary value `{ "$bytes": "base64" }` from the other blocks is written as binary data.
- **Expiry**: with a number of seconds greater than 0 the key disappears by itself. Writing the key again **removes** the expiry it had, unless you set it again.
- **When**: "Only if the key does not exist" (NX) is the way to take a "lock" or to write a value only once: **written** tells whether you made it.
- The value `null` or an input without a value writes the empty text.

## Examples

### 1. Save the last measurement for 10 minutes

**Key** `serra:temperatura`, **Expires in seconds** 600.

```
[Number field: temperatura] value ──▶ value [Redis · Set (SET)] written ──▶ value [Print (console.log)]
[Interval (setInterval): 60 s] pulse ─────▶ run
```

Every minute the program writes the number as text (`22.5`). If the program stops writing, after 10 minutes the key disappears and another program reading it finds `null`.

### 2. A lock so a job is not done twice

**Key** `lavoro:fatture`, **Expires in seconds** 300, **When** "Only if the key does not exist (NX)".

```
[Button: Start] pressed ──▶ run [Redis · Set (SET)] written ──▶ condition [If · Else] then ──▶ ... (do the job)
```

If another program has already written the lock, **written** is `false` and the job does not start; after 5 minutes the lock disappears by itself.

## Errors

The messages are in Italian, as the block sends them; the Redis server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [Redis blocks](logicstudio-redis) page. In addition:

| Message | When |
|---|---|
| Manca la chiave | The **Key** is empty and the **key** input has no value (missing key). |
| Chiave troppo lunga | The key is over 10000 characters (key too long). |
| Scadenza non valida: … | **Expires in seconds** is not a whole number between 0 and 100 years. |
| Redis non ha risposto in 30 s | The command went over the time limit of an operation (Redis did not answer in 30 s). |
| ERR … / altri messaggi del server | The server refuses the command (for example `ERR value is not an integer or out of range`): the message is the server's own, in English. |

## See also

- [Redis · Get (GET)](redis.get), to reread the value
- [Redis · Expiry (EXPIRE · TTL)](redis.expire), to change the expiry of a key that is already there
- [Redis · Increment (INCRBY)](redis.incr), for counters
- [Redis blocks](logicstudio-redis), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
