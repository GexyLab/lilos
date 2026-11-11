# OR

`core.or` · Logic · [Core blocks](logicstudio-core) · version 1

Sends **yes** if at least one of the inputs that have a value is **yes**.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** | yes/no | The first condition. |
| **b** | yes/no | The second condition. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | yes/no | **yes** if at least one input with a value is yes, otherwise **no**. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## Added ports

In the **Properties**, **Ports** section, you can add up to 16 more inputs (fewer, if an administrator has lowered the limit of added ports), of type yes/no, named with the following letters: **c**, **d**, **e**… up to **r**. They show in italics on the block. See [How a block works](ide/blocks).

## How it works

Every time a value arrives on an input, the block does the count again with the last value of each input and sends the result on **result**, even if it has not changed.

- Inputs that have not received anything yet do not count: with only **a** = no the result is **no**.
- Every value is read as yes/no:
  - a text is **no** if, once spaces are removed and ignoring case, it is empty, `0`, `false`, `no` or `off`; any other text is **yes** (even `"falso"`);
  - a number is **no** if it is 0, **yes** otherwise;
  - `null` is **no**; objects and lists are **yes**, even empty.

| a | b | result |
|---|---|---|
| yes | yes | yes |
| yes | no | yes |
| no | yes | yes |
| no | no | no |

## Examples

### 1. An alarm from two sensors

```
[Compare: smoke > 50]        result ──▶ a  [OR] result ──▶ on [Lamp: alarm]
[Compare: temperature > 60]  result ──▶ b
```

The [Lamp](ui.lamp) turns on if there is too much smoke **or** it is too hot. With smoke 10 and temperature 70 the result is **yes**; when the temperature goes back to 40 it becomes **no**.

### 2. Several buttons that do the same thing

With three emergency buttons, add the input **c**. Each button sends a pulse (which counts as **yes**): every time one is pressed, the block sends **yes**.

```
[Button: Stop 1] pressed ──▶ a  [OR] result ──▶ value [Write to console]
[Button: Stop 2] pressed ──▶ b
[Button: Stop 3] pressed ──▶ c
```

> To simply let every pulse through, without calculating anything, [First to arrive](core.merge) is a better fit.

### 3. Numbers and texts

**a** = `0`, **b** = `""` → **no**. **a** = `0`, **b** = `"ok"` → **yes**. **a** = `null` → **no**.

## Errors

This block has no errors of its own.

## See also

- [AND](core.and), [XOR](core.xor), [NOT](core.not)
- [Compare](core.compare)
- [How a block works](ide/blocks)
