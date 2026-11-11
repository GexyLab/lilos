# Redis · Exists (EXISTS)

`redis.exists` · Database · [Redis blocks](logicstudio-redis) · version 1

Tells whether a **key** exists. With a list of keys it tells whether they all exist, and how many do.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [Redis · Connection (connect)](redis.connect) block. It does not start the block. |
| **key or list** (`key`) | any | A key (text) or a list of keys. If it has a non-empty value, it takes the place of the **Key** of the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **exists** (`exists`) | yes/no | `true` if the key exists (with a list: if they all exist). |
| **how many** (`count`) | number | Hidden. How many of the keys exist. A key repeated in the list counts every time. |
| **Exception** (`error`) | object | When the check fails: missing or closed connection, missing key, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Key** (`key`) | text | empty | The key, when the **key** input has no value. At most 10000 characters. |

## How it works

When a value arrives on **run**, the block asks Redis `EXISTS key [key …]`.

- It works with keys of any type.
- With a **list**: **exists** is true only if *all* the keys are there; **how many** says how many there are (1 to 10000 keys).
- A key whose expiry has passed no longer exists.

## Examples

### 1. Show whether a user is online

**Key** `online:anna`.

```
[Interval (setInterval): 10 s] pulse ──▶ run [Redis · Exists (EXISTS)] exists ──▶ value [Lamp]
```

Another program writes `online:anna` with a 30-second expiry every 10 seconds: the lamp is on as long as Anna is online.

### 2. Check several keys together

```
[Array literal [ ]: "cfg:a", "cfg:b", "cfg:c"] list ──▶ key or list [Redis · Exists (EXISTS)] how many ──▶ value [Value]
```

**how many** says for example `2` if one is missing; **exists** would be `false`.

## Errors

The messages are in Italian, as the block sends them; the Redis server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [Redis blocks](logicstudio-redis) page. In addition:

| Message | When |
|---|---|
| Manca la chiave | The **Key** is empty and the **key** input has no value (missing key). |
| Chiave troppo lunga | The key is over 10000 characters (key too long). |
| Servono da 1 a 10000 chiavi | The list is empty or has more than 10000 keys. |
| Redis non ha risposto in 30 s | The command went over the time limit of an operation (Redis did not answer in 30 s). |
| ERR … / altri messaggi del server | The server refuses the command (for example `ERR value is not an integer or out of range`): the message is the server's own, in English. |

## See also

- [Redis · Get (GET)](redis.get), [Redis · Delete (DEL)](redis.del)
- [Redis · Expiry (EXPIRE · TTL)](redis.expire), for the seconds left
- [Redis blocks](logicstudio-redis), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
