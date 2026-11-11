# Convex hull

`plane.hull` · Geometry · [Plane geometry](logicstudio-plane) · version 1

The **convex hull** of a cloud of points: the smallest convex polygon that contains them all.

## Inputs

| Port | Type | Description |
|---|---|---|
| **points [[x, y], …]** (`points`) | list | A list of points (even with duplicates, and points inside the figure). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **hull** | list | The vertices of the hull, counter-clockwise, starting from the leftmost (and lowest) point. Points on the sides are left out. |
| **polygon** | object | The hull as a polygon shape. Not sent if there are fewer than 3 different points. |
| **count** | number | How many vertices. |
| **area** | number | The area of the hull (0 if it is not a polygon). |
| **Exception** (`error`) | object | The input is not a list of points. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Tolerance (ε)** (`epsilon`) | a number | 1e-9 | The tolerance (ε) with which three points count as aligned. |

## How it works

The block uses the *monotone chain* algorithm: it sorts the points and builds the lower side first, then the upper one. Equal points count once. If all points are on one line the hull is made of the two ends; if there is only one, of that one; with an empty list **hull** is the empty list and **count** is 0. The computation is 2D.

## Examples

### 1. A square with points inside

```
[List: (0,0) (2,0) (1,1) (2,2) (0,2) (1,0) (1,2)] list ──▶ points [Convex hull] hull ──▶ value [Print (console.log)]
```

The four corners `(0, 0)`, `(2, 0)`, `(2, 2)`, `(0, 2)` come out: the point `(1, 1)` is inside and `(1, 0)` and `(1, 2)` are on the sides. The area is `4`.

### 2. Points on a line

With `(0, 0)`, `(1, 1)`, `(2, 2)` it sends `[(0, 0), (2, 2)]`, **count** is `2` and **polygon** is not sent.

## Errors

| Message | When |
|---|---|
| Serve una lista di punti ("A list of points is needed") | The input is not a list. |
| Non è un punto: «…» ("Not a point") | A linked value is not a point: it must be a list `[x, y]` (`[x, y, z]` is fine too, the z is ignored) or an object `{x, y}`. |

## See also

- [Polygon (area · perimeter)](plane.polygon) for the area, perimeter and centroid of the hull
- [Bounding box](plane.bounds) for the bounding box
- [How a block works](ide/blocks)
