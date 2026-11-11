# Catch

`core.catch` · Exceptions · [Core blocks](logicstudio-core) · version 1

Receives the exceptions of the blocks and decides which ones to handle, like `catch` in programming languages. Those that match the rule go out of **caught** (with their message); the others out of **not caught**, to send them to another Catch or rethrow them with [Throw](core.throw).

## Inputs

| Port | Type | Description |
|---|---|---|
| **exception** (`exception`) | object | An exception: link to it the **Exception** output of a block. A text is fine too: it becomes an exception with that message. |
| **a**, **b**, … (added) | object | More inputs like **exception**, to add in Properties (up to 16) to gather the exceptions of several blocks in one Catch. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **caught** (`caught`) | object | The exception, if it matches the rule: `{ message, block, type, schema, at }`. |
| **message** (`message`) | text | The message of the caught exception. |
| **not caught** (`else`) | object | The exception, as it is, if it does not match the rule. |
| **Exception** (`error`) | object | An error of the Catch itself: an invalid regular expression. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Catch** (`match`) | all, contains, regex, block, type | all | The rule (see below). |
| **Text, expression, block id or block type** (`pattern`) | a text | empty | What to look for; not there with **all**. |

## How it works

| Catch | Matches when | Example text |
|---|---|---|
| **all** | always | — |
| **contains** | the message contains the text, ignoring case | `zero` catches «Divisione per zero» ("Division by zero") |
| **regex** | the message matches the regular expression (ignoring case) | `^Il campo «.*» non esiste$` |
| **block** | the exception comes from the block with that id | `b3` (the id is in the Properties of the block) |
| **type** | the exception comes from a block of that type | `coll.get`, `net.request` |

Every exception that arrives, on any input, goes out on **caught** and **message** or on **not caught**: never on both. An exception rethrown by a [Throw](core.throw) with an empty message keeps the `block` and `type` of the block that threw it first.

## Examples

### 1. A message to the user for a specific error

```
[Divide (÷ %)] Exception ──▶ exception [Catch: contains «zero»] message ──▶ text [Label: warning]
```

With a divisor of 0 the label shows `Divisione per zero` ("Division by zero"); the other errors of the division do not touch the label.

### 2. A chain of Catch blocks

```
[HTTP request (fetch)] Exception ──▶ exception [Catch: contains «timeout»] caught ──▶ … try again in 10 s
                                                  not caught ──▶ exception [Catch: all] message ──▶ value [Print (console.log): error]
```

Timeouts are retried; every other error ends up in the console.

## Errors

| Message | When |
|---|---|
| Espressione non valida: … ("Invalid expression: …") | **Catch** = regex and the text is not a valid regular expression (for example `(`). |

## See also

- [Throw](core.throw)
- [Exception data (e.message…)](core.errorInfo)
- [Global catch (onerror)](core.onError)
