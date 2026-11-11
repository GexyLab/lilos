# Frustum of a cone

`solid.frustum` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

The frustum of a cone (cut parallel to the base): from radii and height it calculates volume, areas and slant height.

## Inputs

| Port | Type | Description |
|---|---|---|
| **big radius** (`R`) | number | The radius of the big base. |
| **small radius** (`r`) | number | The radius of the small base (not bigger than the big radius). |
| **height** (`h`) | number | The height (the distance between the two bases). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **volume** (`volume`) | number | The volume. |
| **total area** (`area`) | number | The total area (all the faces). |
| **lateral area** (`lateral`) | number | The lateral area (without the bases). |
| **apothem (slant height)** (`slant`) | number | The slant height: the height of a lateral face (in cones, the generatrix). |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## How it works

The block **waits** until all the dimensions have arrived; then, at every new value, it calculates all the outputs again. Every dimension must be a number greater than 0 (a text with a number, such as `"2.5"`, is fine too). The measures have no units: lengths are in the unit you use, areas in its square, volumes in its cube. The results have 15 significant digits.

With big radius *R*, small radius *r* and height *h*:

- volume V = π·h·(R² + R·r + r²) / 3
- slant height s = √(h² + (R − r)²)
- lateral area = π·(R + r)·s; total area = lateral area + π·(R² + r²)

With *r* = *R* the frustum becomes a cylinder.

## Examples

### 1. A bucket: radii 12 and 9, height 20

```
[Constant · Variable: 12] value ──▶ big radius   [Frustum of a cone] volume ──▶ value [Print (console.log)]
[Constant · Variable: 9] value ──▶ small radius                      apothem (slant height) ──▶ value [Print (console.log)]
[Constant · Variable: 20] value ──▶ height                           lateral area ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
6974.33569096934
20.2237484161567
1334.23036849717
```

### 2. With equal radii it is a cylinder

```
[Constant · Variable: 2] value ──▶ big radius    [Frustum of a cone] volume ──▶ value [Print (console.log)]
[Constant · Variable: 2] value ──▶ small radius                      total area ──▶ value [Print (console.log)]
[Constant · Variable: 5] value ──▶ height
```

Writes these lines, one per output:

```
62.8318530717959
87.9645943005142
```

The same numbers as the [Cylinder](solid.cylinder) with r = 2 and h = 5.

## Errors

| Message | When |
|---|---|
| raggio maggiore: serve un numero maggiore di 0 (arrivato: …) ("raggio maggiore: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| raggio minore: serve un numero maggiore di 0 (arrivato: …) ("raggio minore: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| altezza: serve un numero maggiore di 0 (arrivato: …) ("altezza: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| Il raggio minore non può superare il raggio maggiore ("The small radius cannot exceed the big radius") | The small radius is bigger than the big radius. |

## See also

- [Cone](solid.cone) the whole cone
- [Frustum of a regular pyramid](solid.frustumPyramid) the frustum of a pyramid
- [Cylinder](solid.cylinder) when the two radii are equal
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
