# Line through two points

`plane.line` · Geometry · [Plane geometry](logicstudio-plane) · version 1

The **line** through two points: the coefficients `a`, `b`, `c`, the slope, the intercept and the written equation. Vertical lines are handled.

## Inputs

| Port | Type | Description |
|---|---|---|
| **point 1 [x, y]** (`p`) | list | The first point. |
| **point 2 [x, y]** (`q`) | list | The second point. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **line** | object | The line as a shape (`{kind: "line", a, b, c, p1, p2}`), to give to [Parallel · Perpendicular](plane.parallel), [Intersection](plane.intersect), [Transform (translate · rotate · scale · reflect · shear)](plane.transform) and [Shape → SVG](plane.svg). |
| **a** | number | The coefficient **a** of `a·x + b·y + c = 0`. |
| **b** | number | The coefficient **b**. |
| **c** | number | The coefficient **c**. |
| **slope m** (`slope`) | number | The slope **m** of `y = m·x + q`, or `null` if the line is vertical. |
| **intercept q** (`intercept`) | number | The intercept **q** (where the line cuts the y axis), or `null` if the line is vertical. |
| **vertical** | yes/no | **yes** if the line is vertical. |
| **equation** | text | The equation as text: `y = 2x + 1`, or `x = 3` for a vertical line. |
| **Exception** (`error`) | object | A value is not a point, or the two points are the same. |

## How it works

For the points (x1, y1) and (x2, y2) the block computes `a = y2 - y1`, `b = x1 - x2` and `c = -(a·x1 + b·y1)`, so the line is `a·x + b·y + c = 0`. The coefficients are not reduced: for `(0, 1)` and `(2, 5)` it sends `4`, `-2`, `2` (and not `2`, `-1`, `1`).

If `b` is zero the line is **vertical**: **slope** and **intercept** are `null` and the equation is `x = k`. It works in 2D: the z of the points does not count.

## Examples

### 1. Any line

```
[Point: (0, 1)] point ──▶ p [Line through two points]
[Point: (2, 5)] point ──▶ q [Line through two points] equation ──▶ value [Print (console.log)]
```

It sends `y = 2x + 1`, with slope `2` and intercept `1`.

### 2. Special cases

| p | q | equation | slope | vertical |
|---|---|---|---|---|
| `(3, 0)` | `(3, 7)` | `x = 3` | `null` | yes |
| `(0, 2)` | `(5, 2)` | `y = 2` | `0` | no |
| `(0, 0)` | `(1, -1)` | `y = -x` | `-1` | no |
| `(0, 3)` | `(1, 2)` | `y = -x + 3` | `-1` | no |

## Errors

| Message | When |
|---|---|
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |
| I due punti coincidono: non definiscono una retta ("The two points are the same: they do not define a line") | The two points are the same point. |

## See also

- [Parallel · Perpendicular](plane.parallel) for a parallel or a perpendicular
- [Bisector (axis of a segment · of an angle)](plane.bisector) for the perpendicular bisector of a segment
- [Intersection](plane.intersect) to find where two lines meet
- [Distance (Math.hypot)](plane.distance) for the distance of a point from the line
- [How a block works](ide/blocks)
