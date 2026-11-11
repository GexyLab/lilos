# Cast to number (Number())

`core.toNumber` · Values · [Core blocks](logicstudio-core) · version 1

Turns a value into a number.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The value to convert. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | number | The converted value. |
| **Exception** (`error`) | object | When the value cannot be read as a number. |

## How it works

At every value that arrives, the block converts it and sends the result on **result**.

| Value that arrives | Result |
|---|---|
| a number | the same number |
| yes / no | 1 / 0 |
| a text with a number | the number; spaces at the sides do not count and the **first** comma counts as a dot: `" 7 "` → 7, `"2,5"` → 2.5, `"1e3"` → 1000, `"0x10"` → 16, `"Infinity"` → infinity |
| an empty text or one of only spaces | 0 |
| `null` | 0 |
| a list | its items joined by commas and read as text: `[]` → 0, `[5]` → 5, but `[1,2]` → 1,2 |
| a text that is not a number (`"abc"`, `"1.234,5"`, `"12 kg"`) | error «Non è un numero» ("It is not a number") |
| an object | error «Non è un numero» |

When the conversion fails, the block sends nothing on **result** and sends the message on **Exception**. See [How a block works](ide/blocks).

## Examples

### 1. A number from a text field

```
[Text field: age] text ──▶ value [Cast to number (Number())] result ──▶ a [Compare (== != < >): a ≥ b]
                                                   Exception ──▶ value [Print (console.log)]
```

If the user writes `18`, the number 18 arrives and the comparison works as a comparison between numbers. If they write `diciotto`, the console writes `Non è un numero` (with the name of the block).

### 2. A number from Redis

```
[Redis get: visite] value ──▶ value [Cast to number (Number())] result ──▶ value [Value]
```

Redis sends the text `1204`: after the cast the number 1204 arrives.

## Errors

| Message | When |
|---|---|
| Non è un numero ("It is not a number") | The value cannot be read as a number. |

## See also

- [Constant · Variable](core.value) for a fixed value of a chosen type
- [Compare (== != < >)](core.compare)
- [Cast to text (String())](core.toText)
- [Cast to yes/no (Boolean())](core.toBool)
- [Cast to JSON text (JSON.stringify)](core.toJson)
- [Cast from JSON text (JSON.parse)](core.parseJson)
- [How a block works](ide/blocks)
