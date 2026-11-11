# Redis · Delete (DEL)

`redis.del` · Database · [Redis blocks](logicstudio-redis) · version 1

Deletes a **key**, or each one of the keys of a list, of any type.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [Redis · Connection (connect)](redis.connect) block. It does not start the block. |
| **key or list** (`key`) | any | A key (text) or a list of keys. If it has a non-empty value, it takes the place of the **Key** of the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **deleted** (`deleted`) | number | How many keys were deleted (those that were not there do not count). |
| **Exception** (`error`) | object | When the delete fails: missing or closed connection, missing key, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Key** (`key`) | text | empty | The key, when the **key** input has no value. At most 10000 characters. |

## How it works

When a value arrives on **run**, the block asks Redis `DEL key [key …]`.

- With a **text** it deletes that key; with a **list** it deletes all the keys of the list (1 to 10000).
- It deletes the key whatever its type (text, hash, list…).
- It does not accept patterns such as `utente:*`: for those find the keys first with [Redis · Find keys (SCAN)](redis.scan) and send the list to this block.
- A key that is not there is not an error: it simply does not count in **deleted**.

## Examples

### 1. Delete a session

**Key** `sessione:abc123`.

```
[Button: Log out] pressed ──▶ run [Redis · Delete (DEL)] deleted ──▶ value [Value]
```

### 2. Delete all the keys with a prefix

```
[Redis · Find keys (SCAN): cache:*] keys ──▶ key or list [Redis · Delete (DEL)] deleted ──▶ value [Print (console.log)]
[Button: Empty the cache] pressed ──▶ run (of Find keys)
```

[Redis · Find keys (SCAN)](redis.scan) finds the keys that begin with `cache:`; the list goes to **key or list**. The Delete block starts only with **run**: link its **run** too to a pulse that arrives after the search (for example with [Delay (setTimeout)](core.delay)). An empty list gives the error "Servono da 1 a 10000 chiavi" (1 to 10000 keys are needed).

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

- [Redis · Find keys (SCAN)](redis.scan), to find the keys to delete
- [Redis · Exists (EXISTS)](redis.exists), [Redis · Expiry (EXPIRE · TTL)](redis.expire), to make a key disappear by itself
- [Redis blocks](logicstudio-redis), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
