# Identity

`coll.matIdentity` · Matrices · [Lists and matrices](logicstudio-collections) · version 1

Creates the identity matrix: square, with 1 on the diagonal and 0 elsewhere.

## Inputs

| Port | Type | Description |
|---|---|---|
| **size** (`n`) | number | How many rows and columns: an integer from 1 to 316. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **matrix** (`matrix`) | matrix | The n × n matrix with 1 where row and column coincide, 0 in the other cells. |
| **Exception** (`error`) | object | Invalid or too big size. |

## How it works

At every value on **size**, the block sends the identity matrix of that size.

- The size must be an integer: `2.5` gives «Dimensione: serve un numero intero» ("Size: an integer is needed"). `"3"` is worth 3, `true` is worth 1; `""` and `null` are worth 0 and give the error below.
- It must be at least 1: 0 or a negative number give «Righe e colonne devono essere interi maggiori di zero» ("Rows and columns must be integers greater than zero").
- There are at most 100000 cells: the maximum size is therefore 316 (316 × 316 = 99856). With 317 the output is «Matrice troppo grande (massimo 100000 celle)» ("Matrix too big (maximum 100000 cells)").
- Multiplying a square matrix by the identity of the same size ([Multiply matrices](coll.matMultiply)) gives back the same matrix.

## Examples

### 1. 3 × 3

```
[Value: 3] value ──▶ size [Identity] matrix ──▶ value [Write to console]
```

It writes `[[1,0,0],[0,1,0],[0,0,1]]`.

### 2. A matrix with all 5s on the diagonal

```
[Identity: 2] matrix ──▶ matrix [Scale] matrix ──▶ value [Write to console]
[Value: 5]    value  ──▶ factor
```

With size 2 it writes `[[5,0],[0,5]]`.

### 3. The determinant

The [Determinant](coll.matDet) of an identity is always 1.

## Errors

| Message | When |
|---|---|
| Dimensione: serve un numero intero (Size: an integer is needed) | The size has a decimal part or is not a number. |
| Righe e colonne devono essere interi maggiori di zero (Rows and columns must be integers greater than zero) | The size is 0 or negative. |
| Matrice troppo grande (massimo 100000 celle) (Matrix too big, maximum 100000 cells) | The size is more than 316. |

## See also

- [Create matrix](coll.matNew), [Scale](coll.matScale), [Multiply matrices](coll.matMultiply), [Determinant](coll.matDet)
- [How a block works](ide/blocks)
