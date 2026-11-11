# Await all (join)

`core.join` · Logic · [Core blocks](logicstudio-core) · version 1

Waits for something to arrive on **all** its added inputs, in any order; when all have arrived, it sends a pulse on **ready** and starts waiting again.

## Inputs

| Port | Type | Description |
|---|---|---|
| **reset** (`reset`) | pulse | Forgets the inputs that have already arrived: you start again from scratch. |
| (the added inputs) | pulse | The events to wait for. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **ready** (`ready`) | pulse | A pulse when something has arrived on every added input. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## Added ports

The block starts with only **reset**: add the inputs to wait for in the **Properties**, **Ports** section, with **Add input**. You can have up to 16 (fewer, if an administrator has lowered the limit of added ports), of type pulse, named **a**, **b**, **c**… They show in italics on the block. See [How a block works](ide/blocks).

## How it works

The block keeps track of which added inputs have already received something since it started waiting again.

1. Something arrives on an added input: the block marks it as arrived. If **all** have now arrived, it sends a pulse on **ready** and forgets everything (it starts waiting again).
2. Something arrives on **reset**: it forgets the inputs that have already arrived, without sending anything.

Things to know:

- All that matters is **that** something arrives, not **what**: even `false`, `0` or `null` count as arrived.
- An input that receives twice before the others arrive counts **only once**: nothing is accumulated for the next round.
- Without added inputs the block never sends **ready**.
- If you remove "starts it" from an added input, that input is never marked as arrived and **ready** never goes off again. Leave them all with "starts it".
- The values that arrive are not sent again: **ready** is just a pulse. If you need the values, take them from a [Store (set · get)](core.store) block or keep them in the inputs (with "starts it" removed) of the block that starts with **ready**.

## Examples

### 1. Start when two readings are done

```
[readFile: a.txt] content ──▶ a [Await all (join)] ready ──▶ send [Notify: Data ready]
[readFile: b.txt] content ──▶ b
```

The two readings finish in any order. The [Notify](lilos.notify) goes off only when both are finished.

### 2. One step after the other, then again

Inputs **a**, **b**, **c**. They arrive, in order: **a**, **a**, **b**, **c** → after **c**, **ready** goes off (the second **a** does not count twice). Then **b** and **c** arrive → nothing. Then **a** → **ready** goes off again.

### 3. Cancel a wait

```
[Button: Cancel] pressed ──▶ reset [Await all (join)]
```

If **a** has arrived but **b** has not, and the user presses **Cancel**, the block forgets **a**: for **ready** to go off, both **a** and **b** must arrive again.

## Errors

This block has no errors of its own.

## See also

- [Merge](core.merge) to let every value through without waiting
- [Sequence (then)](core.sequence) to start several things in an order
- [AND](core.and) to send yes only when several conditions are yes
- [How a block works](ide/blocks)
