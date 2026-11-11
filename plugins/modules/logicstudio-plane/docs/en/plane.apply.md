# Apply matrix

`plane.apply` · Geometry · [Plane geometry](logicstudio-plane) · version 1

**Applies a 3×3 transformation matrix** to a point, a list of points or a shape.

## Inputs

| Port | Type | Description |
|---|---|---|
| **point, points or shape** (`target`) | any | What to transform: a point, a list of points or of shapes, or a shape. |
| **matrix** | matrix | The 3×3 matrix, for example the one from [Transformation matrix (3×3)](plane.matrix). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** | any | The result, of the same kind as **target** (points are lists `[x, y]`). |
| **Exception** (`error`) | object | The matrix is not valid, a point would be sent to infinity, or the value is not a point or a shape. |

## How it works

Each point `(x, y)` becomes the product of the matrix by `[x, y, 1]`. If the last row of the matrix is not `[0, 0, 1]` the coordinates are divided by the third component, as in a perspective; if it is zero the point has no position and the block gives an error.

Shapes are transformed as described in [Transform (translate · rotate · scale · reflect · shear)](plane.transform): polygons and lines point by point; circles and ellipses only with translations, rotations, reflections and uniform scales; rectangles stay rectangles with translations and scales.

## Examples

### 1. Doubling a list of points

```
[List: (1,1) (2,2)]    list   ──▶ target [Apply matrix]
[3×3 matrix: scale 2]  matrix ──▶ matrix [Apply matrix] result ──▶ value [Print (console.log)]
```

With `[[2, 0, 0], [0, 2, 0], [0, 0, 1]]` it sends `[[2, 2], [4, 4]]`.

### 2. A translation and a division

| target | matrix | Output |
|---|---|---|
| `[1, 1]` | `[[1, 0, 5], [0, 1, 0], [0, 0, 1]]` (translation `[5, 0]`) | `[6, 1]` |
| `[2, 4]` | `[[1, 0, 0], [0, 1, 0], [0, 0, 2]]` | `[1, 2]` (division by 2) |

## Errors

| Message | When |
|---|---|
| Non è una matrice di trasformazione 3×3 ("Not a 3×3 transformation matrix") | The matrix is not a square 3×3, or has cells that are not numbers. |
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |
| Non è un punto né una figura: «…» ("Neither a point nor a shape") | The value is not a point, a list of points or a shape. |
| La matrice manda un punto all'infinito ("The matrix sends a point to infinity") | The last row of the matrix gives zero for that point. |
| Questa trasformazione deforma il cerchio: non resta un cerchio ("This transformation distorts the circle: it does not stay a circle") | A circle with a matrix that is not a similarity. |
| Questa figura non si può trasformare: «…» ("This shape cannot be transformed") | A parabola or a hyperbola. |

## See also

- [Transformation matrix (3×3)](plane.matrix) to build and combine matrices
- [Transform (translate · rotate · scale · reflect · shear)](plane.transform) for a transformation in a single block
- [How a block works](ide/blocks)
