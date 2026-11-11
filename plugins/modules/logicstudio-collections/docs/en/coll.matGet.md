# Get cell

`coll.matGet` · Matrices · [Lists and matrices](logicstudio-collections) · version 1

Takes the value of a cell of the matrix, given the row and the column.

## Inputs

| Port | Type | Description |
|---|---|---|
| **matrix** (`matrix`) | matrix | The matrix. |
| **row** (`row`) | number | The row: 0 is the first, -1 the last. |
| **column** (`col`) | number | The column: 0 is the first, -1 the last. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The content of the cell. |
| **Exception** (`error`) | object | Invalid matrix, row or column not integers or outside the matrix. |

## How it works

The block waits until it has **matrix**, **row** and **column**; then, at every new value, it sends the content of the cell.

- Rows and columns are counted **from 0**, like list indexes. In a 2 × 3 matrix the rows go from 0 to 1 and the columns from 0 to 2.
- Negative numbers count from the end: row -1 is the last, column -3 (in a matrix of 3 columns) is the first.
- Outside the matrix the output is «Indice fuori dalla lista» ("Index outside the list") (the message says "list" here too).
- Row and column must be integers: `0.5` gives «Indice: serve un numero intero» ("Index: an integer is needed"). `"1"` is worth 1; `""` and `null` are worth 0.
- The matrix must be valid (all rows of the same length): see [Size](coll.matSize).
- If the cell contains `null`, `null` comes out.

## Examples

### 1. A cell

```
[Value (JSON): [[1,2,3],[4,5,6]]] value ──▶ matrix [Get cell] value ──▶ value [Write to console]
[Value: 1]                        value ──▶ row
[Value: 2]                        value ──▶ column
```

It writes `6` (second row, third column).

### 2. From the end

On the same matrix, row `-1` and column `-3` give `4` (last row, first column). Row `2` gives «Indice fuori dalla lista».

### 3. A multiplication table

```
[Number field: row]    value ──▶ row    [Get cell] value ──▶ value [Value]
[Number field: column] value ──▶ column
[Value (JSON): [[1,2,3],[2,4,6],[3,6,9]]] value ──▶ matrix
```

Typing 2 in the **row** field and 1 in the **column** field makes the [Value](ui.value) show `6`. To count from 1 in the fields, subtract 1 with [Subtract](core.subtract) before **row** and **column**.

## Errors

| Message | When |
|---|---|
| Serve una matrice (A matrix is needed) | The value on **matrix** is not a matrix. |
| Le righe della matrice devono avere tutte la stessa lunghezza (The rows of the matrix must all have the same length) | The rows have different lengths, or the first is empty. |
| Indice: serve un numero intero (Index: an integer is needed) | Row or column have a decimal part or are not numbers. |
| Indice fuori dalla lista (Index outside the list) | Row or column outside the matrix. |

## See also

- [Set cell](coll.matSet), [Get row](coll.matRow), [Get column](coll.matCol)
- [Get item](coll.get) for a list
- [How a block works](ide/blocks)
