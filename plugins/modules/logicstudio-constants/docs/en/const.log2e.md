# Base-2 log of e (Math.LOG2E) · log₂ e

`const.log2e` · Math constants · [Constants](logicstudio-constants) · version 1

Sends the value of **Base-2 log of e (Math.LOG2E)** (log₂ e): `1.4426950408889634`. The value is the double-precision number closest to the true value.

## Inputs

| Port | Type | Description |
|---|---|---|
| **send** (`send`) | pulse | Hidden by default: to link it, show it with the **eye** next to the port in **Properties**. If linked, the value goes out **only** at each pulse that arrives here (what arrives does not matter, even `false` or `0`). If not linked, the value goes out once at the start of the schema. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value: `1.4426950408889634`. |
| **symbol** (`symbol`) | text | Hidden by default. The symbol: `log₂ e`. |
| **Exception** (`error`) | object | It sends none: the value is fixed and the block has no settings. |

## How it works

| send | What it does |
|---|---|
| not linked | Sends the value once, at the start of the schema, on all the outputs. |
| linked | Sends the value at each pulse on **send**, never at the start. |

The block sends **value** first, then the other outputs. Hidden outputs send their value anyway: show them with the **eye** in **Properties** to link them.

The value is a double-precision number, like all the numbers in Logic Studio and JavaScript: it has 15-17 significant digits, and a calculation can give a result slightly different from the exact one. To show it rounded use [Template string](core.format) or [Math functions](core.math) (`round`).

**Note.** It is exactly the JavaScript constant.

For the general rules (hidden inputs, Exception) see [How a block works](ide/blocks).

## Examples

### 1. The value at the start

```
[Base-2 log of e (Math.LOG2E) · log₂ e] value ──▶ value [Print (console.log)]
```

At the start of the schema the last line of the console is `1.4426950408889634`.

### 2. At each click, with the symbol

```
[Button] pressed ──▶ send [Base-2 log of e (Math.LOG2E) · log₂ e] value  ──▶ v [Template string: {s} = {v}] text ──▶ value [Print (console.log)]
                                                                  symbol ──▶ s
```

Show with the **eye** the input **send** and the output **symbol**, and add to the [Template string](core.format) the inputs `s` and `v`. Nothing goes out at the start; at each click on the button the last line of the console is `log₂ e = 1.4426950408889634`.

## See also

- The other constants of the group "Classic constants": [Pi (Math.PI) · π](const.pi), [Tau (2π) · τ](const.tau), [Euler's number (Math.E) · e](const.e), [Golden ratio · φ](const.phi), [Silver ratio (1 + √2) · δS](const.silver), [Plastic number · ρ](const.plastic), [Square root of 2 (Math.SQRT2) · √2](const.sqrt2), [Square root of 1/2 (Math.SQRT1_2) · √½](const.sqrtHalf), [Square root of 3 · √3](const.sqrt3), [Natural log of 2 (Math.LN2) · ln 2](const.ln2), [Natural log of 10 (Math.LN10) · ln 10](const.ln10), [Base-10 log of e (Math.LOG10E) · log₁₀ e](const.log10e), [One degree in radians (π/180) · °](const.deg)
- [Constants](logicstudio-constants): the list of all the constants, [Constant · Variable](core.value) for any number
- [How a block works](ide/blocks)
