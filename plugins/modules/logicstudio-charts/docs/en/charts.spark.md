# Sparkline

`charts.spark` · Charts · [Charts](logicstudio-charts) · version 1

A **small line**, without axes or grid, with the **last value** written next to it: it fits in a row of text, near a label. It is used to show the recent trend of a number (it rises, it falls, it is stable) without taking up space.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Title** | text (translatable) | empty | Written **before** the line, like a label. |
| **Unit** | text | empty | After the written value, for example "21.4 °C". |
| **Decimals** | 0 to 10 | empty | The digits after the decimal point of the written value. Empty: up to 2, as many as needed. |
| **Minimum (empty: automatic)** | number | empty | The value at the bottom of the line. Empty: the lowest value among the kept ones. |
| **Maximum (empty: automatic)** | number | empty | The value at the top. Empty: the highest value among the kept ones. |
| **Colours** | `standard`, `blue` | `standard` | The colour of the line: the first of the standard colours, or the first blue. |
| **Values kept** | 2 to 1000 | 50 | How many values it draws: beyond it, the oldest goes away. |
| **Height (px)** | 12 to 200 | 28 | The height of the line. |

The Sparkline has no legend, tools (table, PNG, CSV) or administrator's points limit: only **Values kept** applies.

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | A new value: it is added at the end of the line and becomes the written value. |
| **clear** (`clear`) | pulse | Removes all the values; the written value goes back to "—". |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter. |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **Exception** (`error`) | object | Like every block; nothing goes through it today. |

The Sparkline has no **picked point**: a click sends nothing.

## How it works

- At the start there is no line and the written value is **"—"**.
- Every number on **value** is added on the right; the line always spreads over the whole width, whatever the number of values (with a single value there is only the dot). The last value has a dot and is written to the right of the line, formatted in the language of the viewer: 21.456 without **Decimals** becomes "21.46", with **Decimals** 1 "21.5".
- Numbers written as text count (`"21,5"`). A value that is not a number (a text, `null`, an object) is **ignored**: the line and the written value stay as they are.
- **The scale**: without Minimum and Maximum the line goes from the lowest to the highest value among the kept ones, so even small changes are well seen. If all the values are equal, the line is flat at half height. With Minimum and Maximum the scale stays fixed.
- Under the line there is a light area of the same colour.
- When you move the mouse over it, the box with the value of the nearest point appears.
- **A closed window records nothing**: when you open it you see only the last value (if the project option **A window opened again shows the last values at once** is on), and the line starts again from there.
- In the window editor the Sparkline shows 30 made-up values.

## Examples

### 1. Temperature in a row

```
Window "Dashboard"
└ Column (root)
  └ Row
    ├ Sparkline  sp1  Title "Greenhouse" Unit "°C"  Decimals 1
    └ Sparkline  sp2  Title "Outside"    Unit "°C"  Decimals 1
```

```
[Every…: 30 s] pulse ──▶ read [Read file: ~/greenhouse.txt] content ──▶ value [Sparkline: Greenhouse]
[Every…: 30 s] pulse ──▶ read [Read file: ~/outside.txt]    content ──▶ value [Sparkline: Outside]
```

Two compact rows: "Greenhouse", the line of the last 50 readings (25 minutes) and "22.4 °C"; below it the same for the outside. With files that contain `22.4` or `22,4` the result is the same.

### 2. The price of a service, with a fixed scale

```
[Every…: 300 s] pulse ──▶ send [Web request: https://example.com/price] response ──▶ object [Get field: eur] value ──▶ value [Sparkline: Price]
```

With **Minimum** 0 and **Maximum** 200 the line moves little if the price changes by a few euros; leaving them empty, even a change of 1 euro takes the whole height. Choose according to what you want to notice. [Web request](net.request) is from the [Network blocks](logicstudio-net) package.

### 3. Starting again every day

```
[Button: New day] pressed ──▶ clear [Sparkline: Greenhouse]
```

The line disappears and the value goes back to "—" until the next number.

## Accessibility and keyboard

The title and the written value are text, read by screen readers. The line is reached with **Tab** and the arrows go from one value to the next showing the box.

## See also

- [Lines](charts.line) and [Real time](charts.live) for a chart with axes
- [Value](ui.value) for the number alone
- [Charts](logicstudio-charts): the data shapes, the limits, the keyboard
