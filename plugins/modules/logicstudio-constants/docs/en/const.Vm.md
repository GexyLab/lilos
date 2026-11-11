# Molar volume of ideal gas (0 °C, 1 atm) · Vm

`const.Vm` · Physical constants · [Constants](logicstudio-constants) · version 1

Sends the value of **Molar volume of ideal gas (0 °C, 1 atm)** (Vm): `0.022413969545014137` m³/mol, exact. The value is the **CODATA 2022** recommended one (published by NIST in 2024).

## Inputs

| Port | Type | Description |
|---|---|---|
| **send** (`send`) | pulse | Hidden by default: to link it, show it with the **eye** next to the port in **Properties**. If linked, the value goes out **only** at each pulse that arrives here (what arrives does not matter, even `false` or `0`). If not linked, the value goes out once at the start of the schema. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value: `0.022413969545014137`. |
| **symbol** (`symbol`) | text | Hidden by default. The symbol: `Vm`. |
| **unit** (`unit`) | text | Hidden by default. The SI unit of the value: `m³/mol`. |
| **uncertainty** (`uncertainty`) | number | Hidden by default. The standard uncertainty, in the same unit as the value: `0` (exact). |
| **Exception** (`error`) | object | It sends none: the value is fixed and the block has no settings. |

## How it works

| send | What it does |
|---|---|
| not linked | Sends the value once, at the start of the schema, on all the outputs. |
| linked | Sends the value at each pulse on **send**, never at the start. |

The block sends **value** first, then the other outputs. Hidden outputs send their value anyway: show them with the **eye** in **Properties** to link them.

The value is a double-precision number, like all the numbers in Logic Studio and JavaScript: it has 15-17 significant digits, and a calculation can give a result slightly different from the exact one. To show it rounded use [Template string](core.format) or [Math functions](core.math) (`round`).

**Note.** It is exact because it is computed from the 7 defining constants of the SI alone, with numbers and π: the block uses the same formula, so the last digits may come from the rounding of double-precision numbers.

For the general rules (hidden inputs, Exception) see [How a block works](ide/blocks).

## Examples

### 1. The value at the start

```
[Molar volume of ideal gas (0 °C, 1 atm) · Vm] value ──▶ value [Print (console.log)]
```

At the start of the schema the last line of the console is `0.022413969545014137`.

### 2. At each click, with the symbol and the unit

```
[Button] pressed ──▶ send [Molar volume of ideal gas (0 °C, 1 atm) · Vm] value  ──▶ v [Template string: {s} = {v} {un}] text ──▶ value [Print (console.log)]
                                                                         symbol ──▶ s
                                                                         unit   ──▶ un
```

Show with the **eye** the input **send** and the outputs **symbol** and **unit**, and add to the [Template string](core.format) the inputs `s`, `v` and `un`. Nothing goes out at the start; at each click on the button the last line of the console is `Vm = 0.022413969545014137 m³/mol`.

## See also

- The other constants of the group "Physico-chemical": [Molar gas constant · R](const.R), [Faraday constant · F](const.F), [Stefan–Boltzmann constant · σ](const.sigma), [Wien wavelength displacement constant · b](const.b), [Loschmidt constant (0 °C, 1 atm) · n₀](const.n0), [Standard atmosphere · atm](const.atm), [Zero Celsius in kelvin · T₀](const.T0)
- [Constants](logicstudio-constants): the list of all the constants, [Constant · Variable](core.value) for any number
- [How a block works](ide/blocks)
