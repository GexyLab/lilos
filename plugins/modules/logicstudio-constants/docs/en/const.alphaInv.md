# Inverse fine-structure constant · 1/α

`const.alphaInv` · Physical constants · [Constants](logicstudio-constants) · version 1

Sends the value of **Inverse fine-structure constant** (1/α): `137.035999177`, with standard uncertainty `2.1e-8`. The value is the **CODATA 2022** recommended one (published by NIST in 2024).

## Inputs

| Port | Type | Description |
|---|---|---|
| **send** (`send`) | pulse | Hidden by default: to link it, show it with the **eye** next to the port in **Properties**. If linked, the value goes out **only** at each pulse that arrives here (what arrives does not matter, even `false` or `0`). If not linked, the value goes out once at the start of the schema. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value: `137.035999177`. |
| **symbol** (`symbol`) | text | Hidden by default. The symbol: `1/α`. |
| **unit** (`unit`) | text | Hidden by default. The SI unit of the value: empty text: it is a pure number. |
| **uncertainty** (`uncertainty`) | number | Hidden by default. The standard uncertainty, in the same unit as the value: `2.1e-8`. |
| **Exception** (`error`) | object | It sends none: the value is fixed and the block has no settings. |

## How it works

| send | What it does |
|---|---|
| not linked | Sends the value once, at the start of the schema, on all the outputs. |
| linked | Sends the value at each pulse on **send**, never at the start. |

The block sends **value** first, then the other outputs. Hidden outputs send their value anyway: show them with the **eye** in **Properties** to link them.

The value is a double-precision number, like all the numbers in Logic Studio and JavaScript: it has 15-17 significant digits, and a calculation can give a result slightly different from the exact one. To show it rounded use [Template string](core.format) or [Math functions](core.math) (`round`).

For the general rules (hidden inputs, Exception) see [How a block works](ide/blocks).

## Examples

### 1. The value at the start

```
[Inverse fine-structure constant · 1/α] value ──▶ value [Print (console.log)]
```

At the start of the schema the last line of the console is `137.035999177`.

### 2. At each click, with the symbol

```
[Button] pressed ──▶ send [Inverse fine-structure constant · 1/α] value  ──▶ v [Template string: {s} = {v}] text ──▶ value [Print (console.log)]
                                                                  symbol ──▶ s
```

Show with the **eye** the input **send** and the output **symbol**, and add to the [Template string](core.format) the inputs `s` and `v`. Nothing goes out at the start; at each click on the button the last line of the console is `1/α = 137.035999177`.

## See also

- The other constants of the group "Atomic and nuclear": [Fine-structure constant · α](const.alpha), [Rydberg constant · R∞](const.Rinf), [Bohr radius · a₀](const.a0), [Hartree energy · Eh](const.Eh), [Electron mass · mₑ](const.me), [Proton mass · mₚ](const.mp), [Neutron mass · mₙ](const.mn), [Muon mass · mμ](const.mmu), [Proton-electron mass ratio · mₚ/mₑ](const.mpme), [Atomic mass constant (dalton) · u](const.u), [Classical electron radius · rₑ](const.re), [Compton wavelength · λC](const.lambdaC), [Electronvolt · eV](const.eV)
- [Constants](logicstudio-constants): the list of all the constants, [Constant · Variable](core.value) for any number
- [How a block works](ide/blocks)
