# Frustum of a regular pyramid

`solid.frustumPyramid` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

The frustum of a regular pyramid (cut parallel to the base): from the sides of the two bases and the height it calculates volume, areas, slant height and edge.

## Inputs

| Port | Type | Description |
|---|---|---|
| **sides of the bases** (`n`) | number | How many sides the bases have: an integer from 3 to 1000. |
| **big base side** (`L`) | number | The side of the big base. |
| **small base side** (`l`) | number | The side of the small base (not bigger than the big side). |
| **height** (`h`) | number | The height of the frustum (the distance between the two bases). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **volume** (`volume`) | number | The volume. |
| **total area** (`area`) | number | The total area (all the faces). |
| **lateral area** (`lateral`) | number | The lateral area (without the bases). |
| **apothem (slant height)** (`slant`) | number | The slant height of the frustum: the height of a lateral face (a trapezium). |
| **lateral edge** (`edge`) | number | The lateral edge. Hidden by default: show it with the eye in Properties. |
| **big base area** (`base`) | number | The area of the big base. Hidden by default: show it with the eye in Properties. |
| **small base area** (`top`) | number | The area of the small base. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## How it works

The block **waits** until all the dimensions have arrived; then, at every new value, it calculates all the outputs again. Every dimension must be a number greater than 0 (a text with a number, such as `"2.5"`, is fine too). The measures have no units: lengths are in the unit you use, areas in its square, volumes in its cube. The results have 15 significant digits.

With *n* sides, big side *L*, small side *l*, height *h*; the areas of the bases *B₁* and *B₂* and their apothems *a₁*, *a₂* and radii *R₁*, *R₂* are those of regular polygons (n·s² / (4·tan(π/n)), s / (2·tan(π/n)), s / (2·sin(π/n))):

- volume V = h/3 · (B₁ + B₂ + √(B₁·B₂))
- slant height = √(h² + (a₁ − a₂)²)
- lateral area = n·(L + l)·slant height / 2; total area = lateral area + B₁ + B₂
- lateral edge = √(h² + (R₁ − R₂)²)

With *l* = *L* the frustum becomes a prism.

## Examples

### 1. A frustum with a square base (sides 6 and 3, height 4)

```
[Constant · Variable: 4] value ──▶ sides of the bases  [Frustum of a regular pyramid] volume ──▶ value [Print (console.log)]
[Constant · Variable: 6] value ──▶ big base side                                      apothem (slant height) ──▶ value [Print (console.log)]
[Constant · Variable: 3] value ──▶ small base side                                    total area ──▶ value [Print (console.log)]
[Constant · Variable: 4] value ──▶ height
```

Writes these lines, one per output:

```
84
4.27200187265877
121.896033707858
```

### 2. A hexagonal frustum (sides 4 and 2, height 3)

```
[Constant · Variable: 6] value ──▶ sides of the bases  [Frustum of a regular pyramid] volume ──▶ value [Print (console.log)]
[Constant · Variable: 4] value ──▶ big base side                                      lateral area ──▶ value [Print (console.log)]
[Constant · Variable: 2] value ──▶ small base side                                    lateral edge ──▶ value [Print (console.log)]
[Constant · Variable: 3] value ──▶ height
```

Writes these lines, one per output:

```
72.7461339178928
62.3538290724796
3.60555127546399
```

## Errors

| Message | When |
|---|---|
| lato della base maggiore: serve un numero maggiore di 0 (arrivato: …) ("lato della base maggiore: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| lato della base minore: serve un numero maggiore di 0 (arrivato: …) ("lato della base minore: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| altezza: serve un numero maggiore di 0 (arrivato: …) ("altezza: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| Il numero di lati deve essere un intero da 3 a 1000 ("The number of sides must be an integer from 3 to 1000") | The **sides of the bases** are not an integer from 3 to 1000. |
| Il lato della base minore non può superare quello della base maggiore ("The side of the small base cannot exceed that of the big base") | The small side is bigger than the big side. |

## See also

- [Regular right pyramid](solid.pyramid) the whole pyramid
- [Frustum of a cone](solid.frustum) the frustum of a cone
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
