# Sum · Min · Max · Average

`coll.stat` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Calculates the sum, the minimum, the maximum or the average of the numbers of a list.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The list of numbers (or of objects, with **Field**). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | number | The result of the chosen operation. |
| **Exception** (`error`) | object | Invalid list, a non-numeric item, empty list (except for the sum). |

## Settings

| Setting | Values | Default | Description |
|---|---|---|---|
| **Operation** (`op`) | sum (`sum`), minimum (`min`), maximum (`max`), average (`avg`) | sum | What to calculate. |
| **Field (optional, e.g. a.b)** (`field`) | a text | empty | If the list has objects, the field with the number (`prezzo`, `misura.valore`, `0` for the first value of a list). Empty: the items themselves. |

## How it works

At every list that arrives, the block calculates the result and sends it on **result**.

| Operation | Result | With the empty list |
|---|---|---|
| sum | all the numbers added | 0 |
| minimum | the smallest | error «Lista vuota» ("Empty list") |
| maximum | the biggest | error «Lista vuota» |
| average | the sum divided by how many there are | error «Lista vuota» |

**Which values are numbers.** Every item (or its field) must be:

- a number: `4`, `-2.5`;
- or a text with a number: `"7"`, `" 3 "` (spaces at the sides do not count), `"2,5"` (the comma counts as a decimal point), `"1e3"` (1000), `"0x10"` (16).

If even a single item is not, the output is «Serve un numero in ogni elemento» ("A number is needed in every item") and no result. These are not numbers: `true`, `false`, `null`, `""`, `"abc"`, objects, lists, a missing field, and the text `"Infinity"`.

Beware of texts with thousands: only the **first** comma becomes a dot. `"1,000"` is worth 1 (not a thousand) and `"1.000,5"` is not a number.

The result is not rounded: `[0.1, 0.2]` added give `0.30000000000000004`, as in every floating-point calculation on the computer. Round with [Calculate](core.math) if needed. Huge numbers can give `Infinity`.

## Examples

### 1. Sum and average

```
[Value (JSON): [4,8,9]] value ──▶ list [Sum · Min · Max · Average] result ──▶ value [Write to console]
```

With **Operation** sum it writes `21`; with average `7`; with minimum `4`; with maximum `9`.

### 2. The total of a cart

```
[Value (JSON): [{"articolo":"Penna","prezzo":"2,50"},{"articolo":"Zaino","prezzo":35}]] value ──▶ list [Sum · Min · Max · Average: sum, Field prezzo] result ──▶ value [Value: total]
```

The total is 37.5: the text `"2,50"` is worth 2.5. If an article did not have the `prezzo` field, the total would not update and the output would be «Serve un numero in ogni elemento».

### 3. The moving average of the last 5 readings

```
[Number field: reading] value ──▶ add [Accumulate: max 5] list ──▶ list [Sum · Min · Max · Average: average] result ──▶ value [Value]
```

With the readings 10, 20, 30 the Value shows 10, then 15, then 20. After the sixth reading the oldest one drops out of the count.

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | The value on **list** is not a list. |
| Serve un numero in ogni elemento (A number is needed in every item) | An item (or its field) is not a number. |
| Lista vuota (Empty list) | The list is empty and the operation is minimum, maximum or average. |

## See also

- [Min · Max · Average](core.stat) for numbers on separate inputs
- [Map field](coll.pluck), [Accumulate](coll.accumulate), [Sort](coll.sort)
- [How a block works](ide/blocks)
