# Redis · Hash: set fields (HSET)

`redis.hset` · Database · [Redis blocks](logicstudio-redis) · version 1

Writes the fields of an object in a **hash**. Each added input is a field, with its name: you can build the hash without writing JSON.

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [Redis · Connection (connect)](redis.connect) block. It does not start the block. |
| **key** (`key`) | text | The key. If it has a non-empty value, it takes the place of the **Key** of the settings. It does not start the block. |
| **fields** (`fields`) | object | An object `{ "field": value }` with the fields to write. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **new fields** (`added`) | number | How many fields were created (those that were already there and were overwritten do not count). |
| **Exception** (`error`) | object | When the write fails: missing or closed connection, missing key, no fields, the key is not a hash, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 16 inputs of any type (fewer, if the engine's general limit on added ports is lower: see [Limits](logicstudio-engine/limits)). Each added input is a **field of the hash**: it is called **field 1**… and must be **renamed** with the name of the field, for example `nome` or `eta`.

The added inputs **only keep their value**: a value arriving there does not start the write. The block starts only with **run**. See [How a block works](ide/blocks).

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Key** (`key`) | text | empty | The key, when the **key** input has no value. At most 10000 characters. |
| **JSON (write with JSON.stringify, read with JSON.parse)** (`json`) | yes / no | no | See "The values" below and on the [Redis blocks](logicstudio-redis) page. |

## How it works

When a value arrives on **run**, the block writes the fields with `HSET key field value [field value …]`.

- The fields are those of the object on the **fields** input, plus the added inputs that have a value (if a field is in both, the added input wins). An added input that has not received a value yet does not count.
- With no fields at all there is an error.
- The other fields of the hash stay as they are: only the ones given are written.
- **The values you write**: without the **JSON** option a text stays a text, numbers and yes/no become text (`5`, `true`), `null` the empty text, an object or a list are written as JSON text. With **JSON** ticked, any value (a text too) is written with `JSON.stringify`.

## Examples

### 1. Save a profile

**Key** `utente:1`. Add two inputs and call them `nome` and `eta`.

```
[Text field: nome] text ──▶ nome [Redis · Hash: set fields (HSET)] new fields ──▶ value [Print (console.log)]
[Number field: eta] value ──▶ eta
[Button: Save] pressed ──▶ run
```

Pressing **Save**, the hash `utente:1` receives `nome` and `eta` (as text). The first time **new fields** is 2; later 0, because the fields are already there.

### 2. A whole object

```
[Object literal { }: stato, ora] object ──▶ fields [Redis · Hash: set fields (HSET): serra]
```

With [Object literal { }](core.compose) you prepare `{"stato": "ok", "ora": "10:05"}` and the block writes it as a hash. With **JSON** ticked each value is written as JSON, so a field that is an object or a number comes back as such with [Redis · Hash: get (HGET · HGETALL)](redis.hget) and **JSON**.

## Errors

The messages are in Italian, as the block sends them; the Redis server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [Redis blocks](logicstudio-redis) page. In addition:

| Message | When |
|---|---|
| Manca la chiave | The **Key** is empty and the **key** input has no value (missing key). |
| Chiave troppo lunga | The key is over 10000 characters (key too long). |
| Mancano i campi da scrivere: un oggetto { "campo": valore } o gli ingressi aggiunti | There are no fields to write. |
| Troppi campi (al massimo 5000) | More than 5000 fields at once. |
| La chiave contiene un altro tipo di valore (testo, hash, lista…): usa il blocco giusto per quel tipo | The key exists but is of another type (the server says `WRONGTYPE`): the key holds another type of value, use the right block for that type. |
| Redis non ha risposto in 30 s | The command went over the time limit of an operation (Redis did not answer in 30 s). |
| ERR … / altri messaggi del server | The server refuses the command (for example `ERR value is not an integer or out of range`): the message is the server's own, in English. |

## See also

- [Redis · Hash: get (HGET · HGETALL)](redis.hget), to reread the fields
- [Object literal { }](core.compose), to prepare the fields
- [Redis blocks](logicstudio-redis), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
