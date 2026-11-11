# Conic (ellipse · parabola · hyperbola)

`plane.conic` · Geometry · [Plane geometry](logicstudio-plane) · version 1

A **conic** from its parameters: ellipse, parabola or hyperbola, with foci, vertices, eccentricity and the written equation.

## Inputs

| Port | Type | Description |
|---|---|---|
| **center / vertex [x, y]** (`center`) | list | The centre of the ellipse and the hyperbola, or the vertex of the parabola. |
| **a** | number | Ellipse: the semi-axis **along the main axis**. Hyperbola: the real semi-axis (from the centre to the vertex). Not used by the parabola. |
| **b** | number | Ellipse: the other semi-axis. Hyperbola: the imaginary semi-axis (it sets the slopes of the asymptotes, `±b/a`). Not used by the parabola. |
| **p (parabola)** (`p`) | number | Parabola: the distance from the vertex to the focus, signed (negative = opens the other way). Not used by ellipse and hyperbola. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **conic** | object | The shape: `{kind: "ellipse", center, rx, ry, rotation}`, `{kind: "parabola", vertex, p, orientation}` or `{kind: "hyperbola", center, a, b, orientation}`. It can be given to [Shape → SVG](plane.svg), [Bounding box](plane.bounds) and [Transform (translate · rotate · scale · reflect · shear)](plane.transform). |
| **foci** | list | A list of points: the two foci (ellipse, hyperbola) or the focus (parabola). In a circle both foci are at the centre. |
| **vertices** | list | A list of points: the 4 vertices of the ellipse, the 2 of the hyperbola, the vertex of the parabola. |
| **eccentricity** | number | The eccentricity: from 0 (circle) to 1 (excluded) for the ellipse, 1 for the parabola, greater than 1 for the hyperbola. |
| **equation** | text | The equation as text, for example `x²/25 + y²/9 = 1`. |
| **directrix** | text | The directrix as text (`x = -2`). Sent only for the parabola. |
| **area** | number | The area `π·a·b`. Sent only for the ellipse. |
| **Exception** (`error`) | object | A value is not a point or a number, the semi-axes are not positive, or `p` is zero. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Conic** (`kind`) | Ellipse / Parabola / Hyperbola | Ellipse | Which conic. |
| **Main axis** (`orientation`) | Horizontal (x) / Vertical (y) | Horizontal (x) | The main axis: horizontal (along x) or vertical (along y). For the ellipse and the hyperbola it is the axis **a** lies on; for the parabola it is the axis of symmetry. |

## How it works

Conics always have their axes parallel to the x and y axes; to rotate them use [Transform (translate · rotate · scale · reflect · shear)](plane.transform) (the ellipse rotates, the parabola and the hyperbola do not).

| Conic | Equation (horizontal axis) | Foci | Eccentricity |
|---|---|---|---|
| Ellipse | `(x-h)²/a² + (y-k)²/b² = 1` | on the longer axis, at distance `√\|a²-b²\|` from the centre | `c/major semi-axis` |
| Hyperbola | `(x-h)²/a² - (y-k)²/b² = 1` | at distance `√(a²+b²)` from the centre, on the main axis | `c/a` |
| Parabola | `(y-k)² = 4p(x-h)` | at distance `p` from the vertex, on the axis | 1 |

With the **vertical** axis x and y swap: the ellipse has **a** along y, the hyperbola is `(y-k)²/a² - (x-h)²/b² = 1`, the parabola `(x-h)² = 4p(y-k)`. In the written equations, if the centre is at the origin the term is written `x²`, otherwise `(x - 1)²` or `(x + 2)²`.

## Examples

### 1. An ellipse

```
[Point: (0, 0)] point ──▶ center [Conic: Ellipse]
[Constant: 5] value ──▶ a [Conic: Ellipse]
[Constant: 3] value ──▶ b [Conic: Ellipse] equation ──▶ value [Print (console.log)]
```

It sends `x²/25 + y²/9 = 1`. The foci are `(-4, 0)` and `(4, 0)`, the eccentricity `0.8`, the area `47.1238898038`. With the vertical axis, centre `(1, -2)`: `(x - 1)²/9 + (y + 2)²/25 = 1` and foci `(1, -6)` and `(1, 2)`.

### 2. Parabola and hyperbola

| Conic | Inputs | Output |
|---|---|---|
| Parabola | centre `(0, 0)`, p = 2 | `y² = 8x`, focus `(2, 0)`, directrix `x = -2` |
| Parabola, vertical axis | centre `(1, 3)`, p = -1 | `(x - 1)² = -4(y - 3)`, focus `(1, 2)`, directrix `y = 4` |
| Hyperbola | centre `(0, 0)`, a = 3, b = 4 | `x²/9 - y²/16 = 1`, foci `(-5, 0)` and `(5, 0)`, eccentricity `1.66666666667` |

## Errors

| Message | When |
|---|---|
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |
| Non è un numero: «…» ("Not a number") | A linked value is not a number (a text holding a number, like `"2.5"`, is fine). |
| I semiassi devono essere maggiori di zero ("The semi-axes must be greater than zero") | With ellipse or hyperbola: **a** or **b** is zero or negative. |
| Il parametro p non può essere zero ("The parameter p cannot be zero") | With the parabola: **p** is zero. |

## See also

- [Circle](plane.circle) for the circle
- [Shape → SVG](plane.svg) to draw the conic
- [Transform (translate · rotate · scale · reflect · shear)](plane.transform) to rotate the ellipse
- [How a block works](ide/blocks)
