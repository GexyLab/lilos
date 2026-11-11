# Filter

`coll.filter` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Splits a list in two: the items that meet a condition and those that do not.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The list to filter. It is not changed. |
| **value (optional)** (`value`) | any | The value to compare the items with. If it arrives, it wins over the **Value** setting. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | list | The items that meet the condition, in the starting order. |
| **rejected** (`rest`) | list | All the others, in the starting order. |
| **Exception** (`error`) | object | When the value on **list** is not a list. |

## Settings

| Setting | Values | Default | Description |
|---|---|---|---|
| **Keep items that are** (`op`) | `a = b` (`eq`), `a ≠ b` (`ne`), `a > b` (`gt`), `a ≥ b` (`ge`), `a < b` (`lt`), `a ≤ b` (`le`), contains (`contains`) | `a = b` | The condition. **a** is the item (or its field), **b** is the value. |
| **Value** (`value`) | a text | empty | The value **b**, if nothing arrives on the **value** input. It is always a text: `5` written here is the text `"5"`. |
| **Field (optional, e.g. a.b)** (`field`) | a text | empty | If the list has objects, the field to compare (`prezzo`, `indirizzo.città`, `0` for the first value of a list). Empty: the whole item is compared. |

## How it works

The **list** alone is enough for the block to run. At every new value (list or value) the block tries the condition on every item and sends both outputs, even when one is empty (`[]`).

**The value b** is the latest one that arrived on the **value** input; if nothing ever arrived, it is the text of the **Value** setting. Careful: with the default settings (a = b, empty Value) the block keeps only the items equal to the empty text.

**How the comparison works (=, ≠, >, ≥, <, ≤).**

1. If **a** and **b** are both numbers, or texts with a number (`"5"`, `"4,5"`, `" 10 "`), they are compared as numbers: `5 = "5"` is true, `10 > "4,5"` is true.
2. Otherwise they are compared as texts. `null` and missing fields count as an empty text; `true`/`false` count as `"true"`/`"false"`; lists and objects count as their JSON. The comparison between texts goes **character by character by code**: uppercase before lowercase (`"B" < "a"` is true), accented letters after z. It is enough for one of the two not to be a number for the digits to be compared as letters too: `"10"` comes before `"9a"`.
3. For **=** and **≠**, if **a** and **b** are both lists or objects, they are equal when they have the same content (with the fields in the same order).

Cases to know:

- An item without the **Field** counts as an empty text: with "a < b" and b = `10`, the item `{"q": 1}` (without `prezzo`) **passes**, because the empty text comes before `"10"`. With "a > b", instead, it ends up among the rejected.
- `null` is equal to the empty text: with "a = b" and an empty Value both `""` and `null` pass.
- The text `"null"` is not equal to `null`.

**contains.**

- If **a** is a list, it is true when one of its items is **identical** to b (type included, as in [Contains · Index of](coll.contains)). Since the **Value** setting is always a text, `[1, 2]` does not "contain" the Value `2`: to look for a number, send it on the **value** input.
- Otherwise **a** and **b** become texts and it is true if b is a piece of a. It tells uppercase from lowercase: `"Mela"` does not contain `"mel"`.
- An empty b is contained in every text: with "contains" and an empty Value, all the items that are not lists pass.

## Examples

### 1. Numbers above a threshold

```
[Value (JSON): [1,5,10,"5",null]] value ──▶ list [Filter: a > b, Value 4] result   ──▶ value [Write to console]
                                                                       rejected ──▶ value [Write to console]
```

The two consoles write `[5,10,"5"]` and `[1,null]`.

### 2. Cheap products

```
[Value (JSON): [{"nome":"Penna","prezzo":2.5},{"nome":"Zaino","prezzo":35},{"nome":"Quaderno","prezzo":4}]] value ──▶ list [Filter] result ──▶ rows [Table]
[Number field: maximum price] value ──▶ value (optional)
```

With **Keep items that are** "a ≤ b" and **Field** `prezzo`: typing 5 in the number field makes the [Table](ui.table) show Penna and Quaderno; typing 40 shows all three. Before the user types, b is the text of the **Value** setting (empty): no price is ≤ an empty text and the table stays empty. Put `10` in **Value** to start with a limit.

### 3. Looking for a piece of text

```
[Value (JSON): ["mela","pera","melone","Melagrana"]] value ──▶ list [Filter: contains] result ──▶ items [List]
[Text field: search]                                  text  ──▶ value (optional)
```

Typing `mel` makes the [List](ui.list) show `mela` and `melone` (not `Melagrana`, which has a capital M).

### 4. Removing a value

With "a ≠ b" and Value `rosso`, the list `["rosso","verde","rosso","blu"]` gives `["verde","blu"]` on **result** and `["rosso","rosso"]` on **rejected**.

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | The value on **list** is not a list. |

## See also

- [Map field](coll.pluck), [Sort](coll.sort), [Unique](coll.unique), [Contains · Index of](coll.contains)
- [Compare](core.compare) to compare two single values
- [How a block works](ide/blocks)
