# Redis · Find keys (SCAN)

`redis.scan` · Database · [Redis blocks](logicstudio-redis) · version 1

Lists the **keys** that match a pattern (such as `utente:*`), even of a single type, up to the module's limit. It uses `SCAN` in pieces and **never** `KEYS`, which would block the server.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [Redis · Connection (connect)](redis.connect) block. It does not start the block. |
| **pattern** (`match`) | text | The pattern. If it has a non-empty value, it takes the place of the **Pattern** of the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **keys** (`keys`) | list | The keys found, as a list of texts, without repeats and in no particular order. |
| **truncated** (`truncated`) | yes/no | Hidden. `true` if there are more keys beyond the maximum and they did not come out. |
| **Exception** (`error`) | object | When the search fails: missing or closed connection, invalid pattern, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Pattern (MATCH, * = any text)** (`match`) | text | `*` | The key pattern: `*` any text, `?` one character, `[ab]` one of the two, `\*` a real asterisk. For example `utente:*`, `cache:2026-*`. |
| **Type** (`type`) | Any, Text (string), Hash, List, Set, Sorted set (zset), Stream | Any | Looks only for the keys of that type (needs Redis 6 or later). |
| **At most (0 = the module's limit)** (`max`) | whole number from 0 | 0 | How many keys to look for at most. 0: the module's limit (10000 by default). It cannot go over that limit. |

## How it works

When a value arrives on **run**, the block goes through the keys with `SCAN cursor MATCH pattern COUNT 1000 [TYPE type]`, one piece at a time, until it has found enough or has finished.

- **Without blocking the server**: `SCAN` does not stop Redis as `KEYS` does, even with millions of keys. For the same reason there is no guarantee about the order, and keys created or deleted while it searches may or may not be there.
- **The limit**: at most the keys of **At most** (not more than the module's limit, 10000 by default). If the database has other keys that match, **truncated** is `true`.
- A search on a huge database can take long: it has the time limit of an operation (30 seconds by default), then it stops with **truncated** `true` or with a time error.
- The pattern `*` (the default) finds everything: use it only on small databases or with **At most**.
- The block gives only the names of the keys: for the values use [Redis · Get (GET)](redis.get) for each key.

## Examples

### 1. The active sessions

**Pattern** `sessione:*`.

```
[Redis · Find keys (SCAN)] keys ──▶ rows [Table]
[Button: Search] pressed ──▶ run
```

The [Table](ui.table) shows the names of the `sessione:…` keys.

### 2. Only the hashes of a type

**Pattern** `utente:*`, **Type** "Hash", **At most** 100.

```
[Redis · Find keys (SCAN)] keys ──▶ value [Print (console.log)]
                           truncated ──▶ value [Value: there are more]
```

The first 100 `utente:…` keys that are hashes; **truncated** says whether there are more.

## Errors

The messages are in Italian, as the block sends them; the Redis server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [Redis blocks](logicstudio-redis) page. In addition:

| Message | When |
|---|---|
| Massimo non valido: … | **At most** is not a whole number between 1 and 1000000 (or 0): invalid maximum. |
| Modello troppo lungo | The pattern is over 10000 characters (pattern too long). |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | The result is over the maximum size. |
| Redis non ha risposto in 30 s | The command went over the time limit of an operation (Redis did not answer in 30 s). |
| ERR … / altri messaggi del server | The server refuses the command (for example `ERR value is not an integer or out of range`): the message is the server's own, in English. |

## See also

- [Redis · Get (GET)](redis.get), [Redis · Hash: get (HGET · HGETALL)](redis.hget), for the values of the keys found
- [Redis · Delete (DEL)](redis.del), to delete the keys found
- [Redis · Command (call)](redis.command), for the other commands (`KEYS` is refused)
- [Redis blocks](logicstudio-redis), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
