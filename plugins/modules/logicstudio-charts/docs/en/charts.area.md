# Areas

`charts.area` · Charts · [Charts](logicstudio-charts) · version 1

Like [Lines](charts.line), with the space between the line and zero coloured. Areas can also be **stacked** (each series on top of the previous one, to see the total) or shown **at 100%** (each series as a part of the total at that point).

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Title** | text (translatable) | empty | Written above the chart; it also names the PNG and CSV files. |
| **Height (px)** | 20 to 2000 | 200 | The height of the drawing. |
| **Legend** | yes/no | yes | Shows the legend (from two series up). |
| **Unit** | text | empty | Above the axis and after every value. |
| **Decimals** | 0 to 10 | empty | Digits after the decimal point in the box and in the table. |
| **Minimum (empty: automatic)** | number | empty | The value at the bottom of the axis. |
| **Maximum (empty: automatic)** | number | empty | The value at the top of the axis. |
| **Points kept per series** | 10 to 100000 | 1000 | Beyond it, the oldest point goes away (the administrator's limit also applies). |
| **Colours** | `standard`, `blue` | `standard` | 8 different colours, or 6 shades of blue. |
| **Table view, PNG and CSV buttons** | yes/no | yes | The three buttons at the top right. |
| **Stacking** | `none`, `stacked`, `percent` | `none` | `none`: areas one in front of the other; `stacked`: stacked; `percent`: stacked and brought to 100%. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **data (list or object)** (`data`) | any | Replaces all the data. The shapes are those of [Lines](charts.line). |
| **add point** (`add`) | any | Adds a point (or one point per series). |
| **clear** (`clear`) | pulse | Removes all the points. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and turns it off. |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **picked point** (`picked`) | object | The x chosen with a click or **Enter**: `{ x, time?, values, index }`, as in [Lines](charts.line). |
| **Exception** (`error`) | object | Like every block; nothing goes through it today. |

## How it works

The data, the x axis (numbers, ISO dates or categories), **add point**, the number of points kept and **picked point** work as in [Lines](charts.line). The differences:

- **The value axis always includes zero**: the areas start from there. With values between 50 and 60 the axis goes from 0 to 60 (unless you choose a **Minimum**).
- **Without stacking** (`none`) every series is a transparent area above zero, with its line. A point without a value breaks the area.
- **Stacked** (`stacked`): every series sits on top of the previous one, in the order of the series; the top of the last one is the total. For each x only the **positive** values are added: a negative value counts as 0. A series that has no value at an x counts 0 at that x.
- **At 100%** (`percent`): like stacked, but at each x the values become their part of the total; the axis goes from 0 to 100. If the total at an x is 0, all the series are 0 there.
- With stacked areas the values box and **picked point** give the **real values** of every series (not the summed ones, nor the percentages).
- The series turned off with the legend also leave the stack: the others go down again.

## Examples

### 1. Greenhouse consumption, stacked

```
Window "Consumption"
└ Column (root)
  └ Areas  area1  Title "Consumption"  Unit "€"  Stacking stacked
```

```
[Value (JSON): {"Jan": {"Water": 30, "Fertiliser": 10, "Energy": 25}, "Feb": {"Water": 28, "Fertiliser": 12, "Energy": 22}, "Mar": {"Water": 35, "Fertiliser": 15, "Energy": 18}}] value ──▶ data [Areas: Consumption]
```

Three bands one on top of the other; the top in January is 65 €, in February 62 €, in March 68 €. The box on "Feb" says "Water 28 €", "Fertiliser 12 €", "Energy 22 €".

### 2. The same thing in percentage

Change **Stacking** to `percent`: every month reaches 100. In January water takes about 46% (30 out of 65), fertiliser 15%, energy 38%. The box always shows the values in euros.

### 3. Two measures that grow, one point at a time

```
[Every…: 60 s] pulse ──▶ read [Read file: ~/meters.json, JSON] content ──▶ add point [Areas: Litres]
```

Each time the file contains an object like `{"Well": 120, "Mains": 45}`: at every reading the two series receive one point each, at the next x (0, 1, 2...). To have the time on the axis, write the date in the file too: `{"x": "2026-11-11T10:00:00Z", "Well": 120, "Mains": 45}`.

## Accessibility and keyboard

As in [Lines](charts.line): **Tab** to reach it, arrows to go from one x to the next, **Enter** to send the point, **Esc** to clear the choice. **Show as a table** has one row per x and one column per series, with the real values.

## See also

- [Lines](charts.line), [Columns](charts.column) (also stackable)
- [Pie · Donut](charts.pie) for the parts of a total at a single moment
- [Charts](logicstudio-charts): the data shapes, the limits, the keyboard
