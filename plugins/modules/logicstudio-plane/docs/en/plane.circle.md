# Circle

`plane.circle` · Geometry · [Plane geometry](logicstudio-plane) · version 1

A **circle** from its centre and radius, or from the three points it passes through: the shape, the area and the circumference.

## Inputs

| Port | Type | Description |
|---|---|---|
| **center [x, y]** (`center`) | list | The centre. For **Centre and radius**. |
| **radius** | number | The radius. For **Centre and radius**. |
| **point 1 [x, y]** (`p1`) | list | The first point. For **Three points**. |
| **point 2 [x, y]** (`p2`) | list | The second point. For **Three points**. |
| **point 3 [x, y]** (`p3`) | list | The third point. For **Three points**. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **circle** | object | The shape `{kind: "circle", center, radius}`, to give to [Intersection](plane.intersect), [Point inside shape](plane.inside), [Transform (translate · rotate · scale · reflect · shear)](plane.transform) and [Shape → SVG](plane.svg). |
| **center** | list | The centre. |
| **radius** | number | The radius. |
| **area** | number | The area `π·r²`. |
| **circumference** | number | The circumference `2·π·r`. |
| **Exception** (`error`) | object | A value is not a point or a number, the radius is negative, or the three points are on one line. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Defined by** (`mode`) | Center and radius / Three points | Center and radius | How the circle is defined. |

## How it works

With **Centre and radius** the block waits for **center** and **radius**. With **Three points** it waits for **p1**, **p2**, **p3** and finds the circle through all three (the circle circumscribed to the triangle); points on one line have none. A radius of 0 is a circle shrunk to a point, with area 0. The circle is 2D: the z of the points does not count.

## Examples

### 1. Centre and radius

```
[Point: (1, 2)] point ──▶ center [Circle]
[Constant: 3] value ──▶ radius [Circle] area ──▶ value [Print (console.log)]
```

The area is `28.2743338823`, the circumference `18.8495559215`.

### 2. From three points

With `(0, 0)`, `(4, 0)` and `(0, 4)` the centre is `[2, 2]` and the radius `2.82842712475`. With `(0, 0)`, `(1, 1)` and `(2, 2)` (on one line) the block gives an error.

## Errors

| Message | When |
|---|---|
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |
| Non è un numero: «…» ("Not a number") | A linked value is not a number (a text holding a number, like `"2.5"`, is fine). |
| Il raggio non può essere negativo ("The radius cannot be negative") | With **Centre and radius**: the radius is less than zero. |
| I tre punti sono allineati: non c'è un cerchio ("The three points are on one line: there is no circle") | With **Three points**. |

## See also

- [Intersection](plane.intersect) for the meeting with lines and other circles
- [Point inside shape](plane.inside) to know whether a point is in the circle
- [Solve a triangle (laws of sines and cosines)](trig.triangle) for the circumscribed and inscribed circle of a triangle
- [How a block works](ide/blocks)
