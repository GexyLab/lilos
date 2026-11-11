# Degrees, minutes, seconds → degrees

`trig.fromDms` · Trigonometry · [Trigonometry](logicstudio-trig) · version 1

Puts degrees, minutes and seconds together into a single angle in degrees with decimals. It also reads a text like `45° 30′ 15″ N`.

## Inputs

| Port | Type | Description |
|---|---|---|
| **degrees** (`degrees`) | number | The degrees. The sign of the angle goes here. |
| **minutes** (`minutes`) | number | The minutes, from 0 to less than 60. |
| **seconds** (`seconds`) | number | The seconds, from 0 to less than 60, decimals allowed. |
| **text (12° 30′ 15″ N)** (`text`) | text | Hidden by default: show it with the eye in Properties. A written angle, in place of the three ports above. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **angle (°)** (`angle`) | number | The angle in degrees, with decimals. |
| **Exception** (`error`) | object | Hidden by default: show it with the eye in Properties. A value is not valid or the text cannot be understood. |

This block has no settings.

## How it works

The block has two modes, depending on the port a value arrives on.

**From degrees, minutes and seconds.** The result is `degrees + minutes ÷ 60 + seconds ÷ 3600`. A port that is **not linked** counts as 0, so you can link only the degrees, or degrees and minutes. If a port is linked but has no value yet, the block waits.

- The sign goes on the **degrees**: degrees −12, minutes 30 gives −12.5° (that is −12° 30′). With degrees `-0` and minutes 30 it gives −0.5°.
- Minutes and seconds must go from 0 to less than 60 and not be negative.

**From a text** (port **text**). The text is made of degrees, then, if you want, minutes and seconds:

- degrees can be written with `°`, with the letter `d` or with a space;
- minutes with `′`, `'`, the letter `m` or a space;
- seconds with `″`, `"`, `''` or the letter `s` (or with nothing, if it is the last number);
- the numbers are read **in order**: the first is degrees, the second minutes, the third seconds (`12 30` = 12° 30′); the symbols only separate them;
- at the start a sign `+`, `-` or `−`; at the end, if you want, a letter: **N** and **E** leave the sign as it is, **S**, **W** and **O** (Italian for west) make the angle negative (upper and lower case are the same);
- the point or the comma for decimals: `12,5`.

Examples of texts: `45° 30′ 15″ N`, `12 30 15 S`, `12°30'15"`, `12d30m15s`, `73° 59′ 8″ W`, `-12° 30′`, `90°`, `10,5 O`.

- **Degrees** alone are fine without a symbol too: `10.5`, `10.5°` and `10,5 O`.
- Minutes and seconds must be less than 60.
- When a text arrives, the block reads only the text and ignores the numbers of the other ports at that moment.

The result is rounded to **15 significant digits**.

## Examples

### 1. From three numbers

```
[Constant · Variable: 45] value ──▶ degrees [Degrees, minutes, seconds → degrees] angle (°) ──▶ value [Print (console.log)]
[Constant · Variable: 30] value ──▶ minutes
[Constant · Variable: 15] value ──▶ seconds
```

Writes `45.5041666666667`.

### 2. A west longitude

Text `73° 59′ 8″ W` on the **text** port: writes `-73.9855555555555`.

### 3. The sign on the degrees

Degrees −12, minutes 30, seconds 0 (only degrees and minutes linked): writes `-12.5`.

### 4. A text with the hemisphere letter

Text `12 30 15 S`: writes `-12.5041666666667`. Text `10,5 O` (O = west): writes `-10.5`.

### 5. An error

Degrees 10, minutes 75: error `Primi e secondi vanno da 0 a meno di 60 (il segno va sui gradi)`.

## Errors

| Message | When |
|---|---|
| gradi: serve un numero ("degrees: a number is needed") | The degrees are not a number. |
| primi: serve un numero ("minutes: a number is needed") | The minutes are not a number. |
| secondi: serve un numero ("seconds: a number is needed") | The seconds are not a number. |
| Primi e secondi vanno da 0 a meno di 60 (il segno va sui gradi) ("Minutes and seconds go from 0 to less than 60 (the sign goes on the degrees)") | With numbers: minutes or seconds negative, or 60 or more. |
| Angolo non riconosciuto: «…» (scrivi per esempio 12° 30′ 15″ o 12 30 15 N) ("Angle not recognized… write for example 12° 30′ 15″ or 12 30 15 N") | The text does not have the right form. In place of … is the text received. |
| Primi e secondi devono essere minori di 60 ("Minutes and seconds must be less than 60") | With the text: the minutes or the seconds are 60 or more. |

## See also

- [Degrees → degrees, minutes, seconds](trig.toDms) to do the opposite
- [Convert and normalize an angle](trig.convert) to go to other units
- [Angle](unit.angle) for arcminutes and arcseconds as units (package [Quantities and units](logicstudio-units))
- [Trigonometry](logicstudio-trig), all the blocks
- [How a block works](ide/blocks)
