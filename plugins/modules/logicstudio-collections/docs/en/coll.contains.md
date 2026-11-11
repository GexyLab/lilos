# Includes · IndexOf

`coll.contains` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Tells you whether a value is in the list and at which position it is the first time.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The list to search in. |
| **value** (`value`) | any | The value to look for. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **found** (`found`) | yes/no | `true` if the value is in the list, otherwise `false`. |
| **index (-1 if none)** (`index`) | number | The position (from 0) of the first equal item; -1 if it is not there. |
| **Exception** (`error`) | object | When the value on **list** is not a list. |

## How it works

The block waits until it has both **list** and **value**; then, at every new value, it always sends both outputs.

When an item is "equal" to the value you look for:

- **Numbers, texts, yes/no, `null`: they must be identical**, type included. `2` and `"2"` are different; `"Ciao"` and `"ciao"` are different; `true` and `"true"` are different. There are no conversions.
- **Lists and objects**: they are equal if they have the same content. `[1, 2]` finds the item `[1, 2]`. For objects the **order of the fields** counts too: `{"a":1,"b":2}` and `{"b":2,"a":1}` are different.
- If the value appears more than once, **index** is that of the first time: looking for `"a"` in `["a","b","a"]` gives 0.
- On an empty list the outputs are `false` and -1.
- The block only looks among the items of the list, not inside them: looking for `2` in `[[1, 2], 3]` finds nothing. To look for a piece of text use [Filter](coll.filter) with "contains".

## Examples

### 1. A name in the guest list

```
[Constant · Variable (JSON): ["Anna","Bruno","Carla"]] value ──▶ list  [Includes · IndexOf] found ──▶ on [Lamp]
[Text field: name]                       text  ──▶ value                       index ──▶ value [Value]
```

Typing `Bruno` turns the [Lamp](ui.lamp) on and the [Value](ui.value) shows 1. Typing `bruno` (lowercase) turns the lamp off and you see -1.

### 2. Numbers and texts

On the list `[1, 2, 3]`:

- value `2` (number) → **found** `true`, **index** 1;
- value `"2"` (text) → `false`, -1;
- value `5` → `false`, -1.

If the value comes from a text field and the list has numbers, convert it first with [Cast to number (Number())](core.toNumber).

### 3. An object

On the list `[{"id":7,"nome":"Penna"}]` the value `{"id":7,"nome":"Penna"}` is found at position 0; the value `{"nome":"Penna","id":7}` is not (fields in a different order). To search by a field, it is safer to use [Filter](coll.filter) with the **Field** `id`.

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | The value on **list** is not a list. |

## See also

- [Filter](coll.filter), [Distinct](coll.unique), [Get list[i]](coll.get), [Remove (splice)](coll.removeAt)
- [Compare (== != < >)](core.compare)
- [How a block works](ide/blocks)
