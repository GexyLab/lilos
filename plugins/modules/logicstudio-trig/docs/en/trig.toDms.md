# Degrees → degrees, minutes, seconds

`trig.toDms` · Trigonometry · [Trigonometry](logicstudio-trig) · version 1

Splits an angle in degrees into degrees, minutes and seconds (as in geographic coordinates), and also makes a text like `40° 42′ 46″` from it.

## Inputs

| Port | Type | Description |
|---|---|---|
| **angle (°)** (`angle`) | number | The angle **in degrees**, with decimals (`40.7128`). A text with a number is fine. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **degrees** (`degrees`) | number | The whole degrees, with the sign of the angle. |
| **minutes** (`minutes`) | number | The whole minutes, from 0 to 59. |
| **seconds** (`seconds`) | number | The seconds, from 0 to less than 60, with the chosen decimals. |
| **text** (`text`) | text | The three values written out, for example `40° 42′ 46″`. |
| **Exception** (`error`) | object | Hidden by default: show it with the eye in Properties. The angle is not a number. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Decimals of the seconds** (`decimals`) | from 0 to 6 | 0 | How many decimals to keep in the seconds. |

## How it works

At every angle that arrives the block splits it: 1° = 60′ and 1′ = 60″. Degrees and minutes are always whole; the seconds have the chosen **Decimals** and are rounded.

- The sign goes on the **degrees**: −12.5° gives degrees −12, minutes 30, seconds 0. Minutes and seconds are always positive.
- A negative angle under one degree (−0.5°) gives degrees `-0` (reads as 0), minutes 30 and the text `-0° 30′ 0″`: the sign shows in the text.
- Rounding the seconds carries the rest over to the minutes and the degrees: 29.9999999° with 0 decimals gives `30° 0′ 0″`, not `29° 59′ 60″`.
- The text uses the symbols ° ′ ″ (real prime and double prime, not quotes). [Degrees, minutes, seconds → degrees](trig.fromDms) reads this text too.
- An angle in other units must first be converted to degrees with [Convert and normalize an angle](trig.convert).

## Examples

### 1. A latitude

```
[Constant · Variable: 40.7128] value ──▶ angle (°) [Degrees → degrees, minutes, seconds] text ──▶ value [Print (console.log)]
```

Writes `40° 42′ 46″`. With 3 **Decimals of the seconds** it writes `40° 42′ 46.080″`.

### 2. The three parts

With 45.5 the outputs are **degrees** `45`, **minutes** `30`, **seconds** `0`, **text** `45° 30′ 0″`.

### 3. A negative angle

With −73.9855 it writes `-73° 59′ 8″` (degrees −73, minutes 59, seconds 8).

### 4. With two decimals

With 12.3456 and 2 decimals: `12° 20′ 44.16″`.

## Errors

| Message | When |
|---|---|
| angolo: serve un numero ("angle: a number is needed") | The angle is not a number (for example a text like `"abc"`). |

## See also

- [Degrees, minutes, seconds → degrees](trig.fromDms) to do the opposite
- [Convert and normalize an angle](trig.convert)
- [Angle](unit.angle) for arcminutes and arcseconds as units (package [Quantities and units](logicstudio-units))
- [Trigonometry](logicstudio-trig), all the blocks
- [How a block works](ide/blocks)
