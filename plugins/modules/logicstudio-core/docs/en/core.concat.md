# Concat text

`core.concat` · Text · [Core blocks](logicstudio-core) · version 1

Joins two or more texts one after the other, with a separator of your choice between them.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** | text | The first piece. |
| **b** | text | The second piece. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **text** (`text`) | text | The pieces joined. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Separator** (`separator`) | a text (up to 2000 characters) | empty | The text put **between** one piece and the next (not at the start or at the end). Empty: the pieces are stuck together. |

## Added ports

In the **Properties**, **Ports** section, you can add up to 16 more inputs (fewer, if an administrator has lowered the limit of added ports), of type text, named with the following letters: **c**, **d**, **e**… up to **r**. They show in italics on the block. The pieces are joined in the order **a**, **b**, then the added inputs from the top. See [How a block works](ide/blocks).

## How it works

Every time a value arrives on an input, the block takes the last value of each input, writes them as text and joins them with the **Separator**. It sends the result on **text**.

- Inputs that have not received anything yet are **skipped**, separator included: with the separator `, `, only **a** = `uno` and **c** = 3 give `uno, 3`.
- An input that has received `null` is **not** skipped: it is an empty text, and the separator appears all the same: `uno, , 3`.
- How values are written:

| Value | Written as |
|---|---|
| a text | as it is (spaces included) |
| a number | with the dot: 2.5 → `2.5` |
| yes / no | `true` / `false` |
| `null` | empty text |
| an object or a list | compact JSON: `[1,"x"]` |

- The separator is written in a one-line field: you can use spaces, commas, dashes, but not a new line or a tab.

## Examples

### 1. First name and last name

Separator: a space.

```
[Text field: first name] text ──▶ a [Concat text] text ──▶ text [Label: full name]
[Text field: last name]  text ──▶ b
```

`Ada` and `Lovelace` → `Ada Lovelace`. Until the user writes the last name, the [Label](ui.label) shows only `Ada`.

### 2. A file path

Separator `/`, values `~`, `Documents`, `note.txt` (with the input **c**) → `~/Documents/note.txt`.

### 3. A CSV line

Separator `;`, inputs **c** and **d** added: `Rossi`, 42, `true`, 3.5 → `Rossi;42;true;3.5`. Watch out: numbers come out with the dot, and a text that contains `;` is not put in quotes.

## Errors

This block has no errors of its own.

## See also

- [Template string](core.format) for a text with the values inside a template
- [Join](coll.join) to join the items of a list
- [Split](coll.split) for the opposite operation
- [String functions](core.text)
- [How a block works](ide/blocks)
