# Counter (++ −−)

`core.counter` · Math · [Core blocks](logicstudio-core) · version 1

Keeps a number that goes up by a step at every pulse on **up**, goes down at every pulse on **down** and goes back to the starting value with **reset**.

## Inputs

| Port | Type | Description |
|---|---|---|
| **up** (`up`) | pulse | Adds the **Step** to the count. |
| **down** (`down`) | pulse | Takes the **Step** away from the count. |
| **reset** (`reset`) | pulse | Brings the count back to **Start from**. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **count** (`count`) | number | The count, after every pulse. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Step** (`step`) | a number (also with decimals or negative) | 1 | By how much the count goes up or down at every pulse. |
| **Start from** (`from`) | a number | 0 | The count at start and after **reset**. |

## How it works

When the program starts, the count is **Start from**, but the block **does not send it**: the first value comes out at the first pulse.

At every pulse the block changes the count and sends it on **count**:

| Arrives on | New count |
|---|---|
| **up** | count + Step |
| **down** | count − Step |
| **reset** | Start from (and it sends it) |

Things to know:

- All that matters is **that** something arrives, not **what**: even `false` or `0` on **up** make the count go up.
- There is no limit: the count can go below zero and up as far as you like. To keep it between two values, put a [Clamp](core.clamp) after it (which, however, limits only what comes out, not the internal count).
- With a **Step** with decimals, small gaps build up: starting from 10 with step 0.1, after four **up** the count is 10.399999999999999. Round with [Math functions](core.math) before showing it.
- With a negative **Step**, **up** makes it go down and **down** makes it go up.
- If you leave the **Step** empty, it is 0 (the count does not change). If you leave **Start from** empty, at the beginning the count is empty and the first **up** gives the Step.
- The count starts again from **Start from** at every start of the program: it is not saved.
- Do not remove "starts it" from the inputs: an input without "starts it" does nothing any more.

## Examples

### 1. Count the clicks

```
[Button: +1]    pressed ──▶ up    [Counter (++ −−)] count ──▶ value [Value: clicks]
[Button: −1]    pressed ──▶ down
[Button: Reset] pressed ──▶ reset
```

Three clicks on **+1**: the [Value](ui.value) component shows 1, 2, 3. One click on **−1**: 2. **Reset**: 0. Until the first click, the component shows its "empty" text (`—` by default).

### 2. A countdown

Step 1, Start from 10. Link [Interval (setInterval)](core.every) (1 second) to **down**: the block sends 9, 8, 7… one number a second, and goes on below zero (−1, −2…). To stop it at 0, use a [Compare (== != < >)](core.compare) `a ≤ b` with **b** = 0 and send the result, flipped with [NOT](core.not), to the **on** input of Every….

### 3. An index that moves by 5

Step 5, Start from 100: **up**, **up**, **down** → 105, 110, 105.

## Errors

This block has no errors of its own.

## See also

- [On change (edge)](core.edge) to count the changes of a yes/no
- [Store (set · get)](core.store) to keep any value
- [Add (+)](core.add) to add numbers that arrive
- [Range](coll.range) for a list of numbers in a row
- [How a block works](ide/blocks)
