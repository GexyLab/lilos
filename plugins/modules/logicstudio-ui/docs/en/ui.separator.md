# Separator

`ui.separator` · Containers · [Standard UI components](logicstudio-ui) · version 1

A thin horizontal line, or an empty space, between two components of a column.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Kind** | line, space | line | **line**: a thin gray line, with a little space above and below. **space**: an empty space. |
| **Size (px)** | from 0 to 200 | 12 | The height of the **space**. With the **line** kind it does not count (see below). |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **enabled** (`enabled`) | yes/no | `false` makes it lighter (you hardly notice). See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it: the space or the line disappears. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

Unlike the other containers, the Separator has an object that can be made from the IDE (it contains nothing: it is a container in name only).

## How it works

- **line**: it is always 1 pixel thick, with 6 pixels of space above and below, as wide as the column. The **Size** does not change it.
- **space**: an empty gap **Size** pixels tall. It adds to the **Space between** of the column: in a column with 10 px of space between the pieces, a separator of 12 px gives 10 + 12 + 10 = 32 px between the two components.
- **It works only vertically.** In a [Row](ui.row) the separator has no width and is not visible (neither the line nor the space). To space things inside a row, use the **Space between** of the row.
- The **line** is visible only in a column with **stretch** alignment (like the root and the [Box](ui.group)). In a [Column](ui.column) aligned to start, center or end, the line has no width and disappears; the **space**, instead, works.
- In a [Grid](ui.grid) the separator takes a cell like the other pieces.

## Examples

### 1. Separating two parts of a form

```
Window «Profile»
└ Column (root)
  ├ Text field  text1  Label «Name»
  ├ Text field  text2  Label «Email»
  ├ Separator   separator1  Kind line
  ├ Checkbox    checkbox1 Label «Receive the news»
  └ Button      button1  Text «Save»
```

A thin line divides the personal data from the preferences.

### 2. More air before the buttons, and a part that appears

```
Window «Search»
└ Column (root)
  ├ Text field  text1       Label «Search»
  ├ Separator   separator1  Kind space  Size 24
  └ Row
    ├ Button  button1  Text «Search»
    └ Button  button2  Text «Cancel»  Look normal
```

The buttons stand further from the field. If you make the object of the separator and send `false` to **visible**, the space disappears and the buttons move up next to the field.

## See also

- [Column](ui.column), [Box](ui.group)
- [Standard UI components](logicstudio-ui)
