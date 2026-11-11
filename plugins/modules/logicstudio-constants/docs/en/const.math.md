# Math constants (Math.PI, Math.E…)

`const.math` · Values · [Constants](logicstudio-constants) · version 1

> **Obsolete block** since version 1.1.0 of the package: saved schemas that use it work as before, but it is no longer in the list of blocks. Each constant now has its own block, in the **Math constants** category: see the list in the [package overview](logicstudio-constants). This page describes the old block.

Gives the value of a mathematical constant, chosen in the settings: π, τ, e, the golden ratio, the roots and logarithms that JavaScript has in `Math` (`Math.PI`, `Math.SQRT2`, `Math.LN2`…), one degree in radians, the Euler–Mascheroni, Catalan, Apéry, Feigenbaum… constants and the limits of JavaScript numbers (`Number.EPSILON`, `Number.MAX_SAFE_INTEGER`…).

## Inputs

| Port | Type | Description |
|---|---|---|
| **send** (`send`) | pulse | Hidden by default: to link it, show it with the **eye** next to the port in **Properties**. If linked, the value goes out **only** at each pulse that arrives here (what arrives does not matter, even `false` or `0`). If not linked, the value goes out once at the start of the schema. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value of the chosen constant. |
| **symbol** (`symbol`) | text | Hidden by default. The symbol of the constant, as in the table below (for example `π`). |
| **Exception** (`error`) | object | When the chosen constant does not exist in this version of the package (see **Errors**). |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Constant** (`constant`) | one of the constants in the table below | π · Pi (Math.PI) (`pi`) | Which constant to send. In the menu each item shows the symbol and the name. |

## How it works

### When it sends the value

| send | What it does |
|---|---|
| not linked | Sends the value once, at the start of the schema, on all the outputs. |
| linked | Sends the value at each pulse on **send**, never at the start. |

The block sends **value** first, then the other outputs. Hidden outputs send their value anyway: show them with the **eye** in **Properties** to link them. Under the block's name, on the drawing, there is the **key** of the chosen constant (for example `pi`): you find it in the last column of the tables.

The values are double-precision numbers, like all the numbers in Logic Studio and JavaScript: they have 15-17 significant digits. So a calculation can give a result slightly different from the exact one: for example the sine of 30° comes out as `0.49999999999999994`, not `0.5`. To show it rounded use [Math functions](core.math) (`round`) after a multiplication, or [Template string](core.format).

For any number that is not in the list use [Constant · Variable](core.value).

### Notes on the constants

- **τ** is 2π, the full turn in radians; **one degree in radians** (`deg`) is π/180: multiply an angle in degrees by this constant to have it in radians, as `sin` and `cos` of [Math functions](core.math) want.
- The `Math` constants (π, e, `SQRT2`, `SQRT1_2`, `LN2`, `LN10`, `LOG2E`, `LOG10E`) are exactly those of JavaScript.
- **Machine epsilon** is the distance between 1 and the next number: two numbers that differ by less than this, after a calculation, can be considered equal.
- **Largest safe integer** is 2⁵³ − 1: beyond it, not every integer can be represented (`9007199254740993` becomes `9007199254740992`).
- **Largest number** and **smallest positive number** are the limits of JavaScript numbers: beyond the first a calculation gives `Infinity`, below the second it gives 0.

For the general rules (hidden inputs, Exception) see [How a block works](ide/blocks).

## The constants

### Classic constants

