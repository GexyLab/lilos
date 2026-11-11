# Label

`ui.label` · Text and values · [Standard UI components](logicstudio-ui) · version 1

A text in the window: a title, an explanation, a message that a schema changes while the program runs.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Text** | text (translatable) | «Text» | What is shown when opened. |
| **Size** | small, normal, title | normal | **small**: smaller and lighter, for notes. **title**: bigger and bold. |
| **Alignment** | start, center, end | start | Where the text sits in the width of the component. In languages written from right to left, «start» is on the right. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **text** (`text`) | text | Replaces the text shown. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

The Label sends nothing: the user cannot act on it.

## How it works

When opened, the **Text** of the properties is shown (or its translation, if the project has one). Every value that arrives on **text** replaces it:

- a text is shown as it is; a number as it is written in JSON (`3.5`, not `3,5`); `true` and `false` as «true» and «false»;
- an object or a list is shown as JSON on one line: `{"a":1}`;
- `null` (or nothing) empties the label.

The text wraps by itself if it does not fit the width. Line breaks inside the text (`\n`) do not break the line: they become spaces.

If the window is reopened and the project keeps the last values, the label shows the last text received, not the one in the properties.

## Examples

### 1. A fixed title

```
Window «Warehouse»
└ Column (root)
  ├ Label  label1  Text «Stock»  Size title  Alignment center
  └ Table  table1
```

No object is needed: the label always shows «Stock», big and centered.

### 2. A status message

```
Window «Copy»
└ Column (root)
  ├ Button  button1  Text «Copy»
  └ Label   label1   Text «Ready.»  Size small
```

```
[Button: Copy] pressed ──▶ read [Read file: ~/data.txt] content ──▶ content [Write file: ~/copy.txt] written ──▶ send [Value: «Copied.»] value ──▶ text [Label: label1]
[Read file] Exception ──▶ object [Get field: message] value ──▶ text [Label: label1]
```

If the copy succeeds, the label says «Copied.»; if the file is not there, it shows the error message of the [Read file](lilos.fileRead) block.

### 3. A composed text

```
[Text field: Name] text ──▶ name [Format text: «Hello, {name}!»] text ──▶ text [Label: label1]
```

When the user types «Luke» and presses Enter, the label shows «Hello, Luke!».

## Accessibility

The label is normal text: a screen reader reads it when it gets there. It is not linked to any control: to give a field a name, use its own **Label** property.

## See also

- [Value](ui.value), to show numbers with unit and decimals
- [Format text](core.format)
- [Standard UI components](logicstudio-ui)
