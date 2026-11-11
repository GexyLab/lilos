# Insert at

`coll.insert` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Puts a value at a position of the list, moving the following ones forward, and sends the new list.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The starting list. It is not changed: the block makes a copy. |
| **index** (`index`) | number | The position the new value will have: 0 = at the start, the length of the list = at the end. A negative number counts from the end. |
| **value** (`value`) | any | The value to insert. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | list | The list with one more item. |
| **Exception** (`error`) | object | Invalid list, index not an integer or outside the list, list too long. |

## How it works

The block waits until it has **list**, **index** and **value**, then at every new value it sends the list with the value inserted. The new value takes the place of the index and the items from there on move by one.

With a list of length N the valid indexes are **from 0 to N** (one more than in the other blocks, because you can also insert after the last):

| Index | Where the value ends up |
|---|---|
| 0 | at the start |
| 1 … N-1 | before the item that was at that position |
| N | at the end (like [Add item](coll.add)) |
| -1 | **before the last**, not at the end |
| -N | at the start |
| more than N, less than -N | error «Indice fuori dalla lista» ("Index outside the list") |

- On an empty list the only valid index is 0 (also `-0`).
- The index is read as in [Get item](coll.get): `"2"` is worth 2, `""` and `null` are worth 0, `1.5` is an error.
- The value is inserted as a single item: inserting a list does not "open" it.
- The result can have at most 100000 items.

## Examples

### 1. In the middle

```
[Value (JSON): ["a","b","c"]] value ──▶ list  [Insert at] result ──▶ value [Write to console]
[Value: 1]                    value ──▶ index
[Value (text): X]             value ──▶ value
```

It writes `["a","X","b","c"]`.

### 2. At the end and before the last

On the list `[1, 2, 3]` with value `"x"`:

- index `3` → `[1, 2, 3, "x"]`
- index `-1` → `[1, 2, "x", 3]`
- index `-3` → `["x", 1, 2, 3]`
- index `4` → error «Indice fuori dalla lista»

### 3. Empty list

On `[]` with index `0` and value `5` the result is `[5]`; with index `1` it is the error «Indice fuori dalla lista».

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | The value on **list** is not a list. |
| Indice: serve un numero intero (Index: an integer is needed) | The index has a decimal part or is not a number. |
| Indice fuori dalla lista (Index outside the list) | The index is greater than the length or less than -length. |
| Lista troppo grande (massimo 100000 elementi) (List too big, maximum 100000 items) | The result would have more than 100000 items. |

## See also

- [Add item](coll.add), [Set item](coll.set), [Remove at](coll.removeAt)
- [How a block works](ide/blocks)
