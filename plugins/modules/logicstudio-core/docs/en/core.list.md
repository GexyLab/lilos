# Build list

`core.list` · Objects · [Core blocks](logicstudio-core) · version 1

Puts several values together in a list, in the order of its inputs.

## Inputs

The block starts **with no inputs**: add one input for each item of the list (see **Added ports**).

## Outputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | A list with one item for each input, in the same order. |
| **Exception** (`error`) | object | In practice it does not happen: the block has no errors of its own. |

## Added ports

In the **Properties**, **Ports** section, with **Add input** you add up to 32 inputs (or fewer, if an administrator has lowered the **Added ports per block, at most** limit). They are of type any and are named with a number: **1**, **2**, **3**… The name cannot be changed; the **position** counts: the first input in the list is the first item of the list. With the ↑ ↓ arrows you change the order of the items. See [How a block works](ide/blocks).

> If you remove an input in the middle and then add another, the new one can have the same number as one that is already there (for example two **3**). Nothing changes in the list, which follows the order of the ports, but to avoid confusion you can remove and redo the inputs.

## How it works

Every time a value arrives on one of the inputs, the block sends on **list** a new list with **the last value of each input**.

- The list **always has as many items as there are inputs**. An input that has not received anything yet is `null`: with three inputs and only the second arrived (`"b"`), `[null, "b", null]` comes out.
- Values stay: after sending, the inputs keep their value.
- The items can be of any type, even objects and other lists.
- The block runs **at every value**: if you need a single list, remove **starts it** from all the inputs except the one that arrives last, or use [Wait for all](core.join).

This block is in the **Objects** category. To work on lists (add, sort, filter, count…) there is the [Lists and matrices](logicstudio-collections) package.

## Examples

### 1. Three values in order

```
[Value: text "a"]      value ──▶ 1  [Build list] list ──▶ value [Write to console]
[Value: text "b"]      value ──▶ 2
[Value: JSON {"z":1}]  value ──▶ 3
```

At start the three values arrive one after the other and the console writes:

```
["a",null,null]
["a","b",null]
["a","b",{"z":1}]
```

### 2. The options of a Selection

```
[Value: text "Red"]   value ──▶ 1  [Build list] list ──▶ options [Selection: color]
[Value: text "Green"] value ──▶ 2
[Value: text "Blue"]  value ──▶ 3
```

The last list that arrives, `["Red", "Green", "Blue"]`, becomes the list of choices of the [Selection](ui.select) (the object of the component in the schema).

### 3. A row of a table

Link to **1**, **2** and **3** the name, the quantity and the price of an item, remove **starts it** from **1** and **2**: when the price arrives a single list comes out, for example `["Pens", 3, 1.5]`, to add to a bigger list with [Add item](coll.add).

## See also

- [Build object](core.compose) for values with a name
- [Add item](coll.add), [Length](coll.length), [Join into text](coll.join)
- [Wait for all](core.join)
- [How a block works](ide/blocks)
