# Add item

`coll.add` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Adds a value to the end (or the start) of a list and sends the new list.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The starting list. It is not changed: the block makes a copy. |
| **value** (`value`) | any | The value to add. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | list | The list with one more item. |
| **Exception** (`error`) | object | Invalid list, or list too long. |

## Settings

| Setting | Values | Default | Description |
|---|---|---|---|
| **Where** (`where`) | `end`, `start` | `end` | `end`: the value goes at the end, after the last item. `start`: the value goes at the start, before the first. In the Properties list the two choices are shown with these internal names. |

## How it works

The block waits until it has both **list** and **value**. Then, for each new value on either of them, it sends a new list: the list that arrived plus the value.

- The value is added **as a single item**: adding `[3, 4]` to `[1, 2]` gives `[1, 2, [3, 4]]`, not `[1, 2, 3, 4]`. To join two lists use [Concatenate lists](coll.concat).
- `null` is a value too: added to `[]` it gives `[null]`.
- The input list stays as it was. **The block remembers nothing**: if you send it 1, then 2, then 3 with the same list `[]`, you get `[1]`, then `[2]`, then `[3]`. To collect values one after another use [Accumulate](coll.accumulate), or send the result back into a [Memory](core.store).
- The result can have at most 100000 items: if the list already has 100000, the output is «Lista troppo grande (massimo 100000 elementi)» ("List too big (maximum 100000 items)").

## Examples

### 1. At the end

```
[Value (JSON): ["mele","pere"]] value ──▶ list  [Add item] result ──▶ value [Write to console]
[Value (text): uva]             value ──▶ value
```

It writes `["mele","pere","uva"]`. With **Where** = `start` it would write `["uva","mele","pere"]`.

### 2. A shopping list that grows

```
[Memory (Send when set)] value ──▶ list  [Add item] result ──▶ set [Memory]
                                                    result ──▶ rows [Table]
[Text field] text ──▶ value
```

Give the **set** input of the Memory the starting value `[]`, and remove "starts it" from the **list** input of Add item. Every time the user types in the field, the entry goes to the end of the list and the [Table](ui.table) updates. If you do not remove "starts it", the list coming back from the Memory would run the block again with the same text, and the entry would repeat forever (until the program stops with «Troppe esecuzioni», "Too many runs").

> The [Text field](ui.text) sends the text when the user presses Enter or leaves the field, and only if it changed: to add the same entry twice, the user has to change it and then put it back.

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | The value on **list** is not a list. |
| Lista troppo grande (massimo 100000 elementi) (List too big, maximum 100000 items) | The result would have more than 100000 items. |

## See also

- [Insert at](coll.insert), [Concatenate lists](coll.concat), [Accumulate](coll.accumulate)
- [Build list](core.list) to make a list from separate values
- [How a block works](ide/blocks)
