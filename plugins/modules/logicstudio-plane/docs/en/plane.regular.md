# Regular polygon

`plane.regular` · Geometry · [Plane geometry](logicstudio-plane) · version 1

A **regular polygon** (all sides and angles equal) from the number of sides and the radius: the vertices, the area, the apothem and the side.

## Inputs

| Port | Type | Description |
|---|---|---|
| **sides** (`n`) | number | The number of sides. If it is not linked the setting **Sides** is used. |
| **radius** | number | The radius: the distance from the centre to the vertices. |
| **center [x, y]** (`center`) | list | The centre. If it is not linked it is the origin `(0, 0)`. |
| **rotation** | number | The rotation: the angle of the first vertex, measured from the x axis counter-clockwise. If it is not linked it is 0. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **polygon** | object | The shape `{kind: "polygon", points}`. |
| **vertices** | list | The list of the vertices, counter-clockwise, the first at distance **radius** from the centre in the direction of the rotation. |
| **area** | number | The area. |
| **apothem** | number | The apothem: the distance from the centre to the midpoint of a side. |
| **side** | number | The length of a side. |
| **perimeter** | number | The perimeter. |
| **interior angle** (`interior`) | number | The interior angle, in the chosen unit. |
| **Exception** (`error`) | object | A value is not a number or a point, the sides are not an integer from 3 to 1000, or the radius is negative. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Sides (if not linked)** (`sides`) | 3 to 1000 | 6 | The number of sides when **n** is not linked (3 to 1000). |
| **Angle unit** (`unit`) | Degrees (°) / Radians (rad) / Gradians (gon) | Degrees (°) | The unit of the rotation and of the interior angle. |

## How it works

The block waits for **radius**. The side is `2·r·sin(π/n)`, the apothem `r·cos(π/n)`, the area `½·n·r²·sin(2π/n)` and the interior angle `(n-2)·180°/n`. For a hexagon of radius 1 the side is 1.

## Examples

### 1. A hexagon

```
[Constant: 1] value ──▶ radius [Regular polygon: 6 sides] area ──▶ value [Print (console.log)]
```

Area `2.59807621135`, apothem `0.866025403784`, side `1`, perimeter `6`, interior angle `120`. The first vertex is `[1, 0]`.

### 2. A rotated square

With **n** = `4`, **radius** = `2`, **center** = `(1, 1)` and **rotation** = `45` you get a square with sides parallel to the axes: side `2.82842712475` and first vertex `[2.41421356237, 2.41421356237]`.

## Errors

| Message | When |
|---|---|
| Non è un numero: «…» ("Not a number") | A linked value is not a number (a text holding a number, like `"2.5"`, is fine). |
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |
| I lati devono essere un intero da 3 a 1000 ("The sides must be an integer from 3 to 1000") | The number of sides is 2, 3.5, 1001… |
| Il raggio non può essere negativo ("The radius cannot be negative") | The radius is less than zero. |

## See also

- [Polygon (area · perimeter)](plane.polygon) for any polygon
- [Circle](plane.circle) for the circumscribed circle
- [Transform (translate · rotate · scale · reflect · shear)](plane.transform) to move it
- [How a block works](ide/blocks)
