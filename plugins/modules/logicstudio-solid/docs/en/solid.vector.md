# 3D vectors (dot, cross…)

`solid.vector` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

An operation on 3D vectors: sum, difference, by a number, dot product, cross product, length, unit vector, angle, triple product, projection.

## Inputs

| Port | Type | Description |
|---|---|---|
| **u** (`u`) | list | The first vector: a list `[x, y, z]` (or `[x, y]`, with z = 0) or an object `{x, y, z}`. |
| **v** (`v`) | list | The second vector. Needed by the two-vector operations. |
| **w (triple product)** (`w`) | list | The third vector. Needed only for the triple product. Hidden by default: show it with the eye in Properties. |
| **k (number)** (`k`) | number | The number to multiply by. Needed only for **k · u**. Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | any | The result: a vector (list) or a number, according to the operation. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Operation** (`op`) | see the table below | u · v | Which operation to do (table below). |
| **Angle unit** (`unit`) | Degrees / Radians / Gradians / Turns | Degrees | The unit of the angle (only for **Angle between u and v**). |

The options of **Operation**:

| Option | Internal name |
|---|---|
| u + v (sum) | `add` |
| u − v (difference) | `sub` |
| k · u (scale) | `scale` |
| u · v (dot product) | `dot` |
| u × v (cross product) | `cross` |
| |u| (length) | `norm` |
| u / |u| (unit vector) | `normalize` |
| Angle between u and v | `angle` |
| u · (v × w) (triple product) | `triple` |
| Projection of u on v | `project` |

## How it works

The block waits for the inputs the chosen operation needs (the hidden ones **v**, **w**, **k** are shown with the eye in Properties); the other inputs are ignored. With u = (u₁, u₂, u₃), v, w:

- **sum** u + v and **difference** u − v: component by component; the result is a vector
- **by a number** k·u: every component multiplied by k; a vector
- **dot product** u·v = u₁v₁ + u₂v₂ + u₃v₃; a number (0 if the vectors are perpendicular)
- **cross product** u × v = (u₂v₃ − u₃v₂, u₃v₁ − u₁v₃, u₁v₂ − u₂v₁); a vector perpendicular to both
- **length** |u| = √(u₁² + u₂² + u₃²); a number
- **unit vector** u / |u|: the vector of length 1 in the same direction
- **angle** between u and v = arccos(u·v / (|u|·|v|)), from 0 to 180° (in the chosen unit)
- **triple product** u·(v × w); a number (the signed volume of the parallelepiped built on the three vectors)
- **projection** of u on v = (u·v / v·v)·v; a vector

## Examples

### 1. The cross product of two unit vectors

```
[Constant · Variable: [1,0,0]] value ──▶ u  [3D vectors: u × v] result ──▶ value [Print (console.log)]
[Constant · Variable: [0,1,0]] value ──▶ v
```

Settings: **Operation** = u × v (cross product).

Writes `[0,0,1]`.

### 2. The angle between two vectors

```
[Constant · Variable: [1,0,0]] value ──▶ u  [3D vectors: Angle between u and v] result ──▶ value [Print (console.log)]
[Constant · Variable: [1,1,0]] value ──▶ v
```

Settings: **Operation** = Angle between u and v.

Writes `45`.

With **Angle unit** in degrees (default).

### 3. The length of a vector

```
[Constant · Variable: [2,3,6]] value ──▶ u  [3D vectors: |u|] result ──▶ value [Print (console.log)]
```

Settings: **Operation** = |u| (length).

Writes `7`.

### 4. The triple product

```
[Constant · Variable: [1,0,0]] value ──▶ u                   [3D vectors: u · (v × w)] result ──▶ value [Print (console.log)]
[Constant · Variable: [0,2,0]] value ──▶ v
[Constant · Variable: [0,0,3]] value ──▶ w (triple product)
```

Settings: **Operation** = u · (v × w) (triple product).

Writes `6`.

The volume of the 1 × 2 × 3 cuboid.

## Errors

| Message | When |
|---|---|
| u: serve un punto o un vettore [x, y, z] ("u: a point or a vector [x, y, z] is needed") | An input is not a list of 3 (or 2) elements nor an object (and the same for «v:» and «w:»). |
| u: le coordinate devono essere numeri ("u: the coordinates must be numbers") | A coordinate is not a number. |
| k: serve un numero ("k: a number is needed") | With **k · u**, k is not a number. |
| u: il vettore nullo non ha una direzione ("u: the zero vector has no direction") | With **unit vector**, u is (0, 0, 0). |
| L'angolo con il vettore nullo non è definito ("The angle with the zero vector is not defined") | With **angle**, u or v is (0, 0, 0). |
| v: il vettore nullo non ha una direzione ("v: the zero vector has no direction") | With **projection**, v is (0, 0, 0). |

## See also

- [Distance and midpoint](solid.distance) distance and midpoint
- [Plane through 3 points](solid.plane) the plane through three points uses the cross product
- [Convert and normalize an angle](trig.convert) to change the unit of an angle
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
