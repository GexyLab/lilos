# InfluxDB · Write point (write)

`influx.write` · Database · [InfluxDB blocks](logicstudio-influxdb) · version 1

Writes a **point** (measurement, tags, fields, time) into an InfluxDB bucket, or a list of points with a single request. Each added input is a **tag**, with its name. The points go to the server in *line protocol* (`POST /api/v2/write`).

## Inputs

| Port | Type | Description |
|---|---|---|
| **run** (`run`) | pulse | Any value arriving here starts the write. |
| **connection** (`connection`) | object | The handle from the **connection** output of [InfluxDB · Connection (connect)](influx.connect). It does not start the block. |
| **measurement** (`measurement`) | text | The measurement name. If it has a non-empty value, it takes the place of the **Measurement** setting. It does not start the block. |
| **fields** (`fields`) | any | The values to write: an object `{ "temp": 21.5, "humidity": 40 }`. A single value (a number, a text, yes/no) becomes the field `value`. It does not start the block. |
| **tags** (`tags`) | object | Hidden. More tags, as an object `{ "room": "kitchen" }`. They add to those in the settings. It does not start the block. |
| **time** (`time`) | any | Hidden. The moment of the point: an ISO date (`2026-11-11T10:00:00Z`, nanoseconds allowed) or milliseconds since 1970. Empty: the server sets it. It does not start the block. |
| **points (list)** (`points`) | list | Hidden. A list of points `{ "measurement": …, "tags": {…}, "fields": {…}, "time": … }`, written with a single request. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **done** (`done`) | pulse | When the write succeeded. |
| **points written** (`written`) | number | Hidden. How many points were written. |
| **Exception** (`error`) | object | When the write fails: missing connection, invalid point, bucket not found, token without permission, quota used up… |

