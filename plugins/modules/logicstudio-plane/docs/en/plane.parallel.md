# Parallel · Perpendicular

`plane.parallel` · Geometry · [Plane geometry](logicstudio-plane) · version 1

The **parallel** or the **perpendicular** to a given line, through a point.

## Inputs

| Port | Type | Description |
|---|---|---|
| **line** | object | The line (from [Line through two points](plane.line), a list of two points `[[x1, y1], [x2, y2]]` or an object `{a, b, c}`). |
| **point [x, y]** (`point`) | list | The point the new line must pass through. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **new line** (`line`) | object | The new line, as a shape. |
| **a** | number | The coefficient **a** of the new line. |
| **b** | number | The coefficient **b**. |
| **c** | number | The coefficient **c**. |
| **equation** | text | The equation as text (`y = x + 3`, `x = 5`). |
| **foot (perpendicular)** (`foot`) | list | The foot: the point of the given line closest to **point** (where the perpendicular meets it). It is always sent, also for the parallel. |
| **Exception** (`error`) | object | The line is not valid, or the point is not a point. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **The line is** (`mode`) | Parallel / Perpendicular | Parallel | Parallel or perpendicular to the given line. |

## How it works

The **parallel** has the same direction as the given line. The **perpendicular** makes a right angle with it. In both cases it passes through **point**. A horizontal line has a vertical perpendicular (`x = k`) and vice versa.

## Examples

### 1. The parallel

```
[Line through two points: (0,0) (1,1)] line ──▶ line [Parallel · Perpendicular: Parallel]
[Point: (0, 3)] point ──▶ point [Parallel · Perpendicular: Parallel] equation ──▶ value [Print (console.log)]
```

It sends `y = x + 3`.

### 2. The perpendicular and the foot

With the same line `y = x`, **Perpendicular** and the point `(0, 2)`: equation `y = -x + 2` and foot `[1, 1]` (where the perpendicular cuts `y = x`). With the line through `(0, 0)` and `(1, 0)` (the x axis) and the point `(5, 5)` you get `x = 5`.

## Errors

| Message | When |
|---|---|
| Non è una retta: «…» ("Not a line") | The value is not a line: it must be the line of [Line through two points](plane.line), a list of two points `[[x1, y1], [x2, y2]]` or an object `{a, b, c}`. |
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |
| Non è una retta: «a e b sono zero» ("Not a line: a and b are zero") | The object `{a, b, c}` has **a** and **b** equal to zero. |

## See also

- [Line through two points](plane.line) to build the starting line
- [Bisector (axis of a segment · of an angle)](plane.bisector) for the perpendicular bisector of a segment
- [Distance (Math.hypot)](plane.distance) for the distance of a point from the line
- [How a block works](ide/blocks)
