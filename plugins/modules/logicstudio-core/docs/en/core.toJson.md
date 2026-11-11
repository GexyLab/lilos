# Cast to JSON text (JSON.stringify)

`core.toJson` · Values · [Core blocks](logicstudio-core) · version 1

Writes a value as JSON text.

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

Writes the value as JSON text: `"ciao"` → `"\"ciao\""` (with the quotes), 5 → `"5"`, `{ "a": 1 }` → `"{\"a\":1}"`, `null` → `"null"`. NaN and infinity become `"null"`.

## Examples

### 1. Save an object as text

```
[Object literal { }] object ──▶ value [Cast to JSON text (JSON.stringify)] result ──▶ content [writeFile]
```

The object `{ nome: "Ada", anni: 36 }` becomes the text `{"nome":"Ada","anni":36}`.

### 2. A text with quotes

The text `ciao` becomes `"ciao"` (with the quotes): it is the JSON form of a text.

## See also

- [Template string](core.format) to build texts
- [Cast to number (Number())](core.toNumber)
- [Cast to text (String())](core.toText)
- [Cast to yes/no (Boolean())](core.toBool)
- [Cast from JSON text (JSON.parse)](core.parseJson)
- [How a block works](ide/blocks)
