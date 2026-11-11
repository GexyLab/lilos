# Create matrix

`coll.matNew` · Matrices · [Lists and matrices](logicstudio-collections) · version 1

Creates a matrix of rows and columns, with all cells equal.

## Inputs

| Port | Type | Description |
|---|---|---|
| **rows** (`rows`) | number | How many rows: an integer from 1 up. |
| **columns** (`cols`) | number | How many columns: an integer from 1 up. |
| **fill** (`fill`) | any | The value of every cell. Optional: if nothing arrives it is the **Fill value** setting. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **matrix** (`matrix`) | matrix | The new matrix: a list of **rows** lists, each of **columns** values. |
| **Exception** (`error`) | object | Invalid rows or columns, matrix too big. |

## Settings

| Setting | Values | Default | Description |
|---|---|---|---|
| **Fill value** (`fill`) | a number | 0 | The value of the cells when nothing has arrived on the **fill** input. An empty box counts as 0. |

## How it works

The block waits until it has **rows** and **columns**; then, at every new value on any of the three inputs, it sends a new matrix.

- **rows** and **columns** must be integers: `2.5` gives «Righe: serve un numero intero» ("Rows: an integer is needed") (or «Colonne: …»). `"3"` is worth 3, `true` is worth 1, `""` and `null` are worth 0 (and so give the error below).
- They must be at least 1: 0 or a negative number give «Righe e colonne devono essere interi maggiori di zero» ("Rows and columns must be integers greater than zero").
- There are at most 100000 cells (rows × columns): 1000 × 101 gives «Matrice troppo grande (massimo 100000 celle)» ("Matrix too big (maximum 100000 cells)"); 1000 × 100 is fine.
- The **fill** that arrives on the input can be any value: a text, `null`, even a list (then every cell contains that list). The setting, instead, is always a number.
- A matrix with non-numeric cells is fine for reading and writing cells, but not for calculations (Add matrices, Multiply matrices, Scale, Determinant), which want numbers only.

## Examples

### 1. A matrix of zeros

```
[Value: 2] value ──▶ rows    [Create matrix] matrix ──▶ value [Write to console]
[Value: 3] value ──▶ columns
```

It writes `[[0,0,0],[0,0,0]]`.

### 2. An empty game grid

With **rows** 3, **columns** 3 and on the **fill** input the text `-` (given as a starting value) the result is `[["-","-","-"],["-","-","-"],["-","-","-"]]`. Moves are written with [Set cell](coll.matSet).

### 3. Filling with the setting

With **Fill value** 7 and 2 × 2: `[[7,7],[7,7]]`. If `null` then arrives on the **fill** input, the next matrix is `[[null,null],[null,null]]`: the input wins over the setting, even when it carries `null`.

## Errors

| Message | When |
|---|---|
| Righe: serve un numero intero (Rows: an integer is needed) | **rows** has a decimal part or is not a number. |
| Colonne: serve un numero intero (Columns: an integer is needed) | **columns** has a decimal part or is not a number. |
| Righe e colonne devono essere interi maggiori di zero (Rows and columns must be integers greater than zero) | **rows** or **columns** is 0 or negative. |
| Matrice troppo grande (massimo 100000 celle) (Matrix too big, maximum 100000 cells) | rows × columns goes over 100000. |

## See also

- [Identity](coll.matIdentity), [Matrix from list](coll.matFromList), [Set cell](coll.matSet), [Size](coll.matSize)
- [Lists and matrices](logicstudio-collections) for the matrix format
- [How a block works](ide/blocks)
