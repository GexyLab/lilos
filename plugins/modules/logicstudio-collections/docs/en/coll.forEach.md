# For each

`coll.forEach` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Sends the items of a list one at a time, with their position, and at the end a **done** pulse.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The list to go through. When it arrives, it is only kept: it does not start the round. |
| **start** (`start`) | pulse | Starts the round on the latest list that arrived. Any value that arrives here counts as a pulse. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **item** (`item`) | any | Each item of the list, one after the other. |
| **index** (`index`) | number | The position of the item just sent: 0, 1, 2… |
| **done** (`done`) | pulse | A pulse when all the items have been sent. |
| **Exception** (`error`) | object | The list is missing, or it is not a list. |

## How it works

The block **starts only with a pulse on start**. A value on **list** is remembered, but does nothing by itself (even if in the Properties the input "starts it").

When the pulse arrives:

1. if no list has arrived yet, the output is «Manca la lista» ("The list is missing"); if the value is not a list, «Serve una lista» ("A list is needed");
2. for each item, in order, the block first sends the **item** and right after its **index**;
3. after the last one it sends **done**.

All this happens **in one go**: the block does not wait for the linked blocks to finish with one item before sending the next. Each linked block receives the values in a queue and handles them one at a time, in the right order.

- With an empty list nothing comes out on **item** and **index**, but **done** comes out right away.
- `null` items are sent like all the others.
- A second pulse makes another full round, on the latest list that arrived.
- The round uses the list as it was at the moment of the pulse.

### Item and index in the same block

If you link **item** and **index** to two inputs of the same block, mind the order: **item arrives before index**. If both inputs "start it", the block runs twice per item, and the first time with the index **of the previous item**.

Remove "starts it" from the input that receives **item** and leave it on the one that receives **index**: the block runs once per item, with the right pair. Example checked with the list `[10, 20, 30]`, **item** on **a** and **index** on **b** of an [Add (+)](core.add):

| "starts it" | Results |
|---|---|
| on **a** and **b** | 10, 10, 20, 21, 31, 32 |
| only on **b** | 10, 21, 32 |

**Do not put blocks in the middle on only one of the two paths.** The items all start together: if the **index** goes first through another block (for example an Add (+) block to count from 1) and the **item** does not, when the first index arrives the destination block has already received **all** the items and uses the last one. With `["Anna","Bruno","Carla"]` you would get `1. Carla`, `2. Carla`, `3. Carla`. If you need to transform the index or the item, do it after the block that brings them together, on its result.

### When "done" arrives

**done** goes out after all the items have been **sent**, not after the linked blocks have **handled** them. A block that receives the items and also **done** (on the same input or on another) receives them in order, with **done** last. But if **done** goes to a different block, that block may work before the others have finished: for example, a [Print (console.log)](core.consoleWrite) linked to **done** may write before another one that writes the items.

If you need a result on the whole list (sum, filter, extracted values…), it is simpler and safer to use the blocks that work on the whole list: [Sum · Min · Max · Avg](coll.stat), [Filter](coll.filter), [Map field](coll.pluck).

### List and pulse at start

If **list** and **start** both arrive when the program starts (for example from a [Constant · Variable](core.value) and from an [On start (main)](core.onStart)), **the order is not guaranteed**: it depends on the order in which the blocks were put in the schema. If the pulse arrives first, the output is «Manca la lista». To be sure:

- link the **same** Constant · Variable block to both **list** and **start**, making the link to **list** first: the block sends the list to the two inputs in the order in which you made the links;
- or start the round from a later action (a [Button](ui.button)), or pass the pulse through a [Delay (setTimeout)](core.delay).

### Limits

Each item makes the linked blocks work: with long lists you quickly reach the program's limit of runs (by default 10000 every 10 seconds, see [Limits](logicstudio-engine/limits)). For example, 6000 items sent to two blocks make at least 12000 runs and the program stops with «Troppe esecuzioni: più di 10000 in 10 secondi (un ciclo di collegamenti?)» ("Too many runs: more than 10000 in 10 seconds (a loop of links?)"). For long lists use the blocks that work on the whole list.

## Examples

### 1. Writing each item

```
[Constant · Variable (JSON): ["Anna","Bruno","Carla"]] value ──▶ list [For each] item ──▶ value [Print (console.log)]
                                          value ──▶ start
```

Make the link to **list** first, then the one to **start**. The console writes `Anna`, `Bruno`, `Carla`, one per line.

### 2. Numbering the lines

```
[For each] item  ──▶ nome [Template string: {i}: {nome}] text ──▶ value [Print (console.log)]
           index ──▶ i
```

In [Template string](core.format) add the placeholders **nome** and **i**, and remove "starts it" from **nome**. With `["Anna","Bruno","Carla"]` the console writes `0: Anna`, `1: Bruno`, `2: Carla`. Indexes start at 0. Do not try to count from 1 by putting an [Add (+)](core.add) only on the index path: because of the warning in "Item and index in the same block", you would end up with the wrong name.

### 3. Empty list

With the list `[]` and a pulse on **start**, nothing comes out on **item** and **index**; **done** comes out right away.

### 4. Without a list

A pulse on **start** before a list has arrived gives, in the main console, «For each: Manca la lista» ("For each: The list is missing").

## Errors

| Message | When |
|---|---|
| Manca la lista (The list is missing) | The pulse arrived on **start** but nothing ever arrived on **list**. |
| Serve una lista (A list is needed) | The value on **list** is not a list. |

## See also

- [Range](coll.range) to repeat something N times
- [Accumulate (bounded push)](coll.accumulate) to collect the values into a list again
- [Sum · Min · Max · Avg](coll.stat), [Filter](coll.filter), [Map field](coll.pluck)
- [Sequence (then)](core.sequence), [Delay (setTimeout)](core.delay)
- [How a block works](ide/blocks), [Limits](logicstudio-engine/limits)
