# Astronomical and Earth constants

`const.astro` · Values · [Constants](logicstudio-constants) · version 1

> **Obsolete block** since version 1.1.0 of the package: saved schemas that use it work as before, but it is no longer in the list of blocks. Each constant now has its own block, in the **Astronomical constants** category: see the list in the [package overview](logicstudio-constants). This page describes the old block.

Gives the value of an astronomical or Earth constant, chosen in the settings, with its symbol, SI unit and uncertainty: the astronomical unit, the light-year, the parsec, the nominal values of the Sun and the Earth and the standard acceleration of gravity.

## Inputs

| Port | Type | Description |
|---|---|---|
| **send** (`send`) | pulse | Hidden by default: to link it, show it with the **eye** next to the port in **Properties**. If linked, the value goes out **only** at each pulse that arrives here (what arrives does not matter, even `false` or `0`). If not linked, the value goes out once at the start of the schema. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value of the chosen constant. |
| **symbol** (`symbol`) | text | Hidden by default. The symbol of the constant, as in the table below (for example `π`). |
| **unit** (`unit`) | text | Hidden by default. The SI unit of the value, as in the table below (for example `m/s`); an empty text for a pure number. |
| **uncertainty** (`uncertainty`) | number | Hidden by default. The standard uncertainty of the value, in the same unit; `0` for an exact constant. |
| **Exception** (`error`) | object | When the chosen constant does not exist in this version of the package (see **Errors**). |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Constant** (`constant`) | one of the constants in the table below | au · Astronomical unit (`au`) | Which constant to send. In the menu each item shows the symbol and the name. |

## How it works

### When it sends the value

| send | What it does |
|---|---|
| not linked | Sends the value once, at the start of the schema, on all the outputs. |
| linked | Sends the value at each pulse on **send**, never at the start. |

The block sends **value** first, then the other outputs. Hidden outputs send their value anyway: show them with the **eye** in **Properties** to link them. Under the block's name, on the drawing, there is the **key** of the chosen constant (for example `au`): you find it in the last column of the tables.

The values are double-precision numbers, like all the numbers in Logic Studio and JavaScript: they have 15-17 significant digits. So a calculation can give a result slightly different from the exact one: for example the sine of 30° comes out as `0.49999999999999994`, not `0.5`. To show it rounded use [Math functions](core.math) (`round`) after a multiplication, or [Template string](core.format).

For any number that is not in the list use [Constant · Variable](core.value).

### Notes on the constants

- **Astronomical unit**, **light-year**, **parsec** and **Julian year** are exact by definition (IAU 2012 and 2015): the light-year is the distance light travels in a Julian year (365.25 days), the parsec is 648000/π astronomical units.
- The values of the **Sun** and the **Earth** with an `exact` uncertainty are the IAU **nominal values** (2015 Resolution B3): numbers fixed by convention, to be used as units, close to the measured values but not equal (the measured solar radius, for example, changes a little with the method).
- The **masses** of the Sun and the Earth come from GM divided by G: their uncertainty comes from that of G, which is much larger than that of GM. For orbit calculations use the **gravitational parameter** (GM☉, GM⊕), which is more precise.
- The Earth's **mean radius** is that of the WGS 84 model (R₁); the **rotation rate** is that of the GRS 80 model.
- The **standard acceleration of gravity** gₙ is a conventional (exact) value close to gravity at sea level; real gravity changes with latitude and altitude.

For the general rules (hidden inputs, Exception) see [How a block works](ide/blocks).

## The constants

### Distances and times

| Symbol | Constant | Value | Uncertainty | Unit | Key |
|---|---|---|---|---|---|
| au | Astronomical unit | `149597870700` | exact | m | `au` |
| ly | Light-year | `9460730472580800` | exact | m | `ly` |
| pc | Parsec | `30856775814913670` | exact | m | `pc` |
| a | Julian year | `31557600` | exact | s | `year` |

### The Sun

| Symbol | Constant | Value | Uncertainty | Unit | Key |
|---|---|---|---|---|---|
| GM☉ | Solar mass parameter | `132712440000000000000` | exact | m³/s² | `GMsun` |
| M☉ | Solar mass | `1.98841e+30` | `4.5e+25` | kg | `Msun` |
| R☉ | Solar radius | `695700000` | exact | m | `Rsun` |
| L☉ | Solar luminosity | `3.828e+26` | exact | W | `Lsun` |
| T☉ | Solar effective temperature | `5772` | exact | K | `Tsun` |
| S☉ | Solar constant (irradiance at 1 au) | `1361` | exact | W/m² | `S` |

### The Earth

| Symbol | Constant | Value | Uncertainty | Unit | Key |
|---|---|---|---|---|---|
| GM⊕ | Earth mass parameter | `398600400000000` | exact | m³/s² | `GMearth` |
| M⊕ | Earth mass | `5.97217e+24` | `130000000000000000000` | kg | `Mearth` |
| Rₑ⊕ | Earth equatorial radius | `6378100` | exact | m | `ReEarth` |
| Rₚ⊕ | Earth polar radius | `6356800` | exact | m | `RpEarth` |
| R⊕ | Earth mean radius | `6371008.7714` | exact | m | `RmEarth` |
| ω⊕ | Earth rotation rate | `0.00007292115` | exact | rad/s | `omegaEarth` |
| gₙ | Standard acceleration of gravity | `9.80665` | exact | m/s² | `gn` |

## Examples

### 1. How long sunlight takes to arrive

```
[Astronomical and Earth constants: au] value ──▶ a [Divide (÷ %)] result ──▶ value [Print (console.log)]
[Physical constants: c]                value ──▶ b
```

Give **b** of [Divide (÷ %)](core.divide) the initial value `1` in Properties: if **au** arrives before **c**, a missing **b** is 0 and Divide would give «Divisione per zero». The last line of the console is `499.00478383615643`: about 499 seconds, that is 8 minutes and 19 seconds.

### 2. The weight of a mass

```
[Number field: mass (kg)] value ──▶ a [Multiply (×)] result ──▶ value [Value: weight (N)]
[Astronomical and Earth constants: gn] value ──▶ b
```

Remove "starts it" from the input **b**, so the start does not send gₙ alone. With 70 kg the weight is 686.4655 newtons: the [Value](ui.value) receives `686.4654999999999` because of the rounding of numbers, so set its **Decimals** (for example 2) to see it rounded.

## Errors

| Message | When |
|---|---|
| Costante sconosciuta: `key` (Unknown constant) | The key saved in the schema is not one of this version of the package: the schema was made with a newer version, or the `.lsch` file was changed by hand. Choose the constant again in **Properties**. |

## See also

- [Physical constants (CODATA)](const.physics), [Math constants (Math.PI, Math.E…)](const.math)
- [Constant · Variable](core.value), [Divide (÷ %)](core.divide)
- [How a block works](ide/blocks)
