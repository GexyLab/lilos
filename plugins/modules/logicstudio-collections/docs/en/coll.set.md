# Set item

`coll.set` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Replaces the item at a position and sends the new list.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The starting list. It is not changed: the block makes a copy. |
| **index** (`index`) | number | The position to replace: 0 is the first, -1 the last. |
| **value** (`value`) | any | The value to put at that position. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | list | A copy of the list with the new value at the chosen position. It has the same length. |
| **Exception** (`error`) | object | Invalid list, index not an integer or outside the list. |

## How it works

The block waits until it has **list**, **index** and **value**. Then, at every new value on any of the three, it sends the list with the item replaced.

- The index is read as in [Get item](coll.get): from 0, negative from the end, `"2"` is worth 2, `""` and `null` are worth 0.
- You can only **replace** an item that exists: the index must be between 0 and length-1 (or between -1 and -length). To make the list longer use [Add item](coll.add) or [Insert at](coll.insert).
- On an empty list every index is outside the list.
- The value can be anything, even `null` or another list (which becomes one item, it is not "opened").
- The input list stays as it was: if it is also linked to other blocks, they still see the old one.

## Examples

### 1. Changing the second item

```
[Value (JSON): [1,2,3]] value ──▶ list  [Set item] result ──▶ value [Write to console]
[Value: 1]              value ──▶ index
[Value (text): x]       value ──▶ value
```

It writes `[1,"x",3]`.

### 2. The last item

With index `-1` and value `0` on the list `[5, 6, 7]` the result is `[5, 6, 0]`.

### 3. A list that updates itself

To keep a list and change one item at a time, send the result back into the [Memory](core.store):

```
[Memory] value ──▶ list  [Set item] result ──▶ set [Memory]
[Number field: position] value ──▶ index
[Text field: new name]   text  ──▶ value
```

Give the **set** input of the Memory the starting list as its starting value (for example `["Anna","Bruno","Carla"]`) and turn on **Send when set**; remove "starts it" from the block's **list** input, so the block runs only when the user types, and not again when the Memory sends back the list that has just changed.

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | The value on **list** is not a list. |
| Indice: serve un numero intero (Index: an integer is needed) | The index has a decimal part or is not a number. |
| Indice fuori dalla lista (Index outside the list) | The index does not match an item that exists. |

## See also

- [Get item](coll.get), [Insert at](coll.insert), [Remove at](coll.removeAt)
- [Set cell](coll.matSet) for a matrix
- [Memory](core.store)
- [How a block works](ide/blocks)
