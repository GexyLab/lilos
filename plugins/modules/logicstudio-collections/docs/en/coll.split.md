# Split text

`coll.split` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Cuts a text into pieces at every separator and sends the list of pieces.

## Inputs

| Port | Type | Description |
|---|---|---|
| **text** (`text`) | text | The text to split. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | list | The pieces, as texts, in the order they have in the text. |
| **Exception** (`error`) | object | When the pieces would be more than 100000. |

## Settings

| Setting | Values | Default | Description |
|---|---|---|---|
| **Separator (\n = new line)** (`separator`) | a text | `,` | Where to cut. `\n` means "new line", `\t` a tab, `\r` the carriage return. Empty: one piece for each character. |
| **Trim spaces** (`trim`) | on, off | on | On: removes spaces, tabs and new lines at the start and at the end of each piece. |

## How it works

At every text that arrives, the block cuts it where it finds the separator and sends the list of pieces.

- The separator is an **exact text**, not a pattern: `;` cuts only at semicolons, `, ` (comma and space) only where both are there. Uppercase and lowercase count: `x` does not cut at `X`.
- The separator does not stay in the pieces.
- Two separators in a row give an **empty** piece: `"a,,b,"` gives `["a", "", "b", ""]` (the last one too, after the final comma). To remove them use [Filter](coll.filter) with "a ≠ b" and an empty Value.
- An empty text gives `[""]`, a list with one empty text (length 1), not `[]`.
- A text without the separator gives a one-piece list: `"abc"` with `,` gives `["abc"]`.
- With an **empty separator** every character is a piece: `"abc"` gives `["a", "b", "c"]`. Some symbols, like many emojis, are made of two characters and get broken.
- You can write `\n`, `\t`, `\r` together with other things too (for example `;\n`). There is no way to give the text `\n` literally.
- A text with "Windows" new lines (`\r\n`) cut with `\n` leaves a `\r` at the end of each piece: with **Trim spaces** on it disappears, off it stays.
- If a value that is not a text arrives, it is first written as text: a number `12.5` with separator `.` gives `["12", "5"]`; a list or an object becomes its JSON (`[1,2]` with `,` gives `["[1", "2]"]`); `null` is an empty text.
- The pieces are **always texts**: `"1,2,3"` gives `["1", "2", "3"]`, not numbers. Blocks like [Sum · Min · Max · Average](coll.stat) and [Sort](coll.sort) still read them as numbers.

## Examples

### 1. A list written with commas

```
[Value (text): mele, pere ,uva] value ──▶ text [Split text] result ──▶ value [Write to console]
```

It writes `["mele","pere","uva"]`. With **Trim spaces** off: `["mele"," pere ","uva"]`.

### 2. One line per entry

```
[Text field] text ──▶ text [Split text: \n] result ──▶ items [List]
```

With the **Separator** `\n` every line of the text becomes an entry of the [List](ui.list).

### 3. Grades with the decimal comma

The grades `7,5; 8; 6` cannot be split with the comma (it is also in the numbers). Use the separator `;`:

```
[Value (text): 7,5; 8; 6] value ──▶ text [Split text: ;] result ──▶ list [Sum · Min · Max · Average: average] result ──▶ value [Write to console]
```

The pieces are `["7,5", "8", "6"]` and the average is 7.1666…

## Errors

| Message | When |
|---|---|
| Lista troppo grande (massimo 100000 elementi) (List too big, maximum 100000 items) | The text would split into more than 100000 pieces. |

## See also

- [Join into text](coll.join), the opposite of this block
- [Text operation](core.text), [Format text](core.format)
- [How a block works](ide/blocks)
