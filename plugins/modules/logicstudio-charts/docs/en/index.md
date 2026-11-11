# Charts

`logicstudio-charts` · needs the engine (`logicstudio-engine`) and the [Standard UI components](logicstudio-ui) (`logicstudio-ui`)

The **charts** you put in the windows (`.lsui`) of your projects: lines, areas, columns, bars, pie and donut, scatter, histogram, real time, steps, heat map, radar and sparkline. They are **UI components**, like buttons and fields: they sit in a window, and a schema talks to them through their **object** (see [UI component](core.component)).

The drawing is done by the lilOS chart library: charts follow the light or dark theme and the language of the viewer (comma or dot in numbers, month names), and you can use them from the keyboard too.

## How to install

The package does **not** come with Logic Studio IDE: an administrator installs it from **AppStore → Kernel** ("Charts"). The AppStore also installs what it needs: the engine and the Standard UI components (the containers where you put the charts). After the installation the charts appear in the **Components** tab of the window editor, in the **Charts** group.

## The charts

| Chart | Type | What it is for |
|---|---|---|
| [Lines](charts.line) | `charts.line` | One or more series of values joined by lines: trends, months, measures over time. |
| [Areas](charts.area) | `charts.area` | Like Lines, with the area under the line coloured; also stacked or at 100%. |
| [Columns](charts.column) | `charts.column` | Comparisons between categories with vertical columns, side by side or stacked. |
| [Bars](charts.bar) | `charts.bar` | Comparisons with horizontal bars, sortable; good for long names. |
| [Pie · Donut](charts.pie) | `charts.pie` | The parts of a total, at most 6 slices. |
| [Scatter](charts.scatter) | `charts.scatter` | Points (x, y): the link between two measures. |
| [Histogram](charts.histogram) | `charts.histogram` | How many values fall in each class: the distribution of a measure. |
| [Real time](charts.live) | `charts.live` | The last seconds or minutes of the values that arrive, scrolling. |
| [Steps](charts.step) | `charts.step` | States over time: on/off, open/closed, or states in words. |
| [Heat map](charts.heatmap) | `charts.heatmap` | A grid of coloured values, darker where the value is higher. |
| [Radar](charts.radar) | `charts.radar` | Several qualities of one or more things, on axes spreading from the centre (3 to 12). |
| [Sparkline](charts.spark) | `charts.spark` | A small line without axes and with the last value, to put in a row. |

## How to use a chart

1. Open a window of the project in **Design**, choose the chart in the **Components** tab (**Charts** group) and put it in a container (for example a [Column](ui.column)).
2. In the **Properties** choose title, height, unit, colours...
3. Still in the Properties, in the **Object in a schema** section, press **Make its object**: the block that stands for the chart appears in the schema.
4. Link to that block the values to show (on the **data**, **add point**, **clear**... inputs) and, if you want, use its **picked point** output.

In the window editor (**Design**) every chart shows **made-up data**, to show you what it will look like; the tool buttons are not there. In **Preview**, in a **Test** and in the real window the chart starts empty ("No data") and shows only what the schema sends to it.

In the examples of these pages `[Lines: Sales]` is the object, in the schema, of the Lines component whose title is "Sales".

## Common inputs and outputs

| Port | Type | Where | What it does |
|---|---|---|---|
| **data** (`data`) | any | Lines, Areas, Columns, Bars, Pie, Scatter, Radar | Replaces **all** the data of the chart with the data received. |
| **add point** (`add`) | any | Lines, Areas, Columns, Bars, Scatter | Adds a point at the end, without removing the others. |
| **clear** (`clear`) | pulse | all except Pie, Heat map and Radar | Removes all the points (the series stay, empty). |
| **enabled** (`enabled`) | yes/no | all | `false` makes the chart lighter and turns it off: no values box, no click, no keyboard, no buttons. `true` turns it on again. |
| **visible** (`visible`) | yes/no | all | `false` hides it, `true` shows it. |
| **picked point** (`picked`) | object | all except Sparkline | Comes out when the viewer clicks a point, a column, a slice, a cell... (or presses **Enter** on the chart). The name changes: **picked column**, **picked bar**, **picked slice**, **picked class**, **picked cell**, **picked axis**. |
| **Exception** (`error`) | object | all | Like every block; for charts nothing goes through it today. |

## What shape the data must have

The **data** input accepts many shapes. The chart recognises them by itself:

