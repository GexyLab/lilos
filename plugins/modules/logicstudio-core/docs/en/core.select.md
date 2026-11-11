# Pick by index (MUX)

`core.select` · Logic · [Core blocks](logicstudio-core) · version 1

Has several value inputs and lets only one through, the one given by a number on **which**: 1 for the first, 2 for the second…

## Inputs

| Port | Type | Description |
|---|---|---|
| **which** (`which`) | number | The position of the input to let through, among the added ones: 1 is the first. |
| (the added inputs) | any | The values to choose from. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The last value of the chosen input. |
| **Exception** (`error`) | object | When **which** does not point to an input that exists. |

## Added ports

The block starts with no inputs to choose from: add them in the **Properties**, **Ports** section, with **Add input**. You can have up to 16 (fewer, if an administrator has lowered the limit of added ports), of type any. They show in italics on the block; they can be moved up and down and removed.

**Watch the names.** The IDE names the added inputs with numbers that **start from 2**: **2**, **3**, **4**… (counting **which** too). But **which** counts the **position** among the added inputs, starting from 1:

| Added input (name on the block) | Chosen with **which** = |
|---|---|
| first (**2**) | 1 |
| second (**3**) | 2 |
| third (**4**) | 3 |

The position from the top is what counts, not the name: if you move or remove an input, the number used to choose it changes too. See [How a block works](ide/blocks).

## How it works

Every time something arrives on **which** **or on any of the added inputs**, the block:

1. reads **which** as a number (with the rules of [Add (+)](core.add): `"2"` is 2, `"2,0"` is 2) and drops the decimal part: 2.7 is 2, -1.5 is -1;
2. takes the added input in that position;
3. sends on **value** the last value that arrived on that input.

Edge cases:

- If the chosen input has not received anything yet, the block sends nothing (and gives no error).
- If **which** is 0, negative, larger than the number of inputs or not a number, the block sends on **Exception** «Non c'è l'ingresso …» ("There is no input …") with the value that arrived on **which** (for example `Non c'è l'ingresso 0`, `Non c'è l'ingresso abc`).
- If a value arrives on an added input when **which** has not arrived yet, the error is `Non c'è l'ingresso undefined`. To avoid it, give **which** an initial value (for example `1`).
- Every value that arrives on the chosen input goes through at once; values that arrive on the other inputs also restart the block, which **sends the value of the chosen input again**. If you do not want these repeated sends, remove "starts it" from the added inputs: the block will then start only when **which** changes.

## Examples

### 1. A language chosen with a number

Add three inputs and give them as initial values `"Ciao"`, `"Hello"`, `"Hola"` (in this order). Remove "starts it" from the three inputs.

```
[Number field: language] value ──▶ which [Pick by index (MUX)] value ──▶ text [Label: greeting]
```

If the user writes 1 in the [Number field](ui.number), the [Label](ui.label) shows `Ciao`; with 2 `Hello`; with 3 `Hola`; with 4 the Exception receives `Non c'è l'ingresso 4`.

### 2. A source chosen by a slider

```
[Sensor A] value ──▶ 2  [Pick by index (MUX)] value ──▶ value [Value: measure]
[Sensor B] value ──▶ 3
[Slider: 1-2] value ──▶ which
```

With the slider at 1 the measures of sensor A pass (the input named **2**); at 2 those of sensor B. Every new measure of the chosen sensor goes through at once; a new measure of the other sensor makes the last one of the chosen sensor go out again.

### 3. From yes/no to one of two values

A yes/no read as a number is 1 (yes) or 0 (no), and 0 is not a valid position. To choose between two values with a yes/no, use [If · Else](core.if) instead.

## Errors

| Message | When |
|---|---|
| Non c'è l'ingresso … ("There is no input …", with the value of **which**) | **which** does not point to an added input: 0, negative, too large, not a number or not arrived yet (`undefined`). |

## See also

- [Route by index (DEMUX)](core.route) for the opposite: one value towards one of many outputs
- [Switch · Case](core.switch) to choose with a value instead of a position
- [Merge](core.merge) to let through everything that arrives from several inputs
- [How a block works](ide/blocks)
