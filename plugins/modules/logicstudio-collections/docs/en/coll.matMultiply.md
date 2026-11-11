# Multiply matrices

`coll.matMultiply` · Matrices · [Lists and matrices](logicstudio-collections) · version 1

Makes the rows-by-columns product of two matrices (the "mathematical" product, not cell by cell).

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** | matrix | The left matrix. Numbers only. |
| **b** | matrix | The right matrix: it must have as many rows as **a** has columns. Numbers only. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | matrix | The product: it has the rows of **a** and the columns of **b**. |
| **Exception** (`error`) | object | Invalid matrix, non-numeric cells, sizes that cannot be multiplied, result too big. |

## How it works

The block waits until it has **a** and **b**; then, at every new value on either of them, it sends the product.

**How it is calculated.** If **a** is R × K and **b** is K × C, the result is R × C. The cell in row *i* and column *j* is the sum of the products of row *i* of **a** by column *j* of **b**: `a[i][0]×b[0][j] + a[i][1]×b[1][j] + …`.

- **The order matters**: in general **a × b** is not **b × a**, and the sizes may allow only one of the two.
- The columns of **a** must be as many as the rows of **b**, otherwise you get for example «Prodotto impossibile: le colonne di A (3) devono essere quante le righe di B (2)» ("Product impossible: the columns of A (3) must be as many as the rows of B (2)").
- **The cells must be real numbers**: a text like `"2"` gives «La matrice deve contenere solo numeri» ("The matrix must contain only numbers").
- The result can have at most 100000 cells (R × C), otherwise «Matrice troppo grande (massimo 100000 celle)» ("Matrix too big (maximum 100000 cells)").
- The result is not rounded.
- There is no block to multiply cell by cell; to multiply all the cells by a number use [Scale](coll.matScale).

## Examples

### 1. 2 × 3 by 3 × 2

```
[Value (JSON): [[1,2,3],[4,5,6]]]     value ──▶ a  [Multiply matrices] result ──▶ value [Write to console]
[Value (JSON): [[1,0],[0,1],[1,1]]]   value ──▶ b
```

It writes `[[4,5],[10,11]]`. For example the first cell is `1×1 + 2×0 + 3×1 = 4`.

### 2. Row by column, column by row

- **a** = `[[1,2]]` (1 × 2), **b** = `[[3],[4]]` (2 × 1): result `[[11]]` (1 × 1), that is 1×3 + 2×4.
- Swapping them, **a** = `[[3],[4]]`, **b** = `[[1,2]]`: result `[[3,6],[4,8]]` (2 × 2).

### 3. Wrong sizes

**a** = `[[1,2,3],[4,5,6]]` by itself gives «Prodotto impossibile: le colonne di A (3) devono essere quante le righe di B (2)». With **b** linked through a [Transpose](coll.matTranspose) the product can be made: `[[14,32],[32,77]]`.

### 4. Rotating a point

The matrix `[[0,-1],[1,0]]` rotates by 90° counterclockwise: with **a** = `[[0,-1],[1,0]]` and **b** = `[[3],[1]]` (the point x 3, y 1 as a column) the result is `[[-1],[3]]`, that is the point x -1, y 3.

## Errors

| Message | When |
|---|---|
| Serve una matrice (A matrix is needed) | **a** or **b** is not a matrix. |
| Le righe della matrice devono avere tutte la stessa lunghezza (The rows of the matrix must all have the same length) | In **a** or **b** the rows have different lengths, or the first is empty. |
| La matrice deve contenere solo numeri (The matrix must contain only numbers) | A cell is not a number. |
| Prodotto impossibile: le colonne di A (K) devono essere quante le righe di B (N) (Product impossible: the columns of A (K) must be as many as the rows of B (N)) | The columns of **a** are not as many as the rows of **b**. |
| Matrice troppo grande (massimo 100000 celle) (Matrix too big, maximum 100000 cells) | The result would have more than 100000 cells. |

## See also

- [Transpose](coll.matTranspose), [Identity](coll.matIdentity), [Scale](coll.matScale), [Determinant](coll.matDet)
- [How a block works](ide/blocks)
