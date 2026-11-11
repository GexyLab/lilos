# Constants

`logicstudio-constants` · requires the Logic Studio engine ([logicstudio-engine](logicstudio-engine))

The blocks of the **fundamental constants**: mathematical constants (π, e, the golden ratio, the roots and logarithms of `Math`, Euler–Mascheroni, Feigenbaum…), physical constants with the **CODATA 2022** values (speed of light, Planck, Boltzmann, Avogadro, gravitation, particle masses, electromagnetic and physico-chemical constants…) and astronomical and Earth constants (astronomical unit, light-year, parsec, Sun, Earth, standard gravity).

## How to install it

The package does not come with the IDE. An administrator installs it from the **AppStore**, **Kernel** tab: it is called `logicstudio-constants` («Logic Studio: i blocchi delle costanti fondamentali…», "Logic Studio: the blocks of the fundamental constants…"). If the engine is missing, the AppStore installs it together. After the installation the blocks appear in the **Blocks** tab of the IDE, in three categories: **Math constants**, **Physical constants** and **Astronomical constants**.

A project that uses these blocks on a lilOS where the package is not installed shows the blocks with **The package is missing**, and an active program stays waiting until the package is back.

## The blocks

One block per constant: 25 mathematical, 45 physical and 17 astronomical and Earth constants. The block's name is the constant's followed by its symbol (for example "Speed of light in vacuum · c"); the type is `const.` followed by the constant's key (`const.c`). In the palette you can also search them by symbol or type.

### Math constants

#### Classic constants

