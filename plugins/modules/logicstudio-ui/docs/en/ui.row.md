# Row

`ui.row` · Containers · [Standard UI components](logicstudio-ui) · version 1

A container that puts the components side by side, from left to right. If there is no room, they wrap.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Space between (px)** | from 0 to 64 | 10 | The space between one component and the next (also between the rows, when they wrap). |
| **Margin (px)** | from 0 to 64 | 0 | The empty space all around. |
| **Alignment** | stretch, start, center, end | center | How the components sit **vertically** when they have different heights: **center** centers them, **start** aligns them at the top, **end** at the bottom, **stretch** lengthens them all to the height of the tallest (in a row it means «full height»). |
| **Wraps when it needs to** | yes/no | yes | Off: the components always stay on the same row, even if they go off the edge. |

## Ports of its object in the schema

A Row, like all containers, today **has no object** that can be made from the IDE: its **enabled** and **visible** inputs (which would apply to the whole content) cannot be used. See [Standard UI components](logicstudio-ui).

## How it works

- Each component has its natural width (a button as wide as its text, a field the width of the field). The row does **not** widen the components to fill the space: what is left over stays empty on the right.
- With **Wraps when it needs to**, a component that does not fit goes to the row below.
- In languages written from right to left, the row starts from the right.
- In **Design**, when you drag a piece into a row the blue line is **vertical** and shows between which two components it will go.
- A [Separator](ui.separator) in a row is not visible: separators work only vertically.

## Examples

### 1. Two buttons side by side

```
Window «Player»
└ Column (root)
  ├ Label  label1  Text «Track 1»
  └ Row
    ├ Button  button1  Text «Play»   Icon play
    ├ Button  button2  Text «Pause»  Icon stop  Look normal
    └ Button  button3  Text «Next»   Look normal
```

The three buttons stand on the same row, 10 pixels apart. In a narrow window, those that do not fit go below.

### 2. A switch with its text

```
Window «Settings»
└ Column (root)
  ├ Row  Alignment center  Space between 8
  │ ├ Switch  toggle1  Label «Notifications»
  │ └ Label   label1   Text «Notifications»
  └ Row  Alignment center  Space between 8
    ├ Switch  toggle2  Label «Sounds»
    └ Label   label2   Text «Sounds»
```

The [Switch](ui.toggle) does not show its label: with a Row you put a text next to it, centered vertically.

## See also

- [Column](ui.column), [Grid](ui.grid)
- [Standard UI components](logicstudio-ui)