| Shape | Example | Becomes |
|---|---|---|
| List of numbers | `[3, 5, 4]` | one series; x = the position (0, 1, 2) |
| List of `{x, y}` points | `[{"x": "Jan", "y": 3}, {"x": "Feb", "y": 5}]` | one series with its x values |
| List of `[x, y]` pairs | `[[1, 2.5], [2, 3.1]]` | one series with its x values |
| Object name → number | `{"North": 3, "South": 5}` | one series: the keys are the categories (for Pie: the slices) |
| Object name → list | `{"North": [3, 4], "South": [5, 6]}` | one series per key |
| Object category → (series → number) | `{"Jan": {"North": 3, "South": 5}, "Feb": {"North": 4}}` | categories × series (here series North and South; South of Feb is missing) |
| List of series | `[{"name": "North", "data": [3, 4]}, {"name": "South", "data": {"Jan": 5}}]` | one series per element; `data` can be a list or an object name → number |
| Object with `series` | `{"series": [ … ]}` | like the list of series |
| Rows of a table | `[{"month": "Jan", "North": 3, "South": 5}, {"month": "Feb", "North": 4, "South": 6}]` | the first text field is the x, every field with numbers is a series |
| A JSON text of one of these | `"[1, 2, 3]"` | like the shape it contains |

Details that matter:

- **Inside a point** the x is looked for, in this order, in the fields `x`, `t`, `time`, `date`, `name`, `label`, `category`, `key`; the y in `y`, `value`, `v`, `state`, `count`. A point without a y is "empty" and breaks the line.
- **Numbers written as text** count: `"21,5"` and `"21.5"` are 21.5. A text that is not a number, as a y, is empty (except in the [Steps](charts.step) chart, where it is a state).
- **The type of the x axis** is decided by the chart: if an x is a text that is not a number and not a date, the x values are **categories** (in the order they arrive); if the x values are dates in ISO format (`"2026-11-11"`, `"2026-11-11T08:30:00Z"`), the axis is **time**; otherwise they are **numbers** (in increasing order). Columns, Bars, Radar and Pie always have categories; Real time and Steps always have time.
- **Milliseconds are not dates**: a number like `1762848000000` stays a number on the axis. For a time axis send the dates as ISO text (for example the **ISO** output of [Date and time](core.now)).
- **The colour of a series** can be given in the data: `{"name": "North", "data": [3, 4], "color": "#e5484d"}`. Only `#rgb`...`#rrggbbaa`, `rgb(…)`, `rgba(…)`, `hsl(…)`, `hsla(…)` with numbers are accepted; any other colour is ignored.
- **Series without a name** are called "Series 1", "Series 2"... in the legend; if there is only one series without a name, there is no legend and in the **picked point** values it is called "Value".
- A value that cannot be read (`null`, `""`, a broken JSON text) **empties** the chart: it is like receiving empty data.

The **add point** input accepts:

| Value | What it adds |
|---|---|
| a number (or a text with a number, or yes/no) | a point at the end of the first series |
| a pair `[x, y]` | the point (x, y) in the first series |
| `{"y": 5}`, `{"x": "Mar", "y": 5}`, `{"value": 5}` | a point in the first series |
| `{"x": "Mar", "y": 5, "series": "South"}` | a point in the series "South" (created if it is not there) |
| `{"North": 3, "South": 5}` | one point for each series, with the x that follows |
| `{"x": "Mar", "North": 3, "South": 5}` | one point for each series, at the x "Mar" |

When a point arrives without an x, the chart sets it: on the number axis it is the one after the last point of the series (0, 1, 2...), on the time axis it is **the time the point arrives in the window**, among categories it is a new category ("1", "2"...).

## How many points a chart keeps

- Every series keeps at most **Points kept per series** (property, 1000 if you do not change it). When one more point arrives, **the oldest** goes away; with **data** the last ones of the list are kept (on the number and time axes: the ones with the largest x).
- There is also a limit for everyone, set by an administrator: **Points kept per chart series** (Control Panel → Logic Studio → Limits, 1000 by default, from 10 to 100000). The **smaller** of the two applies: raising the property above 1000 does nothing until the administrator raises the limit. See [Limits](logicstudio-engine/limits).
- Real time and Steps also remove the points that left the **Time shown** (they keep one just before it, so that the line or the state enters from the left edge).

## The points are in the window, not in the program

A chart keeps its points **in the open window**. The program, instead, remembers for each input **only the last value** it sent (if the project Options have **A window opened again shows the last values at once** turned on, which is the default). So:

- the values sent with **add point** while the window is closed are **not** seen when you open it: you only see the last one;
- if you close and reopen the window, the history built with **add point** is lost: the last **data** and the last added point stay.

