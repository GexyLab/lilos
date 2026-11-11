# Earth rotation rate · ω⊕

`const.omegaEarth` · Astronomical constants · [Constants](logicstudio-constants) · version 1

Sends the value of **Earth rotation rate** (ω⊕): `0.00007292115` rad/s, exact. The value comes from the **IAU** definitions and nominal values (2012 and 2015), the WGS 84 and GRS 80 models for the Earth and the CGPM (1901) for standard gravity.

## Inputs

| Port | Type | Description |
|---|---|---|
| **send** (`send`) | pulse | Hidden by default: to link it, show it with the **eye** next to the port in **Properties**. If linked, the value goes out **only** at each pulse that arrives here (what arrives does not matter, even `false` or `0`). If not linked, the value goes out once at the start of the schema. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value: `0.00007292115`. |
| **symbol** (`symbol`) | text | Hidden by default. The symbol: `ω⊕`. |
| **unit** (`unit`) | text | Hidden by default. The SI unit of the value: `rad/s`. |
| **uncertainty** (`uncertainty`) | number | Hidden by default. The standard uncertainty, in the same unit as the value: `0` (exact). |
| **Exception** (`error`) | object | It sends none: the value is fixed and the block has no settings. |

## How it works

| send | What it does |
|---|---|
| not linked | Sends the value once, at the start of the schema, on all the outputs. |
| linked | Sends the value at each pulse on **send**, never at the start. |

The block sends **value** first, then the other outputs. Hidden outputs send their value anyway: show them with the **eye** in **Properties** to link them.

The value is a double-precision number, like all the numbers in Logic Studio and JavaScript: it has 15-17 significant digits, and a calculation can give a result slightly different from the exact one. To show it rounded use [Template string](core.format) or [Math functions](core.math) (`round`).

**Note.** It is the rotation rate of the GRS 80 model.

For the general rules (hidden inputs, Exception) see [How a block works](ide/blocks).

## Examples

### 1. The value at the start

```
[Earth rotation rate · ω⊕] value ──▶ value [Print (console.log)]
```

At the start of the schema the last line of the console is `0.00007292115`.

### 2. At each click, with the symbol and the unit

```
[Button] pressed ──▶ send [Earth rotation rate · ω⊕] value  ──▶ v [Template string: {s} = {v} {un}] text ──▶ value [Print (console.log)]
                                                     symbol ──▶ s
                                                     unit   ──▶ un
```

Show with the **eye** the input **send** and the outputs **symbol** and **unit**, and add to the [Template string](core.format) the inputs `s`, `v` and `un`. Nothing goes out at the start; at each click on the button the last line of the console is `ω⊕ = 0.00007292115 rad/s`.

## See also

- The other constants of the group "The Earth": [Earth mass parameter · GM⊕](const.GMearth), [Earth mass · M⊕](const.Mearth), [Earth equatorial radius · Rₑ⊕](const.ReEarth), [Earth polar radius · Rₚ⊕](const.RpEarth), [Earth mean radius · R⊕](const.RmEarth), [Standard acceleration of gravity · gₙ](const.gn)
- [Constants](logicstudio-constants): the list of all the constants, [Constant · Variable](core.value) for any number
- [How a block works](ide/blocks)
