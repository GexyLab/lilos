# Subtract matrices

`coll.matSubtract` · Matrices · [Lists and matrices](logicstudio-collections) · version 1

Subtracts the second matrix from the first, cell by cell.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** | matrix | The matrix to subtract from. Numbers only. |
| **b** | matrix | The matrix to subtract, with the same rows and columns as **a**. Numbers only. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | matrix | The matrix in which every cell is `a − b` at the same position. |
| **Exception** (`error`) | object | Invalid matrix, non-numeric cells, different sizes. |

## How it works

The block waits until it has **a** and **b**; then, at every new value on either of them, it sends the difference: the cell in row *i* and column *j* of the result is `a[i][j] − b[i][j]`. The order matters: **a − b** is not **b − a**.

The same rules as [Add matrices](coll.matAdd) apply:

- valid matrices, with **cells that are real numbers** (a text like `"2"` gives «La matrice deve contenere solo numeri» ("The matrix must contain only numbers"));
- same rows and columns, otherwise for example «Le matrici devono avere le stesse dimensioni (1×2 e 2×1)» ("The matrices must have the same size (1×2 and 2×1)");
- result not rounded.

## Examples

### 1. One row

```
[Value (JSON): [[5,5]]] value ──▶ a  [Subtract matrices] result ──▶ value [Write to console]
[Value (JSON): [[1,2]]] value ──▶ b
```

It writes `[[4,3]]`.

### 2. How much it changed

With the sales of two months by shop and product, **a** = `[[12,9],[14,7]]` (this month) and **b** = `[[10,9],[15,4]]` (the month before), the result `[[2,0],[-1,3]]` tells you by how much each sale grew (or fell).

### 3. Different sizes

**a** = `[[1,2]]` and **b** = `[[1],[2]]` give «Le matrici devono avere le stesse dimensioni (1×2 e 2×1)». To subtract a column from a row, first transpose with [Transpose](coll.matTranspose).

## Errors

| Message | When |
|---|---|
| Serve una matrice (A matrix is needed) | **a** or **b** is not a matrix. |
| Le righe della matrice devono avere tutte la stessa lunghezza (The rows of the matrix must all have the same length) | In **a** or **b** the rows have different lengths, or the first is empty. |
| La matrice deve contenere solo numeri (The matrix must contain only numbers) | A cell is not a number. |
| Le matrici devono avere le stesse dimensioni (R×C e R×C) (The matrices must have the same size (R×C and R×C)) | **a** and **b** have different rows or columns. |

## See also

- [Add matrices](coll.matAdd), [Scale](coll.matScale) (with factor -1 it changes the sign of all the cells)
- [How a block works](ide/blocks)
