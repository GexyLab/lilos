# Map field

`coll.pluck` · Lists · [Lists and matrices](logicstudio-collections) · version 1

From a list of objects, makes the list of the values of one of their fields.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The list, usually of objects. It is not changed. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | list | For each item, the value of the field; `null` if the item does not have it. It has the same length as the list. |
| **Exception** (`error`) | object | Invalid list or field not given. |

## Settings

| Setting | Values | Default | Description |
|---|---|---|---|
| **Field (e.g. a.b)** (`field`) | a text | empty | The field to take. Required. |

## How it works

At every list that arrives, the block takes from each item the value of the **Field** and sends the list of these values, in the same order.

How to write the field:

- `nome` takes the field `nome` of the object;
- `indirizzo.città` takes the field `città` inside the field `indirizzo` (each dot goes down one level);
- a number takes an item of a list: `1` on the list of rows `[[1,2],[3,4]]` gives `[2,4]` (the second column). For matrices there is also [Column m[][c]](coll.matCol);
- there is no way to give a field that has a dot in its name.

Cases to know:

- If an item does not have the field, or is not an object (a number, a text, `null`), there is `null` in its place: the result **always has the same length** as the list.
- "Empty" values stay as they are: `0`, `false`, `""` do not become `null`.
- If the field is an object or a list, it goes into the result whole.
- With an empty **Field** the output is «Indica il campo da estrarre» ("Say which field to extract"), even if the list is empty.

## Examples

### 1. The names

```
[Constant · Variable (JSON): [{"nome":"Anna","età":31},{"nome":"Bruno","età":27}]] value ──▶ list [Map field: nome] result ──▶ value [Print (console.log)]
```

It writes `["Anna","Bruno"]`. With **Field** `età`: `[31,27]`.

### 2. A missing field and a nested field

On the list `[{"a":{"c":3}}, 5, null, {"a":{}}]` the field `a.c` gives `[3, null, null, null]`.

### 3. The average of the prices

```
[Constant · Variable (JSON): [{"p":2},{"p":4},{"p":9}]] value ──▶ list [Map field: p] result ──▶ list [Sum · Min · Max · Avg: average] result ──▶ value [Value]
```

It shows 5. You get the same result without Map field too, by putting **Field** `p` directly in the [Sum · Min · Max · Avg](coll.stat) block.

### 4. Text from a list of objects

```
[Filter] result ──▶ list [Map field: nome] result ──▶ list [Join] text ──▶ text [Button]
```

The [Button](ui.button) shows for example «Penna, Quaderno».

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | The value on **list** is not a list. |
| Indica il campo da estrarre (Say which field to extract) | The **Field** setting is empty. |

## See also

- [Get property](core.get) for a field of a single object
- [Filter](coll.filter), [Sort](coll.sort), [Distinct](coll.unique) (they also have a **Field**)
- [Column m[][c]](coll.matCol)
- [How a block works](ide/blocks)
