# Remove (splice)

`coll.removeAt` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Takes out the item at a position: it sends the list without that item and, separately, the removed item.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The starting list. It is not changed: the block makes a copy. |
| **index** (`index`) | number | The position to remove: 0 is the first, -1 the last. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | list | The list with one item less. |
| **removed** (`removed`) | any | The removed item. |
| **Exception** (`error`) | object | Invalid list, index not an integer or outside the list. |

## How it works

The block waits until it has **list** and **index**, then at every new value it sends on **result** the list without the item and on **removed** the removed item. The items that follow move back by one.

- Valid indexes are as in [Get list[i]](coll.get): from 0 to length-1, or from -1 to -length.
- On an empty list every index gives «Indice fuori dalla lista» ("Index outside the list").
- Removing the only item gives the empty list `[]`.
- If the removed item is `null`, `null` comes out on **removed**.
- The block removes **by position**. To remove all the items equal to a value use [Filter](coll.filter) with "a ≠ b".

## Examples

### 1. Removing the last

```
[Constant · Variable (JSON): [1,2,3]] value ──▶ list  [Remove (splice)] result  ──▶ value [Print (console.log)]
[Constant · Variable: -1]             value ──▶ index             removed ──▶ value [Print (console.log)]
```

The two consoles write `[1,2]` and `3`.

### 2. A queue: first come, first served

```
[Store (set · get): Send when set] value ──▶ list  [Remove (splice)] result ──▶ set [Store (set · get)]
[Button: Next] pressed ──▶ send [Constant · Variable: 0] value ──▶ index    removed ──▶ value [Print (console.log)]
```

Give the **set** input of the Store (set · get) block the starting value `["Anna","Bruno","Carla"]`, remove "starts it" from the **list** input and, in the Properties, show the **send** input of the [Constant · Variable](core.value) with its eye and link the Button to it: the block then sends only on the pulse, not at the start. At every click on the [Button](ui.button) the Constant · Variable sends 0 on **index**: the console writes `Anna`, then `Bruno`, then `Carla`, and the Store block keeps who is left. At the fourth click the queue is empty and the output is «Indice fuori dalla lista».

### 3. Removing a value by searching for it

```
[Constant · Variable (JSON): ["a","b","c"]] value ──▶ list  [Includes · IndexOf] index ──▶ index [Remove (splice)] result ──▶ value [Print (console.log)]
[Constant · Variable (text): b]             value ──▶ value
[Constant · Variable (JSON): ["a","b","c"]] value ──▶ list [Remove (splice)]
```

(The same Constant · Variable block linked to two blocks.) [Includes · IndexOf](coll.contains) finds `b` at position 1 and the console writes `["a","c"]`. Careful: if you look for a value that is not there (`z`), the index is -1 and the block removes the **last** item (`["a","b"]`). Check **found** first, for example with [If · Else](core.if), or use [Filter](coll.filter) with "a ≠ b", which removes all the equal items and does not go wrong if the value is missing.

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | The value on **list** is not a list. |
| Indice: serve un numero intero (Index: an integer is needed) | The index has a decimal part or is not a number. |
| Indice fuori dalla lista (Index outside the list) | The index does not match an item that exists. |

## See also

- [Insert (splice)](coll.insert), [Set list[i]](coll.set), [Filter](coll.filter), [Slice](coll.slice)
- [How a block works](ide/blocks)
