# Add (+)

`core.add` · Math · [Core blocks](logicstudio-core) · version 1

Adds two or more numbers and sends the total.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** | number | The first addend. |
| **b** | number | The second addend. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | number | The sum of the inputs that have a value. |
| **Exception** (`error`) | object | When an input is not a number. |

## Added ports

In the **Properties**, **Ports** section, you can add up to 16 more inputs (fewer, if an administrator has lowered the limit of added ports), of type number, named with the following letters: **c**, **d**, **e**… up to **r**. They show in italics on the block. See [How a block works](ide/blocks).

## How it works

Every time a value arrives on an input, the Add (+) block recalculates the total with the last value of each input and sends it on **result**.

- Inputs that have not received anything yet do not count: with only **a** = 5 the result is 5.
- Values are converted to numbers:

| Value | Counts as |
|---|---|
| a number | itself |
| `true` / `false` (also a pulse) | 1 / 0 |
| `"2,5"`, `"2.5"`, `" 2.5 "` | 2.5 (the **first** comma counts as a dot; spaces at the sides do not count) |
| `"1e3"` / `"0x10"` | 1000 / 16 |
| `""` (empty text or only spaces) | 0 |
| `null` | 0 |
| `[]` / `[5]` | 0 / 5 |
| `[1,2]` | 1,2 (a list is read as text, with the items separated by commas) |
| `"ciao"`, `"12 kg"`, `"1.234,5"`, an object | not a number: error |

- If even a single value cannot be converted, the block sends nothing on **result** and sends the message «Serve un numero» ("A number is needed") on **Exception**.
- Calculations use the decimal numbers of the computer, which sometimes give results like 0.1 + 0.2 = 0.30000000000000004. To show them, round them with [Math functions](core.math).
- `"Infinity"` is infinity, and infinity plus any number stays infinity.

## Examples

### 1. Two fixed numbers

```
[Constant · Variable: 2] value ──▶ a  [Add (+)] result ──▶ value [Print (console.log)]
[Constant · Variable: 3] value ──▶ b
```

At start the two [Constant · Variable](core.value) blocks send 2 and 3. The Add (+) block runs twice: first it writes 2 (only **a**), then 5.

> If you only want the final total, remove "starts it" from the input **a**: the Add (+) block will run only when **b** arrives. It works if **a** arrives before **b**; if **b** arrived first, the Add (+) block would run with **b** alone (3). Alternatively, give **a** the initial value `2` instead of using a [Constant · Variable](core.value) block.

### 2. A total from three fields of a window

Add the input **c** in the Properties and link the objects of three [Number field](ui.number) components:

```
[Number field: first quarter]  value ──▶ a  [Add (+)] result ──▶ value [Value: total]
[Number field: second quarter] value ──▶ b
[Number field: third quarter]  value ──▶ c
```

Every time the user changes a field, the total shown by the [Value](ui.value) component is updated. With 100, 250 and 80 the total is 430. If the user has filled in only the first two, the total is 350.

### 3. Mixed values

**a** = `"2,5"` (text), **b** = `true` → result 3.5. **a** = `"2,5"`, **b** = `"tre"` → no result, and the Exception receives «Serve un numero».

## Errors

| Message | When |
|---|---|
| Serve un numero ("A number is needed") | An input has a value that cannot be converted to a number. |

## See also

- [Subtract (−)](core.subtract), [Multiply (×)](core.multiply), [Divide (÷ %)](core.divide)
- [Min · Max · Avg](core.stat) for average, minimum and maximum
- [Counter (++ −−)](core.counter) for a total that goes up one step at a time
- [Sum · Min · Max · Avg](coll.stat) to add the items of a list
- [How a block works](ide/blocks)
