# Sphere

`solid.sphere` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

A sphere: from the radius it calculates volume, surface, diameter and great circle.

## Inputs

| Port | Type | Description |
|---|---|---|
| **radius** (`r`) | number | The radius. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **volume** (`volume`) | number | The volume. |
| **surface** (`area`) | number | The surface. |
| **diameter** (`diameter`) | number | The diameter. Hidden by default: show it with the eye in Properties. |
| **great circle length** (`circumference`) | number | The length of the great circle. Hidden by default: show it with the eye in Properties. |
| **great circle area** (`greatCircle`) | number | The area of the great circle. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## How it works

The block **waits** until all the dimensions have arrived; then, at every new value, it calculates all the outputs again. Every dimension must be a number greater than 0 (a text with a number, such as `"2.5"`, is fine too). The measures have no units: lengths are in the unit you use, areas in its square, volumes in its cube. The results have 15 significant digits.

With radius *r*:

- volume V = 4/3·π·r³
- surface A = 4π·r²
- diameter = 2r; great circle length = 2π·r; great circle area = π·r²

## Examples

### 1. A ball of radius 1

```
[Constant · Variable: 1] value ──▶ radius  [Sphere] volume ──▶ value [Print (console.log)]
                                                    surface ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
4.18879020478639
12.5663706143592
```

### 2. The Earth (mean radius 6371 km)

```
[Constant · Variable: 6371] value ──▶ radius  [Sphere] surface ──▶ value [Print (console.log)]
                                                       great circle length ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
510064471.909788
40030.1735920411
```

The surface is in km², the circumference in km. The circumference is hidden by default.

## Errors

| Message | When |
|---|---|
| raggio: serve un numero maggiore di 0 (arrivato: …) ("raggio: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |

## See also

- [Parts of a sphere (cap, sector, zone, wedge)](solid.spherePart) cap, sector, zone, lune and wedge
- [From a measure to a dimension](solid.fromMeasure) to find the radius from the volume or the surface
- [Ellipsoid](solid.ellipsoid) the squashed sphere
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
