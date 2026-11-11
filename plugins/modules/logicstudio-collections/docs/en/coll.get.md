# Get list[i]

`coll.get` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Takes the item at a position of the list.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The list to take the item from. |
| **index** (`index`) | number | The position: 0 is the first, 1 the second… A negative number counts from the end: -1 is the last. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **item** (`item`) | any | The item at that position, as it is (number, text, object, list, `null`…). |
| **Exception** (`error`) | object | When the list is not a list, the index is not an integer, or it is outside the list. |

## How it works

The block waits until it has both **list** and **index**: while one is missing it does nothing (and reports no errors). Then, at every new value on either of them, it sends the item with the latest list and the latest index.

**Indexes start at 0.** With a list of length N:

| Index | Item |
|---|---|
| 0 … N-1 | from the first to the last |
| -1 … -N | from the last to the first (-1 is the last, -N the first) |
| N or more, -N-1 or less | error «Indice fuori dalla lista» ("Index outside the list") |

How the index is read:

- An integer is fine as it is: `2`.
- A text that contains a number is fine: `"2"`; also with the decimal comma, `"1,0"` is worth 1.
- `true` is worth 1, `false` is worth 0.
- An empty text `""` and `null` are worth **0** (the first item), they are not an error.
- A number with a decimal part (`1.5`) or a text that is not a number (`"due"`) give «Indice: serve un numero intero» ("Index: an integer is needed").

Other cases:

- On an empty list every index gives «Indice fuori dalla lista».
- If the item is `null`, `null` comes out on **item**.
- If the list changes and the latest index is too big for the new list, the error comes out: the index does not adapt by itself.

## Examples

### 1. The second item

```
[Constant · Variable (JSON): [10,20,30]] value ──▶ list  [Get list[i]] item ──▶ value [Print (console.log)]
[Constant · Variable: 1]                 value ──▶ index
```

It writes `20` (index 1 is the second item). If you put `3` in the Constant · Variable block instead of `1`, «Leggi lista[i]: Indice fuori dalla lista» ("Get list[i]: Index outside the list") appears in the main console.

### 2. The last item, whatever the length

Give the **index** input the starting value `-1` (in the block's Properties):

```
[Accumulate (bounded push)] list ──▶ list [Get list[i] (starting index -1)] item ──▶ value [Value: last reading]
```

Every time [Accumulate (bounded push)](coll.accumulate) sends the updated list, the block sends the last value added.

### 3. An entry chosen from a list

```
[Constant · Variable (JSON): ["Lunedì","Martedì","Mercoledì"]] value ──▶ list  [Get list[i]] item ──▶ value [Value]
[Number field: day]                              value ──▶ index
```

With 0 in the [Number field](ui.number) you see «Lunedì», with 2 «Mercoledì», with -1 «Mercoledì» again, with 3 nothing changes and the error goes to the main console (or to the **Exception**, if it is linked).

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | The value on **list** is not a list. |
| Indice: serve un numero intero (Index: an integer is needed) | The index has a decimal part (`1.5`) or is not a number. |
| Indice fuori dalla lista (Index outside the list) | The index is ≥ the length, or < -length, or the list is empty. |

## See also

- [Set list[i]](coll.set), [Remove (splice)](coll.removeAt), [Slice](coll.slice)
- [Includes · IndexOf](coll.contains) to find the index of a value
- [Get property](core.get) for a field of an object
- [Get m[r][c]](coll.matGet) for a matrix
- [How a block works](ide/blocks)
