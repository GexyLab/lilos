# Progress bar

`ui.progress` · Text and values · [Standard UI components](logicstudio-ui) · version 1

A horizontal bar that fills from 0 to 100, with the percentage next to it: to show how far a job is from the end.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Label** | text (translatable) | empty | Text above the bar. |
| **Show the percentage** | yes/no | yes | Shows the number (for example «42%») to the right of the bar. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **value (0–100)** (`value`) | number | How full the bar is, as a percentage. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

When opened the bar is empty and the percentage is not shown. Every value on **value (0–100)**:

- is converted to a number (`"42"` and `"42,5"` are fine); a value that is not a number (`"hello"`, `null`, `true`) is worth **0**;
- is kept **between 0 and 100**: −5 fills 0, 150 fills 100;
- fills the bar with a short animation and writes the percentage **rounded to the integer** («42.5» becomes «43%»).

The bar knows no other ranges: if your job goes, for example, from 0 to 250 files, calculate the percentage in the schema (done / total × 100).

## Examples

### 1. Ten seconds of waiting

```
Window «Wait»
└ Column (root)
  └ Progress bar  progress1  Label «Preparing…»
```

```
[Interval (setInterval): 1 s] pulse ──▶ up [Counter (++ −−)] count ──▶ a [Multiply (×)] result ──▶ value (0–100) [Bar: Preparing…]
                                      [Constant · Variable: 10] value ──▶ b
```

Every second the [Counter (++ −−)](core.counter) goes up by 1 and the [Multiply (×)](core.multiply) turns it into a percentage: the bar shows 10%, 20%… and after 10 seconds 100%. After that, the count goes on (110, 120…) but the bar stays full.

### 2. A countdown

```
Window «Break»
└ Column (root)
  └ Progress bar  progress1  Label «Time left»  Show the percentage off
```

```
[Interval (setInterval): 1 s] pulse ──▶ up [Counter (++ −−)] count ──▶ b [Subtract (−)] result ──▶ value (0–100) [Bar: Time left]
                                      [Constant · Variable: 100] value ──▶ a
```

For a break of 100 seconds: the [Subtract (−)](core.subtract) calculates 100 − seconds passed, and the bar empties by one hundredth per second, with no number next to it. Below zero the bar stays empty.

### 3. The same value as a slider

```
[Slider: Volume] value ──▶ value (0–100) [Bar: Volume]
```

With a [Slider](ui.slider) from 0 to 100, the bar shows the same value when the user releases the slider.

## Accessibility

The bar has the role of a progress bar, with the value from 0 to 100: a screen reader can read it («progress bar, 42»). The **Label** above is not linked to the bar, so the bar has no name of its own. Before the first value the bar does not say what it is worth.

## See also

- [Gauge](ui.gauge), for values with a range of your own
- [Value](ui.value)
- [Standard UI components](logicstudio-ui)
