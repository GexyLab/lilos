# Concat lists

`coll.concat` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Puts two or more lists in a row and makes one list out of them.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** | list | The first list. |
| **b** | list | The second list, put after **a**. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | list | The items of **a**, then those of **b**, then those of the added inputs, in order. |
| **Exception** (`error`) | object | An input is not a list, or the result is too long. |

## Extra ports

In the **Properties**, **Ports** section, you can add up to 16 more inputs, of type list, named with the letters that follow (**c**, **d**, **e**…). They are shown in italics on the block. Their lists go at the end, in the order of the inputs in the Properties. See [How a block works](ide/blocks).

## How it works

At every new value on an input, the block redoes the join with the latest value of each input.

- **No input is required**: inputs that have not received anything yet are skipped. With only **a** = `[1, 2]` the result is `[1, 2]`; with only **b** = `[3]` it is `[3]`.
- Every input that has a value must have a list: a text, a number or an object gives «Serve una lista» ("A list is needed") and no result.
- Lists are joined **one level deep**: `[[1]]` and `[[2]]` give `[[1], [2]]`, not `[1, 2]`.
- Empty lists add nothing.
- Duplicate items stay: to remove them use [Distinct](coll.unique).
- The result can have at most 100000 items.

## Examples

### 1. Two lists

```
[Constant · Variable (JSON): [1,2]] value ──▶ a  [Concat lists] result ──▶ value [Print (console.log)]
[Constant · Variable (JSON): [3]]   value ──▶ b
```

At start the block runs twice: it writes `[1,2]` (only **a** is there) and then `[1,2,3]`.

> To get only the final result, remove "starts it" from the **a** input: the block runs when **b** arrives.

### 2. Three lists with an added input

Add the **c** input in the Properties:

```
[Constant · Variable (JSON): ["lun","mar"]]  value ──▶ a  [Concat lists] result ──▶ items [List]
[Constant · Variable (JSON): ["mer"]]        value ──▶ b
[Constant · Variable (JSON): ["gio","ven"]]  value ──▶ c
```

In the end the [List](ui.list) shows `lun, mar, mer, gio, ven`.

### 3. Rows of two matrices one under the other

A [matrix](logicstudio-collections) is a list of rows: joining `[[1,2]]` and `[[3,4],[5,6]]` gives `[[1,2],[3,4],[5,6]]`, that is the rows of the second under those of the first. The IDE flags the matrix → list link, but it works. The rows must have the same length for the result to still be a matrix.

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | An input has a value that is not a list. |
| Lista troppo grande (massimo 100000 elementi) (List too big, maximum 100000 items) | The join would have more than 100000 items. |

## See also

- [Push · Unshift](coll.add), [Slice](coll.slice), [Distinct](coll.unique)
- [Concat text](core.concat) to join texts
- [Array literal [ ]](core.list) to make a list from separate values
- [How a block works](ide/blocks)
