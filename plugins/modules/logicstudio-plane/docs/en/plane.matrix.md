# Transformation matrix (3×3)

`plane.matrix` · Geometry · [Plane geometry](logicstudio-plane) · version 1

The homogeneous 3×3 **transformation matrix** of a transformation of the plane, or of several put together.

## Inputs

| Port | Type | Description |
|---|---|---|
| **base matrix** (`base`) | matrix | A 3×3 matrix to start from. Optional. |
| **vector [x, y]** (`vector`) | list | Translate: the displacement `[dx, dy]`. Scale: the factors `[sx, sy]`. Shear: the factors `[kx, ky]`. |
| **center [x, y]** (`center`) | list | The centre of the rotation, the scale or the shear; the point of a reflection. If missing it is the origin `[0, 0]`. |
| **angle** | number | The rotation angle, positive counter-clockwise. If not linked the setting **Angle** is used. |
| **factor** | number | The uniform scale. If not linked (and there is no **vector**) the setting **Factor** is used. |
| **line** | object | The line of the reflection (a line from [Line through two points](plane.line), a list of two points or `{a, b, c}`). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **matrix** | matrix | The matrix: a list of three rows, compatible with the matrix blocks of [Lists and matrices](logicstudio-collections). As columns: `M × [x, y, 1]`. |
| **Exception** (`error`) | object | A matrix is not 3×3, a datum of the transformation is missing, or a value is not a point. |

## Extra ports

In the **Properties**, **Ports** section, you can add up to 16 more inputs, of matrix type, named with letters. They are the matrices to combine.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Transformation** (`op`) | None (only compose) / Translate / Rotate / Scale / Reflect on a line / Reflect through a point / Shear | None (only compose) | The block's own transformation, or **None** to only combine. As in [Transform (translate · rotate · scale · reflect · shear)](plane.transform). |
| **Angle (if not linked)** (`angle`) | a number | 90 | The rotation angle when **angle** is not linked. |
| **Factor (if not linked)** (`factor`) | a number | 2 | The scale factor when **factor** and **vector** are not linked. |
| **Angle unit** (`unit`) | Degrees (°) / Radians (rad) / Gradians (gon) | Degrees (°) | The unit of the angles. |

## How it works

A transformation is written as a matrix that multiplies the coordinates of the point, with an extra 1 at the end (homogeneous coordinates). For the plane:

```
| 1 0 tx |     translation
| 0 1 ty |
| 0 0 1  |

| cos -sin 0 |     rotation
| sin  cos 0 |
|  0    0  1 |
```

Several transformations in a row are **combined** by multiplying the matrices. The order is this: first **base** is applied, then the matrices of the added ports (in the order of the Properties), last the block's own transformation (if it is not **None**). The resulting matrix does everything in one step; it is applied with [Apply matrix](plane.apply).

The matrices are always 3×3: for space (4×4 matrices) there is no block here, but the blocks of [Lists and matrices](logicstudio-collections) multiply matrices of any size.

## Examples

### 1. A 90-degree rotation

```
[Constant: 90] value ──▶ angle [Transformation matrix: Rotate] matrix ──▶ value [Print (console.log)]
```

It sends `[[0, -1, 0], [1, 0, 0], [0, 0, 1]]`. A translation of `[2, 3]` gives `[[1, 0, 2], [0, 1, 3], [0, 0, 1]]`.

### 2. Translate first, then rotate

```
[Matrix: translation (2, 3)] matrix ──▶ base [Transformation matrix: None]
[Matrix: rotation 90°]       matrix ──▶ (added port) [Transformation matrix: None] matrix ──▶ matrix [Apply matrix]
[Point: (1, 0)] point ──▶ target [Apply matrix] result ──▶ value [Print (console.log)]
```

The combined matrix is `[[0, -1, -3], [1, 0, 2], [0, 0, 1]]` and the point `(1, 0)` goes first to `(3, 3)` and then to `[-3, 3]`. Swapping the order gives another result: rotating before or after a translation is not the same.

## Errors

| Message | When |
|---|---|
| Non è una matrice di trasformazione 3×3 ("Not a 3×3 transformation matrix") | The matrix is not a square 3×3, or has cells that are not numbers. |
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |
| Manca il vettore ("The vector is missing") | With translate or shear: **vector** is not linked. |
| Manca la retta di simmetria ("The line of symmetry is missing") | With the reflection on a line: **line** is not linked. |
| Non è una retta: «…» ("Not a line") | The value is not a line: it must be the line of [Line through two points](plane.line), a list of two points `[[x1, y1], [x2, y2]]` or an object `{a, b, c}`. |
| Trasformazione sconosciuta: «…» ("Unknown transformation") | The **Transformation** setting is not valid (a badly saved project). |
| Non è un numero: «…» ("Not a number") | A linked value is not a number (a text holding a number, like `"2.5"`, is fine). |

## See also

- [Apply matrix](plane.apply) to apply the matrix
- [Transform (translate · rotate · scale · reflect · shear)](plane.transform) for a single transformation, in one step
- [A × B](coll.matMultiply), [Transpose](coll.matTranspose) and [Identity (eye)](coll.matIdentity) to work with matrices in general
- [How a block works](ide/blocks)
