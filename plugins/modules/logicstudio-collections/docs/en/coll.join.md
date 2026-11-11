# Join

`coll.join` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Makes a single text with the items of a list, putting a separator between one and the next.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The list to join. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **text** (`text`) | text | The items written one after the other, with the separator in between. |
| **Exception** (`error`) | object | When the value on **list** is not a list. |

## Settings

| Setting | Values | Default | Description |
|---|---|---|---|
| **Separator (\n = new line)** (`separator`) | a text | `, ` (comma and space) | What to put between two items. `\n` means "new line", `\t` a tab, `\r` the carriage return. Empty: the items stuck together. |

## How it works

At every list that arrives, the block writes each item as text and joins them with the separator.

How the items become text:

| Item | Text |
|---|---|
| a text | as it is |
| a number | `12.5` (with a dot) |
| `true`, `false` | `true`, `false` |
| `null` | empty text |
| an object or a list | its JSON, for example `{"a":1}` or `[2,3]` |

- The separator goes only **between** the items, not before the first or after the last.
- An empty list gives the empty text `""`; a list with one item gives that item as text, without separator.
- A text is not a list: `"ab"` gives «Serve una lista» ("A list is needed").

## Examples

### 1. With the default separator

```
[Constant · Variable (JSON): ["Anna","Bruno","Carla"]] value ──▶ list [Join] text ──▶ value [Print (console.log)]
```

It writes `Anna, Bruno, Carla`.

### 2. Different types

The list `[1, null, true, {"a":1}, [2,3]]` gives `1, , true, {"a":1}, [2,3]` (the `null` leaves an empty place between two separators).

### 3. One line per item

With the **Separator** `\n`:

```
[Filter] result ──▶ list [Join: \n] text ──▶ value [Print (console.log)]
```

The console writes one item per line, in a single write.

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | The value on **list** is not a list. |

## See also

- [Split](coll.split), the opposite of this block
- [Concat text](core.concat), [Template string](core.format)
- [Map field](coll.pluck) to join only one field of each object
- [How a block works](ide/blocks)
