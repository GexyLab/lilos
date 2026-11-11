# Reverse

`coll.reverse` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Sends the list backwards: the last item becomes the first.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The list to reverse. It is not changed: the block makes a copy. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | list | The same items in reverse order. |
| **Exception** (`error`) | object | When the value on **list** is not a list. |

## How it works

At every list that arrives, the block sends its copy backwards.

- It reverses only the first level: `[[1, 2], [3, 4]]` becomes `[[3, 4], [1, 2]]` (the inner lists stay as they are).
- An empty list gives `[]`, a one-item list gives the same list.
- It does not sort: to have the items from the biggest to the smallest use [Sort](coll.sort) with **Order** descending.
- A text is not a list: `"ciao"` gives «Serve una lista» ("A list is needed"). To reverse the letters, split the text with [Split text](coll.split) with an empty separator, reverse, and join again with [Join into text](coll.join) with an empty separator.

## Examples

### 1. A list of numbers

```
[Value (JSON): [1,2,3]] value ──▶ list [Reverse] result ──▶ value [Write to console]
```

It writes `[3,2,1]`.

### 2. The most recent readings on top

```
[Accumulate] list ──▶ list [Reverse] result ──▶ rows [Table]
```

[Accumulate](coll.accumulate) adds at the end; by reversing, the [Table](ui.table) shows the latest reading in the first row.

### 3. A word backwards

```
[Value (text): roma] value ──▶ text [Split text (empty separator)] result ──▶ list [Reverse] result ──▶ list [Join into text (empty separator)] text ──▶ value [Write to console]
```

It writes `amor`. In the separator of the two settings, delete the default text, leaving the box empty.

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | The value on **list** is not a list. |

## See also

- [Sort](coll.sort), [Slice](coll.slice)
- [How a block works](ide/blocks)
