# Lines

`charts.line` · Charts · [Charts](logicstudio-charts) · version 1

One or more series of values, each drawn as a line joining its points. It suits a trend: sales month by month, a temperature over time, a repeated measure.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Title** | text (translatable) | empty | Written above the chart; it also names the PNG and CSV files. |
| **Height (px)** | 20 to 2000 | 200 | The height of the drawing, in pixels. The width is that of the container. |
| **Legend** | yes/no | yes | Shows the legend (only from two series up). |
| **Unit** | text | empty | Written above the axis and after every value, for example `°C` or `k€`. |
| **Decimals** | 0 to 10 | empty | The digits after the decimal point in the values box and in the table. Empty: up to 3, as many as needed. |
| **Minimum (empty: automatic)** | number | empty | The value at the bottom of the axis. |
| **Maximum (empty: automatic)** | number | empty | The value at the top of the axis. |
| **Points kept per series** | 10 to 100000 | 1000 | Beyond it, the oldest point goes away. The administrator's limit also applies (see below). |
| **Colours** | `standard`, `blue` | `standard` | 8 different colours, or 6 shades of blue. |
| **Table view, PNG and CSV buttons** | yes/no | yes | The three buttons at the top right. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **data (list or object)** (`data`) | any | Replaces all the data. Accepted shapes: see below. |
| **add point** (`add`) | any | Adds a point at the end of a series (or one point per series). |
| **clear** (`clear`) | pulse | Removes all the points; the series stay, empty. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and turns it off (no click, values box, keyboard). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **picked point** (`picked`) | object | The point the viewer clicks or presses **Enter** on. |
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

The chart starts empty ("No data"). Every value on **data** redraws it from scratch with that data; every value on **add point** adds a point to the ones that are there.

**The x axis** is chosen from the data (see [Charts](logicstudio-charts) for all the shapes):

- **numbers** (`[3, 5, 4]` uses the positions 0, 1, 2; `[[1, 2.5], [4, 3]]` uses 1 and 4): the points are put in x order, even if they arrive in disorder;
- **ISO dates** (`"2026-11-11"`, `"2026-11-11T08:30:00Z"`): the axis is time, with labels like "08:30" or "Nov 11";
- **categories** (texts like `"Jan"`): they stay in the order they arrive, at equal distance.

**The values** (the y) are numbers; `"21,5"` is 21.5. A point without a value (or with a text that is not a number) **breaks the line**: the line starts again at the next point.

**More series**: every series has its own line and colour. Use an object name → list (`{"North": [3, 4], "South": [5, 6]}`), a list of series (`[{"name": "North", "data": […]}]`), an object category → series (`{"Jan": {"North": 3, "South": 5}}`) or table rows (`[{"month": "Jan", "North": 3, "South": 5}]`).

**The dots** on the points are seen only when there is room: with many points only the line is left.

**Add point**:

- a number goes at the end of the first series. If the series has numeric x values, the new x is the one after the last (0, 1, 2...); if the axis is time, it is the time the point arrives in the window; if there are categories, the point becomes a new category, named with a number;
- `{"x": "Apr", "y": 7}` or `[x, y]` put the point at the given x (on the number or time axis, in the right place in order);
- `{"North": 3, "South": 5}` adds a point to each series with that name, creating the missing series; `{"x": "Apr", "North": 3, "South": 5}` puts them all at the x "Apr";
- `{"y": 5, "series": "South"}` chooses the series by name.

**How many points**: every series keeps at most the smaller of **Points kept per series** and the administrator's limit **Points kept per chart series** (1000 by default). Beyond it, the oldest point goes away (with numeric or time x values: the one with the smallest x).

**Picked point**: a click near an x (or **Enter** after reaching it with the arrows) sends an object with:

| Field | Content |
|---|---|
| `x` | the x: the number, the category (text) or, on the time axis, the milliseconds |
| `time` | only on the time axis: the ISO date, for example `"2026-11-11T08:30:00.000Z"` |
| `values` | the values of every visible series at that x: `{"North": 3, "South": 5}` (a series without a name is called "Value") |
| `index` | the position of that x among the ones with a value, from 0 |
| `series`, `y` | only with a mouse click and more series: the series nearest to the click point and its value |

## Examples

### 1. Rain by month, two cities

```
Window "Weather"
└ Column (root)
  └ Lines  line1  Title "Rain"  Unit "mm"
```

```
[Value (JSON): {"Jan": {"Rome": 80, "Milan": 58}, "Feb": {"Rome": 72, "Milan": 49}, "Mar": {"Rome": 61, "Milan": 70}}] value ──▶ data [Lines: Rain]
```

An object whose values are all objects is read as **category → series**: the axis has Jan, Feb, Mar and there are two lines, Rome and Milan, with the legend. The box on "Feb" says "Rome 72 mm", "Milan 49 mm".

> Mind the order of the keys: with `{"Rome": {"Jan": 80, …}, "Milan": {…}}` the categories would be Rome and Milan and the series the months. If your data is made like that, use the name → list shape: `{"Rome": [80, 72, 61], "Milan": [58, 49, 70]}` (x = 0, 1, 2) or `{"Rome": [["Jan", 80], ["Feb", 72], ["Mar", 61]], "Milan": [["Jan", 58], ["Feb", 49], ["Mar", 70]]}`.

### 2. Measures with the date, read from a file

The file `~/measures.json` contains:

```
[{"t": "2026-11-11T08:00:00Z", "v": 18.5}, {"t": "2026-11-11T09:00:00Z", "v": 19.2}, {"t": "2026-11-11T10:00:00Z", "v": 21}]
```

```
[At start] pulse ──▶ read [Read file: ~/measures.json, JSON] content ──▶ data [Lines: Greenhouse]
```

The x values are ISO dates: the axis is time, with the hours in the local time of the viewer. A click on the second point sends `{"x": 1794387600000, "time": "2026-11-11T09:00:00.000Z", "values": {"Value": 19.2}, "index": 1}`.

### 3. A counter that grows, one point at a time

```
[Every…: 2 s] pulse ──▶ up [Counter] count ──▶ add point [Lines: Counter]
[Button: Start again] pressed ──▶ clear [Lines: Counter]
```

Every 2 seconds a number arrives (1, 2, 3...): the first point has x = 0, the second x = 1, and so on. The [Button](ui.button) empties the chart; the next point starts again from x = 0 (the [Counter](core.counter) instead goes on: link **pressed** also to its **reset** if you want to start from the beginning). If you close and reopen the window you see only one point, the last one: to keep the history use [Accumulate](coll.accumulate) and **data** (see [Charts](logicstudio-charts)).

## Accessibility and keyboard

You reach the chart with **Tab**; the arrows go from one x to the next and show the values box, **Home** and **End** go to the first and the last, **Enter** sends the point to **picked point**, **Esc** clears the choice. A screen reader reads the summary ("Rain, Line chart, 2 series (Rome, Milan), 6 points, values from 49 mm to 80 mm") and announces every x reached. **Show as a table** gives the same data in a table: one row per x, one column per series.

## See also

- [Areas](charts.area) for the area under the line, [Real time](charts.live) for scrolling values, [Sparkline](charts.spark)
- [Accumulate](coll.accumulate), [Counter](core.counter), [Date and time](core.now)
- [Charts](logicstudio-charts): the data shapes, the limits, the keyboard
