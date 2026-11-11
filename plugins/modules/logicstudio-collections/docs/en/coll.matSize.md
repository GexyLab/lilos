# Shape

`coll.matSize` · Matrices · [Lists and matrices](logicstudio-collections) · version 1

Tells you how many rows and how many columns a matrix has. It is also useful to check that a value is a valid matrix.

## Inputs

| Port | Type | Description |
|---|---|---|
| **matrix** (`matrix`) | matrix | The matrix to measure. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **rows** (`rows`) | number | The number of rows. |
| **columns** (`cols`) | number | The number of columns. |
| **Exception** (`error`) | object | When the value is not a valid matrix. |

## How it works

At every matrix that arrives, the block sends **rows** and **columns**.

The value must be a valid matrix (see [Lists and matrices](logicstudio-collections)):

- a list with **at least one row**: `[]` gives «Serve una matrice» ("A matrix is needed");
- **every item is a list** (a row): `[1, 2]` gives «Serve una matrice»; so does a text or an object;
- **all rows have the same length**, at least 1: `[[1, 2], [3]]` gives «Le righe della matrice devono avere tutte la stessa lunghezza» ("The rows of the matrix must all have the same length"); `[[]]` (an empty row) gives the same message too.

The cells can contain any value: `[["a", null]]` is a 1 × 2 matrix.

## Examples

### 1. A 2 × 3 matrix

```
[Constant · Variable (JSON): [[1,2,3],[4,5,6]]] value ──▶ matrix [Shape] rows    ──▶ value [Print (console.log)]
                                                          columns ──▶ value [Print (console.log)]
```

The two consoles write `2` and `3`.

### 2. Rows of different length

With `[[1], [2, 3]]` nothing comes out on **rows** and **columns**, and «Shape: Le righe della matrice devono avere tutte la stessa lunghezza» ("Shape: The rows of the matrix must all have the same length") arrives on the **Exception** (or in the main console).

### 3. The last cell

To read the last cell you do not need the size: [Get m[r][c]](coll.matGet) accepts row -1 and column -1.

## Errors

| Message | When |
|---|---|
| Serve una matrice (A matrix is needed) | The value is not a list, is empty, or one of its items is not a list. |
| Le righe della matrice devono avere tutte la stessa lunghezza (The rows of the matrix must all have the same length) | The rows have different lengths, or the first row is empty. |

## See also

- [Length](coll.length) for a list
- [New matrix (fill)](coll.matNew), [Row m[r]](coll.matRow), [Column m[][c]](coll.matCol)
- [How a block works](ide/blocks)
