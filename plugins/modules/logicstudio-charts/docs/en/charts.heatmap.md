# Heat map

`charts.heatmap` · Charts · [Charts](logicstudio-charts) · version 1

A **grid** of coloured cells: the higher the value, the more intense the colour. It is used to see at a glance where the values concentrate in a two-way table: the hours of the day for the days of the week, the departments for the months, the rows and columns of a warehouse.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Title** | text (translatable) | empty | Written above the chart; it also names the PNG and CSV files. |
| **Height (px)** | 20 to 2000 | 200 | The height of the drawing: the rows share it. |
| **Unit** | text | empty | After the highest value of the scale and after the values in the box. |
| **Decimals** | 0 to 10 | empty | The digits after the decimal point in the scale and in the cells. Empty: as many as the scale needs. |
| **Minimum (empty: automatic)** | number | empty | The value of the lightest colour. Empty: the lowest value of the grid. |
| **Maximum (empty: automatic)** | number | empty | The value of the most intense colour. Empty: the highest value of the grid. |
| **Table view, PNG and CSV buttons** | yes/no | yes | The three buttons at the top right. |
| **Names of the rows (comma separated)** | text (translatable) | empty | For example `Mon, Tue, Wed`. They apply only if the data does not already have its own names. |
| **Names of the columns (comma separated)** | text (translatable) | empty | For example `8, 10, 12, 14`. As above. |

The Heat map has no **Legend**, **Colours** or **Points kept per series**: instead of the legend there is a **scale** at the top right (the minimum, a strip of colour, the maximum).

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **grid** (`grid`) | matrix | All the values. Replaces the grid that was there. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and turns it off. |
| **visible** (`visible`) | yes/no | `false` hides it. |

There is no **add point** or **clear**: to change a cell send the whole grid (for example after [Set cell](coll.matSet)); to empty it send `[]`.

### Outputs

| Port | Type | Description |
|---|---|---|
| **picked cell** (`picked`) | object | The cell the viewer clicks or presses **Enter** on. |
| **Exception** (`error`) | object | Like every block; nothing goes through it today. |

## How it works

**The grid shapes**:

| Data | Rows and columns |
|---|---|
| a matrix `[[12, 14, 13], [9, 11, 15]]` | 2 rows, 3 columns; the names come from the properties, otherwise they are 1, 2, 3... |
| `{"rows": ["Mon", "Tue"], "cols": ["8", "10", "12"], "values": [[12, 14, 13], [9, 11, 15]]}` | with the names in the data (`columns` counts as `cols`) |
| series, for example `{"Mon": [12, 14], "Tue": [9, 11]}` | every **series** is a row, every x a column: rows Mon and Tue, columns "0" and "1" |
| a JSON text of one of these | like the shape it contains |

> With an object of objects the rule of all charts applies: the outer keys are the **categories** (here they become the columns) and the inner ones the **series** (the rows). `{"Mon": {"8": 12, "10": 14}, "Tue": {"8": 9, "10": 11}}` therefore gives two rows, "8" and "10", and two columns, "Mon" and "Tue": the grid comes out turned. To have the days as rows use the name → list shape (columns "0", "1"..., the positions from 0) or, to choose all the names, `{"rows", "cols", "values"}`.

More rules:

- **Rows of different length** are extended with empty cells: `[[1, 2], [3]]` has 2 columns and the second row has an empty cell.
- **Every value that is not a number** (a text that is not a number, `null`, objects) is an **empty** cell, drawn grey and dashed, with "—" in the box. Numbers written as text count (`"12,5"`).
- **The names**: if the data has its own names of rows or columns, those apply; otherwise those of the properties; if those are missing too, the numbers 1, 2, 3... If the names are fewer than the rows (or the columns), the ones without a name get their number: with `Names of the columns` "x" and two columns, the names are "x" and "2". An extra name is ignored.
- **The colour** of a cell goes from the lightest (at the **Minimum**) to the most intense (at the **Maximum**); values outside the interval take the colour of the end. If all the values are equal, the interval is 1 wide.
- **The number inside the cell** is written when the cell is at least 26 pixels wide and 16 high and the number fits.
- The names of the rows take at most 30% of the width; long ones are shortened with "…".

**Picked cell** sends:

| Field | Content |
|---|---|
| `row`, `col` | the names of the row and of the column |
| `rowIndex`, `colIndex` | their positions, from 0 |
| `value` | the value of the cell (`null` if it is empty) |
| `series`, `y` | only with a mouse click on a filled cell: the name of the row and the value |

## Examples

### 1. Visits by day and hour

```
Window "Visits"
└ Column (root)
  └ Heat map  hm1  Title "Visits"  Names of the rows "Mon, Tue, Wed"  Names of the columns "8, 10, 12, 14"
```

```
[Value (JSON): [[3, 12, 8, 5], [4, 15, 9, 6], [2, 10, 11, 7]]] value ──▶ grid [Heat map: Visits]
```

Three rows (Mon, Tue, Wed) and four columns (8, 10, 12, 14). The most intense cell is Tuesday at 10 (15), the lightest Wednesday at 8 (2); the scale says "2" and "15". A click on Tuesday at 12 sends `{"row": "Tue", "col": "12", "rowIndex": 1, "colIndex": 2, "value": 9, "series": "Tue", "y": 9}`.

### 2. A grid with its own names, from a file

The file `~/warehouse.json` contains:

```
{"rows": ["Shelf A", "Shelf B"], "cols": ["Level 1", "Level 2", "Level 3"], "values": [[80, 45, null], [20, 95, 60]]}
```

```
[Every…: 60 s] pulse ──▶ read [Read file: ~/warehouse.json, JSON] content ──▶ grid [Heat map: Fill level]
```

With **Minimum** 0, **Maximum** 100 and **Unit** `%` the colour says how full each place is, always on the same scale; level 3 of shelf A is empty (dashed grey, "—").

### 3. A matrix built in the schema

```
[Create matrix: rows 3, columns 3] matrix ──▶ matrix [Set cell: row 1, column 2, value 7] matrix ──▶ grid [Heat map: Test]
```

[Create matrix](coll.matNew) makes a 3 × 3 grid of zeros; [Set cell](coll.matSet) (which counts rows and columns from 0) puts 7 in the second row, third column. In the map that cell is the most intense and all the others are the lightest; the rows and columns are called 1, 2, 3.

## Accessibility and keyboard

**Tab** to reach it; **←** and **→** go from one cell to the next along the row (and to the next row), **↑** and **↓** go to the row above and below, **Home** and **End** go to the first and the last cell, **Enter** sends the cell to **picked cell**, **Esc** clears the choice. A screen reader reads the title and the size (for example "Visits, Heat map, 3 × 4") and announces every cell reached. **Show as a table** gives the grid as a real table, with the names of the rows and columns.

## See also

- [Create matrix](coll.matNew), [Set cell](coll.matSet), [Matrix from list](coll.matFromList)
- [Columns](charts.column) for a few rows and columns
- [Charts](logicstudio-charts): the data shapes, the limits, the keyboard
