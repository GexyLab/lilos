# Gauge

`ui.gauge` · Text and values · [Standard UI components](logicstudio-ui) · version 1

A number shown on a semicircular arc, like a needle: the arc fills from left to right between a minimum and a maximum. Below the arc is the number, with its unit.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Label** | text (translatable) | empty | Text below the gauge. |
| **Minimum** | number | 0 | The value that matches the empty arc. |
| **Maximum** | number | 100 | The value that matches the full arc. |
| **Unit** | text | empty | Text after the number, smaller. |
| **Decimals** | from 0 to 6 | 1 | How many digits after the decimal point to show. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value to show. |
| **min** (`min`) | number | Changes the minimum (it takes the place of the **Minimum** property). |
| **max** (`max`) | number | Changes the maximum (it takes the place of the **Maximum** property). |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

When opened, the arc is empty and the number is «—». Every value on **value** redraws the arc and the number.

- **The filled part** is (value − minimum) / (maximum − minimum). Below the minimum the arc stays empty, above the maximum it stays full; **the number shown is always the real one**, even outside the range (with maximum 100 and value 130 you see the full arc and «130.0»).
- **Values are converted to a number**: `"21,5"` and `"21.5"` are worth 21.5 (only the first comma becomes a dot: `"1.234,5"` is not a number). `null`, nothing and `""` are worth **0** (the arc empties but the number is «0.0», not «—»). A text that is not a number (for example `"hello"`), and also `true` or `false`, bring back «—» with the arc empty.
- **The number** is formatted in the language of whoever is looking, with the chosen **Decimals**: 21.456 with 1 decimal is «21.5».
- If **min** and **max** are equal, the gauge cannot divide by zero: it treats the range as 1 wide.
- If the minimum is larger than the maximum, the arc behaves the other way round (it fills when the value goes down).
- **min** and **max** redraw the arc at once with the last value received.

## Examples

### 1. A temperature

```
Window «Boiler»
└ Column (root)
  └ Gauge  gauge1  Label «Water»  Minimum 20  Maximum 90  Unit «°C»  Decimals 0
```

```
[Interval (setInterval): 5 s] pulse ──▶ read [readFile: ~/boiler.txt] content ──▶ value [Gauge: Water]
```

If the file contains `55`, the arc is half full ((55 − 20) / (90 − 20) = 0.5) and below you read «55 °C».

### 2. Disk usage with the maximum coming from the schema

```
Window «Space»
└ Column (root)
  └ Gauge  gauge1  Label «Used»  Unit «GB»
```

```
[Constant · Variable: 256] value ──▶ max    [Gauge: Used]
[Constant · Variable: 180] value ──▶ value
```

At the start the two [Constant · Variable](core.value) blocks send 256 and 180: the arc is 70% full and you read «180.0 GB». In the real project, instead of the second block put the block that calculates the used space.

## Accessibility

The arc is a drawing: a screen reader does not read it. It reads the number with the unit and the label, which are text. The value that changes is not announced.

## See also

- [Progress bar](ui.progress), [Value](ui.value)
- [Clamp](core.clamp) to keep a value between two numbers
- [Standard UI components](logicstudio-ui)
