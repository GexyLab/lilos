# Slice

`coll.slice` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Takes a piece of a list: the items from one position to another (the latter excluded).

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The list to take the piece from. It is not changed. |
| **from** (`from`) | number | The position of the first item to take. Optional: if nothing arrives it is 0 (from the start). |
| **to (excluded)** (`to`) | number | The position **after** the last item to take. Optional: if nothing arrives it is the length of the list (up to the end). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | list | The piece of the list: it can be empty. |
| **Exception** (`error`) | object | Invalid list, **from** or **to** not integers. |

## How it works

The **list** alone is enough for the block to run: **from** and **to (excluded)** are optional. Every new value on any of the three inputs makes the block run again with the latest values.

The piece contains the items with position from **from** up to **to** − 1. Example with `[10, 20, 30, 40, 50]`:

| from | to (excluded) | result |
|---|---|---|
| — | — | `[10, 20, 30, 40, 50]` (all of it) |
| 1 | 3 | `[20, 30]` |
| 0 | 2 | `[10, 20]` (the first two) |
| -2 | — | `[40, 50]` (the last two) |
| 1 | -1 | `[20, 30, 40]` (without the first and the last) |
| 3 | 1 | `[]` (from after to: nothing) |
| 10 | — | `[]` (past the end) |
| -100 | 100 | `[10, 20, 30, 40, 50]` |

Unlike [Get list[i]](coll.get), **here a position outside the list is not an error**: it is brought to the nearest limit (the start or the end). A negative number counts from the end, as in the other blocks.

How **from** and **to** are read:

- they must be integers: `1.5` gives «Da: serve un numero intero» ("From: an integer is needed") (or «A: serve un numero intero» ("To: an integer is needed"));
- `"2"` is worth 2, `true` is worth 1;
- `""` and `null` are worth **0**. Careful: `null` on **to (excluded)** therefore gives an empty slice, not "up to the end". For "up to the end" do not send anything to **to**.

## Examples

### 1. The first three

```
[Constant · Variable (JSON): ["a","b","c","d","e"]] value ──▶ list         [Slice] result ──▶ value [Print (console.log)]
[Constant · Variable: 3]                            value ──▶ to (excluded)
```

It writes `["a","b","c"]` (**from** does not arrive and is 0).

> The block already runs when the list arrives, before the 3: the console also writes the whole list. Remove "starts it" from **list** to get a single line.

### 2. The last 10 values

Give the **from** input the starting value `-10`:

```
[Accumulate (bounded push): max 1000] list ──▶ list [Slice (from = -10)] result ──▶ data [Lines]
```

The [Lines](charts.line) chart always shows the last 10 values collected; until fewer than 10 have arrived, it shows them all.

### 3. Pages of a table

With 20 rows per page, page *n* (from 0) goes from `n × 20` to `n × 20 + 20`. Calculate the two numbers with [Multiply (×)](core.multiply) and [Add (+)](core.add) and link them to **from** and **to (excluded)**: past the last page the result is `[]`, without errors.

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | The value on **list** is not a list. |
| Da: serve un numero intero (From: an integer is needed) | **from** has a decimal part or is not a number. |
| A: serve un numero intero (To: an integer is needed) | **to (excluded)** has a decimal part or is not a number. |

## See also

- [Get list[i]](coll.get), [Remove (splice)](coll.removeAt), [Concat lists](coll.concat)
- [How a block works](ide/blocks)
