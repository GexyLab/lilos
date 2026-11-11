# Physical constants (CODATA)

`const.physics` · Values · [Constants](logicstudio-constants) · version 1

Gives the value of a fundamental physical constant, chosen in the settings, with its symbol, SI unit and uncertainty. The values are the **CODATA 2022** recommended ones (published by NIST in 2024): the 7 constants that have defined the International System since 2019 are **exact**, and so are those computed from them alone (ħ, R, F, σ…).

## Inputs

| Port | Type | Description |
|---|---|---|
| **send** (`send`) | pulse | Hidden by default: to link it, show it with the **eye** next to the port in **Properties**. If linked, the value goes out **only** at each pulse that arrives here (what arrives does not matter, even `false` or `0`). If not linked, the value goes out once at the start of the schema. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value of the chosen constant. |
| **symbol** (`symbol`) | text | Hidden by default. The symbol of the constant, as in the table below (for example `π`). |
| **unit** (`unit`) | text | Hidden by default. The SI unit of the value, as in the table below (for example `m/s`); an empty text for a pure number. |
| **uncertainty** (`uncertainty`) | number | Hidden by default. The standard uncertainty of the value, in the same unit; `0` for an exact constant. |
| **Exception** (`error`) | object | When the chosen constant does not exist in this version of the package (see **Errors**). |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Constant** (`constant`) | one of the constants in the table below | c · Speed of light in vacuum (`c`) | Which constant to send. In the menu each item shows the symbol and the name. |

## How it works

### When it sends the value

| send | What it does |
|---|---|
| not linked | Sends the value once, at the start of the schema, on all the outputs. |
| linked | Sends the value at each pulse on **send**, never at the start. |

The block sends **value** first, then the other outputs. Hidden outputs send their value anyway: show them with the **eye** in **Properties** to link them. Under the block's name, on the drawing, there is the **key** of the chosen constant (for example `c`): you find it in the last column of the tables.

The values are double-precision numbers, like all the numbers in Logic Studio and JavaScript: they have 15-17 significant digits. So a calculation can give a result slightly different from the exact one: for example the sine of 30° comes out as `0.49999999999999994`, not `0.5`. To show it rounded use [Math functions](core.math) (`round`) after a multiplication, or [Template string](core.format).

For any number that is not in the list use [Constant · Variable](core.value).

### Notes on the constants

- **Uncertainty**: it is the CODATA standard uncertainty, in the same unit as the value. For example G is `6.6743e-11` with uncertainty `1.5e-15`: also written 6.674 30(15) × 10⁻¹¹.
- The **exact** constants are the 7 of the SI and those that come from them with numbers and π only: ħ = h/2π, R = Nᴀ·k, F = Nᴀ·e, σ, Wien's b, Φ₀ = h/2e, G₀ = 2e²/h, Kᴊ = 2e/h, Rᴋ = h/e², the electronvolt, the molar volume and the Loschmidt constant at 0 °C and 1 atm. The block computes them with the same formulas, so the last digits may come from the rounding of double-precision numbers.
- **Standard atmosphere** and **zero Celsius in kelvin** are conventional values, exact by definition.
- The **Coulomb constant** kₑ = 1/(4πε₀) is not in the CODATA list: the block computes it from ε₀, and its uncertainty comes from that of ε₀.
- The **standard acceleration of gravity** gₙ is in [Astronomical and Earth constants](const.astro).

For the general rules (hidden inputs, Exception) see [How a block works](ide/blocks).

## The constants

### The 7 defining constants of the SI, and ħ

| Symbol | Constant | Value | Uncertainty | Unit | Key |
|---|---|---|---|---|---|
| c | Speed of light in vacuum | `299792458` | exact | m/s | `c` |
| h | Planck constant | `6.62607015e-34` | exact | J·s | `h` |
| ħ | Reduced Planck constant (h/2π) | `1.0545718176461565e-34` | exact | J·s | `hbar` |
| e | Elementary charge | `1.602176634e-19` | exact | C | `e` |
| k | Boltzmann constant | `1.380649e-23` | exact | J/K | `kB` |
| Nᴀ | Avogadro constant | `6.02214076e+23` | exact | mol⁻¹ | `NA` |
| ΔνCs | Caesium hyperfine frequency | `9192631770` | exact | Hz | `dnuCs` |
| Kcd | Luminous efficacy (540 THz) | `683` | exact | lm/W | `Kcd` |

### Gravitation and Planck units

| Symbol | Constant | Value | Uncertainty | Unit | Key |
|---|---|---|---|---|---|
| G | Newtonian constant of gravitation | `6.6743e-11` | `1.5e-15` | m³/(kg·s²) | `G` |
| lP | Planck length | `1.616255e-35` | `1.8e-40` | m | `planckLength` |
| mP | Planck mass | `2.176434e-8` | `2.4e-13` | kg | `planckMass` |
| tP | Planck time | `5.391247e-44` | `6e-49` | s | `planckTime` |
| TP | Planck temperature | `1.416784e+32` | `1.6e+27` | K | `planckTemp` |

### Electromagnetic

