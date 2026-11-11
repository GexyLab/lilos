# Get row

`coll.matRow` · Matrices · [Lists and matrices](logicstudio-collections) · version 1

Takes a whole row of a matrix, as a list.

## Inputs

| Port | Type | Description |
|---|---|---|
| **matrix** (`matrix`) | matrix | The matrix. |
| **row** (`row`) | number | The row to take: 0 is the first, -1 the last. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **row** (`row`) | list | A copy of the row: as many values as there are columns. |
| **Exception** (`error`) | object | Invalid matrix, row not an integer or outside the matrix. |

## How it works

The block waits until it has **matrix** and **row**; then, at every new value, it sends the chosen row.

- Rows are counted from 0; negatives count from the end (-1 is the last).
- Outside the matrix the output is «Indice fuori dalla lista» ("Index outside the list").
- The row must be an integer: `1.5` gives «Indice: serve un numero intero» ("Index: an integer is needed"). `"1"` is worth 1; `""` and `null` are worth 0.
- The output is a normal list: you can use it with all the list blocks (for example [Sum · Min · Max · Average](coll.stat) for the total of the row).

## Examples

### 1. The second row

```
[Value (JSON): [[1,2,3],[4,5,6]]] value ──▶ matrix [Get row] row ──▶ value [Write to console]
[Value: 1]                        value ──▶ row
```

It writes `[4,5,6]`. With row `-2` it writes `[1,2,3]`; with row `2` the output is «Indice fuori dalla lista».

### 2. The total of a row

```
[Get row] row ──▶ list [Sum · Min · Max · Average: sum] result ──▶ value [Value]
```

On the previous matrix, with row 0, it shows `6`.

## Errors

| Message | When |
|---|---|
| Serve una matrice (A matrix is needed) | The value on **matrix** is not a matrix. |
| Le righe della matrice devono avere tutte la stessa lunghezza (The rows of the matrix must all have the same length) | The rows have different lengths, or the first is empty. |
| Indice: serve un numero intero (Index: an integer is needed) | The row has a decimal part or is not a number. |
| Indice fuori dalla lista (Index outside the list) | The row is outside the matrix. |

## See also

- [Get column](coll.matCol), [Get cell](coll.matGet), [Flatten](coll.matFlatten)
- [Get item](coll.get): on a matrix it also gives the row, but without checking that the matrix is valid
- [How a block works](ide/blocks)
