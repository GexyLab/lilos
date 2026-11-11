# Cast to yes/no (Boolean())

`core.toBool` · Values · [Core blocks](logicstudio-core) · version 1

Turns a value into yes/no.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The value to convert. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | yes/no | The converted value. |
| **Exception** (`error`) | object | No error ever comes out: every value can be converted. |

## How it works

At every value that arrives, the block converts it and sends the result on **result**.

| Value that arrives | Result |
|---|---|
| a text | **no** if, once spaces are removed and ignoring case, it is empty, `0`, `false`, `no` or `off`; **yes** in all other cases (even `"falso"` and `"0.0"`) |
| a number | **no** if it is 0 (or NaN), **yes** otherwise |
| `null` | **no** |
| an object or a list | **yes**, even if empty |

## Examples

### 1. A yes/no from a text

`"on"` → yes, `"OFF"` → no, `" no "` → no, `"1"` → yes, `"falso"` → **yes** (the Italian word is not recognized).

### 2. Hide a component from a file

```
[readFile: stato.txt] content ──▶ value [Cast to yes/no (Boolean())] result ──▶ visible [Component]
```

If the file contains `false`, the text becomes **no** and the component is hidden; without the cast the text `"false"` would not hide it.

## See also

- [NOT](core.not) to flip a yes/no
- [Constant · Variable](core.value) for a fixed value of a chosen type
- [Cast to number (Number())](core.toNumber)
- [Cast to text (String())](core.toText)
- [Cast to JSON text (JSON.stringify)](core.toJson)
- [Cast from JSON text (JSON.parse)](core.parseJson)
- [How a block works](ide/blocks)
