# Math functions

`core.math` · Math · [Core blocks](logicstudio-core) · version 1

Does an operation on a number: round, absolute value, square root, change sign, sine, cosine, logarithm, exponential.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The number to work on. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | number | The result of the operation. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Operation** (`op`) | see the table below | round | The operation to do. |
| **Decimals (round)** (`decimals`) | from 0 to 10 | 0 | How many decimals to keep. It shows only with **round**. Empty is 0. |

The operations:

| Operation | What it does | Examples |
|---|---|---|
| **round** (`round`) | To the nearest whole number, or to the number of **Decimals** chosen. An exact .5 goes **up** (towards +∞). | 2.4 → 2; 2.5 → 3; −2.5 → **−2**; with 2 decimals 3.14159 → 3.14 |
| **round down** (`floor`) | To the largest whole number less than or equal. | 2.9 → 2; −2.1 → −3 |
| **round up** (`ceil`) | To the smallest whole number greater than or equal. | 2.1 → 3; −2.9 → −2 |
| **absolute value** (`abs`) | Removes the sign. | −3 → 3; 3 → 3 |
| **square root** (`sqrt`) | The square root. | 16 → 4; 2 → 1.4142135623730951; −1 → NaN |
| **change sign** (`neg`) | The number with the opposite sign. | 5 → −5; −5 → 5 |
| **sine** (`sin`) | The sine of an angle **in radians**. | 0 → 0; π/2 (1.5707963267948966) → 1 |
| **cosine** (`cos`) | The cosine of an angle **in radians**. | 0 → 1 |
| **natural log** (`log`) | The logarithm to base *e*. | *e* (2.718281828459045) → 1; 1 → 0; 0 → −∞; −1 → NaN |
| **exponential** (`exp`) | *e* raised to the number. | 0 → 1; 1 → 2.718281828459045 |

Angles in degrees must first be converted to radians: multiply by 0.017453292519943295 (π ÷ 180) with the [Multiply (×)](core.multiply) block.

## How it works

At every value that arrives, the block converts it to a number, does the operation and sends the result on **result**.

- The conversion follows the rules of the [Add (+)](core.add) block: `"2,5"` is 2.5; `true` is 1 and `false` is 0; an empty text and `null` are 0.
- A value that cannot be converted (`"ciao"`, an object) does **not** give an error: the result is `NaN` ("not a number"). The same goes for the root of a negative number and the logarithm of a negative number.
- With **round** and some decimals, the number is multiplied, rounded and divided: for numbers that the computer cannot write exactly the result can be surprising. For example 1.005 with 2 decimals gives **1**, not 1.01, because for the computer 1.005 is really 1.00499999…
- Write the **Decimals** as a whole number: a value with a comma (for example 1,5) gives results that make no sense.

## Examples

### 1. A price with two decimals

```
[Divide (÷ %)] result ──▶ value [Math functions: round, 2 decimals] result ──▶ value [Value: price]
```

100 ÷ 3 = 33.333333333333336 → 33.33. 0.1 + 0.2 = 0.30000000000000004 → 0.3.

### 2. How many boxes are needed

Operation **round up**: 23 items ÷ 10 per box = 2.3 → 3 boxes.

### 3. A distance without a sign

Operation **absolute value**: the difference between two heights, 120 − 150 = −30 → 30.

### 4. A wave

Link a [Counter (++ −−)](core.counter) block to **value** with operation **sine**: at every step the result swings between −1 and 1 (with step 0.1 the counter sends 0.1, 0.2, 0.3… and the sine 0.0998…, 0.1986…, 0.2955…).

## Errors

This block has no errors of its own.

## See also

- [Clamp](core.clamp) to keep a number between a minimum and a maximum
- [Divide (÷ %)](core.divide) for the remainder of a division
- [Add (+)](core.add), [Multiply (×)](core.multiply)
- [Angle](unit.angle) to go from degrees to radians before sine and cosine (package [Quantities and units](logicstudio-units))
- [How a block works](ide/blocks)
