# Throw

`core.throw` · Exceptions · [Core blocks](logicstudio-core) · version 1

Throws an exception, like `throw` in programming languages: when a value arrives, the block goes out of its **Exception** port with a message you choose. If an exception arrives, it **rethrows** it as it is.

## Inputs

| Port | Type | Description |
|---|---|---|
| **throw** (`value`) | any | Every value that arrives makes the exception be thrown. The value can go into the message with `{value}`. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **Exception** (`error`) | object | The thrown exception: `{ message, block, type, schema, at }`. It is the only output of the block and is shown by default. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Message** (`message`) | a text | empty | The message of the exception. `{value}` is replaced by what arrives (for an exception, by its message). Empty: the message is the value itself. |

## How it works

| What arrives | Empty message | Written message |
|---|---|---|
| any value (`42`, `"hello"`, an object) | new exception with the value as text (`42`, `hello`, the JSON of the object) | new exception with the message, `{value}` replaced |
| an exception (an object with `message`) | the **same** exception, rethrown as it is: `block`, `type` and `schema` stay those of the block that threw it first | new exception with the message, `{value}` = the message of the one that arrived |
| an empty value (`""`) with an empty message | new exception with the message `Errore` ("Error") | — |

A new exception has the `block` and `type` of this block (`core.throw`). As for every block, if nothing is linked to **Exception** the exception goes to the [Global catch (onerror)](core.onError) of the schema, if there is one, otherwise to the main console. Unlike the other blocks, here the **Exception** port is **shown by default** (it is the only output of the block); you can still hide it with the eye in Properties (from core blocks 1.3.1, with lilOS 1.44.0).

## Examples

### 1. A check that throws an exception

```
[Interval (setInterval): 60 s] pulse ──▶ read [readFile: ~/sensor.txt] content ──▶ a [Compare (== != < >): a > b, b = 60] if true ──▶ throw [Throw: «Temperature above 60 °C»]
```

When the temperature goes above 60, the Throw throws `Temperature above 60 °C`. With a [Global catch (onerror)](core.onError) in the schema you receive it in one place, together with the other errors.

### 2. Rethrowing what a Catch does not handle

```
[HTTP request (fetch)] Exception ──▶ exception [Catch: contains «timeout»] caught     ──▶ … try again
                                                                            not caught ──▶ throw [Throw]
```

The [Catch](core.catch) handles only the timeouts; all the other exceptions go to the Throw, which with the empty message rethrows them as they are.

## Errors

| Message | When |
|---|---|
| the one written in the settings, or the value that arrived | Always: it is the purpose of the block. |

## See also

- [Catch](core.catch) to handle exceptions
- [Exception data (e.message…)](core.errorInfo) to read their fields
- [Global catch (onerror)](core.onError) for the exceptions nobody has linked
- [How a block works](ide/blocks)
