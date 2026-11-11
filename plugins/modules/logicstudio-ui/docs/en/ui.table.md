# Table

`ui.table` · Text and values · [Standard UI components](logicstudio-ui) · version 1

Shows a list in rows and columns: every item of the list is a row, every field of an object is a column. The user can choose a row, and the table sends it to the schema.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Label** | text (translatable) | empty | Text above the table. |
| **Columns (fields, comma separated; empty: all)** | field names separated by commas | empty | Which fields to show, and in which order: `name, price`. Empty: all the fields it finds (at most 12). |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **rows** (`rows`) | list | The rows to show. Replaces the whole table. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and a row can no longer be chosen. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **chosen row** (`selected`) | object | The row the user clicks (or presses Enter or Space on). |
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

When opened the table is empty (only the header, if you wrote the **Columns**). Every list that arrives on **rows** redraws it from scratch.

**The columns.**

- With **Columns** written, the table shows those fields, in the written order, with no limit on their number. A field that a row does not have stays empty.
- With **Columns** empty, the table collects the fields of all the rows, in the order it meets them, and shows **at most 12**.
- The header shows the name of the field as it is (`price`, not «Price»). For a different header, rename the fields in the schema.

**The rows.**

| Item of the list | How it is shown |
|---|---|
| an object `{ "name": "Bread", "price": 2.5 }` | one field per column: `Bread` · `2.5` |
| a simple value (`"Bread"`, `3`, `true`) | in the **valore** column |
| a list `[1, 2]` | in the **valore** column, as JSON: `[1,2]` |
| a field that is an object or a list | as JSON on one line |

- Numbers are shown as in JSON (`2.5`, not `2,5`), without formatting.
- If the list mixes objects and simple values, a simple value is repeated in **every** column of its row.
- **At most 500 rows are shown**: the others do not appear and the table does not tell you. The table is at most 260 pixels tall and scrolls.
- A value on **rows** that is not a list empties the table.

(The column for simple values is named `valore`, as in the code: it is not translated.)

**Choosing a row.** A click on a row (or **Enter** / **Space** when the row has the focus) highlights it and sends on **chosen row**:

| Row | What it sends |
|---|---|
| an object | **the whole object**, with all its fields (also those not shown in the columns) |
| a list | the list itself |
| a simple value, or `null` | an object `{ "value": <value>, "index": <position> }`; the position starts from 0 |

- Clicking the same row again sends it again.
- For a row that is an object, the table does **not** send its position: if you need it, put a field with a code in the object.
- When new rows arrive, the highlighted row is no longer highlighted.

## Examples

### 1. The content of a folder

```
Window «Documents»
└ Column (root)
  ├ Button  button1  Text «Refresh»
  ├ Table   table1   Label «Files»  Columns «name, size»
  └ Label   label1   Text «»
```

```
[Button: Refresh] pressed ──▶ read [List folder: ~/Documents] items ──▶ rows [Table: Files]
[Table: Files] chosen row ──▶ object [Get field: name] value ──▶ text [Label: label1]
```

The table shows the name and size (in bytes) of each item of the folder; clicking a row, the label below shows the chosen name. The fields that [List folder](lilos.folderList) sends are `name`, `type`, `size`, `modified` and `path`; in general, if you do not know the fields of a list, leave **Columns** empty the first time and look at the header.

### 2. A list of words

```
[Value: ["red","green","blue"] (JSON)] value ──▶ rows [Table: Colors]
[Table: Colors] chosen row ──▶ value [Write to console]
```

The table has a single column, **valore**, with three rows. A click on «green» writes `{"value":"green","index":1}` in the console.

### 3. A log that grows

```
[Text field: Note] text ──▶ note [Build object] object ──▶ add [Accumulate: max 50] list ──▶ rows [Table: Notes]
[Date and time block] ISO ──▶ time [Build object]
[Text field: Note] enter ──▶ read [Date and time block]
```

The «Date and time block» is the [Date and time](core.now) block of the Basic blocks, not the component. With [Accumulate](coll.accumulate) the table shows the last 50 notes written, each with its time. (In the [Build object](core.compose), remove «starts it» from **note**: the object starts when the time arrives.)

## Accessibility and keyboard

- Every row is reached with **Tab** and chosen with **Enter** or **Space**. The arrow keys do not move from one row to another.
- The chosen row is seen from the colored background; a screen reader does not announce it as «selected».
- The **Label** above is not linked to the table.
- With many rows, Tab goes through all of them: for long tables consider a [List](ui.list).

## See also

- [List](ui.list), to choose from a list of names
- [Map field](coll.pluck), [Sort](coll.sort), [Filter](coll.filter) to prepare the rows
- [Standard UI components](logicstudio-ui)
