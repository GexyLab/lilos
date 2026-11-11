# XOR

`core.xor` · Logic · [Core blocks](logicstudio-core) · version 1

Sends **yes** if the inputs that are **yes** are an odd number: with two inputs, if only one of the two is yes.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** | yes/no | The first condition. |
| **b** | yes/no | The second condition. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | yes/no | **yes** if the number of inputs that are yes is odd, otherwise **no**. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## Added ports

In the **Properties**, **Ports** section, you can add up to 16 more inputs (fewer, if an administrator has lowered the limit of added ports), of type yes/no, named with the following letters: **c**, **d**, **e**… up to **r**. They show in italics on the block. See [How a block works](ide/blocks).

## How it works

Every time a value arrives on an input, the block counts how many inputs are **yes** (with the last value of each) and sends **yes** if they are 1, 3, 5…, **no** if they are 0, 2, 4…

- With **two** inputs it is the classic "one or the other, not both".
- With **three or more** inputs it does **not** mean "exactly one": with **a**, **b** and **c** all yes the result is **yes** (they are 3, odd). To know if there is exactly one, count them with an [Add](core.add) (yes is 1, no is 0) and check the total with a [Compare](core.compare) with operation `a = b` and initial value 1 on **b**.
- Inputs that have not received anything yet do not count.
- Every value is read as yes/no: a text is **no** if, once spaces are removed and ignoring case, it is empty, `0`, `false`, `no` or `off` (any other text is **yes**, even `"falso"`); a number is **no** if it is 0; `null` is **no**; objects and lists are **yes**.

| a | b | c | result |
|---|---|---|---|
| yes | no | — | yes |
| yes | yes | — | no |
| no | no | — | no |
| yes | yes | yes | yes |
| yes | yes | no | no |

## Examples

### 1. A light with two switches (two-way switch)

```
[Switch: downstairs] value ──▶ a  [XOR] result ──▶ on [Lamp: light]
[Switch: upstairs]   value ──▶ b
```

Like the stair lights: changing **either** of the two switches changes the state of the light. Both off: light off; one on: light on; both on: light off.

### 2. Two different values

With **a** = yes and **b** = no the result is **yes**: the two values are different. With two yes/no values, the XOR is **yes** exactly when they are different.

### 3. The parity check

With four inputs (add **c** and **d**): yes, no, yes, yes → three yes → **yes**; yes, yes, no, no → two yes → **no**.

## Errors

This block has no errors of its own.

## See also

- [AND](core.and), [OR](core.or), [NOT](core.not)
- [Edge](core.edge) to know when a yes/no changes
- [How a block works](ide/blocks)
