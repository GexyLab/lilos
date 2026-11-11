# Largest safe integer (Number.MAX_SAFE_INTEGER) · 2⁵³ − 1

`const.maxSafe` · Math constants · [Constants](logicstudio-constants) · version 1

Sends the value of **Largest safe integer (Number.MAX_SAFE_INTEGER)** (2⁵³ − 1): `9007199254740991`. The value is the double-precision number closest to the true value.

## Inputs

| Port | Type | Description |
|---|---|---|
| **send** (`send`) | pulse | Hidden by default: to link it, show it with the **eye** next to the port in **Properties**. If linked, the value goes out **only** at each pulse that arrives here (what arrives does not matter, even `false` or `0`). If not linked, the value goes out once at the start of the schema. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value: `9007199254740991`. |
| **symbol** (`symbol`) | text | Hidden by default. The symbol: `2⁵³ − 1`. |
| **Exception** (`error`) | object | It sends none: the value is fixed and the block has no settings. |

## How it works

| send | What it does |
|---|---|
| not linked | Sends the value once, at the start of the schema, on all the outputs. |
| linked | Sends the value at each pulse on **send**, never at the start. |

The block sends **value** first, then the other outputs. Hidden outputs send their value anyway: show them with the **eye** in **Properties** to link them.

The value is a double-precision number, like all the numbers in Logic Studio and JavaScript: it has 15-17 significant digits, and a calculation can give a result slightly different from the exact one. To show it rounded use [Template string](core.format) or [Math functions](core.math) (`round`).

**Note.** Beyond 2⁵³ − 1 not every integer can be represented (`9007199254740993` becomes `9007199254740992`).

For the general rules (hidden inputs, Exception) see [How a block works](ide/blocks).

## Examples

### 1. The value at the start

```
[Largest safe integer (Number.MAX_SAFE_INTEGER) · 2⁵³ − 1] value ──▶ value [Print (console.log)]
```

At the start of the schema the last line of the console is `9007199254740991`.

### 2. At each click, with the symbol

```
[Button] pressed ──▶ send [Largest safe integer (Number.MAX_SAFE_INTEGER) · 2⁵³ − 1] value  ──▶ v [Template string: {s} = {v}] text ──▶ value [Print (console.log)]
                                                                                     symbol ──▶ s
```

Show with the **eye** the input **send** and the output **symbol**, and add to the [Template string](core.format) the inputs `s` and `v`. Nothing goes out at the start; at each click on the button the last line of the console is `2⁵³ − 1 = 9007199254740991`.

## See also

- The other constants of the group "Number limits": [Machine epsilon (Number.EPSILON) · ε](const.epsilon), [Largest number (Number.MAX_VALUE) · max](const.maxValue), [Smallest positive number (Number.MIN_VALUE) · min](const.minValue)
- [Constants](logicstudio-constants): the list of all the constants, [Constant · Variable](core.value) for any number
- [How a block works](ide/blocks)
