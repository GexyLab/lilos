# Cast from JSON text (JSON.parse)

`core.parseJson` · Values · [Core blocks](logicstudio-core) · version 1

Reads a JSON text and sends the value it describes (object, list, number, text or yes/no).

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The value to convert. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | any | The converted value. |
| **Exception** (`error`) | object | When the text is not valid JSON. |

## How it works

At every value that arrives, the block converts it and sends the result on **result**.

Reads a JSON text and sends the value it describes: `'{"x":[1,2]}'` → the object with the list; `'[1,2,3]'` → the list; `'42'` → the number 42; `'true'` → yes.

- If a number or a yes/no arrives, it is first written as text: 5 → 5.
- If an object or a list arrives, the result is an equal copy.
- An empty text or `null` give an error (`Unexpected end of JSON input`).
- A text that is not JSON (`abc`, `{a:1}`, `{'a':1}`) gives an error, with the message of the JSON reader in English.

When the conversion fails, the block sends nothing on **result** and sends the message on **Exception**. See [How a block works](ide/blocks).

## Examples

### 1. Read the content of a JSON file

```
[readFile: dati.json] content ──▶ value [Cast from JSON text (JSON.parse)] result ──▶ object [Get property: utenti.0.nome]
```

If the file contains `{"utenti":[{"nome":"Ada"}]}`, [Get property](core.get) sends `Ada`.

### 2. Handle a text that is not JSON

```
[Text field] text ──▶ value [Cast from JSON text (JSON.parse)] result ──▶ value [Print (console.log)]
                                                 Exception ──▶ value [Print (console.log)]
```

If the user writes `{"a":1}` the object comes out; if they write `{a:1}` nothing comes out on **result** and the console receives the error message.

## Errors

| Message | When |
|---|---|
| Unexpected end of JSON input | The text is empty (or `null`). |
| Other messages of the JSON reader, in English (for example `Unexpected token 'a', "abc" is not valid JSON`) | The text is not valid JSON. |

## See also

- [Get property](core.get)
- [Decompose](core.decompose)
- [Cast to number (Number())](core.toNumber)
- [Cast to text (String())](core.toText)
- [Cast to yes/no (Boolean())](core.toBool)
- [Cast to JSON text (JSON.stringify)](core.toJson)
- [How a block works](ide/blocks)
