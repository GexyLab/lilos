# Text operation

`core.text` · Text · [Core blocks](logicstudio-core) · version 1

Does an operation on a text: puts it in upper or lower case, trims the spaces at the sides, counts its length, checks if it contains a word, replaces a word with another.

## Inputs

| Port | Type | Description |
|---|---|---|
| **text** (`text`) | text | The text to work on. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | any | A text, a number (for **length**) or a yes/no (for **contains**). |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Operation** (`op`) | UPPER CASE, lower case, trim spaces, length, contains, replace | UPPER CASE | The operation to do (see below). |
| **Find** (`find`) | a text | empty | The text to look for. It shows only with **contains** and **replace**. |
| **Replace with** (`with`) | a text | empty | The text to put in its place. It shows only with **replace**. |

The operations:

| Operation | result | Example |
|---|---|---|
| **UPPER CASE** (`upper`) | text | `Ciao è` → `CIAO È`; `straße` → `STRASSE` |
| **lower case** (`lower`) | text | `CIAO È` → `ciao è` |
| **trim spaces** (`trim`) | text | `"  hello world  "` → `"hello world"` (the spaces in the middle stay) |
| **length** (`length`) | number | `ciao` → 4; `""` → 0 |
| **contains** (`contains`) | yes/no | with Find `world`: `Hello world` → yes |
| **replace** (`replace`) | text | with Find `-` and Replace with `/`: `2026-11-11` → `2026/11/11` |

## How it works

At every value that arrives, the block writes it as text, does the operation and sends the result on **result**.

The value is first written as text: a number with the dot (2.5 → `2.5`, so its **length** is 3), yes/no as `true`/`false`, `null` as an empty text, objects and lists as JSON (the list `[1,2,3]` becomes `[1,2,3]`, **7** long, not 3; for the number of items use [Length](coll.length)).

Details of each operation:

- **UPPER CASE** and **lower case** also work for accented letters and for other alphabets. Some letters change length: `ß` becomes `SS`.
- **trim spaces** removes spaces, tabs, new lines and special spaces (like the non-breaking space) at the start and at the end.
- **length** counts the units of the text the way the computer counts them: normal letters, accented ones included, count 1, but many emoji count **2** (`😀` → 2).
- **contains** looks for **exactly** the text in **Find**: upper case counts (`World` does not find `world`). With **Find** empty the result is always **yes**.
- **replace** replaces **every** time **Find** appears, exactly as it is written (upper case included, with no special characters or "wildcards"): with Find `.` and Replace with empty, `a.b.c` → `abc`.
- **replace** with **Find** empty puts **Replace with** between every letter: with Replace with `-`, `abc` → `a-b-c`.
- **Find** and **Replace with** are written in a one-line field: you cannot look for a new line.

To ignore upper case in **contains** or in a [Compare](core.compare), first put a Text operation with **lower case** and write **Find** in lower case.

## Examples

### 1. Clean up what the user writes

```
[Text field: code] text ──▶ text [Text operation: trim spaces] result ──▶ text [Text operation: UPPER CASE] result ──▶ value [Write to console]
```

`"  ab123 "` → `"ab123"` → `"AB123"`.

### 2. Check for a word

Operation **contains**, Find `errore`:

```
[Read file: log.txt] content ──▶ text [Text operation: contains] result ──▶ condition [If]
```

If the file contains `... errore di rete ...` the result is **yes**; if it contains `Errore` (with the capital), it is **no**.

### 3. A number with a comma

```
[Calculate: round, 2 decimals] result ──▶ text [Text operation: replace] result ──▶ text [Label: price]
```

Find `.`, Replace with `,`: the number 12.75 arrives as `12.75` and becomes `12,75`.

### 4. Minimum length of a password

Operation **length**, then a [Compare](core.compare) `a ≥ b` with **b** = 8: `segreto` (7) → **no**; `segreto1` (8) → **yes**.

## Errors

This block has no errors of its own.

## See also

- [Format text](core.format) and [Join text](core.concat) to build texts
- [Split text](coll.split) to break a text into a list
- [Cases](core.switch) to recognize a text among many
- [Convert](core.convert) to turn a text into a number
- [How a block works](ide/blocks)
