# Cast to text (String())

`core.toText` · Values · [Core blocks](logicstudio-core) · version 1

Turns a value into text.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The value to convert. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | text | The converted value. |
| **Exception** (`error`) | object | No error ever comes out: every value can be converted. |

## How it works

At every value that arrives, the block converts it and sends the result on **result**.

| Value that arrives | Result |
|---|---|
| a text | the same text |
| a number | the number written with the dot: 2.5 → `"2.5"`; 1000000 → `"1000000"` |
| yes / no | `"true"` / `"false"` |
| `null` | `""` (empty text) |
| an object or a list | the compact JSON: `{"a":1}`, `[1,2]` |

## Examples

### 1. A number inside a sentence

```
[Number field: quantity] value ──▶ value [Cast to text (String())] result ──▶ b [Concat text]
```

With the quantity 2.5 the block sends the text `2.5` (with the dot), ready to be joined to other texts.

### 2. An object to look at

```
[Object literal { }] object ──▶ value [Cast to text (String())] result ──▶ value [Print (console.log)]
```

The object `{ nome: "Ada" }` becomes the text `{"nome":"Ada"}`.

## See also

- [Template string](core.format) and [Concat text](core.concat) to build texts
- [String functions](core.text)
- [Cast to number (Number())](core.toNumber)
- [Cast to yes/no (Boolean())](core.toBool)
- [Cast to JSON text (JSON.stringify)](core.toJson)
- [Cast from JSON text (JSON.parse)](core.parseJson)
- [How a block works](ide/blocks)
