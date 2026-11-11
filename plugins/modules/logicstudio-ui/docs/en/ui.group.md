# Box

`ui.group` · Containers · [Standard UI components](logicstudio-ui) · version 1

A [Column](ui.column) with a rounded border and a title on the top edge: to gather the components that belong together (for example «Shipping» and «Payment» in a form).

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Title** | text (translatable) | «Box» | The title on the border. Empty: the border without a title. |
| **Space between (px)** | from 0 to 64 | 8 | The vertical space between the components inside the box. |

The inner margin is fixed (about 10 pixels above, 12 at the sides and below). The components inside take the whole width of the box.

## Ports of its object in the schema

| Port | Direction | Type | Description |
|---|---|---|---|
| **title** (`title`) | input | text | Replaces the title. |
| **enabled** (`enabled`) | input | yes/no | `false` disables the box **and everything it contains**. |
| **visible** (`visible`) | input | yes/no | `false` hides the box with all its content. |

> **Today these ports cannot be used from the IDE.** The Box is a container, and for containers the Properties do not show the **Object in a schema** section: there is no way to make its object. The title stays the one in the properties, and to hide or disable the content you have to do it component by component. See [Standard UI components](logicstudio-ui).

## How it works

- The components inside the box stay one under the other, at full width, as in a Column with **stretch** alignment.
- To put them side by side, put a [Row](ui.row) or a [Grid](ui.grid) in the box.
- In **Design** you add a piece to the box by selecting the box and clicking the piece in the palette, or by dragging it inside the border.

## Examples

### 1. A form in two parts

```
Window «Order»
└ Column (root)
  ├ Box  Title «Shipping»
  │ ├ Text field  text1  Label «Address»
  │ └ Text field  text2  Label «City»
  └ Box  Title «Payment»
    ├ Option buttons  radios1  Options «Card, Bank transfer, Cash on delivery»
    └ Button          button1  Text «Confirm»
```

Two boxes with their titles separate the two parts of the form.

### 2. A status box with a grid

```
Window «Server»
└ Column (root)
  └ Box  Title «Status»  Space between 12
    ├ Grid  Columns 3
    │ ├ Lamp  lamp1  Label «Network»
    │ ├ Lamp  lamp2  Label «Disk»
    │ └ Lamp  lamp3  Label «Backup»
    └ Label  label1  Text «Last check: —»  Size small
```

The three lamps stand in a row inside the box, with the small note below.

## Accessibility

The box is a group with a name (its title): a screen reader, when entering a field of the box, can announce «Shipping». For this reason it is worth always giving it a title.

## See also

- [Column](ui.column), [Tabs](ui.tabs)
- [Standard UI components](logicstudio-ui)