Hidden ports are shown with the **eye** in the **Properties**.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Measurement** (`measurement`) | text | empty | The measurement, when the **measurement** input has no value. |
| **Tags (JSON)** (`tags`) | a JSON object | `{}` | The tags of all points, for example `{"sensor": "greenhouse"}`. |
| **Bucket (empty: the connection's)** (`bucket`) | text | empty | The bucket to write to. Empty: the connection's. |
| **Time precision** (`precision`) | Nanoseconds, Microseconds, Milliseconds, Seconds | Milliseconds | The unit of the times sent to the server. The finer it is, the more close points stay distinct. |
| **Whole numbers as integers (i)** (`integers`) | yes / no | no | If ticked, a whole number (`5`) goes as an integer (`5i`). If not, every number is a float. |

## Added ports

In the **Properties**, **Ports** section, with **Add input** you can add up to 16 inputs of any type (fewer if the engine's general limit on added ports is lower: see [Limits](logicstudio-engine/limits)). Each added input is a **tag**: it is called **tag 1**, **tag 2**… and must be **renamed** with the tag name, for example `room`.

Added inputs **only keep their value**: a value arriving there does not start the write, even if the input "starts it". The write starts only with **run**. An input with no value (or empty) does not become a tag. See [How a block works](ide/blocks).

## How it works

When a value arrives on **run**:

1. The **tags** are put together: first those in the settings, then those of the **tags** input, then the added inputs (the last one wins, if the name is the same).
2. If **points (list)** has at least one element, each element is a point: an object with `measurement`, `tags`, `fields`, `time` (what is missing comes from the block: the measurement from **measurement**, the tags add up); an element that is not an object becomes the point's `fields`. The **fields** and **time** inputs then do not count.
3. Otherwise a single point is written, with **measurement**, **fields** and **time**.
4. The point becomes a line of line protocol and goes to the server; when the server says yes, **done** (and **points written**) come out.

### The rules of points

- **Measurement**: always needed, cannot start with `#` nor contain a line break. Commas and spaces are escaped automatically.
- **Tags**: names and values are text; a tag with no value (or `null`, or empty) is skipped; an object or a list becomes JSON text. Tags are written in alphabetical order (the order InfluxDB likes best).
- **Fields**: at least one field with a value is needed. Numbers are floats (`21.5`); with **Whole numbers as integers** whole numbers go as `5i`. Texts are texts, yes/no are `true`/`false`, objects and lists become JSON text, `null` is skipped. `NaN` and infinity cannot be written.
- **Time**: a number (or a text of digits only) is in **milliseconds**; a text is an ISO date (with more digits after the seconds, up to nanoseconds). The time is converted to the chosen **Precision**. With no time, the point gets the server's time.
- A point with the same measurement, the same tags and the same time as one already written **replaces it**: that is how InfluxDB works.

### Limits

- At most as many points as the module's maximum rows (10000 by default) at once.
- The bucket is the one in the setting or, if empty, the connection's. With 1.x write `database/retention`.
- With 2.x the write uses the connection's organization.

## Examples

### 1. A temperature every minute with tags

Settings: **Measurement** `ambiente`, **Tags** `{"sito": "casa"}`. One added input, renamed `stanza`.

```
[InfluxDB · Connection (connect)] connection ──▶ connection [InfluxDB · Write point (write)] done ──▶ value [Print (console.log)]
[Constant · Variable: cucina] value ──▶ stanza                    Exception ──▶ value [Print (console.log): error]
[Number field: temperature] value ──▶ fields
[Interval (setInterval): 60 s] pulse ──▶ run
```

Every minute it writes `ambiente,sito=casa,stanza=cucina value=21.5 1794…` (the field is `value` because **fields** is a lone number). [Interval (setInterval)](core.every) starts the write.

### 2. Several fields together

```
[Object literal { }] object ──▶ fields [InfluxDB · Write point (write)] done ──▶ value [Notify: "Measurement saved"]
[Button: Save] pressed ──▶ run
```

[Object literal { }](core.compose) prepares `{ "temp": 21.5, "umidita": 40, "finestra_aperta": false }`: three fields of different types (float, float, boolean) in the same point.

### 3. A list of points, each with its own time

```
[Array literal [ ]] list ──▶ points (list) [InfluxDB · Write point (write)] points written ──▶ value [Value: written]
```

Each element is for example `{ "fields": { "kw": 1.2 }, "time": "2026-11-11T09:00:00Z" }`; the measurement comes from the settings and all the points go in a single request.

## Errors

The messages are in Italian.

| Message | When |
|---|---|
| Manca la misura (measurement) | No measurement, neither in the input nor in the settings. |
| Il nome della misura non può cominciare con # | The measurement starts with `#`. |
| Il nome della misura non può contenere un a capo: … | The measurement has a line break (same for "Il nome di un tag", "Il valore di un tag", "Il nome di un campo"). |
| Il punto di «…» non ha campi (fields): ne serve almeno uno | No field with a value. |
| Valore non valido per un campo: NaN (InfluxDB non tiene NaN e Infinito) | A field is NaN or infinity. |
| Tempo non valido: … (serve una data ISO, come 2026-11-11T10:00:00Z, o i millisecondi) | The time cannot be understood. |
| Tempo non valido: … | The time is an infinite number. |
| Precisione non valida: … (ns, us, ms, s) | The precision is not one of the allowed ones. |
| Troppi punti in una volta: 20000 (al massimo 10000) | The list has more points than the module's limit. |
| Tag non validi: scrivi un oggetto JSON, per esempio {"host": "server1"} | The **Tags (JSON)** are not JSON. |
| Tag non validi: serve un oggetto JSON { "nome": valore } | It is JSON, but not an object. |
| Manca il bucket (nelle impostazioni del blocco o della connessione) | No bucket, neither in the block nor in the connection. |
| Il bucket non valido: … | The name is longer than 255 characters or has control characters. |
| InfluxDB ha risposto 404 (non trovato): … | The bucket or the organization does not exist. |
| InfluxDB ha risposto 422 (dati non validi): … | For example a field already written with another type (text where there was a number). |
| InfluxDB ha risposto 403 (il token non ha il permesso): … | The token cannot write to that bucket. |

The common errors (connection, network, quotas) are in the page [InfluxDB blocks](logicstudio-influxdb).

## See also

- [InfluxDB · Connection (connect)](influx.connect), [InfluxDB · Query (Flux · InfluxQL · SQL)](influx.query)
- [Interval (setInterval)](core.every), to write at intervals
- [Object literal { }](core.compose), to prepare the fields
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
