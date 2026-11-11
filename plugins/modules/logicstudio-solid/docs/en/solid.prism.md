# Regular right prism

`solid.prism` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

A right prism whose base is a regular polygon: from the number of sides, the side and the height it calculates volume, areas and base apothem.

## Inputs

| Port | Type | Description |
|---|---|---|
| **sides of the base** (`n`) | number | How many sides the base has: an integer from 3 to 1000. |
| **side** (`side`) | number | The side of the base. |
| **height** (`h`) | number | The height of the prism. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **volume** (`volume`) | number | The volume. |
| **total area** (`area`) | number | The total area (all the faces). |
| **lateral area** (`lateral`) | number | The lateral area (without the bases). |
| **base area** (`base`) | number | The base area. Hidden by default: show it with the eye in Properties. |
| **base perimeter** (`perimeter`) | number | The perimeter of the base. Hidden by default: show it with the eye in Properties. |
| **base apothem** (`apothem`) | number | The apothem of the base (from the centre to the midpoint of a side). Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## How it works

The block **waits** until all the dimensions have arrived; then, at every new value, it calculates all the outputs again. Every dimension must be a number greater than 0 (a text with a number, such as `"2.5"`, is fine too). The measures have no units: lengths are in the unit you use, areas in its square, volumes in its cube. The results have 15 significant digits.

With *n* sides of length *s* and height *h*:

- base area B = n·s² / (4·tan(π/n))
- base apothem = s / (2·tan(π/n)); perimeter = n·s
- volume V = B·h
- lateral area = n·s·h; total area = n·s·h + 2B

## Examples

### 1. A hexagonal prism, side 2, height 10

```
[Constant · Variable: 6] value ──▶ sides of the base  [Regular right prism] volume ──▶ value [Print (console.log)]
[Constant · Variable: 2] value ──▶ side                                     total area ──▶ value [Print (console.log)]
[Constant · Variable: 10] value ──▶ height
```

Writes these lines, one per output:

```
103.923048454133
140.784609690827
```

### 2. A prism with a square base, side 3, height 5

```
[Constant · Variable: 4] value ──▶ sides of the base  [Regular right prism] base area ──▶ value [Print (console.log)]
[Constant · Variable: 3] value ──▶ side                                     volume ──▶ value [Print (console.log)]
[Constant · Variable: 5] value ──▶ height                                   base apothem ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
9
45
1.5
```

With 4 sides the prism is a cuboid with a square base.

## Errors

| Message | When |
|---|---|
| lato: serve un numero maggiore di 0 (arrivato: …) ("lato: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| altezza: serve un numero maggiore di 0 (arrivato: …) ("altezza: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| Il numero di lati deve essere un intero da 3 a 1000 ("The number of sides must be an integer from 3 to 1000") | The **sides of the base** are not an integer from 3 to 1000. |

## See also

- [Right prism (any base)](solid.prismGeneric) when the base is not a regular polygon
- [Regular right pyramid](solid.pyramid) the pyramid with the same base
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
