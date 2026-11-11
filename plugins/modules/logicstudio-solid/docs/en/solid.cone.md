# Cone

`solid.cone` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

A right cone: from radius and height it calculates volume, areas, slant height and opening angle.

## Inputs

| Port | Type | Description |
|---|---|---|
| **radius** (`r`) | number | The radius of the base. |
| **height** (`h`) | number | The height (from the apex to the centre of the base). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **volume** (`volume`) | number | The volume. |
| **total area** (`area`) | number | The total area (all the faces). |
| **lateral area** (`lateral`) | number | The lateral area (without the bases). |
| **base area** (`base`) | number | The base area. Hidden by default: show it with the eye in Properties. |
| **apothem (slant height)** (`slant`) | number | The slant height: the height of a lateral face (in cones, the generatrix). |
| **opening angle** (`angle`) | number | The opening angle of the cone (the angle at the apex, between two opposite generatrices), in the chosen unit. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Angle unit** (`unit`) | Degrees / Radians / Gradians / Turns | Degrees | The unit of the angles: degrees, radians, gradians (gon) or turns. It holds for every angle that goes in or out of this block. |

## How it works

The block **waits** until all the dimensions have arrived; then, at every new value, it calculates all the outputs again. Every dimension must be a number greater than 0 (a text with a number, such as `"2.5"`, is fine too). The measures have no units: lengths are in the unit you use, areas in its square, volumes in its cube. The results have 15 significant digits.

With radius *r* and height *h*:

- slant height (generatrix) s = √(r² + h²)
- volume V = π·r²·h / 3
- base area = π·r²; lateral area = π·r·s; total area = π·r·(r + s)
- opening angle = 2·arctan(r / h)

The angle goes out in the unit of the **Angle unit** setting.

## Examples

### 1. A cone with radius 3 and height 4

```
[Constant · Variable: 3] value ──▶ radius  [Cone] volume ──▶ value [Print (console.log)]
[Constant · Variable: 4] value ──▶ height         apothem (slant height) ──▶ value [Print (console.log)]
                                                  total area ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
37.6991118430775
5
75.398223686155
```

The slant height is 5: the 3-4-5 triangle.

### 2. The opening angle, in degrees and in radians

```
[Constant · Variable: 1] value ──▶ radius  [Cone] opening angle ──▶ value [Print (console.log)]
[Constant · Variable: 1] value ──▶ height
```

Writes `90`.

With radius and height equal the angle is 90°. With **Angle unit** = radians it comes out as `1.5707963267949` (π/2).

## Errors

| Message | When |
|---|---|
| raggio: serve un numero maggiore di 0 (arrivato: …) ("raggio: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| altezza: serve un numero maggiore di 0 (arrivato: …) ("altezza: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |

## See also

- [Frustum of a cone](solid.frustum) the truncated cone
- [Cylinder](solid.cylinder) the cylinder with the same base
- [Convert and normalize an angle](trig.convert) to change the unit of an angle
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