| Block | Symbol | Value |
|---|---|---|
| [Pi (Math.PI) · π](const.pi) | π | `3.141592653589793` |
| [Tau (2π) · τ](const.tau) | τ | `6.283185307179586` |
| [Euler's number (Math.E) · e](const.e) | e | `2.718281828459045` |
| [Golden ratio · φ](const.phi) | φ | `1.618033988749895` |
| [Silver ratio (1 + √2) · δS](const.silver) | δS | `2.414213562373095` |
| [Plastic number · ρ](const.plastic) | ρ | `1.324717957244746` |
| [Square root of 2 (Math.SQRT2) · √2](const.sqrt2) | √2 | `1.4142135623730951` |
| [Square root of 1/2 (Math.SQRT1_2) · √½](const.sqrtHalf) | √½ | `0.7071067811865476` |
| [Square root of 3 · √3](const.sqrt3) | √3 | `1.7320508075688772` |
| [Natural log of 2 (Math.LN2) · ln 2](const.ln2) | ln 2 | `0.6931471805599453` |
| [Natural log of 10 (Math.LN10) · ln 10](const.ln10) | ln 10 | `2.302585092994046` |
| [Base-2 log of e (Math.LOG2E) · log₂ e](const.log2e) | log₂ e | `1.4426950408889634` |
| [Base-10 log of e (Math.LOG10E) · log₁₀ e](const.log10e) | log₁₀ e | `0.4342944819032518` |
| [One degree in radians (π/180) · °](const.deg) | ° | `0.017453292519943295` |

#### Analysis and dynamical systems

| Block | Symbol | Value |
|---|---|---|
| [Euler–Mascheroni constant · γ](const.gamma) | γ | `0.5772156649015329` |
| [Catalan's constant · G](const.catalan) | G | `0.915965594177219` |
| [Apéry's constant · ζ(3)](const.apery) | ζ(3) | `1.2020569031595942` |
| [Omega constant · Ω](const.omega) | Ω | `0.5671432904097838` |
| [Khinchin's constant · K₀](const.khinchin) | K₀ | `2.6854520010653062` |
| [Feigenbaum constant δ · δ](const.feigenbaumDelta) | δ | `4.66920160910299` |
| [Feigenbaum constant α · α](const.feigenbaumAlpha) | α | `2.5029078750958926` |

#### Number limits

| Block | Symbol | Value |
|---|---|---|
| [Machine epsilon (Number.EPSILON) · ε](const.epsilon) | ε | `2.220446049250313e-16` |
| [Largest safe integer (Number.MAX_SAFE_INTEGER) · 2⁵³ − 1](const.maxSafe) | 2⁵³ − 1 | `9007199254740991` |
| [Largest number (Number.MAX_VALUE) · max](const.maxValue) | max | `1.7976931348623157e+308` |
| [Smallest positive number (Number.MIN_VALUE) · min](const.minValue) | min | `5e-324` |

### Physical constants

#### The 7 defining constants of the SI, and ħ

| Block | Symbol | Value | Unit | Uncertainty |
|---|---|---|---|---|
| [Speed of light in vacuum · c](const.c) | c | `299792458` | m/s | exact |
| [Planck constant · h](const.h) | h | `6.62607015e-34` | J·s | exact |
| [Reduced Planck constant (h/2π) · ħ](const.hbar) | ħ | `1.0545718176461565e-34` | J·s | exact |
| [Elementary charge · e](const.qe) | e | `1.602176634e-19` | C | exact |
| [Boltzmann constant · k](const.kB) | k | `1.380649e-23` | J/K | exact |
| [Avogadro constant · Nᴀ](const.NA) | Nᴀ | `6.02214076e+23` | mol⁻¹ | exact |
| [Caesium hyperfine frequency · ΔνCs](const.dnuCs) | ΔνCs | `9192631770` | Hz | exact |
| [Luminous efficacy (540 THz) · Kcd](const.Kcd) | Kcd | `683` | lm/W | exact |

#### Gravitation and Planck units

| Block | Symbol | Value | Unit | Uncertainty |
|---|---|---|---|---|
| [Newtonian constant of gravitation · G](const.G) | G | `6.6743e-11` | m³/(kg·s²) | `1.5e-15` |
| [Planck length · lP](const.planckLength) | lP | `1.616255e-35` | m | `1.8e-40` |
| [Planck mass · mP](const.planckMass) | mP | `2.176434e-8` | kg | `2.4e-13` |
| [Planck time · tP](const.planckTime) | tP | `5.391247e-44` | s | `6e-49` |
| [Planck temperature · TP](const.planckTemp) | TP | `1.416784e+32` | K | `1.6e+27` |

#### Electromagnetic

| Block | Symbol | Value | Unit | Uncertainty |
|---|---|---|---|---|
| [Vacuum magnetic permeability · μ₀](const.mu0) | μ₀ | `0.00000125663706127` | N/A² | `2e-16` |
| [Vacuum electric permittivity · ε₀](const.eps0) | ε₀ | `8.8541878188e-12` | F/m | `1.4e-21` |
| [Coulomb constant (1/4πε₀) · kₑ](const.ke) | kₑ | `8987551786.170797` | N·m²/C² | `1.4` |
| [Characteristic impedance of vacuum · Z₀](const.Z0) | Z₀ | `376.730313412` | Ω | `5.9e-8` |
| [Magnetic flux quantum (h/2e) · Φ₀](const.Phi0) | Φ₀ | `2.0678338484619295e-15` | Wb | exact |
| [Conductance quantum (2e²/h) · G₀](const.G0) | G₀ | `0.00007748091729863649` | S | exact |
| [Josephson constant (2e/h) · Kᴊ](const.KJ) | Kᴊ | `483597848416983.6` | Hz/V | exact |
| [von Klitzing constant (h/e²) · Rᴋ](const.RK) | Rᴋ | `25812.807459304513` | Ω | exact |
| [Bohr magneton · μB](const.muB) | μB | `9.2740100657e-24` | J/T | `2.9e-33` |
| [Nuclear magneton · μN](const.muN) | μN | `5.0507837393e-27` | J/T | `1.6e-36` |

#### Atomic and nuclear

| Block | Symbol | Value | Unit | Uncertainty |
|---|---|---|---|---|
| [Fine-structure constant · α](const.alpha) | α | `0.0072973525643` | — | `1.1e-12` |
| [Inverse fine-structure constant · 1/α](const.alphaInv) | 1/α | `137.035999177` | — | `2.1e-8` |
| [Rydberg constant · R∞](const.Rinf) | R∞ | `10973731.568157` | m⁻¹ | `0.000012` |
| [Bohr radius · a₀](const.a0) | a₀ | `5.29177210544e-11` | m | `8.2e-21` |
| [Hartree energy · Eh](const.Eh) | Eh | `4.359744722206e-18` | J | `4.8e-30` |
| [Electron mass · mₑ](const.me) | mₑ | `9.1093837139e-31` | kg | `2.8e-40` |
| [Proton mass · mₚ](const.mp) | mₚ | `1.67262192595e-27` | kg | `5.2e-37` |
| [Neutron mass · mₙ](const.mn) | mₙ | `1.67492750056e-27` | kg | `8.5e-37` |
| [Muon mass · mμ](const.mmu) | mμ | `1.883531627e-28` | kg | `4.2e-36` |
| [Proton-electron mass ratio · mₚ/mₑ](const.mpme) | mₚ/mₑ | `1836.152673426` | — | `3.2e-8` |
| [Atomic mass constant (dalton) · u](const.u) | u | `1.66053906892e-27` | kg | `5.2e-37` |
| [Classical electron radius · rₑ](const.re) | rₑ | `2.8179403205e-15` | m | `1.3e-24` |
| [Compton wavelength · λC](const.lambdaC) | λC | `2.42631023538e-12` | m | `7.6e-22` |
| [Electronvolt · eV](const.eV) | eV | `1.602176634e-19` | J | exact |

#### Physico-chemical

| Block | Symbol | Value | Unit | Uncertainty |
|---|---|---|---|---|
| [Molar gas constant · R](const.R) | R | `8.31446261815324` | J/(mol·K) | exact |
| [Faraday constant · F](const.F) | F | `96485.33212331001` | C/mol | exact |
| [Stefan–Boltzmann constant · σ](const.sigma) | σ | `5.6703744191844314e-8` | W/(m²·K⁴) | exact |
| [Wien wavelength displacement constant · b](const.b) | b | `0.002897771955` | m·K | exact |
| [Molar volume of ideal gas (0 °C, 1 atm) · Vm](const.Vm) | Vm | `0.022413969545014137` | m³/mol | exact |
| [Loschmidt constant (0 °C, 1 atm) · n₀](const.n0) | n₀ | `2.686780111798444e+25` | m⁻³ | exact |
| [Standard atmosphere · atm](const.atm) | atm | `101325` | Pa | exact |
| [Zero Celsius in kelvin · T₀](const.T0) | T₀ | `273.15` | K | exact |

### Astronomical constants

#### Distances and times

| Block | Symbol | Value | Unit | Uncertainty |
|---|---|---|---|---|
| [Astronomical unit · au](const.au) | au | `149597870700` | m | exact |
| [Light-year · ly](const.ly) | ly | `9460730472580800` | m | exact |
| [Parsec · pc](const.pc) | pc | `30856775814913670` | m | exact |
| [Julian year · a](const.year) | a | `31557600` | s | exact |

#### The Sun

| Block | Symbol | Value | Unit | Uncertainty |
|---|---|---|---|---|
| [Solar mass parameter · GM☉](const.GMsun) | GM☉ | `132712440000000000000` | m³/s² | exact |
| [Solar mass · M☉](const.Msun) | M☉ | `1.98841e+30` | kg | `4.5e+25` |
| [Solar radius · R☉](const.Rsun) | R☉ | `695700000` | m | exact |
| [Solar luminosity · L☉](const.Lsun) | L☉ | `3.828e+26` | W | exact |
| [Solar effective temperature · T☉](const.Tsun) | T☉ | `5772` | K | exact |
| [Solar constant (irradiance at 1 au) · S☉](const.S) | S☉ | `1361` | W/m² | exact |

#### The Earth

| Block | Symbol | Value | Unit | Uncertainty |
|---|---|---|---|---|
| [Earth mass parameter · GM⊕](const.GMearth) | GM⊕ | `398600400000000` | m³/s² | exact |
| [Earth mass · M⊕](const.Mearth) | M⊕ | `5.97217e+24` | kg | `130000000000000000000` |
| [Earth equatorial radius · Rₑ⊕](const.ReEarth) | Rₑ⊕ | `6378100` | m | exact |
| [Earth polar radius · Rₚ⊕](const.RpEarth) | Rₚ⊕ | `6356800` | m | exact |
| [Earth mean radius · R⊕](const.RmEarth) | R⊕ | `6371008.7714` | m | exact |
| [Earth rotation rate · ω⊕](const.omegaEarth) | ω⊕ | `0.00007292115` | rad/s | exact |
| [Standard acceleration of gravity · gₙ](const.gn) | gₙ | `9.80665` | m/s² | exact |

## How to use them

Drag into the schema the block of the constant you need: it has no settings. As for [Constant · Variable](core.value), the value goes out **once at the start** of the schema; if you link the hidden input **send**, it goes out instead at each pulse that arrives there.

The **value** output is always visible. The others (**symbol**, and for physical and astronomical constants **unit** and **uncertainty**) are hidden by default: show them with the **eye** in Properties when you need them.

All the values are in **SI units** (metres, kilograms, seconds, joules…). The **uncertainty** is the standard uncertainty in the same unit, `0` for constants that are exact by definition.

## Where the values come from

- **Mathematical**: the `Math` and `Number` constants of JavaScript, the others with all the digits a double-precision number can hold.
- **Physical**: the CODATA 2022 recommended values (NIST, 2024). The 7 constants that have defined the SI since 2019 are exact.
- **Astronomical and Earth**: the IAU definitions and nominal values (2012 and 2015), the WGS 84 and GRS 80 models for the Earth, and the CGPM standard gravity (1901).

When the recommended values change (CODATA updates them every 4 years), a new version of the package updates them: programs will use the new values from their next start.

## The obsolete blocks

Up to version 1.0.0 the package had only three blocks, with the constant chosen in a menu in Properties: [Math constants (Math.PI, Math.E…)](const.math), [Physical constants (CODATA)](const.physics) and [Astronomical and Earth constants](const.astro). Since 1.1.0 they are **obsolete**: saved schemas that use them work as before, but they are no longer in the list of blocks, and in Properties a notice says what replaces them. To move to the new blocks put the block of the same constant in their place and redo the links. Two keys of the old blocks have a different name in the type of the new ones: the elementary charge `e` is `const.qe`, the square root of 1/2 `sqrt1_2` is `const.sqrtHalf`.