If the chart must show the history also to those who open the window later, keep the list in the schema (for example with [Accumulate](coll.accumulate)) and send it whole to **data**: see example 2 below.

## What all charts have

- **Legend**: it appears from two series up (property **Legend**). A click on an entry turns that series off or on; a series that is off keeps its colour and its place.
- **Colours**: `standard` (8 colours, always in the same order; from the ninth series the lines are dashed) or `blue` (6 shades of blue). In the IDE the two choices are shown with these names.
- **A single value axis**, on the left (for Bars: at the bottom). **Minimum** and **Maximum** fix it; when empty, it adapts to the data with round numbers.
- **Unit**: written above the axis, after every value in the values box and in the header of the table view. **Decimals**: the digits after the decimal point in the values box and in the table (0 to 10; empty: up to 3, as many as needed). The axis labels use the decimals of the axis step.
- **Values box**: when you move the mouse over the chart, a box with the values of the nearest point appears; a guide line marks the x.
- **Tools** (property **Table view, PNG and CSV buttons**): three buttons at the top right: **Show as a table** (the same data in a table, at most 500 rows on screen: "Only the first 500 rows are shown."), **Save as PNG** (the image with title and legend, at double resolution) and **Save as CSV** (all rows; comma as separator, dot in decimals, ISO dates, UTF-8). The file is named like the chart title (or like the type, for example "Line chart.csv"). The table and the CSV also contain the series that are off.
- **No data**: this is the text in the middle of an empty chart.

## Keyboard and screen readers

You reach the chart with **Tab**. Then:

| Key | What it does |
|---|---|
| **→** **↓** / **←** **↑** | go to the next / previous value (in the Heat map **↑** **↓** change row) |
| **Home** / **End** | the first / the last value |
| **Enter** or **Space** | chooses the value: sends it to **picked point** |
| **Esc** | clears the choice |

A screen reader reads a summary of the chart (title, type, how many series and how many points, from the lowest to the highest value) and announces every value reached with the arrows. The table view is a real table, readable row by row.

## Examples

### 1. Sales by month, from a JSON file

The file `~/sales.json` contains `{"Jan": {"North": 12, "South": 9}, "Feb": {"North": 15, "South": 11}, "Mar": {"North": 13, "South": 14}}`.

```
Window "Sales"
└ Column (root)
  ├ Columns  col1  Title "Sales by month"  Unit "k€"
  └ Bars     bar1  Title "Total by zone"   Order desc
```

```
[At start] pulse ──▶ read [Read file: ~/sales.json, JSON] content ──▶ data [Columns: Sales by month]
[Value: {"North": 40, "South": 34}] value ──▶ data [Bars: Total by zone]
```

The Columns show three months with two columns each (North and South) and the legend; the Bars show North on top (40) and South below (34), with the values at the end of the bars. [Read file](lilos.fileRead) is from the [lilOS blocks](logicstudio-lilos) package.

### 2. A measure every 10 seconds, with the history kept

```
[Every…: 10 s] pulse ──▶ read [Read file: ~/sensor.txt] content ──▶ add [Accumulate: max 360] list ──▶ data [Lines: Temperature]
                                                        content ──▶ value [Sparkline: Now]
```

[Accumulate](coll.accumulate) keeps the last 360 readings (one hour). Every 10 seconds the whole list goes to **data**: whoever opens the window later sees the last hour at once, not only the last reading. The [Sparkline](charts.spark) next to it shows the recent trend and the current value.

### 3. A click on the chart opens the details

```
[Columns: Sales by month] picked column ──▶ object [Get field: category] value ──▶ text [Label: Chosen month]
```

A click on the February column sends `{"category": "Feb", "values": {"North": 15, "South": 11}, "index": 1, "series": "North", "y": 15}`; [Get field](core.get) takes `category` from it and the [Label](ui.label) shows "Feb".

## Known limits

- Charts over time show the last seconds you choose: you **cannot zoom** them or move them with the mouse.
- A single value axis: two measures with very different scales (degrees and percentages) are better in two charts.
- The history built with **add point** lives in the open window: see "The points are in the window, not in the program" above.
- Pie: at most 6 slices (the smallest ones become "Other"). Radar: 3 to 12 axes.

## See also

- [UI component](core.component): the object of a component in the schema
- [Standard UI components](logicstudio-ui)
- [Accumulate](coll.accumulate), [Every…](core.every), [Date and time](core.now)
- [Limits](logicstudio-engine/limits)
- [Window components](ide/components), [Windows](ide/windows)
