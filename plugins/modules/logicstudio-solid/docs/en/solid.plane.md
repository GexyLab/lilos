# Plane through 3 points

`solid.plane` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

The plane through three points: coefficients, normal, equation and area of the triangle.

## Inputs

| Port | Type | Description |
|---|---|---|
| **point 1** (`p1`) | list | The first point: a list `[x, y, z]` or an object `{x, y, z}`. |
| **point 2** (`p2`) | list | The second point. |
| **point 3** (`p3`) | list | The third point. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **plane {a, b, c, d}** (`plane`) | object | The plane, an object `{a, b, c, d}` for the equation ax + by + cz + d = 0. It links to [Point–plane distance](solid.planeDistance) and [Line–plane intersection](solid.linePlane). |
| **normal (unit)** (`normal`) | list | The normal to the plane, a vector of length 1. |
| **equation** (`equation`) | text | The equation written out, for example `z - 5 = 0`. |
| **triangle area** (`area`) | number | The area of the triangle formed by the three points. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## How it works

With the points P₁, P₂, P₃:

- n = (P₂ − P₁) × (P₃ − P₁) (cross product), with components (a, b, c)
- d = −n·P₁; the plane is ax + by + cz + d = 0
- normal (unit vector) = n / |n|; triangle area = |n| / 2

The equation is written without the terms that are 0 and without the coefficient 1 (`x + y - 2 = 0`). The block waits for all three points. The coefficients are not reduced: the same plane can come out with multiple coefficients.

## Examples

### 1. The horizontal plane at height 5

```
[Constant · Variable: [0,0,5]] value ──▶ point 1  [Plane through 3 points] equation ──▶ value [Print (console.log)]
[Constant · Variable: [1,0,5]] value ──▶ point 2                           normal (unit) ──▶ value [Print (console.log)]
[Constant · Variable: [0,1,5]] value ──▶ point 3
```

Writes these lines, one per output:

```
z - 5 = 0
[0,0,1]
```

### 2. The plane through the three axes (1, 0, 0), (0, 1, 0), (0, 0, 1)

```
[Constant · Variable: [1,0,0]] value ──▶ point 1  [Plane through 3 points] plane {a, b, c, d} ──▶ value [Print (console.log)]
[Constant · Variable: [0,1,0]] value ──▶ point 2                           equation ──▶ value [Print (console.log)]
[Constant · Variable: [0,0,1]] value ──▶ point 3                           triangle area ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
{"a":1,"b":1,"c":1,"d":-1}
x + y + z - 1 = 0
0.866025403784439
```

The triangle area is hidden by default.

## Errors

| Message | When |
|---|---|
| I tre punti sono allineati: non individuano un piano ("The three points are collinear: they do not define a plane") | The three points lie on a line (or two coincide). |
| punto 1: serve un punto o un vettore [x, y, z] ("punto 1: a point or a vector [x, y, z] is needed") | A point is not a list of 3 (or 2) elements nor an object (same for «punto 2:» and «punto 3:»). |

## See also

- [Point–plane distance](solid.planeDistance) the distance of a point from the plane
- [Line–plane intersection](solid.linePlane) where a line meets the plane
- [3D vectors (dot, cross…)](solid.vector) the cross product
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
