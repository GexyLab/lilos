# Length

`coll.length` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Counts the items of a list and sends the number.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The list to count. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **length** (`length`) | number | How many items the list has: 0 if it is empty. |
| **Exception** (`error`) | object | When the value that arrived is not a list. |

## How it works

Every time a list arrives on **list**, the block sends on **length** how many items it has.

- It counts only the first level: `[[1, 2], [3, 4, 5]]` has length 2 (two items, which are lists in turn).
- An empty list `[]` gives 0.
- `null` items count: `[null, null]` has length 2.
- A text is not a list: `"ciao"` does not give 4, but the error «Serve una lista» ("A list is needed"). For the length of a text use [Text operation](core.text).
- An object (`{"a": 1}`) or `null` also give «Serve una lista».
- A [matrix](logicstudio-collections) is a list of rows: linked here it gives the number of **rows**. The IDE flags the matrix → list link, but it works. For rows and columns together use [Size](coll.matSize).

## Examples

### 1. How many names there are

```
[Value (JSON): ["Anna","Bruno","Carla"]] value ──▶ list [Length] length ──▶ value [Write to console]
```

It writes `3`.

### 2. Empty list

```
[Value (JSON): []] value ──▶ list [Length] length ──▶ value [Write to console]
```

It writes `0`. No error.

### 3. Lines read from a text

```
[Text field] text ──▶ text [Split text: separator \n] result ──▶ list [Length] length ──▶ value [Value]
```

With the text `uno` new line `due` new line `tre` the [Value](ui.value) shows `3`. Careful: an empty field gives 1, not 0, because [Split text](coll.split) of an empty text gives `[""]` (a list with one empty text).

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | The value on **list** is not a list (text, number, object, `null`…). |

## See also

- [Size](coll.matSize) for rows and columns of a matrix
- [Contains · Index of](coll.contains), [Get item](coll.get)
- [How a block works](ide/blocks)
