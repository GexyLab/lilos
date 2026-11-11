# Radar

`charts.radar` · Charts · [Charts](logicstudio-charts) · version 1

Several qualities of a thing on **axes spreading from the centre**: every series is a shape joining its values. It is used to compare the "profile" of one or more things (two products by speed, cost, quality...; a month against the average). It shows **3 to 12 axes**.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Title** | text (translatable) | empty | Written above the chart; it also names the PNG and CSV files. |
| **Height (px)** | 20 to 2000 | **240** | The height of the drawing; the radar sits in the largest circle that fits, with the names of the axes around it. |
| **Legend** | yes/no | yes | Shows the legend (from two series up). |
| **Unit** | text | empty | After the values in the box. |
| **Decimals** | 0 to 10 | empty | Digits after the decimal point in the box and in the table. |
| **Minimum (empty: automatic)** | number | empty | The value at the centre. Empty: 0, or the lowest value if it is negative. |
| **Maximum (empty: automatic)** | number | empty | The value on the edge. Empty: the highest value, rounded. |
| **Colours** | `standard`, `blue` | `standard` | 8 different colours, or 6 shades of blue. |
| **Table view, PNG and CSV buttons** | yes/no | yes | The three buttons at the top right. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **data (name → value)** (`data`) | any | The axes and the values. Replaces everything that was there. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and turns it off. |
| **visible** (`visible`) | yes/no | `false` hides it. |

The Radar has no **add point** or **clear**: to change it send new data; to empty it send `{}`.

### Outputs

| Port | Type | Description |
|---|---|---|
| **picked axis** (`picked`) | object | The axis the viewer clicks or presses **Enter** on, with the values of every series. |
| **Exception** (`error`) | object | Like every block; nothing goes through it today. |

## How it works

**The axes are the categories**, in the order they arrive, starting from the one at the top and going clockwise.

| Data | Result |
|---|---|
| `{"Speed": 8, "Cost": 5, "Quality": 7, "Safety": 9, "Comfort": 6}` | one shape on 5 axes |
| `{"Speed": {"A": 8, "B": 6}, "Cost": {"A": 5, "B": 8}, "Quality": {"A": 7, "B": 6}}` | two shapes, A and B, on 3 axes |
| `[{"name": "A", "data": {"Speed": 8, "Cost": 5, "Quality": 7}}, {"name": "B", "data": {"Speed": 6, "Cost": 8, "Quality": 6}}]` | the same, as a list of series |
| `[{"axis": "Speed", "A": 8, "B": 6}, {"axis": "Cost", "A": 5, "B": 8}, {"axis": "Quality", "A": 7, "B": 6}]` | the same, as table rows |

Rules:

- **At least 3 axes are needed**: with 1 or 2 the chart says "No data". **Beyond 12** only the first 12 are seen (the table view and the CSV have them all).
- **The scale** is the same for all the axes: from the **Minimum** (at the centre) to the **Maximum** (on the edge), with reference circles (polygons) and their values written along the top axis. Values below the minimum sit at the centre, above the maximum on the edge.
- **A missing value** in a series: the shape passes through the centre on that axis and there is no dot there.
- Long axis names are shortened with "…".

**Picked axis** sends:

| Field | Content |
|---|---|
| `category` | the name of the axis, for example `"Cost"` |
| `values` | the value of each visible series on that axis: `{"A": 5, "B": 8}` (a series without a name is called "Value") |
| `index` | the position of the axis, from 0 (0 = the one at the top) |

The click chooses the nearest axis as a direction, up to a little outside the edge.

## Examples

### 1. Two cars compared

```
Window "Comparison"
└ Column (root)
  └ Radar  rad1  Title "Cars"  Minimum 0  Maximum 10
```

```
[Value (JSON): {"Speed": {"Car A": 8, "Car B": 6}, "Cost": {"Car A": 5, "Car B": 8}, "Quality": {"Car A": 7, "Car B": 6}, "Safety": {"Car A": 9, "Car B": 7}, "Comfort": {"Car A": 6, "Car B": 8}}] value ──▶ data [Radar: Cars]
```

Five axes and two shapes with the legend "Car A" and "Car B". With Minimum 0 and Maximum 10 a score of 10 touches the edge. A click on the "Cost" axis sends `{"category": "Cost", "values": {"Car A": 5, "Car B": 8}, "index": 1}`.

### 2. The profile of a month, from a file

```
[At start] pulse ──▶ read [Read file: ~/quality.json, JSON] content ──▶ data [Radar: October]
```

The file contains `{"Punctuality": 92, "Returns": 4, "Satisfaction": 87, "Deliveries": 95}`. Leaving **Minimum** and **Maximum** empty the scale goes from 0 to 100 (rounded): "Returns", with 4, stays close to the centre.

### 3. Showing the chosen value

```
[Radar: Cars] picked axis ──▶ object [Get field: values.Car A] value ──▶ value [Value: Score of A]
```

[Get field](core.get) takes the score of "Car A" on the chosen axis and the [Value](ui.value) of the window shows it.

## Accessibility and keyboard

**Tab** to reach it; the arrows go from one axis to the next (the axis guide and the box with the values of every series appear), **Home** and **End** go to the first and the last, **Enter** sends the axis to **picked axis**, **Esc** clears the choice. **Show as a table**: one row per axis and one column per series.

## See also

- [Columns](charts.column) for the same data as side-by-side columns
- [Bars](charts.bar)
- [Get field](core.get)
- [Charts](logicstudio-charts): the data shapes, the limits, the keyboard
