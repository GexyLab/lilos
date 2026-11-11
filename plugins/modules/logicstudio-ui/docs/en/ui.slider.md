# Slider

`ui.slider` · Commands · [Standard UI components](logicstudio-ui) · version 1

A bar with a knob to drag: the user chooses a number between a minimum and a maximum. Next to it the chosen number is shown, with its unit.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Label** | text (translatable) | empty | Text above the slider. |
| **Minimum** | number | 0 | The value on the left. |
| **Maximum** | number | 100 | The value on the right. |
| **Step** | number | 1 | How far the slider moves at each notch: with 5, the values are 0, 5, 10… With 0 or empty it counts as 1. |
| **Unit** | text | empty | Text **attached** to the number shown: with `%` you see «50%». For a space, type it yourself at the start: ` °C` gives «50 °C». |
| **At the start** | number | 0 | The position of the slider when the window opens. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | Moves the slider, without it sending anything. |
| **min** (`min`) | number | Changes the minimum. |
| **max** (`max`) | number | Changes the maximum. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and it can no longer be moved. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | When the user **releases** the slider in a new position: the number chosen. |
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

**When it sends.** While the user drags the knob, the number next to it changes but **nothing starts**: the slider sends the value **once, when the user releases it**. A click on a point of the bar moves it there and sends at once. With the keyboard, every arrow key press moves by one step and sends the new value. If the user releases it where it was, it sends nothing.

**The value** is always a multiple of the **Step** counted from the minimum, between minimum and maximum: with minimum 0, maximum 10 and step 3, the possible values are 0, 3, 6, 9.

**From the schema.**

- **value**: moves the knob. A text such as `"42"` or `"4,5"` is fine; `null` and `""` count as 0. A value that is not a number (`"hello"`, `true`, `false`) puts the knob in the middle and next to it you read «NaN». A value outside the range brings the knob to the edge, but **the number next to it shows the value received** (for example «150» with the knob all the way to the right) until the user touches it.
- **min** and **max**: change the range and redraw the slider, which keeps the last value. If the minimum exceeds the maximum, the slider stays locked at the minimum.
- The **Step** cannot be changed from the schema.

**When opened** the slider shows **At the start**, but the program does not receive it: if a schema needs to know it, give it the same number with a [Value](core.value) block.

## Examples

### 1. A threshold

```
Window «Alarm»
└ Column (root)
  ├ Slider  slider1  Label «Threshold»  Minimum 0  Maximum 50  Step 0.5  Unit « °C»  At the start 25
  └ Lamp    lamp1    Label «Above the threshold»  Color red
```

```
[Value: 25]         value ──▶ b [Compare: a > b] result ──▶ on [Lamp: Above the threshold]
[Slider: Threshold] value ──▶ b
[Every…: 10 s] pulse ──▶ read [Read file: ~/temperature.txt] content ──▶ value [Convert: number] result ──▶ a [Compare]
```

The [Value](core.value) 25 gives the comparison the initial threshold, the same as the one shown. When the user moves the slider to 30.5 and releases it, the threshold becomes 30.5.

### 2. A volume with a changing maximum

```
Window «Audio»
└ Column (root)
  ├ Checkbox  checkbox1  Label «Night mode»
  └ Slider    slider1    Label «Volume»  Unit «%»  At the start 50
```

With an [If](core.if):

```
[Checkbox: Night mode] value ──▶ condition [If] then ──▶ send [Value: 30]  value ──▶ max [Slider: Volume]
                                                else ──▶ send [Value: 100] value ──▶ max
```

With night mode the slider's maximum goes down to 30; if it was at 50, the knob goes all the way to the right but the number still shows «50%» until the user touches it. Note: the slider sends nothing when the maximum changes, so the schema still believes the volume is 50. If you need the reduced value, calculate it in the schema too with a [Limit](core.clamp).

## Accessibility and keyboard

- It is a real slider: you reach it with **Tab**; **right arrow** and **up** increase by one step, **left** and **down** decrease, **Page up/down** make bigger jumps, **Home** and **End** go to the minimum and the maximum (depending on the browser). Every press sends the value.
- The **Label** above is not linked to the slider: the screen reader reads the value but not the name.
- When the schema sends a value or a new minimum or maximum, the slider is redrawn and, if it had the keyboard focus, it loses it.

## See also

- [Number field](ui.number), to type a precise number
- [Progress bar](ui.progress), [Gauge](ui.gauge)
- [Limit](core.clamp)
- [Standard UI components](logicstudio-ui)
