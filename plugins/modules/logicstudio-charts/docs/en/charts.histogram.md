# Histogram

`charts.histogram` · Charts · [Charts](logicstudio-charts) · version 1

Divides the values of a measure into **classes** (equal intervals, for example from 18 to 20, from 20 to 22...) and shows with a column **how many values** fall in each one. It is used to see how a measure is distributed: where it concentrates, how spread out it is, whether there are odd values.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Title** | text (translatable) | empty | Written above the chart; it also names the PNG and CSV files. |
| **Height (px)** | 20 to 2000 | 200 | The height of the drawing. |
| **Legend** | yes/no | yes | Shows the legend (only with more series, see below). |
| **Unit** | text | empty | The unit of the values: it appears in the title of the box of a class ("20 – 22 °C"). The vertical axis counts values and has no unit. |
| **Decimals** | 0 to 10 | empty | The digits of the class limits in the box (at least those needed by the width of the classes, at most 6). |
| **Points kept per series** | 10 to 100000 | 1000 | How many values are counted at most: beyond it, the oldest go away (the administrator's limit also applies). |
| **Colours** | `standard`, `blue` | `standard` | 8 different colours, or 6 shades of blue. |
| **Table view, PNG and CSV buttons** | yes/no | yes | The three buttons at the top right. |
| **Classes (0: automatic)** | 0 to 200 | 0 | How many classes to make. 0 chooses by itself. |
| **Width of a class (empty: from the classes)** | number greater than 0 | empty | The fixed width of each class, for example 5. If it is set, it applies and **Classes** is ignored. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **values** (`values`) | list | All the values to count. Replaces the ones that were there. |
| **add value** (`add`) | number | One more value to count. |
| **clear** (`clear`) | pulse | Removes all the values. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and turns it off. |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **picked class** (`picked`) | object | The class the viewer clicks or presses **Enter** on. |
| **Exception** (`error`) | object | Like every block; nothing goes through it today. |

## How it works

**The values**:

- **values** wants a **list**: `[18.2, 19.5, 21, 20.4]`. Numbers written as text count (`"19,5"` is 19.5); texts that are not numbers, `null` and empty values are not counted. A value that is not a list (a number, an object, even a JSON text) **empties** the chart.
- **add value** wants a number (also as text, `"21,3"`); if it is not a number, it is ignored.
- At most the last **Points kept per series** values are counted (1000 by default, and not more than the administrator's limit): with a list of 5000 values, the last 1000 are counted.
- **More series**: if a list of series arrives on **values**, `[{"name": "Greenhouse 1", "data": [21, 22.5]}, {"name": "Greenhouse 2", "data": [19, 20]}]`, every series has its own columns side by side in each class, with the legend. The classes are the same for all.

**The classes** are recalculated from scratch at every new value, from the smallest to the largest of the values:

- **automatic** (Classes 0, no width): the number of classes comes from the number of values (about log₂(n) + 1), with a "round" width (1, 2, 2.5, 5, 10...) and the first limit a multiple of the width. With the values from 1 to 10 the classes are 0–2, 2–4, 4–6, 6–8, 8–10 and 10–12.
- **with a width**: the classes start from the multiple of the width just below the smallest value. With width 5 and values from 12 to 31: 10–15, 15–20, 20–25, 25–30, 30–35.
- **with a number of classes**: the classes start from the smallest value, (maximum − minimum) / Classes wide. **The largest value ends up in one more class**: with Classes 4 and values from 1 to 10 the classes are 5 (1–3.25, 3.25–5.5, 5.5–7.75, 7.75–10 and 10–12.25), and the last one contains only the 10.
- a value equal to the limit between two classes goes in the **next** class (with classes 0–2 and 2–4, the 2 goes in 2–4);
- if all the values are equal, the classes cover from 0.5 below to 0.5 above that value (with 5, 5, 5 in automatic: 4.5–5, 5–5.5 and 5.5–6, and the three 5s are in 5–5.5);
- there are at most 500 classes.

**The vertical axis** counts values: it starts from 0 and has only whole numbers.

**Picked class** sends:

| Field | Content |
|---|---|
| `from`, `to` | the limits of the class, for example `20` and `22` |
| `counts` | how many values of each series fall in it: `{"Count": 7}` with a series without a name, `{"Greenhouse 1": 3, "Greenhouse 2": 5}` with more series |
| `index` | the position of the class, from 0 |
| `series`, `y` | only with a mouse click on a column: the series and its count |

## Examples

### 1. The response times of a site

```
Window "Performance"
└ Column (root)
  └ Histogram  h1  Title "Response times"  Unit "ms"  Width of a class 50
```

```
[Constant · Variable (JSON): [120, 135, 180, 95, 240, 160, 150, 410, 130, 175]] value ──▶ values [Histogram: Response times]
```

The classes are 50–100 (1 value), 100–150 (3), 150–200 (4), 200–250 (1), then three empty classes and 400–450 (1): you see at once that almost all the responses are between 100 and 200 ms and that one is very slow. The box of the third class says "150 – 200 ms" and "Count 4".

### 2. Counting while the measures arrive

```
[Interval (setInterval): 5 s] pulse ──▶ read [readFile: ~/weight.txt] content ──▶ add value [Histogram: Weighings]
[Button: New batch] pressed ──▶ clear [Histogram: Weighings]
```

Every 5 seconds the value of the file is added to the counts and the classes are recalculated. **New batch** starts again from zero. As for all charts, the added values live in the open window: to avoid losing them when you close it, keep them with [Accumulate (bounded push)](coll.accumulate) and send the list to **values**.

### 3. Two greenhouses compared

```
[readFile: ~/temperatures.json, JSON] content ──▶ values [Histogram: Temperatures]
```

With the file `[{"name": "Greenhouse 1", "data": [21, 22.5, 23, 22]}, {"name": "Greenhouse 2", "data": [19, 20, 21.5, 19.5]}]` every class has two columns side by side, one per greenhouse, and the legend; a click on the legend hides a greenhouse.

## Accessibility and keyboard

**Tab** to reach it; the arrows go from one class to the next, **Enter** sends the class to **picked class** (without `series` and `y`), **Esc** clears the choice. **Show as a table**: one row per class with From, To and the count of each series.

## See also

- [Columns](charts.column) for values already counted by category
- [Sum · Min · Max · Avg](coll.stat) to summarise a list with a few numbers
- [Accumulate (bounded push)](coll.accumulate)
- [Charts](logicstudio-charts): the data shapes, the limits, the keyboard
