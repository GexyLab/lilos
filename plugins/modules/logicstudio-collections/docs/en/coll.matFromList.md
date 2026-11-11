# Matrix from list

`coll.matFromList` · Matrices · [Lists and matrices](logicstudio-collections) · version 1

Cuts a list into rows of the same length and makes a matrix out of them.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The list of values, row after row. |
| **columns** (`cols`) | number | How many values per row: an integer from 1 up. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **matrix** (`matrix`) | matrix | The matrix: the first **columns** values are the first row, the next ones the second, and so on. |
| **Exception** (`error`) | object | Invalid list, invalid columns, list that does not divide exactly. |

## How it works

The block waits until it has **list** and **columns**; then, at every new value, it sends the matrix.

- The rows are *length of the list ÷ columns*: 6 values with 3 columns make 2 rows, with 2 columns they make 3 rows.
- **The list must divide exactly**: 5 values with 2 columns give «La lista (5 elementi) non si divide in righe di 2» ("The list (5 items) cannot be divided into rows of 2"). An **empty list** does not work either: «La lista (0 elementi) non si divide in righe di 2».
- **columns** must be an integer: `1.5` gives «Colonne: serve un numero intero» ("Columns: an integer is needed"). `"2"` is worth 2. If it is 0 or negative (also `""` and `null`, which are worth 0): «Righe e colonne devono essere interi maggiori di zero» ("Rows and columns must be integers greater than zero").
- The values can be of any type: they go into the cells as they are.
- The matrix can have at most 100000 cells.

## Examples

### 1. Six numbers in two rows

```
[Value (JSON): [1,2,3,4,5,6]] value ──▶ list    [Matrix from list] matrix ──▶ value [Write to console]
[Value: 3]                    value ──▶ columns
```

It writes `[[1,2,3],[4,5,6]]`. With **columns** 2 it writes `[[1,2],[3,4],[5,6]]`; with **columns** 4 it gives «La lista (6 elementi) non si divide in righe di 4».

### 2. A matrix typed in a field

```
[Text field] text ──▶ text [Split text: ;] result ──▶ list [Matrix from list (columns 2)] matrix ──▶ matrix [Determinant]
```

Typing `1; 2; 3; 4` gives the matrix `[["1","2"],["3","4"]]`, but the values are **texts** and the [Determinant](coll.matDet) gives «La matrice deve contenere solo numeri» ("The matrix must contain only numbers"). For calculations the values must be numbers: use for example a [Value](core.value) of kind JSON with `[1,2,3,4]`.

### 3. Rows of 1

With **columns** 1, `[7, 8, 9]` becomes the column matrix `[[7],[8],[9]]`.

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | The value on **list** is not a list. |
| Colonne: serve un numero intero (Columns: an integer is needed) | **columns** has a decimal part or is not a number. |
| Righe e colonne devono essere interi maggiori di zero (Rows and columns must be integers greater than zero) | **columns** is 0 or negative. |
| La lista (N elementi) non si divide in righe di C (The list (N items) cannot be divided into rows of C) | The list is empty, or its length is not a multiple of **columns**. |
| Matrice troppo grande (massimo 100000 celle) (Matrix too big, maximum 100000 cells) | The matrix would have more than 100000 cells. |

## See also

- [Flatten](coll.matFlatten), the opposite of this block
- [Create matrix](coll.matNew), [Size](coll.matSize)
- [How a block works](ide/blocks)
