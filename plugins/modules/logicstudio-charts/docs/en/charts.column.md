# Columns

`charts.column` · Charts · [Charts](logicstudio-charts) · version 1

Vertical columns, one per category and per series: to compare quantities between categories (zones, months, products). With more series the columns of a category are side by side, or **stacked** one on top of the other.

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
| **Points kept per series** | 10 to 100000 | 1000 | How many values each series keeps (the administrator's limit also applies). |
| **Colours** | `standard`, `blue` | `standard` | 8 different colours, or 6 shades of blue. |
| **Table view, PNG and CSV buttons** | yes/no | yes | The three buttons at the top right. |
| **Stacked** | yes/no | no | The columns of the series one on top of the other instead of side by side. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **data (list or object)** (`data`) | any | Replaces all the data. |
| **add point** (`add`) | any | Adds (or changes) the value of a category. |
| **clear** (`clear`) | pulse | Removes all the values and all the categories. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and turns it off. |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **picked column** (`picked`) | object | The category the viewer clicks or presses **Enter** on. |
| **Exception** (`error`) | object | Like every block; nothing goes through it today. |

## How it works

The bottom axis always has **categories**, in the order they arrive; the value axis always includes **zero**: the columns start from there, upwards if the value is positive and downwards if it is negative.

**The most convenient data shapes**:

| Data | Result |
|---|---|
| `{"North": 12, "South": 9, "East": 14}` | one series, three columns |
| `{"North": {"2025": 12, "2026": 15}, "South": {"2025": 9, "2026": 11}}` | two categories, two series (2025 and 2026) side by side |
| `[{"zone": "North", "2025": 12, "2026": 15}, {"zone": "South", "2025": 9, "2026": 11}]` | the same, written as table rows |
| `[{"name": "2025", "data": {"North": 12, "South": 9}}, {"name": "2026", "data": {"North": 15, "South": 11}}]` | the same, written as a list of series |
| `[5, 8, 3]` | one series with the categories "0", "1", "2" |

More rules:

- **A category that is missing in a series** leaves its place empty.
- **A value 0** has no column (it has zero height), but the values box shows it; a tiny value that is not zero has at least 1 pixel. An empty value is not seen and is not in the box.
- **Stacked**: for each category the positive parts add up upwards, the negative ones downwards; the axis goes from the lowest negative total to the highest positive total.
- **Long names** of categories are shortened with "…"; the ones that would overlap are not written (the values box shows them whole).

**Add point**:

- `{"x": "West", "y": 7}` adds the category "West" with 7 to the first series. If the category is already there, **the new value takes the place** of the old one (the column changes height).
- `{"x": "West", "2025": 7, "2026": 9}` gives a value to more series in the same category.
- A number alone creates a new category named with a number: the number after the categories that are there (with 3 categories, the new one is called "4").

> Every added value counts among the **Points kept per series** even when it changes a column that was already there.

**Picked column** sends:

| Field | Content |
|---|---|
| `category` | the name of the category, for example `"North"` |
| `values` | the values of the visible series: `{"2025": 12, "2026": 15}` (a series without a name is called "Value") |
| `index` | the position of the category, from 0 |
| `series`, `y` | only with a mouse click on a column: the series of that column and its value |

## Examples

### 1. Two years compared

```
Window "Zones"
└ Column (root)
  └ Columns  col1  Title "Orders"  Unit "pcs"
```

```
[Value (JSON): {"North": {"2025": 12, "2026": 15}, "South": {"2025": 9, "2026": 11}, "East": {"2025": 14, "2026": 13}}] value ──▶ data [Columns: Orders]
```

Three groups of two columns, with the legend "2025" and "2026". A click on the 2026 column of "South" sends `{"category": "South", "values": {"2025": 9, "2026": 11}, "index": 1, "series": "2026", "y": 11}`.

### 2. Votes from a poll, updating

```
[Button: Red] pressed ──▶ up [Counter: red] count ──▶ y   [Build object] object ──▶ add point [Columns: Votes]
[Value (text): Red]  value ──────────────────────────────▶ x
```

[Build object](core.compose) has two added inputs, named **x** and **y**. At every vote it sends `{"x": "Red", "y": 4}`: the first time the "Red" column appears, the following times it grows. Repeat for the other colours.

### 3. Income and expenses, stacked

With **Stacked** on and the data `{"Jan": {"Income": 50, "Expenses": -30}, "Feb": {"Income": 40, "Expenses": -45}}` the income goes up above zero and the expenses go down below it; the axis goes from −45 to 50 (rounded to round numbers).

## Accessibility and keyboard

**Tab** to reach it; the arrows go from one category to the next (a band highlights the category and the box shows all the series), **Home** and **End** go to the first and the last, **Enter** sends the category to **picked column** (without `series` and `y`), **Esc** clears the choice. **Show as a table**: one row per category, one column per series.

## See also

- [Bars](charts.bar): the same things horizontally, sortable
- [Histogram](charts.histogram) to count how many values fall in each class
- [Build object](core.compose), [Counter](core.counter)
- [Charts](logicstudio-charts): the data shapes, the limits, the keyboard
