# Redis · Command (call)

`redis.command` · Database · [Redis blocks](logicstudio-redis) · version 1

Runs **any Redis command** written as a list, for example `["ZADD", "classifica", 10, "anna"]`. For the commands that have no block: sets, sorted sets, streams, HyperLogLog… The administration commands are refused.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [Redis · Connection (connect)](redis.connect) block. It does not start the block. |
| **command** (`command`) | list | The command: a list `["NAME", argument, …]` (also a text with the JSON list, or with the words). If it has a non-empty value, it takes the place of the **Command** of the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | any | The server's reply, as a Logic Studio value: a text, a number, `null`, a list (even of lists), `OK` as a text… |
| **Exception** (`error`) | object | When the command does not work: missing or closed connection, a command that is not allowed or invalid, the block is switched off, a server error, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Command (JSON list, or words: ZADD ranking 10 anna)** (`command`) | text | empty | The command, when the **command** input has no value: a JSON list (`["ZADD", "classifica", 10, "anna"]`) or words separated by spaces (`ZADD classifica 10 anna`; for an argument with spaces, in quotes `"…"` or `'…'`). |

## How it works

When a value arrives on **run**, the block sends the command to the server as it is and gives the reply on **result**.

### How the command is written

- **A list**: the first item is the command name (upper or lower case), the others are the arguments. Numbers and yes/no become text (`10` → `"10"`), `null` the empty text, an object or a list (inside the list) the JSON text. Up to 10000 arguments.
- **A text**: if it begins with `[` it is a JSON list; otherwise it is words separated by spaces (`SADD tag a b c`). Quotes `"…"` (with `\` for special characters) or `'…'` keep together an argument with spaces.
- **The name** of the command: letters, digits and `_ . | -`, up to 41 characters, and it begins with a letter (for sub-commands, for example `["MEMORY", "USAGE", "k"]`).

### The reply

The server's reply becomes a value: texts and numbers as such, `null` for "nothing", lists (even nested), `OK` as a text. A reply bigger than the maximum size of a result (4096 KB by default) gives an error.

### The refused commands

The block does not run these commands, because they would harm the server or the other programs using the same connection. The error says which command and why: "Comando non permesso: … è un comando di amministrazione del server" (command not allowed: … is a server administration command) (or the reason below).

| Commands | Why |
|---|---|
| `FLUSHALL`, `FLUSHDB`, `CONFIG`, `SHUTDOWN`, `DEBUG`, `MONITOR`, `SLAVEOF`, `REPLICAOF`, `MODULE`, `ACL`, `SAVE`, `BGSAVE`, `BGREWRITEAOF`, `FAILOVER`, `SWAPDB`, `SYNC`, `PSYNC`, `REPLCONF`, `CLUSTER`, `SENTINEL`, `PFDEBUG`, `PFSELFTEST`, and the sub-commands `MEMORY PURGE`, `LATENCY RESET`, `SLOWLOG RESET` | Server administration. |
| `MIGRATE` | It connects to another server. |
| `EVAL`, `EVALSHA`, `EVAL_RO`, `EVALSHA_RO`, `FCALL`, `FCALL_RO`, `SCRIPT`, `FUNCTION` | They run code on the server, which could use the commands that are not allowed. |
| `KEYS` | It blocks the server on a big database: use [Redis · Find keys (SCAN)](redis.scan). |
| `SUBSCRIBE`, `PSUBSCRIBE`, `SSUBSCRIBE`, `UNSUBSCRIBE`, `PUNSUBSCRIBE`, `SUNSUBSCRIBE` | There is the [Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe) block. |
| `SELECT`, `AUTH`, `HELLO`, `RESET`, `QUIT`, `CLIENT`, `MULTI`, `EXEC`, `DISCARD`, `WATCH`, `UNWATCH`, `READONLY`, `READWRITE` | They change the state of the connection, which is shared with the other blocks. |
| `BLPOP`, `BRPOP`, `BRPOPLPUSH`, `BLMOVE`, `BLMPOP`, `BZPOPMIN`, `BZPOPMAX`, `BZMPOP`, `WAIT`, `WAITAOF`, and `XREAD`/`XREADGROUP` with `BLOCK` | They block the connection: for waiting there is [Redis · List: take (LPOP · RPOP · BLPOP)](redis.pop). |

### The administrator and the Redis user

- The administrator can **switch off** this block in the module settings ("Allow the «Command» block"): then every command gives "L'amministratore ha disattivato il blocco Comando (impostazioni del modulo)" (the administrator switched off the Command block).
- What you can really do also depends on the connection's **Redis user (ACL)**: a user with few permissions gets "Permesso negato dal database" (permission denied).
- The command counts in the operations per minute like every other block.

## Examples

### 1. A ranking

**Command** `ZADD classifica 10 anna`; then `ZREVRANGE classifica 0 2 WITHSCORES`.

```
[Button: Add]     pressed ──▶ run [Redis · Command (call): ZADD classifica 10 anna] result ──▶ value [Print (console.log)]
[Button: Top 3]   pressed ──▶ run [Redis · Command (call): ZREVRANGE classifica 0 2 WITHSCORES] result ──▶ value [Print (console.log)]
```

`ZADD` replies `1` (a new item); `ZREVRANGE` replies `["anna", "10", …]`: names and scores, in a list.

### 2. A command built by the program

```
[Text field: nome] text ──▶ a [Array literal [ ]: "SADD", "ospiti", a] list ──▶ command [Redis · Command (call)]
```

[Array literal [ ]](core.list) builds `["SADD", "ospiti", "Anna"]`. Each argument is passed separately: a name with spaces or quotes does not change the command.

### 3. A refused command

**Command** `FLUSHALL`.

**Exception** writes "Comando non permesso: FLUSHALL è un comando di amministrazione del server".

## Errors

The messages are in Italian, as the block sends them; the Redis server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [Redis blocks](logicstudio-redis) page. In addition:

| Message | When |
|---|---|
| L'amministratore ha disattivato il blocco Comando (impostazioni del modulo) | The block is switched off in the settings of the logicstudio-redis module. |
| Comando non permesso: NOME … | The command is among the refused ones; after the name there is the reason (for example "è un comando di amministrazione del server"). |
| Comando non permesso: NOME SOTTOCOMANDO è un comando di amministrazione del server | For `MEMORY PURGE`, `LATENCY RESET`, `SLOWLOG RESET`. |
| Comando non permesso: XREAD con BLOCK blocca la connessione (usa il blocco Lista: Togli, con l'attesa) | `XREAD` or `XREADGROUP` with the `BLOCK` argument (with `XREADGROUP` the name is that command's). |
| Comando non valido: … | The command name is not made of letters, digits and `_ . | -`, or does not begin with a letter. |
| Comando non valido: scrivi una lista JSON, per esempio ["ZADD", "classifica", 10, "anna"] | The text begins with `[` but is not JSON. |
| Manca il comando: per esempio ["ZADD", "classifica", 10, "anna"] | The command is empty or the list has no items. |
| Troppi argomenti (al massimo 10000) | The command has more than 10000 items. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | The result is over the maximum size. |
| Redis non ha risposto in 30 s | The command went over the time limit of an operation (Redis did not answer in 30 s). |
| ERR … / WRONGTYPE … / altri messaggi del server | The server refuses the command (wrong arguments, a key of another type…): the message is the server's own, in English. `WRONGTYPE` is translated: "La chiave contiene un altro tipo di valore…". |

## See also

- [Redis · Get (GET)](redis.get), [Redis · Set (SET)](redis.set), [Redis · Hash: get (HGET · HGETALL)](redis.hget), for the most common cases, without writing the command
- [Redis · Find keys (SCAN)](redis.scan), instead of `KEYS`
- [Redis · Subscribe (SUBSCRIBE · PSUBSCRIBE)](redis.subscribe), instead of `SUBSCRIBE`
- [Array literal [ ]](core.list), to build the command
- [Redis blocks](logicstudio-redis), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
