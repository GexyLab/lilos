# Redis · Expiry (EXPIRE · TTL)

`redis.expire` · Database · [Redis blocks](logicstudio-redis) · version 1

Reads, sets or removes the **expiry** of a key. **Seconds left** is -1 if the key has no expiry and -2 if the key does not exist.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [Redis · Connection (connect)](redis.connect) block. It does not start the block. |
| **key** (`key`) | text | The key. If it has a non-empty value, it takes the place of the **Key** of the settings. It does not start the block. |
| **seconds** (`seconds`) | number | If it has a non-empty value, it takes the place of the **Seconds** of the settings (for "Set it"). It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **seconds left** (`ttl`) | number | How many seconds are left before the expiry, after the operation. -1: no expiry. -2: the key is not there. |
| **done** (`ok`) | yes/no | Hidden. With "Set it" and "Remove it": `true` if the server did it (`false` if the key is not there, or had no expiry to remove). With "Read it" it is always `true`. |
| **Exception** (`error`) | object | When the operation fails: missing or closed connection, missing key, invalid seconds, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Key** (`key`) | text | empty | The key, when the **key** input has no value. At most 10000 characters. |
| **Operation** (`op`) | Read it (TTL), Set it (EXPIRE), Remove it (PERSIST) | Read it (TTL) | What to do with the expiry. |
| **Seconds (for EXPIRE)** (`seconds`) | whole number from 1 | 60 | In how many seconds the key disappears, for "Set it". At most 100 years. |

## How it works

When a value arrives on **run**, the block does the chosen operation and then reads `TTL key`, which it sends on **seconds left**.

- **Read it (TTL)**: the read only.
- **Set it (EXPIRE)**: the key will disappear in the **Seconds**; **done** is `false` if the key is not there.
- **Remove it (PERSIST)**: the key no longer expires; **done** is `false` if it had no expiry (or is not there).
- It works with keys of any type (hashes and lists too).
- An expiry in whole seconds: milliseconds are not read.

## Examples

### 1. A session that lasts 30 minutes from the last activity

**Key** `sessione:abc123`, **Operation** "Set it (EXPIRE)", **Seconds** 1800.

```
[Button: I am active] pressed ──▶ run [Redis · Expiry (EXPIRE · TTL)] seconds left ──▶ value [Value]
```

Every activity puts the expiry back to 30 minutes.

### 2. How long is left

**Key** `lavoro:fatture`, **Operation** "Read it (TTL)".

```
[Interval (setInterval): 5 s] pulse ──▶ run [Redis · Expiry (EXPIRE · TTL)] seconds left ──▶ value [Value: seconds to expiry]
```

The value goes down by 5 every 5 seconds; `-2` when the key has disappeared.

## Errors

The messages are in Italian, as the block sends them; the Redis server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [Redis blocks](logicstudio-redis) page. In addition:

| Message | When |
|---|---|
| Manca la chiave | The **Key** is empty and the **key** input has no value (missing key). |
| Chiave troppo lunga | The key is over 10000 characters (key too long). |
| Scadenza non valida: … | **Seconds** is not a whole number between 1 and 100 years (invalid expiry). |
| Mancano i secondi della scadenza | "Set it" without seconds (the expiry seconds are missing). |
| Redis non ha risposto in 30 s | The command went over the time limit of an operation (Redis did not answer in 30 s). |
| ERR … / altri messaggi del server | The server refuses the command (for example `ERR value is not an integer or out of range`): the message is the server's own, in English. |

## See also

- [Redis · Set (SET)](redis.set), which can give the expiry while writing
- [Redis · Exists (EXISTS)](redis.exists), [Redis · Delete (DEL)](redis.del)
- [Redis blocks](logicstudio-redis), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
