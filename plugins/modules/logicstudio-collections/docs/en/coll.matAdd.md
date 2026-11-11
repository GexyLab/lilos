# Add matrices

`coll.matAdd` · Matrices · [Lists and matrices](logicstudio-collections) · version 1

Adds two matrices of the same size, cell by cell.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** | matrix | The first matrix. Numbers only. |
| **b** | matrix | The second matrix, with the same rows and columns as **a**. Numbers only. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | matrix | The matrix in which every cell is the sum of the cells at the same position of **a** and **b**. |
| **Exception** (`error`) | object | Invalid matrix, non-numeric cells, different sizes. |

## How it works

The block waits until it has **a** and **b**; then, at every new value on either of them, it sends the sum: the cell in row *i* and column *j* of the result is `a[i][j] + b[i][j]`.

- Both must be valid matrices (see [Size](coll.matSize)).
- **The cells must be real numbers**: a text like `"2"` gives «La matrice deve contenere solo numeri» ("The matrix must contain only numbers") (unlike the list blocks, here texts are not converted). `null`, `true` and empty cells give the same error too.
- The two matrices must have the same rows and columns, otherwise you get for example «Le matrici devono avere le stesse dimensioni (2×3 e 2×2)» ("The matrices must have the same size (2×3 and 2×2)").
- The result is not rounded: `0.1 + 0.2` gives `0.30000000000000004`.

## Examples

### 1. Two 2 × 3 matrices

```
[Value (JSON): [[1,2,3],[4,5,6]]]       value ──▶ a  [Add matrices] result ──▶ value [Write to console]
[Value (JSON): [[10,20,30],[40,50,60]]] value ──▶ b
```

It writes `[[11,22,33],[44,55,66]]`.

### 2. Different sizes

With **a** = `[[1,2,3],[4,5,6]]` and **b** = `[[1,2],[3,4]]` no result comes out and the error «Le matrici devono avere le stesse dimensioni (2×3 e 2×2)» arrives.

### 3. A text in a cell

With **a** = `[[1,"2"]]` and **b** = `[[1,2]]` the output is «La matrice deve contenere solo numeri». If the numbers arrive as text (for example from [Split text](coll.split)), convert them first one by one or build the matrix from numbers.

## Errors

| Message | When |
|---|---|
| Serve una matrice (A matrix is needed) | **a** or **b** is not a matrix. |
| Le righe della matrice devono avere tutte la stessa lunghezza (The rows of the matrix must all have the same length) | In **a** or **b** the rows have different lengths, or the first is empty. |
| La matrice deve contenere solo numeri (The matrix must contain only numbers) | A cell is not a number. |
| Le matrici devono avere le stesse dimensioni (R×C e R×C) (The matrices must have the same size (R×C and R×C)) | **a** and **b** have different rows or columns; in place of R and C there are the real sizes. |

## See also

- [Subtract matrices](coll.matSubtract), [Scale](coll.matScale), [Multiply matrices](coll.matMultiply)
- [How a block works](ide/blocks)
