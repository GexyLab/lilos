# Set m[r][c]

`coll.matSet` · Matrices · [Lists and matrices](logicstudio-collections) · version 1

Changes the value of a cell and sends the new matrix.

## Inputs

| Port | Type | Description |
|---|---|---|
| **matrix** (`matrix`) | matrix | The starting matrix. It is not changed: the block makes a copy. |
| **row** (`row`) | number | The row: 0 is the first, -1 the last. |
| **column** (`col`) | number | The column: 0 is the first, -1 the last. |
| **value** (`value`) | any | The value to put in the cell. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **matrix** (`matrix`) | matrix | A copy of the matrix with the cell changed. It has the same size. |
| **Exception** (`error`) | object | Invalid matrix, row or column not integers or outside the matrix. |

## How it works

The block waits until it has all four inputs; then, at every new value, it sends the matrix with the cell changed.

- Rows and columns are counted from 0; negatives count from the end (as in [Get m[r][c]](coll.matGet)).
- You can only change a cell that exists: the matrix does not grow. Outside, the output is «Indice fuori dalla lista» ("Index outside the list").
- The value can be anything, even a text or `null`. A matrix with non-numeric cells is not fine for calculations, though (A + B, A × B, Scale (k·A), Det).
- The input matrix stays as it was: if it also goes to other blocks, they see the old one. To keep the changed matrix, send it back into a [Store (set · get)](core.store).

## Examples

### 1. A cell

```
[Constant · Variable (JSON): [[1,2,3],[4,5,6]]] value ──▶ matrix [Set m[r][c]] matrix ──▶ value [Print (console.log)]
[Constant · Variable: 0]                        value ──▶ row
[Constant · Variable: 0]                        value ──▶ column
[Constant · Variable: 9]                        value ──▶ value
```

It writes `[[9,2,3],[4,5,6]]`.

### 2. The last cell

On the same matrix, row `-1`, column `-1` and value `"x"` give `[[1,2,3],[4,5,"x"]]`. Row `5` gives «Indice fuori dalla lista».

### 3. A game grid

```
[Store (set · get): Send when set] value ──▶ matrix [Set m[r][c]] matrix ──▶ set [Store (set · get)]
                                                     matrix ──▶ rows [Table]
[Number field: row]    value ──▶ row
[Number field: column] value ──▶ column
[Constant · Variable (text): X]      value ──▶ value
```

Give the **set** input of the Store (set · get) block the starting matrix (for example made with [New matrix (fill)](coll.matNew) 3 × 3 of `"-"`) and remove "starts it" from **matrix**. At every row and column pair the X goes into the cell. The [Table](ui.table) shows one line for each row of the grid, written as a list (for example `["X","-","-"]`): the Table splits into columns only rows made of objects.

## Errors

| Message | When |
|---|---|
| Serve una matrice (A matrix is needed) | The value on **matrix** is not a matrix. |
| Le righe della matrice devono avere tutte la stessa lunghezza (The rows of the matrix must all have the same length) | The rows have different lengths, or the first is empty. |
| Indice: serve un numero intero (Index: an integer is needed) | Row or column have a decimal part or are not numbers. |
| Indice fuori dalla lista (Index outside the list) | Row or column outside the matrix. |

## See also

- [Get m[r][c]](coll.matGet), [New matrix (fill)](coll.matNew)
- [Set list[i]](coll.set) for a list
- [How a block works](ide/blocks)
