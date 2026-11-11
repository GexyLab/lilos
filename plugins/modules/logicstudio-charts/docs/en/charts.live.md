# Real time

`charts.live` · Charts · [Charts](logicstudio-charts) · version 1

Lines that **scroll**: they show the last seconds (or minutes) of the values that arrive, with the present on the right edge. Every series has its own port: you link to each one the measure to follow (temperature, humidity, load...). It suits watching something while it happens.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Title** | text (translatable) | empty | Written above the chart; it also names the PNG and CSV files. |
| **Height (px)** | 20 to 2000 | 200 | The height of the drawing. |
| **Legend** | yes/no | yes | Shows the legend (from two series up). |
| **Unit** | text | empty | Above the axis and after every value. |
| **Decimals** | 0 to 10 | empty | Digits after the decimal point in the box and in the table. |
| **Minimum (empty: automatic)** | number | empty | The value at the bottom of the axis. Useful to stop the axis from "dancing". |
| **Maximum (empty: automatic)** | number | empty | The value at the top of the axis. |
| **Points kept per series** | 10 to 100000 | 1000 | At most how many points per series (the administrator's limit also applies). |
| **Colours** | `standard`, `blue` | `standard` | 8 different colours, or 6 shades of blue. |
| **Table view, PNG and CSV buttons** | yes/no | yes | The three buttons at the top right. |
| **Time shown (seconds)** | 1 to 86400 | 60 | How far back the chart shows: 60 = the last minute, 3600 = the last hour. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **clear** (`clear`) | pulse | Removes all the points of all the series. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and turns it off. |
| **visible** (`visible`) | yes/no | `false` hides it. |
| *added series* | number | One per series: every number that arrives is a point of that series, now. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **picked point** (`picked`) | object | The instant the viewer clicks or presses **Enter** on. |
| **Exception** (`error`) | object | Like every block; nothing goes through it today. |

## Added ports

The chart **has no data input**: it has one input for each series, up to **8**, of type number. They are called "series 1", "series 2"... and **the name of the port is the name of the series** (in the legend, in the box, in the table, in **picked point**). They are shown in italics on the object in the schema.

> Without added ports the chart has no series and stays empty ("No data"). Mind: in this version the window editor does not have a command to add ports to a component yet, and neither do the Properties of its object in the schema. Until there is one, the Real time chart stays without series: to follow values over time use [Lines](charts.line) with ISO dates.

## How it works

- **A number on a port = a point now**: the point takes as its time **the instant it arrives in the window** (the clock of the viewer's computer), not the one when the program calculated it. Numbers written as text count (`"21,5"`); everything else (texts, `true`, objects, lists) is **ignored**.
- **The scrolling**: the chart redraws by itself, from once every tenth of a second to once a second depending on the width and the **Time shown**; the right edge is always "now", the left one is "now minus the time shown". When the browser tab is hidden or the table view is open, the chart does not redraw (it resumes when you come back).
- **How many points**: the points that left the left edge go away (one stays, so that the line enters from the edge). In addition every series keeps at most **Points kept per series** points: with a value every 100 ms and **Time shown** 300 you would need 3000 points, but with the limit of 1000 you see only the last 100 seconds.
- **The value axis** adapts to the visible points only: when a high value leaves on the left, the axis goes down again. Set **Minimum** and **Maximum** to keep it still.
- **The time labels** are local times ("10:42:30"), with a round step (5 s, 10 s, 1 min...).
- **clear** empties all the series; the points after it start again from now.
- **A closed window records nothing**: the values that arrived while it was closed are not there. When you open it, the program sends it the last value of each port (if the project option **A window opened again shows the last values at once** is on): you see one point per series, "now", and from there the chart starts again. For a history that stays, use [Lines](charts.line) with ISO dates and [Accumulate](coll.accumulate).
- In the window editor the chart shows one minute of made-up data, still.

**Picked point** sends:

| Field | Content |
|---|---|
| `x` | the instant, in milliseconds |
| `time` | the same instant as an ISO date, for example `"2026-11-11T09:42:30.120Z"` |
| `values` | the value of each series at that instant, if there is a close one: `{"temperature": 21.4, "humidity": 63}` |
| `index` | the position of the instant among the visible ones with a value, from 0 |
| `series`, `y` | only with a mouse click and more series: the series nearest to the click and its value |

## Examples

### 1. Temperature and humidity of the greenhouse

Add two ports and call them **temperature** and **humidity**.

```
Window "Greenhouse"
└ Column (root)
  └ Real time  live1  Title "Greenhouse now"  Time shown 300
```

```
[Every…: 2 s] pulse ──▶ read [Read file: ~/greenhouse.json, JSON] content ──▶ object [Split object] temp  ──▶ temperature [Real time: Greenhouse now]
                                                                                                 humid ──▶ humidity
```

Every 2 seconds two numbers arrive and the two lines advance; you see the last 5 minutes. With temperatures around 20 and humidity around 60 the two lines are on the same axis: if you need more detail, make two charts.

### 2. The load of a service, with a still axis

```
[Every…: 1 s] pulse ──▶ send [Web request: https://example.com/status] response ──▶ object [Get field: cpu] value ──▶ cpu [Real time: Load]
```

With **Minimum** 0, **Maximum** 100 and **Unit** `%` the axis stays from 0 to 100 even when the load is low. [Web request](net.request) is from the [Network blocks](logicstudio-net) package: remember that it counts in the network requests per minute (120 by default), so one request per second goes over them.

### 3. Clearing when you start again

```
[Button: Reset] pressed ──▶ clear [Real time: Load]
```

The lines disappear and start again from the next value.

## Accessibility and keyboard

**Tab** to reach it; the arrows go from one instant to the next among the visible ones, **Enter** sends the instant to **picked point**, **Esc** clears the choice. The box shows the time with the seconds. **Show as a table**: one row per instant (Time) and one column per series; while the table is open the chart does not scroll.

## See also

- [Lines](charts.line) for data with their own dates, which stay
- [Steps](charts.step) for states (on/off) instead of numbers
- [Sparkline](charts.spark) for a small trend in a row
- [Every…](core.every), [Split object](core.decompose)
- [Charts](logicstudio-charts): the data shapes, the limits, the keyboard
