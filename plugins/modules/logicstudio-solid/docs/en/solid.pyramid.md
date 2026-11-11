# Regular right pyramid

`solid.pyramid` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

A right pyramid whose base is a regular polygon: from the number of sides, the side and the height it calculates volume, areas, slant height and lateral edge.

## Inputs

| Port | Type | Description |
|---|---|---|
| **sides of the base** (`n`) | number | How many sides the base has: an integer from 3 to 1000. |
| **side** (`side`) | number | The side of the base. |
| **height** (`h`) | number | The height of the pyramid (from the apex to the centre of the base). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **volume** (`volume`) | number | The volume. |
| **total area** (`area`) | number | The total area (all the faces). |
| **lateral area** (`lateral`) | number | The lateral area (without the bases). |
| **base area** (`base`) | number | The base area. Hidden by default: show it with the eye in Properties. |
| **apothem (slant height)** (`slant`) | number | The slant height of the pyramid: the height of a lateral face. |
| **lateral edge** (`edge`) | number | The lateral edge (from a vertex of the base to the top vertex). Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## How it works

The block **waits** until all the dimensions have arrived; then, at every new value, it calculates all the outputs again. Every dimension must be a number greater than 0 (a text with a number, such as `"2.5"`, is fine too). The measures have no units: lengths are in the unit you use, areas in its square, volumes in its cube. The results have 15 significant digits.

With *n* sides of length *s* and height *h*, and for the base apothem *a* = s / (2·tan(π/n)) and radius *R* = s / (2·sin(π/n)):

- base area B = n·s² / (4·tan(π/n))
- volume V = B·h / 3
- slant height of the pyramid = √(h² + a²)
- lateral area = n·s·slant height / 2; total area = B + lateral area
- lateral edge = √(h² + R²)

## Examples

### 1. A square-based pyramid (side 6, height 4)

```
[Constant · Variable: 4] value ──▶ sides of the base  [Regular right pyramid] volume ──▶ value [Print (console.log)]
[Constant · Variable: 6] value ──▶ side                                       apothem (slant height) ──▶ value [Print (console.log)]
[Constant · Variable: 4] value ──▶ height                                     total area ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
48
5
96
```

### 2. A pyramid with a triangular base (side 2, height 1.5)

```
[Constant · Variable: 3] value ──▶ sides of the base  [Regular right pyramid] base area ──▶ value [Print (console.log)]
[Constant · Variable: 2] value ──▶ side                                       volume ──▶ value [Print (console.log)]
[Constant · Variable: 1.5] value ──▶ height                                   lateral edge ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
1.73205080756888
0.866025403784439
1.89296944860009
```

The lateral edge and the base area are hidden by default.

## Errors

| Message | When |
|---|---|
| lato: serve un numero maggiore di 0 (arrivato: …) ("lato: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| altezza: serve un numero maggiore di 0 (arrivato: …) ("altezza: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| Il numero di lati deve essere un intero da 3 a 1000 ("The number of sides must be an integer from 3 to 1000") | The **sides of the base** are not an integer from 3 to 1000. |

## See also

- [Frustum of a regular pyramid](solid.frustumPyramid) the truncated pyramid
- [Regular right prism](solid.prism) the prism with the same base
- [Regular polyhedra](solid.polyhedron) the regular tetrahedron has all faces equal
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
