# Scale

`coll.matScale` · Matrices · [Lists and matrices](logicstudio-collections) · version 1

Multiplies every cell of a matrix by the same number.

## Inputs

| Port | Type | Description |
|---|---|---|
| **matrix** (`matrix`) | matrix | The matrix. Numbers only. |
| **factor** (`factor`) | number | The number to multiply every cell by. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **matrix** (`matrix`) | matrix | The matrix with every cell multiplied by the factor. |
| **Exception** (`error`) | object | Non-numeric factor, invalid matrix or matrix with non-numeric cells. |

## How it works

The block waits until it has **matrix** and **factor**; then, at every new value, it sends the scaled matrix.

- The **factor** is converted to a number: `"0,5"` is worth 0.5, `true` is worth 1, `false` is worth 0. Careful: `""` and `null` are also worth **0**, and give a matrix of zeros. A text like `"doppio"` gives «Serve un numero» ("A number is needed").
- **The cells of the matrix, instead, must be real numbers**: a text like `"2"` gives «La matrice deve contenere solo numeri» ("The matrix must contain only numbers").
- The factor -1 changes the sign of all the cells; the factor 0 gives all zeros.
- The result is not rounded: `0.1 × 3` gives `0.30000000000000004`.

## Examples

### 1. Double

```
[Value (JSON): [[1,2,3],[4,5,6]]] value ──▶ matrix [Scale] matrix ──▶ value [Write to console]
[Value: 2]                        value ──▶ factor
```

It writes `[[2,4,6],[8,10,12]]`.

### 2. A factor written with a comma

With the factor `"0,5"` (for example from a [Text field](ui.text)) the same matrix gives `[[0.5,1,1.5],[2,2.5,3]]`.

### 3. From centimeters to meters

A matrix of measurements in centimeters, `[[120, 85], [200, 150]]`, with factor `0.01` gives `[[1.2, 0.85], [2, 1.5]]`.

## Errors

| Message | When |
|---|---|
| Serve un numero (A number is needed) | The factor cannot be converted to a number. |
| Serve una matrice (A matrix is needed) | The value on **matrix** is not a matrix. |
| Le righe della matrice devono avere tutte la stessa lunghezza (The rows of the matrix must all have the same length) | The rows have different lengths, or the first is empty. |
| La matrice deve contenere solo numeri (The matrix must contain only numbers) | A cell is not a number. |

## See also

- [Add matrices](coll.matAdd), [Subtract matrices](coll.matSubtract), [Multiply matrices](coll.matMultiply)
- [How a block works](ide/blocks)