| Symbol | Constant | Value | Key |
|---|---|---|---|
| π | Pi (Math.PI) | `3.141592653589793` | `pi` |
| τ | Tau (2π) | `6.283185307179586` | `tau` |
| e | Euler's number (Math.E) | `2.718281828459045` | `e` |
| φ | Golden ratio | `1.618033988749895` | `phi` |
| δS | Silver ratio (1 + √2) | `2.414213562373095` | `silver` |
| ρ | Plastic number | `1.324717957244746` | `plastic` |
| √2 | Square root of 2 (Math.SQRT2) | `1.4142135623730951` | `sqrt2` |
| √½ | Square root of 1/2 (Math.SQRT1_2) | `0.7071067811865476` | `sqrt1_2` |
| √3 | Square root of 3 | `1.7320508075688772` | `sqrt3` |
| ln 2 | Natural log of 2 (Math.LN2) | `0.6931471805599453` | `ln2` |
| ln 10 | Natural log of 10 (Math.LN10) | `2.302585092994046` | `ln10` |
| log₂ e | Base-2 log of e (Math.LOG2E) | `1.4426950408889634` | `log2e` |
| log₁₀ e | Base-10 log of e (Math.LOG10E) | `0.4342944819032518` | `log10e` |
| ° | One degree in radians (π/180) | `0.017453292519943295` | `deg` |

### Analysis and dynamical systems

| Symbol | Constant | Value | Key |
|---|---|---|---|
| γ | Euler–Mascheroni constant | `0.5772156649015329` | `gamma` |
| G | Catalan's constant | `0.915965594177219` | `catalan` |
| ζ(3) | Apéry's constant | `1.2020569031595942` | `apery` |
| Ω | Omega constant | `0.5671432904097838` | `omega` |
| K₀ | Khinchin's constant | `2.6854520010653062` | `khinchin` |
| δ | Feigenbaum constant δ | `4.66920160910299` | `feigenbaumDelta` |
| α | Feigenbaum constant α | `2.5029078750958926` | `feigenbaumAlpha` |

### Number limits

| Symbol | Constant | Value | Key |
|---|---|---|---|
| ε | Machine epsilon (Number.EPSILON) | `2.220446049250313e-16` | `epsilon` |
| 2⁵³ − 1 | Largest safe integer (Number.MAX_SAFE_INTEGER) | `9007199254740991` | `maxSafe` |
| max | Largest number (Number.MAX_VALUE) | `1.7976931348623157e+308` | `maxValue` |
| min | Smallest positive number (Number.MIN_VALUE) | `5e-324` | `minValue` |

## Examples

### 1. Sine of an angle in degrees

```
[Constant · Variable: 30] value ──▶ a [Multiply (×)] result ──▶ value [Math functions: sin] result ──▶ value [Print (console.log)]
[Math constants: deg] value ──▶ b
```

The last line of the console is `0.49999999999999994`, that is 0.5 up to the rounding of numbers (before it, if the 30 arrives first, [Multiply (×)](core.multiply) sends the 30 alone, as it counts the values arrived so far).

### 2. Circumference of a circle

```
[Math constants: tau] value ──▶ a [Multiply (×)] result ──▶ value [Print (console.log)]
[Number field: radius] value ──▶ b
```

At the start the console already shows `6.283185307179586`: the radius has not arrived yet and [Multiply (×)](core.multiply) multiplies only the values it has. With radius 3 it shows `18.84955592153876` (2π · 3), and every time you change the radius the new circumference goes out, because Multiply keeps the last value of each input. To avoid the line at the start remove "starts it" from the input **a**.

### 3. The value with its symbol

```
[Math constants: phi] symbol ──▶ s [Template string: {s} = {v}] text ──▶ value [Print (console.log)]
                      value  ──▶ v
```

First show **symbol** with the eye in Properties, and add the inputs `s` and `v` to the [Template string](core.format). The last line of the console is `φ = 1.618033988749895`.

## Errors

| Message | When |
|---|---|
| Costante sconosciuta: `key` (Unknown constant) | The key saved in the schema is not one of this version of the package: the schema was made with a newer version, or the `.lsch` file was changed by hand. Choose the constant again in **Properties**. |

## See also

- [Physical constants (CODATA)](const.physics), [Astronomical and Earth constants](const.astro)
- [Constant · Variable](core.value), [Math functions](core.math)
- [How a block works](ide/blocks)
