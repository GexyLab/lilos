# Cube

`solid.cube` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

A cube: from the side it calculates volume, areas, diagonals and the radii of the inscribed and circumscribed spheres.

## Inputs

| Port | Type | Description |
|---|---|---|
| **side** (`side`) | number | The side of the cube. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **volume** (`volume`) | number | The volume. |
| **total area** (`area`) | number | The total area (all the faces). |
| **lateral area** (`lateral`) | number | The lateral area (without the bases). |
| **face diagonal** (`faceDiagonal`) | number | The diagonal of a face. Hidden by default: show it with the eye in Properties. |
| **diagonal** (`diagonal`) | number | The diagonal of the cube (between two opposite vertices). |
| **inscribed sphere radius** (`inradius`) | number | The radius of the inscribed sphere (it touches the faces). Hidden by default: show it with the eye in Properties. |
| **circumscribed sphere radius** (`circumradius`) | number | The radius of the circumscribed sphere (it goes through the vertices). Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## How it works

The block **waits** until all the dimensions have arrived; then, at every new value, it calculates all the outputs again. Every dimension must be a number greater than 0 (a text with a number, such as `"2.5"`, is fine too). The measures have no units: lengths are in the unit you use, areas in its square, volumes in its cube. The results have 15 significant digits.

With side *s*:

- volume V = s³
- total area A = 6s²; lateral area = 4s²
- face diagonal = s√2; diagonal of the cube = s√3
- radius of the inscribed sphere = s/2; of the circumscribed sphere = s√3/2

## Examples

### 1. A cube of side 2

```
[Constant · Variable: 2] value ──▶ side  [Cube] volume ──▶ value [Print (console.log)]
                                                total area ──▶ value [Print (console.log)]
                                                diagonal ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
8
24
3.46410161513775
```

### 2. The inscribed and circumscribed spheres of a cube of side 10

```
[Constant · Variable: 10] value ──▶ side  [Cube] inscribed sphere radius ──▶ value [Print (console.log)]
                                                 circumscribed sphere radius ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
5
8.66025403784439
```

These two outputs are hidden by default: show them with the eye in Properties.

## Errors

| Message | When |
|---|---|
| lato: serve un numero maggiore di 0 (arrivato: …) ("lato: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |

## See also

- [Cuboid (rectangular box)](solid.cuboid) when the three measures differ
- [From a measure to a dimension](solid.fromMeasure) to find the side from the volume or the area
- [Regular polyhedra](solid.polyhedron) all the regular polyhedra (the cube is one)
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
