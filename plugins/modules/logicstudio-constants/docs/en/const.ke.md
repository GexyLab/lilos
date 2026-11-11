# Coulomb constant (1/4πε₀) · kₑ

`const.ke` · Physical constants · [Constants](logicstudio-constants) · version 1

Sends the value of **Coulomb constant (1/4πε₀)** (kₑ): `8987551786.170797` N·m²/C², with standard uncertainty `1.4`. The value is the **CODATA 2022** recommended one (published by NIST in 2024).

## Inputs

| Port | Type | Description |
|---|---|---|
| **send** (`send`) | pulse | Hidden by default: to link it, show it with the **eye** next to the port in **Properties**. If linked, the value goes out **only** at each pulse that arrives here (what arrives does not matter, even `false` or `0`). If not linked, the value goes out once at the start of the schema. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value: `8987551786.170797`. |
| **symbol** (`symbol`) | text | Hidden by default. The symbol: `kₑ`. |
| **unit** (`unit`) | text | Hidden by default. The SI unit of the value: `N·m²/C²`. |
| **uncertainty** (`uncertainty`) | number | Hidden by default. The standard uncertainty, in the same unit as the value: `1.4`. |
| **Exception** (`error`) | object | It sends none: the value is fixed and the block has no settings. |

## How it works

| send | What it does |
|---|---|
| not linked | Sends the value once, at the start of the schema, on all the outputs. |
| linked | Sends the value at each pulse on **send**, never at the start. |

The block sends **value** first, then the other outputs. Hidden outputs send their value anyway: show them with the **eye** in **Properties** to link them.

The value is a double-precision number, like all the numbers in Logic Studio and JavaScript: it has 15-17 significant digits, and a calculation can give a result slightly different from the exact one. To show it rounded use [Template string](core.format) or [Math functions](core.math) (`round`).

**Note.** It is not in the CODATA list: the block computes it as 1/(4πε₀), and its uncertainty comes from that of ε₀.

For the general rules (hidden inputs, Exception) see [How a block works](ide/blocks).

## Examples

### 1. The value at the start

```
[Coulomb constant (1/4πε₀) · kₑ] value ──▶ value [Print (console.log)]
```

At the start of the schema the last line of the console is `8987551786.170797`.

### 2. At each click, with the symbol and the unit

```
[Button] pressed ──▶ send [Coulomb constant (1/4πε₀) · kₑ] value  ──▶ v [Template string: {s} = {v} {un}] text ──▶ value [Print (console.log)]
                                                           symbol ──▶ s
                                                           unit   ──▶ un
```

Show with the **eye** the input **send** and the outputs **symbol** and **unit**, and add to the [Template string](core.format) the inputs `s`, `v` and `un`. Nothing goes out at the start; at each click on the button the last line of the console is `kₑ = 8987551786.170797 N·m²/C²`.

## See also

- The other constants of the group "Electromagnetic": [Vacuum magnetic permeability · μ₀](const.mu0), [Vacuum electric permittivity · ε₀](const.eps0), [Characteristic impedance of vacuum · Z₀](const.Z0), [Magnetic flux quantum (h/2e) · Φ₀](const.Phi0), [Conductance quantum (2e²/h) · G₀](const.G0), [Josephson constant (2e/h) · Kᴊ](const.KJ), [von Klitzing constant (h/e²) · Rᴋ](const.RK), [Bohr magneton · μB](const.muB), [Nuclear magneton · μN](const.muN)
- [Constants](logicstudio-constants): the list of all the constants, [Constant · Variable](core.value) for any number
- [How a block works](ide/blocks)
