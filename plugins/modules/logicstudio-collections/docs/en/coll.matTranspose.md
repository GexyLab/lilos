# Transpose

`coll.matTranspose` · Matrices · [Lists and matrices](logicstudio-collections) · version 1

Swaps rows and columns: the first row becomes the first column, the second row the second column, and so on.

## Inputs

| Port | Type | Description |
|---|---|---|
| **matrix** (`matrix`) | matrix | The matrix to transpose. It is not changed. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **matrix** (`matrix`) | matrix | The transpose: if the matrix has R rows and C columns, this one has C rows and R columns. |
| **Exception** (`error`) | object | When the value is not a valid matrix. |

## How it works

At every matrix that arrives, the block sends the transpose: the cell in row *i* and column *j* ends up in row *j* and column *i*.

- The cells can contain any value: numbers are not needed.
- Transposing twice gives back the starting matrix.
- A one-row matrix becomes a one-column matrix: `[[1, 2, 3]]` → `[[1], [2], [3]]`.
- The matrix must be valid (all rows of the same length): see [Size](coll.matSize).

## Examples

### 1. A 2 × 3 matrix

```
[Value (JSON): [[1,2,3],[4,5,6]]] value ──▶ matrix [Transpose] matrix ──▶ value [Write to console]
```

It writes `[[1,4],[2,5],[3,6]]` (3 × 2).

### 2. From columns of data to rows

If you have three lists of the same length, for example hours, temperatures and humidity, put them in a matrix (one list per row) with [Build list](core.list) and transpose: you get one row for each measurement, `[hour, temperature, humidity]`.

```
[Build list] list ──▶ matrix [Transpose] matrix ──▶ value [Write to console]
```

With `[[8,12,16],[18.5,23,21.5],[60,52,55]]` it writes `[[8,18.5,60],[12,23,52],[16,21.5,55]]`.

### 3. A column vector

`[[1, 2, 3]]` becomes `[[1], [2], [3]]`, which can be multiplied with [Multiply matrices](coll.matMultiply) on the right of a matrix with 3 columns.

## Errors

| Message | When |
|---|---|
| Serve una matrice (A matrix is needed) | The value is not a list, is empty, or one of its items is not a list. |
| Le righe della matrice devono avere tutte la stessa lunghezza (The rows of the matrix must all have the same length) | The rows have different lengths, or the first is empty. |

## See also

- [Multiply matrices](coll.matMultiply), [Get column](coll.matCol), [Size](coll.matSize)
- [How a block works](ide/blocks)
