# Pie · Donut

`charts.pie` · Charts · [Charts](logicstudio-charts) · version 1

A circle divided into slices, one for each part of a total: to see how much each part weighs (the items of an expense, the file types in a folder). As a **donut** it has a hole in the middle with the total written inside. It shows at most **6 slices**: the smallest ones merge into "Other".

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Title** | text (translatable) | empty | Written above the chart; it also names the PNG and CSV files. |
| **Height (px)** | 20 to 2000 | 200 | The height of the drawing; the circle sits in the largest square that fits. |
| **Legend** | yes/no | yes | The legend with the name of each slice (from two slices up). |
| **Unit** | text | empty | After the values in the box and in the total of the donut. |
| **Decimals** | 0 to 10 | empty | Digits after the decimal point of the values (the percentages on the slices are always whole). |
| **Colours** | `standard`, `blue` | `standard` | 8 different colours, or 6 shades of blue. "Other" is always grey. |
| **Table view, PNG and CSV buttons** | yes/no | yes | The three buttons at the top right. |
| **Donut** | yes/no | no | A hole in the middle, with the total and the word "total". |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **data (name → value)** (`data`) | any | The slices. Replaces everything that was there. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and turns it off. |
| **visible** (`visible`) | yes/no | `false` hides it. |

The Pie has no **add point** or **clear**: to change it send new data; to empty it send an empty object `{}`.

### Outputs

| Port | Type | Description |
|---|---|---|
| **picked slice** (`picked`) | object | The slice the viewer clicks or presses **Enter** on. |
| **Exception** (`error`) | object | Like every block; nothing goes through it today. |

## How it works

**The data shapes**:

| Data | Slices |
|---|---|
| `{"Water": 45, "Fertiliser": 25, "Energy": 18}` | one slice per key (the simplest shape) |
| `[{"x": "Water", "y": 45}, {"x": "Fertiliser", "y": 25}]` or `[["Water", 45], ["Fertiliser", 25]]` | the same |
| `[{"type": "Water", "euro": 45}, {"type": "Fertiliser", "euro": 25}]` | the same, as table rows (the text gives the name, the number the value) |
| `[45, 25, 18]` | three slices named "0", "1", "2" |
| more series with **one value each**, for example `{"Water": [45], "Fertiliser": [25]}` | one slice per series |

With more series of more values the Pie uses **only the first series**.

**Which slices are seen**:

- only the values **greater than zero**: 0, negatives, empty values and texts that are not numbers are left out (also from the total);
- the slices start at the top and go clockwise, **in the order of the data** (they are not sorted by size);
- if there are **more than 6** slices, the 5 largest stay and the others merge into a grey slice **"Other"**, at the end; its box lists the names it contains (the first 6, then "…");
- the percentage is written on the slices that are worth at least 6% of the total, when the circle is not too small;
- the legend turns a slice off and on: the others share the circle and the percentages are recalculated on the total of the slices that are on.

**The box** of a slice shows the name, the value (with unit and decimals) and the part of the total with one decimal, for example "45 €" and "45.0%".

**Picked slice** sends:

| Field | Content |
|---|---|
| `name` | the name of the slice (for "Other": the word "Other") |
| `value` | the value (for "Other": the sum of the slices it contains) |
| `share` | the part of the total of the slices that are on, from 0 to 1 (0.45 = 45%) |
| `index` | the position of the slice among the ones that are on, from 0 |

**Show as a table** and the CSV list **all** the slices, also the ones merged into "Other", with Name, Value and Share (%).

## Examples

### 1. Where the money goes

```
Window "Expenses"
└ Column (root)
  └ Pie · Donut  pie1  Title "October expenses"  Unit "€"  Donut yes
```

```
[Value (JSON): {"Water": 45, "Fertiliser": 25, "Energy": 18, "Other": 12}] value ──▶ data [Pie · Donut: October expenses]
```

Four slices (45%, 25%, 18%, 12%) and in the middle "100 €" with "total" below. A click on the energy slice sends `{"name": "Energy", "value": 18, "share": 0.18, "index": 2}`.

### 2. More than six items

```
[Value (JSON): {"Photos": 120, "Videos": 300, "Music": 80, "Documents": 40, "Archives": 25, "Programs": 60, "Misc": 10, "Temporary": 5}] value ──▶ data [Pie · Donut: Disk]
```

Eight items, so the 5 largest stay (Videos 300, Photos 120, Music 80, Programs 60, Documents 40), drawn in the order of the data: Photos, Videos, Music, Documents, Programs. Archives, Misc and Temporary become the last slice, grey, "Other", worth 40. The box of that slice lists "Archives, Misc, Temporary".

### 3. From the choice to a detail

```
[Pie · Donut: October expenses] picked slice ──▶ object [Get field: name] value ──▶ text [Label: Item]
```

The [Label](ui.label) shows the name of the chosen slice; with [Format text](core.format) and the field `share` you can write "Energy: 18% of the expense".

## Accessibility and keyboard

**Tab** to reach it; the arrows go from one slice to the next (the slice is highlighted and the box appears), **Enter** sends it to **picked slice**, **Esc** clears the choice. A screen reader reads the summary and announces every slice with its value and percentage.

## See also

- [Bars](charts.bar): better than the pie when the items are many or similar to each other
- [Areas](charts.area) at 100% for the parts of a total that change over time
- [Get field](core.get), [Format text](core.format)
- [Charts](logicstudio-charts): the data shapes, the limits, the keyboard
