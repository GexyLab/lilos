# Sort

`coll.sort` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Puts the items of a list in order: numbers from the smallest to the biggest, texts in alphabetical order, objects by one of their fields.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The list to sort. It is not changed: the block makes a copy. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | list | The same items, in order. |
| **Exception** (`error`) | object | Invalid list, or a non-numeric item when you compare as numbers. |

## Settings

| Setting | Values | Default | Description |
|---|---|---|---|
| **Order** (`order`) | ascending (`asc`), descending (`desc`) | ascending | Ascending: from the smallest (or from A). Descending: from the biggest (or from Z). |
| **Compare as** (`kind`) | `auto`, number (`number`), text (`text`) | `auto` | How to compare the items (see below). In the list the first choice is shown as «auto». |
| **Field (optional, e.g. a.b)** (`field`) | a text | empty | If the list has objects, the field to sort them by. Empty: the whole items are compared. |

## How it works

At every list that arrives, the block sends the sorted copy.

**What is compared.** With an empty **Field**, the items themselves. With a field, for each item the value of that field: `prezzo` takes `item.prezzo`, `a.b` takes the field `b` inside the field `a`, a number takes an item of a list (`0` is the first: with `[[3,"x"],[1,"y"]]` and field `0` it sorts by the first value of each row). If an item does not have that field, its value is "nothing".

**Compare as:**

| Choice | What it does |
|---|---|
| number | Every value must be a number, or a text that contains a number (`"10"`, `"2,5"`, `" 3 "`). If one is not (`"abc"`, `true`, `null`, an object, a missing field) the output is «Serve un numero in ogni elemento» ("A number is needed in every item") and no result. |
| text | Every value becomes text (objects and lists as JSON, `null` and missing fields as empty text) and is sorted alphabetically, as in a dictionary: uppercase and lowercase close together, accented letters next to those without accent (`a`, `à`, `b`, `C`). Digits are letters like the others: `"10"` comes before `"9"`. |
| auto | If **all** the values are numbers or texts with a number, it sorts as numbers; otherwise as text. A single non-numeric item is enough to make the whole list sort as text. |

Other cases:

- An empty list gives `[]`, with any choice.
- The values `true` and `false` are not numbers: in `auto` the list is sorted as text (`false` before `true`).
- As text, a `null` item or a missing field counts as empty text and goes **first** (in ascending order).
- Equal items stay in the order they were in with **Order** ascending; with descending they end up **in reverse order** compared to the starting one (the block sorts ascending and then flips).
- The block does not modify the list: if it also goes to other blocks, they see it as it was.

## Examples

### 1. Numbers

```
[Constant · Variable (JSON): [10,9,100,1]] value ──▶ list [Sort] result ──▶ value [Print (console.log)]
```

It writes `[1,9,10,100]`. With **Order** descending: `[100,10,9,1]`. With **Compare as** text: `[1,10,100,9]`.

### 2. Texts that look like numbers

The list `["10","9","100","1"]` with `auto` gives `["1","9","10","100"]` (they are all numbers written as text); the list `[3,"a",1]` with `auto` gives `[1,3,"a"]` (there is a text, so everything as text); the same with **number** gives the error «Serve un numero in ogni elemento».

### 3. Products by price

```
[Constant · Variable (JSON): [{"nome":"Zaino","prezzo":35},{"nome":"Penna","prezzo":2.5},{"nome":"Quaderno","prezzo":4}]] value ──▶ list [Sort] result ──▶ rows [Table]
```

With **Field** `prezzo` and **Order** ascending the [Table](ui.table) shows Penna, Quaderno, Zaino. With **Field** `nome` and descending: Zaino, Quaderno, Penna.

### 4. The ranking

```
[Accumulate (bounded push)] list ──▶ list [Sort: punti, descending] result ──▶ list [Slice: to = 3] result ──▶ rows [Table]
```

Each result `{"nome": …, "punti": …}` collected by [Accumulate (bounded push)](coll.accumulate) enters the ranking and the table shows the top three.

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | The value on **list** is not a list. |
| Serve un numero in ogni elemento (A number is needed in every item) | **Compare as** is number and a value is not a number. |

## See also

- [Reverse](coll.reverse), [Distinct](coll.unique), [Filter](coll.filter)
- [Sum · Min · Max · Avg](coll.stat) to get only the smallest or the biggest
- [How a block works](ide/blocks)
