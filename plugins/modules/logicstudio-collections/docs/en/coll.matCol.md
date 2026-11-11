# Column m[][c]

`coll.matCol` · Matrices · [Lists and matrices](logicstudio-collections) · version 1

Takes a whole column of a matrix, as a list: the value of that column in every row.

## Inputs

| Port | Type | Description |
|---|---|---|
| **matrix** (`matrix`) | matrix | The matrix. |
| **column** (`col`) | number | The column to take: 0 is the first, -1 the last. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **column** (`col`) | list | The values of the column, from the first row to the last: as many as there are rows. |
| **Exception** (`error`) | object | Invalid matrix, column not an integer or outside the matrix. |

## How it works

The block waits until it has **matrix** and **column**; then, at every new value, it sends the chosen column.

- Columns are counted from 0; negatives count from the end (-1 is the last).
- Outside the matrix the output is «Indice fuori dalla lista» ("Index outside the list").
- The column must be an integer: `0.5` gives «Indice: serve un numero intero» ("Index: an integer is needed"). `"1"` is worth 1; `""` and `null` are worth 0.
- The output is a normal list: you can use it with all the list blocks.

## Examples

### 1. The second column

```
[Constant · Variable (JSON): [[1,2,3],[4,5,6]]] value ──▶ matrix [Column m[][c]] column ──▶ value [Print (console.log)]
[Constant · Variable: 1]                        value ──▶ column
```

It writes `[2,5]`. With column `-1` it writes `[3,6]`; with column `3` the output is «Indice fuori dalla lista».

### 2. The average of a column of measurements

A matrix in which every row is `[hour, temperature, humidity]`:

```
[Constant · Variable (JSON): [[8,18.5,60],[12,23,52],[16,21.5,55]]] value ──▶ matrix [Column m[][c]] column ──▶ list [Sum · Min · Max · Avg: average] result ──▶ value [Value]
[Constant · Variable: 1]                                            value ──▶ column
```

It shows the average temperature: 21. With column 2, the average humidity: 55.666…

## Errors

| Message | When |
|---|---|
| Serve una matrice (A matrix is needed) | The value on **matrix** is not a matrix. |
| Le righe della matrice devono avere tutte la stessa lunghezza (The rows of the matrix must all have the same length) | The rows have different lengths, or the first is empty. |
| Indice: serve un numero intero (Index: an integer is needed) | The column has a decimal part or is not a number. |
| Indice fuori dalla lista (Index outside the list) | The column is outside the matrix. |

## See also

- [Row m[r]](coll.matRow), [Get m[r][c]](coll.matGet), [Transpose](coll.matTranspose)
- [Map field](coll.pluck) with a number as the field does the same on any list of lists
- [How a block works](ide/blocks)
