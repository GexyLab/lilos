# Bars

`charts.bar` · Charts · [Charts](logicstudio-charts) · version 1

Horizontal bars, one row per category: like [Columns](charts.column), but turned. They suit long category names or a ranking, because the bars can be **sorted** from the longest to the shortest. With a single series the value is written at the end of each bar.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Title** | text (translatable) | empty | Written above the chart; it also names the PNG and CSV files. |
| **Height (px)** | 20 to 2000 | 200 | The height of the drawing: the rows share it. |
| **Legend** | yes/no | yes | Shows the legend (from two series up). |
| **Unit** | text | empty | At the top right above the axis and after every value. |
| **Decimals** | 0 to 10 | empty | Digits after the decimal point in the written values, in the box and in the table. |
| **Minimum (empty: automatic)** | number | empty | The value at the start (left) of the axis. |
| **Maximum (empty: automatic)** | number | empty | The value at the end (right) of the axis. |
| **Points kept per series** | 10 to 100000 | 1000 | How many values each series keeps (the administrator's limit also applies). |
| **Colours** | `standard`, `blue` | `standard` | 8 different colours, or 6 shades of blue. |
| **Table view, PNG and CSV buttons** | yes/no | yes | The three buttons at the top right. |
| **Stacked** | yes/no | no | The bars of the series one after the other on the same row instead of one under the other. |
| **Order** | `none`, `asc`, `desc` | `none` | `none`: the order of the data; `asc`: from the smallest total (at the top) to the largest; `desc`: from the largest to the smallest. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **data (list or object)** (`data`) | any | Replaces all the data. The shapes are those of [Columns](charts.column). |
| **add point** (`add`) | any | Adds (or changes) the value of a category. |
| **clear** (`clear`) | pulse | Removes all the values and all the categories. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and turns it off. |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **picked bar** (`picked`) | object | The category the viewer clicks or presses **Enter** on: `{ category, values, index }` (plus `series` and `y` with a click on a bar). |
| **Exception** (`error`) | object | Like every block; nothing goes through it today. |

## How it works

Data, **add point** and **picked bar** work as in [Columns](charts.column): the categories are on the left, the value axis is at the bottom and always includes **zero**; negative values go to the left of zero.

- **Order**: the rows are sorted by the **total** of each category (the sum of the series, empty values count 0). The order is recalculated at every new piece of data. With `none` the categories stay in the order they arrived, from the first at the top.
- **The value written at the end of the bar** is there only with **one series** and when the bar is at least 10 pixels high (with many rows in little height it disappears: raise **Height**). It uses **Unit** and **Decimals**.
- **The names of the categories** take at most a little more than a third of the width; longer ones are shortened with "…".
- **Stacked**: for each row the positive parts are put in a line towards the right, the negative ones towards the left.
- In **picked bar** `index` is the position of the category in the data (not the row where you see it after sorting).

## Examples

### 1. Ranking of the cities

```
Window "Ranking"
└ Column (root)
  └ Bars  bar1  Title "Subscribers"  Order desc  Decimals 0
```

```
[Constant · Variable (JSON): {"Naples": 18, "Rome": 42, "Milan": 31, "Turin": 12}] value ──▶ data [Bars: Subscribers]
```

The rows are Rome (42), Milan (31), Naples (18), Turin (12), with the number at the end of each bar. A click on Milan sends `{"category": "Milan", "values": {"Value": 31}, "index": 2, "series": "", "y": 31}`: `index` is 2 because in the data Milan is the third.

### 2. Time spent per activity, from a file

The file `~/activities.json` contains table rows:

```
[{"activity": "Meetings", "hours": 6.5}, {"activity": "Programming", "hours": 21}, {"activity": "Email", "hours": 4}]
```

```
[Interval (setInterval): 300 s] pulse ──▶ read [readFile: ~/activities.json, JSON] content ──▶ data [Bars: Week]
```

The text field `activity` gives the categories, the numeric field `hours` the series. With **Unit** `h` and **Decimals** 1 the Meetings bar says "6.5 h". Every five minutes the file is read again and the bars update.

### 3. Two stacked series

With **Stacked** on and the data `{"Anna": {"Done": 7, "To do": 3}, "Luke": {"Done": 4, "To do": 6}}` each person has a single bar 10 long, split into two colours; the legend says "Done" and "To do". With two series the values are not written at the end of the bars: you read them in the box.

## Accessibility and keyboard

**Tab** to reach it; the arrows go from one row to the next in the order you see them, **Home** and **End** go to the first and the last, **Enter** sends the category to **picked bar**, **Esc** clears the choice. **Show as a table**: one row per category in the order of the data, one column per series.

## See also

- [Columns](charts.column), [Pie · Donut](charts.pie)
- [readFile](lilos.fileRead), [Interval (setInterval)](core.every)
- [Charts](logicstudio-charts): the data shapes, the limits, the keyboard
