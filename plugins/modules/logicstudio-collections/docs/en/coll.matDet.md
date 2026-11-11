# Det

`coll.matDet` · Matrices · [Lists and matrices](logicstudio-collections) · version 1

Calculates the determinant of a square matrix, up to 10 × 10.

## Inputs

| Port | Type | Description |
|---|---|---|
| **matrix** (`matrix`) | matrix | A square matrix (as many rows as columns), from 1 × 1 to 10 × 10. Numbers only. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **determinant** (`det`) | number | The determinant. |
| **Exception** (`error`) | object | Invalid matrix, not square, too big, or with non-numeric cells. |

## How it works

At every matrix that arrives, the block calculates the determinant and sends it on **determinant**.

- The matrix must be **square**: `[[1,2,3]]` gives «La matrice deve essere quadrata» ("The matrix must be square").
- At most **10 × 10**: an 11 × 11 matrix gives «Determinante: al massimo 10×10» ("Det: 10×10 at most").
- **The cells must be real numbers**: a text like `"2"` gives «La matrice deve contenere solo numeri» ("The matrix must contain only numbers").
- The determinant of a 1 × 1 matrix is its only value.
- The calculation uses Gaussian elimination (with row swaps for precision) and rounds the result to 12 significant digits, so `[[0.1,0.2],[0.3,0.4]]` gives `-0.02` and not `-0.020000000000000004`.

**Precision.** The calculation is done with the computer's floating-point numbers: a matrix whose determinant is exactly 0 may give a tiny number instead of 0. For example `[[1,2,3],[4,5,6],[7,8,9]]` (determinant 0) gives `6.66133814775e-16`. To know whether a matrix is "singular", compare the absolute value of the result with a small threshold (for example 1e-9) instead of comparing it with 0. With very large numbers the result can become `Infinity`, with very small numbers 0.

## Examples

### 1. A 2 × 2 matrix

```
[Constant · Variable (JSON): [[1,2],[3,4]]] value ──▶ matrix [Det] determinant ──▶ value [Print (console.log)]
```

It writes `-2` (1×4 − 2×3).

### 2. A diagonal matrix and a row swap

- `[[2,0,0],[0,3,0],[0,0,4]]` → `24` (the product of the diagonal);
- `[[0,1],[1,0]]` → `-1`;
- `[[1,2],[2,4]]` → `0` (the second row is twice the first).

### 3. Does the system have only one solution?

A system of linear equations has only one solution when the determinant of the coefficient matrix is not 0:

```
[Constant · Variable (JSON): [[2,1],[1,3]]] value ──▶ matrix [Det] determinant ──▶ value [Math functions: absolute value] result ──▶ a [Compare (== != < >): a > b] result ──▶ on [Lamp]
                                                                                                                [Constant · Variable: 1e-9] value ──▶ b
```

The determinant is 5: the [Lamp](ui.lamp) turns on.

## Errors

| Message | When |
|---|---|
| Serve una matrice (A matrix is needed) | The value is not a matrix. |
| Le righe della matrice devono avere tutte la stessa lunghezza (The rows of the matrix must all have the same length) | The rows have different lengths, or the first is empty. |
| La matrice deve contenere solo numeri (The matrix must contain only numbers) | A cell is not a number. |
| La matrice deve essere quadrata (The matrix must be square) | The number of rows and columns differ. |
| Determinante: al massimo 10×10 (Determinant: 10×10 at most) | The matrix is bigger than 10 × 10. |

## See also

- [A × B](coll.matMultiply), [Identity (eye)](coll.matIdentity), [Transpose](coll.matTranspose)
- [Math functions](core.math), [Compare (== != < >)](core.compare)
- [How a block works](ide/blocks)
