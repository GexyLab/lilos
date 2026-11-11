# Right prism (any base)

`solid.prismGeneric` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

A right prism with any base: from the base area, the base perimeter and the height it calculates volume and areas.

## Inputs

| Port | Type | Description |
|---|---|---|
| **base area** (`base`) | number | The area of the base. |
| **base perimeter** (`perimeter`) | number | The perimeter of the base. |
| **height** (`h`) | number | The height of the prism. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **volume** (`volume`) | number | The volume. |
| **total area** (`area`) | number | The total area (all the faces). |
| **lateral area** (`lateral`) | number | The lateral area (without the bases). |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## How it works

The block **waits** until all the dimensions have arrived; then, at every new value, it calculates all the outputs again. Every dimension must be a number greater than 0 (a text with a number, such as `"2.5"`, is fine too). The measures have no units: lengths are in the unit you use, areas in its square, volumes in its cube. The results have 15 significant digits.

With base area *B*, perimeter *P* and height *h*:

- volume V = B·h
- lateral area = P·h; total area = P·h + 2B

The block does not check that area and perimeter are compatible (for a given area there is a minimum perimeter): it uses the values you give.

## Examples

### 1. An L-shaped base: area 12, perimeter 16, height 5

```
[Constant · Variable: 12] value ──▶ base area       [Right prism] volume ──▶ value [Print (console.log)]
[Constant · Variable: 16] value ──▶ base perimeter                lateral area ──▶ value [Print (console.log)]
[Constant · Variable: 5] value ──▶ height                         total area ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
60
80
104
```

### 2. A cylinder seen as a prism (circle of radius 1)

```
[Constant · Variable: 3.141592653589793] value ──▶ base area       [Right prism] volume ──▶ value [Print (console.log)]
[Constant · Variable: 6.283185307179586] value ──▶ base perimeter                total area ──▶ value [Print (console.log)]
[Constant · Variable: 2] value ──▶ height
```

Writes these lines, one per output:

```
6.28318530717959
18.8495559215388
```

Base area π, perimeter 2π, height 2: the same numbers as the [Cylinder](solid.cylinder) with r = 1 and h = 2.

## Errors

| Message | When |
|---|---|
| area di base: serve un numero maggiore di 0 (arrivato: …) ("area di base: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| perimetro di base: serve un numero maggiore di 0 (arrivato: …) ("perimetro di base: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| altezza: serve un numero maggiore di 0 (arrivato: …) ("altezza: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |

## See also

- [Regular right prism](solid.prism) for a regular base
- [Cylinder](solid.cylinder) the base is a circle
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
