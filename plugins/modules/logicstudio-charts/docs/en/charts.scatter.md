# Scatter

`charts.scatter` · Charts · [Charts](logicstudio-charts) · version 1

One point for each pair of values (x, y), without lines: to see whether two measures go together (more sun, more growth; more hours, more errors). Every series has its own colour.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Title** | text (translatable) | empty | Written above the chart; it also names the PNG and CSV files. |
| **Height (px)** | 20 to 2000 | 200 | The height of the drawing. |
| **Legend** | yes/no | yes | Shows the legend (from two series up). |
| **Unit** | text | empty | The unit of the **y**: above the vertical axis and after the y values. |
| **Decimals** | 0 to 10 | empty | Digits after the decimal point of the y in the box and in the table. |
| **Minimum (empty: automatic)** | number | empty | The value at the bottom of the vertical axis (y). |
| **Maximum (empty: automatic)** | number | empty | The value at the top of the vertical axis (y). |
| **Points kept per series** | 10 to 100000 | 1000 | Beyond it, the point that arrived first goes away (the administrator's limit also applies). |
| **Colours** | `standard`, `blue` | `standard` | 8 different colours, or 6 shades of blue. |
| **Table view, PNG and CSV buttons** | yes/no | yes | The three buttons at the top right. |

**Minimum** and **Maximum** apply only to the y: the x axis always adapts to the points.

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **points {x, y}** (`data`) | any | All the points. Replaces the ones that were there. |
| **add point** (`add`) | any | Adds a point. |
| **clear** (`clear`) | pulse | Removes all the points. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and turns it off. |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **picked point** (`picked`) | object | The point nearest to the click (within 24 pixels), or the one reached with the arrows and **Enter**. |
| **Exception** (`error`) | object | Like every block; nothing goes through it today. |

## How it works

**The data shapes**:

| Data | Result |
|---|---|
| `[{"x": 10, "y": 21}, {"x": 12, "y": 24.5}]` | one series of points |
| `[[10, 21], [12, 24.5]]` | the same, as pairs |
| `{"Greenhouse 1": [[10, 21], [12, 24.5]], "Greenhouse 2": [[11, 18], [14, 20]]}` | one series per greenhouse |
| `[{"name": "Greenhouse 1", "data": [[10, 21]]}, {"name": "Greenhouse 2", "data": [[11, 18]]}]` | the same, as a list of series |
| `[21, 24.5, 19]` | x = position (0, 1, 2) |

Rules:

- **The x must be a number or a date** (an ISO date like `"2026-11-11T08:00:00Z"`, and then the x axis is time). X values in words (`"North"`) have no place on the axis: those points are not seen and, if they are all like that, the chart says "No data".
- A point without an x or without a valid y is not seen (but stays in the table if it has the y).
- Numbers written as text count: `["10", "21,5"]` is the point (10; 21.5).
- The axes leave some space around the points, so that no point sits on an edge. The y axis does not necessarily include zero.
- The points are not joined and not sorted: the order matters only for **Points kept per series** (the point that arrived first goes away).

**Add point**: `{"x": 15, "y": 30}` or `[15, 30]` adds to the first series; `{"x": 15, "y": 30, "series": "Greenhouse 2"}` to the series "Greenhouse 2" (created if it is not there). A number alone uses as x the one after the last point of the series.

**Picked point** sends:

| Field | Content |
|---|---|
| `series` | the name of the series (empty if the series has no name) |
| `x`, `y` | the values of the point (on the time axis, x in milliseconds) |
| `index` | the position of the point among all the visible ones, sorted by x, from 0 |

The box shows the name of the series (or "Point"), the x and the y with unit and decimals.

## Examples

### 1. Hours of sun and growth

```
Window "Growth"
└ Column (root)
  └ Scatter  sc1  Title "Sun and growth"  Unit "cm"
```

```
[Constant · Variable (JSON): [[4, 1.2], [6, 1.9], [7, 2.4], [9, 3.1], [5, 1.5]]] value ──▶ points {x, y} [Scatter: Sun and growth]
```

Five points rising from left to right: more hours of sun (x), more centimetres (y). The box on the rightmost point says "x 9", "y 3.1 cm".

### 2. One point for each measure

```
[Interval (setInterval): 60 s] pulse ──▶ read [readFile: ~/humidity.json, JSON] content ──▶ add point [Scatter: Humidity and temperature]
```

Each time the file contains an object like `{"x": 22.5, "y": 61}` (temperature and humidity right now). At every reading a point is added; after **Points kept per series** readings, the oldest ones disappear.

### 3. The picked point in a table

```
[Scatter: Sun and growth] picked point ──▶ add [Accumulate (bounded push): max 10] list ──▶ rows [Table: Picked points]
```

Every click on a point adds a row to the [Table](ui.table) with the `series`, `x`, `y` and `index` of that point.

## Accessibility and keyboard

**Tab** to reach it; the arrows go from one point to the next in x order (the point gets bigger and the box appears), **Home** and **End** go to the first and the last, **Enter** sends the point to **picked point**, **Esc** clears the choice. **Show as a table**: one row per point with Series, x and y.

## See also

- [Lines](charts.line) for points joined in x order
- [Histogram](charts.histogram) for a single measure
- [Accumulate (bounded push)](coll.accumulate), [Table](ui.table)
- [Charts](logicstudio-charts): the data shapes, the limits, the keyboard
