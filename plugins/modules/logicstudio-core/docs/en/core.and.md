# AND

`core.and` · Logic · [Core blocks](logicstudio-core) · version 1

Sends **yes** only if all the inputs that have a value are **yes**.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** | yes/no | The first condition. |
| **b** | yes/no | The second condition. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | yes/no | **yes** if all the inputs with a value are yes, otherwise **no**. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## Added ports

In the **Properties**, **Ports** section, you can add up to 16 more inputs (fewer, if an administrator has lowered the limit of added ports), of type yes/no, named with the following letters: **c**, **d**, **e**… up to **r**. They show in italics on the block. See [How a block works](ide/blocks).

## How it works

Every time a value arrives on an input, the block does the count again with the last value of each input and sends the result on **result**. It always sends it, even if it has not changed.

- Inputs that have not received anything yet **do not count**: with only **a** = yes the result is **yes**, even if **b** never arrived. If you want a missing input to count as **no**, give it the initial value `false` in the **Properties**.
- Every value is read as yes/no:
  - a text is **no** if, once spaces are removed and ignoring case, it is empty, `0`, `false`, `no` or `off`; any other text is **yes** (even `"falso"`);
  - a number is **no** if it is 0, **yes** otherwise;
  - `null` is **no**; objects and lists are **yes**, even empty.

| a | b | result |
|---|---|---|
| yes | yes | yes |
| yes | no | no |
| no | yes | no |
| no | no | no |
| yes | (never arrived) | yes |

## Examples

### 1. Two conditions together

```
[Switch: on]          value ──▶ a  [AND] result ──▶ on [Interval (setInterval): 1 s]
[Checkbox: armed]     value ──▶ b
```

The [Interval (setInterval)](core.every) block sends pulses only when the [Switch](ui.toggle) is on **and** the [Checkbox](ui.checkbox) is checked. Remove **Starts on its own** in the settings of Every…, so it does not start before the result arrives. Give **b** the initial value `false`: this way, if the user turns on only the switch, the result stays **no**.

### 2. Three checks with an added input

Add the input **c** and link three [Compare (== != < >)](core.compare) blocks:

```
[Compare (== != < >): temperature < 30] result ──▶ a  [AND] result ──▶ condition [If · Else]
[Compare (== != < >): humidity < 70]    result ──▶ b
[Compare (== != < >): wind < 40]        result ──▶ c
```

With temperature 25, humidity 80 and wind 10, the result is **no** (the humidity is not right). When the humidity drops to 60, the block sends **yes**.

### 3. Values that are not yes/no

**a** = `1`, **b** = `"on"` → **yes**. **a** = `1`, **b** = `"off"` → **no**. **a** = `"falso"`, **b** = `true` → **yes** (the word `falso` is not recognized).

## Errors

This block has no errors of its own.

## See also

- [OR](core.or), [XOR](core.xor), [NOT](core.not)
- [Compare (== != < >)](core.compare) to get a yes/no from two values
- [If · Else](core.if) to choose a path with a yes/no
- [How a block works](ide/blocks)
