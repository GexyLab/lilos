# Grid

`ui.grid` · Containers · [Standard UI components](logicstudio-ui) · version 1

A container that puts the components in cells of equal width, over several columns: it fills the first row from left to right, then the second, and so on. It suits tidy forms and panels of indicators.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Columns (0: automatic)** | from 0 to 12 | 2 | How many columns. **0**: as many columns as fit, at least 140 pixels wide; if the window widens, the columns increase. |
| **Space between (px)** | from 0 to 64 | 10 | The space between the cells, horizontally and vertically. |
| **Margin (px)** | from 0 to 64 | 0 | The empty space all around. |

## Ports of its object in the schema

A Grid, like all containers, today **has no object** that can be made from the IDE: its **enabled** and **visible** inputs cannot be used. See [Standard UI components](logicstudio-ui).

## How it works

- The columns divide the width of the grid into equal parts. Each component takes one cell and stretches to the whole width of the cell.
- The cells of a row are as tall as the tallest one.
- A component cannot take two cells. For a wider piece, close the grid and put it below, in a [Column](ui.column), or put in the cell a [Row](ui.row) with several pieces.
- With **Columns** at 0, a narrow window can have a single column: the components end up one under the other.
- In **Design**, when you drag a piece into the grid, the place is decided by the **height** at which you leave it (before the first component whose middle is lower than the pointer), not by the column: to put it in a precise cell you may need a few tries, or drag it and then move the others.

## Examples

### 1. A two-column form

```
Window «Address»
└ Column (root)
  └ Grid  Columns 2
    ├ Text field    text1    Label «First name»
    ├ Text field    text2    Label «Last name»
    ├ Text field    text3    Label «City»
    └ Number field  number1  Label «ZIP code»
```

First name and Last name are on the first row, City and ZIP code on the second, each one half the width of the window.

### 2. A panel of indicators

```
Window «Plant»
└ Column (root)
  └ Grid  Columns 0  Space between 16
    ├ Gauge  gauge1  Label «Temperature»  Unit «°C»
    ├ Gauge  gauge2  Label «Pressure»     Unit «bar»  Maximum 10
    ├ Gauge  gauge3  Label «Humidity»     Unit «%»
    └ Lamp   lamp1   Label «Alarm»        Color red
```

In a window 700 pixels wide, four cells fit per row; at 600 pixels, three (the lamp goes below). Narrowing the window, the gauges wrap by themselves.

## See also

- [Column](ui.column), [Row](ui.row)
- [Standard UI components](logicstudio-ui)