| Symbol | Constant | Value | Uncertainty | Unit | Key |
|---|---|---|---|---|---|
| μ₀ | Vacuum magnetic permeability | `0.00000125663706127` | `2e-16` | N/A² | `mu0` |
| ε₀ | Vacuum electric permittivity | `8.8541878188e-12` | `1.4e-21` | F/m | `eps0` |
| kₑ | Coulomb constant (1/4πε₀) | `8987551786.170797` | `1.4` | N·m²/C² | `ke` |
| Z₀ | Characteristic impedance of vacuum | `376.730313412` | `5.9e-8` | Ω | `Z0` |
| Φ₀ | Magnetic flux quantum (h/2e) | `2.0678338484619295e-15` | exact | Wb | `Phi0` |
| G₀ | Conductance quantum (2e²/h) | `0.00007748091729863649` | exact | S | `G0` |
| Kᴊ | Josephson constant (2e/h) | `483597848416983.6` | exact | Hz/V | `KJ` |
| Rᴋ | von Klitzing constant (h/e²) | `25812.807459304513` | exact | Ω | `RK` |
| μB | Bohr magneton | `9.2740100657e-24` | `2.9e-33` | J/T | `muB` |
| μN | Nuclear magneton | `5.0507837393e-27` | `1.6e-36` | J/T | `muN` |

### Atomic and nuclear

| Symbol | Constant | Value | Uncertainty | Unit | Key |
|---|---|---|---|---|---|
| α | Fine-structure constant | `0.0072973525643` | `1.1e-12` | — | `alpha` |
| 1/α | Inverse fine-structure constant | `137.035999177` | `2.1e-8` | — | `alphaInv` |
| R∞ | Rydberg constant | `10973731.568157` | `0.000012` | m⁻¹ | `Rinf` |
| a₀ | Bohr radius | `5.29177210544e-11` | `8.2e-21` | m | `a0` |
| Eh | Hartree energy | `4.359744722206e-18` | `4.8e-30` | J | `Eh` |
| mₑ | Electron mass | `9.1093837139e-31` | `2.8e-40` | kg | `me` |
| mₚ | Proton mass | `1.67262192595e-27` | `5.2e-37` | kg | `mp` |
| mₙ | Neutron mass | `1.67492750056e-27` | `8.5e-37` | kg | `mn` |
| mμ | Muon mass | `1.883531627e-28` | `4.2e-36` | kg | `mmu` |
| mₚ/mₑ | Proton-electron mass ratio | `1836.152673426` | `3.2e-8` | — | `mpme` |
| u | Atomic mass constant (dalton) | `1.66053906892e-27` | `5.2e-37` | kg | `u` |
| rₑ | Classical electron radius | `2.8179403205e-15` | `1.3e-24` | m | `re` |
| λC | Compton wavelength | `2.42631023538e-12` | `7.6e-22` | m | `lambdaC` |
| eV | Electronvolt | `1.602176634e-19` | exact | J | `eV` |

### Physico-chemical

| Symbol | Constant | Value | Uncertainty | Unit | Key |
|---|---|---|---|---|---|
| R | Molar gas constant | `8.31446261815324` | exact | J/(mol·K) | `R` |
| F | Faraday constant | `96485.33212331001` | exact | C/mol | `F` |
| σ | Stefan–Boltzmann constant | `5.6703744191844314e-8` | exact | W/(m²·K⁴) | `sigma` |
| b | Wien wavelength displacement constant | `0.002897771955` | exact | m·K | `b` |
| Vm | Molar volume of ideal gas (0 °C, 1 atm) | `0.022413969545014137` | exact | m³/mol | `Vm` |
| n₀ | Loschmidt constant (0 °C, 1 atm) | `2.686780111798444e+25` | exact | m⁻³ | `n0` |
| atm | Standard atmosphere | `101325` | exact | Pa | `atm` |
| T₀ | Zero Celsius in kelvin | `273.15` | exact | K | `T0` |

## Examples

### 1. The rest energy of the electron (E = mc²)

```
[Physical constants: me] value ──▶ a [Multiply (×)] result ──▶ value [Print (console.log)]
[Physical constants: c]  value ──▶ b
                         value ──▶ c (added input)
```

Add the input **c** to [Multiply (×)](core.multiply) in Properties and link the same speed-of-light block to it. The last line of the console is `8.187105787968451e-14` (joules).

### 2. Showing value, unit and uncertainty on demand

```
[Button: Show G] pressed ──▶ send [Physical constants: G] value       ──▶ v [Template string: G = {v} ± {u} {un}] text ──▶ value [Print (console.log)]
                                                         uncertainty ──▶ u
                                                         unit        ──▶ un
```

Show with the eye the input **send** and the outputs **uncertainty** and **unit**. Nothing goes out at the start; at each click the last line is `G = 6.6743e-11 ± 1.5e-15 m³/(kg·s²)`.

## Errors

| Message | When |
|---|---|
| Costante sconosciuta: `key` (Unknown constant) | The key saved in the schema is not one of this version of the package: the schema was made with a newer version, or the `.lsch` file was changed by hand. Choose the constant again in **Properties**. |

## See also

- [Math constants (Math.PI, Math.E…)](const.math), [Astronomical and Earth constants](const.astro)
- [Constant · Variable](core.value), [Multiply (×)](core.multiply)
- The CODATA values: https://physics.nist.gov/cuu/Constants/
- [How a block works](ide/blocks)
