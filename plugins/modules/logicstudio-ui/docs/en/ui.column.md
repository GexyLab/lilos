# Column

`ui.column` · Containers · [Standard UI components](logicstudio-ui) · version 1

A container that puts the components one under the other, from top to bottom. It is the most used container: the root of every window is also a Column.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Space between (px)** | from 0 to 64 | 10 | The vertical space between one component and the next. |
| **Margin (px)** | from 0 to 64 | 0 | The empty space all around, between the edge of the column and the components. |
| **Alignment** | stretch, start, center, end | stretch | How the components sit horizontally. **stretch**: each one takes the whole width of the column. **start**, **center**, **end**: each one has its natural width and is aligned to the left, to the center or to the right (in right-to-left languages, start and end swap). |

## Ports of its object in the schema

A Column, like all containers, today **has no object** that can be made from the IDE: in its Properties there is no **Object in a schema** section. Its **enabled** and **visible** inputs exist (they apply to the whole column, with everything it contains) but they cannot be used from the IDE. To hide a group of components, today you have to hide them one by one. See [Standard UI components](logicstudio-ui).

## How it works

- The components stay in the order they have in the column: the first one at the top.
- A column is as tall as its content; the root takes the whole height of the window. If the content is taller than the window, the window scrolls.
- In the **root** (the Column of the window, with 10 px of space and 14 px of margin) the properties cannot be changed: the root cannot be selected.
- To put something **next to** something else inside a column, put a [Row](ui.row) in the column.
- In **Design** the column has a dashed border and is at least 36 pixels tall, even when empty, so you can drop pieces into it. When you drag a piece, the horizontal blue line shows between which two components it will go.

## Examples

### 1. A form with the buttons on the right

```
Window «Contact»
└ Column (root)
  ├ Text field  text1  Label «Name»
  ├ Text field  text2  Label «Phone»
  └ Column  Alignment end
    └ Button  button1  Text «Save»
```

The two fields take the whole width (the root is «stretch»); the button, in the inner column aligned to **end**, stays on the right with its natural width.

### 2. A centered block with more space

```
Window «Welcome»
└ Column (root)
  └ Column  Alignment center  Space between 20  Margin 24
    ├ Image   image1  Image «risorse/logo.png»
    ├ Label   label1  Text «Welcome!»  Size title
    └ Button  button1 Text «Start»
```

Logo, title and button stay in the center, one under the other, 20 pixels apart, with 24 pixels of margin around.

## See also

- [Row](ui.row), [Grid](ui.grid), [Box](ui.group) (a column with a border and a title)
- [Separator](ui.separator), for more space or a line between two components
- [Standard UI components](logicstudio-ui)
