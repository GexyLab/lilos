# Exception data (e.message…)

`core.errorInfo` · Exceptions · [Core blocks](logicstudio-core) · version 1

Splits an exception into its fields, like `e.message` in a `catch`: the message, the block that threw it, its type, the schema and the moment.

## Inputs

| Port | Type | Description |
|---|---|---|
| **exception** (`exception`) | object | The exception: from the **Exception** output of a block, from a [Catch](core.catch) or from a [Global catch (onerror)](core.onError). A text counts as an exception with that message. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **message** (`message`) | text | The message, for example `Divisione per zero` ("Division by zero"). |
| **block** (`block`) | text | The id of the block that threw it, for example `b7` (empty if unknown). |
| **block type** (`type`) | text | The type of that block, for example `core.divide` (empty if unknown). |
| **schema** (`schema`) | text | The schema where it happened (empty if unknown). |
| **when (ms)** (`at`) | number | The moment, in milliseconds since 1970 (it does not go out if the exception does not have it). |
| **when (ISO)** (`time`) | text | The same moment as an ISO text, for example `2026-11-11T09:30:00.000Z`. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## How it works

The engine describes every exception as `{ message, block, type, schema, at }` (the `type` field since engine 1.3.0). At every exception that arrives the block sends each field on its output. A value that is not an object with `message` (a text, a number) becomes an exception with only the message: the other outputs send an empty text, **when** does not go out.

## Examples

### 1. An error log in a file

```
[Global catch (onerror): program] exception ──▶ exception [Exception data] when (ISO)  ──▶ time    [Template string: "{time};{schema};{type};{msg}"] text ──▶ content [appendFile: ~/errors.csv]
                                                                            schema      ──▶ schema
                                                                            block type  ──▶ type
                                                                            message     ──▶ msg
```

Every exception of the program that nobody handles becomes a row of `errors.csv`, for example `2026-11-11T09:30:00.000Z;principale;core.divide;Divisione per zero`. The outputs fire in the order of the table, with **when (ISO)** last: on the [Template string](core.format) leave "starts it" only on **time** (remove it from the others), so the row goes out once, with all the fields.

## See also

- [Catch](core.catch)
- [Global catch (onerror)](core.onError)
- [Get property](core.get), to read a single field
