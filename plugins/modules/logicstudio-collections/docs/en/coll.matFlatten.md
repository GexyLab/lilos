# Flatten

`coll.matFlatten` · Matrices · [Lists and matrices](logicstudio-collections) · version 1

Puts all the cells of a matrix in a row, row after row, in a single list.

## Inputs

| Port | Type | Description |
|---|---|---|
| **matrix** (`matrix`) | matrix | The matrix to flatten. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | list | The cells of the first row, then those of the second, and so on. It has rows × columns items. |
| **Exception** (`error`) | object | When the value is not a valid matrix. |

## How it works

At every matrix that arrives, the block sends the list of its cells, row after row.

- The matrix must be valid: the rows must all have the same length. `[[1], [2, 3]]` gives «Le righe della matrice devono avere tutte la stessa lunghezza» ("The rows of the matrix must all have the same length"), even if in theory it could be put in a row. To join lists of different lengths use [Concat lists](coll.concat).
- It flattens **one level only**: if the cells are lists, they stay lists. `[[[1,2]],[[3,4]]]` gives `[[1,2],[3,4]]`.
- The cells can be of any type.
- To go back to the matrix use [Reshape](coll.matFromList) with the same number of columns.

## Examples

### 1. A 2 × 2 matrix

```
[Constant · Variable (JSON): [[1,2],[3,4]]] value ──▶ matrix [Flatten] result ──▶ value [Print (console.log)]
```

It writes `[1,2,3,4]`.

### 2. The sum of all the cells

```
[Flatten] result ──▶ list [Sum · Min · Max · Avg: sum] result ──▶ value [Value]
```

On the matrix `[[1,2,3],[4,5,6]]` it shows `21`. With **Operation** maximum it shows the biggest cell, `6`.

### 3. There and back

`[[1,2,3],[4,5,6]]` → Flatten → `[1,2,3,4,5,6]` → [Reshape](coll.matFromList) with **columns** 3 → `[[1,2,3],[4,5,6]]`. With **columns** 2 you get instead the same list divided into three rows: `[[1,2],[3,4],[5,6]]`.

## Errors

| Message | When |
|---|---|
| Serve una matrice (A matrix is needed) | The value is not a list, is empty, or one of its items is not a list. |
| Le righe della matrice devono avere tutte la stessa lunghezza (The rows of the matrix must all have the same length) | The rows have different lengths, or the first is empty. |

## See also

- [Reshape](coll.matFromList), [Row m[r]](coll.matRow), [Concat lists](coll.concat)
- [How a block works](ide/blocks)
