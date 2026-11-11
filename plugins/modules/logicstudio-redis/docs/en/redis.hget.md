# Redis · Hash: get (HGET · HGETALL)

`redis.hget` · Database · [Redis blocks](logicstudio-redis) · version 1

Reads a **field** of a hash, or the whole hash as an object when the field is empty. A hash is a key with several fields: `utente:1` with `nome`, `eta`…

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the operation. |
| **connection** (`connection`) | object | The reference of a [Redis · Connection (connect)](redis.connect) block. It does not start the block. |
| **key** (`key`) | text | The key. If it has a non-empty value, it takes the place of the **Key** of the settings. It does not start the block. |
| **field** (`field`) | text | The field to read. If it has a non-empty value, it takes the place of the **Field** of the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | With a field: its value (text, or converted with **JSON**), `null` if missing. Without a field: an object `{ "field": value }` with all the fields (empty if the hash is not there). |
| **exists** (`exists`) | yes/no | Hidden. With a field: whether the field is there. Without a field: whether the hash has at least one field. |
| **truncated** (`truncated`) | yes/no | Hidden. `true` if the hash has more fields than the module's limit (10000 by default) and only some of them came out. |
| **Exception** (`error`) | object | When the read fails: missing or closed connection, missing key, the key is not a hash, a value that is not JSON, time out… |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Key** (`key`) | text | empty | The key, when the **key** input has no value. At most 10000 characters. |
| **Field (empty = all of them, HGETALL)** (`field`) | text | empty | The field to read, when the **field** input has no value. Empty: all the fields. |
| **JSON (write with JSON.stringify, read with JSON.parse)** (`json`) | yes / no | no | See "The values" below and on the [Redis blocks](logicstudio-redis) page. |

## How it works

- **With a field**: `HGET key field`. **value** is the field's text (or the converted value, with **JSON**); if the field is missing, `null` and **exists** `false`.
- **Without a field**: `HGETALL key`. **value** is an object with all the fields; with **JSON** each field is converted (a field that is not JSON gives an error). A big hash, over the module's limit, is read in pieces and **truncated** says a part is missing.
- A key that is not a hash gives "La chiave contiene un altro tipo di valore".
- The result cannot be over the maximum size (4096 KB by default).

## Examples

### 1. A user's profile

**Key** `utente:1`, **Field** empty.

```
[Redis · Hash: get (HGET · HGETALL)] value ──▶ object [Get property: nome] value ──▶ value [Value: name]
[Button: Load] pressed ──▶ run
```

If `utente:1` has the fields `nome` and `eta`, **value** is `{"nome": "Anna", "eta": "30"}`: the values of a hash are always text, unless you use **JSON**.

### 2. A single field

**Key** `utente:1`, **Field** `eta`.

```
[Redis · Hash: get (HGET · HGETALL)] value ──▶ value [Value: age]
```

## Errors

The messages are in Italian, as the block sends them; the Redis server's own messages are in the server's language (English), on one line. The most common connection, network and quota errors (missing or closed connection, address not allowed, "Questo è il database di lilOS: i blocchi non possono usarlo", too many operations…) are listed on the [Redis blocks](logicstudio-redis) page. In addition:

| Message | When |
|---|---|
| Manca la chiave | The **Key** is empty and the **key** input has no value (missing key). |
| Chiave troppo lunga | The key is over 10000 characters (key too long). |
| Campo troppo lungo | The field is over 10000 characters (field too long). |
| La chiave contiene un altro tipo di valore (testo, hash, lista…): usa il blocco giusto per quel tipo | The key exists but is of another type (the server says `WRONGTYPE`): the key holds another type of value, use the right block for that type. |
| Il valore … non è JSON: togli l'opzione JSON per leggerlo come testo | **JSON** is ticked and the text read is not JSON. After "Il valore" comes the key. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | The result is over the maximum size. |
| Redis non ha risposto in 30 s | The command went over the time limit of an operation (Redis did not answer in 30 s). |
| ERR … / altri messaggi del server | The server refuses the command (for example `ERR value is not an integer or out of range`): the message is the server's own, in English. |

## See also

- [Redis · Hash: set fields (HSET)](redis.hset), to write the fields
- [Get property](core.get), to read a field of the object
- [Redis · Get (GET)](redis.get), for text keys
- [Redis blocks](logicstudio-redis), for the values, limits, quotas and module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
