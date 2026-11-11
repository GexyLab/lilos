# Cylinder

`solid.cylinder` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

A right cylinder: from radius and height it calculates volume and areas.

## Inputs

| Port | Type | Description |
|---|---|---|
| **radius** (`r`) | number | The radius of the base. |
| **height** (`h`) | number | The height. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **volume** (`volume`) | number | The volume. |
| **total area** (`area`) | number | The total area (all the faces). |
| **lateral area** (`lateral`) | number | The lateral area (without the bases). |
| **base area** (`base`) | number | The base area. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## How it works

The block **waits** until all the dimensions have arrived; then, at every new value, it calculates all the outputs again. Every dimension must be a number greater than 0 (a text with a number, such as `"2.5"`, is fine too). The measures have no units: lengths are in the unit you use, areas in its square, volumes in its cube. The results have 15 significant digits.

With radius *r* and height *h*:

- volume V = π·r²·h
- base area = π·r²
- lateral area = 2π·r·h; total area = 2π·r·(r + h)

## Examples

### 1. A can: radius 4, height 10

```
[Constant · Variable: 4] value ──▶ radius   [Cylinder] volume ──▶ value [Print (console.log)]
[Constant · Variable: 10] value ──▶ height             total area ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
502.654824574367
351.858377202057
```

### 2. A pipe: radius 0.5, height 3

```
[Constant · Variable: 0.5] value ──▶ radius  [Cylinder] lateral area ──▶ value [Print (console.log)]
[Constant · Variable: 3] value ──▶ height               base area ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
9.42477796076938
0.785398163397448
```

The base area is hidden by default.

## Errors

| Message | When |
|---|---|
| raggio: serve un numero maggiore di 0 (arrivato: …) ("raggio: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| altezza: serve un numero maggiore di 0 (arrivato: …) ("altezza: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |

## See also

- [From a measure to a dimension](solid.fromMeasure) to find the radius or the height from the volume
- [Cone](solid.cone) the cone with the same base
- [Mass from volume and material](solid.mass) for the mass from the volume
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
