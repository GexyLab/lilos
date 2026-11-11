# Distance and midpoint

`solid.distance` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

The distance between two points, their midpoint and the vector from one to the other.

## Inputs

| Port | Type | Description |
|---|---|---|
| **point P** (`p`) | list | The point P: a list `[x, y, z]` or an object `{x, y, z}`. |
| **point Q** (`q`) | list | The point Q. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **distance** (`distance`) | number | The distance between P and Q. |
| **midpoint** (`midpoint`) | list | The midpoint of the segment PQ. |
| **vector P→Q** (`vector`) | list | The vector from P to Q (Q − P). Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## How it works

With P = (x₁, y₁, z₁) and Q = (x₂, y₂, z₂):

- vector P→Q = (x₂ − x₁, y₂ − y₁, z₂ − z₁)
- distance = √((x₂ − x₁)² + (y₂ − y₁)² + (z₂ − z₁)²)
- midpoint = ((x₁ + x₂)/2, (y₁ + y₂)/2, (z₁ + z₂)/2)

The block waits for both points.

## Examples

### 1. From the origin to (3, 4, 12)

```
[Constant · Variable: [0,0,0]] value ──▶ point P   [Distance and midpoint] distance ──▶ value [Print (console.log)]
[Constant · Variable: [3,4,12]] value ──▶ point Q                          midpoint ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
13
[1.5,2,6]
```

### 2. Any two points, with the vector

```
[Constant · Variable: [1,2,3]] value ──▶ point P   [Distance and midpoint] distance ──▶ value [Print (console.log)]
[Constant · Variable: [4,-2,3]] value ──▶ point Q                          vector P→Q ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
5
[3,-4,0]
```

The vector is hidden by default.

## Errors

| Message | When |
|---|---|
| P: serve un punto o un vettore [x, y, z] ("P: a point or a vector [x, y, z] is needed") | P is not a list of 3 (or 2) elements nor an object (and the same for «Q:»). |
| P: le coordinate devono essere numeri ("P: the coordinates must be numbers") | A coordinate of P (or Q) is not a number. |

## See also

- [3D vectors (dot, cross…)](solid.vector) other operations on vectors
- [3D point [x, y, z]](solid.point) to build the points
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
