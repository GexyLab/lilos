# Convert

`core.convert` · Values · [Core blocks](logicstudio-core) · version 1

Changes the type of a value: to number, to text, to yes/no, to JSON text, or from JSON text to object or list.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The value to convert. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | any | The converted value. |
| **Exception** (`error`) | object | When the conversion is not possible (to **number** or **from JSON text**). |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **To** (`to`) | number, text, yes/no, JSON text, from JSON text | number | What to convert to (see below). |

## How it works

At every value that arrives, the block converts it and sends the result on **result**.

### To number

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

### To text

| Value that arrives | Result |
|---|---|
| a text | the same text |
| a number | the number written with the dot: 2.5 → `"2.5"`; 1000000 → `"1000000"` |
| yes / no | `"true"` / `"false"` |
| `null` | `""` (empty text) |
| an object or a list | the compact JSON: `{"a":1}`, `[1,2]` |

### To yes/no

| Value that arrives | Result |
|---|---|
| a text | **no** if, once spaces are removed and ignoring case, it is empty, `0`, `false`, `no` or `off`; **yes** in all other cases (even `"falso"` and `"0.0"`) |
| a number | **no** if it is 0 (or NaN), **yes** otherwise |
| `null` | **no** |
| an object or a list | **yes**, even if empty |

### To JSON text

Writes the value as JSON text: `"ciao"` → `"\"ciao\""` (with the quotes), 5 → `"5"`, `{ "a": 1 }` → `"{\"a\":1}"`, `null` → `"null"`. NaN and infinity become `"null"`.

### From JSON text

Reads a JSON text and sends the value it describes: `'{"x":[1,2]}'` → the object with the list; `'[1,2,3]'` → the list; `'42'` → the number 42; `'true'` → yes.

- If a number or a yes/no arrives, it is first written as text: 5 → 5.
- If an object or a list arrives, the result is an equal copy.
- An empty text or `null` give an error (`Unexpected end of JSON input`).
- A text that is not JSON (`abc`, `{a:1}`, `{'a':1}`) gives an error, with the message of the JSON reader in English.

When the conversion fails, the block sends nothing on **result** and sends the message on **Exception**. See [How a block works](ide/blocks).

## Examples

### 1. A number from a text field

```
[Text field: age] text ──▶ value [Convert: To number] result ──▶ a [Compare: a ≥ b]
                                                      Exception ──▶ value [Write to console]
```

If the user writes `18`, the number 18 arrives and the comparison works as a comparison between numbers. If they write `diciotto`, the console writes `Non è un numero` (with the name of the block).

### 2. Read the content of a JSON file

```
[Read file: dati.json] content ──▶ value [Convert: from JSON text] result ──▶ object [Get field: utenti.0.nome]
```

If the file contains `{"utenti":[{"nome":"Ada"}]}`, [Get field](core.get) sends `Ada`.

### 3. Save an object as text

```
[Build object] object ──▶ value [Convert: JSON text] result ──▶ content [Write file]
```

The object `{ nome: "Ada", anni: 36 }` becomes the text `{"nome":"Ada","anni":36}`.

### 4. A yes/no from a text

With **To: yes/no**: `"on"` → yes, `"OFF"` → no, `" no "` → no, `"1"` → yes, `"falso"` → **yes** (the Italian word is not recognized).

## Errors

| Message | When |
|---|---|
| Non è un numero ("It is not a number") | **To number** and the value cannot be read as a number. |
| Unexpected end of JSON input | **From JSON text** and the text is empty (or `null`). |
| Other messages of the JSON reader, in English (for example `Unexpected token 'a', "abc" is not valid JSON`) | **From JSON text** and the text is not valid JSON. |

## See also

- [Value](core.value) for a fixed value of a chosen type
- [Format text](core.format) and [Join text](core.concat) to build texts
- [Text operation](core.text)
- [How a block works](ide/blocks)
