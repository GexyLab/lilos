# Accumulate (bounded push)

`coll.accumulate` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Collects the values that arrive one at a time into a list, and sends the updated list at every value. When the list is full, it drops the oldest.

## Inputs

| Port | Type | Description |
|---|---|---|
| **add** (`add`) | any | Every value that arrives here goes to the end of the list. |
| **clear** (`clear`) | pulse | Empties the list. Any value that arrives here counts as a pulse. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The list collected so far, from the oldest to the newest. |
| **count** (`count`) | number | How many items the list has. |
| **Exception** (`error`) | object | Not used by this block in normal conditions. |

## Settings

| Setting | Values | Default | Description |
|---|---|---|---|
| **Max length (oldest dropped)** (`max`) | 1 to 100000 | 100 | How many values to keep at most. When one more arrives, the oldest one goes out. |

## How it works

The block has a **memory**: the collected list stays from one value to the next.

- A value on **add** goes to the end of the list; if the list goes over the **Max length**, the oldest items (at the start) are removed. Then the block sends **list** and **count**.
- A pulse on **clear** erases everything and sends the empty list `[]` and **count** = 0.
- **Any** value is added, even `null` or a list (which becomes a single item, it is not "opened").
- The list starts empty **every time the program starts** (Test or Activate): it is not saved.
- If the **Max length** is lowered while the program is running, the list gets shorter at the next value.

Special values of the **Max length**: a number with a decimal part is truncated (1,7 counts as 1); a value above 100000 counts as 100000; a negative value counts as 1; **0 or an empty box count as 100** (the default), not 1.

If you remove "starts it" from **add** or from **clear**, the values that arrive there are ignored completely: the block only works when it runs, so it neither adds nor clears.

## Examples

### 1. The last 3 readings

With **Max length** 3, sending 1, 2, 3, 4 to **add**:

| Arrives | list | count |
|---|---|---|
| 1 | `[1]` | 1 |
| 2 | `[1, 2]` | 2 |
| 3 | `[1, 2, 3]` | 3 |
| 4 | `[2, 3, 4]` | 3 |
| pulse on **clear** | `[]` | 0 |
| 9 | `[9]` | 1 |

### 2. A scrolling chart

```
[Interval (setInterval): 1 second] pulse ──▶ read [Store (set · get)] value ──▶ add [Accumulate (bounded push): max 60] list ──▶ data [Lines]
[Number field: temperature] value ──▶ set [Store (set · get)]
[Button: Restart] pressed ──▶ clear [Accumulate (bounded push)]
```

Every second the latest temperature enters the list (until the field has a value, the [Store (set · get)](core.store) sends `null`, which enters the list too) and the [Lines](charts.line) chart shows the last minute. The [Button](ui.button) starts again from zero.

### 3. Collecting the items of a round, starting from zero

```
[Button: Count] pressed ──▶ clear [Accumulate (bounded push)]
                pressed ──▶ start [For each] item ──▶ add [Accumulate (bounded push): max 1000] count ──▶ value [Value]
```

(The Button is linked to two inputs.) At every click the Accumulate (bounded push) block is emptied and then receives the items of the round of [For each](coll.forEach): the clearing always comes first, because the Button sends it right away, while the items only start when For each runs. The Value goes to 0, then counts 1, 2, 3… up to the length of the list. Do not link **done** to **clear**: the list would be emptied as soon as it is collected.

## Errors

This block has no errors of its own.

## See also

- [Push · Unshift](coll.add) if you already have the list
- [Slice](coll.slice), [Sum · Min · Max · Avg](coll.stat), [Get list[i]](coll.get) (index -1 for the last)
- [Store (set · get)](core.store) to keep a single value
- [How a block works](ide/blocks)
