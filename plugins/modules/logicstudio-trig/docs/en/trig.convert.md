# Convert and normalize an angle

`trig.convert` · Trigonometry · [Trigonometry](logicstudio-trig) · version 1

Converts an angle from one unit to another (degrees, radians, gradians, turns) and, if you want, brings it back inside a single turn.

## Inputs

| Port | Type | Description |
|---|---|---|
| **angle** (`angle`) | number | The angle, in the **From** unit. A text with a number (`"90.5"`) is fine. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **angle** (`angle`) | number | The angle in the **To** unit, inside the chosen **Range**. |
| **Exception** (`error`) | object | Hidden by default: show it with the eye in Properties. The angle is not a number. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **From** (`unit`) | Degrees (°), Radians (rad), Gradians (gon), Turns | Degrees (°) | The unit the angle comes in. |
| **To** (`to`) | Degrees (°), Radians (rad), Gradians (gon), Turns | Degrees (°) | The unit the angle goes out in. |
| **Range** (`range`) | As it is, From −180° to 180°, From 0° to 360° | As it is | Whether and how to remove whole turns. |

## How it works

At every angle that arrives the block converts it from the **From** unit to the **To** unit and sends the result on **angle**.

- 1 turn = 360° = 2π rad = 400 gon.
- **As it is** does not touch the turns: 450° stays 450° (and equals 7.853981633974483 rad).
- **From 0° to 360°** brings the angle from 0 (included) to a turn (excluded): 450° becomes 90°, −90° becomes 270°, 720° becomes 0°.
- **From −180° to 180°** brings it between half a turn down and half a turn up, with −180° excluded and 180° included: 270° becomes −90°, −180° becomes 180°.
- The whole turn is removed **in the starting unit** (**From**), with exact numbers: 720° gives exactly `0`, not a tiny number. The ranges speak of degrees for convenience, but hold in any unit (from 0 to 2π rad, from 0 to 400 gon, from 0 to 1 turn).
- The result is rounded to **15 significant digits**.
- To convert arcminutes and arcseconds too use [Angle](unit.angle); for degrees with minutes and seconds [Degrees → degrees, minutes, seconds](trig.toDms).

## Examples

### 1. From degrees to radians

```
[Constant · Variable: 180] value ──▶ angle [Convert and normalize an angle: ° → rad] angle ──▶ value [Print (console.log)]
```

Writes `3.14159265358979`.

### 2. From degrees to gradians

**From** degrees, **To** gradians, angle 90: writes `100`.

### 3. Removing whole turns

Angle 450, **Range** from 0° to 360°: writes `90`. With −90 it writes `270`. With 270 and range from −180° to 180° it writes `-90`.

### 4. From radians to degrees, inside a turn

**From** radians, **To** degrees, **Range** from 0° to 360°, angle 7: writes `41.0704565915763` (7 rad = 401.07°, minus a turn).

### 5. From turns to gradians

**From** turns, **To** gradians, **Range** from −180° to 180°, angle 1.25: writes `100` (1.25 turns = 450° = 90° = 100 gon).

## Errors

| Message | When |
|---|---|
| angolo: serve un numero ("angle: a number is needed") | The angle is not a number (for example a text like `"abc"`). |

## See also

- [Angle](unit.angle) to convert arcminutes and arcseconds too (package [Quantities and units](logicstudio-units))
- [Degrees → degrees, minutes, seconds](trig.toDms) and [Degrees, minutes, seconds → degrees](trig.fromDms)
- [Trigonometric functions (Math.sin, Math.cos…)](trig.fn)
- [Trigonometry](logicstudio-trig), all the blocks
- [How a block works](ide/blocks)
