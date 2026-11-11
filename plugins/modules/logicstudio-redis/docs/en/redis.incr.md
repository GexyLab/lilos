# Redis · Increment (INCRBY)

`redis.incr` · Database · [Redis blocks](logicstudio-redis) · version 1

Adds the **step** to the number of a key (a missing key counts as 0) and sends the new value. The change is atomic: two programs incrementing together do not step on each other.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [Redis · Connection (connect)](redis.connect) block. It does not start the block. |
| **key** (`key`) | text | The key. If it has a non-empty value, it takes the place of the **Key** of the settings. It does not start the block. |
| **step** (`step`) | number | If it has a non-empty value, it takes the place of the **Step** of the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The number of the key after the change. |
| **Exception** (`error`) | object | When the increment fails: missing or closed connection, missing key, invalid step, the key does not hold a number, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Key** (`key`) | text | empty | The key, when the **key** input has no value. At most 10000 characters. |
| **Step (negative to decrease)** (`step`) | number | 1 | How much to add. Negative to decrease; with decimals (`0.5`) it uses `INCRBYFLOAT`. |

## How it works

When a value arrives on **run**, the block asks Redis `INCRBY key step`.

- A **whole** step uses `INCRBY`; a step **with decimals** uses `INCRBYFLOAT` (and the value has decimals). If the key already holds a number with decimals and the step is whole, the block switches to `INCRBYFLOAT` by itself.
- A key that is not there starts from 0: after the first increment it equals the step.
- The key must hold a number written as text (`"12"`): if it holds something else, the server answers `ERR value is not an integer or out of range` (the server's message, in English).
- The step `1` and `-1` work as `INCR` and `DECR`.
- A counter with an expiry: write the counter and then give it the expiry with [Redis · Expiry (EXPIRE · TTL)](redis.expire) (INCRBY does not remove an expiry that is there).

## Examples

### 1. Count the presses of a button

**Key** `pulsante:premuto`.

```
[Button: Press] pressed ──▶ run [Redis · Increment (INCRBY)] value ──▶ value [Value: total]
```

Every press, even from different programs using the same key, adds 1 and the [Value](ui.value) shows the total.

### 2. Add up a measurement with decimals

**Key** `energia:kwh`, **Step** 0.25.

```
[Interval (setInterval): 900 s] pulse ──▶ run [Redis · Increment (INCRBY)] value ──▶ value [Print (console.log)]
```

Every 15 minutes the block adds 0.25 with `INCRBYFLOAT`.

## Errors

The messages are in Italian, as the block sends them; the Redis server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [Redis blocks](logicstudio-redis) page. In addition:

| Message | When |
|---|---|
| Manca la chiave | The **Key** is empty and the **key** input has no value (missing key). |
| Chiave troppo lunga | The key is over 10000 characters (key too long). |
| Passo non valido: … | The step is not a number (invalid step). |
| La chiave contiene un altro tipo di valore (testo, hash, lista…): usa il blocco giusto per quel tipo | The key exists but is of another type (the server says `WRONGTYPE`): the key holds another type of value, use the right block for that type. |
| ERR value is not an integer or out of range | The key holds a text that is not a number (the server's message, in English). |
| Redis non ha risposto in 30 s | The command went over the time limit of an operation (Redis did not answer in 30 s). |

## See also

- [Redis · Get (GET)](redis.get), to reread the number
- [Redis · Expiry (EXPIRE · TTL)](redis.expire), to give a counter an expiry
- [Counter (++ −−)](core.counter), the counter inside the program
- [Redis blocks](logicstudio-redis), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
