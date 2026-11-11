# Limit

`core.clamp` · Math · [Core blocks](logicstudio-core) · version 1

Keeps a number between a minimum and a maximum: if it is smaller than the minimum it sends the minimum, if it is larger than the maximum it sends the maximum, otherwise it sends it as it is.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The number to limit. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | number | The number, brought inside the limits. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Minimum** (`min`) | a number | 0 | The smallest value that can come out. |
| **Maximum** (`max`) | a number | 100 | The largest value that can come out. |

## How it works

At every value that arrives, the block converts it to a number and brings it inside the limits:

| Value (Minimum 0, Maximum 100) | result |
|---|---|
| 50 | 50 |
| 150 | 100 |
| −5 | 0 |
| `"7,5"` | 7.5 |
| `""` or `null` | 0 (they count as 0) |
| `"ciao"` | `NaN`, with no error |

Things to know:

- The conversion follows the rules of [Add](core.add): `"2,5"` is 2.5; `true` is 1 and `false` is 0; an empty text and `null` are 0.
- A value that cannot be converted gives no error: `NaN` ("not a number") comes out, not limited.
- If the **Minimum** is larger than the **Maximum**, the **Maximum always** comes out, whatever value arrives (with Minimum 80 and Maximum 20, 20 always comes out).
- If you leave the Minimum or the Maximum **empty**, that limit is **0**: with Minimum 0 and Maximum empty, every positive number becomes 0.
- The limits are fixed: you change them only in the settings, not with a link.

## Examples

### 1. A percentage between 0 and 100

```
[Divide] result ──▶ a [Multiply: × 100] result ──▶ value [Limit: 0–100] result ──▶ value [Progress bar]
```

If the calculation gives 104 (for example because more steps were done than planned), the [Progress bar](ui.progress) receives 100; if it gives −3, it receives 0.

### 2. A temperature set by the user

Minimum 16, Maximum 28. The user writes 35 → 28 comes out; writes 10 → 16 comes out; writes `"21,5"` → 21.5 comes out.

### 3. Only one limit

To have only a maximum (for example 1000), set as Minimum a very small number, for example −1000000000: 1500 → 1000; −20 → −20.

## Errors

This block has no errors of its own.

## See also

- [Min · Max · Average](core.stat) for the smallest or the largest of several numbers
- [Calculate](core.math) to round
- [Compare](core.compare) to know if a number is outside the limits
- [How a block works](ide/blocks)
