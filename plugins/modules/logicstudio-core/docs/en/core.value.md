# Value

`core.value` · Values · [Core blocks](logicstudio-core) · version 1

Sends a fixed value, written in its settings: a number, a text, a yes/no or a JSON value (object, list…). It sends it when the program starts and every time it receives something on **send**.

## Inputs

| Port | Type | Description |
|---|---|---|
| **send** (`send`) | pulse | Any value that arrives here makes the block send the value again. What arrives does not matter: even `false` or `0` start the sending. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The value written in the settings, converted to the chosen **Kind**. |
| **Exception** (`error`) | object | When the kind is **JSON** and the text is not valid JSON. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Kind** (`kind`) | number, text, yes/no, JSON | number | How to read the text of **Value** (see below). |
| **Value** (`value`) | a text (up to 2000 characters) | `0` | The value to send, written as text. |
| **Send at start** (`atStart`) | yes / no | yes | If checked, the block sends the value as soon as the program starts. |

## How it works

The text you write in **Value** is read according to the **Kind**:

| Kind | How it is read | Examples |
|---|---|---|
| **number** | Spaces at the sides do not count and the first comma counts as a decimal point. | `42` → 42; `3,5` → 3.5; `1e3` → 1000; `0x10` → 16; empty → 0 |
| **text** | As it is, spaces included. | `42` → the text "42", not the number |
| **yes/no** | It is **no** if, once spaces are removed and ignoring case, it is empty, `0`, `false`, `no` or `off`. Any other text is **yes**. | `no` → no; `OFF` → no; `sì` → yes; `falso` → **yes** |
| **JSON** | The text is read as JSON. Empty is `null`. | `{"nome":"Ada"}` → an object; `[1,2,3]` → a list; `"ciao"` → the text ciao; `null` → null |

Watch out for the edge cases:

- With the kind **number**, a text that is not a number (for example `abc`, or `1.234,5` with two separators) does **not** give an error: the block sends the special value `NaN` ("not a number"), which the calculation blocks after it treat as a wrong number. If you want an error, use the kind **text** and then [Convert](core.convert).
- With the kind **yes/no**, the Italian word `falso` is **yes**: for no, write `no`, `0`, `false` or `off`.
- With the kind **JSON** you can send `null`: it reaches the linked blocks as an empty value.

When it sends the value:

- **At start**, if **Send at start** is checked. This happens before the inputs of the blocks receive their initial values.
- **Every time something arrives on send**, always (even if **Send at start** is removed).

If the JSON text is not valid, the block sends nothing on **value** and sends the message of the JSON reader on **Exception** (see **Errors**). This happens both at start and at every **send**.

The value does not change while the program runs: for a value that changes use [Memory](core.store). For the general rules (inputs, "starts it", Exception) see [How a block works](ide/blocks).

## Examples

### 1. A fixed number to add

```
[Value: 2] value ──▶ a  [Add] result ──▶ value [Write to console]
[Value: 3] value ──▶ b
```

Kind **number**, **Send at start** checked. At start the console shows `2` and then `5` ([Add](core.add) runs at every value that arrives).

### 2. A text sent when you press a button

```
[Button: Greet] pressed ──▶ send [Value] value ──▶ value [Write to console]
```

Kind **text**, Value `Hello everyone!`, **Send at start** removed. At every click on the [Button](ui.button) the console writes `Hello everyone!`; at start it writes nothing.

### 3. An object of settings

Kind **JSON**, Value:

```
{"soglia": 30, "unità": "°C", "allarme": true}
```

At start the block sends the object. With a [Get field](core.get) block with Field `soglia` you get the number 30.

If you write `{soglia: 30}` by mistake (without quotes around the name), the value does not go out and the Exception receives a message like `Expected property name or '}' in JSON at position 1 (line 1 column 2)`.

### 4. A test switch

Kind **yes/no**, Value `off`: it sends **no**. Changing the Value to `on` (or `1`, `sì`, `vero`…) it sends **yes**.

## Errors

| Message | When |
|---|---|
| The message of the JSON reader, in English: for example `Unexpected token 'a', "abc" is not valid JSON` | Kind **JSON** and a text that is not valid JSON. |

## See also

- [Memory](core.store) for a value that changes while the program runs
- [Convert](core.convert) to change the type of a value that arrives
- [At start](core.onStart) for a simple pulse at the start
- [How a block works](ide/blocks)
