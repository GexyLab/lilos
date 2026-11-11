# Cuboid (rectangular box)

`solid.cuboid` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

A cuboid (a box): from length, width and height it calculates volume, areas and diagonal.

## Inputs

| Port | Type | Description |
|---|---|---|
| **length a** (`a`) | number | The length. |
| **width b** (`b`) | number | The width. |
| **height c** (`c`) | number | The height. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **volume** (`volume`) | number | The volume. |
| **total area** (`area`) | number | The total area (all the faces). |
| **lateral area** (`lateral`) | number | The lateral area (without the bases). |
| **base area** (`base`) | number | The base area. Hidden by default: show it with the eye in Properties. |
| **diagonal** (`diagonal`) | number | The space diagonal (between two opposite vertices). |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## How it works

The block **waits** until all the dimensions have arrived; then, at every new value, it calculates all the outputs again. Every dimension must be a number greater than 0 (a text with a number, such as `"2.5"`, is fine too). The measures have no units: lengths are in the unit you use, areas in its square, volumes in its cube. The results have 15 significant digits.

With the measures *a*, *b*, *c*:

- volume V = a·b·c
- total area A = 2(ab + bc + ca)
- base area = a·b; lateral area = 2c(a + b)
- diagonal = √(a² + b² + c²)

## Examples

### 1. A 3 × 4 × 12 box

```
[Constant · Variable: 3] value ──▶ length a   [Cuboid] volume ──▶ value [Print (console.log)]
[Constant · Variable: 4] value ──▶ width b             total area ──▶ value [Print (console.log)]
[Constant · Variable: 12] value ──▶ height c           diagonal ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
144
192
13
```

### 2. A brick 25 × 12 × 6.5

```
[Constant · Variable: 25] value ──▶ length a   [Cuboid] volume ──▶ value [Print (console.log)]
[Constant · Variable: 12] value ──▶ width b             lateral area ──▶ value [Print (console.log)]
[Constant · Variable: 6.5] value ──▶ height c
```

Writes these lines, one per output:

```
1950
481
```

In centimetres: the volume is in cm³, the lateral area in cm².

## Errors

| Message | When |
|---|---|
| lunghezza a: serve un numero maggiore di 0 (arrivato: …) ("lunghezza a: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| larghezza b: serve un numero maggiore di 0 (arrivato: …) ("larghezza b: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| altezza c: serve un numero maggiore di 0 (arrivato: …) ("altezza c: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |

## See also

- [Cube](solid.cube) when the three measures are equal
- [Mass from volume and material](solid.mass) for the mass from the volume
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
