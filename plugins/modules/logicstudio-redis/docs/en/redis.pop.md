# Redis · List: take (LPOP · RPOP · BLPOP)

`redis.pop` · Database · [Redis blocks](logicstudio-redis) · version 1

Takes a value from the **start** or the **end** of a list and sends it. It can also **wait** for one to arrive, for at most 25 seconds.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [Redis · Connection (connect)](redis.connect) block. It does not start the block. |
| **key** (`key`) | text | The key. If it has a non-empty value, it takes the place of the **Key** of the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The value taken (text, or converted with **JSON**). `null` if the list is empty. With **How many** greater than 0, the first of the values taken. |
| **values** (`values`) | list | Hidden. The values taken, in a list (empty if there was nothing). |
| **empty** (`empty`) | yes/no | Hidden. `true` if nothing was taken (empty list or the wait ran out). |
| **Exception** (`error`) | object | When the operation fails: missing or closed connection, missing key, the key is not a list, a value that is not JSON, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Key** (`key`) | text | empty | The key, when the **key** input has no value. At most 10000 characters. |
| **Side** (`side`) | Start (left: L…), End (right: R…) | Start (left: L…) | Where to take from: `LPOP` from the start, `RPOP` from the end. |
| **How many (0 = one)** (`count`) | whole number from 0 | 0 | How many values to take at once. 0: one. It needs Redis 6.2 or later. It does not apply with the wait. |
| **Wait for a value when the list is empty (BLPOP · BRPOP)** (`block`) | yes / no | no | If ticked, with an empty list the block waits for someone to add a value. |
| **Wait at most (seconds, up to 25)** (`timeout`) | 0.1 to 25 | 5 | How long to wait, with the wait on. When the time is over, **empty** is true. |
| **JSON (write with JSON.stringify, read with JSON.parse)** (`json`) | yes / no | no | See "The values" below and on the [Redis blocks](logicstudio-redis) page. |

## How it works

When a value arrives on **run**, the block takes from the list with `LPOP key` (or `RPOP`, with **Side** "End").

- **Without the wait**: if the list is empty `null` comes out at once and **empty** `true`. With **How many** (for example 10) it takes up to 10 values at once (not more than the maximum values of a result).
- **With the wait** (`BLPOP` / `BRPOP`): if the list is empty the block waits for the chosen time (at most 25 seconds) for a value to arrive, and takes it as soon as it arrives. For the wait the kernel opens a **connection of its own**, which counts in the user's open connections and closes at the end; so the other operations do not wait. With the wait only one value is taken.
- **One wait at a time**: the block, like every block, handles values one at a time; another **run** during the wait waits for its turn. For a worker that always waits, link **empty** (when the wait runs out) to a [Delay (setTimeout)](core.delay) and then back to **run**, or use [Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe) with [Redis · Publish (PUBLISH)](redis.publish).
- The block's time limit (30 seconds by default) counts with the wait too: keep it below.
- **The values you read**: without **JSON** the text always comes out. With **JSON** the text is read with `JSON.parse`: numbers, yes/no, objects and lists come back as such; if the text is not JSON there is an error ("Il valore … non è JSON").

## Examples

### 1. Take the next job

**Key** `coda:email`, **Side** "Start", **JSON** ticked.

```
[Interval (setInterval): 2 s] pulse ──▶ run [Redis · List: take (LPOP · RPOP · BLPOP)] value ──▶ value [Print (console.log)]
```

Every 2 seconds the program takes the next job (if there is one) from the queue another program adds to with [Redis · List: add (LPUSH · RPUSH)](redis.push).

### 2. Wait for the next job

**Key** `coda:email`, **Wait for a value** ticked, **Wait at most** 20 seconds.

```
[On start (main)] pulse ──▶ run [Redis · List: take (LPOP · RPOP · BLPOP)] value ──▶ value [Print (console.log)]
                                   empty ──▶ run  (the wait ran out: starts again)
```

The block stays still for up to 20 seconds until a job arrives; if the wait runs out, **empty** starts it again (with the hidden outputs shown).

## Errors

The messages are in Italian, as the block sends them; the Redis server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [Redis blocks](logicstudio-redis) page. In addition:

| Message | When |
|---|---|
| Manca la chiave | The **Key** is empty and the **key** input has no value (missing key). |
| Chiave troppo lunga | The key is over 10000 characters (key too long). |
| Quanti non valido: … | **How many** is not a whole number between 1 and the module's limit. |
| Attesa non valida | **Wait at most** is not a number (invalid wait). |
| La chiave contiene un altro tipo di valore (testo, hash, lista…): usa il blocco giusto per quel tipo | The key exists but is of another type (the server says `WRONGTYPE`): the key holds another type of value, use the right block for that type. |
| Il valore … non è JSON: togli l'opzione JSON per leggerlo come testo | **JSON** is ticked and the text read is not JSON. After "Il valore" comes the key. |
| Redis non ha risposto in 30 s | The command went over the time limit of an operation (Redis did not answer in 30 s). |
| ERR … / altri messaggi del server | The server refuses the command (for example `ERR value is not an integer or out of range`): the message is the server's own, in English. |
| Troppe connessioni aperte: al massimo 10 per utente | The wait needs one more connection and you already have the maximum. |

## See also

- [Redis · List: add (LPUSH · RPUSH)](redis.push), to fill the list
- [Redis · List: range (LRANGE)](redis.range), to look without taking
- [Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe), to receive the messages as they arrive
- [Redis blocks](logicstudio-redis), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
