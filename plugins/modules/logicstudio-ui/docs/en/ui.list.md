# List

`ui.list` · Commands · [Standard UI components](logicstudio-ui) · version 1

A list of items that is always open, in a box that scrolls: the user clicks an item to choose it. Unlike the [Selection](ui.select), at the start no item is chosen, and every click sends the item, even if it is the same as before.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Label** | text (translatable) | empty | Text above the list. |
| **Items (comma separated)** | text (translatable) | empty | The items, in order: `Bread, Milk, Eggs`. Spaces around the commas are removed; empty items are skipped. |
| **Height (px)** | from 40 to 1200 | 140 | The height of the box. Extra items scroll. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **items** (`items`) | list | Replaces the items. |
| **chosen** (`value`) | any | Highlights the item with that value, without the list sending anything. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and it can no longer be chosen. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **chosen** (`value`) | any | The value of the item, every time the user chooses one. It is always a text. |
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

**The items** are written and sent like the options of the [Option buttons](ui.radios): a list of texts, a list of objects `{ "value": …, "label": … }` (`label` is shown, `value` comes out), or a text with commas. **The value that comes out is always a text**, even if the items were numbers: the item `3` sends `"3"`. An object with neither `value` nor `label` becomes an item «undefined».

**Choosing.**

- **Click** on an item: it highlights it and sends it on **chosen**. Another click on the same item sends it again.
- **Keyboard**, with the list in the foreground: **down arrow** chooses the next item, **up arrow** the previous one, and every key press sends it. If there is no choice yet, both choose the first item. On the last item, **down arrow** sends it again.
- When opened, no item is chosen and the list sends nothing.

**From the schema.**

- **chosen**: highlights the item with that value (compared as text). If no item has it, none stays highlighted.
- **items**: replaces the list. If the chosen item is still there (same value), it stays highlighted.

With many items the box scrolls with the wheel; when choosing with the arrow keys, though, the list **does not scroll by itself** to the chosen item: beyond the edge of the box the chosen item is not visible.

## Examples

### 1. A shopping list

```
Window «Shopping»
└ Column (root)
  ├ List   list1   Label «Products»  Items «Bread, Milk, Eggs, Fruit»  Height 120
  └ Label  label1  Text «Choose a product»
```

```
[List: Products] chosen ──▶ product [Format text: «You chose: {product}»] text ──▶ text [Label: label1]
```

A click on «Milk» makes the label say «You chose: Milk».

### 2. The notes of a folder

```
Window «Notes»
└ Column (root)
  ├ List   list1   Label «Your notes»  Height 200
  └ Label  label1  Text «»
```

```
[At start] pulse ──▶ read [List folder: ~/Notes  show files only] names ──▶ items [List: Your notes]
[List: Your notes] chosen ──▶ name [Format text: «~/Notes/{name}»] text ──▶ path [Read file] content ──▶ text [Label: label1]
```

At the start the list fills with the names of the files of the folder. A click on a note reads it and the label shows its content. In the [Read file](lilos.fileRead) turn on «starts it» on the **path** input (it is off by default), so the block reads the file as soon as the path arrives. With the arrow keys the user goes through the notes one after the other, and each one is read.

### 3. Items with a code

```
[Value: JSON] value ──▶ items [List: Departments]
[List: Departments] chosen ──▶ value [Write to console]
```

The [Value](core.value), of type JSON, contains `[{"value":"A1","label":"Administration"},{"value":"M2","label":"Warehouse"}]`. The list shows «Administration» and «Warehouse»; a click on «Warehouse» writes `M2` in the console. To highlight an item from the schema, send `"M2"` (the value, not the text) on **chosen**.

## Accessibility and keyboard

- You reach the list with **Tab** (a colored border shows it is in the foreground); **up/down arrow** change the choice. **Home**, **End** and letters do nothing. The single items cannot be reached with Tab.
- For screen readers the list is a «list box» with its options, and the chosen item is marked as selected; but the focus stays on the whole list, so when moving with the arrow keys the screen reader may not announce the new item.
- The **Label** above is not linked to the list.

## See also

- [Selection](ui.select), [Option buttons](ui.radios)
- [Table](ui.table), for rows with several columns
- [Standard UI components](logicstudio-ui)
