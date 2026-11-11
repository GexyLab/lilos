# Ellipsoid

`solid.ellipsoid` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

An ellipsoid (a squashed sphere): from the three semi-axes it calculates volume and (approximate) surface.

## Inputs

| Port | Type | Description |
|---|---|---|
| **semi-axis a** (`a`) | number | The first semi-axis. |
| **semi-axis b** (`b`) | number | The second semi-axis. |
| **semi-axis c** (`c`) | number | The third semi-axis. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **volume** (`volume`) | number | The volume. |
| **surface (≈, error < 1.1%)** (`area`) | number | The surface, approximate (error under 1.1%). |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## How it works

The block **waits** until all the dimensions have arrived; then, at every new value, it calculates all the outputs again. Every dimension must be a number greater than 0 (a text with a number, such as `"2.5"`, is fine too). The measures have no units: lengths are in the unit you use, areas in its square, volumes in its cube. The results have 15 significant digits.

With semi-axes *a*, *b*, *c*:

- volume V = 4/3·π·a·b·c (exact)
- surface ≈ 4π·(((ab)ᵖ + (ac)ᵖ + (bc)ᵖ) / 3)^(1/p) with p = 1.6075 (Knud Thomsen's formula)

The surface of an ellipsoid has no simple formula: Thomsen's is wrong by 1.1% at most. For a sphere (a = b = c) it is exact.

## Examples

### 1. A rugby ball: semi-axes 15, 8, 8

```
[Constant · Variable: 15] value ──▶ semi-axis a  [Ellipsoid] volume ──▶ value [Print (console.log)]
[Constant · Variable: 8] value ──▶ semi-axis b               surface (≈, error < 1.1%) ──▶ value [Print (console.log)]
[Constant · Variable: 8] value ──▶ semi-axis c
```

Writes these lines, one per output:

```
4021.23859659493
1300.24869953216
```

### 2. With three equal semi-axes it is a sphere

```
[Constant · Variable: 1] value ──▶ semi-axis a  [Ellipsoid] volume ──▶ value [Print (console.log)]
[Constant · Variable: 1] value ──▶ semi-axis b              surface (≈, error < 1.1%) ──▶ value [Print (console.log)]
[Constant · Variable: 1] value ──▶ semi-axis c
```

Writes these lines, one per output:

```
4.18879020478639
12.5663706143592
```

The same numbers as the [Sphere](solid.sphere) of radius 1.

## Errors

| Message | When |
|---|---|
| semiasse a: serve un numero maggiore di 0 (arrivato: …) ("semiasse a: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| semiasse b: serve un numero maggiore di 0 (arrivato: …) ("semiasse b: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| semiasse c: serve un numero maggiore di 0 (arrivato: …) ("semiasse c: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |

## See also

- [Sphere](solid.sphere) when the semi-axes are equal
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
